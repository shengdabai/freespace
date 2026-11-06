# FreeSpace — 智能标签空间管理

[![MIT 许可证](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome 扩展](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://developer.chrome.com/docs/extensions/)
[![Firefox](https://img.shields.io/badge/Firefox-Add--on-orange.svg)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons)
[🇬🇧 English](README.md)

> 一键整理所有标签页，自动分类、关键词摘要、多窗口纵向查看、会话历史回溯。

[🇬 English](README.md) | [🇨🇳 中文版](README_zh.md)

---

**FreeSpace** 是一款浏览器扩展，将你混乱的标签页转换为整洁、可搜索的会话。灵感来自 OneTab，但更智能——自动按域名分类、提取关键词、未保存表单警告，完整保留会话历史。

---

## ✨ 功能特性

### 智能分类引擎
- **35+ 预置域名规则** — GitHub 归入开发类，Gmail 归入通讯类，YouTube 归入娱乐类等
- **未知域名按域名拆分** — 不再有杂乱无章的"其他"桶，每个标签都有明确的分组
- **自定义规则** — 在设置面板中覆盖任意分类，偏好永久保存

### 关键词提取
- 自动去除噪音后缀：` - GitHub`、`| Stack Overflow`、`(3) Gmail`
- 清除通知数字和 Git 提交前缀
- Unicode 安全截断 — emoji 和中文字符不会损坏

### 安全保护
- **Beforeunload 检测** — 注入轻量脚本检测未保存的表单数据，关闭前有未保存内容的标签页时会警告
- **域名启发式回退** — 12 个已知表单密集站点（Google Docs、Notion、Figma、Trello 等）即使脚本注入失败也会触发警告
- **音频标签页警告** — 检测正在播放音乐/视频的标签页，关闭前显示通知

### 多窗口支持
- 收集**所有浏览器窗口**中的标签页，不只是当前窗口
- 窗口选择器可按窗口查看或显示全部
- 每个窗口区域有独立标题栏，显示标签数量

### 会话历史（OneTab 风格）
- 每次收集保存为**独立会话**，带时间戳存入 IndexedDB
- 左侧栏按时间顺序显示所有会话（最新在前），含日期、标签数、窗口数、分组预览
- 点击任意会话查看其标签页 — 旧会话不会被覆盖
- 可删除不再需要的历史会话

### 5 秒撤销
- 收集后 5 秒内可一键恢复所有关闭的标签页
- 倒计时显示剩余秒数

### 界面功能
- **亮色/暗色主题** 平滑切换
- **紧凑/舒适** 两种显示密度
- **实时搜索** 标题、URL、关键词（150ms 防抖）
- **一键折叠/展开** 所有分组
- **单独恢复** 任意分组中的标签页
- **双语界面** — 英文（默认）和中文，自动检测浏览器语言，可在设置中切换

---

## 🚀 安装

### 从源码安装

1. **克隆仓库**
   ```bash
   git clone https://github.com/shengdabai/freespace.git
   cd freespace
   ```

2. **在 Chrome 中加载**
   - 打开 `chrome://extensions/`
   - 开启右上角的**开发者模式**
   - 点击**加载已解压的扩展程序**
   - 选择 `freespace` 文件夹

3. **在 Firefox 中加载**
   - 打开 `about:debugging#/runtime/this-firefox`
   - 点击**临时加载附加组件**
   - 选择 `freespace/manifest.json`

### 从 Chrome 网上应用店
> 即将上线 — 目前仅支持本地安装。

---

## 📖 使用方法

### 收集标签页
1. 点击浏览器工具栏中的 **FreeSpace 图标**（Mac 上也可按 `Cmd+Shift+M`，Windows/Linux 按 `Ctrl+Shift+M`）
2. 所有窗口中的所有标签页被收集、分类、保存为会话
3. 标签页关闭后自动打开 FreeSpace 仪表盘

### 浏览标签页
- **左侧栏**显示所有已保存的会话，按时间排序（最新在前）
- 点击任意会话，在右侧查看其标签页
- 如果收集时打开了多个窗口，顶部有**窗口选择器**，可筛选查看特定窗口或全部

### 恢复标签页
- **恢复一组**：每个分组卡片底部有"恢复此组"按钮
- **全部恢复**：点击横幅中的**撤回**按钮（收集后 5 秒内有效）
- **打开单个标签**：点击任意标签行即可在新标签页中打开

### 搜索
- 在搜索框中输入关键词，按标题、URL 或关键词过滤
- 输入时实时更新搜索结果

### 设置
- 点击工具栏右侧的 **⚙ 齿轮图标**打开设置
- 查看存储用量、清除所有数据，或在**English / 中文**之间切换语言

---

## 🏗 架构

```
freespace/
├── manifest.json          # Manifest V3，双语元数据
├── background.js          # 服务工作线程：标签收集、安全检查、多窗口分组
├── dashboard/
│   ├── index.html         # 主仪表盘 UI（侧边栏 + 工作区）
│   ├── style.css          # 亮/暗主题、响应式、密度模式
│   └── app.js             # 会话列表、多窗口显示、搜索、国际化
├── lib/
│   ├── i18n.js            # 英中翻译引擎
│   ├── classifier.js      # 35+ 域名规则 + 自定义覆盖
│   ├── summarizer.js      # 关键词提取、噪音去除
│   ├── storage.js         # IndexedDB（会话）+ chrome.storage（设置）
│   ├── layout.js          # 虚拟滚动、密度管理
│   ├── undo.js            # 5 秒撤销窗口
│   └── utils.js           # 域名提取、Unicode 安全截断
├── _locales/
│   ├── en/messages.json   # 英文扩展元数据
│   └── zh/messages.json   # 中文扩展元数据
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── tests/
    ├── classifier.test.js
    └── summarizer.test.js
```

### 技术栈
- **Manifest V3** — ES 模块服务工作线程
- **IndexedDB** — 无限会话存储
- **chrome.scripting** — 无需调试权限的 beforeunload 检测
- **chrome.alarms** — 服务工作线程保活
- **纯原生 JS** — 无框架、无依赖
- **Vitest** — 10 个全部通过的单元测试

---

## 🤝 贡献

项目仍在开发中，欢迎反馈、bug 报告、功能请求和 Pull Request。

**计划中的改进：**
- [ ] Chrome 网上应用店上架
- [ ] 会话数据导出/导入（JSON）
- [ ] 拖拽调整标签页分组
- [ ] 键盘导航改进
- [ ] 固定标签页保留
- [ ] 阅读列表和归档功能
- [ ] 标签分组颜色主题

**发现 bug 或有想法？**
- 提交 [Issue](../../issues)
- 提交 [Pull Request](../../pulls)
- 在任何 open issue 下留言讨论

---

## 📄 许可证

MIT 许可证 — 详见 LICENSE 文件。

---

> 为打开太多标签页的人，用心打造。🫡
