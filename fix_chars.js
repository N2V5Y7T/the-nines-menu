const fs = require('fs');
let content = fs.readFileSync('src/list.js', 'utf8');
content = content.replace(/textContent = '\?0'/g, "textContent = '?0'");
content = content.replace(/\? \+ p/g, "'?' + p");
content = content.replace(/'\?' \+ total/g, "'?' + total");
content = content.replace(/>\?</g, ">?<");
fs.writeFileSync('src/list.js', content, 'utf8');
