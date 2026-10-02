/**
 * The Nines — Smart Loading Queue (Phase 5)
 *
 * Priority rules (from the spec):
 *   CRITICAL  — the destination section when user does a nav jump
 *   HIGH      — current section
 *   PRELOAD   — next 1-2 sections ahead (~20-30 % coarse first)
 *   IDLE      — everything else: do not load until nothing else pending
 *
 * Also exposes:
 *   - jumpTo(sectionIdx)  — aborts everything, loads destination immediately
 *   - advance(state)      — call every tick to trigger preloads as user scrolls
 */

import { FrameCache } from './frame-cache.js';

export class SmartLoader {
  /**
   * @param {FrameCache} frameCache
   * @param {Array}      layout      — from computeScrollLayout
   */
  constructor(frameCache, layout) {
    this._cache   = frameCache;
    this._layout  = layout;

    // Track which sections are already queued so we don't double-enqueue
    this._queued   = new Set();
    // Track the last known "current" index so we only act on changes
    this._lastIdx  = -1;
    // If a nav jump is in progress, track the destination
    this._jumpDest = null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Called on every scroll tick with the current scroll state.
   * Triggers preloads and advances section priority automatically.
   */
  advance(state) {
    const idx = state.sectionIndex;

    // Always ensure current section is loading at HIGH priority
    this._ensureLoaded(idx, 'high');

    // Start preloading next section once we're 50%+ through the hold or scrub
    const nearEnd = state.segment === 'H' || state.segment === 'X'
      || state.segment === 'C' || state.segment === 'J'
      || (state.segment === 'A' && state.segmentProgress > 0.5);

    if (nearEnd) {
      // Preload next section at low priority
      if (idx + 1 < this._layout.length) this._ensureLoaded(idx + 1, 'low');
    }

    // If we moved forward to a new section, also kick off the section after next
    // at very low priority (so it's slightly cached when needed)
    if (idx !== this._lastIdx) {
      this._lastIdx = idx;
      if (idx + 2 < this._layout.length) {
        // Only queue it, don't aggressively fetch — mark as 'low' so coarse frames come first
        this._ensureLoaded(idx + 2, 'low');
      }
    }
  }

  /**
   * Nav jump: immediately promote the destination to CRITICAL priority.
   * Existing loads for sections far from the destination are aborted
   * so bandwidth is fully available for the destination.
   */
  jumpTo(destIdx) {
    this._jumpDest = destIdx;
    const dest = this._layout[destIdx];
    if (!dest) return;

    // Abort any in-progress loads for sections more than 2 away from destination
    for (const key of this._queued) {
      const secIdx = this._layout.findIndex(s => s.key === key);
      if (secIdx >= 0 && Math.abs(secIdx - destIdx) > 2) {
        this._cache.abortSection(key);
        // Remove from queued so it can be re-requested if user scrolls back there
        this._queued.delete(key);
      }
    }

    // Force-start destination at high priority regardless of whether it was queued
    this._queued.delete(dest.key); // allow re-queuing with high priority
    this._ensureLoaded(destIdx, 'high');

    // Preload one section on each side of destination too
    if (destIdx - 1 >= 0)                    this._ensureLoaded(destIdx - 1, 'low');
    if (destIdx + 1 < this._layout.length)   this._ensureLoaded(destIdx + 1, 'low');
  }

  /**
   * Returns 0-1 loading progress for a given section key.
   */
  getProgress(key) {
    return this._cache.getProgress(key);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _ensureLoaded(idx, priority) {
    if (idx < 0 || idx >= this._layout.length) return;
    const sec = this._layout[idx];
    if (this._queued.has(sec.key)) return;

    this._queued.add(sec.key);
    this._cache.loadSection(sec.key, sec.framePath, sec.frameCount, priority);
    console.log(`[Loader] queuing ${sec.key} @ ${priority}`);
  }
}
