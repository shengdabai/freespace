# SmartTab — Product Design Document

> OneTab 一键合并 + Tab Out 智能分类 + 竖向排布 + 关键词摘要

## 1. Product Vision

**一句话描述**：点一下，所有标签页自动归类到竖向列表，每个标签带关键词摘要，再也不怕标签页混乱。

### 核心差异化

| 能力 | OneTab | Tab Out | SmartTab |
|------|--------|---------|----------|
| 一键合并所有标签 | ✓ | — | ✓ |
| 按域名/类目自动分组 | — | ✓ | ✓ |
| 每个标签关键词摘要 | — | — | ✓ |
| 竖向标签排布 | — | — | ✓ |
| 横向/竖向一键切换 | — | — | ✓ |

## 2. User Flow

```
用户打开浏览器，有 20+ 标签页混乱排列
  ↓
点击 SmartTab 图标（或快捷键）
  ↓
所有标签页被收集 → 浏览器只剩 1 个新标签页（SmartTab Dashboard）
  ↓
Dashboard 展示：
  - 竖向列表模式（默认）或横向卡片模式（可切换）
  - 按域名自动分组（GitHub、Stack Overflow、Gmail...）
  - 每个标签显示：favicon + 网站名 + 关键词摘要
  - 分组可折叠展开
  ↓
用户操作：
  - 点击标签 → 重新打开该页面
  - 点击分组标题 → 展开该组所有标签
  - 拖拽标签 → 跨组移动
  - 点击"Restore All" → 恢复所有标签页
  - 竖向/横向切换按钮 → 改变布局方向
```

## 3. Architecture

### 3.1 Tech Stack

- **Manifest V3** Chrome Extension
- **纯原生 JS**（零依赖，和 Tab Out 保持一致）
- **chrome.storage.local** 存储
- **无外部 API 调用**（关键词提取纯本地算法）

### 3.2 File Structure

```
smarttab/
├── manifest.json          # MV3 配置
├── background.js          # Service Worker：徽章、快捷键
├── newtab/
│   ├── index.html         # Dashboard 主页
│   ├── style.css          # 样式（暗色/亮色主题）
│   └── app.js             # 核心逻辑
├── popup/
│   ├── popup.html         # 点击图标的弹窗
│   └── popup.js           # 快速操作
├── lib/
│   ├── classifier.js      # 域名/类目分类引擎
│   ├── summarizer.js      # 标题→关键词提取
│   ├── storage.js         # chrome.storage 封装
│   └── layout.js          # 竖向/横向布局引擎
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── assets/
    └── sounds/            # Web Audio API 生成的音效
```

### 3.3 Core Modules

#### Module 1: Tab Collector（来自 OneTab）

```javascript
// 收集当前窗口所有标签页
async function collectAllTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const session = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    groups: [],  // 由 Classifier 填充
    rawTabs: tabs.map(t => ({
      id: t.id,
      url: t.url,
      title: t.title,
      favIconUrl: t.favIconUrl,
      pinned: t.pinned
    }))
  };

  // 关闭所有非固定标签
  const toClose = tabs.filter(t => !t.pinned).map(t => t.id);
  await chrome.tabs.remove(toClose);

  // 打开 SmartTab Dashboard
  await chrome.tabs.create({ url: chrome.runtime.getURL('newtab/index.html') });

  return session;
}
```

#### Module 2: Smart Classifier（来自 Tab Out，增强版）

```javascript
// 分类规则（继承 Tab Out + 增强）
const DOMAIN_RULES = {
  // 开发工具类
  'github.com': { category: 'Development', icon: '🐙' },
  'gitlab.com': { category: 'Development', icon: '🦊' },
  'stackoverflow.com': { category: 'Development', icon: '📚' },
  'developer.mozilla.org': { category: 'Development', icon: '📖' },

  // 通讯类
  'mail.google.com': { category: 'Communication', icon: '📧' },
  'outlook.live.com': { category: 'Communication', icon: '📨' },
  'slack.com': { category: 'Communication', icon: '💬' },
  'discord.com': { category: 'Communication', icon: '🎮' },

  // 社交媒体
  'x.com': { category: 'Social', icon: '🐦' },
  'twitter.com': { category: 'Social', icon: '🐦' },
  'linkedin.com': { category: 'Social', icon: '💼' },
  'reddit.com': { category: 'Social', icon: '🤖' },

  // AI 工具
  'chatgpt.com': { category: 'AI Tools', icon: '🤖' },
  'claude.ai': { category: 'AI Tools', icon: '🧠' },
  'gemini.google.com': { category: 'AI Tools', icon: '💎' },

  // 文档/笔记
  'notion.so': { category: 'Documents', icon: '📝' },
  'docs.google.com': { category: 'Documents', icon: '📄' },
  'figma.com': { category: 'Design', icon: '🎨' },
};

function classifyTabs(tabs) {
  const groups = {};

  for (const tab of tabs) {
    const url = new URL(tab.url);
    const hostname = url.hostname.replace('www.', '');
    const rule = DOMAIN_RULES[hostname];

    const groupKey = rule ? rule.category : extractRootDomain(hostname);
    const groupIcon = rule ? rule.icon : '🌐';

    if (!groups[groupKey]) {
      groups[groupKey] = {
        name: groupKey,
        icon: groupIcon,
        domain: hostname,
        tabs: []
      };
    }

    groups[groupKey].tabs.push({
      ...tab,
      keyword: extractKeyword(tab.title),  // 关键词摘要
    });
  }

  return Object.values(groups).sort((a, b) => b.tabs.length - a.tabs.length);
}
```

