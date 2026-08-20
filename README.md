# 团团 · 桌面宠物

一个基于 Electron 的 Windows 桌面宠物：一颗会呼吸、会互动、还会跟着音乐摆动的大圆球。

## 功能

- 透明无边框、始终置顶，不占任务栏
- 鼠标穿透 + 悬停检测：平时不挡操作，靠近时才互动
- 单击跳一下、连续戳 3 下会晕眩、双击追着你跑
- 按住拖动可以把它甩飞
- 鼠标在它身上来回划 = 抚摸
- 右键打开设置菜单：定家 / 回家、调整大小、切换配色、退出
- 拖到喜欢的位置后点「定家」，点「回家」它会自己爬回去
- 闲置时自主行动：打哈欠、伸懒腰、打喷嚏、打滚、躲猫猫、走两步
- 音乐感知：读取 Windows 当前媒体播放状态，播放音乐时切换表情、飘音符
- 单实例运行：重复启动只会聚焦已有窗口

## 环境要求

- Windows 10 / 11
- Node.js 18+ 和 npm

## 快速开始

```powershell
git clone https://github.com/StrangeHamburger/Round-table-pet.git
cd Round-table-pet
npm install
npm start
```

也可以直接在本地目录运行：

```powershell
cd C:\Users\hbg20\桌宠
npm install
npm start
```

## 操作说明

- 单击：跳一下
- 连续戳 3 下：晕眩
- 双击：追着你跑
- 按住并拖动：甩飞
- 鼠标来回划：抚摸
- 右键：打开设置菜单
- `Esc`：关闭设置菜单
- 设置菜单里的「退出」：结束程序

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm start` | 启动桌宠 |
| `powershell -ExecutionPolicy Bypass -File .\create-shortcut.ps1` | 在桌面创建「团团」快捷方式 |
| `node make-icon.js` | 生成图标文件 |

> 快捷方式脚本默认使用 `C:\Users\hbg20\桌宠` 路径；如果项目移动了位置，请先修改 `create-shortcut.ps1` 中的路径。

## 技术栈

- Electron 33
- 原生 HTML / Canvas / JavaScript
- PowerShell 桥接 Windows GSMTC 媒体信息

## 版本

- `v1.0.0`：首个可用版本
