# 团团桌面宠物 · 升级实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不引入构建工具与运行时依赖的前提下，清理死代码、拆分巨石文件、并增量加入设置持久化、系统托盘、开机自启、真实节拍（档1）、多屏漫游、轻量润色与桥接健壮性。

**Architecture:** 保持原生 HTML/Canvas/JS + Electron 现状。把 `index.html` 的 `<script>` 拆为 `src/` 下按序加载的多个脚本，共享 `window.Pet` 命名空间；主进程 `main.js` 负责窗口/单实例/托盘/自启/桥接/设置读写；`preload.js` 扩展 `desktopAPI`。不修改任何动画/物理算法本身，仅搬家与增量。

**Tech Stack:** Electron 33、原生 Canvas 2D、PowerShell 5+（GSMTC / WASAPI / GetAsyncKeyState）、Node `fs`、`Tray`/`app.setLoginItemSettings`。无前端框架、无打包器。

## Global Constraints

- 保持「无框架、无打包」：不得引入 webpack/esbuild/vite 或任何运行时依赖。
- `src/*.js` 用经典 `<script>` 顺序加载，靠 `window.Pet` 共享状态，禁用 `<script type="module">`（避免 `file://` CORS）。
- 拆分阶段（Phase 1）必须保证动画/交互与原版 `index.html` **逐像素无差异**。
- 所有新增 PowerShell 输出须沿用现有「每行一个 JSON」行协议（`get`/`quit` 命令）。
- 删除 `pet.html`（死代码），不得再被任何地方引用。
- 设置文件存于 `app.getPath('userData')/settings.json`。
- 开机自启仅打包后（`app.isPackaged`）经 `app.setLoginItemSettings` 生效。
- 档 2（WASAPI 真·音频）与时间感知为**可选**，默认不实现/默认关。

---

## File Structure (target)

```
main.js             主进程：窗口/单实例/托盘/自启/桥接生命周期/设置读写   (MODIFY)
preload.js          上下文桥：desktopAPI 新增 getSettings/saveSettings    (MODIFY)
index.html          渲染进程：DOM + 按序 <script>                          (MODIFY, 脚本搬空)
src/config.js       Pet.config: PALETTES / BEHAVIORS / MOOD 表 / 常量       (CREATE)
src/state.js        Pet.state / Pet.env / Pet.input 共享可变状态           (CREATE)
src/render.js       全部 draw* 函数                                         (CREATE, 搬家)
src/behaviors.js    updateBehavior/Mood/Look/Open/Dance + specialPhysics   (CREATE, 搬家)
src/physics.js      updatePhysics / updatePetting                          (CREATE, 搬家)
src/input.js        光标/音乐/键盘 IPC 接线 + 交互处理 + 菜单               (CREATE, 搬家)
src/app.js          引导 + loop 主循环                                      (CREATE)
music.ps1          增强：trackId / playbackRate / 可选 level               (MODIFY)
keyboard.ps1       增强：available 上报                                     (MODIFY)
README.md          修正文件清单 + 新特性章节                                 (MODIFY)
docs/superpowers/specs/2026-08-21-desktop-pet-upgrade-design.md  (已存在)
```

共享接口约定（贯穿所有渲染端任务）：
- `Pet.env` = `{ W, H, DPR, R, floorY, ox, oy }`（原 `index.html` 顶层 `W/H/DPR/R/floorY/ox/oy`）。
- `Pet.state` = `{ pet, excite, music, now, lastNow, mouse, dragging, dragDX, dragDY, dragMoved, downTime, downX, downY, hovering, downRelX, downRelY, ignoring, menuOpen, petStreak, petStreakT, lastPetted, pressHold, lastInteract, lastStartle, lastHeadTap, headTapCount, orbitHist, dance, musicMood, typeHops, lastTrackId }`（原 `index.html` 全部模块级 `let`/`const pet`）。
- `Pet.config` = `{ PALETTES, BEHAVIORS, BEHAVIOR_TOTAL, MOOD_NAME, AUTO_MOODS }`。
- `Pet.util` = `{ RAND, clamp, lerp, shade }`。
- 所有 `src/*.js` 在文件顶部用 `window.Pet = window.Pet || {}` 初始化自己负责的子对象；函数定义用 `Pet.behaviors.updateMood = function(){...}` 等形式，或闭包内引用 `Pet.state`/`Pet.env`。

---

## Phase 0 — 清理与文档（零风险）

### Task 1: 删除死代码 `pet.html`

