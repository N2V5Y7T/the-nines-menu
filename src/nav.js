/**
 * The Nines — Hamburger Navigation HUD
 */

export function initNav(layout, loader, easer) {
  const drawer = document.getElementById('nav-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const openBtn = document.getElementById('nav-hamburger-btn');
  const closeBtn = document.getElementById('close-nav-btn');
  const linksContainer = document.getElementById('nav-links');

  // Build links from layout
  let html = '';
  let currentGroup = null;

  let idx = 0;
  layout.forEach(sec => {
    // If we enter a new group, output a group header if this section isn't a group-intro
    if (sec.groupKey && sec.groupKey !== currentGroup) {
      currentGroup = sec.groupKey;
      if (sec.type !== 'group-intro' && sec.groupLabel) {
        html += `<div class="nav-group-header">${sec.groupLabel}</div>`;
      }
    }

    const isGroup = sec.type === 'group-intro';
    const className = isGroup ? 'nav-link group-link' : 'nav-link section-link';

    if (sec.label) {
      html += `<button class="${className}" data-scroll="${sec.H_start}" data-idx="${idx}">${sec.label}</button>`;
    }
    idx++;
  });
  linksContainer.innerHTML = html;

  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('open');
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
  }

  openBtn.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer); // overlay shared with list drawer

  // Handle jumping to section
  linksContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-link')) {
      const targetScroll = parseFloat(e.target.getAttribute('data-scroll'));
      const destIdx = parseInt(e.target.getAttribute('data-idx') || '0', 10);
      if (!isNaN(targetScroll)) {
        // Phase 5: abort stale loads and prioritise destination
        if (loader) loader.jumpTo(destIdx);
        // Phase 6: snap easer so display doesn't lag from the old position
        if (easer) easer.snap(targetScroll);
        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
        closeDrawer();
      }
    }
  });
}
