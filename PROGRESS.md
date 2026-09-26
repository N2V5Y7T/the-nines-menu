# PROGRESS.md — The Nines Restaurant Website

> **Handoff file.** Updated at the end of every phase so any AI model can continue without prior conversation context.

---

## Project Overview

**What:** Mobile-first, scroll-driven restaurant menu website for "The Nines" restaurant (Est. 2023).  
**Concept:** Cinematic, scroll-linked frame sequence (canvas) with transparent floating menu text. Apple product page feel + Instagram Reels loading. QR-scan first-load speed is the #1 priority.  
**Tech Stack:** Vite + vanilla JavaScript, one `<canvas>` + DOM overlay, config-driven via `menu.json`.  
**Hosting:** Static CDN — Cloudflare Pages / Netlify / Vercel (to be confirmed by user).

---

## Current Status: PHASE 0 COMPLETE — awaiting user approval

---

## Phase History

### Phase 0 — Setup, Inventory & Approvals ✅ COMPLETE

**Completed:**
- Full asset inventory
- Video → section mapping validated
- `menu.json` validated: 315 items, 18 sections, all 19 videos mapped
- Reference images analyzed for colors, fonts, and design style
- Logo discovered in `assets/reference/Logo.jpg` → copied/noted for use as `assets/logo.png`
- Hosting options presented
- FFmpeg not found on PATH — extraction deferred to Phase 1 (user must install or provide frames)
- Git initialized

**Outstanding decisions (user must answer before Phase 1):**
1. Approve color palette (proposed below)
2. Approve font combination
3. Confirm hosting platform (Cloudflare Pages / Netlify / Vercel)
4. Confirm: does "Estimated total" in My List include GST/service charge, or note "excluding taxes"?
5. Dietary/allergen tags: yes/no (current menu data does not include veg/nonveg flags)
6. Analytics: none / privacy-friendly basic?

---

## File Structure (as of Phase 0)

