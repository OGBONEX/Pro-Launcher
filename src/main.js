require('./discord');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { updateElectronApp } = require('update-electron-app');
const mods = require('./mods');
const mc = require('./minecraft');

// ----- Account storage path -----
const ACCOUNTS_FILE = path.join(os.homedir(), '.proclient', 'accounts.json');

updateElectronApp({
  repo: 'OGBONEX/Pro-Launcher',
  updateInterval: '1 hour'
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0d0d16',
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

// ----- Window controls -----
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

// ============================================================
// ACCOUNT SYSTEM
// ============================================================

// Load accounts from disk
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

// Save accounts to disk
function saveAccounts(data) {
  const dir = path.dirname(ACCOUNTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2));
}

// Generate deterministic offline UUID
function generateOfflineUUID(username) {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update('OfflinePlayer:' + username).digest();
  hash[6] = (hash[6] & 0x0f) | 0x30;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

// List all accounts
ipcMain.handle('accounts:list', () => {
  return loadAccounts();
});

// Add offline account
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

// Add Microsoft account using msmc
ipcMain.handle('accounts:add-microsoft', async () => {
  try {
    const { Auth } = require('msmc');
    const authManager = new Auth('select_account');

    // Opens browser for Microsoft sign-in
    // 'electron' mode is designed for Electron launchers [citation:3]
    const xboxManager = await authManager.launch('electron');
    const token = await xboxManager.getMinecraft();

    const account = {
      type: 'microsoft',
      username: token.profile.name,
      uuid: token.profile.id,
      accessToken: token.mcToken,
      refreshToken: token.msToken?.refresh_token || null,
      addedAt: Date.now()
    };

    // Save to disk
    const data = loadAccounts();
    // Remove existing account with same UUID
    data.accounts = data.accounts.filter(a => a.uuid !== account.uuid);
    data.accounts.push(account);
    data.active = account.uuid;
    saveAccounts(data);

    return { ok: true, account };
  } catch (err) {
    console.error('[Microsoft Auth] Error:', err);
    return { ok: false, error: err.message };
  }
});

// Set active account
ipcMain.handle('accounts:set-active', (_e, uuid) => {
  const data = loadAccounts();
  data.active = uuid;
  saveAccounts(data);
  return { ok: true };
});

// Remove account
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
// MINECRAFT LAUNCH
// ============================================================

ipcMain.handle('get-versions', async () => {
  return { ok: true, versions: ['1.21.4', '1.21.1', '1.20.6', '1.20.4', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.8.9'] };
});

ipcMain.handle('launch-game', async (_e, { version, username, accountUuid }) => {
  try {
    // Load the active account
    const data = loadAccounts();
    const account = data.accounts.find(a => a.uuid === accountUuid) ||
                    data.accounts.find(a => a.uuid === data.active);

    if (!account) {
      return { ok: false, error: 'No active account. Add an account first.' };
    }

    // Pass account info to Minecraft launcher
    await mc.launchGame(version, account);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ============================================================
// CONTENT HUB (Mods, Modpacks, Resource Packs, Data Packs)
// ============================================================

ipcMain.handle('search-content', async (_e, { query, source, contentType, gameVersion, loader }) => {
  try {
    if (source === 'modrinth') {
      return { ok: true, results: await mods.searchModrinthContent(query, contentType, gameVersion, loader) };
    } else if (source === 'curseforge') {
      const loaderId = loader === 'fabric' ? 4 : 1;
      return { ok: true, results: await mods.searchCurseForgeContent(query, contentType, gameVersion, loaderId) };
    }
    return { ok: false, error: 'Unknown source' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Legacy mod search (kept for compatibility)
ipcMain.handle('search-mods', async (_e, { query, source, gameVersion, loader }) => {
  try {
    if (source === 'modrinth') {
      return { ok: true, results: await mods.searchModrinth(query, gameVersion, loader) };
    } else if (source === 'curseforge') {
      const loaderId = loader === 'fabric' ? 4 : 1;
      return { ok: true, results: await mods.searchCurseForge(query, gameVersion, loaderId) };
    }
    return { ok: false, error: 'Unknown source' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
