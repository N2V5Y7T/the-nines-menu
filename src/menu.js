/**
 * The Nines — DOM Menu Builder & State Updater
 * 
 * Generates the HTML for the menu, measures actual rendered heights,
 * and syncs CSS transforms/opacities to the current scroll state.
 */

import { registerItem, toggleItem, addVariant, incrementItem, decrementItem } from './list.js';

/**
 * Shows a mobile bottom sheet letting the user pick one variant
 * (e.g. Veg / Chicken / Prawns) before adding to the list.
 */
function showOptionPicker(itemId, triggerBtn) {
  const item = (() => {
    // pull item out of the global registry via a little trick —
    // we broadcast a request and allItemsMap in list.js has the data
    // Instead, keep a local copy in a module-level Map
    return _itemRegistry.get(itemId);
  })();
  if (!item) return;

  const options = getOptions(item);
  if (!options.length) return;

  // Remove any existing picker
  const existing = document.getElementById('option-picker');
  if (existing) existing.remove();
  const existingBg = document.getElementById('option-picker-bg');
  if (existingBg) existingBg.remove();

  // Background scrim
  const bg = document.createElement('div');
  bg.id = 'option-picker-bg';
  bg.addEventListener('click', () => { picker.remove(); bg.remove(); });
  document.body.appendChild(bg);
  // Trigger open animation
  requestAnimationFrame(() => bg.classList.add('open'));

  // Sheet
  const picker = document.createElement('div');
  picker.id = 'option-picker';
  picker.setAttribute('role', 'dialog');
  picker.setAttribute('aria-label', `Choose option for ${item.name}`);

  // Already-in-list composite keys
  const inList = options.map(o => {
    const variantId = `${itemId}:${o.label}`;
    return { ...o, variantId, inList: false }; // we don't have direct access to selectedItems, but button state will reflect
  });

  picker.innerHTML = `
    <div class="picker-handle"></div>
    <h3 class="picker-title">${item.name}</h3>
    ${item.desc ? `<p class="picker-desc">${item.desc}</p>` : ''}
    <div class="picker-options">
      ${options.map(o => `
        <button class="picker-option-btn" data-base-id="${itemId}" data-label="${o.label}" data-price="${o.price}">
          <span class="picker-option-label">${o.label}</span>
          <span class="picker-option-price">₹${o.price}</span>
        </button>
      `).join('')}
    </div>
  `;

  picker.addEventListener('click', (e) => {
    const btn = e.target.closest('.picker-option-btn');
    if (!btn) return;
    const baseId = btn.getAttribute('data-base-id');
    const label  = btn.getAttribute('data-label');
    const price  = parseFloat(btn.getAttribute('data-price'));

    addVariant(baseId, label, price);

    // Visual feedback on the tapped option
    btn.classList.toggle('selected');

    // Close after a brief moment so user sees the feedback
    setTimeout(() => { picker.remove(); bg.remove(); }, 300);
  });

  document.body.appendChild(picker);
  requestAnimationFrame(() => picker.classList.add('open'));
}

// Module-level registry so showOptionPicker can access item data
const _itemRegistry = new Map();

function formatPrice(p) {
  if (p === 'seasonal') return 'Seasonal';
  if (p == null) return '—';
  return `₹${p}`;
}

function renderPriceBlock(item) {
  // Multi-option items: show chips like "Veg · ₹329  Chicken · ₹369"
  if (item.options) {
    const chips = item.options
      .map(o => `<span class="price-chip"><span class="chip-label">${o.label}</span><span class="chip-price">₹${o.price}</span></span>`)
      .join('');
    return `<div class="price-chips">${chips}</div>`;
  }
  // Spirit / wine sizes
  if (item.pour30ml != null || item.glass != null || item.bottle != null) {
    const parts = [];
    if (item.pour30ml != null) parts.push(`<span class="price-chip"><span class="chip-label">30ml</span><span class="chip-price">₹${item.pour30ml}</span></span>`);
    if (item.glass    != null) parts.push(`<span class="price-chip"><span class="chip-label">Glass</span><span class="chip-price">₹${item.glass}</span></span>`);
    if (item.bottle   != null) parts.push(`<span class="price-chip"><span class="chip-label">Bottle</span><span class="chip-price">₹${item.bottle}</span></span>`);
    return `<div class="price-chips">${parts.join('')}</div>`;
  }
  // Single price
  if (item.price === 'seasonal') return `<span class="price-flat">Seasonal</span>`;
  if (item.price == null) return `<span class="price-flat">—</span>`;
  return `<span class="price-flat">₹${item.price}</span>`;
}

