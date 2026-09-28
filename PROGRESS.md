# PROGRESS.md — The Nines Restaurant Website

> **Handoff file.** Updated at the end of every phase so any AI model can continue without prior conversation context.

---

## Project Overview

**What:** Mobile-first, scroll-driven restaurant menu website for "The Nines" restaurant (Est. 2023).  
**Concept:** Cinematic, scroll-linked frame sequence (canvas) with transparent floating menu text. Apple product page feel + Instagram Reels loading. QR-scan first-load speed is the #1 priority.  
**Tech Stack:** Vite + vanilla JavaScript, one `<canvas>` + DOM overlay, config-driven via `menu.json`.  
**Hosting:** Static CDN — **Cloudflare Pages** (confirmed).

---

## Current Status: PHASE 1 QUALITY GATE — awaiting user approval to process remaining sections

---

## Locked Decisions (confirmed by user)

| Decision | Value |
|---|---|
| FFmpeg | ✅ `C:\Users\evele\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe` (v9.0.2) |
| Font combination | **Candidate A** — Playfair Display (display) + Inter (body) |
| Hosting | **Cloudflare Pages** |
| Estimated total | Show sum only — **no tax/GST mention** |
| Dietary tags | **YES** — veg/nonveg dot indicators required (menu.json has no veg flags yet — owner must add; show dots only where data exists) |
| Analytics | Privacy-friendly basic (Plausible.io — no cookies, GDPR-safe) |

---

## Phase History

### Phase 0 — Setup, Inventory & Approvals ✅ COMPLETE (committed: eb74e24)

- All 19 videos found and mapped to section keys — zero unmatched, zero missing
- `menu.json` validated: 315 items, 18 sections, 3 groups
- Logo found: `assets/reference/Logo.jpg` → art-deco copper design
- Color palette measured from reference screenshots (white text on warm video)
- Three font candidates proposed; user selected Candidate A
- All other decisions above locked
- Git initialized; PROGRESS.md created

### Phase 1 — Asset Pipeline (first section) ✅ COMPLETE — awaiting quality approval

**Video probed:**
- All 19 videos: 720×1280, 24fps
- Most: 8s = 192 source frames; `food.mp4`: 10s = 240 source frames

**Frames extracted — `first-course.mp4`:**
- Method: `ffmpeg -vf fps=15,scale=720:-1 -c:v libwebp -quality 82`
- Frame count: **120 frames** (8s × 15fps)
- **720px total: 3.03 MB** — avg 26 KB/frame, min 5 KB, max 31 KB
- **900px total: 3.97 MB** — avg 34 KB/frame (+31% vs 720px)
- Placeholder: **126 bytes** (20px blur WebP, inlineable as base64)

**Watermark check:** Frame 1 ✅ Frame 60 ✅ Frame 120 ✅ — NO watermarks found

**Hold frame:** Frame 60 proposed (p≈0.50) — well-lit food bowl, good contrast for white text overlay. Text area: dark background (black/navy bowl), high contrast — white text will be very legible.

**Performance budget:**
- Per-section 720px: ~3 MB (within 1.1–1.9 MB spec target — slightly over; 900px would be ~4 MB)
- 19 sections × 3 MB ≈ 57 MB total compressed storage (never all in memory at once)
- Active load: ~3-4 MB (current + 20-30% of next) — within 2-3 MB target
- **Note:** Spec budget targets 1.1–1.9 MB/section. At 26 KB avg × 120 frames = 3.0 MB this section is slightly above. Most videos are simple food shots that should compress well. Recommend confirming quality=82 is acceptable vs testing quality=70-75 to hit the 1.5 MB target.

**Frame viewer:** `frame-viewer.html` — opens in browser, scrub all 120 frames, side-by-side 720 vs 900 comparison, hold-frame jump button.

**Dev server:** Vite 5.4.21 at `http://localhost:5173/frame-viewer.html`

---

## File Structure (as of Phase 1)

```
the-nines-website/
├── .git/
├── .gitignore
├── PROGRESS.md
├── package.json               ← Vite project
├── vite.config.js
├── index.html                 ← Main entry (stub; Phase 2 builds the app here)
├── frame-viewer.html          ← Quality gate viewer
├── src/
│   └── main.js                ← Entry point stub
├── public/
│   ├── assets/
│   │   └── logo.jpg           ← The Nines logo (copied from reference/)
│   └── frames/
│       ├── first-course/      ← 120 frames @ 720px WebP q=82 + placeholder.webp
│       └── first-course-900/  ← 120 frames @ 900px WebP q=82 (comparison)
└── assets/
    ├── menu/
    │   └── the-nines-menu.json
    ├── reference/             ← STYLE ONLY
    └── videos/                ← All 19 section videos
```

