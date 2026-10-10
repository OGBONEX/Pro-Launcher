const fs = require('fs');
const path = require('path');
const os = require('os');

const INSTANCES_DIR = path.join(os.homedir(), '.proclient', 'instances');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function slugify(name) {
  return name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').slice(0, 40);
}

// Create the folder structure for an instance
function makeInstanceDirs(instancePath) {
  const mcDir = path.join(instancePath, '.minecraft');
  ensureDir(mcDir);
  ['mods', 'resourcepacks', 'datapacks', 'saves', 'config', 'shaderpacks'].forEach(sub =>
    ensureDir(path.join(mcDir, sub))
  );
}

function listInstances() {
  if (!fs.existsSync(INSTANCES_DIR)) return [];
  return fs.readdirSync(INSTANCES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const configPath = path.join(INSTANCES_DIR, d.name, 'instance.json');
      let config = {};
      try {
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
      } catch (e) {
        console.error('Bad instance config:', d.name, e);
      }
      return { folder: d.name, ...config };
    });
}

function createInstance({ name, version, loader, loaderVersion }) {
  const folder = slugify(name) + '-' + Date.now().toString(36).slice(-4);
  const instancePath = path.join(INSTANCES_DIR, folder);
  ensureDir(instancePath);
  makeInstanceDirs(instancePath);

  const config = {
    name,
    version,
    loader: loader || 'vanilla',
    loaderVersion: loaderVersion || null,
    createdAt: Date.now()
  };

  fs.writeFileSync(path.join(instancePath, 'instance.json'), JSON.stringify(config, null, 2));
  return { folder, ...config, path: instancePath };
}

function deleteInstance(folder) {
  const instancePath = path.join(INSTANCES_DIR, folder);
  if (fs.existsSync(instancePath)) {
    fs.rmSync(instancePath, { recursive: true, force: true });
  }
}

function getInstancePath(folder) {
  return path.join(INSTANCES_DIR, folder);
}

function getInstanceMinecraftDir(folder) {
  return path.join(getInstancePath(folder), '.minecraft');
}

// Update a field in an instance's config
function updateInstance(folder, patch) {
  const configPath = path.join(getInstancePath(folder), 'instance.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const next = { ...config, ...patch };
  fs.writeFileSync(configPath, JSON.stringify(next, null, 2));
  return { folder, ...next };
}

module.exports = {
  listInstances,
  createInstance,
  deleteInstance,
  getInstancePath,
  getInstanceMinecraftDir,
  updateInstance,
  INSTANCES_DIR
};
