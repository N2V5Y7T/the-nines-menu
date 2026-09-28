# PROGRESS.md — The Nines Restaurant Website

> **Handoff file.** Updated at the end of every phase so any AI model can continue without prior conversation context.

---

## Project Overview

**What:** Mobile-first, scroll-driven restaurant menu website for "The Nines" restaurant (Est. 2023).  
**Concept:** Cinematic, scroll-linked frame sequence (canvas) with transparent floating menu text. Apple product page feel + Instagram Reels loading. QR-scan first-load speed is the #1 priority.  
**Tech Stack:** Vite + vanilla JavaScript, one `<canvas>` + DOM overlay, config-driven via `menu.json`.  
**Hosting:** Static CDN — **Cloudflare Pages** (confirmed).

---

## Current Status: PHASE 4 COMPLETE — Navigation, My List, and Cart logic are live

---

## Locked Decisions (confirmed by user)

| Decision | Value |
|---|---|
| FFmpeg | ✅ `C:\Users\evele\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe` (v9.0.2) |
| Font combination | **Candidate A** — Playfair Display (400) + Inter (body) |
| Hosting | **Cloudflare Pages** |
| Estimated total | Show sum only — **no tax/GST mention** |
| Dietary tags | **YES** — veg/nonveg dot indicators implemented (`.diet-dot`) |
| Analytics | Privacy-friendly basic (Plausible.io) |

---

## Phase History

### Phase 0 — Setup, Inventory & Approvals ✅ COMPLETE (committed: eb74e24)
- All 19 videos mapped; `menu.json` validated (315 items).

### Phase 1 — Asset Pipeline ✅ COMPLETE (committed: f6f09ce)
- **12fps, 720px width, WebP quality=82** selected based on user approval.
- All 19 videos extracted (1,824 frames total, ~75.8 MB total).

### Phase 2 — Core Engine ✅ COMPLETE (committed: 3c3c557)
- `config.js`: Computes scroll boundaries for A/H/X/C/J segments.
- `scroll-map.js`: Pure function mapping raw scroll pixel position to a state object.
- `frame-cache.js`: Memory-safe frame sliding window (±10 frames).
- `renderer.js`: DPR-capped canvas rendering with J-segment cross-dissolve.

### Phase 3 — DOM Menu & Styling ✅ COMPLETE (committed: 51e1563, fbf98b8)
- `menu.js`: Generates `#menu-layer` DOM from `menu.json`.
- **Dynamic Measurement**: Measures true DOM height to compute total scroll length.
- **Cinematic Choreography**: Text emerges gracefully from the center and floats up.
- **Premium Typography**: Playfair Display (headings) + Inter (body).

### Phase 4 — Navigation & My List ✅ COMPLETE (committed: 72203ec)
- **Top Bar**: Fixed header with Hamburger icon, transparent logo overlay, and My List counter.
- **Menu Drawer**: Dynamically generated side-panel links that scroll to sections.
- **Cart Logic (`list.js`)**: Real-time sum tracking, add/remove functions, popup drawer.
- **Interaction Guard**: Added rigorous check so "+" buttons are **inert** when scrolling/scrubbing, and only active when the video is frozen on a hold frame.

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
