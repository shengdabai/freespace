# freespace

Smart tab manager: one keystroke files all tabs across all windows into clean, auto-classified, searchable sessions

## Business Context

- **Category:** browser productivity tool
- **Audience:** knowledge workers and learners who spend most of their workflow in the browser.
- **Repository status:** Public repository. Keep examples, docs, and issues free of credentials, private data, and machine-specific paths.
- **Topics:** browser-extension, chrome-extension, firefox-addon, manifest-v3, productivity, tab-manager, onetab-alternative

## What This Project Is For

- Smart tab manager: one keystroke files all tabs across all windows into clean, auto-classified, searchable sessions.
- Compress repetitive browser work into a focused user interaction.
- Keep user control and privacy boundaries clear.

## Where It Fits

This repository focuses on reducing browser friction while keeping installation, permissions, and data boundaries visible.

## Technical Overview

- **Primary language:** JavaScript
- **Detected stack:** JavaScript, Node.js / JavaScript tooling
- **Default branch:** `main`
- **Visibility:** `PUBLIC`
- **License:** MIT License

## Repository Map

- `LICENSE`
- `README.md`
- `README_zh.md`
- `SECURITY.md`
- `_locales`
- `background.js`
- `dashboard`
- `icons`
- `tests`

## Quick Start

Use the commands that match the current project state:

```bash
npm install
npm run test
npm run lint
```

| Command | Purpose |
|---|---|
| `npm run test` | vitest run |
| `npm run lint` | echo 'No linter configured' |

## Operating Notes

- Keep real credentials out of the repository. Use local environment files, GitHub repository secrets, or the deployment platform secret manager.
- If a `.env.example` file exists, treat it as documentation only; never commit filled-in `.env` files.
- Before publishing screenshots, demos, or client examples, remove private names, internal paths, account IDs, and API endpoints.
- The `Repository Hygiene` workflow is intended as a lightweight guardrail, not a replacement for product-specific tests.

## Delivery Checklist

- [ ] README describes the user, business outcome, and operating boundary.
- [ ] Setup or preview commands are current.
- [ ] No real secrets, private user data, or machine-local state are tracked.
- [ ] Screenshots, demos, or sample outputs are safe to share publicly when the repository is public.
- [ ] Product-specific tests or smoke checks are documented before production use.

## Roadmap

- Tighten the fastest path from clone to useful demo.
- Add project-specific screenshots, sample outputs, or a short walkthrough where useful.
- Promote repeated manual steps into scripts, tests, or documented workflows.
- Keep security, privacy, and licensing boundaries explicit as the project evolves.

## Maintainer Notes

Maintained by [Tony Sheng](https://github.com/shengdabai). This README is written as a business-facing handoff: it should help a future collaborator, client, or reviewer understand why the repository exists, how to inspect it, and what must be true before it is reused or shipped.
