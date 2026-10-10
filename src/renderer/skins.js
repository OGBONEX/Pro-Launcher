const fs = require('fs');
const path = require('path');
const os = require('os');

const SKINS_DIR = path.join(os.homedir(), '.proclient', 'skins');

async function lookupMojangSkin(username) {
  const uuidRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
  if (!uuidRes.ok) throw new Error('Player not found');
  const { id: uuid, name } = await uuidRes.json();

  const profileRes = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
  const profile = await profileRes.json();
  const textures = JSON.parse(Buffer.from(profile.properties[0].value, 'base64').toString()).textures;

  return { uuid, username: name, skinUrl: textures.SKIN.url };
}

function saveCustomSkin(username, pngBuffer) {
  fs.mkdirSync(SKINS_DIR, { recursive: true });
  const filePath = path.join(SKINS_DIR, `${username}.png`);
  fs.writeFileSync(filePath, pngBuffer);
  return filePath;
}

function getCustomSkin(username) {
  const filePath = path.join(SKINS_DIR, `${username}.png`);
  return fs.existsSync(filePath) ? filePath : null;
}

module.exports = { lookupMojangSkin, saveCustomSkin, getCustomSkin };
