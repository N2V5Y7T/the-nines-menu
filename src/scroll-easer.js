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

  tick(realScrollY, isInFoodIntro = false) {
    // If the user has prefers-reduced-motion, bypass completely.
    // NOTE: We no longer bypass completely on touch devices because we want the 
    // controlled momentum in the food intro.
    if (this._reduced) {
      this._display = realScrollY;
      return realScrollY;
    }

    const delta = realScrollY - this._display;

    // Smart Easing:
    // When interacting, use a tight ease (0.6) so it's responsive.
    // If coasting (not interacting):
    // - In Food Intro: use floaty "rolling ball" ease (0.05).
    // - Outside Food Intro: use normal tight ease (0.6) so menus scroll normally.
    let currentEase = 0.6; 
    
    if (isInFoodIntro && !this._isInteracting) {
       currentEase = 0.05;
    }

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

