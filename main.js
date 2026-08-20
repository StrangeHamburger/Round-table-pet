const { app, BrowserWindow, screen, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

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
let musicChild = null;
let musicBuf = '';
let musicPending = [];
let keyChild = null;
let keyBuf = '';
let keyPending = [];

function createWindow() {
  const wa = screen.getPrimaryDisplay().workArea;

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

  win.on('closed', () => { win = null; });

  // 全局光标轮询（屏幕 DIP 坐标），发送给渲染进程
  setInterval(() => {
    if (!win || win.isDestroyed()) return;
    const p = screen.getCursorScreenPoint();
    win.webContents.send('cursor', { x: p.x, y: p.y });
  }, 33);
}

function send(cmd, data) {
  if (win && !win.isDestroyed()) win.webContents.send('cmd', { cmd, data });
}

// ---------- 音乐桥接（GSMTC 经 PowerShell，检测"是否有音乐在播放"） ----------
function musicRequest() {
  if (!musicChild) return Promise.resolve(null);
  return new Promise((resolve) => {
    musicPending.push(resolve);
    musicChild.stdin.write('get\n');
  });
}

function startMusicBridge() {
  if (musicChild) return;
  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, 'music.ps1')
    : path.join(__dirname, 'music.ps1');
  musicChild = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
    { stdio: ['pipe', 'pipe', 'pipe'] }
  );

  musicChild.stdout.setEncoding('utf8');
  musicChild.stdout.on('data', (d) => {
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
  });
  musicChild.stderr.on('data', (d) => console.error('[music]', String(d).trim()));
  musicChild.on('exit', () => { musicChild = null; });

  // 每 2 秒轮询一次，把播放状态推给渲染进程
  setInterval(() => {
    musicRequest().then((state) => {
      if (state && win && !win.isDestroyed()) {
        win.webContents.send('music', state);
      }
    });
  }, 2000);
}

function stopMusicBridge() {
  if (musicChild) {
    try { musicChild.stdin.write('quit\n'); } catch (e) {}
    try { musicChild.kill(); } catch (e) {}
    musicChild = null;
  }
}

// ---------- 键盘桥接（检测"是否在打字"，PowerShell GetAsyncKeyState） ----------
function keyRequest() {
  if (!keyChild) return Promise.resolve(null);
  return new Promise((resolve) => {
    keyPending.push(resolve);
    keyChild.stdin.write('get\n');
  });
}

function startKeyBridge() {
  if (keyChild) return;
  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, 'keyboard.ps1')
    : path.join(__dirname, 'keyboard.ps1');
  keyChild = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
    { stdio: ['pipe', 'pipe', 'pipe'] }
  );

  keyChild.stdout.setEncoding('utf8');
  keyChild.stdout.on('data', (d) => {
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
  });
  keyChild.stderr.on('data', (d) => console.error('[keyboard]', String(d).trim()));
  keyChild.on('exit', () => { keyChild = null; });

  // 每 100ms 轮询一次，把打字状态推给渲染进程
  setInterval(() => {
    keyRequest().then((state) => {
      if (state && win && !win.isDestroyed()) {
        win.webContents.send('keyboard', state);
      }
    });
  }, 100);
}

function stopKeyBridge() {
  if (keyChild) {
    try { keyChild.stdin.write('quit\n'); } catch (e) {}
    try { keyChild.kill(); } catch (e) {}
    keyChild = null;
  }
}

ipcMain.handle('get-info', () => {
  const wa = screen.getPrimaryDisplay().workArea;
  return { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
});

ipcMain.on('set-ignore', (e, ignore) => {
  if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(!!ignore, { forward: true });
});

ipcMain.on('quit', () => app.quit());

app.whenReady().then(() => {
  if (!gotLock) return; // 未获得锁的实例在 app.quit() 后不再初始化
  createWindow();
  startMusicBridge();
  startKeyBridge();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopMusicBridge();
  stopKeyBridge();
  app.quit();
});
