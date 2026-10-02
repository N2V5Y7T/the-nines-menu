# PROGRESS.md — The Nines Restaurant Website

> **Handoff file.** Updated at the end of every phase so any AI model can continue without prior conversation context.

---

## Project Overview

**What:** Mobile-first, scroll-driven restaurant menu website for "The Nines" restaurant (Est. 2023).  
**Concept:** Cinematic, scroll-linked frame sequence (canvas) with transparent floating menu text. Apple product page feel + Instagram Reels loading. QR-scan first-load speed is the #1 priority.  
**Tech Stack:** Vite + vanilla JavaScript, one `<canvas>` + DOM overlay, config-driven via `menu.json`.  
**Hosting:** Static CDN — **Cloudflare Pages** (confirmed).

---

## Current Status: PHASE 7 COMPLETE — SEO JSON-LD, No-JS HTML Fallback, CSV Converter live

---

## Locked Decisions (confirmed by user)

| Decision | Value |
|---|---|
| FFmpeg | ✅ `C:\Users\evele\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe` (v9.0.2) |
| Font combination | **Candidate A** — Playfair Display (400) + Inter (body) |
| Hosting | **Cloudflare Pages** |
| Estimated total | Show sum only — **no tax/GST mention** |
| Dietary tags | **YES** — dot indicators implemented (`.diet-dot`), wired to `item.diet` in JSON |
| Analytics | Privacy-friendly basic (Plausible.io) |

---

## Phase History

### Phase 0–2 ✅ COMPLETE — See earlier commits (eb74e24 → 3c3c557)

### Phase 3 — DOM Menu & Styling ✅ COMPLETE (51e1563, fbf98b8)

### Phase 4 — Navigation & My List ✅ COMPLETE (72203ec)
- Top Bar: Hamburger, logo blend, My List counter
- Hamburger drawer: group headers (Food/Bar/Beverages), indented section links
- list.js: add/remove, running total, no tax wording
- Interaction guard: buttons inert outside Segment H

### Phase 5 — Loading Strategy ✅ COMPLETE (eef59e8)
- `loader.js` — `SmartLoader` class with three priority tiers:
  - **CRITICAL**: nav jump destination (aborts all distant loads first via `AbortController`)
  - **HIGH**: current section (always loading)
  - **PRELOAD**: next 1–2 sections ahead at low priority
- `advance(state)` called every tick; automatically queues the next section once user is ≥50% through current.
- `jumpTo(destIdx)` called from hamburger nav tap; aborts stale loads for sections >2 away; immediately feeds destination at high priority.
- **Blur-up placeholder**: renderer now draws first frame blurred (CSS `filter: blur(12px)`) while real frames are loading — no more black flashes.
- Loading bar now driven by real `SmartLoader.getProgress()` — no fake timer.

### Phase 6 — Responsive & Motion Polish ✅ COMPLETE (eef504b)
**CSS:**
- **Desktop**: `#canvas-viewport`, `#top-nav`, `#menu-layer` all constrained to a centered `9:16` column; `body::before/after` pseudo-elements fill the letterbox with `#0a0a0a` side bars.
- **Landscape phones** (`max-height: 500px`): all columns expand to 100% width, nav shrinks to `52px`, typography scaled down.
- **Safe-area insets**: `#top-nav` and drawers correctly pad for iPhone notch, Dynamic Island, and home-bar using `env(safe-area-inset-*)`.
- **Touch targets**: all interactive elements guaranteed `44×44px` minimum hit area (WCAG 2.5.5); `.add-btn` uses `::after` pseudo-element to expand tap zone without changing visual size.
- **`prefers-reduced-motion`**: menu entrance/exit skips transforms (opacity-only fade), drawers appear instantly, `.add-btn` pop animation disabled, nav smooth-scroll bypassed.

**JS:**
- `scroll-easer.js`: exponential ease (`factor 0.18`) toward real `scrollY` per rAF — eliminates trackpad shudder; auto-bypasses when `prefers-reduced-motion` is active.
- `main.js`: `easer.tick()` called in `tick()` with self-sustaining rAF loop while display hasn't caught up.
- `nav.js`: `easer.snap(targetScroll)` called on nav jump so display position teleports to destination instantly.

### Phase 7 — Fallback, SEO & Extras ✅ COMPLETE (2971b0f)
- **Vite SEO Plugin**: Wrote a custom Vite plugin (`vite.config.js`) that intercepts the HTML during dev/build. It parses `menu.json` and automatically injects:
  - **JSON-LD Schema**: A full `Restaurant` > `Menu` > `MenuSection` > `MenuItem` schema tree. It natively understands options, prices, and maps `diet: 'veg'` to `https://schema.org/VegetarianDiet`. This makes Google index the menu perfectly.
  - **No-JS HTML Fallback**: A `<noscript>` tag containing the entire menu in semantic HTML (`h1`, `h2`, `p`, etc.). This guarantees search engines can crawl the text content and ensures users with JavaScript disabled still see the menu and prices.
- **CSV Converter Utility**: Created `scripts/csv-to-menu.js`, a Node script allowing the restaurant owner to edit their menu in Excel/CSV and automatically compile it into the complex nested JSON format required by the site.

---

## File Structure (as of Phase 2)

```
the-nines-website/
├── .git/
├── .gitignore                 ← (excludes /public/frames)
├── PROGRESS.md
├── package.json
├── vite.config.js
├── index.html                 ← Sticky canvas + scroll container + loader
├── frame-viewer.html
├── public/
│   ├── assets/
│   │   ├── logo.jpg
│   │   └── menu/the-nines-menu.json
│   └── frames/                ← All 19 extracted sequences + manifest
└── src/
    ├── main.js                ← Scroll loop & orchestration
    ├── config.js              ← Layout computation
    ├── scroll-map.js          ← Pure-function state machine
    ├── frame-cache.js         ← Memory/fetch management
    ├── renderer.js            ← Canvas drawing
    └── debug-hud.js           ← Dev tools overlay
```

---

## Technical Details

- **Memory management:** Uses `Image` objects. The browser manages compressed HTTP caching. We maintain a strict `DECODE_WINDOW` of ±10 frames from the current position, evicting frames outside this window so decoded bitmap memory never balloons on long scrolls.
- **Scroll Hijacking:** **None.** The body naturally scrolls. The canvas is `position: sticky`. The `H_length` (menu hold) is directly mapped to the estimated DOM height of the menu items.
- **Cross-dissolve:** Handled cleanly in `renderer.js` by checking `state.crossDissolve` and blending `globalAlpha`.
- **Loading UI:** Initial loader waits until 30% of the first section's frames are loaded (coarse pass complete) before dismissing, ensuring a smooth first scrub.

---

## Next Phase

**Phase 3 — DOM Menu & Styling**
- Build the overlay HTML structure (`position: absolute` containers).
- Mount sections dynamically based on the active section window to keep DOM light.
- Sync DOM container `transform: translateY()` with the scroll offset (the `holdMenuScroll` value from `scroll-map.js`) so the menu scrolls exactly 1:1 with the page during the hold segment.
- Implement the emergence rise and fade-out logic based on `entranceProgress` and `exitProgress`.
- Style typography (Playfair Display + Inter).

---

## Important Notes for Next Model

- Git: `C:\Program Files\Git\cmd\git.exe`
- Node/npm: `C:\Program Files\nodejs\node.exe` and `C:\Program Files\nodejs\npm.cmd`
- Local Vite: `.\node_modules\.bin\vite.cmd`
- To test the engine, open `http://localhost:5173/?debug=1`. You should be able to scroll through all 19 videos stitched together continuously.
