// Worker-owned undo record survives MV3 worker suspension in storage.session.
const KEY = 'freespace:last-collection';
let queue = Promise.resolve();
function serial(action) {
  const job = queue.then(action);
  queue = job.catch(() => {});
  return job;
}
async function read() { return (await chrome.storage.session.get(KEY))[KEY] || null; }
function remaining(record) { return record ? Math.max(0, Math.ceil((5000 - (Date.now() - record.timestamp)) / 1000)) : 0; }
export function setLastCollection(tabs) {
  return serial(() => chrome.storage.session.set({[KEY]: {
    tabs: tabs.map(({url,title,pinned,windowId,index}) => ({url,title,pinned:!!pinned,windowId,index})),
    timestamp: Date.now(),
  }}));
}
export function clearUndo() { return serial(() => chrome.storage.session.remove(KEY)); }
export async function getUndoStatus() {
  const record = await read(), seconds = remaining(record);
  return {canUndo: !!record?.tabs?.length && seconds > 0, remaining: seconds};
}
export function restoreLastSession() {
  return serial(async () => {
    const record = await read();
    if (!record?.tabs?.length || remaining(record) <= 0) {
      await chrome.storage.session.remove(KEY);
      return {restored:0,failed:0};
    }
    // Consume before opening tabs, so overlapping messages cannot restore twice.
    await chrome.storage.session.remove(KEY);
    const failed = [];
    let restored = 0;
    for (const tab of record.tabs.sort((a,b) => (a.windowId-b.windowId) || (a.index-b.index))) {
      let windowId;
      if (Number.isInteger(tab.windowId)) {
        try { await chrome.windows.get(tab.windowId); windowId = tab.windowId; } catch {}
      }
      try {
        await chrome.tabs.create({url:tab.url,active:false,pinned:!!tab.pinned,
          ...(windowId === undefined ? {} : {windowId}),
          ...(Number.isInteger(tab.index) ? {index:tab.index} : {})});
        restored++;
      } catch { failed.push(tab); }
    }
    // Only failed tabs are retryable; successful restores must never duplicate.
    if (failed.length) await chrome.storage.session.set({[KEY]:{tabs:failed,timestamp:Date.now()}});
    return {restored,failed:failed.length};
  });
}
