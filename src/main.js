/**
 * The Nines — Main Entry Point (Phase 2: Core Scroll-Scrub Engine)
 * 
 * Orchestrates: config loading → scroll container setup → 
 * scroll listener → frame loading → canvas rendering → debug HUD.
 */

import { buildSectionConfig, computeScrollLayout } from './config.js';
import { getScrollState } from './scroll-map.js';
import { FrameCache } from './frame-cache.js';
import { Renderer } from './renderer.js';
import { DebugHUD } from './debug-hud.js';

import { buildMenuDOM, measureMenuHeights, updateMenuState } from './menu.js';
import { initListUI } from './list.js';
import { initNav } from './nav.js';

// ── Global state ────────────────────────────────────────────────
let layout = [];
let frameCache;
let renderer;
let debugHUD;
let scrollContainer;
let canvas;
let rafId = null;
let lastScrollY = -1;
let viewportHeight = window.innerHeight;

// Sections currently loading / loaded
const loadedSections = new Set();

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
  renderer = new Renderer(canvas, frameCache);
  debugHUD = new DebugHUD();

  // Load first section immediately
  loadSectionFrames(0, 'high');

  // Phase 3: Build DOM menu and measure real heights
  buildMenuDOM(layout);
  measureMenuHeights(layout, viewportHeight);
  
  // Recompute layout using the real measured heights!
  // CRITICAL FIX: we must pass `layout` (which now has measuredHeightPx and domElement)
  // instead of `sections` so we don't lose the DOM references!
  layout = computeScrollLayout(layout, viewportHeight);
  
  const totalScroll = layout[layout.length - 1].scrollEnd;
  console.log(`[The Nines] Total scroll height: ${Math.round(totalScroll)}px`);

  // Phase 4: Init Nav and List
  initNav(layout);
  initListUI();

  // Set up scroll container height
  scrollContainer = document.getElementById('scroll-container');
  // Add vh so the maximum scrollY (which is height - vh) equals totalScroll
  scrollContainer.style.height = `${totalScroll + viewportHeight}px`;

  // Poll for loading progress and dismiss loader
  const loaderBar = document.getElementById('loader-bar');
  const loaderText = document.getElementById('loader-text');
  const loaderEl = document.getElementById('loader');

  await new Promise(resolve => {
    const checkReady = () => {
      const firstKey = layout[0].key;
      const progress = frameCache.getProgress(firstKey);
      if (loaderBar) loaderBar.style.width = `${Math.round(progress * 100)}%`;
      if (loaderText) loaderText.textContent = `Loading ${Math.round(progress * 100)}%`;

      // Ready when at least 30% loaded (coarse frames available for smooth scrub)
      if (progress >= 0.3) {
        // Short minimum display to prevent flash
        setTimeout(() => {
          if (loaderEl) loaderEl.classList.add('done');
          resolve();
        }, 300);
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

function tick() {
  rafId = null;
  const scrollY = window.scrollY;
  
  // Skip if position hasn't changed
  if (scrollY === lastScrollY) return;
  lastScrollY = scrollY;

  // Get state from scroll position
  const state = getScrollState(scrollY, layout);

  // Render the frame
  renderer.render(state);

  // Sync the DOM menu overlay
  updateMenuState(state, layout, viewportHeight);

  // Manage section loading
  manageSectionLoading(state);

  // Update debug HUD
  const totalScroll = layout.length > 0 ? layout[layout.length - 1].scrollEnd : 0;
  debugHUD.update(state, scrollY, totalScroll);
}

// ── Section loading strategy ────────────────────────────────────
function manageSectionLoading(state) {
  const currentIdx = state.sectionIndex;

  // Load current section if not loaded
  loadSectionFrames(currentIdx, 'high');

  // Preload next section when ~70% through current
  if (state.segmentProgress > 0.7 || state.segment === 'C' || state.segment === 'J') {
    const nextIdx = currentIdx + 1;
    if (nextIdx < layout.length) {
      loadSectionFrames(nextIdx, 'low');
    }
  }

  // Also preload if we're in a cross-dissolve
  if (state.crossDissolve) {
    loadSectionFrames(state.crossDissolve.nextSectionIndex, 'high');
  }

  // Abort sections that are far away (more than 2 ahead or behind)
  // But keep compressed data cached — only abort in-progress loads
  for (const key of loadedSections) {
    const secIdx = layout.findIndex(s => s.key === key);
    if (secIdx >= 0 && Math.abs(secIdx - currentIdx) > 3) {
      // Don't unload — just stop loading if in progress
      // The browser HTTP cache keeps compressed data
    }
  }
}

function loadSectionFrames(sectionIndex, priority) {
  if (sectionIndex < 0 || sectionIndex >= layout.length) return;
  const sec = layout[sectionIndex];
  if (loadedSections.has(sec.key)) return;

  loadedSections.add(sec.key);
  frameCache.loadSection(sec.key, sec.framePath, sec.frameCount, priority);
  console.log(`[The Nines] Loading ${sec.key} (${priority})`);
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
