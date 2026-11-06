import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let storage, tx, request, store;

beforeEach(async () => {
  vi.resetModules();
  request = {};
  store = { add: vi.fn(() => request), delete: vi.fn(() => request) };
  tx = { objectStore: vi.fn(() => store), error: null };
  const db = { transaction: vi.fn(() => tx) };
  vi.stubGlobal('indexedDB', {
    open: () => {
      const open = {};
      queueMicrotask(() => open.onsuccess({ target: { result: db } }));
      return open;
    },
  });
  storage = await import('../lib/storage.js');
  await storage.initDB();
});

afterEach(() => vi.unstubAllGlobals());

describe.each(['saveSession', 'deleteSession'])('%s transaction durability', (method) => {
  const start = () => storage[method](method === 'saveSession' ? { id: 'fixture' } : 'fixture');

  it('waits for the commit after the individual request succeeds', async () => {
    const settled = vi.fn();
    const pending = start();
    pending.then(settled, settled);
    await Promise.resolve();
    request.result = method === 'saveSession' ? 'fixture' : undefined;
    request.onsuccess?.();
    await new Promise(resolve => setImmediate(resolve));
    expect(settled).not.toHaveBeenCalled();
    tx.oncomplete();
    await expect(pending).resolves.toBe(request.result);
    expect(settled).toHaveBeenCalledOnce();
  });

  it('rejects if the transaction aborts after request success', async () => {
    const pending = start();
    const failure = new Error('fixture commit failed');
    const assertion = expect(pending).rejects.toBe(failure);
    await Promise.resolve();
    request.onsuccess?.();
    tx.error = failure;
    tx.onabort?.();
    await assertion;
  });

  it('rejects an explicit abort even without a transaction error', async () => {
    const pending = start();
    const assertion = expect(pending).rejects.toThrow('aborted');
    await Promise.resolve();
    tx.onabort?.();
    await assertion;
  });

  it('preserves request failures', async () => {
    const pending = start();
    const failure = new Error('fixture request failed');
    const assertion = expect(pending).rejects.toBe(failure);
    await Promise.resolve();
    request.error = failure;
    request.onerror();
    await assertion;
  });

  it('rejects transaction-level errors', async () => {
    const pending = start();
    const failure = new Error('fixture transaction failed');
    const assertion = expect(pending).rejects.toBe(failure);
    await Promise.resolve();
    tx.error = failure;
    tx.onerror?.();
    await assertion;
  });
});

describe('collection storage safety', () => {
  let onClick, chrome;

  beforeEach(async () => {
    chrome = {
      action: { onClicked: { addListener: fn => { onClick = fn; } } },
      commands: { onCommand: { addListener: vi.fn() } },
      alarms: { create: vi.fn(), clear: vi.fn(), onAlarm: { addListener: vi.fn() } },
      notifications: { create: vi.fn() },
      runtime: {
        getURL: name => 'chrome-extension://fixture/' + name,
        onMessage: { addListener: vi.fn() },
      },
      scripting: { executeScript: vi.fn(async () => []) },
      tabs: {
        query: vi.fn(async () => [{ id: 1, windowId: 1, index: 0, url: 'https://example.com/fixture' }]),
        remove: vi.fn(async () => {}), create: vi.fn(async () => {}),
      },
      storage: {
        local: { get: (_key, callback) => callback({ customRules: {} }) },
        session: { remove: vi.fn(async () => {}), set: vi.fn(async () => {}) },
      },
    };
    vi.stubGlobal('chrome', chrome);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await import('../background.js');
  });

  afterEach(() => vi.restoreAllMocks());

  async function startCollection() {
    onClick();
    await vi.waitFor(() => expect(store.add).toHaveBeenCalledOnce());
    request.onsuccess?.();
    await new Promise(resolve => setImmediate(resolve));
  }

  it('keeps every tab open if the save transaction aborts after request success', async () => {
    await startCollection();
    expect(chrome.tabs.remove).not.toHaveBeenCalled();
    tx.error = new Error('fixture commit failed');
    tx.onabort();
    await vi.waitFor(() => expect(chrome.notifications.create).toHaveBeenCalledOnce());
    expect(chrome.tabs.remove).not.toHaveBeenCalled();
    expect(chrome.storage.session.remove).not.toHaveBeenCalled();
    expect(chrome.storage.session.set).not.toHaveBeenCalled();
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });

  it('closes and records tabs for undo only after a successful commit', async () => {
    await startCollection();
    expect(chrome.tabs.remove).not.toHaveBeenCalled();
    expect(chrome.storage.session.remove).not.toHaveBeenCalled();
    tx.oncomplete();
    await vi.waitFor(() => expect(chrome.tabs.create).toHaveBeenCalledOnce());
    expect(chrome.tabs.remove).toHaveBeenCalledExactlyOnceWith(1);
    expect(chrome.storage.session.set).toHaveBeenCalledOnce();
    expect(chrome.storage.session.set.mock.calls[0][0]['freespace:last-collection'].tabs).toEqual([
      { url: 'https://example.com/fixture', title: undefined, pinned: false, windowId: 1, index: 0 },
    ]);
  });
});
