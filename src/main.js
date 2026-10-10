require('./discord');
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const mods = require('./mods');
const mc = require('./minecraft');
const instances = require('./instances');
const skins = require('./skins');
const { installLoader } = require('./loaders');
const { installContent } = require('./downloader');

// Wrap updater in try/catch so it never crashes the app
try {
  const { updateElectronApp } = require('update-electron-app');
  updateElectronApp({
    repo: 'OGBONEX/Pro-Launcher',
    updateInterval: '1 hour'
  });
  console.log('[Updater] Auto-update initialized');
} catch (err) {
  console.warn('[Updater] Auto-update disabled:', err.message);
}

const ACCOUNTS_FILE = path.join(os.homedir(), '.proclient', 'accounts.json');
const SETTINGS_FILE = path.join(os.homedir(), '.proclient', 'settings.json');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0d0d18',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ============================================================
// WINDOW CONTROLS
// ============================================================
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

// ============================================================
// SETTINGS
// ============================================================
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch (e) {}
  return { ram: 2, javaPath: '', discord: true };
}

function saveSettings(data) {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

ipcMain.handle('settings:get', () => loadSettings());
ipcMain.handle('settings:set', (_e, data) => {
  saveSettings(data);
  return { ok: true };
});

// ============================================================
// ACCOUNTS
// ============================================================
function loadAccounts() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[Accounts] Failed to load:', e);
  }
  return { accounts: [], active: null };
}

function saveAccounts(data) {
  fs.mkdirSync(path.dirname(ACCOUNTS_FILE), { recursive: true });
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2));
}

function generateOfflineUUID(username) {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update('OfflinePlayer:' + username).digest();
  hash[6] = (hash[6] & 0x0f) | 0x30;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

ipcMain.handle('accounts:list', () => loadAccounts());

ipcMain.handle('accounts:add-offline', (_e, username) => {
  const data = loadAccounts();
  const account = {
    type: 'offline',
    username,
    uuid: generateOfflineUUID(username),
    addedAt: Date.now()
  };
  data.accounts.push(account);
  data.active = account.uuid;
  saveAccounts(data);
  return { ok: true, account };
});

ipcMain.handle('accounts:set-active', (_e, uuid) => {
  const data = loadAccounts();
  data.active = uuid;
  saveAccounts(data);
  return { ok: true };
});

ipcMain.handle('accounts:remove', (_e, uuid) => {
  const data = loadAccounts();
  data.accounts = data.accounts.filter(a => a.uuid !== uuid);
  if (data.active === uuid) {
    data.active = data.accounts[0]?.uuid || null;
  }
  saveAccounts(data);
  return { ok: true };
});

// ============================================================
// MINECRAFT
// ============================================================
ipcMain.handle('get-versions', async () => {
  try {
    const data = await mc.getVersions();
    return { ok: true, ...data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('launch-game', async (_e, { version, username, instanceFolder }) => {
  try {
    await mc.launchGame(version, username, null, instanceFolder);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ============================================================
// INSTANCES
// ============================================================
ipcMain.handle('instances:list', () => {
  try {
    return { ok: true, instances: instances.listInstances() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('instances:create', (_e, opts) => {
  try {
    return { ok: true, instance: instances.createInstance(opts) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('instances:delete', (_e, folder) => {
  try {
    instances.deleteInstance(folder);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('instances:update', (_e, folder, patch) => {
  try {
    return { ok: true, instance: instances.updateInstance(folder, patch) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ============================================================
// LOADERS
// ============================================================
ipcMain.handle('install-loader', async (_e, { instanceFolder, loaderId, version }) => {
  try {
    const instancePath = instances.getInstanceMinecraftDir(instanceFolder);
    const result = await installLoader(loaderId, version, instancePath);
    return result;
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ============================================================
// CONTENT HUB
// ============================================================
ipcMain.handle('search-content', async (_e, { query, contentType, gameVersion, loader }) => {
  try {
    const results = await mods.searchModrinthContent(query, contentType, gameVersion, loader);
    return { ok: true, results };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('install-content', async (event, opts) => {
  const instanceMinecraftDir = opts.instanceFolder
    ? instances.getInstanceMinecraftDir(opts.instanceFolder)
    : undefined;

  return await installContent({
    ...opts,
    source: 'modrinth',
    instancePath: instanceMinecraftDir,
    onProgress: (progress) => {
      event.sender.send('install-progress', progress);
    }
  });
});

// ============================================================
// SKINS
// ============================================================
ipcMain.handle('skins:lookup', async (_e, username) => {
  try {
    const result = await skins.lookupMojangSkin(username);
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('skins:upload', async (_e, { username, pngBase64 }) => {
  try {
    const buffer = Buffer.from(pngBase64, 'base64');
    const filePath = skins.saveCustomSkin(username, buffer);
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('skins:get-custom', (_e, username) => {
  const filePath = skins.getCustomSkin(username);
  return { ok: true, filePath };
});
