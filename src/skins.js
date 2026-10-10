const fs = require('fs');
const path = require('path');
const os = require('os');

const SKINS_DIR = path.join(os.homedir(), '.proclient', 'skins');

function saveSkin(username, pngBuffer) {
  fs.mkdirSync(SKINS_DIR, { recursive: true });
  const skinPath = path.join(SKINS_DIR, `${username}.png`);
  fs.writeFileSync(skinPath, pngBuffer);
  return skinPath;
}

function getSkinPath(username) {
  const skinPath = path.join(SKINS_DIR, `${username}.png`);
  return fs.existsSync(skinPath) ? skinPath : null;
}

function listLocalSkins() {
  if (!fs.existsSync(SKINS_DIR)) return [];
  return fs.readdirSync(SKINS_DIR)
    .filter(f => f.endsWith('.png'))
    .map(f => f.replace('.png', ''));
}

module.exports = { saveSkin, getSkinPath, listLocalSkins };
