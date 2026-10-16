const SNAP_THRESHOLD = 0.75;

export class ScrollEaser {
  constructor() {
    this._display = window.scrollY;
    this._lastReal = window.scrollY;
    this._lastDelta = 0;
    this._reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    // Track user active physical interaction
    this._isInteracting = false;
    this._interactionTimeout = null;

    const setInteracting = () => {
      this._isInteracting = true;
      if (this._interactionTimeout) clearTimeout(this._interactionTimeout);
      this._interactionTimeout = setTimeout(() => {
        this._isInteracting = false;
      }, 150); 
    };

    window.addEventListener('touchstart', setInteracting, { passive: true });
    window.addEventListener('touchmove', setInteracting, { passive: true });
    window.addEventListener('wheel', setInteracting, { passive: true });

    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', e => { this._reduced = e.matches; });
  }

  tick(realScrollY) {
    // Native mobile touch or reduced motion: 100% direct 1:1 tracking
    if (this._reduced || this._isTouchDevice) {
      this._display = realScrollY;
      return realScrollY;
    }

    const delta = realScrollY - this._display;

    // Snap if very close
    if (Math.abs(delta) < SNAP_THRESHOLD) {
      this._display = realScrollY;
      this._lastDelta = 0;
      return realScrollY;
    }

    // Direction reversal: if user abruptly reverses scroll direction,
    // snap immediately or follow with high responsiveness (0.85) to eliminate rubber-banding
    if (this._lastDelta !== 0 && Math.sign(delta) !== Math.sign(this._lastDelta) && Math.abs(delta) > 5) {
      this._display += delta * 0.85;
      this._lastDelta = delta;
      return this._display;
    }
    this._lastDelta = delta;

    // Responsive Easing:
    // Small continuous trackpad gestures (delta < 20): track almost 1:1 (0.80)
    // Larger stepped mouse-wheel notches (delta >= 20): smooth quickly (0.40)
    // Reaches target in 80-120ms with zero perceptible drag or sluggishness.
    const isSmallDelta = Math.abs(delta) < 20;
    const currentEase = isSmallDelta ? 0.80 : (this._isInteracting ? 0.45 : 0.35);

    this._display += delta * currentEase;
    return this._display;
  }

  snap(scrollY) {
    this._display = scrollY;
    this._lastDelta = 0;
  }
}

