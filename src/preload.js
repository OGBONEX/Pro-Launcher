const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('proClient', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  getVersions: () => ipcRenderer.invoke('get-versions'),
  launchGame: (opts) => ipcRenderer.invoke('launch-game', opts)
});
