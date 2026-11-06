# FreeSpace — Smart Tab Space Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://developer.chrome.com/docs/extensions/)
[![Firefox](https://img.shields.io/badge/Firefox-Add--on-orange.svg)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons)
[🇨🇳 中文版](README_zh.md)

> One-click tab organization for people who open too many tabs and never close them.

[🇬🇧 English](README.md) | [🇨 中文版](README_zh.md)

**FreeSpace** is a browser extension that transforms your chaotic tab overload into clean, categorized, searchable sessions. Inspired by OneTab but smarter — it auto-classifies tabs by domain, extracts keywords, warns about unsaved forms, and keeps full session history.

---

## ✨ Features

### Smart Classification Engine
- **35+ pre-built domain rules** — GitHub tabs go to Development, Gmail to Communication, YouTube to Entertainment, etc.
- **Per-domain sub-groups** for unknown sites — no more junk "Other" bucket. Every tab gets its own meaningful group.
- **Custom rules** — override any classification through the settings panel. Your preferences persist across sessions.

### Keyword Extraction
- Strips noisy suffixes like ` - GitHub`, `| Stack Overflow`, `(3) Gmail`
- Removes notification numbers and commit message prefixes
- Unicode-safe truncation — no broken emoji or CJK characters

### Safety First
- **Beforeunload detection** — injects a lightweight script to detect unsaved form data. Warns before closing tabs with pending edits.
- **Domain heuristic fallback** — 12 known form-heavy sites (Google Docs, Notion, Figma, Trello, etc.) always trigger warnings even if script injection fails.
- **Audio tab warning** — detects tabs playing music/video and shows a notification before closing.

### Multi-Window Support
- Collects tabs from **all open browser windows**, not just the active one.
- Window selector lets you view tabs per-window or all together.
- Each window section is clearly separated with a header showing tab count.

### Session History (OneTab Style)
- Every collection is saved as a **separate session** with timestamp in IndexedDB.
- Left sidebar shows all sessions chronologically with date, tab count, window count, and group preview.
- Click any session to view its tabs — old sessions are never overwritten.
- Delete individual sessions you no longer need.

### 5-Second Undo
- After collecting, a 5-second undo window lets you restore all closed tabs instantly.
- Countdown timer shows remaining seconds.

### UI Features
- **Light/Dark theme** with smooth transition
- **Compact/Comfortable density** modes
- **Real-time search** across titles, URLs, and keywords (150ms debounce)
- **Collapse/Expand** all groups with one click
- **Restore** any group's tabs individually
- **Bilingual** — English (default) and 中文. Auto-detects browser language, switchable in settings.

---

## 🚀 Installation

### From Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/TonySheng1998/freespace.git
   cd freespace
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select the `freespace` folder

3. **Load in Firefox**
   - Open `about:debugging#/runtime/this-firefox`
   - Click **Load Temporary Add-on**
   - Select `manifest.json` from the `freespace` folder

### From Chrome Web Store
> Coming soon — currently available for local installation only.

---

## 📖 How to Use

### Collecting Tabs
1. Click the **FreeSpace icon** in your browser toolbar (or press `Cmd+Shift+M` on Mac / `Ctrl+Shift+M` on Windows/Linux).
2. All open tabs across all windows are collected, classified, and saved as a session.
3. Tabs are closed and the FreeSpace dashboard opens automatically.

### Browsing Your Tabs
- The **left sidebar** shows all your saved sessions, sorted by time (newest first).
- Click any session to view its tabs on the right.
- If you had multiple windows, use the **window selector** at the top to filter by window or view all together.

### Restoring Tabs
- **Restore a group**: Each group card has a "Restore this group" button at the bottom.
- **Restore all**: Click the **Undo** button in the banner (available for 5 seconds after collection).
- **Open individual tabs**: Click any tab item to reopen it in a new tab.

### Searching
- Type in the search box to filter tabs by title, URL, or keyword.
- Results update in real-time as you type.

### Settings
- Click the **⚙ gear icon** in the toolbar to open settings.
- View storage usage, clear all data, or **switch language** between English and 中文.

---

## 🏗 Architecture

```
freespace/
├── manifest.json          # Manifest V3, bilingual metadata
├── background.js          # Service worker: tab collection, safety checks, multi-window grouping
├── dashboard/
│   ├── index.html         # Main dashboard UI (sidebar + workspace)
│   ├── style.css          # Light/dark theme, responsive, density modes
│   └── app.js             # Session list, multi-window display, search, i18n
├── lib/
│   ├── i18n.js            # English/Chinese translation engine
│   ├── classifier.js      # 35+ domain rules + custom overrides
│   ├── summarizer.js      # Keyword extraction, noise removal
│   ├── storage.js         # IndexedDB (sessions) + chrome.storage (settings)
│   ├── layout.js          # Virtual scroll, density management
│   ├── undo.js            # 5-second undo window
│   └── utils.js           # Domain extraction, Unicode-safe truncation
├── _locales/
│   ├── en/messages.json   # English extension metadata
│   └── zh/messages.json   # Chinese extension metadata
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── tests/
    ├── classifier.test.js
    └── summarizer.test.js
```

### Tech Stack
- **Manifest V3** — ES module service worker
- **IndexedDB** — Unlimited session storage
- **chrome.scripting** — Beforeunload detection without debugging permission
- **chrome.alarms** — Service worker keepalive
- **Pure vanilla JS** — No framework, no dependencies
- **Vitest** — 10 passing unit tests

---

## 🤝 Contributing

This is a work in progress. I welcome feedback, bug reports, feature requests, and pull requests.

**Planned improvements:**
- [ ] Chrome Web Store listing
- [ ] Export/Import session data (JSON)
- [ ] Drag-and-drop tab reordering between groups
- [ ] Keyboard navigation improvements
- [ ] Pinned tab preservation
- [ ] Reading list and archive features
- [ ] Tab group color theming

**Found a bug or have an idea?**
- Open an [Issue](../../issues)
- Submit a [Pull Request](../../pulls)
- Leave a comment on any open issue

---

## 📄 License

MIT License — see LICENSE file.

---

> Built with care for people who open too many tabs. 🫡