#### Module 3: Keyword Summarizer（全新）

```javascript
/**
 * 从页面标题中提取核心关键词/摘要
 * 纯本地算法，不调用任何 API
 *
 * 策略：
 * 1. 去除通用后缀（- GitHub, | Stack Overflow 等）
 * 2. 提取核心动词+名词组合
 * 3. 截取前 6 个词作为摘要
 */
function extractKeyword(title) {
  if (!title) return '';

  // 1. 去除网站后缀
  let cleaned = title
    .replace(/\s*[-–|·—]\s*(GitHub|Stack Overflow|Google|YouTube|Reddit|Twitter|X|LinkedIn|Gmail|ChatGPT|Claude|Figma|Notion).*$/i, '')
    .replace(/\s*[-–|·—]\s*Mozilla Developer.*$/i, '')
    .replace(/\s*\(\d+\)\s*/, '')  // 去通知数字
    .replace(/\s*·\s*\d+ min read$/i, '')
    .trim();

  // 2. 如果是 PR/Issue，提取编号和标题
  const prMatch = cleaned.match(/^(feat|fix|docs|chore|refactor|test|perf|build|ci)(\([^)]*\))?:\s*(.+)/i);
  if (prMatch) {
    return `${prMatch[1]}${prMatch[2] || ''}: ${truncate(prMatch[3], 40)}`;
  }

  // 3. 通用截取
  return truncate(cleaned, 50);
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}
```

#### Module 4: Vertical Layout Engine（全新）

```javascript
/**
 * 竖向标签排布引擎
 * 默认竖向，可一键切换横向
 */
const LayoutEngine = {
  current: 'vertical',  // 'vertical' | 'horizontal'

  toggle() {
    this.current = this.current === 'vertical' ? 'horizontal' : 'vertical';
    this.render();
    Storage.saveSetting('layout', this.current);
  },

  render() {
    const container = document.getElementById('tab-container');
    container.className = `layout-${this.current}`;

    if (this.current === 'vertical') {
      // 竖向：每行一个标签，左侧 favicon + 右侧标题
      // 优点：不会误触关闭标签，所有标题完整显示
      container.querySelectorAll('.tab-item').forEach(item => {
        item.style.display = 'flex';
        item.style.flexDirection = 'row';
        item.style.alignItems = 'center';
        item.style.padding = '8px 12px';
        item.style.width = '100%';
        item.style.borderBottom = '1px solid var(--border)';
      });
    } else {
      // 横向：卡片网格布局
      container.style.display = 'grid';
      container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
      container.style.gap = '12px';
    }
  }
};
```

### 3.4 Data Schema

```javascript
// chrome.storage.local 中的数据结构
{
  // 当前会话
  "currentSession": {
    "id": 1713158400000,
    "createdAt": "2026-04-15T08:00:00Z",
    "groups": [
      {
        "name": "Development",
        "icon": "🐙",
        "collapsed": false,
        "tabs": [
          {
            "url": "https://github.com/user/repo/pull/42",
            "title": "feat: add auth module by @dev — Pull Request #42",
            "keyword": "feat: add auth module",
            "favIconUrl": "https://github.githubassets.com/favicons/favicon.svg",
            "pinned": false,
            "closedAt": "2026-04-15T08:00:00Z"
          }
        ]
      }
    ]
  },

  // 历史会话
  "sessions": [
    { /* 同 currentSession 结构 */ }
  ],

  // 稍后阅读（来自 Tab Out）
  "readingList": [
    {
      "url": "...",
      "title": "...",
      "keyword": "...",
      "savedAt": "..."
    }
  ],

  // 用户设置
  "settings": {
    "layout": "vertical",       // vertical | horizontal
    "theme": "auto",            // light | dark | auto
    "soundEnabled": true,
    "closeDuplicates": false
  }
}
```

