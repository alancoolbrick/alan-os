// Build-time script injection — runs before next build
// Injects all *-patch.js files from public/ into index.html
const fs = require('fs');
const path = require('path');

const htmlPath = 'public/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');
let injected = 0;

// Find all patch scripts in public/
const patches = fs.readdirSync('public')
  .filter(f => f.endsWith('-patch.js'))
  .sort(); // alphabetical: focus, people, etc.

patches.forEach(filename => {
  if (!html.includes(filename)) {
    html = html.replace('</body>', '<script src="/' + filename + '"><\/script>\n</body>');
    injected++;
    console.log('Injected ' + filename);
  } else {
    console.log(filename + ' already present, skipping');
  }
});

if (injected > 0) {
  fs.writeFileSync(htmlPath, html);
  console.log('Wrote ' + injected + ' script(s) to index.html');
} else {
  console.log('No new scripts to inject');
}