**Files:**
- Delete: `pet.html`

**Interfaces:** 无（`main.js` 从不引用它）。

- [ ] **Step 1: 确认无引用**
  搜索仓库确认除文件本身外没有任何 `require('pet.html')` / `loadFile('pet.html')` / `<script src="pet.html">`。运行：`Select-String -Path .\main.js,.\index.html,.\README.md -Pattern "pet\.html"`。Expected：无匹配（README 若提到则视为下一任务处理）。
- [ ] **Step 2: 删除文件**
  运行：`Remove-Item .\pet.html`。
- [ ] **Step 3: 验证启动正常**
  运行：`npm start`（手动确认窗口正常显示、无报错），然后关闭。
- [ ] **Step 4: 提交（可选，仓库未初始化）**
  ```bash
  git add -A; git commit -m "chore: remove stale pet.html duplicate"
  ```
  （若未 `git init`，跳过此步。）

### Task 2: 修正 README

**Files:**
- Modify: `README.md`

**Interfaces:** 无。

- [ ] **Step 1: 更新文件清单与说明**
  将 README「技术栈 / 文件结构」段改为实际结构：渲染入口 `index.html`，拆分后的 `src/*.js`，新增「系统托盘 / 开机自启 / 设置持久化 / 多屏漫游」段落，并说明音乐律动在档 1 为「换曲感知」。
- [ ] **Step 2: 人工核对**
  通读 README 确保与 `main.js` 实际 `loadFile('index.html')`、桥接文件名一致。
- [ ] **Step 3: 提交（可选）**
  ```bash
  git add README.md; git commit -m "docs: align README with actual architecture"
  ```

---

## Phase 1 — 代码拆分为 `src/`（保持行为一致）

### Task 3: 建立 `src/config.js`

**Files:**
- Create: `src/config.js`

**Interfaces:**
- Produces: `Pet.config.PALETTES`, `Pet.config.BEHAVIORS`, `Pet.config.BEHAVIOR_TOTAL`, `Pet.config.AUTO_MOODS`, `Pet.config.MOOD_NAME`。

- [ ] **Step 1: 创建文件并搬运常量**
  把 `index.html` 中 `PALETTES` 数组、`BEHAVIORS` 数组、`BEHAVIOR_TOTAL` 累加、`AUTO_MOODS`、`MOOD_NAME` 原样移入：
  ```js
  window.Pet = window.Pet || {};
  Pet.config = {
    PALETTES: [
      { body:'#F6E7C6', eye:'#6B4E33' },
      { body:'#F4EFE6', eye:'#2E2B28' },
      { body:'#F2D8D5', eye:'#7A3A48' },
      { body:'#D9E8DC', eye:'#2F5D4A' },
      { body:'#DCE4EC', eye:'#2C3E5C' },
    ],
    BEHAVIORS: [ /* 原 index.html 中全部 BEHAVIORS 条目，逐条原样 */ ],
    AUTO_MOODS: ['neutral','happy','sad','surprised','sleepy','dizzy','dazed','pleading'],
    MOOD_NAME: {
      neutral:'平静', happy:'开心', sad:'难过', surprised:'惊讶',
      sleepy:'犯困', sleep:'睡觉', dizzy:'晕眩',
    },
  };
  let BEHAVIOR_TOTAL = 0;
  Pet.config.BEHAVIORS.forEach(b => BEHAVIOR_TOTAL += b[2]);
  Pet.config.BEHAVIOR_TOTAL = BEHAVIOR_TOTAL;
  ```
- [ ] **Step 2: 语法检查**
  运行：`node -c src/config.js`。Expected：无报错。

### Task 4: 建立 `src/state.js`

**Files:**
- Create: `src/state.js`

**Interfaces:**
- Produces: `Pet.env`、`Pet.state`、`Pet.util`。后续所有任务从此读取/写入。

