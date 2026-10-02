/**
 * The Nines — Wheel / Scroll Easing (Phase 6)
 *
 * Problem: macOS trackpad / high-resolution mouse wheels fire many tiny
 * scroll events very quickly, causing the canvas to "shudder" on each rAF
 * because scrollY jumps in large steps.
 *
 * Solution: read the real window.scrollY (which the browser updates natively)
 * but feed the renderer a separate "displayScrollY" that eases toward the
 * real value at a fixed rate per frame. The visual lag is ~80ms max — barely
 * perceptible — but the animation feels buttery instead of jagged.
 *
 * Rule: if prefers-reduced-motion is set, bypass easing entirely (real scrollY
 * is always used directly).
 *
 * Usage:
 *   import { ScrollEaser } from './scroll-easer.js';
 *   const easer = new ScrollEaser();
 *   // in rAF loop:
 *   const displayY = easer.tick(window.scrollY);
 *   const state = getScrollState(displayY, layout);
 */

const EASE_FACTOR = 0.18;   // 0–1; lower = slower/smoother
const SNAP_THRESHOLD = 0.5; // px — snap to target when this close

export class ScrollEaser {
  constructor() {
    this._display = window.scrollY;
    this._reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Live-update if the user changes the setting mid-session
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', e => { this._reduced = e.matches; });
  }

  /**
   * Call once per rAF with the current real scrollY.
   * Returns the eased value to pass to getScrollState().
   */
  tick(realScrollY) {
    if (this._reduced) {
      // No easing — respect motion preference
      this._display = realScrollY;
      return realScrollY;
    }

    const delta = realScrollY - this._display;

    if (Math.abs(delta) < SNAP_THRESHOLD) {
      // Close enough — snap to avoid floating-point drift
      this._display = realScrollY;
    } else {
      this._display += delta * EASE_FACTOR;
    }

    return this._display;
  }

  /**
   * Force-snap the display position (e.g. after a nav jump).
   */
  snap(scrollY) {
    this._display = scrollY;
  }
}
