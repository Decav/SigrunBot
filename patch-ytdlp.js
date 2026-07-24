const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'node_modules', '@distube', 'yt-dlp', 'dist', 'index.js');

if (!fs.existsSync(target)) {
  console.log('yt-dlp plugin not found, skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(target, 'utf8');

const oldLine = 'if (code === 0) resolve(JSON.parse(output));';
const newLine = 'if (code === 0) { const i = output.indexOf(\'{\'); resolve(JSON.parse(i > 0 ? output.slice(i) : output)); }';

if (content.includes(newLine)) {
  console.log('yt-dlp plugin already patched');
  process.exit(0);
}

if (!content.includes(oldLine)) {
  console.log('yt-dlp plugin: target line not found, may already be patched or different version');
  process.exit(0);
}

content = content.replace(oldLine, newLine);
fs.writeFileSync(target, content);
console.log('yt-dlp plugin patched successfully');