- [ ] **Step 1: 创建共享状态容器**
  ```js
  window.Pet = window.Pet || {};
  Pet.env = { W:0, H:0, DPR:1, R:35, floorY:0, ox:0, oy:0 };
  Pet.util = {
    RAND:(a,b)=>a+Math.random()*(b-a),
    clamp:(v,a,b)=>v<a?a:(v>b?b:v),
    lerp:(a,b,t)=>a+(b-a)*t,
    shade(hex,amt){
      const n=parseInt(hex.slice(1),16);
      let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
      if(amt<0){const k=1+amt;r*=k;g*=k;b*=k;}
      else{r+=(255-r)*amt;g+=(255-g)*amt;b+=(255-b)*amt;}
      const h=x=>Math.round(Math.min(255,Math.max(0,x))).toString(16).padStart(2,'0');
      return '#'+h(r)+h(g)+h(b);
    },
  };
  const pet = {
    x:0,y:0,vx:0,vy:0,walkDir:1,
    mood:'neutral',moodUntil:0,nextAutoMood:0,
    behavior:'',behaviorUntil:0,behaviorStart:0,behaviorDur:1200,
    nextBehavior:3000,
    homeX:0,homeSet:false,goingHome:false,
    look:{x:0,y:0},openL:1,openR:1,
    blinkStart:0,blinkDur:0,nextBlink:0,
    saccadeUntil:0,saccade:{x:0,y:0},
    chasing:false,chaseUntil:0,shake:0,hopIdx:-1,turnAt:0,edgeDir:0,
  };
  Pet.state = {
    pet, excite:0, music:{playing:false}, now:0, lastNow:0,
    mouse:{x:0,y:0,active:false,px:0,py:0,vx:0,vy:0},
    dragging:false, dragDX:0, dragDY:0, dragMoved:false,
    downTime:0, downX:0, downY:0, hovering:false, downRelX:0, downRelY:0,
    ignoring:true, menuOpen:false,
    petStreak:0, petStreakT:0, lastPetted:0, pressHold:0,
    lastInteract:0, lastStartle:0, lastHeadTap:0, headTapCount:0,
    orbitHist:[], dance:{style:0,next:0,hopT:0},
    musicMood:{m:'happy',next:0}, typeHops:0, lastTrackId:'',
  };
  ```
- [ ] **Step 2: 语法检查**
  运行：`node -c src/state.js`。Expected：无报错。

### Task 5: 建立 `src/render.js`

**Files:**
- Create: `src/render.js`
- Reference: 原 `index.html` 中 `drawBubbles/drawNotes/drawBeatRings/capsule/drawEye/drawDrillMouse/draw` 整段。

**Interfaces:**
- Consumes: `Pet.env`, `Pet.state`, `Pet.util.shade`。
- Produces: `Pet.render.draw`（主绘制入口）。

- [ ] **Step 1: 搬运绘制函数**
  将 `index.html` 的 `drawBubbles`、`drawNotes`、`drawBeatRings`、`capsule`、`drawEye`、`drawDrillMouse`、`draw` 原样移入 `src/render.js`，把函数体内部对 `W/H/R/floorY/ox/oy/pet/music/excite/now/...` 的引用改为 `Pet.env.W` 等 / `Pet.state.pet` 等；`shade` 改为 `Pet.util.shade`。
- [ ] **Step 2: 暴露入口**
  ```js
  Pet.render = { draw, drawBubbles, drawNotes, drawBeatRings };
  ```
  （`draw` 内部引用 `pet.behavior` 等改为 `Pet.state.pet.behavior`。）
- [ ] **Step 3: 语法检查**
  运行：`node -c src/render.js`。Expected：无报错。

### Task 6: 建立 `src/behaviors.js`

**Files:**
- Create: `src/behaviors.js`
- Reference: 原 `index.html` 中 `setBehavior/startBlink/updateBehavior/updateMood/updateDance/updateLook/updateOpen/specialPhysics`。

**Interfaces:**
- Consumes: `Pet.env`, `Pet.state`, `Pet.config`, `Pet.util`。
- Produces: `Pet.behaviors.update*`（被 `src/app.js` 的 `loop` 调用）。

- [ ] **Step 1: 搬运行为/物理更新函数**
  将对应函数原样移入，内部 `now`→`Pet.state.now`；`pet`→`Pet.state.pet`；`music`→`Pet.state.music`；`excite`→`Pet.state.excite`；`dance`→`Pet.state.dance`；`BEHAVIORS/BEHAVIOR_TOTAL/AUTO_MOODS`→`Pet.config.*`。
- [ ] **Step 2: 暴露**
  ```js
  Pet.behaviors = { setBehavior, startBlink, updateBehavior, updateMood, updateDance, updateLook, updateOpen, specialPhysics };
  ```
- [ ] **Step 3: 语法检查**
  运行：`node -c src/behaviors.js`。Expected：无报错。

### Task 7: 建立 `src/physics.js`

**Files:**
- Create: `src/physics.js`
- Reference: 原 `index.html` 中 `updatePhysics`、`updatePetting`。

