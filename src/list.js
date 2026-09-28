/**
 * The Nines — My List Manager
 */

const selectedItems = new Map(); // id -> item object
let allItemsMap = new Map();     // id -> item object (populated during menu build)

export function registerItem(item) {
  allItemsMap.set(item.id, item);
}

export function toggleItem(id, btnEl) {
  const item = allItemsMap.get(id);
  if (!item) return;

  if (selectedItems.has(id)) {
    selectedItems.delete(id);
    btnEl.classList.remove('added');
    btnEl.textContent = '＋';
  } else {
    selectedItems.set(id, item);
    btnEl.classList.add('added');
    btnEl.textContent = '−';
    
    // Play a subtle pop animation
    btnEl.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.3)' },
      { transform: 'scale(1)' }
    ], { duration: 300, easing: 'ease-out' });
  }

  updateHUD();
  renderDrawer();
}

export function updateHUD() {
  const count = selectedItems.size;
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
  // If options, use the first option's price as baseline
  if (item.options && typeof item.options[0].price === 'number') return item.options[0].price;
  if (item.pour30ml) return item.pour30ml;
  if (item.glass) return item.glass;
  return 0; // fallback for seasonal/null
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
    const p = getPriceNumber(item);
    total += p;
    
    html += `
      <div class="list-item">
        <div class="list-item-info">
          <span class="list-item-name">${item.name}</span>
          <span class="list-item-price">${p > 0 ? '₹' + p : (item.price === 'seasonal' ? 'Seasonal' : '')}</span>
        </div>
        <button class="remove-btn" data-id="${item.id}">✕</button>
      </div>
    `;
  });

  container.innerHTML = html;
  totalEl.textContent = `₹${total}`;
}

// Bind events for the drawer
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

  // Event delegation for remove buttons in drawer
  document.getElementById('list-items-container').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-btn')) {
      const id = e.target.getAttribute('data-id');
      // Find the corresponding button in the main menu to sync state
      const menuBtn = document.querySelector(`.add-btn[data-id="${id}"]`);
      if (menuBtn) {
        toggleItem(id, menuBtn);
      } else {
        // If DOM menu section is unmounted (though we don't unmount, we hide), we can just delete it
        selectedItems.delete(id);
        updateHUD();
        renderDrawer();
      }
    }
  });
}
