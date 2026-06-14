/* Popup settings — connection code (auth) + optimizer base URL. */

const DEFAULT_BASE = 'https://www.hirewin.live';

const baseInput = document.getElementById('base');
const saved = document.getElementById('saved');
const tokenInput = document.getElementById('token');
const savedToken = document.getElementById('savedtoken');

chrome.storage.local.get(['hirewin_base', 'hirewin_token'], (d) => {
  baseInput.value = (d && d.hirewin_base) || DEFAULT_BASE;
  if (d && d.hirewin_token) tokenInput.value = d.hirewin_token;
});

function currentBase() {
  const v = (baseInput.value || '').trim().replace(/\/$/, '');
  return v || DEFAULT_BASE;
}

document.getElementById('save').addEventListener('click', () => {
  chrome.storage.local.set({ hirewin_base: currentBase() }, () => {
    saved.textContent = 'Saved ✓';
    setTimeout(() => { saved.textContent = ''; }, 1800);
  });
});

document.getElementById('savetoken').addEventListener('click', () => {
  const t = (tokenInput.value || '').trim();
  chrome.storage.local.set({ hirewin_token: t }, () => {
    savedToken.textContent = t ? 'Connected ✓' : 'Cleared';
    setTimeout(() => { savedToken.textContent = ''; }, 1800);
  });
});

document.getElementById('getcode').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: currentBase() + '/connect-extension' });
});
