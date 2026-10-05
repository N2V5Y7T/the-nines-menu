/**
 * The Nines � My List Manager
 */

const selectedItems = new Map(); // id -> item object
let allItemsMap = new Map();     // id -> item object (populated during menu build)

export function registerItem(item) {
  allItemsMap.set(item.id, item);
}

export function toggleItem(id, btnEl, change = 1) {
  let item = selectedItems.get(id);
  const baseItem = allItemsMap.get(id);
  if (!baseItem) return;

  if (!item) {
    if (change <= 0) return;
    item = { ...baseItem, quantity: change };
    selectedItems.set(id, item);
  } else {
    item.quantity = (item.quantity || 1) + change;
    if (item.quantity <= 0) {
      selectedItems.delete(id);
      item = null;
    }
  }

  if (btnEl) {
    if (item) {
      btnEl.classList.add('added');
      btnEl.innerHTML = '<span class="qty-btn minus">-</span> <span class="qty-val">' + item.quantity + '</span> <span class="qty-btn plus">+</span>';
    } else {
      btnEl.classList.remove('added');
      btnEl.innerHTML = '+';
    }
    
    btnEl.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.1)' },
      { transform: 'scale(1)' }
    ], { duration: 200, easing: 'ease-out' });
  }

  updateHUD();
  renderDrawer();
  syncVariantBadges(id);
}

/**
 * Add a specific variant (e.g. "Chicken ?1369") of a multi-option item.
 * Uses a composite key so the same dish can have multiple variants added.
 */
export function addVariant(baseId, variantLabel, variantPrice) {
  if (typeof variantPrice === 'string') variantPrice = parseFloat(variantPrice);
  const baseItem = allItemsMap.get(baseId);
  if (!baseItem) return;

  const variantId = baseId + ':' + variantLabel;
  let item = selectedItems.get(variantId);

  if (!item) {
    item = {
      ...baseItem,
      id: variantId,
      name: baseItem.name + ' (' + variantLabel + ')',
      price: variantPrice,
      quantity: 1,
    };
    selectedItems.set(variantId, item);
  } else {
    item.quantity = (item.quantity || 1) + 1;
  }

  updateHUD();
  renderDrawer();
  syncVariantBadges(baseId);
}

export function syncVariantBadges(baseId) {
  const btn = document.querySelector(`.add-btn[data-id="${baseId}"]`);
  if (!btn) return;
  const itemEl = btn.closest('.menu-item');
  if (!itemEl) return;
  
  const chips = itemEl.querySelectorAll('.price-chip');
  chips.forEach(chip => {
    const label = chip.querySelector('.chip-label').textContent;
    const variantId = baseId + ':' + label;
    const item = selectedItems.get(variantId);
    
    let badge = chip.querySelector('.variant-qty-badge');
    if (item && item.quantity > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'variant-qty-badge';
        chip.appendChild(badge);
      }
      badge.textContent = item.quantity;
    } else if (badge) {
      badge.remove();
    }
  });
}

export function updateHUD() {
  let count = 0;
  selectedItems.forEach(item => {
    count += (item.quantity || 1);
  });
  
  const badge = document.getElementById('list-count');
  if (badge) {
    badge.textContent = count;
    if (count > 0) {
      badge.classList.add('has-items');
      badge.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.2)' },
        { transform: 'scale(1)' }
      ], { duration: 300 });
    } else {
      badge.classList.remove('has-items');
    }
  }
}

function getPriceNumber(item) {
  if (typeof item.price === 'number') return item.price;
  if (item.options && typeof item.options[0].price === 'number') return item.options[0].price;
  if (item.pour30ml) return item.pour30ml;
  if (item.glass) return item.glass;
  return 0;
}

export function renderDrawer() {
  const container = document.getElementById('list-items-container');
  const totalEl = document.getElementById('list-total-sum');
  if (!container || !totalEl) return;

  if (selectedItems.size === 0) {
    container.innerHTML = '<p class="empty-list">Your list is empty.</p>';
    totalEl.textContent = '₹0';
    return;
  }

  let html = '';
  let total = 0;

  selectedItems.forEach(item => {
    const qty = item.quantity || 1;
    const p = getPriceNumber(item);
    total += p * qty;
    
    html += `
      <div class="list-item">
        <div class="list-item-info">
          <span class="list-item-name">${item.name}</span>
          <div class="list-item-controls" style="display:flex; gap:12px; margin-top:8px; align-items:center;">
            <span class="list-item-price">${p > 0 ? '₹' + p : (item.price === 'seasonal' ? 'Seasonal' : '')}</span>
            <div class="drawer-qty-stepper"><button class="drawer-qty-btn drawer-minus" data-id="${item.id}">-</button><span class="drawer-qty-val">${qty}</span><button class="drawer-qty-btn drawer-plus" data-id="${item.id}">+</button></div>
          </div>
        </div>
        <button class="remove-btn" data-id="${item.id}">✕</button>
      </div>
    `;
  });

  container.innerHTML = html;
  totalEl.textContent = '₹' + total;
}

export function initListUI() {
  const drawer = document.getElementById('list-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const openBtn = document.getElementById('nav-list-btn');
  const closeBtn = document.getElementById('close-list-btn');

  function openDrawer() {
    renderDrawer();
    drawer.classList.add('open');
    overlay.classList.add('open');
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
  }

  openBtn.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  document.getElementById('list-items-container').addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-btn');
    const plusBtn = e.target.closest('.drawer-plus');
    const minusBtn = e.target.closest('.drawer-minus');

    let targetBtn = removeBtn || plusBtn || minusBtn;
    if (!targetBtn) return;
    
    const id = targetBtn.getAttribute('data-id');
    const item = selectedItems.get(id);
    if (!item) return;

    const isVariant = id.includes(':');
    const baseId = isVariant ? id.split(':')[0] : id;
    const menuBtn = document.querySelector(`.add-btn[data-id="${baseId}"]`);

    let change = 0;
    if (removeBtn) change = -(item.quantity || 1);
    if (plusBtn) change = 1;
    if (minusBtn) change = -1;

    if (isVariant) {
       item.quantity += change;
       if (item.quantity <= 0) {
         selectedItems.delete(id);
       }
       updateHUD();
       renderDrawer();
       syncVariantBadges(baseId);
    } else {
       if (menuBtn) {
         toggleItem(id, menuBtn, change);
       } else {
         item.quantity += change;
         if (item.quantity <= 0) selectedItems.delete(id);
         updateHUD();
         renderDrawer();
       }
    }
  });
}




