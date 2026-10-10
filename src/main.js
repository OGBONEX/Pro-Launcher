require('./discord');
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { updateElectronApp } = require('update-electron-app');
const mods = require('./mods');
const mc = require('./minecraft');

updateElectronApp({
  updateInterval: '1 hour',
  repo: 'OGBONEX/Pro-Launcher',
  updateSource: {
    type: 'GitHub',
    repo: 'OGBONEX/Pro-Launcher'
  }
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0d0d12',
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

// ----- Minecraft -----
ipcMain.handle('get-versions', async () => {
  return { ok: true, versions: ['1.21.4', '1.21.1', '1.20.6', '1.20.4', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.8.9'] };
});

ipcMain.handle('launch-game', async (_e, { version, username }) => {
  try {
    await mc.launchGame(version, username);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ----- Mod search -----
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
