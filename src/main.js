/**
 * The Nines — Main Entry Point
 *
 * Orchestrates: config loading → scroll container setup →
 * scroll listener → frame loading → canvas rendering → debug HUD.
 */

import { buildSectionConfig, computeScrollLayout } from './config.js';
import { getScrollState } from './scroll-map.js';
import { FrameCache } from './frame-cache.js';
import { SmartLoader } from './loader.js';
import { ScrollEaser } from './scroll-easer.js';
import { Renderer } from './renderer.js';
import { DebugHUD } from './debug-hud.js';

import { buildMenuDOM, measureMenuHeights, updateMenuState } from './menu.js';
import { initListUI } from './list.js';
import { initNav } from './nav.js';

// ── Global state ────────────────────────────────────────────────
let layout = [];
let frameCache;
let loader;          // SmartLoader (Phase 5)
let easer;           // ScrollEaser (Phase 6)
let renderer;
let debugHUD;
let scrollContainer;
let canvas;
let rafId = null;
let lastScrollY = -1;
let viewportHeight = window.innerHeight;

// ── Init ────────────────────────────────────────────────────────
async function init() {
  console.log('[The Nines] Initializing…');

  const sections = await buildSectionConfig();
  console.log(`[The Nines] ${sections.length} sections configured`);

  viewportHeight = window.innerHeight;
  layout = computeScrollLayout(sections, viewportHeight);

  // Set up canvas & core systems
  canvas = document.getElementById('main-canvas');
  frameCache = new FrameCache();
  loader = new SmartLoader(frameCache, layout);
  easer  = new ScrollEaser();
  renderer = new Renderer(canvas, frameCache);
  debugHUD = new DebugHUD();

  // Kick off loading section 0 (current) at high priority
  loader.jumpTo(0);

  // Phase 3: Build DOM menu and measure real heights
  buildMenuDOM(layout);
  measureMenuHeights(layout, viewportHeight);
  
  // Recompute layout using the real measured heights!
  // CRITICAL FIX: we must pass `layout` (which now has measuredHeightPx and domElement)
  // instead of `sections` so we don't lose the DOM references!
  layout = computeScrollLayout(layout, viewportHeight);
  
  const totalScroll = layout[layout.length - 1].scrollEnd;
  console.log(`[The Nines] Total scroll height: ${Math.round(totalScroll)}px`);

  // Phase 4: Init Nav and List (Phase 5: pass loader; Phase 6: pass easer for snap)
  initNav(layout, loader, easer);
  initListUI();

  // Set up scroll container height
  scrollContainer = document.getElementById('scroll-container');
  // Add vh so the maximum scrollY (which is height - vh) equals totalScroll
  scrollContainer.style.height = `${totalScroll + viewportHeight}px`;

  // Wait for initial frames to load before revealing the screen
  await new Promise(resolve => {
    const checkReady = () => {
      const firstKey = layout[0].key;
      const progress = loader.getProgress(firstKey);

      // Ready when at least 20% loaded (coarse frames available for smooth scrub)
      if (progress >= 0.2) {
        // Short delay to ensure GPU texture upload
        setTimeout(() => {
          document.body.classList.add('ready');
          resolve();
        }, 150);
      } else {
        requestAnimationFrame(checkReady);
      }
    };
    requestAnimationFrame(checkReady);
  });

  // Start scroll loop
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  
  // Initial render
  onScroll();

  console.log('[The Nines] Ready');
}

// ── Scroll handler ──────────────────────────────────────────────
function onScroll() {
  if (rafId) return;  // coalesce to rAF
  rafId = requestAnimationFrame(tick);
}

const themeAnalyzerCanvas = document.createElement('canvas');
themeAnalyzerCanvas.width = 64;
themeAnalyzerCanvas.height = 64;
const themeCtx = themeAnalyzerCanvas.getContext('2d', { willReadFrequently: true });

