/* HireWin — LinkedIn profile scraper + floating CTA.
   Runs on https://www.linkedin.com/in/*  (your own or anyone's profile).
   Scrapes the visible profile sections, stashes them in extension storage,
   then opens the HireWin optimizer where the heavy lifting happens. */

(() => {
  const DEFAULT_BASE = 'https://hirewin.live';

  // Base URL is configurable from the popup (so you can test against
  // http://localhost:3001 during development). Cached synchronously at load
  // so the click handler can open the tab inside the user gesture.
  let baseUrl = DEFAULT_BASE;
  try {
    chrome.storage.local.get('hirewin_base', (d) => {
      if (d && d.hirewin_base) baseUrl = d.hirewin_base;
    });
  } catch (_) { /* context not ready */ }

  function optimizerUrl() {
    return `${baseUrl.replace(/\/$/, '')}/linkedin-optimizer?source=extension`;
  }

  /* ---- scraping helpers ---------------------------------------------- */

  function cleanText(el) {
    if (!el) return '';
    const pref = el.querySelector('span[aria-hidden="true"]');
    const t = (pref || el).innerText || '';
    return t.replace(/\s+/g, ' ').trim();
  }

  function sectionFor(anchorId) {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return null;
    return anchor.closest('section');
  }

  function getName() {
    const h1 = document.querySelector('main h1');
    return h1 ? h1.innerText.replace(/\s+/g, ' ').trim() : '';
  }

  function getHeadline() {
    const el = document.querySelector('main .text-body-medium.break-words')
      || document.querySelector('main div.text-body-medium');
    return el ? el.innerText.replace(/\s+/g, ' ').trim() : '';
  }

  function getAbout() {
    const sec = sectionFor('about');
    if (!sec) return '';
    const span = sec.querySelector('.display-flex.full-width span[aria-hidden="true"]')
      || sec.querySelector('.inline-show-more-text span[aria-hidden="true"]')
      || sec.querySelector('span[aria-hidden="true"]');
    return span ? span.innerText.replace(/\n{3,}/g, '\n\n').trim() : '';
  }

  function getExperience() {
    const sec = sectionFor('experience');
    if (!sec) return [];
    const items = sec.querySelectorAll('li.artdeco-list__item');
    const out = [];
    items.forEach((li) => {
      const title = cleanText(li.querySelector('.t-bold')) || cleanText(li.querySelector('.mr1.t-bold'));
      const company = cleanText(li.querySelector('.t-14.t-normal:not(.t-black--light)'))
        || cleanText(li.querySelector('span.t-14.t-normal'));
      const desc = cleanText(li.querySelector('.inline-show-more-text'))
        || cleanText(li.querySelector('.pvs-list__outer-container .t-14.t-normal.t-black'));
      if (title) {
        out.push({ title, company: company.split('·')[0].trim(), description: desc });
      }
    });
    return out.slice(0, 8);
  }

  function getSkills() {
    const sec = sectionFor('skills');
    if (!sec) return [];
    const names = [];
    sec.querySelectorAll('li.artdeco-list__item .t-bold span[aria-hidden="true"]').forEach((el) => {
      const s = el.innerText.replace(/\s+/g, ' ').trim();
      if (s && !names.includes(s)) names.push(s);
    });
    return names.slice(0, 50);
  }

  function getEducation() {
    const sec = sectionFor('education');
    if (!sec) return '';
    const items = [];
    sec.querySelectorAll('li.artdeco-list__item').forEach((li) => {
      const school = cleanText(li.querySelector('.t-bold'));
      const degree = cleanText(li.querySelector('.t-14.t-normal'));
      if (school) items.push([school, degree].filter(Boolean).join(' — '));
    });
    return items.join('\n');
  }

  function scrapeProfile() {
    return {
      name: getName(),
      headline: getHeadline(),
      about: getAbout(),
      experience: getExperience(),
      skills: getSkills(),
      education: getEducation(),
    };
  }

  /* ---- floating button UI -------------------------------------------- */

  function injectButton() {
    if (document.getElementById('hirewin-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'hirewin-fab';
    btn.type = 'button';
    btn.innerHTML = `
      <span class="hw-fab-icon">in</span>
      <span class="hw-fab-label">Optimize with HireWin</span>
    `;
    btn.addEventListener('click', onClick);
    document.body.appendChild(btn);
  }

  function setLabel(text, revert = true) {
    const label = document.querySelector('#hirewin-fab .hw-fab-label');
    if (!label) return;
    label.textContent = text;
    if (revert) setTimeout(() => { label.textContent = 'Optimize with HireWin'; }, 2400);
  }

  function onClick() {
    // 1) Open the tab SYNCHRONOUSLY inside the user gesture so Chrome's
    //    popup blocker doesn't kill it. (This was the "nothing happens" bug.)
    let win;
    try {
      win = window.open(optimizerUrl(), '_blank');
    } catch (_) { /* ignore */ }

    // 2) Scrape and stash. The bridge content script on the HireWin page
    //    reads this and prefills the form. Guard against an invalidated
    //    extension context (happens if you reload the extension but don't
    //    refresh this LinkedIn tab).
    let profile;
    try {
      profile = scrapeProfile();
    } catch (_) {
      profile = null;
    }

    try {
      chrome.storage.local.set({
        hirewin_pending_profile: profile || {},
        hirewin_pending_ts: Date.now(),
      });
      setLabel('Opening HireWin…');
    } catch (e) {
      // Context invalidated — tell the user to refresh
      setLabel('Refresh this page & retry');
      if (!win) {
        // open failed too — surface a hint
        alert('HireWin: please refresh this LinkedIn page and click again (the extension was updated).');
      }
    }
  }

  // LinkedIn is a SPA — keep the button present across client-side navs.
  function ensureButton() {
    if (location.pathname.startsWith('/in/')) injectButton();
  }
  ensureButton();
  const obs = new MutationObserver(ensureButton);
  obs.observe(document.body, { childList: true, subtree: true });
})();
