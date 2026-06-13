# HireWin — LinkedIn Optimizer (Chrome Extension)

Pulls your LinkedIn profile into HireWin and rewrites every section with AI so recruiters can find you.

## How it works

1. You open your LinkedIn profile (`linkedin.com/in/...`).
2. The extension injects a floating **"Optimize with HireWin"** button.
3. Click it — the extension scrapes your visible profile sections (name, headline, About, experience, skills, education) and opens **hirewin.live/linkedin-optimizer** in a new tab.
4. A bridge content script hands the scraped data to the HireWin page, which prefills the form.
5. HireWin (where you're already logged in) runs the AI optimization, applies your plan, and shows the rewritten sections with copy buttons.

**Why this design:** the extension stays thin (just scrape + hand off). All auth, AI, payments, and UI live in the Next.js app — no API tokens, no CORS, no cookie/SameSite issues.

## Load it locally (development)

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. Open any LinkedIn profile and look for the button bottom-right

## Files

| File | Purpose |
|---|---|
| `manifest.json` | MV3 manifest, permissions, content-script registration |
| `content-linkedin.js` | Scrapes the profile + injects the floating button (runs on linkedin.com/in/*) |
| `content-hirewin.js` | Bridge: hands scraped data to the HireWin page (runs on hirewin.live/linkedin-optimizer) |
| `inject.css` | Styles for the floating button |
| `popup.html` | Toolbar popup with instructions |
| `icons/` | Extension icons (16/48/128) |

## Notes & limitations

- LinkedIn's DOM changes often and class names are obfuscated. The scraper uses stable section anchors (`#about`, `#experience`, `#skills`) with fallbacks, but a LinkedIn redesign may require selector updates in `content-linkedin.js`.
- LinkedIn truncates long About/experience text behind "see more". v1 grabs what's rendered; clicking "see more" before optimizing captures the full text.
- The web optimizer at `hirewin.live/linkedin-optimizer` works standalone too — users can paste sections manually without installing the extension.

## Publishing to the Chrome Web Store

1. Zip the contents of this folder (not the folder itself).
2. Create a developer account at https://chrome.google.com/webstore/devconsole ($5 one-time fee).
3. Upload the zip, fill in listing details, and submit for review (typically a few days).
4. After publishing, the extension gets a stable ID — no code change needed for the current handoff design.