## 4. UI Design

### 4.1 Dashboard Layout（竖向模式 — 默认）

```
┌──────────────────────────────────────────────────┐
│  SmartTab                    📐 VH ⚙️ 🌙         │
│                                                  │
│  ═══ Today 3:45 PM — 24 tabs collapsed ═══      │
│                                                  │
│  ▼ 🐙 Development (5 tabs)                      │
│  ├── 🟢 feat: add auth module                   │
│  ├── 🟢 fix: memory leak in parser              │
│  ├── 🟢 refactor: extract utils                 │
│  ├── 📚 React hooks guide                       │
│  └── 📖 MDN: Array.prototype.reduce             │
│                                                  │
│  ▼ 📧 Communication (3 tabs)                    │
│  ├── 🔵 Gmail — 3 unread                        │
│  ├── 💬 Slack — #general                         │
│  └── 📨 Outlook — Q4 report                     │
│                                                  │
│  ► 🧠 AI Tools (2 tabs)                         │
│  ► 🌐 Other (14 tabs)                           │
│                                                  │
│  ─────────────────────────────────────────────── │
│  📑 Reading List (3) │ 📦 Archived (12)         │
│                                                  │
│  [Restore All]  [Save Session]  [Export]         │
└──────────────────────────────────────────────────┘
```

### 4.2 Dashboard Layout（横向模式）

```
┌──────────────────────────────────────────────────┐
│  SmartTab                    📐 VH ⚙️ 🌙         │
│                                                  │
│  🐙 Development (5)                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │feat:auth│ │fix:leak │ │refactor │            │
│  │ module  │ │ parser  │ │ utils   │            │
│  └─────────┘ └─────────┘ └─────────┘            │
│  📧 Communication (3)                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │ Gmail   │ │ Slack   │ │Outlook  │            │
│  └─────────┘ └─────────┘ └─────────┘            │
│                                                  │
│  [Restore All]  [Save Session]  [Export]         │
└──────────────────────────────────────────────────┘
```

### 4.3 Color Scheme

继承 Tab Out 的暖色设计 + SmartTab 自己的 accent：

```css
:root {
  /* 基础色 */
  --bg-primary: #1a1613;     /* 深墨色 */
  --bg-secondary: #f8f5f0;   /* 纸色 */
  --accent: #c8713a;          /* 琥珀色 */
  --sage: #5a7a62;            /* 鼠尾草绿 */

  /* 分组色 */
  --dev-blue: #2563eb;
  --comm-blue: #0ea5e9;
  --social-purple: #9333ea;
  --ai-teal: #14b8a6;
  --doc-green: #16a34a;
  --other-gray: #6b7280;

  /* 布局 */
  --tab-height: 40px;        /* 竖向模式每行高度 */
  --group-gap: 16px;
  --tab-padding: 8px 12px;
}
```

## 5. Key Interactions

### 5.1 一键合并流程

1. 用户点击图标 → `background.js` 触发
2. `chrome.tabs.query({ currentWindow: true })` 获取所有标签
3. `classifier.js` 按域名分类
4. `summarizer.js` 为每个标签生成关键词
5. `storage.js` 保存会话
6. `chrome.tabs.remove()` 关闭所有非固定标签
7. `chrome.tabs.create()` 打开 SmartTab Dashboard
8. Dashboard 从 storage 读取数据并渲染

### 5.2 竖向/横向切换

- 默认竖向：每行一个标签，favicon 在左，标题+关键词在右
- 点击切换按钮：CSS class 切换，grid → list / list → grid
- 偏好保存到 storage

### 5.3 恢复标签

- 点击单个标签：`chrome.tabs.create({ url })`
- "Restore All"：遍历所有分组中的标签，批量创建
- "Restore Group"：只恢复该分组的标签

### 5.4 稍后阅读（来自 Tab Out）

- 右键菜单 "Save for Later"
- Dashboard 底部展示 Reading List
- 勾选完成 → 移入 Archive

## 6. Implementation Plan

