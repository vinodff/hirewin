# Local auto-apply (Naukri + company career sites)

Background auto-apply runs **on your own PC**, in a dedicated Chrome profile that you sign in
to Naukri with once. It does not run on hirewin.live (Vercel): there is no desktop Chrome, no
persistent disk and no window to sign in with there, and Naukri sessions are tied to your IP.

## Why it used to fail

Every earlier attempt landed on a logged-out job page (Naukri shows "Login / Register" and
"Continue with Google" instead of Apply). The saved browser profiles never contained a Naukri
auth cookie, so nothing could be submitted. The "I've Logged In" button only set a browser flag.

## Why "background" is an off-screen window, not headless

Measured on 2026-09-14: headless Chrome receives **HTTP 403 "Access Denied"** from Naukri's CDN
on every page (job search and `/mnjuser/homepage`), while the same Chrome as a normal window loads
them with 200. So runs use a real Chrome window placed off-screen. It appears in the taskbar while
a run is going; leave it open. `HIREWIN_APPLY_VISIBLE=1` keeps it on-screen instead.

## One-time setup

1. `npm install` (Playwright is already a dependency). Google Chrome must be installed.
2. Optional, in `.env.local`:

   | Variable | Default | Purpose |
   |---|---|---|
   | `HIREWIN_RESUME_PDF` | — | Absolute path of the resume PDF uploaded to company career sites |
   | `HIREWIN_APPLY_CONCURRENCY` | `3` | Jobs processed at the same time (1–5) |
   | `HIREWIN_APPLY_VISIBLE` | — | `1` = run applications in a visible window to watch them |
   | `HIREWIN_DATA_DIR` | `~/.hirewin` | Browser profile, answer cache, run logs |
   | `HIREWIN_LOCAL_RUNNER` | — | `1` to allow auto-apply in a local production build (`next start`) |

3. `npm run dev`, open **http://localhost:3000/job-scan** (not a LAN IP — the API refuses non-loopback hosts).
4. In the Naukri card click **Connect Naukri**. A Chrome window opens on the Naukri login page.
   Sign in (enter the OTP if asked), then click **Check connection**. The card shows what it saw.
   The login stays in `~/.hirewin/browser-profile`.

## Running

1. Scan jobs, then **Background Auto-Apply**.
2. Check your details. Required: name, email, mobile, current location, experience, notice
   period, expected CTC. They are remembered on this PC.
3. Pick jobs, choose **Submit applications** or **Preview only**, and how many at once.
4. The run continues if you close the panel. Each job shows its status, the evidence behind
   it, every answer that was entered with its source (profile / earlier answer / AI), screenshots
   and the full log. The same log lines appear in the `npm run dev` terminal.

## What each status means

| Status | Meaning |
|---|---|
| Applied | Naukri's apply API returned success, or the career site showed its confirmation |
| Needs you | Filled but not submitted — a required or sensitive question, a validation error, or no confirmation |
| Naukri login needed | The HireWin browser is not signed in |
| Captcha blocked it | A captcha/OTP challenge appeared; finish it by hand |
| Daily quota reached | Naukri's per-day apply limit |
| Company site | A career site without an adapter; apply there directly |
| Closed / Already applied / Failed | As named; Failed has the error in the log |

## Answers

- Profile fields are used as-is. Anything else is chosen by the AI router from your resume and
  cached so the same question gets the same answer next time (`~/.hirewin/answers.json`).
- Demographic self-identification and legal declarations are never answered for you; work
  authorization is answered only from the "Authorized to work in" field.

## Company career sites

Greenhouse, Lever, Ashby and SmartRecruiters forms are filled and submitted, and only counted as
applied when the site confirms. Workday pages that need an account, and unknown sites, are filled
where possible and left as "Needs you" / "Company site".

## Files

- Engine: `lib/apply/` (`runner`, `browser`, `naukri/`, `ats/`, `answers/`)
- API (local-only): `app/api/apply/session`, `app/api/apply/runs`
- UI: `components/naukri/local-apply/`
- Runs: `~/.hirewin/runs/<runId>/run.json` + screenshots
