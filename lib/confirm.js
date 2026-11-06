// Bind a destructive action to exactly one live confirmation notification.
export function confirmCloseTabs(message, timeoutMs = 30000) {
  return new Promise(resolve => {
    const id = 'freespace-confirm-' + crypto.randomUUID();
    let settled = false;
    const finish = answer => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.notifications.onButtonClicked.removeListener(onButton);
      chrome.notifications.onClosed.removeListener(onClosed);
      try { Promise.resolve(chrome.notifications.clear(id)).catch(() => {}); } catch {}
      resolve(answer);
    };
    const onButton = (notificationId, buttonIndex) => {
      if (notificationId === id) finish(buttonIndex === 0);
    };
    const onClosed = notificationId => { if (notificationId === id) finish(false); };
    const timer = setTimeout(() => finish(false), timeoutMs);
    chrome.notifications.onButtonClicked.addListener(onButton);
    chrome.notifications.onClosed.addListener(onClosed);
    try {
      Promise.resolve(chrome.notifications.create(id, {
        type: 'basic', iconUrl: 'icons/icon48.png', title: 'FreeSpace', message,
        buttons: [{title: '继续关闭'}, {title: '取消'}], requireInteraction: true,
      })).catch(() => finish(false));
    } catch { finish(false); }
  });
}
