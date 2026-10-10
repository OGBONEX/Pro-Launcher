const { Client, offline } = require('minecraft-launcher-core');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { ensureJava } = require('./java');

const MC_PATH = path.join(os.homedir(), '.proclient');
const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const CACHE_FILE = path.join(MC_PATH, 'version_manifest.json');
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const launcher = new Client();

// Java version requirements per Minecraft version [citation:10][citation:16]
function getRequiredJavaVersion(mcVersion) {
  // Legacy numeric versions
  const versionMatch = mcVersion.match(/^(\d+)\.(\d+)/);
  if (versionMatch) {
    const major = parseInt(versionMatch[1], 10);
    const minor = parseInt(versionMatch[2], 10);
    if (major === 1) {
      if (minor >= 21) return 21;  // 1.21+
      if (minor >= 17) return 17;  // 1.17 - 1.20.4
      if (minor >= 13) return 8;   // 1.13 - 1.16.5
      return 8;                    // 1.12.2 and older
    }
  }
  // Snapshot versioning (e.g., "25w14a", "26.1 Snapshot 1")
  // Snapshots almost always target the upcoming release's Java version
  if (mcVersion.includes('Snapshot') || /^\d{2}w\d{2}/.test(mcVersion)) {
    return 21; // Modern snapshots run on Java 21
  }
  return 21; // Default to newest
}

async function fetchManifest(force = false) {
  // Return cached manifest if fresh
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

  // Cache it
  fs.mkdirSync(MC_PATH, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data));

  return data;
}

async function getVersions() {
  const manifest = await fetchManifest();
  return {
    latest: manifest.latest, // { release, snapshot }
    versions: manifest.versions.map(v => ({
      id: v.id,
      type: v.type,        // release | snapshot | old_beta | old_alpha
      releaseTime: v.releaseTime
    }))
  };
}

async function launchGame(versionId, username = 'Player', customJavaPath = null) {
  const requiredJava = getRequiredJavaVersion(versionId);
  console.log(`[Minecraft] Version ${versionId} requires Java ${requiredJava}`);

  // ensureJava should download the right version if we support multiple
  const javaPath = customJavaPath || await ensureJava(requiredJava);
  console.log('[Minecraft] Using Java at:', javaPath);

  const auth = offline(username);

  // Determine type from manifest
  const manifest = await fetchManifest();
  const entry = manifest.versions.find(v => v.id === versionId);
  const versionType = entry ? entry.type : 'release';

  const opts = {
    authorization: auth,
    root: MC_PATH,
    version: {
      number: versionId,
      type: versionType // MCLC uses 'release' or 'snapshot' [citation:2]
    },
    memory: {
      max: '2G',
      min: '1G'
    },
    javaPath: javaPath
  };

  launcher.launch(opts);

  launcher.on('debug', (e) => console.log('[MC Debug]', e));
  launcher.on('data', (e) => console.log('[MC Data]', e));
  launcher.on('progress', (e) => console.log('[MC Progress]', e));
  launcher.on('error', (e) => console.error('[MC Error]', e));
  launcher.on('close', (code) => console.log('[MC Closed]', code));

  return { started: true };
}

module.exports = { getVersions, launchGame };