---

## Confirmed Video → Section Mapping (ALL 19 MATCHED)

| Filename | Section Key | Group | Label |
|---|---|---|---|
| `food.mp4` | *(group intro)* | Food | "Food" group title |
| `first-course.mp4` | `first-course` | Food | The First Course |
| `bar-snacks.mp4` | `bar-snacks` | Food | By the Bar |
| `veg-starters.mp4` | `veg-starters` | Food | To Began Veg |
| `nonveg-starters.mp4` | `nonveg-starters` | Food | To Began Nonveg |
| `dimsum-bao.mp4` | `dimsum-bao` | Food | House of Steam |
| `sushi-bar.mp4` | `sushi-bar` | Food | Sushi Bar |
| `pizza.mp4` | `pizza` | Food | Taste of Italy |
| `pasta-risotto.mp4` | `pasta-risotto` | Food | Pasta and Risotto |
| `veg-mains.mp4` | `veg-mains` | Food | All Together Veg |
| `nonveg-mains.mp4` | `nonveg-mains` | Food | All Together Nonveg |
| `sides.mp4` | `sides` | Food | Sides |
| `charcoal.mp4` | `charcoal` | Food | From the Charcoal |
| `staples.mp4` | `staples` | Food | Staples |
| `sweet-ending.mp4` | `sweet-ending` | Food | Sweet Ending |
| `bar.mp4` | `bar` | Bar | Bar (18 spirit subgroups) |
| `cold-press-juices.mp4` | `cold-press-juices` | Beverages | Cold Press Juices |
| `refreshers.mp4` | `refreshers` | Beverages | The Nines Refreshers |
| `soft-beverages.mp4` | `soft-beverages` | Beverages | Soft Beverages |

---

## Menu Data Summary

- **Total items:** 315 across 18 sections
- **Pricing variants:** flat price, options (27 items), pour30ml+bottle (106), glass+bottle (17), seasonal (3)
- **Sub-header sections:** dimsum-bao (2 subgroups), sushi-bar (2 subgroups), bar (18 subgroups)
- **Dietary flags:** NOT in menu.json — owner needs to add `"veg": true/false` per item (agreed: show dots only where flag exists)

---

## Technical Decisions

| Decision | Value |
|---|---|
| Framework | Vite + vanilla JS (no React) |
| Rendering | `<canvas>` for video frames + real DOM text overlay |
| Scroll | Native page scroll, sticky canvas, no wheel/touch hijacking |
| Frame format | WebP quality=82 at 720px wide (pending quality approval) |
| Frame rate | 15 fps |
| Memory | Sliding window of decoded frames (±10 frames ≈ 70MB) |
| DPR cap | 2 |
| Layout | `100dvh` for iOS/Android address bar |
| Logo | `public/assets/logo.jpg` (copied from reference) |
| FFmpeg path | `C:\Users\evele\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe` |
| Git path | `C:\Program Files\Git\cmd\git.exe` |
| Node path | `C:\Program Files\nodejs\node.exe` |
| npm path | `C:\Program Files\nodejs\npm.cmd` |

---

## Next Phase (after quality approval)

**Continue Phase 1:** Process remaining 18 sections one at a time:
- Same pipeline: `ffmpeg -vf fps=15,scale=720:-1 -c:v libwebp -quality 82`
- Verify frame count, watermark check (1st/mid/last), placeholder
- Propose hold frame per section (show the still, check contrast)
- Skip the 900px comparison set after quality is approved

**Then Phase 2:** Core scroll-scrub engine:
- Sticky canvas + scroll container
- Deterministic frame mapping p → frame index
- Segments A/H/X/C/J all as pure scroll-position functions
- Decoded-frame sliding window (memory safety)
- Debug HUD (`?debug=1`)

---

## Important Notes for Next Model

- Git: `C:\Program Files\Git\cmd\git.exe` (not in PATH — use full path in every command)
- Node/npm: `C:\Program Files\nodejs\node.exe` and `C:\Program Files\nodejs\npm.cmd`
- FFmpeg: `C:\Users\evele\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe`
- Vite local binary: `.\node_modules\.bin\vite.cmd`
- Animation spec: `the-nines-animation-choreography.md` wins over `the-nines-website-spec.md` on any conflict
- Bar section has 18 subgroups in menu.json (spec says 14 — actual data has more)
- 3 items have `"price": "seasonal"` — display as "Seasonal", never ₹0
- Dietary veg/nonveg flags not yet in menu.json — flag this to owner in Phase 7
- Logo is `public/assets/logo.jpg` — white-background art-deco design; will need transparent-background version for overlay on dark video (consider CSS `mix-blend-mode: multiply` or convert to PNG with transparency)
