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

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this._displayWidth = rect.width;
    this._displayHeight = rect.height;
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
        key, frameIndex,
        crossDissolve.nextSection.key, 0,  // next section starts at frame 0
        crossDissolve.progress
      );
    } else {
      // ── Single frame ──
      this._renderFrame(key, frameIndex);
    }

    // Maintain decoded-frame window
    this.frameCache.maintainWindow(key, frameIndex);
  }

  /**
   * Draw a single frame from a section.
   */
  _renderFrame(sectionKey, frameIndex) {
    // Skip redraw if same frame
    if (this._lastDrawnKey === sectionKey && this._lastDrawnFrame === frameIndex) {
      return;
    }

    const img = this.frameCache.nearestFrame(sectionKey, frameIndex);
    if (!img) {
      // No frame at all — show black (should only happen during initial load)
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, this._displayWidth, this._displayHeight);
      return;
    }

    this._drawImageCover(img);
    this._lastDrawnKey = sectionKey;
    this._lastDrawnFrame = frameIndex;
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
  _renderCrossDissolve(keyA, frameA, keyB, frameB, progress) {
    const imgA = this.frameCache.nearestFrame(keyA, frameA);
    const imgB = this.frameCache.nearestFrame(keyB, frameB);

    // Draw A at full opacity
    if (imgA) {
      this.ctx.globalAlpha = 1;
      this._drawImageCover(imgA);
    } else {
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, this._displayWidth, this._displayHeight);
    }

    // Draw B on top with dissolve opacity
    if (imgB && progress > 0) {
      this.ctx.globalAlpha = progress;
      this._drawImageCover(imgB);
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
