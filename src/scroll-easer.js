const SNAP_THRESHOLD = 0.25;

export class ScrollEaser {
  constructor() {
    this._display = window.scrollY;
    this._reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', e => { this._reduced = e.matches; });
  }

  tick(realScrollY) {
    // Touchscreens and reduced motion: 100% native 1:1 direct tracking
    if (this._reduced || this._isTouchDevice) {
      this._display = realScrollY;
      return realScrollY;
    }

    const delta = realScrollY - this._display;

    // Snap when virtually caught up
    if (Math.abs(delta) < SNAP_THRESHOLD) {
      this._display = realScrollY;
      return realScrollY;
    }

    // Smooth, low-latency glide:
    // Small gestures / trackpads track almost immediately (0.75)
    // Stepped mouse wheels glide smoothly with zero lag or resistance (0.35)
    const isSmallDelta = Math.abs(delta) < 25;
    const ease = isSmallDelta ? 0.75 : 0.35;

    this._display += delta * ease;
    return this._display;
  }

  snap(scrollY) {
    this._display = scrollY;
  }
}

