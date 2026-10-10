const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('proClient', {
  // Window
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Minecraft
  getVersions: () => ipcRenderer.invoke('get-versions'),
  launchGame: (opts) => ipcRenderer.invoke('launch-game', opts),

  // Content
  searchContent: (opts) => ipcRenderer.invoke('search-content', opts),

  // Accounts (offline only)
  listAccounts: () => ipcRenderer.invoke('accounts:list'),
  addOfflineAccount: (username) => ipcRenderer.invoke('accounts:add-offline', username),
  setActiveAccount: (uuid) => ipcRenderer.invoke('accounts:set-active', uuid),
  removeAccount: (uuid) => ipcRenderer.invoke('accounts:remove', uuid)
});
