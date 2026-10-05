const fs = require('fs');
let content = fs.readFileSync('src/list.js', 'utf8');
content = content.replace("textContent = '?0'", "textContent = '\u20B90'");
content = content.replace("'?' + p", "'\u20B9' + p");
content = content.replace("'?' + total", "'\u20B9' + total");
content = content.replace(">?<", ">\u2715<");
fs.writeFileSync('src/list.js', content, 'utf8');
