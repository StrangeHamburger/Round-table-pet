# 团团桌面宠物 · 升级设计方案

- 日期：2026-08-21
- 范围：体验/功能升级 + 代码架构整理 + 稳定性/健壮性（用户选定「全部」）
- 路线：方案 A —— 零构建、保持原生 HTML/Canvas/JS，仅做文件拆分与增量功能

## 1. 现状与问题

项目是基于 Electron 33 的 Windows 桌面宠物「团团」，技术栈为原生 HTML/Canvas/JS + PowerShell 桥接（GSMTC 媒体信息、键盘状态）。

已确认的问题：

1. **死代码**：`main.js` 加载的是 `index.html`（完整高级版），但仓库里另有一份 `pet.html` —— 旧版、未接入任何 IPC 桥接，属于遗留重复文件，造成混淆。
2. **设置不持久**：配色、大小、定家位置、窗口位置在每次启动后全部重置，无保存/恢复。
3. **无系统托盘**：退出只能靠右键菜单的「退出」，无法隐藏/显示或常驻托盘。
4. **无开机自启**：当前无 `LoginItem` 配置。
5. **音乐律动是「假」的**：`music.ps1` 仅上报 `playing/title/artist`，跳舞靠固定周期动画，不跟随真实声音。
6. **单屏限制**：透明窗口只覆盖主显示器 workArea，宠物无法漫游到其他屏幕。
7. **巨石文件**：`index.html` 内嵌约 1360 行 `<script>`，难以维护。
8. **桥接健壮性**：`music.ps1`/`keyboard.ps1` 子进程意外退出时，`main.js` 的 `on('exit')` 只置空不重启；WinRT 不可用时不上报可用性，渲染端无从降级。

## 2. 架构路线

保持「无框架、无打包」现状，采用方案 A：把 `index.html` 的脚本拆成按依赖顺序加载的多个 `<script>`，共用一个 `window.Pet` 命名空间（避免 `<script type=module>` 在 `file://` 下的潜在 CORS 问题）。不引入构建工具与运行时依赖。

### 2.1 文件结构（目标）

```
main.js             主进程（窗口/单实例/托盘/自启/桥接/设置）
preload.js          上下文桥（desktopAPI 扩展）
index.html          渲染进程（DOM + 按顺序 <script>）
src/config.js       PALETTES / BEHAVIORS / 常量 / MOOD 表
src/state.js        pet 状态、excite、music、运行时设置
src/input.js        光标/音乐/键盘 IPC 接线 + 交互（点击/拖拽/抚摸/菜单）
src/behaviors.js    updateBehavior/Mood/Look/Open/Dance + specialPhysics
src/physics.js      updatePhysics / updatePetting
src/render.js       全部 draw* 绘制函数
src/app.js          启动引导 + loop 主循环
music.ps1          音乐桥接（增强：换曲检测 + 可选音量包络）
keyboard.ps1       键盘桥接（增强：可用性上报）
README.md           修正与补充分档
```

> 删除 `pet.html`（死代码）。

## 3. 项目清理（Phase 0，零风险先行）

- 删除 `pet.html`。
- 修正 `README.md`：
  - 实际渲染入口是 `index.html`（非 README 含糊描述的 `index.html 渲染进程`）。
  - 文件清单更新为上述结构。
  - 新增「系统托盘 / 开机自启 / 设置持久化 / 多屏漫游」章节。
  - 标注音乐律动在档 1 下为「换曲感知」，档 2 下为「真实音量驱动」。

## 4. 代码拆分（Phase 1）

将 `index.html` 现有脚本逻辑按 §2.1 迁移，规则：

- 所有跨文件共享状态挂在 `window.Pet`（如 `Pet.state`、`Pet.config`、`Pet.input`）。
- `index.html` 的 `<head>` 保留样式，`<body>` 保留 `<canvas>` 与菜单 DOM，底部按 `config → state → render → behaviors → physics → input → app` 顺序引入脚本。
- 不修改任何动画/物理算法本身，仅搬家，保证行为完全一致（验收基线）。
- 拆分后 `npm start` 应与原版视觉/交互无任何差异。

## 5. 设置持久化（Phase 2，核心痛点）

### 5.1 存储
- `main.js` 新增 `loadSettings()` / `saveSettings(obj)`，读写 `path.join(app.getPath('userData'), 'settings.json')`。
- 字段：`bodyColor`、`eyeColor`、`size`、`homeX`（屏幕坐标）、`lastX`、`lastY`、`autoStart`、`sound`。
- `preload.js` 暴露 `getSettings()`（invoke）与 `saveSettings(obj)`（send，主进程防抖落盘，约 300ms）。

### 5.2 渲染端
- 启动即 `getSettings()` 并应用（配色、大小、定家、初始位置）。
- 换配色 / 调大小 / 定家 / 拖动松手后调用 `saveSettings`（防抖）。
- `main.js` 监听 `before-quit`：把当前 `pet.x/pet.y` 经 `desktopAPI` 上报并保存到 `lastX/lastY`；`createWindow` 时若有 `lastX/lastY` 则据此初始化位置。

