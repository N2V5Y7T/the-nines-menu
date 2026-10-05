/**
 * The Nines — Section Configuration Builder
 * 
 * Loads manifest.json + menu.json, computes per-section layout data:
 * scroll heights, frame paths, hold frames, choreography timing.
 */

// Default choreography values (from the-nines-animation-choreography.md)
// categoryStart / holdAt are expressed relative to a hold at p≈0.50 and are
// rescaled per section to that section's real holdP.
export const CHOREOGRAPHY = {
  // Entrance — the video decelerates over ONE continuous cubic ease-out that
  // spans categoryStart → holdAt. The title, menu and scrim are driven by the
  // very same eased progress value, so they cannot drift out of sync.
  categoryStart:      0.40,   // ease zone (and category emergence) begins
  holdAt:             0.50,   // video reaches holdFrame with zero velocity

  // Exit
  exitVideoResumeAt:  0.40,   // fraction of exit segment where video resumes
  exitLengthVh:       70,     // exit segment scroll length in vh
  handoffLengthVh:    35,     // cross-dissolve length in vh

  // Hold
  minHoldVh:          60,     // short menus still get a comfortable hold
  menuBottomRestVh:   88,     // last item comes to rest at this viewport height
};

// Sections whose video must play straight through with NO hold (Round 2, B2).
// Only the Food group intro — every other section keeps its hold.
const CONTINUOUS_SECTIONS = new Set(['food']);

// Estimate menu height in px from item count (refined in Phase 3 with real DOM)
function estimateMenuHeight(section) {
  const ITEM_HEIGHT = 85;       // px per item (name + desc + price row)
  const SUBHEADER_HEIGHT = 50;  // px per subgroup header
  const HEADER_HEIGHT = 60;     // category header
  const PADDING = 100;          // top/bottom padding

  let count = 0;
  let subheaders = 0;
  if (section.items) {
    count = section.items.length;
  } else if (section.subgroups) {
    subheaders = section.subgroups.length;
    count = section.subgroups.reduce((s, sg) => s + sg.items.length, 0);
  }

  return HEADER_HEIGHT + PADDING + count * ITEM_HEIGHT + subheaders * SUBHEADER_HEIGHT;
}

/**
 * Build complete section config from manifest + menu data.
 * Returns an array of section objects in scroll order.
 */
export async function buildSectionConfig() {
  const [manifestRes, menuRes] = await Promise.all([
    fetch('./frames/manifest.json'),
    fetch('./assets/menu/the-nines-menu.json'),
  ]);
  if (!manifestRes.ok) throw new Error(`Failed to load manifest: ${manifestRes.status}`);
  if (!menuRes.ok) throw new Error(`Failed to load menu: ${menuRes.status}`);
  const manifest = await manifestRes.json();
  const menu = await menuRes.json();

  const sections = [];

  for (const group of menu.groups) {
    // Group intro video (e.g. food.mp4)
    if (group.video && manifest[group.key]) {
      const m = manifest[group.key];
      sections.push({
        key: group.key,
        label: group.label,
        type: 'group-intro',
        groupKey: group.key,
        framePath: `./frames/${group.key}/`,
        frameCount: m.frameCount,
        holdFrame: m.holdFrame,
        // holdP maps EXACTLY onto holdFrame via frame = round(p * (frameCount-1))
        holdP: m.holdFrame / (m.frameCount - 1),
        // Same frames-per-scroll density as regular sections (280vh / 96 frames)
        scrubLengthVh: Math.round(280 * m.frameCount / 96),
        continuous: CONTINUOUS_SECTIONS.has(group.key),
        estimatedMenuHeightPx: 0,  // no menu items in group intro
        hasMenu: false,
        placeholderBytes: m.placeholderBytes,
      });
    }

    // Regular sections
    for (const sec of group.sections) {
      const m = manifest[sec.key];
      if (!m) {
        console.warn(`[Config] No manifest entry for section: ${sec.key}`);
        continue;
      }

      const holdFrame = sec.holdFrame ?? m.holdFrame;

      sections.push({
        key: sec.key,
        label: sec.label,
        type: 'section',
        groupKey: group.key,
        groupLabel: group.label,
        framePath: `./frames/${sec.key}/`,
        frameCount: m.frameCount,
        holdFrame,
        holdP: holdFrame / (m.frameCount - 1),
        scrubLengthVh: sec.scrubLengthVh || 280,
        continuous: CONTINUOUS_SECTIONS.has(sec.key),
        estimatedMenuHeightPx: estimateMenuHeight(sec),
        hasMenu: true,
        items: sec.items || null,
        subgroups: sec.subgroups || null,
        note: sec.note || null,
        placeholderBytes: m.placeholderBytes,
      });
    }
  }

  return sections;
}

