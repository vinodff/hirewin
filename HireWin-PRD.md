# HireWin — Product Requirements Document

**Version:** 1.0
**Last updated:** 2026-05-15
**Live URL:** https://hirewin.live
**Local dev:** http://localhost:3000

---

## 1. Product Overview

**HireWin** is an AI-powered resume optimization platform for job seekers (primarily Indian tech workers and students). Users upload a resume and a job description; the platform rewrites the resume to match the JD with verified evidence, an ATS score, a trust score, and interview risk warnings.

### Unique value proposition
Unlike competitors that keyword-stuff resumes, HireWin:
1. **Scores trustworthiness** (0–100) of every claim
2. **Maps each skill to evidence** in the original resume (Verified / Partial / Weak / Unverified)
3. **Flags interview risks** — claims a recruiter could probe
4. **Generates cold-email + LinkedIn outreach messages** for each application

### Tech stack
- **Frontend:** Next.js 15 App Router, React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes (serverless)
- **AI:** Anthropic Claude Sonnet 4.5 (streaming via SSE)
- **Database & Auth:** Supabase (Postgres + Auth)
- **Payments:** Razorpay (INR)
- **Email:** Resend (from `hello@hirewin.live`)
- **Deployment:** Vercel
- **Cron:** Vercel Cron (monthly free-credit reset email)

---

## 2. User Personas

| Persona | Description | Primary need |
|---------|-------------|--------------|
| **Student/Fresher** | B.Tech CS student or recent grad in India | Get first internship/job; weak resume needs to look professional without lies |
| **Mid-level developer** | 2–5 years experience switching companies | Quickly tailor resume per JD to maximize callback rate |
| **Career changer** | Transitioning roles or domains | Reframe existing experience to match new target role |
| **Aggressive job-hunter** | Applying to 20+ roles/week | Speed + tracking of every application status |

---

## 3. Plans & Pricing

| Plan | Price | Optimizations/mo | Downloads/mo | Deep Evals | Notes |
|------|-------|------------------|--------------|------------|-------|
| **Free** | ₹0 | Unlimited | 1 | 0 | Then share 5× on WhatsApp OR upgrade |
| **Starter** | ₹99 one-time | 2 | 1 | 0 | Entry tier |
| **Pro** | ₹199/mo or ₹1990/yr | 20 | Unlimited | 10 | Most popular |
| **Power** | ₹399/mo or ₹3990/yr | 80 | Unlimited | 40 | Heavy job hunters |
| **Team** | Custom | Unlimited | Unlimited | Unlimited | Career-services agencies |

Usage counters reset on the 1st of every month (Supabase RPC `reset_monthly_usage_if_needed`).

---

## 4. Core Pages & Features

### 4.1 Homepage `/`
**Purpose:** Convert visitors to start an analysis.

**Sections (top to bottom):**
1. Hero with rotating headline ("interviews / callbacks / shortlisted / hired"), CTA buttons, animated demo
2. **Why Different** — four 3D-tilting pillar cards: Trust Score, Evidence Map, Interview Risk, ATS+Recruiter Brain
3. **Competitor Grid** — feature-by-feature comparison table
4. Bullet Rewriter live demo
5. Time-saved animation
6. Hard-truth stats (75% ATS rejection, 7.4s recruiter glance, etc.)
7. Testimonials marquee
8. FAQ
9. Final CTA

**CTAs:** `Improve My Resume — Free` (→ `/analyze`), `Build Resume from Scratch` (→ `/builder`)

### 4.2 Auth `/auth/login`, `/auth/callback`
- Google OAuth + magic-link email via Supabase
- After login, redirect to `next` param or `/analyze`

### 4.3 Analyze `/analyze`
**The core product flow.**

**Three steps:**
1. **Input:** Paste resume text OR upload PDF (max 5MB); paste JD text OR JD URL; optional notes + length preference (auto / 1page / 2page / academic)
2. **Analyzing:** SSE stream from `/api/analyze` shows fields populating in real-time (atsScore → jobFitScore → trustScore → keywordsMatched → keywordsMissing → skillGaps → skillEvidence → interviewRisks → company → role → optimizedResume)
3. **Results:** Shows ScoreHero (ATS + Job Fit), **TrustPanel** (Trust Score + Evidence Map + Interview Risks), KeywordChips, BeforeAfter PDF preview, DownloadButtons, SkillGapList, OutreachSection, InterviewQA

