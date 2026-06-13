/* Popup settings — lets the user point the extension at localhost (for
   development) or the production hirewin.live site. */

const DEFAULT_BASE = 'https://hirewin.live';
const input = document.getElementById('base');
const saved = document.getElementById('saved');

chrome.storage.local.get('hirewin_base', (d) => {
  input.value = (d && d.hirewin_base) || DEFAULT_BASE;
});

document.getElementById('save').addEventListener('click', () => {
  let val = input.value.trim().replace(/\/$/, '');
  if (!val) val = DEFAULT_BASE;
  chrome.storage.local.set({ hirewin_base: val }, () => {
    saved.textContent = 'Saved ✓';
    setTimeout(() => { saved.textContent = ''; }, 1800);
  });
});