```
the-nines-website/
├── .git/
├── .gitignore
├── PROGRESS.md
├── the-nines-website-spec.md       ← Primary source of truth (v2.1)
├── the-nines-animation-choreography.md ← Animation authority (overrides spec on conflicts)
├── the-nines-build-plan-and-prompt.md  ← Phase plan reference
└── assets/
    ├── menu/
    │   └── the-nines-menu.json     ← 315 items, 18 sections, fully structured
    ├── reference/                  ← STYLE ONLY — never rendered as content
    │   ├── Logo.jpg                ← The Nines brand logo (brown/copper on white)
    │   ├── Reference3.jpg          ← App mockup: hold state, starters menu visible
    │   ├── Reference4.jpg          ← App mockup: "ASIAN" section, hold state
    │   ├── Refrence2.jpg           ← App mockup: "FOOD" group title emerging
    │   └── Refrences 1.mp4         ← Reference video (style only, ~14MB)
    └── videos/                     ← Section videos, named by section key
        ├── food.mp4                ← Group intro (Food group)
        ├── first-course.mp4
        ├── bar-snacks.mp4
        ├── veg-starters.mp4
        ├── nonveg-starters.mp4
        ├── dimsum-bao.mp4
        ├── sushi-bar.mp4
        ├── pizza.mp4
        ├── pasta-risotto.mp4
        ├── veg-mains.mp4
        ├── nonveg-mains.mp4
        ├── sides.mp4
        ├── charcoal.mp4
        ├── staples.mp4
        ├── sweet-ending.mp4
        ├── bar.mp4
        ├── cold-press-juices.mp4
        ├── refreshers.mp4
        └── soft-beverages.mp4
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
| `bar.mp4` | `bar` | Bar | Bar (14 spirit subgroups) |
| `cold-press-juices.mp4` | `cold-press-juices` | Beverages | Cold Press Juices |
| `refreshers.mp4` | `refreshers` | Beverages | The Nines Refreshers |
| `soft-beverages.mp4` | `soft-beverages` | Beverages | Soft Beverages |

**No unmatched videos. No missing section videos. ✅**

---

## Menu Data Summary

- **Total items:** 315
- **Sections:** 18 (Food×14, Bar×1 with 18 subgroups, Beverages×3)
- **Pricing variants:**
  - Flat price: majority of food items
  - `options` (choice control): 27 items (e.g. Veg/Chicken/Prawns, sizes)
  - `pour30ml`+`bottle` (spirits): 106 items
  - `glass`+`bottle` (wines): 17 items
  - `price: "seasonal"`: 3 items (display as "Seasonal")
  - `null` price values: some spirits (display as "—", never ₹0)

### Sub-header sections (confirmed):
- **`dimsum-bao`:** 2 subgroups — "House of Steam" (7 items) + "The Bun Bar" (4 items)
- **`sushi-bar`:** 2 subgroups — "Sushi Bar Veg" (4 items) + "Sushi Bar Nonveg" (3 items)
- **`bar`:** 18 subgroups — The Cocktail Studio (12), Liqueurs & Digestif (7), Bourbon & Tennessee (5), Single Malt (24), Irish Whisky (4), Japanese Whisky (3), Rum (6), Blended Scotch (18), Gin (8), Vodka (12), Tequila (17), Mezcal (2), Brandy/Cognac (5), Champagne/Sparkling (6), Rose Wine (2), Red Wine (5), White Wine (4), Beer (5)

---

## Color Palette (proposed — measured from reference images)

Measured from `Reference3.jpg`, `Reference4.jpg`, `Refrence2.jpg` (reference app screenshots):

| Role | Hex | Description |
|---|---|---|
| **Primary text / menu items** | `#FFFFFF` | Pure white — item names, prices |
| **Category title** | `#FFFFFF` | White, bold, all-caps |
| **Group title (FOOD)** | `#FFFFFF` | White, very large serif |
| **Top bar text** | `#FFFFFF` | "THE NINES" wordmark |
| **Bottom tab active** | `#FFFFFF` | Bold white |
| **Bottom tab inactive** | `rgba(255,255,255,0.55)` | Dimmed white |
| **Item description** | `rgba(255,255,255,0.80)` | Slightly dimmed white |
| **Divider lines** | `rgba(255,255,255,0.25)` | Subtle white separator |
| **Logo brand color** | `#7B3F2E` | Deep copper-brown (from Logo.jpg) |
| **Logo accent** | `#C17B55` | Lighter copper highlight |
| **Background (canvas)** | *(video frames)* | Rich warm amber/browns from restaurant interior |
| **Side bars (desktop)** | `#1A1410` | Very dark warm brown (matches video darkness) |

**Note:** The reference screenshots show purely white text floating directly over warm-toned restaurant interior video — no panel, no card, no scrim. Text readability relies on weight and the naturally mid-contrast video backgrounds.

---

## Logo

- **Found:** `assets/reference/Logo.jpg` — The Nines logo: art-deco oval frame, half-circle fan motifs (top and bottom), stylized tulip/flower emblem at top, "THE IX NINES" wordmark in deep copper-brown, "EST. 2023" tagline.
- **Plan:** Copy to `assets/logo.png` (or keep as `logo.jpg`), update `brand.logo` in `menu.json` to that path.
- **Usage:** Top bar center — logo image replaces text wordmark as per spec.

---

## Font Proposals (3 candidates — awaiting user approval)

Colors from reference: category titles like "FOOD", "STARTERS", "ASIAN" appear in a **wide, condensed, geometric sans-serif** style. Item names and descriptions appear in a **light, readable sans-serif**. "THE NINES" wordmark in the top bar uses a **small caps / condensed serif**.

