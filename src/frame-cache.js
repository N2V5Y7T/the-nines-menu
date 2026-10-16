/**
 * The Nines — Frame Cache & Memory Manager
 * 
 * Manages loading, caching (compressed), and decoding (sliding window)
 * of frame images. Implements coarse-to-fine loading and AbortController.
 *
 * Memory model:
 * - Compressed: all loaded frames kept as Image objects (browser HTTP cache)
 * - Decoded: only a sliding window of ±WINDOW frames around current position
 *   are drawn to offscreen canvases for instant display
 *
 * A single decoded 720×1280 frame ≈ 3.5 MB.
 * Window of ±10 = 21 frames ≈ 73 MB — acceptable.
 */

const FRAME_WIDTH = 720;
const FRAME_HEIGHT = 1280;
const DECODE_WINDOW = 10;  // ±10 frames from current position
const MAX_CONCURRENT_LOADS = 6;

/**
 * Progressive sequential loading order:
 * Loads frames in contiguous forward order (0, 1, 2, 3...)
 * so all adjacent frames are available for seamless sub-frame blending
 * without gaps, jumps, or stepping artifacts.
 */
function sequentialOrder(count) {
  const order = [];
  for (let i = 0; i < count; i++) {
    order.push(i);
  }
  return order;
}

function pad(n) {
  return String(n + 1).padStart(4, '0');  // frames are 1-indexed on disk
}

export class FrameCache {
  constructor() {
    // Per-section state
    // sectionKey → { images: Map<frameIdx, Image>, loading: boolean, abortController, loadedCount }
    this._sections = new Map();

    // Decoded bitmap cache (sliding window)
    // "sectionKey:frameIdx" → { canvas, lastUsed }
    this._decoded = new Map();
    this._maxDecoded = DECODE_WINDOW * 2 + 5;  // some headroom
  }

  /**
   * Start loading frames for a section in sequential order.
   *
   * @param {string} key - section key
   * @param {string} framePath - e.g. '/frames/first-course/'
   * @param {number} frameCount - total frames
   * @param {string} priority - 'high' | 'low'
   * @returns {object} section state
   */
  loadSection(key, framePath, frameCount, priority = 'high') {
    // If already loading/loaded, skip
    if (this._sections.has(key)) {
      return this._sections.get(key);
    }

    const ac = new AbortController();
    const images = new Map();
    const inFlight = new Set();
    const order = sequentialOrder(frameCount);

    const state = {
      key,
      framePath,
      frameCount,
      images,
      inFlight,
      queue: order,
      loading: true,
      loadedCount: 0,
      activeWorkers: 0,
      priority,
      abortController: ac,
    };
    this._sections.set(key, state);

    // Start loading queue with active worker pool
    this._pump(state);

    return state;
  }

  /**
   * Pipelined worker pool: ensures MAX_CONCURRENT_LOADS active requests
   * are maintained continuously without head-of-line blocking.
   */
  _pump(state) {
    if (state.abortController.signal.aborted) return;

    while (state.activeWorkers < MAX_CONCURRENT_LOADS && state.queue.length > 0) {
      const frameIdx = state.queue.shift();

      // Skip already loaded or currently in-flight frames
      if (state.images.has(frameIdx) || state.inFlight.has(frameIdx)) {
        continue;
      }

      state.inFlight.add(frameIdx);
      state.activeWorkers++;

      const img = new Image();
      img.decoding = 'async';
      if (state.priority === 'high') img.fetchPriority = 'high';

      const onSlotFree = () => {
        state.inFlight.delete(frameIdx);
        state.activeWorkers--;
        if (state.queue.length === 0 && state.activeWorkers === 0) {
          state.loading = false;
        } else {
          this._pump(state);
        }
      };

      img.onload = () => {
        if (state.abortController.signal.aborted) {
          onSlotFree();
          return;
        }

        // Asynchronously decode image off the main thread before marking ready
        if (typeof img.decode === 'function') {
          img.decode().catch(() => {}).finally(() => {
            if (!state.abortController.signal.aborted) {
              state.images.set(frameIdx, img);
              state.loadedCount++;
            }
            onSlotFree();
          });
        } else {
          state.images.set(frameIdx, img);
          state.loadedCount++;
          onSlotFree();
        }
      };

      img.onerror = () => {
        onSlotFree();
      };

      img.src = `${state.framePath}frame${pad(frameIdx)}.webp`;
    }

    if (state.queue.length === 0 && state.activeWorkers === 0) {
      state.loading = false;
    }
  }

