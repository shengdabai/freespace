// tests/classifier.test.js — Tests for classifier module

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chrome.storage.local so classifier.js can be imported in Node/Vitest
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((_defaults, cb) => cb({ customRules: {} })),
      set: vi.fn((_data, cb) => cb && cb()),
    },
  },
  runtime: {
    lastError: null,
  },
});

import { classifyTabs } from '../lib/classifier.js';

describe('classifyTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should classify tabs by known domain', async () => {
    const tabs = [
      { id: 1, url: 'https://github.com/user/repo', title: 'GitHub Repo' },
      { id: 2, url: 'https://gmail.com/inbox', title: 'Gmail' },
      { id: 3, url: 'https://github.com/user/other', title: 'Another Repo' },
    ];

    const groups = await classifyTabs(tabs, {});
    expect(groups.length).toBe(2);

    const dev = groups.find((g) => g.category === 'Development');
    const comm = groups.find((g) => g.category === 'Communication');

    expect(dev).toBeDefined();
    expect(dev.tabs.length).toBe(2);
    expect(comm).toBeDefined();
    expect(comm.tabs.length).toBe(1);
  });

  it('should split unknown domains into per-domain sub-groups', async () => {
    const tabs = [
      { id: 1, url: 'https://example.com/page1', title: 'Example 1' },
      { id: 2, url: 'https://example.com/page2', title: 'Example 2' },
      { id: 3, url: 'https://unknown.org/page', title: 'Unknown' },
    ];

    const groups = await classifyTabs(tabs, {});
    expect(groups.length).toBe(2);
    expect(groups[0].category).toBe('example.com');
    expect(groups[0].tabs.length).toBe(2);
    expect(groups[1].category).toBe('unknown.org');
    expect(groups[1].tabs.length).toBe(1);
  });

  it('should skip tabs with empty or invalid URLs', async () => {
    const tabs = [
      { id: 1, url: '', title: 'No URL' },
      { id: 2, url: 'not-a-url', title: 'Bad URL' },
      { id: 3, url: 'https://github.com/valid', title: 'Valid' },
    ];

    const groups = await classifyTabs(tabs, {});
    const allTabs = groups.flatMap((g) => g.tabs);
    expect(allTabs.length).toBe(1);
    expect(allTabs[0].id).toBe(3);
  });

  it('should apply custom rules over default rules', async () => {
    const tabs = [
      { id: 1, url: 'https://github.com/user/repo', title: 'GitHub' },
    ];

    const groups = await classifyTabs(tabs, { 'github.com': 'Custom Category' });
    expect(groups.length).toBe(1);
    expect(groups[0].category).toBe('Custom Category');
  });

  it('should order known categories before domain sub-groups', async () => {
    const tabs = [
      { id: 1, url: 'https://random.net/foo', title: 'Random' },
      { id: 2, url: 'https://gmail.com/inbox', title: 'Gmail' },
      { id: 3, url: 'https://github.com/user/repo', title: 'GitHub' },
    ];

    const groups = await classifyTabs(tabs, {});
    expect(groups[0].category).toBe('Development');
    expect(groups[1].category).toBe('Communication');
    expect(groups[2].category).toBe('random.net');
  });
});
