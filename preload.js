const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  getInfo: () => ipcRenderer.invoke('get-info'),
  onCursor: (cb) => ipcRenderer.on('cursor', (e, p) => cb(p)),
  onMusic: (cb) => ipcRenderer.on('music', (e, s) => cb(s)),
  onKey: (cb) => ipcRenderer.on('keyboard', (e, s) => cb(s)),
  setIgnore: (ignore) => ipcRenderer.send('set-ignore', ignore),
  quit: () => ipcRenderer.send('quit'),
});
