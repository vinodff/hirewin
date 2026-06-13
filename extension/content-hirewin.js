/* HireWin bridge — runs on the optimizer page (hirewin.live or localhost).
   Reads the profile the LinkedIn scraper stashed in extension storage and
   hands it to the page via postMessage. The page (React) listens for
   { type: 'HIREWIN_LINKEDIN_PROFILE' } and prefills its form. */

(() => {
  let profile = null;
  let delivered = false;

  function deliver() {
    if (delivered || !profile) return;
    delivered = true;
    try {
      window.postMessage({ type: 'HIREWIN_LINKEDIN_PROFILE', profile }, window.location.origin);
    } catch (_) { /* ignore */ }
    try {
      chrome.storage.local.remove(['hirewin_pending_profile', 'hirewin_pending_ts']);
    } catch (_) { /* context invalidated — harmless */ }
  }

  // The page announces readiness once React mounts its listener.
  window.addEventListener('message', (ev) => {
    if (ev.source !== window) return;
    if (ev.data && ev.data.type === 'HIREWIN_OPTIMIZER_READY') deliver();
  });

  try {
    chrome.storage.local.get(['hirewin_pending_profile', 'hirewin_pending_ts'], (data) => {
      if (chrome.runtime && chrome.runtime.lastError) return;
      const ts = (data && data.hirewin_pending_ts) || 0;
      const p = data && data.hirewin_pending_profile;
      // Only honor imports from the last 5 minutes, and only if non-empty.
      const hasData = p && (p.name || p.headline || p.about || (p.experience && p.experience.length) || (p.skills && p.skills.length));
      if (hasData && Date.now() - ts < 5 * 60 * 1000) {
        profile = p;
        deliver();
        setTimeout(deliver, 800);
        setTimeout(deliver, 2000);
      }
    });
  } catch (_) {
    /* extension context not available — page still works standalone */
  }
})();
