/* HireWin background service worker.
   Proxies the AI optimize call to hirewin.live with the user's session
   cookie. Runs in the extension origin with host_permissions, so it can
   send credentials cross-origin (the content script on linkedin.com can't). */

const DEFAULT_BASE = 'https://hirewin.live';

async function getConfig() {
  const { hirewin_base, hirewin_token } = await chrome.storage.local.get(['hirewin_base', 'hirewin_token']);
  return {
    base: (hirewin_base || DEFAULT_BASE).replace(/\/$/, ''),
    token: hirewin_token || '',
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'HIREWIN_OPTIMIZE') {
    (async () => {
      let base = DEFAULT_BASE;
      try {
        const cfg = await getConfig();
        base = cfg.base;
        const headers = { 'Content-Type': 'application/json' };
        // Primary auth: connection token (reliable cross-origin).
        if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;
        const res = await fetch(`${base}/api/linkedin-optimize`, {
          method: 'POST',
          headers,
          credentials: 'include', // cookie fallback if no token
          body: JSON.stringify(msg.payload || {}),
        });
        const data = await res.json().catch(() => ({}));
        sendResponse({ ok: res.ok, status: res.status, data, base, hasToken: !!cfg.token });
      } catch (e) {
        // Network / CORS / unreachable — status 0
        sendResponse({ ok: false, status: 0, error: String(e), base });
      }
    })();
    return true; // keep the message channel open for the async response
  }
});
