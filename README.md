# 🗂️ FreeSpace — Smart Tab Space Manager

English | [中文](#中文)

![Last commit](https://img.shields.io/github/last-commit/shengdabai/freespace?style=flat-square)
![Stars](https://img.shields.io/github/stars/shengdabai/freespace?style=social)
![Follow @shengdabai](https://img.shields.io/github/followers/shengdabai?style=social)

> **Drowning in tabs?** One keystroke files every tab across every window into clean, searchable, auto-classified sessions — then frees your memory. Like OneTab, but it actually understands what your tabs are.

---

## Why FreeSpace

If you open tabs faster than you close them, your browser becomes a graveyard of half-read articles and "I'll get to it later" links. OneTab dumps them all into one flat list. FreeSpace does better: it **reads** each tab, **groups** it by what it is (code, docs, mail, video…), **warns** you before you lose unsaved work, and **remembers** every session so nothing is ever truly gone.

## What it does

Press **`Cmd/Ctrl + Shift + M`**. FreeSpace sweeps tabs from *all* windows, sorts them into meaningful groups, saves the session with a timestamp, and closes the clutter — with a 5-second undo if you change your mind.

## ✨ Features

- **Smart classification engine** — 35+ built-in domain rules (GitHub → Development, Gmail → Communication, YouTube → Entertainment…), per-domain sub-groups for unknown sites instead of a junk "Other" bucket, plus custom rules you can override and persist.
- **Keyword extraction** — strips noise like ` - GitHub`, `| Stack Overflow`, `(3) Gmail`, notification counts, and commit prefixes; Unicode-safe truncation that never breaks emoji or CJK characters.
- **Safety first** — `beforeunload` detection warns before closing tabs with unsaved form data, with a heuristic fallback for 12 known form-heavy sites (Google Docs, Notion, Figma, Trello…); audio-tab detection warns before closing anything playing media.
- **Multi-window support** — collects across every open window, with a window selector to view tabs per-window or all together.
- **Session history (OneTab style)** — every collection is saved as its own timestamped session in IndexedDB; browse them chronologically, reopen any session, delete what you don't need. Old sessions are never overwritten.
- **5-second undo** — restore every closed tab instantly, with a live countdown.
- **Polished UI** — light/dark theme, compact/comfortable density, real-time search across titles/URLs/keywords, one-click collapse/expand, per-group restore, and full **English / 中文** bilingual support with auto language detection.

## 🧱 Tech stack

- **Manifest V3** ES-module service worker (Chrome 116+, Firefox 109+)
- **IndexedDB** for unlimited session storage; `chrome.storage` for settings
- **`chrome.scripting`** for `beforeunload` detection (no debugging permission needed)
- **`chrome.alarms`** for service-worker keepalive
- **Pure vanilla JS** — zero frameworks, zero runtime dependencies
- **Vitest** — 10 passing unit tests

## 🚀 Install

### Load unpacked (Chrome / Edge)
1. `git clone https://github.com/shengdabai/freespace.git`
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top-right)
4. Click **Load unpacked** and select the `freespace` folder

### Load temporary (Firefox)
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json` inside the `freespace` folder

> **Browser stores:** a Chrome Web Store / Firefox Add-ons listing is planned. ⭐ Star the repo to get notified.

## 📖 Usage

1. **Collect** — click the FreeSpace toolbar icon, or press `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Win/Linux). All tabs are classified, saved, and closed; the dashboard opens automatically.
2. **Browse** — the left sidebar lists every saved session, newest first. Click one to see its tabs; use the window selector to filter by window.
3. **Restore** — restore a whole group with its button, restore everything via the 5-second Undo banner, or click any tab to reopen it.
4. **Search** — type to filter by title, URL, or keyword in real time.
5. **Settings** — the ⚙ gear icon shows storage usage, lets you clear data, or switch between English and 中文.

## 🗺️ Status

Active and usable today. On the roadmap:

- [ ] Chrome Web Store / Firefox Add-ons listing
- [ ] Export / import sessions (JSON)
- [ ] Drag-and-drop reordering between groups
- [ ] Keyboard navigation improvements
- [ ] Pinned-tab preservation
- [ ] Reading list and archive
- [ ] Tab-group color theming

Found a bug or have an idea? Open an [issue](../../issues) or a [pull request](../../pulls) — feedback is welcome.

## 🤝 About & connect

Built by **Tony (Sheng)** — a Chinese-language teacher with 6000+ students, building AI + Chinese-teaching tools in public.

If FreeSpace saves you from tab chaos, **⭐ star the repo** and **[follow @shengdabai](https://github.com/shengdabai)** to follow the build.

More browser tools from the same workshop:
- [teaching-notes-sidebar](https://github.com/shengdabai/teaching-notes-sidebar) — a sidebar for teaching notes
- [insidebar-ai](https://github.com/shengdabai/insidebar-ai) — AI in your browser sidebar
- [browser-extensions](https://github.com/shengdabai/browser-extensions) — more extensions in the works

## License

MIT.

---

<a name="中文"></a>

# 🗂️ FreeSpace — 智能标签空间管理

[English](#-freespace--smart-tab-space-manager) | 中文

![最近提交](https://img.shields.io/github/last-commit/shengdabai/freespace?style=flat-square)
![Stars](https://img.shields.io/github/stars/shengdabai/freespace?style=social)
![关注 @shengdabai](https://img.shields.io/github/followers/shengdabai?style=social)

> **被标签页淹没了？** 一个快捷键，把所有窗口里的标签页归类成干净、可搜索、自动分类的会话——顺手释放内存。像 OneTab，但它真的看得懂你开了什么。

---

## 为什么用 FreeSpace

如果你开标签页的速度永远快过关标签页，浏览器迟早变成"以后再看"链接的坟场。OneTab 只是把它们堆成一个扁平列表；FreeSpace 更进一步:它**读懂**每个标签、按类型**分组**(代码、文档、邮件、视频……)、在你丢失未保存内容前**提醒**你,并**记住**每一次会话,让任何东西都不会真正消失。

## 它做什么

按 **`Cmd/Ctrl + Shift + M`**。FreeSpace 会扫描*所有窗口*的标签页,分到有意义的组里,带时间戳保存为会话,然后关掉杂乱——反悔了还有 5 秒撤销。

## ✨ 功能

- **智能分类引擎** —— 35+ 内置域名规则(GitHub → 开发,Gmail → 通讯,YouTube → 娱乐……);未知站点按域名细分子组,而非一个垃圾"其他"桶;支持自定义规则覆盖并持久保存。
- **关键词摘要** —— 剥离 ` - GitHub`、`| Stack Overflow`、`(3) Gmail` 等噪音、通知数字与提交前缀;Unicode 安全截断,绝不破坏 emoji 或中日韩字符。
- **安全优先** —— `beforeunload` 检测在关闭含未保存表单的标签前提醒,并对 12 个常见表单密集站点(Google Docs、Notion、Figma、Trello……)启用启发式兜底;音频标签检测在关闭正在播放媒体的标签前提醒。
- **多窗口支持** —— 收集所有打开窗口的标签页,窗口选择器可按窗口或全部一起查看。
- **会话历史(OneTab 风格)** —— 每次收集都作为独立的带时间戳会话存入 IndexedDB;按时间浏览、重开任意会话、删除不需要的。旧会话永不被覆盖。
- **5 秒撤销** —— 带实时倒计时,一键恢复所有刚关闭的标签。
- **精致 UI** —— 浅色/深色主题、紧凑/舒适密度、对标题/URL/关键词的实时搜索、一键折叠展开、按组恢复,以及完整的**英文 / 中文**双语支持与自动语言检测。

## 🧱 技术栈

- **Manifest V3** ES 模块 service worker(Chrome 116+,Firefox 109+)
- **IndexedDB** 无限会话存储;`chrome.storage` 存设置
- **`chrome.scripting`** 实现 `beforeunload` 检测(无需调试权限)
- **`chrome.alarms`** 维持 service worker 存活
- **纯原生 JS** —— 零框架、零运行时依赖
- **Vitest** —— 10 个通过的单元测试

## 🚀 安装

### 加载已解压扩展(Chrome / Edge)
1. `git clone https://github.com/shengdabai/freespace.git`
2. 打开 `chrome://extensions/`
3. 启用右上角的**开发者模式**
4. 点击**加载已解压的扩展程序**,选择 `freespace` 文件夹

### 临时加载(Firefox)
1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击**临时加载附加组件**
3. 选择 `freespace` 文件夹内的 `manifest.json`

> **应用商店:** Chrome 应用商店 / Firefox 附加组件的上架正在计划中。⭐ Star 仓库即可第一时间收到通知。

## 📖 使用

1. **收集** —— 点击工具栏的 FreeSpace 图标,或按 `Cmd+Shift+M`(Mac)/ `Ctrl+Shift+M`(Win/Linux)。所有标签被分类、保存并关闭,仪表盘自动打开。
2. **浏览** —— 左侧边栏按时间(最新在前)列出所有会话。点击查看其标签;用窗口选择器按窗口筛选。
3. **恢复** —— 用按钮恢复整组,通过 5 秒撤销横幅恢复全部,或点击任意标签重新打开。
4. **搜索** —— 输入即可实时按标题、URL 或关键词筛选。
5. **设置** —— ⚙ 齿轮图标显示存储占用、清空数据,或在英文与中文间切换。

## 🗺️ 状态

今天即可使用。路线图:

- [ ] Chrome 应用商店 / Firefox 附加组件上架
- [ ] 会话导出 / 导入(JSON)
- [ ] 组间拖拽重排
- [ ] 键盘导航优化
- [ ] 固定标签保留
- [ ] 阅读列表与归档
- [ ] 标签组配色主题

发现 bug 或有想法?欢迎提 [issue](../../issues) 或 [PR](../../pulls)。

## 🤝 关于与联系

由 **Tony(盛)** 打造 —— 一位拥有 6000+ 学员的中文老师,在公开构建 AI + 中文教学工具。

如果 FreeSpace 帮你摆脱了标签混乱,请 **⭐ Star 本仓库** 并 **[关注 @shengdabai](https://github.com/shengdabai)**,一起见证后续构建。

同一工作坊的更多浏览器工具:
- [teaching-notes-sidebar](https://github.com/shengdabai/teaching-notes-sidebar) —— 教学笔记侧边栏
- [insidebar-ai](https://github.com/shengdabai/insidebar-ai) —— 浏览器侧边栏里的 AI
- [browser-extensions](https://github.com/shengdabai/browser-extensions) —— 更多扩展开发中

## 许可证

MIT。
