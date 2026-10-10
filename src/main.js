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
