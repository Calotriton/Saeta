// Wraps the research JSON files into classic <script> data files so the site
// works both on GitHub Pages and when opened directly from disk (file://).
// Usage: node tools/build-data.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const map = [
  ['research/build-process.json', 'js/data/process.js', 'SAETA_PROCESS'],
  ['research/components.json', 'js/data/components.js', 'SAETA_COMPONENTS'],
  ['research/bows-and-calcs.json', 'js/data/bows.js', 'SAETA_BOWS'],
  ['research/shops.json', 'js/data/shops.js', 'SAETA_SHOPS'],
];

for (const [src, dst, name] of map) {
  const s = path.join(root, src);
  if (!fs.existsSync(s)) { console.warn('skip (missing):', src); continue; }
  const data = JSON.parse(fs.readFileSync(s, 'utf8'));
  const out = `/* Generated from ${src} by tools/build-data.js — edit the JSON, then re-run. */\nwindow.${name} = ${JSON.stringify(data)};\n`;
  fs.writeFileSync(path.join(root, dst), out);
  console.log('wrote', dst, (out.length / 1024).toFixed(1) + ' KB');
}
