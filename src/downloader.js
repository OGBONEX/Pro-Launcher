const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const extract = require('extract-zip');

const MC_PATH = path.join(os.homedir(), '.proclient');
const MODRINTH_API = 'https://api.modrinth.com/v2';
const USER_AGENT = 'ProClient/1.4.2 (github.com/OGBONEX/Pro-Launcher)';

const FOLDER_MAP = {
  mod: 'mods',
  resourcepack: 'resourcepacks',
  datapack: 'datapacks',
  shader: 'shaderpacks'
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    let received = 0;
    let total = 0;

    const follow = (u) => {
      https.get(u, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          fs.unlink(dest, () => {});
          return follow(res.headers.location);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(dest, () => {});
          return reject(new Error(`HTTP ${res.statusCode} on ${u}`));
        }

        total = parseInt(res.headers['content-length'] || '0', 10);

        res.on('data', (chunk) => {
          received += chunk.length;
          if (onProgress && total) {
            onProgress({ received, total, percent: Math.round((received / total) * 100) });
          }
        });

        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', (err) => {
        file.close();
        fs.unlink(dest, () => {});
        reject(err);
      });
    };

    follow(url);
  });
}

async function modrinthFetch(endpoint) {
  const res = await fetch(`${MODRINTH_API}${endpoint}`, {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!res.ok) throw new Error(`Modrinth API error: ${res.status}`);
  return res.json();
}

async function getModrinthVersion(projectId, gameVersion, loader) {
  const loaders = loader ? JSON.stringify([loader]) : null;
  const versions = gameVersion ? JSON.stringify([gameVersion]) : null;

  let url = `/project/${projectId}/version`;
  const params = [];
  if (loaders) params.push(`loaders=${encodeURIComponent(loaders)}`);
  if (versions) params.push(`game_versions=${encodeURIComponent(versions)}`);
  if (params.length) url += '?' + params.join('&');

  const list = await modrinthFetch(url);
  if (!list.length) throw new Error('No matching version found');
  return list.find(v => v.version_type === 'release') || list[0];
}

async function installSingleFile({ projectId, gameVersion, loader, contentType, instancePath, onProgress }) {
  const version = await getModrinthVersion(projectId, gameVersion, loader);
  const file = version.files.find(f => f.primary) || version.files[0];
  if (!file) throw new Error('No file in version');

  const folder = FOLDER_MAP[contentType] || 'mods';
  const targetDir = path.join(instancePath || MC_PATH, folder);
  ensureDir(targetDir);

  const dest = path.join(targetDir, file.filename);
  await downloadFile(file.url, dest, onProgress);

  return { ok: true, file: dest, filename: file.filename, version: version.version_number };
}

async function copyRecursive(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

async function installModpack({ projectId, gameVersion, loader, onProgress }) {
  const version = await getModrinthVersion(projectId, gameVersion, loader);
  const file = version.files.find(f => f.primary) || version.files[0];
  if (!file) throw new Error('No file in version');

  const instanceName = `${version.name || version.project_id}`.replace(/[^a-z0-9-_]/gi, '_');
  const instancePath = path.join(MC_PATH, 'instances', instanceName);
  ensureDir(instancePath);

  const mrpackPath = path.join(instancePath, 'pack.mrpack');
  onProgress?.({ stage: 'downloading', percent: 0 });
  await downloadFile(file.url, mrpackPath, (p) => onProgress?.({ stage: 'downloading', ...p }));

  onProgress?.({ stage: 'extracting', percent: 50 });
  const extractDir = path.join(instancePath, '_extract');
  ensureDir(extractDir);
  await extract(mrpackPath, { dir: extractDir });

  const indexPath = path.join(extractDir, 'modrinth.index.json');
  if (!fs.existsSync(indexPath)) throw new Error('Invalid .mrpack — no index');

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const files = index.files || [];
  let done = 0;

  for (const entry of files) {
    const target = path.join(instancePath, entry.path);
    ensureDir(path.dirname(target));
    await downloadFile(entry.downloads[0], target, () => {
      onProgress?.({
        stage: 'mods',
        current: done,
        total: files.length,
        percent: 50 + Math.round((done / files.length) * 45)
      });
    });
    done++;
  }

  const overridesDir = path.join(extractDir, 'overrides');
  if (fs.existsSync(overridesDir)) await copyRecursive(overridesDir, instancePath);

  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.unlinkSync(mrpackPath);

  return { ok: true, instancePath, instanceName, modsInstalled: files.length, version: version.version_number };
}

async function installContent({ source, projectId, gameVersion, loader, contentType, instancePath, onProgress }) {
  if (source !== 'modrinth') {
    return { ok: false, error: 'Only Modrinth downloads are supported.' };
  }

  try {
    if (contentType === 'modpack') {
      return await installModpack({ projectId, gameVersion, loader, onProgress });
    } else {
      return await installSingleFile({ projectId, gameVersion, loader, contentType, instancePath, onProgress });
    }
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { installContent };
