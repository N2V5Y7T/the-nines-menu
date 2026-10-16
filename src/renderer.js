/**
 * The Nines — Canvas Renderer
 * 
 * Draws video frames to the main canvas, handles cross-dissolve,
 * and caps DPR at 2.
 */

const MAX_DPR = 2;
const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 1280;

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {FrameCache} frameCache
   */
  constructor(canvas, frameCache) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.frameCache = frameCache;
    this._lastDrawnKey = null;
    this._lastDrawnFrame = -1;
    this._lastDrawnFloat = -1;
    this._lastValidImage = null; // Robust fallback to eliminate black screens

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * Set canvas dimensions based on viewport, capped at DPR 2.
   */
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const rect = this.canvas.getBoundingClientRect();

    // Fallback if styling failed (e.g. dvh not supported)
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;

    if (this._lastWidth === w && this._lastHeight === h && this._lastDpr === dpr) {
      return;
    }
    this._lastWidth = w;
    this._lastHeight = h;
    this._lastDpr = dpr;

    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this._displayWidth = w;
    this._displayHeight = h;
    
    // Force a redraw on resize and immediately restore last valid frame so canvas never flashes black
    this._lastDrawnKey = null;
    this._lastDrawnFrame = -1;
    this._lastDrawnFloat = -1;
    if (this._lastValidImage) {
      this.ctx.globalAlpha = 1;
      this._drawImageCover(this._lastValidImage);
    }
  }

  /**
   * Render the current scroll state to the canvas.
   *
   * @param {object} state - from getScrollState()
   */
  render(state) {
    const { section, crossDissolve } = state;
    const key = section.key;
    const frameFloat = state.frameFloat !== undefined ? state.frameFloat : state.frameIndex;
    const frameIndex = Math.floor(frameFloat);

    // Prioritize upcoming frames in direction of motion for fluid playback
    const direction = this._lastFrameIndex !== undefined ? (frameIndex >= this._lastFrameIndex ? 1 : -1) : 1;
    this._lastFrameIndex = frameIndex;
    this.frameCache.prioritizeWindow(key, frameIndex, direction);

    if (crossDissolve) {
      // Also ensure start of next section is prioritized
      this.frameCache.prioritizeWindow(crossDissolve.nextSection.key, 0, 1);
      // ── Cross-dissolve between two sections ──
      this._renderCrossDissolve(
        key, frameFloat,
        crossDissolve.nextSection.key, 0,
        crossDissolve.progress
      );
    } else {
      // ── Single frame with sub-frame continuous blending ──
      this._renderFrame(key, frameFloat, section);
    }
  }

  /**
   * Draw a frame from a section with sub-frame continuous blending.
   * Smoothly crossfades between adjacent frames according to the fractional
   * scroll position, creating a liquid 60/120fps motion picture without stepped popping.
   */
  _renderFrame(sectionKey, frameFloat, section) {
    const count = section.frameCount;
    const clampedFloat = Math.max(0, Math.min(count - 1, frameFloat));
    const floorIndex = Math.floor(clampedFloat);
    const ceilIndex = Math.min(count - 1, floorIndex + 1);
    const blendAlpha = clampedFloat - floorIndex;

    // Skip redraw if identical sub-frame already drawn
    if (this._lastDrawnKey === sectionKey && Math.abs(this._lastDrawnFloat - clampedFloat) < 0.002) {
      return;
    }

    const imgFloor = this.frameCache.nearestFrame(sectionKey, floorIndex);
    if (!imgFloor) {
      if (this._lastValidImage) {
        this.ctx.globalAlpha = 1;
        this._drawImageCover(this._lastValidImage);
        return;
      }
      this._drawPlaceholder(section);
      return;
    }

    // Draw base (floor) frame at full opacity
    this.ctx.globalAlpha = 1;
    this._drawImageCover(imgFloor);
    this._lastValidImage = imgFloor;

    // Sub-frame blend: if position is fractional and next frame is available in cache,
    // blend it seamlessly on top! Eliminates the stepped "one one frame is changing" artifact.
    if (blendAlpha > 0.01 && ceilIndex !== floorIndex) {
      const imgCeil = this.frameCache.getFrame(sectionKey, ceilIndex);
      if (imgCeil) {
        this.ctx.globalAlpha = blendAlpha;
        this._drawImageCover(imgCeil);
        this.ctx.globalAlpha = 1;
      }
    }

    this._lastDrawnKey = sectionKey;
    this._lastDrawnFloat = clampedFloat;
    this._lastDrawnFrame = floorIndex;
  }

  /**
   * Draw the section's blurred placeholder (tiny WebP blob stored in manifest).
   * Cached as an Image per section key.
   */
  _drawPlaceholder(section) {
    if (this._lastValidImage) {
      this.ctx.globalAlpha = 1;
      this._drawImageCover(this._lastValidImage);
      return;
    }

    if (!section) {
      this.ctx.fillStyle = '#0a0a0a';
      this.ctx.fillRect(0, 0, this._displayWidth, this._displayHeight);
      return;
    }
    const key = section.key;
    if (!this._placeholders) this._placeholders = new Map();

    let ph = this._placeholders.get(key);
    if (!ph) {
      ph = { state: 'loading', img: null };
      this._placeholders.set(key, ph);
      const img = new Image();
      img.onload = () => { ph.img = img; ph.state = 'loaded'; this._lastDrawnFrame = -1; };
      img.src = `${section.framePath}frame0001.webp`;
    }

    if (ph.state === 'loaded' && ph.img) {
      this.ctx.filter = 'blur(12px)';
      this._drawImageCover(ph.img);
      this.ctx.filter = 'none';
      this._lastValidImage = ph.img;
    } else {
      this.ctx.fillStyle = '#0a0a0a';
      this.ctx.fillRect(0, 0, this._displayWidth, this._displayHeight);
    }
  }

  /**
   * Cross-dissolve between two frames from different sections.
   */
  _renderCrossDissolve(keyA, frameFloatA, keyB, frameFloatB, progress) {
    const floorA = Math.floor(Math.max(0, frameFloatA));
    const floorB = Math.floor(Math.max(0, frameFloatB));
    const imgA = this.frameCache.nearestFrame(keyA, floorA) || this._lastValidImage;
    const imgB = this.frameCache.nearestFrame(keyB, floorB);

    // Draw A at full opacity
    if (imgA) {
      this.ctx.globalAlpha = 1;
      this._drawImageCover(imgA);
      this._lastValidImage = imgA;
    } else if (this._lastValidImage) {
      this.ctx.globalAlpha = 1;
      this._drawImageCover(this._lastValidImage);
    } else {
      this.ctx.fillStyle = '#0a0a0a';
      this.ctx.fillRect(0, 0, this._displayWidth, this._displayHeight);
    }

    // Draw B on top with dissolve opacity
    if (imgB && progress > 0) {
      const alpha = Math.max(0, Math.min(1, progress));
      this.ctx.globalAlpha = alpha;
      this._drawImageCover(imgB);
      this.ctx.globalAlpha = 1;
      if (progress >= 0.5) {
        this._lastValidImage = imgB;
      }
    }

    this._lastDrawnKey = null;
    this._lastDrawnFloat = -1;
    this._lastDrawnFrame = -1;
  }

  /**
   * Draw an image covering the canvas (object-fit: cover).
   */
  _drawImageCover(img) {
    const cw = this._displayWidth;
    const ch = this._displayHeight;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    // Calculate cover dimensions
    const canvasRatio = cw / ch;
    const imageRatio = iw / ih;

    let sx, sy, sw, sh;
    if (imageRatio > canvasRatio) {
      // Image is wider — crop sides
      sh = ih;
      sw = ih * canvasRatio;
      sx = (iw - sw) / 2;
      sy = 0;
    } else {
      // Image is taller — crop top/bottom
      sw = iw;
      sh = iw / canvasRatio;
      sx = 0;
      sy = (ih - sh) / 2;
    }

    this.ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
  }
}
