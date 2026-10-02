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
 * Generate coarse-to-fine loading order for `count` frames.
 * Loads every 8th frame first, then 4th, then 2nd, then all.
 */
function coarseToFineOrder(count) {
  const order = [];
  const seen = new Set();

  for (let step of [8, 4, 2, 1]) {
    for (let i = 0; i < count; i += step) {
      if (!seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    }
  }
  // Ensure last frame is included
  if (!seen.has(count - 1)) {
    order.push(count - 1);
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
   * Start loading frames for a section in coarse-to-fine order.
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
    const state = {
      key,
      framePath,
      frameCount,
      images,
      loading: true,
      loadedCount: 0,
      abortController: ac,
    };
    this._sections.set(key, state);

    // Start loading in coarse-to-fine order
    const order = coarseToFineOrder(frameCount);
    this._loadBatch(state, order, 0, priority);

    return state;
  }

  /**
   * Load frames in batches to control concurrency.
   */
  _loadBatch(state, order, startIdx, priority) {
    if (state.abortController.signal.aborted) return;
    if (startIdx >= order.length) {
      state.loading = false;
      return;
    }

    const batch = order.slice(startIdx, startIdx + MAX_CONCURRENT_LOADS);
    let completed = 0;

    batch.forEach(frameIdx => {
      if (state.abortController.signal.aborted) return;
      if (state.images.has(frameIdx)) {
        completed++;
        if (completed >= batch.length) {
          this._loadBatch(state, order, startIdx + batch.length, priority);
        }
        return;
      }

      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (!state.abortController.signal.aborted) {
          state.images.set(frameIdx, img);
          state.loadedCount++;
        }
        completed++;
        if (completed >= batch.length) {
          this._loadBatch(state, order, startIdx + batch.length, priority);
        }
      };
      img.onerror = () => {
        completed++;
        if (completed >= batch.length) {
          this._loadBatch(state, order, startIdx + batch.length, priority);
        }
      };
      // fetchpriority hint for high-priority sections
      if (priority === 'high') img.fetchPriority = 'high';
      img.src = `${state.framePath}frame${pad(frameIdx)}.webp`;
    });
  }

  /**
   * Abort loading for a section.
   */
  abortSection(key) {
    const state = this._sections.get(key);
    if (state) {
      state.abortController.abort();
      state.loading = false;
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

    // Check exact match first
    if (state.images.has(frameIndex)) return state.images.get(frameIndex);

    // Search outward
    for (let d = 1; d < state.frameCount; d++) {
      if (state.images.has(frameIndex - d)) return state.images.get(frameIndex - d);
      if (state.images.has(frameIndex + d)) return state.images.get(frameIndex + d);
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


