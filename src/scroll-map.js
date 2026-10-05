/**
 * The Nines — Scroll Map
 * 
 * Pure function: given absolute scroll position → section state.
 * All animation state is derived from this — no timers, fully reversible.
 *
 * Round 2 (A2/B4): the video frame index AND every UI transform (title,
 * menu content, scrim, composition opacity) are computed here from the SAME
 * per-segment progress value. menu.js only applies `state.ui` — it computes
 * nothing of its own — so video and UI move in lockstep by construction.
 *
 * Velocity is continuous (C1) across every boundary:
 *   A(linear) → A(ease): cubic ease-out starts at the linear slope
 *   A → H: video velocity → 0 while menu content velocity → 1 px/px (H is 1:1)
 *          title velocity → 0 (title is pinned during H — Round 2, B1)
 *   H → X: content keeps 1 px/px; title ramps 0 → 1 px/px; video ramps from 0
 *   X → C: video ease-in ends exactly at the linear scrub slope
 */

import { CHOREOGRAPHY } from './config.js';

const clamp01 = (t) => Math.max(0, Math.min(1, t));

/** Hermite smoothstep between edges a and b. */
function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

// Fraction of the exit over which the pinned title accelerates up to the
// content's 1 px/px lift speed (C1 ramp, so the title never jerks).
const TITLE_LIFT_RAMP = 0.3;



function baseState(sec, idx) {
  return {
    sectionIndex: idx,
    section: sec,
    segment: 'C',
    videoProgress: 0,
    frameIndex: 0,
    segmentProgress: 0,
    entranceProgress: 0,      // 0 = not started, 1 = fully entered (debug HUD)
    exitProgress: 0,          // 0 = not started, 1 = fully exited (debug HUD)
    holdMenuScroll: 0,        // px scrolled within hold (for menu content)
    buttonsActive: false,     // "+" buttons state
    crossDissolve: null,      // null or { nextSectionIndex, progress }
    categoryProgress: 0, menuProgress: 0, entranceProgress: 0,
  };
}

function frameOf(p, frameCount) {
  return Math.max(0, Math.min(frameCount - 1, Math.round(p * (frameCount - 1))));
}

/**
 * Given absolute scroll position, return the current state.
 *
 * @param {number} scrollY - absolute scroll position in px
 * @param {Array} layout - from computeScrollLayout()
 * @returns {object} state object
 */