**Edge cases to test:**
- Resume PDF that can't be parsed → friendly error "Can't read this PDF — paste your resume text"
- JD URL from known ATS (Greenhouse, Lever, etc.) → error "paste the JD"
- Resume > 5MB → error "File too large"
- Empty resume or JD → "Resume is required" / "JD is required"
- Anthropic API down → "temporarily overloaded, please try again"
- Anthropic credits exhausted → "add credits at console.anthropic.com"
- Malformed Claude response → 1 retry with stronger JSON instruction, then "incomplete data"
- User logged out mid-flow → 401 redirect to login
- User exceeds rate limit (≥10 requests/hour per IP/user) → "Too many requests"

### 4.4 Builder `/builder`
**Form-based resume builder** with sections: contact, summary, skills, experience (multiple), projects (multiple), education, certifications, achievements. Live PDF/DOCX preview. Generates a clean resume from scratch.

After building, user can click "Analyze this resume" → routes to `/analyze` with pre-filled `resumeText` via sessionStorage key `hirewin:builder-resume`.

### 4.5 History `/history`
**Job tracker.** Lists all saved resume versions with:
- Application status pill row (evaluated → applied → responded → interview → offer/rejected/discarded)
- Inline note editor (recruiter name, follow-up date)
- ATS ring score
- Filter tabs: All / Applied / Interview / Offer / Rejected
- Search by role or company
- Delete with confirmation

### 4.6 History Detail `/history/[id]`
Full resume version view: optimized resume, before/after, downloads, outreach messages, interview Q&A, status timeline.

### 4.7 My Resumes `/my-resumes`
Lighter version of history focused on resume documents (not job applications).

### 4.8 Pricing `/pricing`
Plan cards with toggle (monthly/yearly). "Subscribe" buttons hit `/api/payment/create-order` → Razorpay checkout.

### 4.9 Billing `/billing`
Logged-in users see current plan, usage stats, billing history.

### 4.10 Payment Success/Failed `/payment/success`, `/payment/failed`

---

## 5. Critical User Flows (Test These)

### Flow A: New user → first optimized resume → first download
1. Visit `/` → click "Improve My Resume — Free"
2. Land on `/analyze` (no auth required to analyze)
3. Paste resume + JD → click "Analyze"
4. Wait ~20s for SSE stream → see results page
5. **Trust Panel** shows: Trust Score, evidence map, interview risks
6. Click "Download PDF"
7. Prompted to sign in → Google OAuth
8. After login, redirected back → click "Download PDF" again
9. PDF downloads successfully (1 free download used)
10. Attempt second download → 403 → share-unlock modal

### Flow B: Returning paid user
1. Sign in → land on `/analyze` or `/history`
2. Crown badge in DownloadButtons header reads "Unlimited"
3. Downloads are unlimited
4. Footer copy reads "Unlimited downloads on your current plan"

### Flow C: Share-to-unlock
1. Free user exhausts 1 free download
2. Sees share-to-unlock section with progress bar (0/5)
3. Clicks "Share on WhatsApp" → opens WhatsApp web with pre-filled message
4. POST to `/api/share` records the share
5. Repeat 5 times → progress bar fills, "Download unlocked" toast appears
6. PDF/DOCX download now works without paying

### Flow D: Razorpay payment
1. From `/pricing` → click "Pro – ₹199/mo"
2. POST to `/api/payment/create-order` → returns Razorpay order_id
3. Razorpay modal opens
4. Complete test payment with test card `4111 1111 1111 1111`
5. Razorpay webhook hits `/api/payment/verify` → updates `profiles.plan = 'pro'`
6. Redirect to `/payment/success`
7. User can now download unlimited resumes

### Flow E: Outreach generation
1. On results page, scroll to "Outreach" section
2. Click "Generate cold email" → POST to `/api/outreach` → returns personalized email
3. Click "Generate LinkedIn note" → returns 300-char message
4. Copy buttons work
5. "Send via Gmail" button opens mailto: with pre-filled subject + body

### Flow F: Application tracking
1. After analyzing, click "Track Application" → routes to `/history`
2. Find the new entry → click status pill → change "evaluated" → "applied"
3. Status updates optimistically, then persists via PATCH `/api/history`
4. Add note via inline editor → persists
5. Filter by "Applied" → entry visible
6. Search by company name → entry visible

### Flow G: Monthly credit reset email
1. Cron job `/api/cron/monthly-reset` runs on 1st of month at 8 AM UTC
2. For every active free-plan user with `improvements_used > 0`, send reset email via Resend
3. Email subject: "Your N free resume optimizations just reset"
4. Email contains personalized usage stats + CTA to `/analyze`

