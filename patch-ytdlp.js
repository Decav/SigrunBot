const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'node_modules', '@distube', 'yt-dlp', 'dist', 'index.js');

if (!fs.existsSync(target)) {
  console.log('yt-dlp plugin not found, skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(target, 'utf8');
let patched = false;

// Patch 1: Fix deprecation warning parsing
const oldParse = 'if (code === 0) resolve(JSON.parse(output));';
const newParse = 'if (code === 0) { const i = output.indexOf(\'{\'); resolve(JSON.parse(i > 0 ? output.slice(i) : output)); }';
if (!content.includes(newParse)) {
  content = content.replace(oldParse, newParse);
  console.log('[patch] Deprecation warning fix applied');
  patched = true;
}

// Patch 2: Fix getStreamURL for more stable stream URLs
const oldGetter = 'const info = await json(song.url, {\n      dumpSingleJson: true,\n      noWarnings: true,\n      noCallHome: true,\n      preferFreeFormats: true,\n      skipDownload: true,\n      simulate: true,\n      format: "ba/ba*"\n    })';
const newGetter = 'const info = await json(song.url, {\n      dumpSingleJson: true,\n      noWarnings: true,\n      noCallHome: true,\n      skipDownload: true,\n      simulate: true,\n      format: "bestaudio/best",\n      extractorArgs: "youtube:player_client=android,ios"\n    })';
if (content.includes(oldGetter) && !content.includes(newGetter)) {
  content = content.replace(oldGetter, newGetter);
  console.log('[patch] Stream URL stability fix applied');
  patched = true;
}

if (!patched) {
  console.log('yt-dlp plugin already fully patched');
}

fs.writeFileSync(target, content);
