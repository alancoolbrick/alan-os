// Build-time script injection — runs before next build
const fs = require('fs');
const path = 'public/index.html';
let html = fs.readFileSync(path, 'utf8');
if (!html.includes('focus-patch.js')) {
  html = html.replace('</body>', '<script src="/focus-patch.js"></script>\n</body>');
  fs.writeFileSync(path, html);
  console.log('Injected focus-patch.js into index.html');
} else {
  console.log('focus-patch.js already present, skipping injection');
}