---

## 6. API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/analyze` | Optional | SSE stream of resume optimization |
| POST | `/api/download/pdf` | Required | Generate + return PDF (enforces plan + share-unlock) |
| POST | `/api/download/docx` | Required | Same for DOCX |
| POST | `/api/outreach` | Required | Generate cold email + LinkedIn note |
| POST | `/api/interview` | Required | Generate 10 likely interview questions |
| POST | `/api/improve-summary` | Required | Rewrite a single resume summary |
| GET/POST | `/api/share` | Required | Track WhatsApp share / get share count + downloadsLeft |
| GET/PATCH/DELETE | `/api/history` | Required | CRUD on resume versions |
| GET/PATCH | `/api/history/[id]` | Required | Single version operations |
| POST | `/api/payment/create-order` | Required | Create Razorpay order |
| POST | `/api/payment/verify` | Webhook | Razorpay payment verification |
| GET | `/api/billing` | Required | Plan + usage |
| GET | `/api/cron/monthly-reset` | Bearer secret | Cron-triggered reset email |
| POST | `/api/presence` | Optional | Analytics ping |

---

## 7. Auth & Authorization Rules

- **Public:** `/`, `/auth/*`, `/pricing`, `/analyze` (optimization only, not download)
- **Auth required:** `/builder`, `/history`, `/my-resumes`, `/billing`, all download/outreach endpoints
- **Plan-gated:** Downloads beyond plan limit return HTTP 403 with body `{error: "locked"}` — frontend shows unlock modal
- **Rate-limited:** `/api/analyze` capped per IP+user (10/hour)
- **Admin-only:** None public yet

---

## 8. Database Schema (Supabase / Postgres)

Key tables:
- `profiles` (id, email, plan, usage counters, target_roles, etc.)
- `resume_versions` (one per optimization; includes original + optimized resume, scores, JD text, application_status, timestamps)
- `share_events` (user_id + version_id pairs for WhatsApp share tracking)
- `orders` (Razorpay orders; status: created/paid/failed)
- `usage_log` (Anthropic token usage per request)

Row-Level Security (RLS) enforced — users can only read/write their own data.

---

## 9. Edge Cases & Error Paths to Test

### Network failures
- Supabase project paused/down → "Failed to fetch" cascading auth errors → user sees friendly auth error
- Anthropic API timeout → "temporarily overloaded"
- Razorpay webhook delayed → user still on `/payment/success` shows pending state

### Input validation
- Resume text < 50 chars → reject as "too short, paste full resume"
- JD text < 50 chars → reject
- PDF upload corrupted or password-protected → friendly fallback message
- JD URL pointing to PDF or video → must fail gracefully
- Extremely long resume (50k+ chars) → Claude truncates, still generates valid output

### State edge cases
- User opens `/analyze` in two tabs simultaneously → both can run, both save separately
- User refreshes `/analyze` mid-stream → analysis aborted, partial state lost (expected)
- Plan downgraded mid-month with overflow usage → still works for current month, blocks next month
- Cron retry sending email twice → idempotency by per-user log row

### UI states
- Empty results (no skillGaps) → empty-state copy
- Long company name (50+ chars) → truncate with ellipsis
- Mobile viewport < 360px → all CTAs remain tappable (min-height 48px)
- Dark mode forced (project is permanently dark) — no light mode toggle to test
- Slow connection during PDF generation → loading spinner stays visible

### Security
- Tampered Razorpay payload → verify rejects signature, no plan upgrade
- User trying to download another user's resume by guessing `versionId` → RLS blocks
- XSS attempt in resume text → React's JSX escaping handles, output safe
- SQL injection via resume text → Supabase parameterized queries prevent

---

## 10. Accessibility & Performance Targets

- Lighthouse Performance ≥ 85 (mobile)
- LCP < 2.5s on 4G
- All buttons have visible focus states
- Keyboard navigation works on all forms
- Screen-reader labels on icon-only buttons
- Color contrast WCAG AA on text

---

## 11. Out-of-Scope (Don't Test)

- Email deliverability to spam folders (Resend handles)
- Razorpay's own UI/UX
- Anthropic's response quality (we test wrapper, not the LLM)
- Internationalization (English only)
- Light theme (deliberately dark-only)
- Mobile native apps (web-only product)

---

## 12. Test Account

For TestSprite to log in and test authenticated flows:
- **Email:** vinodkondeti081@gmail.com (Google OAuth)
- Free-tier account by default; manually upgrade in Supabase dashboard for paid-flow tests