/**
 * Compute scroll layout for all sections.
 * Returns section objects augmented with absolute scroll positions (in px).
 *
 * Velocity continuity (Round 2, A2/B4): every segment boundary is C1 —
 * the video's frames-per-pixel never jumps. The entrance ease zone is a cubic
 * ease-out whose starting slope equals the linear scrub slope, which fixes its
 * scroll length at 3 × Δp × scrubPx. The exit resume is a quadratic ease-in
 * whose final slope equals the continuation slope, so it covers R / (2·scrubPx).
 *
 * @param {Array} sections - from buildSectionConfig()
 * @param {number} vh - viewport height in px
 */
export function computeScrollLayout(sections, vh) {
  let scrollOffset = 0;  // current absolute scroll position

  return sections.map((sec, index) => {
    const holdP = sec.holdP;
    const scrubPx = (sec.scrubLengthVh / 100) * vh;
    const handoffPx = (CHOREOGRAPHY.handoffLengthVh / 100) * vh;
    const isLast = index === sections.length - 1;
    const J_length = isLast ? 0 : handoffPx;

    let A_length, A_linLength, A_easeLength, easeStartP, H_length, X_length;
    let p_covered_in_X, C_length;

    if (sec.continuous) {
      // ── Continuous section (Food intro): one linear scrub, no hold ──
      easeStartP = 0;
      A_linLength = 0;
      A_easeLength = 0;
      A_length = 0;
      H_length = 0;
      X_length = 0;
      p_covered_in_X = 0;
      C_length = scrubPx;          // p: 0 → 1 at constant rate
    } else {
      // Segment A: linear scrub to easeStartP, then C1 cubic ease-out to holdP
      easeStartP = holdP * (CHOREOGRAPHY.categoryStart / CHOREOGRAPHY.holdAt);
      A_linLength = easeStartP * scrubPx;
      A_easeLength = 3 * (holdP - easeStartP) * scrubPx;
      A_length = A_linLength + A_easeLength;

      // Segment H: video frozen, menu scrolls 1:1
      const minHold = (CHOREOGRAPHY.minHoldVh / 100) * vh;
      H_length = sec.hasMenu
        ? Math.max(
            sec.measuredHeightPx !== undefined ? sec.measuredHeightPx : sec.estimatedMenuHeightPx,
            minHold)
        : 0;

      // Segment X: exit. Video frozen until exitVideoResumeAt, then a quadratic
      // ease-in that ends exactly at the linear scrub slope.
      X_length = (CHOREOGRAPHY.exitLengthVh / 100) * vh;
      const resumeLength = (1 - CHOREOGRAPHY.exitVideoResumeAt) * X_length;
      p_covered_in_X = resumeLength / (2 * scrubPx);

      // Segment C: remaining video progress at the linear scrub slope
      const remaining_p = Math.max(0, 1.0 - holdP - p_covered_in_X);
      C_length = remaining_p * scrubPx;
    }

    const totalHeight = A_length + H_length + X_length + C_length + J_length;

    const layout = {
      ...sec,
      index,
      vh,
      scrubPx,
      scrollStart: scrollOffset,
      scrollEnd: scrollOffset + totalHeight,
      totalHeight,

      // Segment boundaries (absolute scroll positions)
      A_start: scrollOffset,
      A_end: scrollOffset + A_length,
      A_length,
      A_linLength,
      A_easeLength,

      H_start: scrollOffset + A_length,
      H_end: scrollOffset + A_length + H_length,
      H_length,

      X_start: scrollOffset + A_length + H_length,
      X_end: scrollOffset + A_length + H_length + X_length,
      X_length,
      X_videoResumeAt: scrollOffset + A_length + H_length + CHOREOGRAPHY.exitVideoResumeAt * X_length,

      C_start: scrollOffset + A_length + H_length + X_length,
      C_end: scrollOffset + A_length + H_length + X_length + C_length,
      C_length,

      J_start: scrollOffset + A_length + H_length + X_length + C_length,
      J_end: scrollOffset + totalHeight,
      J_length,

      // Pre-computed p values
      p_ease_start: easeStartP,
      p_at_hold: holdP,
      p_at_exit_end: sec.continuous ? 0 : holdP + p_covered_in_X,
      p_covered_in_X,
    };

    scrollOffset += totalHeight;
    return layout;
  });
}
