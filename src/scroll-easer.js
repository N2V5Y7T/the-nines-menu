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

    // Smooth, low-latency glide with continuous momentum (no stepped velocity jumps)
    this._display += delta * 0.45;
    return this._display;
  }

  snap(scrollY) {
    this._display = scrollY;
  }
}

