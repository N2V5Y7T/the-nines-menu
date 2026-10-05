const fs = require('fs');
let content = fs.readFileSync('src/list.js', 'utf8');

const oldHtml = `            <div class="list-item-controls" style="display:flex; gap:12px; margin-top:4px;">
              <span class="list-item-price">${p > 0 ? '\u20B9' + p : (item.price === 'seasonal' ? 'Seasonal' : '')}</span>
              <span class="list-item-qty" style="color:#aaa;">x${qty}</span>
            </div>
          </div>
          <button class="remove-btn" data-id="${item.id}">\u2715</button>
        </div>`;

const newHtml = `            <div class="list-item-controls" style="display:flex; gap:12px; margin-top:8px; align-items:center;">
              <span class="list-item-price">${p > 0 ? '\u20B9' + p : (item.price === 'seasonal' ? 'Seasonal' : '')}</span>
              <div class="drawer-qty-stepper">
                <button class="drawer-qty-btn drawer-minus" data-id="${item.id}">\u2212</button>
                <span class="drawer-qty-val">${qty}</span>
                <button class="drawer-qty-btn drawer-plus" data-id="${item.id}">+</button>
              </div>
            </div>
          </div>
          <button class="remove-btn" data-id="${item.id}">\u2715</button>
        </div>`;

content = content.replace(oldHtml, newHtml);
fs.writeFileSync('src/list.js', content, 'utf8');
