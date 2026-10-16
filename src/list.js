/**
 * The Nines — My List Manager
 *
 * State: selectedItems Map — id → { item, qty }
 * Single source of truth for all quantity state.
 */

// id → { item, qty }
const selectedItems = new Map();

// id → item object (populated during menu build)
let allItemsMap = new Map();

export function registerItem(item) {
  allItemsMap.set(item.id, item);
}

// ── Internal helpers ────────────────────────────────────────────

function getPriceNumber(item) {
  if (typeof item.price === 'number') return item.price;
  if (item.options && typeof item.options[0].price === 'number') return item.options[0].price;
  if (item.pour30ml) return item.pour30ml;
  if (item.glass) return item.glass;
  return 0;
}

/**
 * Find and update the menu's add-btn / qty-control for a given item id.
 * Called after every state change to keep the menu in sync.
 */
function syncMenuButton(id) {
  // Single-price items: button has data-id exactly equal to id
  const btn = document.querySelector(`.add-btn[data-id="${id}"]`);
  if (!btn) return; // section may not be in DOM yet — that's fine

  const entry = selectedItems.get(id);
  const qty = entry ? entry.qty : 0;

  if (qty === 0) {
    // Restore plain ＋ button
    btn.className = 'add-btn';
    btn.innerHTML = '＋';
    btn.setAttribute('aria-label', `Add ${entry ? entry.item.name : ''} to list`);
    return;
  }

  // Replace with inline qty control: − qty +
  // We keep the same element (.add-btn) and swap its innards so the
  // CSS layout (price-action-wrapper) is completely undisturbed.
  btn.className = 'add-btn qty-active';
  btn.innerHTML = `
    <span class="qty-minus" data-id="${id}" aria-label="Decrease quantity">−</span>
    <span class="qty-num">${qty}</span>
    <span class="qty-plus"  data-id="${id}" aria-label="Increase quantity">＋</span>
  `;
}

/**
 * Find and update the menu's add-btn for a variant (options / pour sizes).
 * The main dish button (data-id=baseId, data-has-options=true) stays as-is
 * (it opens the picker). Individual variant state is shown only in My List.
 */
function syncVariantMenuButton(baseId) {
  // Nothing to do in the menu for option items —
  // the picker itself has no persistent in-menu qty control.
  // The main ＋ button just stays as the launcher.
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Increment a plain (no-options) item by 1.
 * Called from menu.js on every ＋ tap.
 */
export function incrementItem(id) {
  const item = allItemsMap.get(id);
  if (!item) return;

  if (selectedItems.has(id)) {
    selectedItems.get(id).qty += 1;
  } else {
    selectedItems.set(id, { item, qty: 1 });
  }

  syncMenuButton(id);
  updateHUD();
  renderDrawer();
}

/**
 * Decrement a plain item by 1. Removes from list at 0.
 * Called from the in-menu − tap AND from the drawer − tap.
 */
export function decrementItem(id) {
  if (!selectedItems.has(id)) return;

  const entry = selectedItems.get(id);
  entry.qty -= 1;

  if (entry.qty <= 0) {
    selectedItems.delete(id);
  }

  syncMenuButton(id);
  updateHUD();
  renderDrawer();
}

/**
 * Kept for backwards-compatibility with option picker (addVariant still uses it).
 * Also used by nav.js remove-from-list path.
 */
export function toggleItem(id, btnEl) {
  // This is now only called for plain items from legacy paths (remove via drawer ✕).
  // Internally, just delete the item.
  if (selectedItems.has(id)) {
    selectedItems.delete(id);
    // Reset the menu btn if still in DOM
    syncMenuButton(id);
  } else {
    const item = allItemsMap.get(id);
    if (!item) return;
    selectedItems.set(id, { item, qty: 1 });
    syncMenuButton(id);
  }

  updateHUD();
  renderDrawer();
}

/**
 * Add or increment a specific variant (e.g. "Chicken ₹369") of a multi-option item.
 * Composite key: "manchow-soup:Chicken"
 */
export function addVariant(baseId, variantLabel, variantPrice) {
  const baseItem = allItemsMap.get(baseId);
  if (!baseItem) return;

  const variantId = `${baseId}:${variantLabel}`;
  const variantItem = {
    ...baseItem,
    id: variantId,
    name: `${baseItem.name} (${variantLabel})`,
    price: variantPrice,
  };

  if (selectedItems.has(variantId)) {
    selectedItems.get(variantId).qty += 1;
  } else {
    selectedItems.set(variantId, { item: variantItem, qty: 1 });
  }

  // Register the variant item so decrementItem can find it
  allItemsMap.set(variantId, variantItem);

  updateHUD();
  renderDrawer();
}

export function updateHUD() {
  // Badge = total number of individual items (sum of all quantities)
  let count = 0;
  selectedItems.forEach(entry => { count += entry.qty; });

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

export function renderDrawer() {
  const container = document.getElementById('list-items-container');
  const totalEl   = document.getElementById('list-total-sum');
  if (!container || !totalEl) return;

  if (selectedItems.size === 0) {
    container.innerHTML = '<p class="empty-list">Your list is empty.</p>';
    totalEl.textContent = '₹0';
    return;
  }

  let html  = '';
  let total = 0;

  selectedItems.forEach((entry, id) => {
    const { item, qty } = entry;
    const unitPrice = getPriceNumber(item);
    const lineTotal = unitPrice * qty;
    total += lineTotal;

    const priceDisplay = unitPrice > 0
      ? `₹${unitPrice}`
      : (item.price === 'seasonal' ? 'Seasonal' : '');

    const lineTotalDisplay = unitPrice > 0 ? `₹${lineTotal}` : '';

    html += `
      <div class="list-item" data-id="${id}">
        <div class="list-item-info">
          <span class="list-item-name">${item.name}</span>
          ${priceDisplay ? `<span class="list-item-unit-price">Unit: ${priceDisplay}</span>` : ''}
          ${lineTotalDisplay ? `<span class="list-item-price">${lineTotalDisplay}</span>` : ''}
        </div>
        <div class="list-item-qty-control">
          <button class="list-qty-btn list-qty-minus" data-id="${id}" aria-label="Decrease quantity">−</button>
          <span class="list-qty-num">${qty}</span>
          <button class="list-qty-btn list-qty-plus"  data-id="${id}" aria-label="Increase quantity">＋</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  totalEl.textContent = `₹${total}`;
}

// Bind events for the drawer
export function initListUI() {
  const drawer  = document.getElementById('list-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const openBtn = document.getElementById('nav-list-btn');
  const closeBtn = document.getElementById('close-list-btn');

  function openDrawer()  {
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

  // Event delegation for qty controls inside the drawer
  document.getElementById('list-items-container').addEventListener('click', (e) => {
    const minusBtn = e.target.closest('.list-qty-minus');
    const plusBtn  = e.target.closest('.list-qty-plus');

    if (minusBtn) {
      const id = minusBtn.getAttribute('data-id');
      decrementItem(id);
    } else if (plusBtn) {
      const id = plusBtn.getAttribute('data-id');
      // Check if this is a variant (has ":" in the id) or plain item
      if (id.includes(':')) {
        // Variant — just increment qty directly
        if (selectedItems.has(id)) {
          selectedItems.get(id).qty += 1;
          updateHUD();
          renderDrawer();
        }
      } else {
        incrementItem(id);
      }
    }
  });
}
