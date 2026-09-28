/**
 * The Nines — Hamburger Navigation HUD
 */

export function initNav(layout) {
  const drawer = document.getElementById('nav-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const openBtn = document.getElementById('nav-hamburger-btn');
  const closeBtn = document.getElementById('close-nav-btn');
  const linksContainer = document.getElementById('nav-links');

  // Build links from layout
  let html = '';
  layout.forEach(sec => {
    // We can list all sections, or just group intros. 
    // The spec implies we should link to sections. We will indent non-group sections.
    const isGroup = sec.type === 'group-intro';
    const className = isGroup ? 'nav-link group-link' : 'nav-link section-link';
    // Skip if it doesn't have a label
    if (sec.label) {
      html += `<button class="${className}" data-scroll="${sec.H_start}">${sec.label}</button>`;
    }
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
      if (!isNaN(targetScroll)) {
        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
        closeDrawer();
      }
    }
  });
}