## 6. 生命周期：系统托盘 + 开机自启（Phase 3）

### 6.1 托盘
- `main.js` 用现有 `icon.png` 建 `Tray`，右键菜单：`显示窗口` / `隐藏窗口` / `退出`。
- 「隐藏窗口」= `win.hide()`（同时 `setIgnoreMouseEvents(false)` 以免误触）；「显示窗口」= `win.show()` + 恢复穿透。

### 6.2 自启
- 使用官方 `app.setLoginItemSettings({ openAtLogin: autoStart, path: process.execPath })`（仅打包后生效）。
- `autoStart` 取自设置；托盘或渲染端设置菜单可切换并即时 `saveSettings` + 重新 `setLoginItemSettings`。

## 7. 真实节拍律动（Phase 4，亮点）

### 7.1 档 1（必做，低成本）
- `music.ps1` 在 `Get-State` 中额外输出 `trackId = title + '|' + artist` 与 `playbackRate`。
- 渲染端维护 `lastTrackId`：变化时重置 `dance.style` 并触发一次「新歌」特效（音符更密 / 小跳）。
- `playbackRate` 用于微调 `danceOffset` 与 `drawBeatRings` 的周期。

### 7.2 档 2（可选延伸，较重）
- `music.ps1` 增加 WASAPI 回环（`AudioGraph` loopback）采样系统音量 RMS，按 ~50ms 输出 `level`（0–1）。
- 渲染端用 `level` 实时驱动身体 `squish` 强度与 `drawNotes` 密度，实现真正「跟着声音跳」。
- 风险：PowerShell 中 `Windows.Media.Audio` 回环捕获代码量大、不同 Windows 版本兼容性需实测；因此列为**可选**，默认不实现，文档注明扩展点。

## 8. 多屏漫游（Phase 5）

- `createWindow` 时计算所有 `screen.getAllDisplays()` workArea 的并集作为窗口矩形（仍 `transparent/frame:false/movable:false/resizable:false`），窗口原点记为 `(originX, originY)`。
- `floorY`、左右墙边界按并集计算。
- 光标轮询：`desktopAPI.onCursor` 收到屏幕 DIP 坐标后减去 `(originX, originY)` 再给渲染端。
- 效果：宠物可在多屏间走动、被甩飞、回家，定家坐标存为屏幕绝对坐标。

## 9. 润色（Phase 6，轻量）

- **音效**：渲染端用 `AudioContext` 在「被点/被戳晕/被拍头」时发一声极短 blip；受 `sound` 设置开关控制，默认开。
- **时间感知（可选）**：根据本地小时判断——夜间（22:00–07:00）自主行为偏向犯困/睡觉、律动减弱；白天更活跃。默认关，设置可开。

## 10. 健壮性（贯穿各 Phase）

- **桥接重启**：`main.js` 桥接子进程 `on('exit')` 时，若应用仍在运行则延时重启该桥接（避免一次崩溃后永久失效）。
- **可用性上报**：`music.ps1`/`keyboard.ps1` 在 WinRT / API 不可用时输出 `{available:false}`；`preload` 透传；渲染端在 `available:false` 时静默降级（音乐/打字感知停用）并在 HUD 给一次性提示，不再假死或空转。
- **错误边界**：`app.whenReady` 与桥接启动用 try/catch 包裹，单点失败不影响窗口。

## 11. 验收标准

无自动化测试框架，以手动验收 + 语法检查为准：

1. `node -c` 对 `main.js`、`preload.js`、`src/*.js`、`music.ps1`/`keyboard.ps1` 做语法/可解析检查（PowerShell 用 `powershell -NoProfile -Command "Get-Command"` 或 `$null=...` 解析）。
2. `npm start` 启动后 DevTools/控制台无报错。
3. 逐条验收：
   - 持久化：改配色/大小/定家/拖动后退出再启动，状态保持。
   - 托盘：隐藏/显示/退出正常。
   - 自启：开启后在下次登录自动启动（或在 `Task Manager > Startup` 可见）。
   - 多屏：在双屏间甩飞/走动/回家正常，坐标正确。
   - 音乐：播放时律动；档 1 换曲有重置特效。
   - 设置菜单（右键）所有按钮正常；拆分后与原版交互无任何差异。

## 12. 风险与权衡

- 拆分不改变算法，风险低；主要风险在托盘图标资源、WASAPI 兼容性、多屏坐标换算。
- 坚持零构建，避免引入打包/框架带来的回归风险。
- 档 2 与多屏 `AudioGraph` 相关部分均标注为可选，不阻塞主线。

## 13. 默认决策（待用户确认）

- 路线 A：确认。
- 真实节拍：先做档 1，档 2 列为可选延伸。
- 时间感知：作为轻量可选特性纳入（默认关）。
