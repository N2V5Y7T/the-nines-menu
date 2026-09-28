/**
 * The Nines — Scroll Map
 * 
 * Pure function: given absolute scroll position → section state.
 * All animation state is derived from this — no timers, fully reversible.
 */

import { CHOREOGRAPHY } from './config.js';

/**
 * Smooth ease-out: decelerates as t → 1
 */
function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

/**
 * Smooth ease-in: accelerates from t = 0
 */
function easeIn(t) {
  return t * t;
}

/**
 * Apply easing near segment boundaries for smooth video speed transitions.
 * Eases the last `zone` fraction of the input with ease-out,
 * and the first `zone` fraction with ease-in.
 */
function easeVideoProgress(t, applyEaseOut, applyEaseIn, zone = 0.15) {
  if (applyEaseOut && t > 1 - zone) {
    const local = (t - (1 - zone)) / zone;  // 0..1 in the zone
    return (1 - zone) + zone * easeOut(local);
  }
  if (applyEaseIn && t < zone) {
    const local = t / zone;
    return zone * easeIn(local);
  }
  return t;
}

/**
 * Given absolute scroll position, return the current state.
 *
 * @param {number} scrollY - absolute scroll position in px
 * @param {Array} layout - from computeScrollLayout()
 * @returns {object} state object
 */
