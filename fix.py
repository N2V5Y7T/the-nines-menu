import re

with open('src/list.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_str = '''    html += 
      <div class="list-item">
        <div class="list-item-info">
          <span class="list-item-name">\</span>
          <div class="list-item-controls" style="display:flex; gap:12px; margin-top:4px;">
            <span class="list-item-price">\</span>
            <span class="list-item-qty" style="color:#aaa;">x\</span>
          </div>
        </div>
        <button class="remove-btn" data-id="\">?</button>
      </div>
    ;'''

new_str = '''    html += 
      <div class="list-item">
        <div class="list-item-info">
          <span class="list-item-name">\</span>
          <div class="list-item-controls" style="display:flex; gap:12px; margin-top:8px; align-items:center;">
            <span class="list-item-price">\</span>
            <div class="drawer-qty-stepper">
              <button class="drawer-qty-btn drawer-minus" data-id="\">-</button>
              <span class="drawer-qty-val">\</span>
              <button class="drawer-qty-btn drawer-plus" data-id="\">+</button>
            </div>
          </div>
        </div>
        <button class="remove-btn" data-id="\">?</button>
      </div>
    ;'''

content = content.replace(old_str, new_str)

with open('src/list.js', 'w', encoding='utf-8') as f:
    f.write(content)
