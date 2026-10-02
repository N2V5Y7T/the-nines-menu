const SNAP_THRESHOLD = 0.5;

export class ScrollEaser {
  constructor() {
    this._display = window.scrollY;
    this._reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._isTouchDevice = window.matchMedia('(pointer: coarse)').matches; // Native mobile touch

    // Track user physical interaction for dynamic easing
    this._isInteracting = false;
    this._interactionTimeout = null;

    const setInteracting = () => {
      this._isInteracting = true;
      if (this._interactionTimeout) clearTimeout(this._interactionTimeout);
      this._interactionTimeout = setTimeout(() => {
        this._isInteracting = false;
      }, 100); 
    };

    window.addEventListener('touchstart', setInteracting, { passive: true });
    window.addEventListener('touchmove', setInteracting, { passive: true });
    window.addEventListener('wheel', setInteracting, { passive: true });

    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', e => { this._reduced = e.matches; });
  }

  tick(realScrollY) {
    if (this._reduced || this._isTouchDevice) { // Bypass completely for native mobile feel
      this._display = realScrollY;
      return realScrollY;
    }

    const delta = realScrollY - this._display;

    // Smart Easing:
    // If the user's finger is on the screen or actively spinning the wheel,
    // use a high ease (0.6) so it stops instantly and changes direction instantly.
    // If they let go and the page is natively coasting, drop the ease to (0.05)
    // to give it a beautiful, floaty "rolling ball" momentum that trails off gently.
    const currentEase = this._isInteracting ? 0.6 : 0.05;

    if (Math.abs(delta) < SNAP_THRESHOLD) {
      this._display = realScrollY;
    } else {
      this._display += delta * currentEase;
    }

    return this._display;
  }

  snap(scrollY) {
    this._display = scrollY;
  }
}