export function getScrollState(scrollY, layout) {
  if (!layout.length) return baseState(undefined, 0);

  // Clamp scroll
  const totalScroll = layout[layout.length - 1].scrollEnd;
  scrollY = Math.max(0, Math.min(scrollY, totalScroll));

  // Find active section
  let sec = layout[layout.length - 1];
  for (let i = 0; i < layout.length; i++) {
    if (scrollY >= layout[i].scrollStart && scrollY < layout[i].scrollEnd) {
      sec = layout[i];
      break;
    }
  }

  const idx = sec.index;
  const { holdP, frameCount, vh } = sec;
  const state = baseState(sec, idx);

  // ── Segment A: Scrub + Entrance ──────────────────────────────
  if (scrollY < sec.A_end) {
    const s = scrollY - sec.A_start;
    let p, e;
    if (s < sec.A_linLength) {
      // Linear scrub — no UI yet (choreography §4: 0 → 0.40 nothing on screen)
      p = s / sec.scrubPx;
      e = 0;
    } else {
      // One continuous cubic ease-out across the whole emergence window.
      // d p/d s at e=0 equals the linear slope → no rate step.
      e = clamp01((s - sec.A_linLength) / sec.A_easeLength);
      const k = 1 - e;
      p = sec.p_ease_start + (holdP - sec.p_ease_start) * (1 - k * k * k);
    }

    // Title: emerges from screen centre, rises, and decelerates to rest at its
    // pinned position together with the video (cubic, zero velocity at e=1).
    const k = 1 - e;
        const categoryProgress = smoothstep(0, 0.45, e);
    const menuProgress = smoothstep(0.35, 0.85, e);

    state.segment = 'A';
    state.videoProgress = p;
    state.frameIndex = frameOf(p, frameCount);
    state.segmentProgress = clamp01(s / sec.A_length);
    state.categoryProgress = categoryProgress;
    state.menuProgress = menuProgress;
    state.entranceProgress = Math.max(categoryProgress, menuProgress);
    return state;
  } else if (s < sec.H_end) {
    const held = s - sec.H_start;
    state.segment = 'H';
    state.videoProgress = holdP;
    state.frameIndex = sec.holdFrame;
    state.segmentProgress = clamp01(held / sec.H_length);
    state.holdMenuScroll = held;
    state.buttonsActive = true;
    state.categoryProgress = 1;
    state.menuProgress = 1;
    state.entranceProgress = 1;
    return state;
  } else if (s < sec.X_end) {
    const rawT = sec.X_length > 0 ? (s - sec.H_length) / sec.X_length : 0;
    const t = Math.max(0, Math.min(1, rawT));
    const resumeAt = CHOREOGRAPHY.exitVideoResumeAt;
    
    let p;
    if (t < resumeAt) {
      p = holdP;
    } else {
      const e = (t - resumeAt) / (1 - resumeAt);
      p = holdP + (sec.p_at_exit_end - holdP) * e * e;
    }

    state.segment = 'X';
    state.videoProgress = p;
    state.frameIndex = frameOf(p, frameCount);
    state.segmentProgress = t;
    state.exitProgress = t;
    state.holdMenuScroll = sec.H_length;
    state.buttonsActive = t <= 0.2;
    state.categoryProgress = 1 - t;
    state.menuProgress = 1 - t;
    return state;
  }

  // ── Segment H: Hold (video frozen, menu scrolls 1:1, title pinned) ──
  if (scrollY < sec.H_end) {
    const held = scrollY - sec.H_start;
    state.segment = 'H';
    state.videoProgress = holdP;
    state.frameIndex = frameOf(holdP, frameCount);
    state.segmentProgress = sec.H_length > 0 ? clamp01(held / sec.H_length) : 0;
    state.entranceProgress = 1;
    state.holdMenuScroll = held;
    state.buttonsActive = true;  // "+" buttons active during HOLD
    state.ui = {
      compOpacity: 1,
      titleOpacity: 1, titleEnterY: 0, titleExitY: 0,
      contentOpacity: 1, contentEnterY: 0, contentScrollY: -held,
      scrim: 1,
    };
    return state;
  }

  // ── Segment X: Exit (title + menu lift together, video resumes) ──
  if (scrollY < sec.X_end) {
    const s = scrollY - sec.X_start;
    const t = sec.X_length > 0 ? clamp01(s / sec.X_length) : 1;

    const resumeAt = CHOREOGRAPHY.exitVideoResumeAt;
    let p = holdP;
    if (t > resumeAt) {
      // Quadratic ease-in from zero speed, ending at the linear scrub slope
      const u = (t - resumeAt) / (1 - resumeAt);
      p = holdP + sec.p_covered_in_X * u * u;
    }

    // Title accelerates from pinned (0 px/px) to the content's 1 px/px lift
    const X = sec.X_length;
    const r = TITLE_LIFT_RAMP;
    const titleLift = t < r
      ? X * (t * t) / (2 * r)
      : X * (r / 2 + (t - r));

    state.segment = 'X';
    state.videoProgress = p;
    state.frameIndex = frameOf(p, frameCount);
    state.segmentProgress = t;
    state.entranceProgress = 1;
    state.exitProgress = t;
    state.holdMenuScroll = sec.H_length;
    // Keep tappable while menu is still largely on screen (first 20% of exit)
    state.buttonsActive = t <= 0.2;
    state.ui = {
      compOpacity: 1 - t,
      titleOpacity: 1, titleEnterY: 0, titleExitY: -titleLift,
      contentOpacity: 1, contentEnterY: 0, contentScrollY: -(sec.H_length + s),
      scrim: 1 - t,
    };
    return state;
  }

  // ── Segment C: Continuation (video plays to end) ─────────────
  if (scrollY < sec.C_end) {
    const t = sec.C_length > 0 ? clamp01((scrollY - sec.C_start) / sec.C_length) : 1;
    const p = Math.min(1, sec.p_at_exit_end + t * (1.0 - sec.p_at_exit_end));

    state.segment = 'C';
    state.videoProgress = p;
    state.frameIndex = frameOf(p, frameCount);
    state.segmentProgress = t;
    state.exitProgress = 1;

    if (sec.continuous) {
      // Food intro (Round 2, B2): video never pauses. The group title floats
      // in and out on top of the moving video, driven purely by p.
      const fadeIn = smoothstep(0.28, 0.42, p);
      const fadeOut = smoothstep(0.62, 0.80, p);
      const opacity = fadeIn * (1 - fadeOut);
      state.entranceProgress = fadeIn;
      state.exitProgress = fadeOut;
      state.ui = {
        compOpacity: 1,
        titleOpacity: opacity,
        // gentle constant upward drift, plus an extra lift while fading out
        titleEnterY: (0.5 - p) * 0.35 * vh,
        titleExitY: -fadeOut * 0.12 * vh,
        contentOpacity: 0, contentEnterY: 0, contentScrollY: 0,
        scrim: opacity * 0.6,
      };
    }
    return state;
  }

  // ── Segment J: Handoff (cross-dissolve to next section) ──────
  if (scrollY < sec.J_end) {
    const t = sec.J_length > 0 ? clamp01((scrollY - sec.J_start) / sec.J_length) : 1;
    const nextIdx = Math.min(idx + 1, layout.length - 1);

    state.segment = 'J';
    state.videoProgress = 1.0;
    state.frameIndex = frameCount - 1;
    state.segmentProgress = t;
    state.exitProgress = 1;
    state.crossDissolve = {
      nextSectionIndex: nextIdx,
      nextSection: layout[nextIdx],
      progress: t,  // 0 = all current, 1 = all next
    };
    return state;
  }

  // Past end — show last frame of last section
  state.segment = 'C';
  state.videoProgress = 1.0;
  state.frameIndex = frameCount - 1;
  state.segmentProgress = 1;
  state.exitProgress = 1;
  return state;
}