  /**
   * Prioritize a window of upcoming frames in the direction of scroll.
   * Promotes the closest upcoming frames to the front of the queue
   * so they are pre-downloaded and pre-decoded ahead of the user's view.
   */
  prioritizeWindow(key, currentFrameIndex, direction = 1) {
    const state = this._sections.get(key);
    if (!state || !state.queue || state.abortController.signal.aborted) return;

    const count = state.frameCount;
    const center = Math.max(0, Math.min(count - 1, Math.round(currentFrameIndex || 0)));

    // Debounce: avoid churning the worker queue if the user moved less than 2 frames
    if (state._lastPrioritizedCenter !== undefined && Math.abs(state._lastPrioritizedCenter - center) < 2) {
      return;
    }
    state._lastPrioritizedCenter = center;

    const priorityFrames = [];
    const spanAhead = 20; // 20 frames ahead for seamless continuous motion
    const spanBehind = 6;  // 6 frames behind for smooth scrolling reversal

    if (direction >= 0) {
      // Forward scroll: prioritize upcoming frames ahead
      for (let i = 0; i <= spanAhead; i++) {
        const idx = center + i;
        if (idx < count && !state.images.has(idx) && !state.inFlight.has(idx)) {
          priorityFrames.push(idx);
        }
      }
      for (let i = 1; i <= spanBehind; i++) {
        const idx = center - i;
        if (idx >= 0 && !state.images.has(idx) && !state.inFlight.has(idx)) {
          priorityFrames.push(idx);
        }
      }
    } else {
      // Reverse scroll: prioritize preceding frames
      for (let i = 0; i <= spanAhead; i++) {
        const idx = center - i;
        if (idx >= 0 && !state.images.has(idx) && !state.inFlight.has(idx)) {
          priorityFrames.push(idx);
        }
      }
      for (let i = 1; i <= spanBehind; i++) {
        const idx = center + i;
        if (idx < count && !state.images.has(idx) && !state.inFlight.has(idx)) {
          priorityFrames.push(idx);
        }
      }
    }

    if (priorityFrames.length > 0) {
      const pSet = new Set(priorityFrames);
      state.queue = priorityFrames.concat(state.queue.filter(idx => !pSet.has(idx)));
      state.priority = 'high';
      this._pump(state);
    }
  }

  /**
   * Abort loading for a section.
   */
  abortSection(key) {
    const state = this._sections.get(key);
    if (state) {
      state.abortController.abort();
      state.loading = false;
      state.inFlight.clear();
      state.queue = [];
    }
  }

  /**
   * Check if a section has been loaded (or is loading).
   */
  hasSection(key) {
    return this._sections.has(key);
  }

  /**
   * Get the loading progress (0-1) for a section.
   */
  getProgress(key) {
    const state = this._sections.get(key);
    if (!state) return 0;
    return state.loadedCount / state.frameCount;
  }

  /**
   * Get the Image for a specific frame, or null if not loaded.
   */
  getFrame(key, frameIndex) {
    const state = this._sections.get(key);
    if (!state) return null;
    return state.images.get(frameIndex) || null;
  }

  /**
   * Get the nearest loaded frame to the requested index.
   * Never returns null if any frame has been loaded for the section.
   */
  nearestFrame(key, frameIndex) {
    const state = this._sections.get(key);
    if (!state || state.loadedCount === 0) return null;

    const count = state.frameCount;
    const target = Math.max(0, Math.min(count - 1, Math.round(Number(frameIndex) || 0)));

    // Check exact match first
    if (state.images.has(target)) return state.images.get(target);

    // Search outward within valid bounds
    for (let d = 1; d < count; d++) {
      const left = target - d;
      const right = target + d;
      if (left >= 0 && state.images.has(left)) return state.images.get(left);
      if (right < count && state.images.has(right)) return state.images.get(right);
    }

    // Fallback: return any loaded frame in this section
    for (const img of state.images.values()) {
      if (img) return img;
    }

    return null;
  }

  /**
   * Maintain decoded-frame sliding window.
   * Call this periodically with the current section + frame index.
   * Evicts decoded frames far from the current position.
   */
  maintainWindow(currentKey, currentFrameIndex) {
    if (this._decoded.size <= this._maxDecoded) return;

    // Sort by distance from current position, evict farthest
    const entries = [...this._decoded.entries()];
    entries.sort((a, b) => {
      const [aKey, aIdx] = a[0].split(':').map((v, i) => i === 1 ? parseInt(v) : v);
      const [bKey, bIdx] = b[0].split(':').map((v, i) => i === 1 ? parseInt(v) : v);

      const aDist = aKey === currentKey ? Math.abs(aIdx - currentFrameIndex) : 1000;
      const bDist = bKey === currentKey ? Math.abs(bIdx - currentFrameIndex) : 1000;
      return bDist - aDist;  // farthest first
    });

    // Evict until we're under the limit
    while (this._decoded.size > this._maxDecoded) {
      const [evictKey] = entries.shift();
      this._decoded.delete(evictKey);
    }
  }

  /**
   * Unload a section entirely (compressed + decoded).
   * Used when a section is far from the viewport.
   */
  unloadSection(key) {
    this.abortSection(key);
    this._sections.delete(key);

    // Remove decoded frames for this section
    for (const k of this._decoded.keys()) {
      if (k.startsWith(key + ':')) {
        this._decoded.delete(k);
      }
    }
  }
}