export function getScrollState(scrollY, layout) {
  // Default state (before first section)
  const defaultState = {
    sectionIndex: 0,
    section: layout[0],
    segment: 'A',
    videoProgress: 0,
    frameIndex: 0,
    segmentProgress: 0,
    entranceProgress: 0,      // 0 = not started, 1 = fully entered
    categoryProgress: 0,      // 0 = hidden, 1 = fully visible/positioned
    menuProgress: 0,          // 0 = hidden, 1 = fully visible
    exitProgress: 0,          // 0 = not started, 1 = fully exited
    holdMenuScroll: 0,        // px scrolled within hold (for menu content)
    buttonsActive: false,     // "+" buttons state
    crossDissolve: null,      // null or { nextSectionIndex, progress }
  };

  if (!layout.length) return defaultState;

  // Clamp scroll
  const totalScroll = layout[layout.length - 1].scrollEnd;
  scrollY = Math.max(0, Math.min(scrollY, totalScroll));

  // Find active section
  let sec = layout[0];
  for (let i = 0; i < layout.length; i++) {
    if (scrollY >= layout[i].scrollStart && scrollY < layout[i].scrollEnd) {
      sec = layout[i];
      break;
    }
    // If past all sections, use last
    if (i === layout.length - 1) {
      sec = layout[i];
    }
  }

  const idx = sec.index;
  const { holdP, frameCount, scrubLengthVh } = sec;
  const scrubPx = scrubLengthVh * (sec.A_length / holdP); // recover vh*px conversion

  // ── Segment A: Scrub + Entrance ──────────────────────────────
  if (scrollY < sec.A_end) {
    const rawT = sec.A_length > 0 ? (scrollY - sec.A_start) / sec.A_length : 0;
    const t = Math.max(0, Math.min(1, rawT));

    // Ease-out near hold (video decelerates into freeze)
    const easedT = easeVideoProgress(t, true, false);
    const p = easedT * holdP;

    // Entrance progress (category + menu appear during A)
    // Category: starts at categoryStart, ends rise at categoryRiseEnd (in video progress)
    const catStart = CHOREOGRAPHY.categoryStart;
    const catEnd = CHOREOGRAPHY.categoryRiseEnd;
    const menuStart = CHOREOGRAPHY.menuStart;
    const holdAt = CHOREOGRAPHY.holdAt;

    const categoryProgress = p < catStart ? 0 :
      p >= catEnd ? 1 :
      (p - catStart) / (catEnd - catStart);

    const menuProgress = p < menuStart ? 0 :
      p >= holdAt ? 1 :
      (p - menuStart) / (holdAt - menuStart);

    const entranceProgress = Math.max(categoryProgress, menuProgress);

    return {
      sectionIndex: idx,
      section: sec,
      segment: 'A',
      videoProgress: p,
      frameIndex: Math.round(p * (frameCount - 1)),
      segmentProgress: t,
      entranceProgress,
      categoryProgress,
      menuProgress,
      exitProgress: 0,
      holdMenuScroll: 0,
      buttonsActive: false,
      crossDissolve: null,
    };
  }

  // ── Segment H: Hold (video frozen, menu scrollable) ──────────
  if (scrollY < sec.H_end) {
    const t = sec.H_length > 0 ? (scrollY - sec.H_start) / sec.H_length : 0;

    return {
      sectionIndex: idx,
      section: sec,
      segment: 'H',
      videoProgress: holdP,
      frameIndex: sec.holdFrame,
      segmentProgress: Math.max(0, Math.min(1, t)),
      entranceProgress: 1,
      categoryProgress: 1,
      menuProgress: 1,
      exitProgress: 0,
      holdMenuScroll: scrollY - sec.H_start,
      buttonsActive: true,  // "+" buttons ONLY active during HOLD
      crossDissolve: null,
    };
  }

  // ── Segment X: Exit (menu lifts, video resumes) ──────────────
  if (scrollY < sec.X_end) {
    const rawT = sec.X_length > 0 ? (scrollY - sec.X_start) / sec.X_length : 0;
    const t = Math.max(0, Math.min(1, rawT));

    const resumeAt = CHOREOGRAPHY.exitVideoResumeAt;
    let p;
    if (t < resumeAt) {
      // Video still frozen
      p = holdP;
    } else {
      // Video resumes: ease-in from zero speed
      const resumeT = (t - resumeAt) / (1 - resumeAt);
      const easedResumeT = easeVideoProgress(resumeT, false, true);
      p = holdP + easedResumeT * sec.p_covered_in_X;
    }

    // Exit progress: menu lifts upward and fades
    const exitProgress = t;

    return {
      sectionIndex: idx,
      section: sec,
      segment: 'X',
      videoProgress: p,
      frameIndex: Math.round(p * (frameCount - 1)),
      segmentProgress: t,
      entranceProgress: 1,
      categoryProgress: 1, // Stay at 1 so CSS transform doesn't push it down
      menuProgress: 1,     // Stay at 1
      exitProgress,
      holdMenuScroll: sec.H_length,
      buttonsActive: false,  // INACTIVE during exit
      crossDissolve: null,
    };
  }

  // ── Segment C: Continuation (video plays to end) ─────────────
  if (scrollY < sec.C_end) {
    const rawT = sec.C_length > 0 ? (scrollY - sec.C_start) / sec.C_length : 0;
    const t = Math.max(0, Math.min(1, rawT));

    const p = sec.p_at_exit_end + t * (1.0 - sec.p_at_exit_end);

    return {
      sectionIndex: idx,
      section: sec,
      segment: 'C',
      videoProgress: Math.min(1, p),
      frameIndex: Math.min(frameCount - 1, Math.round(p * (frameCount - 1))),
      segmentProgress: t,
      entranceProgress: 0,
      categoryProgress: 0,
      menuProgress: 0,
      exitProgress: 1,
      holdMenuScroll: 0,
      buttonsActive: false,
      crossDissolve: null,
    };
  }

  // ── Segment J: Handoff (cross-dissolve to next section) ──────
  if (scrollY < sec.J_end) {
    const rawT = sec.J_length > 0 ? (scrollY - sec.J_start) / sec.J_length : 0;
    const t = Math.max(0, Math.min(1, rawT));

    const nextIdx = Math.min(idx + 1, layout.length - 1);

    return {
      sectionIndex: idx,
      section: sec,
      segment: 'J',
      videoProgress: 1.0,
      frameIndex: frameCount - 1,
      segmentProgress: t,
      entranceProgress: 0,
      categoryProgress: 0,
      menuProgress: 0,
      exitProgress: 1,
      holdMenuScroll: 0,
      buttonsActive: false,
      crossDissolve: {
        nextSectionIndex: nextIdx,
        nextSection: layout[nextIdx],
        progress: t,  // 0 = all current, 1 = all next
      },
    };
  }

  // Past end — show last frame of last section
  return {
    sectionIndex: idx,
    section: sec,
    segment: 'C',
    videoProgress: 1.0,
    frameIndex: frameCount - 1,
    segmentProgress: 1,
    entranceProgress: 0,
    categoryProgress: 0,
    menuProgress: 0,
    exitProgress: 1,
    holdMenuScroll: 0,
    buttonsActive: false,
    crossDissolve: null,
  };
}