**Interfaces:**
- Consumes: `Pet.env`, `Pet.state`, `Pet.util`, `Pet.behaviors.specialPhysics`, `Pet.behaviors.setBehavior`。
- Produces: `Pet.physics.updatePhysics`, `Pet.physics.updatePetting`。

- [ ] **Step 1: 搬运物理函数**
  将 `updatePhysics`、`updatePetting` 原样移入，引用改 `Pet.state`/`Pet.env`；`setBehavior` 改为 `Pet.behaviors.setBehavior`。
- [ ] **Step 2: 暴露**
  ```js
  Pet.physics = { updatePhysics, updatePetting };
  ```
- [ ] **Step 3: 语法检查**
  运行：`node -c src/physics.js`。Expected：无报错。

### Task 8: 建立 `src/input.js`

**Files:**
- Create: `src/input.js`
- Reference: 原 `index.html` 中光标/音乐/键盘 IPC 接线、鼠标交互、`headTap/bellyRub/tickle/clickPet`、菜单逻辑、`applySize/resize/buildSwatches/openMenu/closeMenu/setIgnore`。

**Interfaces:**
- Consumes: `Pet.env`, `Pet.state`, `Pet.config`, `Pet.util`, `Pet.behaviors.setBehavior`, `Pet.render`(无需)。
- Produces: `Pet.input.init()`（在 `src/app.js` 引导时调用，负责绑定事件与 IPC）。

- [ ] **Step 1: 搬运交互与菜单**
  将 `desktopAPI.onCursor/onMusic/onKey`、`window` 鼠标事件、`dblclick`/`contextmenu`、`headTap/bellyRub/tickle/clickPet`、`buildSwatches`、`openMenu/closeMenu/setIgnore`、`applySize/resize` 原样移入，引用改 `Pet.state`/`Pet.env`；`setBehavior`→`Pet.behaviors.setBehavior`；`desktopAPI.setIgnore` 保留。
- [ ] **Step 2: 暴露**
  ```js
  Pet.input = { init };
  ```
- [ ] **Step 3: 语法检查**
  运行：`node -c src/input.js`。Expected：无报错。

### Task 9: 建立 `src/app.js` 并清空 `index.html` 脚本

