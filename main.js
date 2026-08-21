const { app, BrowserWindow, screen, ipcMain, Tray, Menu } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 单实例锁：桌宠已在运行时，再双击图标只聚焦已有实例，不重复启动
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
}

let win = null;
let tray = null;
let musicBuf = '';
let musicPending = [];
let keyBuf = '';
let keyPending = [];
const bridges = {};
const bridgeRestarts = {};
const bridgePollStarted = {};

// ---------- 设置持久化 ----------
let settingsCache = {};
function getSettingsPath() { return path.join(app.getPath('userData'), 'settings.json'); }
function loadSettings() {
  try { settingsCache = JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8')); }
  catch (e) { settingsCache = {}; }
  return settingsCache;
}
let saveSettingsTimer = null;
function saveSettings(obj) {
  settingsCache = Object.assign({}, settingsCache, obj || {});
  if (saveSettingsTimer) clearTimeout(saveSettingsTimer);
  saveSettingsTimer = setTimeout(() => {
    try { fs.writeFileSync(getSettingsPath(), JSON.stringify(settingsCache), 'utf8'); }
    catch (e) {}
  }, 300);
}
ipcMain.handle('get-settings', () => loadSettings());
ipcMain.on('save-settings', (e, obj) => {
  saveSettings(obj);
  if (obj && typeof obj.autoStart === 'boolean' && app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: !!obj.autoStart, path: process.execPath });
  }
});
app.on('before-quit', () => {
  if (win && !win.isDestroyed()) win.webContents.send('save-position');
});

function flushSettings() {
  if (saveSettingsTimer) { clearTimeout(saveSettingsTimer); saveSettingsTimer = null; }
  try { fs.writeFileSync(getSettingsPath(), JSON.stringify(settingsCache), 'utf8'); } catch (e) {}
}
app.on('will-quit', () => { flushSettings(); });

function getUnionWorkArea() {
  const displays = screen.getAllDisplays();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  displays.forEach(d => {
    const a = d.workArea;
    if (a.x < minX) minX = a.x;
    if (a.y < minY) minY = a.y;
    if (a.x + a.width > maxX) maxX = a.x + a.width;
    if (a.y + a.height > maxY) maxY = a.y + a.height;
  });
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function createWindow() {
  const wa = getUnionWorkArea();

  win = new BrowserWindow({
    x: wa.x,
    y: wa.y,
    width: wa.width,
    height: wa.height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  // 默认鼠标穿透（带 forward，让渲染进程仍能收到 mousemove 以做悬停检测）
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile('index.html');

  win.webContents.once('did-finish-load', () => {
    win.webContents.send('time', { hour: new Date().getHours() });
  });

  setInterval(() => {
    try { if (win && !win.isDestroyed()) win.webContents.send('time', { hour: new Date().getHours() }); } catch (e) {}
  }, 60000);

  win.on('closed', () => { win = null; });

  // 全局光标轮询（屏幕 DIP 坐标），发送给渲染进程
  setInterval(() => {
    if (!win || win.isDestroyed()) return;
    const p = screen.getCursorScreenPoint();
    win.webContents.send('cursor', { x: p.x, y: p.y });
  }, 33);

  // 启动音乐 / 键盘桥接（意外退出会自动重启，最多 5 次）
  startBridge('music');
  startBridge('keyboard');
}

function send(cmd, data) {
  if (win && !win.isDestroyed()) win.webContents.send('cmd', { cmd, data });
}

// ---------- 音乐 / 键盘 桥接（PowerShell，检测播放 / 打字状态） ----------
// 统一桥接启动器：意外退出后自动重启，最多 5 次重试。
function startBridge(name) {
  if (bridges[name]) return;
  if ((bridgeRestarts[name] || 0) >= 5) return;
  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, name + '.ps1')
    : path.join(__dirname, name + '.ps1');
  const p = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
  bridges[name] = p;

  p.stdout.setEncoding('utf8');
  p.stdout.on('data', (d) => {
    if (name === 'music') {
      musicBuf += d;
      let i;
      while ((i = musicBuf.indexOf('\n')) >= 0) {
        const line = musicBuf.slice(0, i).trim();
        musicBuf = musicBuf.slice(i + 1);
        if (line && musicPending.length) {
          const resolve = musicPending.shift();
          let obj = null;
          try { obj = JSON.parse(line); } catch (e) { obj = null; }
          resolve(obj);
        }
      }
    } else if (name === 'keyboard') {
      keyBuf += d;
      let i;
      while ((i = keyBuf.indexOf('\n')) >= 0) {
        const line = keyBuf.slice(0, i).trim();
        keyBuf = keyBuf.slice(i + 1);
        if (line && keyPending.length) {
          const resolve = keyPending.shift();
          let obj = null;
          try { obj = JSON.parse(line); } catch (e) { obj = null; }
          resolve(obj);
        }
      }
    }
  });

  p.stderr.on('data', d => {
    try { if (win && !win.isDestroyed()) win.webContents.send(name + '-error', String(d)); } catch (e) {}
  });

  p.on('exit', (code, sig) => {
    bridges[name] = null;
    if ((bridgeRestarts[name] || 0) < 5) {
      bridgeRestarts[name] = (bridgeRestarts[name] || 0) + 1;
      setTimeout(() => startBridge(name), 1000);
    }
  });

  if (!bridgePollStarted[name]) {
    bridgePollStarted[name] = true;
    const interval = name === 'music' ? 2000 : 100;
    const pending = name === 'music' ? musicPending : keyPending;
    setInterval(() => {
      const child = bridges[name];
      if (!child) return;
      new Promise((resolve) => {
        pending.push(resolve);
        try { child.stdin.write('get\n'); } catch (e) { resolve(null); }
      }).then((state) => {
        if (state && win && !win.isDestroyed()) {
          win.webContents.send(name, state);
        }
      });
    }, interval);
  }
}

function stopMusicBridge() {
  const p = bridges.music;
  if (p) {
    try { p.stdin.write('quit\n'); } catch (e) {}
    try { p.kill(); } catch (e) {}
    bridges.music = null;
  }
}

function stopKeyBridge() {
  const p = bridges.keyboard;
  if (p) {
    try { p.stdin.write('quit\n'); } catch (e) {}
    try { p.kill(); } catch (e) {}
    bridges.keyboard = null;
  }
}

ipcMain.handle('get-info', () => {
  const wa = getUnionWorkArea();
  return { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
});

ipcMain.on('set-ignore', (e, ignore) => {
  if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(!!ignore, { forward: true });
});

ipcMain.on('quit', () => app.quit());

app.whenReady().then(() => {
  if (!gotLock) return; // 未获得锁的实例在 app.quit() 后不再初始化
  try {
    const s = loadSettings();
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!s.autoStart, path: process.execPath });
  } catch (e) {}
  createWindow();
  if (!tray && fs.existsSync(path.join(__dirname, 'icon.png'))) {
    tray = new Tray(path.join(__dirname, 'icon.png'));
    const trayMenu = Menu.buildFromTemplate([
      { label: '显示窗口', click: () => { if (win && !win.isDestroyed()) { win.show(); win.setIgnoreMouseEvents(true, { forward: true }); } } },
      { label: '隐藏窗口', click: () => { if (win && !win.isDestroyed()) { win.setIgnoreMouseEvents(false); win.hide(); } } },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() },
    ]);
    tray.setToolTip('团团桌面宠物');
    tray.setContextMenu(trayMenu);
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopMusicBridge();
  stopKeyBridge();
  app.quit();
});
