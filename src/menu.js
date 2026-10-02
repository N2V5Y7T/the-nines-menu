/**
 * The Nines — DOM Menu Builder & State Updater
 * 
 * Generates the HTML for the menu, measures actual rendered heights,
 * and syncs CSS transforms/opacities to the current scroll state.
 */

import { registerItem, toggleItem, addVariant } from './list.js';

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
  if (item.options) {
    return item.options.map(o => `<span class="opt-label">${o.label}</span> ${formatPrice(o.price)}`).join('<br/>');
  }
  if (item.pour30ml || item.bottle || item.glass) {
    let parts = [];
    if (item.pour30ml) parts.push(`<span class="opt-label">30ml</span> ${formatPrice(item.pour30ml)}`);
    if (item.glass) parts.push(`<span class="opt-label">Glass</span> ${formatPrice(item.glass)}`);
    if (item.bottle) parts.push(`<span class="opt-label">Bottle</span> ${formatPrice(item.bottle)}`);
    return parts.join('<br/>');
  }
  return formatPrice(item.price);
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

  const priceHtml = `<div class="item-price">${renderPriceBlock(item)}</div>`;
  const descHtml  = item.desc ? `<div class="item-desc">${item.desc}</div>` : '';
  
  // Mark whether this item needs an option picker before adding
  const hasOptions = getOptions(item).length > 1;

  return `
    <div class="menu-item" id="item-${item.id}">
      <div class="item-header">
        <h4 class="item-name">${dietDot}${item.name}</h4>
        <div class="price-action-wrapper">
          ${priceHtml}
          <button class="add-btn"
            data-id="${item.id}"
            data-has-options="${hasOptions}"
            aria-label="Add ${item.name} to list">＋</button>
        </div>
      </div>
      ${descHtml}
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

  // Global event delegation — show option picker or add directly
  layer.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-btn');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const hasOptions = btn.getAttribute('data-has-options') === 'true';

    if (hasOptions) {
      showOptionPicker(id, btn);
    } else {
      toggleItem(id, btn);
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
      return;
    }
    
    el.style.display = 'block';
    
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
      // Group intros don't scroll during hold, they just freeze
      y = sec.type === 'group-intro' ? 0 : -state.holdMenuScroll;
    }
    else if (state.segment === 'X') {
      el.style.setProperty('--cat-prog', state.categoryProgress); 
      el.style.setProperty('--menu-prog', state.menuProgress);
      opacity = 1 - state.exitProgress;
      
      const baseScroll = sec.type === 'group-intro' ? 0 : -sec.H_length;
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
    if (sec.type === 'group-intro') {
      el.style.transform = `translate(-50%, calc(-50% + ${y}px))`;
    } else {
      el.style.transform = `translateX(-50%) translateY(${y}px)`;
    }
  });
}
