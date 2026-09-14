/* HireWin background service worker.
   Proxies the AI optimize call to hirewin.live with the user's session
   cookie. Runs in the extension origin with host_permissions, so it can
   send credentials cross-origin (the content script on linkedin.com can't). */

const DEFAULT_BASE = 'https://www.hirewin.live';

// The apex (hirewin.live) 301-redirects to www, and CORS preflight requests
// can't follow redirects — so always target the canonical www host.
//
// ALLOWLISTED, not trusted. hirewin_base is read from chrome.storage, and
// every request below attaches the bearer token, resume text, CTC and notice
// period with credentials: 'include'. The old version passed any stored value
// straight through, so a bad options value, a misconfigured install or local
// malware writing to storage could redirect all of that — over plain http —
// to whatever listened there.
const ALLOWED_BASES = ['https://www.hirewin.live'];

function normalizeBase(b) {
  let base = (b || DEFAULT_BASE).trim().replace(/\/$/, '');
  base = base.replace(/^https?:\/\/hirewin\.live/i, 'https://www.hirewin.live');
  return ALLOWED_BASES.includes(base) ? base : DEFAULT_BASE;
}

async function getConfig() {
  const { hirewin_base, hirewin_token } = await chrome.storage.local.get(['hirewin_base', 'hirewin_token']);
  return {
    base: normalizeBase(hirewin_base),
    token: hirewin_token || '',
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Only this extension's own contexts. Safe today because the manifest has no
  // externally_connectable, but this listener proxies authenticated requests
  // with the user's token — one manifest edit away from being callable by
  // other extensions or pages. Checked here so that edit cannot open it.
  if (!sender || sender.id !== chrome.runtime.id) return;
  if (!msg || !msg.type) return;

  if (msg.type === 'HIREWIN_OPTIMIZE') {
    (async () => {
      let base = DEFAULT_BASE;
      try {
        const cfg = await getConfig();
        base = cfg.base;
        const headers = { 'Content-Type': 'application/json' };
        if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;
        const res = await fetch(`${base}/api/linkedin-optimize`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(msg.payload || {}),
        });
        const data = await res.json().catch(() => ({}));
        sendResponse({ ok: res.ok, status: res.status, data, base, hasToken: !!cfg.token });
      } catch (e) {
        sendResponse({ ok: false, status: 0, error: String(e), base });
      }
    })();
    return true;
  }

  if (msg.type === 'HIREWIN_NAUKRI_SCORE_JOBS') {
    (async () => {
      let base = DEFAULT_BASE;
      try {
        const cfg = await getConfig();
        base = cfg.base;
        const headers = { 'Content-Type': 'application/json' };
        if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;
        const res = await fetch(`${base}/api/naukri/jobs`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(msg.payload || {}),
        });
        const data = await res.json().catch(() => ({}));
        sendResponse({ ok: res.ok, status: res.status, data, base });
      } catch (e) {
        sendResponse({ ok: false, status: 0, error: String(e), base });
      }
    })();
    return true;
  }

  if (msg.type === 'HIREWIN_NAUKRI_AUTO_ANSWER') {
    (async () => {
      let base = DEFAULT_BASE;
      try {
        const cfg = await getConfig();
        base = cfg.base;
        const headers = { 'Content-Type': 'application/json' };
        if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;
        const res = await fetch(`${base}/api/naukri/auto-answer`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(msg.payload || {}),
        });
        const data = await res.json().catch(() => ({}));
        sendResponse({ ok: res.ok, status: res.status, data, base });
      } catch (e) {
        sendResponse({ ok: false, status: 0, error: String(e), base });
      }
    })();
    return true;
  }

  if (msg.type === 'HIREWIN_RECORD_APPLICATION') {
    (async () => {
      let base = DEFAULT_BASE;
      try {
        const cfg = await getConfig();
        base = cfg.base;
        const headers = { 'Content-Type': 'application/json' };
        if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;
        const res = await fetch(`${base}/api/history`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(msg.payload || {}),
        });
        const data = await res.json().catch(() => ({}));
        sendResponse({ ok: res.ok, status: res.status, data });
      } catch (e) {
        sendResponse({ ok: false, status: 0, error: String(e) });
      }
    })();
    return true;
  }

  if (msg.type === 'HIREWIN_GET_PROFILE') {
    (async () => {
      const stored = await chrome.storage.local.get(['hirewin_resume', 'hirewin_autofill_profile']);
      sendResponse({
        resumeText: stored.hirewin_resume || '',
        autofillProfile: stored.hirewin_autofill_profile || null,
      });
    })();
    return true;
  }
});

