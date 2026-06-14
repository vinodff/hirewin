/* HireWin — in-page LinkedIn optimizer panel.
   Scrapes the profile, computes a completeness score + section checklist,
   runs AI optimization via the HireWin API (through the background worker),
   and lets the user copy or apply each optimized section. */

(() => {
  if (window.__hwPanelLoaded) return;
  window.__hwPanelLoaded = true;

  /* ============ scraping ============ */

  function cleanText(el) {
    if (!el) return '';
    const pref = el.querySelector('span[aria-hidden="true"]');
    return ((pref || el).innerText || '').replace(/\s+/g, ' ').trim();
  }
  function sectionFor(id) {
    const a = document.getElementById(id);
    return a ? a.closest('section') : null;
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
    const span = sec.querySelector('.inline-show-more-text span[aria-hidden="true"]')
      || sec.querySelector('.display-flex.full-width span[aria-hidden="true"]')
      || sec.querySelector('span[aria-hidden="true"]');
    return span ? span.innerText.replace(/\n{3,}/g, '\n\n').trim() : '';
  }
  function getExperience() {
    const sec = sectionFor('experience');
    if (!sec) return [];
    const out = [];
    sec.querySelectorAll('li.artdeco-list__item').forEach((li) => {
      const title = cleanText(li.querySelector('.t-bold')) || cleanText(li.querySelector('.mr1.t-bold'));
      const company = cleanText(li.querySelector('.t-14.t-normal:not(.t-black--light)')) || cleanText(li.querySelector('span.t-14.t-normal'));
      const desc = cleanText(li.querySelector('.inline-show-more-text'));
      if (title) out.push({ title, company: (company || '').split('·')[0].trim(), description: desc });
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
      if (school) items.push(school);
    });
    return items.join('\n');
  }
  function hasPhoto() {
    const img = document.querySelector('main img.pv-top-card-profile-picture__image, main .pv-top-card-profile-picture img, main button img.evi-image');
    if (!img) return false;
    const src = img.getAttribute('src') || '';
    return src.includes('media') || src.includes('licdn') ? !/ghost/i.test(src) : false;
  }
  function hasBanner() {
    if (document.querySelector('.profile-background-image--default')) return false;
    return !!document.querySelector('.profile-background-image img, .pv-top-card__non-self-photo, .profile-background-image');
  }
  function isOpenToWork() {
    return /open to work/i.test(document.querySelector('main')?.innerText || '');
  }
  function getLocation() {
    const el = document.querySelector('main .text-body-small.inline.t-black--light.break-words');
    return el ? el.innerText.replace(/\s+/g, ' ').trim() : '';
  }

  function scrape() {
    return {
      name: getName(),
      headline: getHeadline(),
      about: getAbout(),
      experience: getExperience(),
      skills: getSkills(),
      education: getEducation(),
      photo: hasPhoto(),
      banner: hasBanner(),
      openToWork: isOpenToWork(),
      location: getLocation(),
    };
  }

  /* ============ scoring + checklist ============ */

  // Each check: id, label, icon, points, evaluate(profile) -> {status, detail}
  const CHECKS = [
    { id: 'photo',     label: 'Profile Photo', icon: '📷', pts: 10, opt: false,
      ev: (p) => p.photo ? ok('Photo present') : issue('Add a professional headshot') },
    { id: 'banner',    label: 'Banner',        icon: '🖼️', pts: 8, opt: false,
      ev: (p) => p.banner ? ok('Custom banner set') : suggestion('Add a banner image related to your field') },
    { id: 'headline',  label: 'Headline',      icon: '🏷️', pts: 18, opt: true,
      ev: (p) => !p.headline ? issue('Missing headline') : p.headline.length < 50 ? suggestion('Headline is short — add keywords') : ok('Strong headline') },
    { id: 'about',     label: 'About',         icon: '📄', pts: 18, opt: true,
      ev: (p) => !p.about ? issue('Missing About section') : p.about.length < 200 ? suggestion('About is thin — expand your story') : ok('Detailed About') },
    { id: 'experience',label: 'Experience',    icon: '💼', pts: 16, opt: true,
      ev: (p) => !p.experience.length ? issue('No experience listed') : p.experience.some(e => !e.description) ? suggestion('Add descriptions to your roles') : ok('Experience detailed') },
    { id: 'skills',    label: 'Skills',        icon: '🧩', pts: 14, opt: true,
      ev: (p) => p.skills.length >= 5 ? ok(p.skills.length + ' skills listed') : suggestion('Add more skills (aim for 10+)') },
    { id: 'openToWork',label: 'Open To Work',  icon: '🤝', pts: 6, opt: false,
      ev: (p) => p.openToWork ? ok('Open to Work is on') : suggestion('Turn on Open to Work for recruiters') },
    { id: 'education',  label: 'Education',     icon: '🎓', pts: 5, opt: false,
      ev: (p) => p.education ? ok('Education listed') : suggestion('Add your education') },
    { id: 'location',   label: 'Location',      icon: '📍', pts: 5, opt: false,
      ev: (p) => p.location ? ok('Location set') : suggestion('Add your location') },
  ];
  function ok(d)         { return { status: 'done', detail: d }; }
  function suggestion(d) { return { status: 'suggestion', detail: d }; }
  function issue(d)      { return { status: 'issue', detail: d }; }

  function scoreOf(profile) {
    let got = 0, total = 0;
    CHECKS.forEach((c) => {
      total += c.pts;
      const r = c.ev(profile);
      if (r.status === 'done') got += c.pts;
      else if (r.status === 'suggestion') got += c.pts * 0.4;
    });
    return Math.round((got / total) * 100);
  }

  /* ============ React-safe field setter (for Apply) ============ */
  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Find LinkedIn's edit pencil by aria-label (any element, case-insensitive).
  function findEdit(...phrases) {
    const els = [...document.querySelectorAll('[aria-label]')];
    for (const e of els) {
      const label = (e.getAttribute('aria-label') || '').toLowerCase();
      if (phrases.some((p) => label.includes(p))) return e;
    }
    return null;
  }

  function openDialog() {
    return document.querySelector('[role="dialog"], .artdeco-modal');
  }

  // Find a form field inside the open dialog by its visible <label> text.
  function fieldByLabel(labelText) {
    const dialog = openDialog();
    if (!dialog) return null;
    const want = labelText.toLowerCase();
    for (const lb of dialog.querySelectorAll('label')) {
      if ((lb.innerText || '').toLowerCase().includes(want)) {
        const forId = lb.getAttribute('for');
        if (forId) {
          const byId = dialog.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(forId) : forId));
          if (byId) return byId;
        }
        const near = lb.closest('div')?.querySelector('input, textarea');
        if (near) return near;
      }
    }
    return null;
  }

  async function applyHeadline(text) {
    const btn = findEdit('edit intro');
    if (!btn) return false;
    btn.click();
    await wait(900);
    const field = fieldByLabel('Headline')
      || document.querySelector('[role="dialog"] textarea[id*="headline" i], [role="dialog"] input[id*="headline" i]')
      || openDialog()?.querySelector('textarea');
    if (!field) return false;
    setNativeValue(field, text);
    return true;
  }

  async function applyAbout(text) {
    const btn = findEdit('edit about');
    if (!btn) return false;
    btn.click();
    await wait(900);
    // The About editor is a single large textarea in the dialog.
    const field = openDialog()?.querySelector('textarea');
    if (!field) return false;
    setNativeValue(field, text);
    return true;
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function copy(text) { try { navigator.clipboard.writeText(text); } catch (_) {} }

  /* ============ scroll-to + highlight the matching LinkedIn section ============ */

  // Find a profile card by its <h2> heading text (most reliable — LinkedIn's
  // anchor ids change, but the visible section title doesn't).
  function sectionByHeading(name) {
    const target = name.toLowerCase();
    const secs = [...document.querySelectorAll('main section')];
    return secs.find((s) => {
      const h = s.querySelector('h2');
      if (!h) return false;
      const t = (h.innerText || '').trim().toLowerCase();
      return t === target || t.startsWith(target);
    }) || null;
  }

  function topCardSection() {
    return document.querySelector('main h1')?.closest('section')
      || document.querySelector('main section');
  }

  function sectionEl(id) {
    if (id === 'experience') return document.getElementById('experience')?.closest('section') || sectionByHeading('Experience');
    if (id === 'skills')     return document.getElementById('skills')?.closest('section')     || sectionByHeading('Skills');
    if (id === 'education')  return document.getElementById('education')?.closest('section')  || sectionByHeading('Education');
    if (id === 'about')      return document.getElementById('about')?.closest('section')      || sectionByHeading('About');
    // photo, banner, headline, location, openToWork live in the top (intro) card
    return topCardSection();
  }

  async function goToSection(id) {
    let target = sectionEl(id);
    // LinkedIn lazy-loads lower sections — if not found, scroll down to load then retry.
    if (!target) {
      window.scrollTo({ top: document.body.scrollHeight });
      await wait(700);
      target = sectionEl(id);
      window.scrollTo({ top: 0 });
      await wait(200);
    }
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('hw-highlight');
    setTimeout(() => target.classList.remove('hw-highlight'), 2600);
  }

  /* ============ panel UI ============ */

  let profile = null;
  let optimized = null; // AI result

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function ring(pct) {
    const r = 32, c = 2 * Math.PI * r;
    const off = c * (1 - pct / 100);
    const color = pct >= 70 ? '#34d399' : pct >= 40 ? '#fbbf24' : '#f87171';
    return `<div class="hw-ring">
      <svg width="76" height="76">
        <circle cx="38" cy="38" r="${r}" stroke="rgba(255,255,255,0.1)" stroke-width="7" fill="none"/>
        <circle cx="38" cy="38" r="${r}" stroke="${color}" stroke-width="7" fill="none"
          stroke-dasharray="${c}" stroke-dashoffset="${off}" stroke-linecap="round"/>
      </svg>
      <div class="hw-ring-val">${pct}%</div>
    </div>`;
  }

  function buildPanel() {
    profile = scrape();
    const pct = scoreOf(profile);

    const panel = el('div');
    panel.id = 'hw-panel';
    panel.innerHTML = `
      <div class="hw-head">
        <div class="hw-brand"><span class="hw-mark">in</span> Hire<span>Win</span></div>
        <button class="hw-x" title="Close">&times;</button>
      </div>
      <div class="hw-body">
        <div class="hw-score" id="hw-score">
          ${ring(pct)}
          <div class="hw-score-txt">
            <h3>Let's Optimize <button id="hw-refresh" title="Refresh score">↻</button></h3>
            <p>Your profile is ${pct}% recruiter-ready. AI rewrites every weak section from your resume.</p>
          </div>
        </div>
        <button class="hw-cta" id="hw-run"><span class="hw-mark" style="width:18px;height:18px;font-size:10px;">✨</span> Optimize with AI</button>
        <div id="hw-msg"></div>
        <div id="hw-list"></div>
      </div>
      <div class="hw-foot">Review every change before saving on LinkedIn.</div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('.hw-x').addEventListener('click', () => {
      panel.classList.remove('hw-open');
      // Fully remove after the slide-out so the launcher can come back.
      setTimeout(() => { panel.remove(); injectLauncher(); }, 280);
    });
    panel.querySelector('#hw-run').addEventListener('click', runOptimize);
    panel.querySelector('#hw-refresh').addEventListener('click', refreshScore);

    renderList();
    requestAnimationFrame(() => panel.classList.add('hw-open'));

    // Auto-run the AI as soon as the panel opens (user just needs to apply each section).
    setTimeout(runOptimize, 400);
  }

  // Re-scrape the profile and recompute the score (after the user applies + saves a change).
  function refreshScore() {
    profile = scrape();
    const pct = scoreOf(profile);
    const block = document.getElementById('hw-score');
    if (block) {
      const ringEl = block.querySelector('.hw-ring');
      if (ringEl) ringEl.outerHTML = ring(pct);
      const p = block.querySelector('.hw-score-txt p');
      if (p) p.textContent = `Your profile is ${pct}% recruiter-ready. AI rewrites every weak section from your resume.`;
    }
    // Refresh badges; clear any expanded bodies so they re-render with new state.
    document.querySelectorAll('#hw-list .hw-card').forEach((card) => {
      const id = card.dataset.id;
      const check = CHECKS.find((c) => c.id === id);
      if (!check) return;
      const r = check.ev(profile);
      const badge = card.querySelector('.hw-badge');
      if (badge) { badge.className = `hw-badge ${r.status}`; badge.textContent = r.status === 'done' ? 'Done' : r.status === 'issue' ? 'Fix' : 'Tip'; }
      const b = card.querySelector('.hw-card-body');
      if (b) { b.dataset.filled = ''; b.innerHTML = ''; }
      if (card.classList.contains('hw-exp')) fillBody(card, check, r);
    });
  }

  function renderList() {
    const list = document.getElementById('hw-list');
    if (!list) return;
    list.innerHTML = '';
    CHECKS.forEach((c) => {
      const r = c.ev(profile);
      const card = el('div', 'hw-card');
      card.dataset.id = c.id;
      card.innerHTML = `
        <div class="hw-card-head">
          <span class="hw-card-ico">${c.icon}</span>
          <span class="hw-card-title">${c.label}</span>
          <span class="hw-badge ${r.status}">${r.status === 'done' ? 'Done' : r.status === 'issue' ? 'Fix' : 'Tip'}</span>
          <span class="hw-chev">▼</span>
        </div>
        <div class="hw-card-body"></div>
      `;
      card.querySelector('.hw-card-head').addEventListener('click', () => {
        const opening = !card.classList.contains('hw-exp');
        card.classList.toggle('hw-exp');
        fillBody(card, c, r);
        if (opening) goToSection(c.id); // scroll the profile to this section + highlight it
      });
      list.appendChild(card);
    });
  }

  function fillBody(card, check, r) {
    const body = card.querySelector('.hw-card-body');
    if (!body || body.dataset.filled === '1') return;
    body.dataset.filled = '1';

    // current value
    const current =
      check.id === 'headline' ? profile.headline :
      check.id === 'about' ? profile.about :
      check.id === 'skills' ? profile.skills.join(', ') : '';

    let html = `<div class="hw-field-label">${escapeHtml(r.detail)}</div>`;
    if (current) html += `<div class="hw-field-label">Current</div><div class="hw-text">${escapeHtml(current)}</div>`;
    body.innerHTML = html;

    // "Go to section" — scrolls + highlights the matching part of the profile
    const nav = el('div', 'hw-actions');
    nav.appendChild(btn('Go to section', () => goToSection(check.id)));
    body.appendChild(nav);

    renderOptimizedInto(body, check);
  }

  function renderOptimizedInto(body, check) {
    if (!optimized) return;
    if (check.id === 'headline' && optimized.headlines?.length) {
      const wrap = el('div');
      wrap.innerHTML = `<div class="hw-field-label hw-opt-label" style="color:#34d399;">AI suggestions</div>`;
      optimized.headlines.forEach((h, i) => {
        const t = el('div', 'hw-text hw-opt'); t.style.marginTop = '7px'; t.textContent = h;
        const acts = el('div', 'hw-actions');
        acts.appendChild(btn('Copy', () => copy(h), 'hw-primary'));
        if (i === 0) acts.appendChild(btn('Apply to LinkedIn', () => doApply('headline', h)));
        wrap.appendChild(t); wrap.appendChild(acts);
      });
      body.appendChild(wrap);
    }
    if (check.id === 'about' && optimized.about) {
      const t = el('div', 'hw-text hw-opt'); t.style.marginTop = '7px'; t.textContent = optimized.about;
      const acts = el('div', 'hw-actions');
      acts.appendChild(btn('Copy', () => copy(optimized.about), 'hw-primary'));
      acts.appendChild(btn('Apply to LinkedIn', () => doApply('about', optimized.about)));
      body.appendChild(labeled('AI rewrite')); body.appendChild(t); body.appendChild(acts);
    }
    if (check.id === 'skills' && optimized.skills?.length) {
      const chips = el('div', 'hw-chips'); chips.style.marginTop = '7px';
      optimized.skills.forEach((s) => { const c = el('span', 'hw-chip'); c.textContent = s; chips.appendChild(c); });
      const acts = el('div', 'hw-actions');
      acts.appendChild(btn('Copy all', () => copy(optimized.skills.join(', ')), 'hw-primary'));
      body.appendChild(labeled('Recommended skills')); body.appendChild(chips); body.appendChild(acts);
    }
    if (check.id === 'experience' && optimized.experience?.length) {
      body.appendChild(labeled('AI rewrites'));
      optimized.experience.forEach((exp) => {
        const t = el('div', 'hw-text hw-opt'); t.style.marginTop = '7px';
        t.textContent = (exp.title ? exp.title + '\n' : '') + exp.bullets.map((b) => '• ' + b).join('\n');
        const acts = el('div', 'hw-actions');
        acts.appendChild(btn('Copy', () => copy(exp.bullets.map((b) => '• ' + b).join('\n')), 'hw-primary'));
        body.appendChild(t); body.appendChild(acts);
      });
    }
  }

  function labeled(text) { const d = el('div', 'hw-field-label'); d.style.color = '#34d399'; d.textContent = text; return d; }
  function btn(label, fn, extra) {
    const b = el('button', 'hw-btn' + (extra ? ' ' + extra : ''));
    b.textContent = label;
    b.addEventListener('click', async () => { await fn(); if (label.startsWith('Copy')) { b.textContent = 'Copied ✓'; b.classList.add('hw-ok'); setTimeout(() => { b.textContent = label; b.classList.remove('hw-ok'); }, 1500); } });
    return b;
  }
  function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  async function doApply(kind, text) {
    copy(text); // always have it ready to paste
    await goToSection(kind); // scroll to + highlight the section being edited

    let okApplied = false;
    try {
      okApplied = kind === 'headline' ? await applyHeadline(text) : await applyAbout(text);
    } catch (_) { okApplied = false; }

    if (okApplied) {
      // Editor is filled — nudge the user to save it (LinkedIn's own Save button).
      const dlg = openDialog();
      if (dlg) {
        const note = el('div');
        note.textContent = '✓ Filled by HireWin — review and click Save';
        note.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#16a34a;color:#fff;padding:8px 16px;border-radius:8px;font:600 13px sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.3)';
        document.body.appendChild(note);
        setTimeout(() => note.remove(), 4000);
      }
      return;
    }

    // Auto-fill failed — at least open LinkedIn's editor so the user can paste.
    const opened = kind === 'headline' ? !!findEdit('edit intro') : !!findEdit('edit about');
    if (opened) {
      (kind === 'headline' ? findEdit('edit intro') : findEdit('edit about'))?.click();
      alert("HireWin: copied your new text and opened LinkedIn's editor. Click into the field and paste (Ctrl+V).");
    } else {
      alert("HireWin: copied your new text. Click the ✏️ edit pencil on this section and paste (Ctrl+V).");
    }
  }

  /* ============ AI optimize ============ */

  function setMsg(html) { const m = document.getElementById('hw-msg'); if (m) m.innerHTML = html; }

  async function runOptimize() {
    const runBtn = document.getElementById('hw-run');
    if (runBtn) { runBtn.disabled = true; runBtn.innerHTML = '<span class="hw-spin"></span> Optimizing…'; }
    setMsg('');

    const payload = {
      name: profile.name,
      headline: profile.headline,
      about: profile.about,
      experience: profile.experience,
      skills: profile.skills,
      education: profile.education,
    };

    let resp;
    try {
      resp = await chrome.runtime.sendMessage({ type: 'HIREWIN_OPTIMIZE', payload });
    } catch (e) {
      finishRun();
      setMsg('<div class="hw-note">Extension was updated — please refresh this page and try again.</div>');
      return;
    }

    finishRun();

    const base = (resp && resp.base) || 'https://www.hirewin.live';

    if (!resp) { setMsg('<div class="hw-note">No response from the extension. Refresh and try again.</div>'); return; }

    // Network / CORS / unreachable
    if (resp.status === 0) {
      setMsg(`<div class="hw-note">Couldn't reach HireWin at <b>${escapeHtml(base)}</b>. Make sure you're <a id="hw-open">signed in there</a> in this browser (and the site is running if using localhost), then click Re-run AI.</div>`);
      const a = document.getElementById('hw-open');
      if (a) a.addEventListener('click', () => window.open(base + '/auth/login', '_blank'));
      return;
    }

    if (resp.status === 401) {
      const why = resp.hasToken
        ? 'Your connection code is invalid or expired.'
        : 'Connect the extension to your HireWin account.';
      setMsg(`<div class="hw-note">${why} <a id="hw-connect">Get a connection code</a>, paste it in the extension popup, then click Re-run AI.</div>`);
      const a = document.getElementById('hw-connect');
      if (a) a.addEventListener('click', () => window.open(base + '/connect-extension', '_blank'));
      return;
    }
    if (!resp.ok) {
      const detail = (resp.data && resp.data.error) || `status ${resp.status}`;
      setMsg(`<div class="hw-note">Optimization failed (${escapeHtml(String(detail))}). Click Re-run AI to retry.</div>`);
      return;
    }

    optimized = resp.data.result;
    if (resp.data.locked) {
      const base = resp.base || 'https://www.hirewin.live';
      setMsg(`<div class="hw-note">Free preview: headlines, skills & tips unlocked. <a id="hw-up">Upgrade</a> for full About + Experience rewrites.</div>`);
      const a = document.getElementById('hw-up');
      if (a) a.addEventListener('click', () => window.open(base + '/pricing', '_blank'));
    } else {
      setMsg('<div class="hw-note" style="color:#34d399;background:rgba(52,211,153,0.08);border-color:rgba(52,211,153,0.2);">Done! Expand any section below to copy or apply your AI rewrite.</div>');
    }

    // Re-render so new optimized content shows; auto-expand the first actionable card.
    document.querySelectorAll('#hw-list .hw-card').forEach((card) => {
      const b = card.querySelector('.hw-card-body'); if (b) { b.dataset.filled = ''; b.innerHTML = ''; }
      if (card.classList.contains('hw-exp')) {
        const id = card.dataset.id; const check = CHECKS.find((c) => c.id === id);
        if (check) fillBody(card, check, check.ev(profile));
      }
    });
    const headlineCard = document.querySelector('#hw-list .hw-card[data-id="headline"]');
    if (headlineCard && !headlineCard.classList.contains('hw-exp')) {
      headlineCard.classList.add('hw-exp');
      const check = CHECKS.find((c) => c.id === 'headline');
      fillBody(headlineCard, check, check.ev(profile));
    }
  }

  function finishRun() {
    const runBtn = document.getElementById('hw-run');
    if (runBtn) { runBtn.disabled = false; runBtn.innerHTML = '<span class="hw-mark" style="width:18px;height:18px;font-size:10px;">✨</span> Re-run AI'; }
  }

  /* ============ launcher + mount ============ */

  function injectLauncher() {
    if (document.getElementById('hw-launch') || document.getElementById('hw-panel')) return;
    const b = el('button'); b.id = 'hw-launch';
    b.innerHTML = `<span class="hw-l-icon">in</span> Optimize with HireWin`;
    b.addEventListener('click', () => {
      b.remove();
      buildPanel();
    });
    document.body.appendChild(b);
  }

  function ensure() { if (location.pathname.startsWith('/in/')) injectLauncher(); }
  ensure();
  new MutationObserver(ensure).observe(document.body, { childList: true, subtree: true });
})();
