// tests/classifier.test.js — Tests for classifier module

import { describe, it, expect, vi, afterEach } from 'vitest';

import { classifyTabs, saveCustomRule } from '../lib/classifier.js';

afterEach(() => vi.unstubAllGlobals());

describe('classifyTabs', () => {
  it('should classify tabs by known domain', async () => {
    const tabs = [
      { id: 1, url: 'https://github.com/user/repo', title: 'GitHub Repo' },
      { id: 2, url: 'https://gmail.com/inbox', title: 'Gmail' },
      { id: 3, url: 'https://github.com/user/other', title: 'Another Repo' },
    ];

    const groups = await classifyTabs(tabs);
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

    const groups = await classifyTabs(tabs);
    // Two domain groups: example.com and unknown.org (NOT one "Other" group)
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

    const groups = await classifyTabs(tabs);
    const allTabs = groups.flatMap((g) => g.tabs);
    expect(allTabs.length).toBe(1);
    expect(allTabs[0].id).toBe(3);
  });

  it('should apply custom rules over default rules', async () => {
    const tabs = [
      { id: 1, url: 'https://github.com/user/repo', title: 'GitHub' },
    ];

    const customRules = { 'github.com': 'Custom Category' };
    const groups = await classifyTabs(tabs, customRules);

    expect(groups.length).toBe(1);
    expect(groups[0].category).toBe('Custom Category');
  });

  it('should order known categories before domain sub-groups', async () => {
    const tabs = [
      { id: 1, url: 'https://random.net/foo', title: 'Random' },
      { id: 2, url: 'https://gmail.com/inbox', title: 'Gmail' },
      { id: 3, url: 'https://github.com/user/repo', title: 'GitHub' },
    ];

    const groups = await classifyTabs(tabs);
    // Known categories come first, then domain sub-groups
    // Development (index 0) before Communication (index 1)
    expect(groups[0].category).toBe('Development'); // github
    expect(groups[1].category).toBe('Communication'); // gmail
    expect(groups[2].category).toBe('random.net'); // domain sub-group
  });
});


describe('classification dictionary boundaries', () => {
  it('does not overwrite saved rules when reading storage fails', async () => {
    const failure = new Error('fixture storage read failed');
    const set = vi.fn((_value, callback) => callback());
    vi.stubGlobal('chrome', {
      runtime: { lastError: failure },
      storage: { local: {
        get: (_defaults, callback) => callback({}),
        set,
      } },
    });
    await expect(saveCustomRule('example.com', 'New')).rejects.toBe(failure);
    expect(set).not.toHaveBeenCalled();
  });

  it('saves and applies a custom rule for a prototype-named hostname', async () => {
    let stored = { customRules: { 'example.com': 'Existing' } };
    vi.stubGlobal('chrome', {
      runtime: {},
      storage: { local: {
        get: (_defaults, callback) => callback(structuredClone(stored)),
        set: (value, callback) => { stored = structuredClone(value); callback(); },
      } },
    });
    await saveCustomRule('__proto__', 'Local');
    expect(Object.hasOwn(stored.customRules, '__proto__')).toBe(true);
    expect(stored.customRules['example.com']).toBe('Existing');
    const groups = await classifyTabs([{ url: 'https://__proto__/page' }], stored.customRules);
    expect(groups[0].category).toBe('Local');
  });

  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])(
    'supports a custom category named %s', async (category) => {
      const tabs = [{ url: 'https://example.com/one' }, { url: 'https://example.com/two' }];
      const groups = await classifyTabs(tabs, { 'example.com': category });
      expect(groups).toEqual([{ category, icon: '\u{1F310}', tabs }]);
    },
  );

  it.each(['constructor', '__proto__', 'hasownproperty'])(
    'groups the hostname %s without treating inherited properties as rules', async (domain) => {
      const tabs = [{ url: `https://${domain}/one` }, { url: `https://${domain}/two` }];
      const groups = await classifyTabs(tabs);
      expect(groups).toEqual([{ category: domain, icon: domain[0].toUpperCase(), tabs }]);
    },
  );

  it('ignores rules inherited from a prototype', async () => {
    const rules = Object.create({ 'github.com': 'Inherited' });
    const groups = await classifyTabs([{ url: 'https://github.com/repo' }], rules);
    expect(groups[0].category).toBe('Development');
  });

  it('classifies domains absent from the old copied test implementation', async () => {
    const groups = await classifyTabs([
      { url: 'https://www.gitlab.com/repo' },
      { url: 'https://mail.google.com/inbox' },
      { url: 'https://claude.ai/chat' },
    ]);
    expect(groups.map(g => g.category)).toEqual(['Development', 'Communication', 'AI Tools']);
  });
});
