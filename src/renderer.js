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

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * Set canvas dimensions based on viewport, capped at DPR 2.
   */
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const rect = this.canvas.getBoundingClientRect();

    console.log(`[Renderer] Resize: rect=${rect.width}x${rect.height}, dpr=${dpr}`);

    // Fallback if styling failed (e.g. dvh not supported)
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this._displayWidth = w;
    this._displayHeight = h;
    
    // Force a redraw on resize
    this._lastDrawnKey = null;
  }

  /**
   * Render the current scroll state to the canvas.
   *
   * @param {object} state - from getScrollState()
   */
  render(state) {
    const { section, frameIndex, crossDissolve } = state;
    const key = section.key;

    if (crossDissolve) {
      // ── Cross-dissolve between two sections ──
      this._renderCrossDissolve(
  section, frameIndex,
  crossDissolve.nextSection, 0,
  crossDissolve.progress
);
    } else {
      // ── Single frame (pass section for blur-up placeholder) ──
      this._renderFrame(key, frameIndex, section);
    }

    // Maintain decoded-frame window
    this.frameCache.maintainWindow(key, frameIndex);
  }

  /**
   * Draw a single frame from a section.
   * Falls back to the section's blur placeholder if no frame is loaded yet.
   */
  _renderFrame(sectionKey, frameIndex, section) {
    // Skip redraw if same frame
    if (this._lastDrawnKey === sectionKey && this._lastDrawnFrame === frameIndex) {
      return;
    }

    const img = this.frameCache.nearestFrame(sectionKey, frameIndex);
    if (!img) {
      // No frame yet — draw blur placeholder if available
      this._drawPlaceholder(section);
      return;
    }

    this._drawImageCover(img);
    this._lastDrawnKey = sectionKey;
    this._lastDrawnFrame = frameIndex;
  }

  /**
   * Draw the section's blurred placeholder (tiny WebP blob stored in manifest).
   * Cached as an Image per section key.
   */
  _drawPlaceholder(section) {
    if (!section) return;
    
    const key = section.key;
    if (!this._placeholders) this._placeholders = new Map();

    let ph = this._placeholders.get(key);
    if (!ph) {
      ph = { state: 'loading', img: null };
      this._placeholders.set(key, ph);
      
      const img = new Image();
      img.onload = () => { ph.img = img; ph.state = 'loaded'; this._lastDrawnFrame = -1; };
      if (section.placeholderBytes) {
        img.src = 'data:image/webp;base64,' + section.placeholderBytes;
      } else {
        img.src = `${section.framePath}frame0001.webp`;
      }
    }

    if (ph.state === 'loaded' && ph.img) {
      // Apply CSS blur via canvas filter (supported in all modern browsers)
      this.ctx.filter = 'blur(12px)';
      this._drawImageCover(ph.img);
      this.ctx.filter = 'none';
    }
  }

  /**
   * Cross-dissolve between two frames from different sections.
   *
   * @param {string} keyA - current section key
   * @param {number} frameA - current frame index
   * @param {string} keyB - next section key
   * @param {number} frameB - next frame index
   * @param {number} progress - 0 = all A, 1 = all B
   */
  _renderCrossDissolve(secA, frameA, secB, frameB, progress) {
    const keyA = secA.key;
    const keyB = secB.key;
    const imgA = this.frameCache.nearestFrame(keyA, frameA);
    const imgB = this.frameCache.nearestFrame(keyB, frameB);

    this.ctx.globalAlpha = 1;
    if (imgA) {
      this._drawImageCover(imgA);
    } else {
      this._drawPlaceholder(secA);
    }

    if (progress > 0) {
      this.ctx.globalAlpha = progress;
      if (imgB) {
        this._drawImageCover(imgB);
      } else {
        this._drawPlaceholder(secB);
      }
      this.ctx.globalAlpha = 1;
    }

    this._lastDrawnKey = null;  // force redraw next time
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


