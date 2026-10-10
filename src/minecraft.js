const { Client, offline } = require('minecraft-launcher-core');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { ensureJava } = require('./java');
const { getLoaderLaunchConfig } = require('./loaders');
const instances = require('./instances');

const MC_PATH = path.join(os.homedir(), '.proclient');
const SETTINGS_FILE = path.join(MC_PATH, 'settings.json');
const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const CACHE_FILE = path.join(MC_PATH, 'version_manifest.json');
const CACHE_TTL_MS = 60 * 60 * 1000;

const launcher = new Client();

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch (e) {}
  return { ram: 2, javaPath: '', discord: true };
}

function getRequiredJavaVersion(mcVersion) {
  // 26.x and newer require Java 25
  if (/^2[6-9]\./.test(mcVersion)) return 25;

  const versionMatch = mcVersion.match(/^(\d+)\.(\d+)/);
  if (versionMatch) {
    const major = parseInt(versionMatch[1], 10);
    const minor = parseInt(versionMatch[2], 10);
    if (major === 1) {
      if (minor >= 21) return 21;
      if (minor >= 17) return 17;
      return 8;
    }
  }
  // Modern snapshots target Java 25
  if (mcVersion.includes('Snapshot') || /^\d{2}w\d{2}/.test(mcVersion)) {
    return 25;
  }
  return 25;
}

async function fetchManifest(force = false) {
  if (!force && fs.existsSync(CACHE_FILE)) {
    const stat = fs.statSync(CACHE_FILE);
    if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  }

  console.log('[Manifest] Fetching fresh version list...');
  const res = await fetch(MANIFEST_URL);
  if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status}`);
  const data = await res.json();

  fs.mkdirSync(MC_PATH, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data));

  return data;
}

async function getVersions() {
  const manifest = await fetchManifest();
  return {
    latest: manifest.latest,
    versions: manifest.versions.map(v => ({
      id: v.id,
      type: v.type,
      releaseTime: v.releaseTime
    }))
  };
}

async function launchGame(versionId, username = 'Player', customJavaPath = null, instanceFolder = null) {
  let instancePath = MC_PATH;
  let loaderId = 'vanilla';

  if (instanceFolder) {
    const inst = instances.listInstances().find(i => i.folder === instanceFolder);
    if (inst) {
      instancePath = instances.getInstanceMinecraftDir(instanceFolder);
      loaderId = inst.loader || 'vanilla';
    }
  }

  const settings = loadSettings();
  const requiredJava = getRequiredJavaVersion(versionId);
  const javaPath = customJavaPath || settings.javaPath || await ensureJava(requiredJava);
  console.log(`[Minecraft] Using Java ${requiredJava} at`, javaPath);

  const auth = offline(username);

  const manifest = await fetchManifest();
  const entry = manifest.versions.find(v => v.id === versionId);
  const versionType = entry ? entry.type : 'release';

  let launchConfig = {};
  try {
    if (loaderId !== 'vanilla') {
      launchConfig = await getLoaderLaunchConfig(loaderId, versionId, instancePath);
      console.log(`[Minecraft] Loader config loaded for ${loaderId}`);
    }
  } catch (err) {
    console.warn(`[Minecraft] Could not load ${loaderId} config, falling back to vanilla:`, err.message);
  }

  const ram = settings.ram || 2;

  const opts = {
    authorization: auth,
    root: instancePath,
    version: {
      number: versionId,
      type: versionType
    },
    memory: { max: `${ram}G`, min: '1G' },
    javaPath: javaPath,
    ...launchConfig
  };

  launcher.launch(opts);

  launcher.on('debug', (e) => console.log('[MC Debug]', e));
  launcher.on('data', (e) => console.log('[MC Data]', e));
  launcher.on('progress', (e) => console.log('[MC Progress]', e));
  launcher.on('error', (e) => console.error('[MC Error]', e));
  launcher.on('close', (code) => console.log('[MC Closed]', code));

  return { started: true };
}

module.exports = { getVersions, launchGame, loadSettings };