### Candidate A — Editorial Elegance (Recommended)
- **Display / Titles:** [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) — Classic editorial serif, high contrast, works well at large sizes for "FOOD", "STARTERS"
- **Body / Prices / Labels:** [Inter](https://fonts.google.com/specimen/Inter) — Clean, highly legible, excellent for prices and descriptions
- **Character:** Warm, luxurious, high-end restaurant

### Candidate B — Art Deco / Geometric
- **Display / Titles:** [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) — Thin, elegant serif with great large-size drama, matches the logo's refined aesthetic
- **Body / Prices / Labels:** [DM Sans](https://fonts.google.com/specimen/DM+Sans) — Modern geometric sans, friendly and readable
- **Character:** Art deco refinement, matches the logo's decorative style most closely

### Candidate C — Bold Cinematic
- **Display / Titles:** [Bodoni Moda](https://fonts.google.com/specimen/Bodoni+Moda) — High contrast didone serif, very dramatic at large sizes
- **Body / Prices / Labels:** [Outfit](https://fonts.google.com/specimen/Outfit) — Clean variable sans, excellent legibility on video backgrounds
- **Character:** High fashion, cinematic, bold

> **Note:** The reference app screenshots show the category title (STARTERS, ASIAN) in a **wide condensed all-caps sans** and item names in a **medium-weight rounded sans**. The closest match in Google Fonts would be Candidate A or B. Looking at the logo's letterforms, Candidate B (Cormorant Garamond) aligns most closely with the brand identity. However, user's own preference wins — please confirm or override.

---

## Technical Decisions Made

| Decision | Value |
|---|---|
| Framework | Vite + vanilla JS (no React) |
| Rendering | `<canvas>` for video frames + real DOM text overlay |
| Scroll | Native page scroll, sticky canvas, no wheel/touch hijacking |
| Frame format | WebP at ~720px wide (confirmed at Phase 1 quality gate) |
| Frame rate | 15 fps |
| Memory | Sliding window of decoded frames (±10 frames ≈ 70MB) |
| DPR cap | 2 |
| Layout | `100dvh` (not `100vh`) for iOS/Android address bar |
| Hosting | TBD — Cloudflare Pages / Netlify / Vercel |
| Logo | `assets/reference/Logo.jpg` → use as `assets/logo.png` |
| FFmpeg | NOT found on system PATH — user must install before Phase 1 |

---

## Open Decisions (user must answer)

1. **Color palette:** approve proposed palette or provide corrections
2. **Font combination:** approve Candidate A, B, or C (or provide own)
3. **Hosting platform:** Cloudflare Pages / Netlify / Vercel
4. **Estimated total:** include GST/service charge, or label "excl. taxes"?
5. **Dietary tags:** include veg/nonveg indicators? (not currently in menu data)
6. **Analytics:** none / privacy-friendly basic?
7. **FFmpeg installation:** required for Phase 1 — user must install or provide another method

---

## FFmpeg Status

**FFmpeg is NOT installed on this system.** It is required in Phase 1 to extract video frames.

**Options:**
1. **Install FFmpeg** via `winget install Gyan.FFmpeg` or download from https://ffmpeg.org/download.html and add to PATH
2. **Use the bundled `webm_encoder.exe`** (found at `C:/Users/evele/.gemini/antigravity/bin/webm_encoder.exe`) — capabilities unknown, needs investigation
3. **User provides pre-extracted frames** — skip FFmpeg entirely if frames already exist

---

## Next Phase

**Phase 1 — Asset Pipeline**
- Install FFmpeg (prerequisite)
- Process FIRST section only: extract at 15fps → WebP (~720px) → tiny inline blur placeholder
- Watermark check on first/middle/last frames
- Build minimal frame-slider test viewer
- Quality gate report with side-by-side stills
- Wait for explicit quality approval before processing remaining sections

---

## Important Notes for Next Model

- Git is at `C:\Program Files\Git\cmd\git.exe` (not in PATH — must use full path)
- Node.js is at `C:\Program Files\nodejs\node.exe` (not in PATH — must use full path)
- FFmpeg is NOT installed — must be installed before Phase 1 frame extraction
- The `webm_encoder.exe` at `C:/Users/evele/.gemini/antigravity/bin/webm_encoder.exe` is available but its capabilities are unknown
- All spec conflicts regarding animation: `the-nines-animation-choreography.md` wins
- Menu has 18 subgroups in Bar section (not 14 as originally stated in spec — the actual menu.json has 18: added Beer, Rose Wine, Red Wine, White Wine as separate)
- `the-nines-menu.json` has `"price": "seasonal"` on 3 beverage items — display as "Seasonal"
- Logo is in `assets/reference/Logo.jpg` — copper/brown art-deco design on white background
