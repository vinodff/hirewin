# HireWin — LinkedIn Optimizer (Chrome Extension)

Pulls your LinkedIn profile into HireWin and rewrites every section with AI so recruiters can find you.

## How it works (in-page panel, v2)

1. You open your LinkedIn profile (`linkedin.com/in/...`).
2. The extension injects a floating **"Optimize with HireWin"** button. Clicking it opens an in-page side panel.
3. The panel scrapes your visible profile and shows a **recruiter-readiness score** + a **section checklist** (Photo, Banner, Headline, About, Experience, Skills, Open to Work, Education, Location) with done / tip / fix status.
4. Click **Optimize with AI** — the background service worker calls `hirewin.live/api/linkedin-optimize` with your session cookie. The API auto-loads your latest HireWin resume as the source of truth and returns rewritten sections.
5. Expand any section to **Copy** the AI rewrite or **Apply to LinkedIn** (opens LinkedIn's native editor and prefills the field; you review and hit LinkedIn's Save).

**Auth:** the panel runs on linkedin.com, so it can't send hirewin.live cookies directly. The background service worker (extension origin, with host permission for hirewin.live) makes the credentialed call. The API echoes CORS for `chrome-extension://` origins. If you're not signed in, the panel shows a "sign in" link.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | MV3 manifest, permissions, content script + background worker |
| `content-linkedin.js` | Scrapes profile, builds the panel, score, checklist, AI optimize, apply |
| `background.js` | Service worker that proxies the credentialed API call to HireWin |
| `panel.css` | Panel + launcher styles |
| `popup.html` / `popup.js` | Toolbar popup with instructions + base-URL setting (localhost vs prod) |
| `icons/` | Extension icons |

## Load it locally (development)

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. Open any LinkedIn profile and look for the button bottom-right

## Notes & limitations

- LinkedIn's DOM changes often and class names are obfuscated. The scraper uses stable section anchors (`#about`, `#experience`, `#skills`) with fallbacks, but a LinkedIn redesign may require selector updates in `content-linkedin.js`.
- LinkedIn truncates long About/experience text behind "see more". v1 grabs what's rendered; clicking "see more" before optimizing captures the full text.
- The web optimizer at `hirewin.live/linkedin-optimizer` works standalone too — users can paste sections manually without installing the extension.

## Publishing to the Chrome Web Store

1. Zip the contents of this folder (not the folder itself).
2. Create a developer account at https://chrome.google.com/webstore/devconsole ($5 one-time fee).
3. Upload the zip, fill in listing details, and submit for review (typically a few days).
4. After publishing, the extension gets a stable ID — no code change needed for the current handoff design.