function getOptions(item) {
  // Returns an array of { label, price } for any item that has variants
  if (item.options) return item.options;
  const variants = [];
  if (item.pour30ml != null) variants.push({ label: '30ml', price: item.pour30ml });
  if (item.glass != null)    variants.push({ label: 'Glass', price: item.glass });
  if (item.bottle != null)   variants.push({ label: 'Bottle', price: item.bottle });
  return variants;
}

function renderItem(item) {
  // Register item for the list manager AND local picker registry
  registerItem(item);
  _itemRegistry.set(item.id, item);

  const dietDot = item.diet === 'veg'    ? '<span class="diet-dot veg"></span>' :
                  item.diet === 'nonveg' ? '<span class="diet-dot nonveg"></span>' : '';

  const descHtml = item.desc ? `<div class="item-desc">${item.desc}</div>` : '';

  const hasOptions = getOptions(item).length > 1;
  const priceHtml  = renderPriceBlock(item);

  if (hasOptions) {
    // For multi-option items: name on top row, chips + button on second row
    return `
      <div class="menu-item has-options" id="item-${item.id}">
        <div class="item-top-row">
          <h4 class="item-name">${dietDot}${item.name}</h4>
        </div>
        ${descHtml}
        <div class="item-bottom-row">
          <div class="item-price">${priceHtml}</div>
          <button class="add-btn"
            data-id="${item.id}"
            data-has-options="true"
            aria-label="Add ${item.name} to list">＋</button>
        </div>
      </div>
    `;
  }

  // Single-price item: name + price + button on same row
  return `
    <div class="menu-item" id="item-${item.id}">
      <div class="item-header">
        <div class="item-name-wrap">
          <h4 class="item-name">${dietDot}${item.name}</h4>
          ${descHtml}
        </div>
        <div class="price-action-wrapper">
          <div class="item-price">${priceHtml}</div>
          <button class="add-btn"
            data-id="${item.id}"
            data-has-options="false"
            aria-label="Add ${item.name} to list">＋</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Builds the HTML structure and mounts it to #menu-layer.
 */
export function buildMenuDOM(layout) {
  const layer = document.getElementById('menu-layer');
  if (!layer) return;
  layer.innerHTML = '';
  
  layout.forEach(sec => {
    const el = document.createElement('div');
    el.className = `menu-section ${sec.type}`;
    el.id = `menu-sec-${sec.key}`;
    
    if (sec.type === 'group-intro') {
      el.innerHTML = `<h1 class="group-title">${sec.label}</h1>`;
    } else {
      let html = `<div class="sec-header">`;
      html += `<h2 class="section-title">${sec.label}</h2>`;
      if (sec.note) html += `<p class="section-note">${sec.note}</p>`;
      html += `</div>`;
      
      html += `<div class="menu-content">`;
      if (sec.subgroups) {
        sec.subgroups.forEach(sg => {
          html += `<div class="subgroup">`;
          if (sg.label) html += `<h3 class="subgroup-title">${sg.label}</h3>`;
          if (sg.note)  html += `<p class="subgroup-note">${sg.note}</p>`;
          html += `<div class="items-grid">${sg.items.map(renderItem).join('')}</div>`;
          html += `</div>`;
        });
      } else if (sec.items) {
        html += `<div class="items-grid">${sec.items.map(renderItem).join('')}</div>`;
      }
      html += `</div>`;
      el.innerHTML = html;
    }
    
    // Hide initially
    el.style.display = 'none';
    layer.appendChild(el);
    sec.domElement = el;
  });

  // Global event delegation — show option picker, add/increment, or adjust qty
  layer.addEventListener('click', (e) => {
    // Handle inline − button inside a qty-active add-btn
    const minusSpan = e.target.closest('.qty-minus');
    if (minusSpan) {
      e.stopPropagation();
      const id = minusSpan.getAttribute('data-id');
      decrementItem(id);
      return;
    }

    // Handle inline + button inside a qty-active add-btn
    const plusSpan = e.target.closest('.qty-plus');
    if (plusSpan) {
      e.stopPropagation();
      const id = plusSpan.getAttribute('data-id');
      incrementItem(id);
      return;
    }

    // Handle the outer add-btn (only when NOT in qty-active state)
    const btn = e.target.closest('.add-btn');
    if (!btn || btn.classList.contains('qty-active')) return;

    const id = btn.getAttribute('data-id');
    const hasOptions = btn.getAttribute('data-has-options') === 'true';

    if (hasOptions) {
      showOptionPicker(id, btn);
    } else {
      incrementItem(id);
    }
  });
}

/**
 * Measures the actual scrollable height of each menu section.
 */
export function measureMenuHeights(layout, vh) {
  layout.forEach(sec => {
    if (!sec.domElement) return;
    
    if (sec.type === 'group-intro') {
      sec.measuredHeightPx = 0; // H_length handled in config.js
    } else {
      // Temporarily display to measure
      sec.domElement.style.display = 'block';
      sec.domElement.style.transform = 'translateY(0)';
      
      const h = sec.domElement.offsetHeight;
      
      // The menu starts at 15vh. Available space to scroll within the viewport is 85vh.
      // So if a menu is 200vh tall, you only need to scroll 115vh to reach the bottom.
      // We'll pad the bottom slightly so the last item clears well.
      const availableSpace = vh * 0.70; 
      sec.measuredHeightPx = Math.max(0, h - availableSpace);
      
      sec.domElement.style.display = 'none';
    }
  });
}

/**
 * Syncs the DOM elements to the current scroll state.
 */
export function updateMenuState(state, layout, vh) {
  const activeSec = state.section;
  
  layout.forEach(sec => {
    const el = sec.domElement;
    if (!el) return;
    
    const isActive = sec.key === activeSec.key;
    
    // We do NOT want to show the next section's menu during the cross-dissolve (J segment).
    // The spec explicitly says: "no menu visible during the crossfade."
    if (!isActive) {
      el.style.display = 'none';
      const mc = el.querySelector(':scope > .menu-content');
      if (mc) {
        mc.style.webkitMaskImage = '';
        mc.style.maskImage = '';
        mc.style.clipPath = '';
      }
      return;
    }
    
    el.style.display = 'block';
    
    if (sec.type === 'group-intro') {
      const titleOpacity = state.introTitleOpacity !== undefined ? state.introTitleOpacity : (state.segment === 'A' ? state.entranceProgress : 0);
      const prog = state.introTitleProgress !== undefined ? state.introTitleProgress : 0;
      // Continuous upward drift: starts at +2vh, glides through center and continues to -18vh
      // Never settles into a stationary center hold
      const driftY = (2 - prog * 20) * (vh / 100);

      el.style.display = titleOpacity > 0 ? 'block' : 'none';
      el.style.opacity = titleOpacity;
      el.style.setProperty('--cat-prog', '1');
      el.style.transform = `translate(-50%, calc(-50% + ${driftY}px))`;
      el.style.pointerEvents = 'none';
      el.setAttribute('inert', '');
      return;
    }

    let opacity = 0;
    let y = 0;
    
    if (state.segment === 'A') {
      el.style.setProperty('--cat-prog', state.categoryProgress);
      el.style.setProperty('--menu-prog', state.menuProgress);
      opacity = state.entranceProgress;
      y = 0; 
    } 
    else if (state.segment === 'H') {
      el.style.setProperty('--cat-prog', 1);
      el.style.setProperty('--menu-prog', 1);
      opacity = 1;
      y = -state.holdMenuScroll;
    }
    else if (state.segment === 'X') {
      el.style.setProperty('--cat-prog', state.categoryProgress); 
      el.style.setProperty('--menu-prog', state.menuProgress);
      opacity = 1 - state.exitProgress;
      
      const baseScroll = -sec.H_length;
      // Lift up during exit
      y = baseScroll - (state.exitProgress * vh * 0.2); 
    }
    else if (state.segment === 'C') {
      opacity = 0;
    }
    else if (state.segment === 'J') {
      opacity = 0;
    }
    
    el.style.opacity = opacity;
    
    // Manage interaction state (spec: buttons ONLY active during Hold)
    if (state.buttonsActive && isActive) {
      el.style.pointerEvents = 'auto';
      el.removeAttribute('inert');
    } else {
      el.style.pointerEvents = 'none';
      el.setAttribute('inert', '');
    }

    // CRITICAL: Must preserve the -50% horizontal translation from CSS!
    el.style.transform = `translateX(-50%) translateY(${y}px)`;

      // ── Sticky category heading ─────────────────────────────────────────
      // The .sec-header must stay pinned at a fixed viewport position (just
      // below the nav) for the ENTIRE H phase and for the start of X.
      //
      // Math:
      //   heading_absolute_y = sectionTopPx + y + compensation
      //   We want this = targetY = navBottomPx + cushion
      //   => compensation = targetY - sectionTopPx - y
      //   During H: y = -holdMenuScroll
      //   => compensation = (targetY - sectionTopPx) + holdMenuScroll
      //                   = holdMenuScroll - naturalOffset
      //   (clamp to >= 0 so we never push it below its natural start)
      //
      // During X: keep it pinned at the same height it was at H-end,
      // then let it smoothly release and exit with the section as
      // exitProgress goes 0 → 1.
      const secHeader = el.querySelector(':scope > .sec-header');
      const menuContent = el.querySelector(':scope > .menu-content');

      if (secHeader) {
        const sectionTopPx  = 0.15 * vh;   // matches CSS: top: 15vh
        const navBottomPx   = 80;           // matches CSS: height: 80px on #top-nav
        const cushion       = 12;           // breathing gap below nav
        const targetY       = navBottomPx + cushion;               // 92px
        // naturalOffset: how many px of holdMenuScroll pass before pinning begins
        // (the heading naturally descends from 15vh; once it reaches targetY it pins)
        const naturalOffset = Math.max(0, sectionTopPx - targetY); // max(0, 15vh - 92)

        if (state.segment === 'H') {
          // Uncapped compensation: grows exactly as holdMenuScroll does,
          // keeping heading_absolute_y = targetY throughout the whole hold.
          const compensation = Math.max(0, state.holdMenuScroll - naturalOffset);
          secHeader.style.transform = `translateY(${compensation}px)`;

        } else if (state.segment === 'X') {
          // At the end of H (start of X), holdMenuScroll = H_length.
          // Compensation at that moment:
          const compensationAtHEnd = Math.max(0, sec.H_length - naturalOffset);
          // Smoothly release: at exitProgress=0 heading is still pinned (last dish
          // just started moving); at exitProgress=1 heading is at section top
          // and exits with it fully. This gives a natural joined exit.
          const compensation = compensationAtHEnd * (1 - state.exitProgress);
          secHeader.style.transform = `translateY(${compensation}px)`;

        } else {
          // A, C, J: CSS --cat-prog animation drives the heading normally.
          secHeader.style.transform = '';
        }
      }

      // ── Clipping boundary for scrolling menu items ──────────────────────
      // Ensures all scrolling dishes, text, prices, and controls disappear
      // behind the pinned category heading rather than passing over it.
      if (secHeader && menuContent) {
        if (state.segment === 'H' || state.segment === 'X') {
          const headerRect = secHeader.getBoundingClientRect();
          const contentRect = menuContent.getBoundingClientRect();

          // Clipping boundary begins immediately below the pinned heading.
          // 4px below heading bottom is 100% transparent and hard-clipped.
          // 20px below heading bottom is 100% visible (16px smooth feather).
          const fadeDistance = 16;
          const yTransparent = headerRect.bottom + 4;
          const yOpaque = yTransparent + fadeDistance;

          const localTransparent = yTransparent - contentRect.top;
          const localOpaque = yOpaque - contentRect.top;

          if (localOpaque <= 0) {
            menuContent.style.webkitMaskImage = '';
            menuContent.style.maskImage = '';
            menuContent.style.clipPath = '';
          } else {
            const cutY = Math.max(0, localTransparent);
            const fadeY = Math.max(0, localOpaque);

            menuContent.style.webkitMaskImage = `linear-gradient(to bottom, transparent 0px, transparent ${cutY}px, black ${fadeY}px, black 100%)`;
            menuContent.style.maskImage = `linear-gradient(to bottom, transparent 0px, transparent ${cutY}px, black ${fadeY}px, black 100%)`;
            menuContent.style.clipPath = `inset(${cutY}px -40px 0px -40px)`;
          }
        } else {
          menuContent.style.webkitMaskImage = '';
          menuContent.style.maskImage = '';
          menuContent.style.clipPath = '';
        }
      }
  });

  // Cinematic Scrim: 
  // Darken the video seamlessly in sync with menu entrance/exit so text is perfectly legible.
  // Group intro video has no menu, so keep it clear and cinematic.
  const scrim = document.getElementById('video-scrim');
  if (scrim) {
    let scrimOpacity = 0;
    if (activeSec.type === 'group-intro') {
      scrimOpacity = 0.12 * (state.introTitleOpacity || 0);
    } else {
      if (state.segment === 'A') scrimOpacity = state.entranceProgress;
      else if (state.segment === 'H') scrimOpacity = 1;
      else if (state.segment === 'X') scrimOpacity = 1 - state.exitProgress;
    }
    scrim.style.opacity = scrimOpacity;
  }
}