function analyzeTheme(image) {
  themeCtx.drawImage(image, 0, 0, 64, 64);
  const data = themeCtx.getImageData(0, 0, 64, 64).data;
  let r=0, g=0, b=0, count=0;
  for (let i = 0; i < data.length; i += 16) {
    r += data[i]; g += data[i+1]; b += data[i+2];
    count++;
  }
  const lum = (0.299*(r/count) + 0.587*(g/count) + 0.114*(b/count));
  return lum > 140 ? 'light' : 'dark';
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    // Video is bright -> text must be dark
    root.style.setProperty('--text-main', '#111');
    root.style.setProperty('--text-muted', '#555');
    root.style.setProperty('--text-desc', '#444');
    root.style.setProperty('--text-shadow', '0 2px 16px rgba(255,255,255,0.7), 0 1px 3px rgba(255,255,255,1)');
    root.style.setProperty('--chip-bg', 'rgba(0,0,0,0.06)');
    root.style.setProperty('--chip-border', 'rgba(0,0,0,0.15)');
    root.style.setProperty('--chip-label', '#555');
    root.style.setProperty('--btn-border', 'rgba(0,0,0,0.4)');
  } else {
    // Video is dark -> text must be light (default)
    root.style.setProperty('--text-main', '#fff');
    root.style.setProperty('--text-muted', '#999');
    root.style.setProperty('--text-desc', '#bbb');
    root.style.setProperty('--text-shadow', '0 2px 16px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.9)');
    root.style.setProperty('--chip-bg', 'rgba(255,255,255,0.07)');
    root.style.setProperty('--chip-border', 'rgba(255,255,255,0.1)');
    root.style.setProperty('--chip-label', '#aaa');
    root.style.setProperty('--btn-border', 'rgba(255,255,255,0.3)');
  }
}

function tick() {
  rafId = null;
  const realScrollY = window.scrollY;

  // Phase 6: ease the display position toward the real scroll for smooth wheel feel
  const scrollY = easer ? easer.tick(realScrollY) : realScrollY;

  // Keep firing rAF while still easing (display hasn't caught up to real)
  const stillEasing = Math.abs(scrollY - realScrollY) > 0.5;
  if (stillEasing) {
    rafId = requestAnimationFrame(tick);
  }

  // Skip full render if neither display nor real position changed
  if (scrollY === lastScrollY && !stillEasing) return;
  lastScrollY = scrollY;

  // Get state from eased scroll position
  const state = getScrollState(scrollY, layout);

  // Render the frame
  renderer.render(state);

  // Dynamic Theme (Phase 7b): Check video brightness and adapt text legibility
  if (state.sectionIndex >= 0) {
    const sec = layout[state.sectionIndex];
    const frameImg = frameCache.getFrame(sec.key, state.frameIndex) || frameCache.nearestFrame(sec.key, state.frameIndex);
    if (frameImg) {
      if (!frameImg.analyzedLum) {
        frameImg.analyzedLum = analyzeTheme(frameImg);
      }
      applyTheme(frameImg.analyzedLum);
    }
  }

  // Sync the DOM menu overlay
  updateMenuState(state, layout, viewportHeight);

  // Phase 5: Smart loading — advance queue based on scroll position
  loader.advance(state);

  // Update debug HUD
  const totalScroll = layout.length > 0 ? layout[layout.length - 1].scrollEnd : 0;
  debugHUD.update(state, scrollY, totalScroll);
}

// ── Resize handler ──────────────────────────────────────────────
function onResize() {
  const vh = window.innerHeight;
  const sections = layout.map(s => ({
    ...s,
    // Keep the original config data — recompute scroll layout
  }));

  // Recompute layout is expensive — debounce
  // For now, just resize the renderer
  renderer.resize();
  
  // Force redraw
  lastScrollY = -1;
  onScroll();
}

// ── Start ───────────────────────────────────────────────────────
init().catch(err => {
  console.error('[The Nines] Init failed:', err);
});