### Phase 1: MVP（基于 Tab Out 改造）
- [ ] Fork tab-out 仓库
- [ ] 添加"一键合并"功能（Tab Collector）
- [ ] 添加竖向布局引擎
- [ ] 添加 V/H 切换按钮
- [ ] 增强分类规则（更多域名映射）

### Phase 2: 关键词摘要
- [ ] 实现 summarizer.js
- [ ] Dashboard 展示关键词
- [ ] 优化标题清理算法

### Phase 3: 会话管理（来自 OneTab）
- [ ] Session 保存/恢复
- [ ] 历史会话列表
- [ ] 导入/导出 JSON

### Phase 4: 打磨
- [ ] 暗色/亮色主题
- [ ] 关闭动画/音效（继承 Tab Out）
- [ ] 拖拽排序
- [ ] Chrome Web Store 发布

## 7. Technical Constraints

- **Manifest V3**：service worker，无 background page
- **无外部 API**：关键词提取纯本地，保护隐私
- **纯 JS**：不引入 React/Vue，保持轻量
- **兼容性**：Chrome 116+（MV3 要求）
- **存储限制**：chrome.storage.local 上限 10MB

## 8. Files on Desktop

设计文件已输出到 `~/Desktop/tab-merge-design/`：
- `feature-comparison.svg/.png` — 功能对比矩阵
- `smarttab-architecture.svg/.png` — 产品架构图
- `SMARTTAB-DESIGN.md` — 本文档

---

## 9. CEO Review Report (/plan-ceo-review)

### Completion Summary

```
+====================================================================+
|            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
+====================================================================+
| Mode selected        | SELECTIVE EXPANSION                         |
| System Audit         | Greenfield project, no existing codebase    |
| Step 0               | Key insight: Chrome 146+ native vertical   |
|                      | tabs invalidates "竖向排布" differentiation|
|                      | Approach C: Tab Out UI + OneTab logic       |
|                      | 6/6 scope expansions accepted               |
| Section 1  (Arch)    | 1 issue found (close-before-save race)     |
| Section 2  (Errors)  | 5 GAPS in error handling                   |
| Section 3  (Security)| 0 High severity, AI API key storage note   |
| Section 4  (Data/UX) | 3 edge cases unhandled                     |
| Section 5  (Quality) | Modular design OK, watch coupling with app |
| Section 6  (Tests)   | 7 UX flows + 2 data flows to test          |
| Section 7  (Perf)    | 500+ tab scale needs virtual scrolling      |
| Section 8  (Observ)  | Chrome Extension, no server observability   |
| Section 9  (Deploy)  | Chrome Web Store review risk (permissions)  |
| Section 10 (Future)  | Reversibility: 4/5, low tech debt          |
| Section 11 (Design)  | Empty/error states missing from wireframes  |
+--------------------------------------------------------------------+
| Scope proposals      | 6 proposed, 6 accepted, 0 deferred         |
| CEO plan             | Written to gstack projects dir              |
| Spec review          | 4.8/10 → fixed to address all criticals    |
| Diagrams produced    | System architecture, data flow 4-path       |
| Unresolved decisions | 0                                          |
+====================================================================+
```

### Key Decisions

1. **Chrome 146+ impact**: "竖向排布" 不再是核心差异化，降级为 nice-to-have
2. **Approach C**: 保留 Tab Out UI shell，注入 OneTab 逻辑（最快出活）
3. **Phasing**: v1 (MVP: 合并+分类+摘要+搜索) → v2 (Side Panel+Tab Group+导出) → v3 (AI 摘要)
4. **全 6 扩展纳入**: 搜索、Side Panel、Tab Group 同步、Markdown 导出、重复合并、AI 摘要

### Critical Gaps (实现时必须修复)

| # | Gap | Location | Fix |
|---|-----|----------|-----|
| 1 | collectAllTabs 操作顺序 | Module 1 | 先 save 再 close，或用 pending 标记 |
| 2 | Permission denied 处理 | collectAllTabs() | 检测 chrome.runtime.lastError，显示 re-auth UI |
| 3 | Invalid URL 崩溃 | classifyTabs() | 过滤 chrome://, about:, extension:// 等 URL |
| 4 | Storage quota 超限 | storage.js | 检测 quota，提示清理或启用 unlimitedStorage |
| 5 | Side Panel 降级 | v2 | 检测 API 是否可用，不可用则 fallback to new tab |

### Action Items for Implementation

1. 补充空状态和错误状态的 UI 线框图
2. 500+ 标签性能测试（虚拟滚动）
3. Chrome Web Store 权限说明文案准备
4. AI 摘要增强的隐私政策（v3 前必须完成）
