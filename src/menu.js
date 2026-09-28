/**
 * The Nines — DOM Menu Builder & State Updater
 * 
 * Generates the HTML for the menu, measures actual rendered heights,
 * and syncs CSS transforms/opacities to the current scroll state.
 */

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

function renderItem(item) {
  // If the owner adds diet: 'veg' or diet: 'nonveg' to the JSON in the future, this will show it.
  const dietDot = item.diet === 'veg' ? '<span class="diet-dot veg"></span>' :
                  item.diet === 'nonveg' ? '<span class="diet-dot nonveg"></span>' : '';
  
  const priceHtml = `<div class="item-price">${renderPriceBlock(item)}</div>`;
  const descHtml = item.desc ? `<div class="item-desc">${item.desc}</div>` : '';
  
  return `
    <div class="menu-item" id="item-${item.id}">
      <div class="item-header">
        <h4 class="item-name">${dietDot}${item.name}</h4>
        ${priceHtml}
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
          if (sg.note) html += `<p class="subgroup-note">${sg.note}</p>`;
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
    
    // Only render active section (or next section if cross-dissolving)
    const isActive = sec.key === activeSec.key;
    const isNext = state.crossDissolve && sec.key === state.crossDissolve.nextSection.key;
    
    if (!isActive && !isNext) {
      el.style.display = 'none';
      return;
    }
    
    el.style.display = 'block';
    
    let opacity = 0;
    let y = 0;
    
    if (isActive) {
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
    }
    else if (isNext) {
      // Incoming section during J segment
      el.style.setProperty('--cat-prog', 1);
      el.style.setProperty('--menu-prog', 1);
      opacity = state.crossDissolve.progress;
      y = 0;
    }
    
    el.style.opacity = opacity;
    el.style.transform = `translateY(${y}px)`;
  });
}