**Files:**
- Create: `src/app.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: 全部 `Pet.*` 子模块。
- Produces: 启动引导 + `loop` 主循环。

- [ ] **Step 1: 写 `src/app.js`**
  ```js
  window.Pet = window.Pet || {};
  (function(){
    const E = Pet.env, S = Pet.state;
    function loop(t){
      S.now = t;
      const dt = S.lastNow ? Math.min(t - S.lastNow, 50) : 16.7;
      S.lastNow = t;
      Pet.behaviors.updateBehavior();
      Pet.behaviors.updateMood();
      Pet.behaviors.updateDance();
      if (S.now >= S.pet.nextBlink && S.pet.mood!=='sleep' && S.pet.mood!=='sleepy') Pet.behaviors.startBlink(S.now);
      Pet.behaviors.updateLook();
      Pet.behaviors.updateOpen();
      Pet.physics.updatePhysics(dt);
      Pet.physics.updatePetting(dt);
      Pet.render.draw();
      requestAnimationFrame(loop);
    }
    function boot(){
      Pet.input.init();
      requestAnimationFrame(loop);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  })();
  ```
- [ ] **Step 2: 改写 `index.html`**
  删除 `<script>` 内全部 JS，改为底部按顺序引入：
  ```html
  <script src="src/config.js"></script>
  <script src="src/state.js"></script>
  <script src="src/render.js"></script>
  <script src="src/behaviors.js"></script>
  <script src="src/physics.js"></script>
  <script src="src/input.js"></script>
  <script src="src/app.js"></script>
  ```
  （保留 `<canvas id="c">`、菜单 DOM、`#menu` 相关样式与 `.hint/.hud` 不再需要可删除——原 `index.html` 无 hint/hud，以实际为准。）
- [ ] **Step 3: 启动验收（关键）**
  运行：`npm start`。Expected：窗口显示、团团动画/交互与原版**完全一致**（呼吸、眨眼、待机行为、拖拽甩飞、抚摸、追逐、右键菜单、音乐律动、打字小跳均正常），DevTools 控制台无报错。
- [ ] **Step 4: 提交（可选）**
  ```bash
  git add -A; git commit -m "refactor: split index.html into src/ modules (behavior-preserving)"
  ```

---

## Phase 2 — 设置持久化

### Task 10: 主进程设置读写

**Files:**
- Modify: `main.js`
- Modify: `preload.js`

**Interfaces:**
- Produces: `ipcMain.handle('get-settings')` → 返回 `settings` 对象；`ipcMain.on('save-settings', (e, obj)=>...)` 防抖写盘；`preload` 暴露 `getSettings()`、`saveSettings(obj)`。

- [ ] **Step 1: `main.js` 增加设置模块**
  在 `main.js` 顶部引入 `const fs = require('fs'); const path = require('path');` 并新增：
  ```js
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  let settingsCache = {};
  function loadSettings(){
    try { settingsCache = JSON.parse(fs.readFileSync(settingsPath,'utf8')); }
    catch(e){ settingsCache = {}; }
    return settingsCache;
  }
  let saveTimer = null;
  function saveSettings(obj){
    settingsCache = Object.assign({}, settingsCache, obj);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { fs.writeFileSync(settingsPath, JSON.stringify(settingsCache), 'utf8'); } catch(e){}
    }, 300);
  }
  ipcMain.handle('get-settings', () => loadSettings());
  ipcMain.on('save-settings', (e, obj) => saveSettings(obj || {}));
  ```
- [ ] **Step 2: `before-quit` 保存位置**
  在 `app.on('window-all-closed')` 旁新增：
  ```js
  app.on('before-quit', () => {
    if (win && !win.isDestroyed()){
      win.webContents.send('save-position'); // 渲染端监听后回传 {lastX,lastY}
    }
  });
  ```
  同时把 `createWindow` 内 `win.loadFile('index.html')` 之后，在窗口 `ready-to-show` 不强制；位置由渲染端应用设置后自行设定（见 Task 11）。
- [ ] **Step 3: `preload.js` 扩展**
  ```js
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (obj) => ipcRenderer.send('save-settings', obj),
  ```
- [ ] **Step 4: 语法检查**
  运行：`node -c main.js`、`node -c preload.js`。Expected：无报错。

### Task 11: 渲染端应用与回存设置

**Files:**
- Modify: `src/state.js`（新增 `settings` 字段）、`src/input.js`（应用+保存）、`src/app.js`（启动应用+监听 `save-position`）

**Interfaces:**
- Consumes: `desktopAPI.getSettings()`、`desktopAPI.saveSettings(obj)`（来自 `preload`）。
- Produces: 启动即应用配色/大小/定家/位置；变更后防抖保存；退出前回传位置。

- [ ] **Step 1: 渲染端读取并应用**
  在 `src/input.js` 的 `init()` 开头：
  ```js
  desktopAPI.getSettings().then(s => {
    if (!s) return;
    if (s.bodyColor) { bodyColor = s.bodyColor; eyeColor = s.eyeColor || eyeColor; syncSwatches(); }
    if (s.size) { document.getElementById('mSize').value = s.size; applySize(); }
    if (s.homeSet) { Pet.state.pet.homeX = s.homeX; Pet.state.pet.homeSet = true; }
    if (typeof s.lastX === 'number') { Pet.state.pet.x = s.lastX; Pet.state.pet.y = s.lastY; }
    Pet.state.settings = s;
  });
  ```
  （`bodyColor/eyeColor` 需提升为 `Pet.state` 或在 `input.js` 闭包内可被 `getSettings` 回调修改——见 Step 2。）
- [ ] **Step 2: 变更处防抖保存**
  在 `buildSwatches` 点击、`mSize` input、`mHome` 点击、拖拽 `mouseup` 松手（非甩飞且位置变化）处调用：
  ```js
  function persist(){
    desktopAPI.saveSettings({
      bodyColor, eyeColor,
      size: Pet.env.R,
      homeSet: Pet.state.pet.homeSet, homeX: Pet.state.pet.homeX,
      lastX: Pet.state.pet.x, lastY: Pet.state.pet.y,
      autoStart: Pet.state.settings?.autoStart || false,
      sound: Pet.state.settings?.sound !== false,
    });
  }
  ```
- [ ] **Step 3: 退出前回传位置**
  在 `src/app.js` 增加：
  ```js
  const { ipcRenderer } = require('electron'); // 渲染端不可用 require；改用 desktopAPI
  ```
  改为在 `preload` 增加 `onSavePosition: (cb)=>ipcRenderer.on('save-position',()=>cb({lastX:Pet.state.pet.x,lastY:Pet.state.pet.y}))`，渲染端 `src/app.js` 监听后 `desktopAPI.saveSettings(...)`。
- [ ] **Step 4: 验收**
  运行：`npm start` → 改配色/大小/定家/拖动 → 退出 → 再 `npm start`。Expected：配色、大小、家、上次位置全部保持。控制台无报错。
- [ ] **Step 5: 提交（可选）**
  ```bash
  git add -A; git commit -m "feat: persist pet settings across launches"
  ```

---

## Phase 3 — 系统托盘 + 开机自启

### Task 12: 托盘与自启

**Files:**
- Modify: `main.js`

**Interfaces:**
- Consumes: `saveSettings`/`loadSettings`（Task 10）。
- Produces: 托盘菜单（显示/隐藏/退出）；`app.setLoginItemSettings`。

- [ ] **Step 1: 创建托盘**
  在 `createWindow()` 成功且 `win` 就绪后：
  ```js
  const { Tray, Menu, nativeImage } = require('electron');
  const trayIcon = path.join(__dirname, app.isPackaged ? '' : '', 'icon.png');
  if (!tray && require('fs').existsSync(path.join(__dirname,'icon.png'))){
    tray = new Tray(path.join(__dirname,'icon.png'));
    const tmpl = [
      { label:'显示窗口', click:()=>{ if(win&&!win.isDestroyed()){ win.show(); win.setIgnoreMouseEvents(true,{forward:true}); } } },
      { label:'隐藏窗口', click:()=>{ if(win&&!win.isDestroyed()){ win.setIgnoreMouseEvents(false); win.hide(); } } },
      { type:'separator' },
      { label:'退出', click:()=>app.quit() },
    ];
    tray.setToolTip('团团桌面宠物');
    tray.setContextMenu(Menu.buildFromTemplate(tmpl));
  }
  ```
  （`tray` 声明在模块顶层 `let tray = null;`。）
- [ ] **Step 2: 应用自启设置**
  在 `app.whenReady().then(...)` 内 `createWindow()` 之前：
  ```js
  try {
    const s = loadSettings();
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!s.autoStart, path: process.execPath });
  } catch(e){}
  ```
- [ ] **Step 3: 切换自启通道**
  在 `ipcMain.on('save-settings')` 中，若 `obj.autoStart` 有值且 `app.isPackaged`：
  ```js
  app.setLoginItemSettings({ openAtLogin: !!obj.autoStart, path: process.execPath });
  ```
- [ ] **Step 4: 验收**
  运行：`npm start` → 系统托盘出现团团图标 → 右键「隐藏窗口」窗口消失、光标不再被吞；「显示窗口」恢复 → 「退出」结束进程。打包后（或手动测试 `app.setLoginItemSettings`）确认自启项存在。
- [ ] **Step 5: 提交（可选）**
  ```bash
  git add -A; git commit -m "feat: system tray and login auto-start"
  ```

---

## Phase 4 — 真实节拍（档 1）

### Task 13: 音乐桥接换曲检测

**Files:**
- Modify: `music.ps1`

**Interfaces:**
- Produces: `Get-State` 输出新增 `trackId`（`title + '|' + artist`）、`playbackRate`。

- [ ] **Step 1: 扩展 `Get-State`**
  在 `music.ps1` 的 `return @{...}` 中新增：
  ```powershell
  trackId = ([string]$props.Title + '|' + [string]$props.Artist)
  playbackRate = if ($pb.PlaybackRate) { [double]$pb.PlaybackRate } else { 1.0 }
  ```
- [ ] **Step 2: 解析校验**
  运行：`powershell -NoProfile -ExecutionPolicy Bypass -File .\music.ps1` 后输入 `get` 一行，Expected：输出 JSON 含 `trackId` 与 `playbackRate` 字段，且进程不退出。
- [ ] **Step 3: 提交（可选）**
  ```bash
  git add music.ps1; git commit -m "feat(music): report trackId and playbackRate"
  ```

### Task 14: 渲染端换曲特效

**Files:**
- Modify: `src/input.js`（消费 `onMusic`）、`src/behaviors.js`（`updateDance` 用 `playbackRate`）

**Interfaces:**
- Consumes: `Pet.state.music`、`Pet.state.lastTrackId`、`Pet.state.dance`。
- Produces: 换曲时重置舞步并触发「新歌」小跳 + 音符更密。

- [ ] **Step 1: `onMusic` 处理换曲**
  在 `src/input.js` 现有 `desktopAPI.onMusic` 回调中：
  ```js
  desktopAPI.onMusic(s => {
    if (!s) return;
    Pet.state.music.playing = !!s.playing;
    if (s.trackId && s.trackId !== Pet.state.lastTrackId){
      Pet.state.lastTrackId = s.trackId;
      Pet.state.dance.style = 0; Pet.state.dance.next = 0;
      if (Pet.state.music.playing){
        Pet.state.pet.vy = -5;
        Pet.behaviors.setBehavior('换新歌啦', 900);
      }
    }
    if (typeof s.playbackRate === 'number') Pet.state.music.rate = s.playbackRate;
  });
  ```
- [ ] **Step 2: `updateDance` 用速率**
  在 `src/behaviors.js` 的 `updateDance` 中把周期乘以 `1 / (Pet.state.music.rate || 1)`：
  ```js
  dance.next = now + RAND(2000,4000) / (Pet.state.music.rate || 1);
  ```
  并在 `drawBeatRings`（`src/render.js`）周期用 `Pet.state.music.rate` 缩放。
- [ ] **Step 3: 验收**
  运行：`npm start` → 播放音乐 → 切歌时团团小跳并重置舞步；倍速播放时律动加快。
- [ ] **Step 4: 提交（可选）**
  ```bash
  git add -A; git commit -m "feat: music track-change detection drives dance reset"
  ```

---

## Phase 5 — 多屏漫游

### Task 15: 主进程覆盖虚拟屏

**Files:**
- Modify: `main.js`（`createWindow`）、`preload.js`（`getInfo` 返回 origin + 边界）

**Interfaces:**
- Produces: 窗口矩形 = 所有显示器 workArea 并集；`getInfo` 返回 `{x,y,width,height}` 为该并集；渲染端原点 `(ox,oy)` = 并集左上角。

- [ ] **Step 1: 计算并集**
  在 `createWindow()` 内替换 `const wa = screen.getPrimaryDisplay().workArea;` 为：
  ```js
  const displays = screen.getAllDisplays();
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  displays.forEach(d=>{ const a=d.workArea; minX=Math.min(minX,a.x); minY=Math.min(minY,a.y); maxX=Math.max(maxX,a.x+a.width); maxY=Math.max(maxY,a.y+a.height); });
  const wa = { x:minX, y:minY, width:maxX-minX, height:maxY-minY };
  ```
  `BrowserWindow` 的 `x/y/width/height` 使用 `wa`。
- [ ] **Step 2: `getInfo` 返回原点**
  `ipcMain.handle('get-info')` 改为返回 `{ x:wa.x, y:wa.y, width:wa.width, height:wa.height }`（已是），渲染端 `ox/oy` 即 `wa.x/wa.y`（`src/input.js` / `src/state.js` 中 `desktopAPI.getInfo().then(info=>{Pet.env.ox=info.x;Pet.env.oy=info.y;})` 已存在，原样保留）。
- [ ] **Step 3: 验收**
  运行：`npm start`（双屏环境）→ 团团可在两屏间被甩飞/走动/回家；定家坐标存为屏幕绝对坐标，跨屏正确。
- [ ] **Step 4: 提交（可选）**
  ```bash
  git add main.js; git commit -m "feat: span all monitors for pet roaming"
  ```

---

## Phase 6 — 轻量润色（可选：音效 / 时间感知）

### Task 16: 点击音效

**Files:**
- Modify: `src/input.js`（`clickPet/headTap` 等触发）

**Interfaces:**
- Consumes: `Pet.state.settings.sound`。
- Produces: WebAudio 短 blip。

- [ ] **Step 1: 加音效**
  在 `src/input.js` 闭包内：
  ```js
  let actx = null;
  function blip(freq){
    if (Pet.state.settings && Pet.state.settings.sound === false) return;
    try {
      actx = actx || new (window.AudioContext||window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = freq||440; o.type='sine';
      g.gain.value = 0.05; o.connect(g); g.connect(actx.destination);
      o.start(); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime+0.12); o.stop(actx.currentTime+0.13);
    } catch(e){}
  }
  ```
  在 `clickPet`/`headTap`/`bellyRub` 调用 `blip(...)`。
- [ ] **Step 2: 验收**
  运行：`npm start` → 点击/拍头有轻微「噗」声；设置 `sound:false` 后静音。
- [ ] **Step 3: 提交（可选）**
  ```bash
  git add -A; git commit -m "feat: tiny click sfx (toggleable)"
  ```

### Task 17: 时间感知（可选，默认关）

**Files:**
- Modify: `src/behaviors.js`（`updateMood`/`updateBehavior` 注入夜间偏置）

**Interfaces:**
- Consumes: `Pet.state.settings.timeAware`。
- Produces: 22:00–07:00 更倾向犯困/睡觉、律动减弱。

- [ ] **Step 1: 夜间偏置**
  在 `updateMood` 中随机选 `randomMood()` 后，若 `Pet.state.settings.timeAware` 且小时∈[22,7)：
  ```js
  const h = new Date().getHours();
  if (h>=22||h<7){ const night=['sleepy','sleep','sad']; Pet.state.pet.mood = night[(Math.random()*night.length)|0]; }
  ```
- [ ] **Step 2: 验收（可选特性）**
  手动将系统时间调至深夜启动 → 团团更常睡觉/犯困。
- [ ] **Step 3: 提交（可选）**
  ```bash
  git add -A; git commit -m "feat(opt): time-of-day mood bias"
  ```

---

## Phase 7 — 健壮性

### Task 18: 桥接进程意外退出重启

**Files:**
- Modify: `main.js`

**Interfaces:**
- Consumes: `startMusicBridge`/`startKeyBridge`/`musicChild`/`keyChild`。

- [ ] **Step 1: 退出即重启**
  将 `musicChild.on('exit', () => { musicChild = null; })` 改为：
  ```js
  musicChild.on('exit', () => { musicChild = null; if (!app.isQuitting) setTimeout(startMusicBridge, 1000); });
  ```
  键盘桥接同理；模块顶层 `let appQuitting = false;`，在 `app.on('before-quit')` 置 `true`。
- [ ] **Step 2: 验收**
  运行：`npm start` → 任务管理器结束 `powershell music.ps1` 进程 → 约 1s 后桥接自动恢复，音乐律动继续工作。
- [ ] **Step 3: 提交（可选）**
  ```bash
  git add main.js; git commit -m "fix: auto-restart bridges on unexpected exit"
  ```

### Task 19: 桥接可用性上报与降级

**Files:**
- Modify: `music.ps1`、`keyboard.ps1`、`src/input.js`

**Interfaces:**
- Produces: `Get-State`/`Get-Presses` 输出含 `available`；渲染端降级并一次性提示。

- [ ] **Step 1: PowerShell 可用性**
  `music.ps1`：`if (-not $script:manager){ return @{ playing=$false; hasSession=$false; available=$false } }`；正常路径补 `available=$true`。`keyboard.ps1` 若 `[KB]::GetAsyncKeyState` 加载失败则输出 `{available:$false}`。
- [ ] **Step 2: 渲染端降级**
  在 `src/input.js` 的 `onMusic`/`onKey` 回调中：`if (s && s.available === false){ /* 停用心智，HUD 一次性提示 */ Pet.state.music.available=false; }`。
- [ ] **Step 3: 验收**
  临时篡改 `music.ps1` 使 manager 加载失败 → 启动后团团不假死、HUD 提示「音乐感知不可用」。
- [ ] **Step 4: 提交（可选）**
  ```bash
  git add -A; git commit -m "feat: bridge availability reporting and graceful degradation"
  ```

---

## 自检（Self-Review）

**Spec 覆盖对照：**
- §3 清理 → Task 1、2 ✔
- §4 拆分 → Task 3–9 ✔（逐文件搬家 + 行为一致验收）
- §5 持久化 → Task 10、11 ✔
- §6 托盘/自启 → Task 12 ✔
- §7 真实节拍档1 → Task 13、14；档2 标注可选未做 ✔（文档已声明）
- §8 多屏 → Task 15 ✔
- §9 润色 → Task 16（音效）、Task 17（时间感知，可选）✔
- §10 健壮性 → Task 18、19 ✔

**占位符扫描：** 无 TBD/TODO；所有代码步骤含可复制片段或「原样搬运自 index.html 指定函数」的明确指引。

**类型一致性：** `Pet.env`/`Pet.state`/`Pet.config`/`Pet.util` 命名在 Task 3–19 全程一致；`desktopAPI` 新增方法（`getSettings/saveSettings/onSavePosition`）在 `preload.js` 定义、`src/*` 消费，签名匹配。

**范围：** 档 2（WASAPI）与时间感知默认关，均不阻塞主线，符合 spec 默认决策。
