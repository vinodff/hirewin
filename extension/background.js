/* HireWin background service worker.
   Proxies the AI optimize call to hirewin.live with the user's session
   cookie. Runs in the extension origin with host_permissions, so it can
   send credentials cross-origin (the content script on linkedin.com can't). */

const DEFAULT_BASE = 'https://hirewin.live';

async function getBase() {
  const { hirewin_base } = await chrome.storage.local.get('hirewin_base');
  return (hirewin_base || DEFAULT_BASE).replace(/\/$/, '');
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'HIREWIN_OPTIMIZE') {
    (async () => {
      try {
        const base = await getBase();
        const res = await fetch(`${base}/api/linkedin-optimize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(msg.payload || {}),
        });
        const data = await res.json().catch(() => ({}));
        sendResponse({ ok: res.ok, status: res.status, data, base });
      } catch (e) {
        sendResponse({ ok: false, status: 0, error: String(e) });
      }
    })();
    return true; // keep the message channel open for the async response
  }
});
