# PROGRESS.md — The Nines Restaurant Website

> **Handoff file.** Updated at the end of every phase so any AI model can continue without prior conversation context.

---

## Project Overview

**What:** Mobile-first, scroll-driven restaurant menu website for "The Nines" restaurant (Est. 2023).  
**Concept:** Cinematic, scroll-linked frame sequence (canvas) with transparent floating menu text. Apple product page feel + Instagram Reels loading. QR-scan first-load speed is the #1 priority.  
**Tech Stack:** Vite + vanilla JavaScript, one `<canvas>` + DOM overlay, config-driven via `menu.json`.  
**Hosting:** Static CDN — **Cloudflare Pages** (confirmed).

---

## Current Status: PHASE 2 COMPLETE — Core scroll engine is running

---

## Locked Decisions (confirmed by user)

| Decision | Value |
|---|---|
| FFmpeg | ✅ `C:\Users\evele\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe` (v9.0.2) |
| Font combination | **Candidate A** — Playfair Display (display) + Inter (body) |
| Hosting | **Cloudflare Pages** |
| Estimated total | Show sum only — **no tax/GST mention** |
| Dietary tags | **YES** — veg/nonveg dot indicators required (menu.json has no veg flags yet) |
| Analytics | Privacy-friendly basic (Plausible.io) |

---

## Phase History

### Phase 0 — Setup, Inventory & Approvals ✅ COMPLETE (committed: eb74e24)
- All 19 videos mapped; `menu.json` validated (315 items).
- Logo identified; colors/fonts proposed and locked.

### Phase 1 — Asset Pipeline ✅ COMPLETE (committed: f6f09ce)
- **12fps, 720px width, WebP quality=82** selected based on user approval.
- All 19 videos extracted (1,824 frames total, ~75.8 MB total).
- `public/frames/manifest.json` built with frame counts, calculated hold frames, and tiny 20px blur placeholders.
- Watermark check on all key sections: **Clean (no watermarks)**.

### Phase 2 — Core Engine ✅ COMPLETE (committed: 3c3c557)
- `config.js`: Loads manifest/menu, computes `scrollStart`/`scrollEnd` and A/H/X/C/J segment boundaries for all sections based on menu height estimates.
- `scroll-map.js`: Pure function mapping raw scroll pixel position to a state object (video progress `p`, entrance progress, button active state).
- `frame-cache.js`: Handles coarse-to-fine loading, AbortController preemption, and a decoded sliding window (±10 frames) to keep memory usage safe (~70MB peak).
- `renderer.js`: Draws `object-fit: cover` to canvas, caps device pixel ratio at 2, handles J-segment cross-dissolves.
- `main.js`: Main orchestrator, rAF-coalesced scroll listener, implements look-ahead section preloading (fetches next section when current is >70% scrolled).
- `debug-hud.js`: Accessible via `?debug=1` in URL to monitor state, memory, and FPS.

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
