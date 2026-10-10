const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('proClient', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  getVersions: () => ipcRenderer.invoke('get-versions'),
  launchGame: (opts) => ipcRenderer.invoke('launch-game', opts),

  searchContent: (opts) => ipcRenderer.invoke('search-content', opts),
  installContent: (opts) => ipcRenderer.invoke('install-content', opts),
  onInstallProgress: (cb) => ipcRenderer.on('install-progress', (_e, data) => cb(data)),

  listInstances: () => ipcRenderer.invoke('instances:list'),
  createInstance: (opts) => ipcRenderer.invoke('instances:create', opts),
  deleteInstance: (folder) => ipcRenderer.invoke('instances:delete', folder),
  updateInstance: (folder, patch) => ipcRenderer.invoke('instances:update', folder, patch),

  installLoader: (opts) => ipcRenderer.invoke('install-loader', opts),

  listAccounts: () => ipcRenderer.invoke('accounts:list'),
  addOfflineAccount: (username) => ipcRenderer.invoke('accounts:add-offline', username),
  setActiveAccount: (uuid) => ipcRenderer.invoke('accounts:set-active', uuid),
  removeAccount: (uuid) => ipcRenderer.invoke('accounts:remove', uuid)
});
