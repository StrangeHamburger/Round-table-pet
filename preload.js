const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  getInfo: () => ipcRenderer.invoke('get-info'),
  onCursor: (cb) => ipcRenderer.on('cursor', (e, p) => cb(p)),
  onMusic: (cb) => ipcRenderer.on('music', (e, s) => cb(s)),
  onKey: (cb) => ipcRenderer.on('keyboard', (e, s) => cb(s)),
  setIgnore: (ignore) => ipcRenderer.send('set-ignore', ignore),
  quit: () => ipcRenderer.send('quit'),
  quitNow: () => ipcRenderer.send('quit-now'),
  onQuitRequest: (cb) => ipcRenderer.on('quit-request', () => cb()),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (obj) => ipcRenderer.send('save-settings', obj),
  onSavePosition: (cb) => ipcRenderer.on('save-position', (e) => cb()),
  onTime: (cb) => ipcRenderer.on('time', (e, p) => cb(p)),
  onBridgeError: (cb) => {
    ['music', 'keyboard'].forEach(n => ipcRenderer.on(n + '-error', () => cb(n)));
  },
});
