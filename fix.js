import fs from 'fs';
let content = fs.readFileSync('src/list.js', 'utf8');
content = content.replace(/<span class="list-item-qty" style="color:#aaa;">x\$\{qty\}<\/span>/, '<div class="drawer-qty-stepper"><button class="drawer-qty-btn drawer-minus" data-id="">-</button><span class="drawer-qty-val"></span><button class="drawer-qty-btn drawer-plus" data-id="">+</button></div>');
content = content.replace('margin-top:4px;', 'margin-top:8px; align-items:center;');
fs.writeFileSync('src/list.js', content, 'utf8');
