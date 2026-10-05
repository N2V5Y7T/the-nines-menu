import fs from 'fs';
let content = fs.readFileSync('src/list.js', 'utf8');

const regex = /document\.getElementById\('list-items-container'\)\.addEventListener\('click', \(e\) => \{[\s\S]+?\}\);\n\}/;

const replacement = document.getElementById('list-items-container').addEventListener('click', (e) => {
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
    const menuBtn = document.querySelector(\.add-btn[data-id="\"]\);

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
};

content = content.replace(regex, replacement);
fs.writeFileSync('src/list.js', content, 'utf8');
