require('./discord');
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { updateElectronApp } = require('update-electron-app');
const mods = require('./mods');
const mc = require('./minecraft');

updateElectronApp({ updateInterval: '1 hour' });

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

// ----- Minecraft (placeholder until @xmcl works) -----
ipcMain.handle('get-versions', async () => {
  return { ok: true, versions: ['1.21.4'] };
});

ipcMain.handle('launch-game', async (_e, { version, username }) => {
  try {
    await mc.launchGame(version, username);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ----- Mod search (Modrinth + CurseForge) -----
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
