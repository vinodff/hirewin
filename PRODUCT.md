# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** Students, freshers, and early-career tech engineers in India applying to jobs and internships at volume.
- **Secondary:** Mid-level software engineers tailoring applications per job description to improve callback rates; career switchers reframing past domain experience.

## Product Purpose

HireWin is an AI-powered resume optimization and job application platform. It bridges the gap between candidate resumes and job requirements by generating tailored, ATS-optimized rewrites backed by evidence, calculating objective trust scores, identifying interview probe risks, and drafting targeted outreach communications. Success means users land genuine recruiter callbacks and pass interviews without making falsified claims.

## Positioning

Unlike traditional resume builders that keyword-stuff resumes (often leading to candidate failure during technical interviews), HireWin scores the *trustworthiness* (0–100) of every bullet point, maps claimed skills directly to original evidence in the user's background (Verified / Partial / Weak / Unverified), and explicitly flags claims that recruiters are likely to drill into.

## Operating Context

- Web application built on Next.js 15 (App Router), React 18, and Tailwind CSS.
- User inputs: Resume upload (PDF/DOCX/text) and Job Description (text or JD link).
- Real-time streaming evaluations via Anthropic Claude Sonnet with Server-Sent Events (SSE).
- Storage and authentication via Supabase; payment processing in INR via Razorpay.
- Users evaluate metrics in high-stress, time-constrained job application sessions, requiring dense, scannable data displays rather than marketing fluff.

## Capabilities and Constraints

- **Core Capabilities:**
  - ATS compatibility scoring and job fit rating.
  - Bullet-by-bullet evidence mapping and truthfulness verification.
  - Recruiter interview question prediction and risk flagging.
  - Outreach generation (cold email, LinkedIn messages) per application.
  - Resume builder with live formatting and export (PDF/DOCX).
  - Curated opportunities board with deadlines, compensation transparency, and direct links.
- **Constraints:**
  - Resumes parsed up to 5MB.
  - Currency localized to INR (₹) for domestic Indian pricing tiers (Free, ₹99 Starter, ₹199/mo Pro, ₹399/mo Power).
  - No deceptive or unverified claims invented on the candidate's behalf.

## Brand Commitments

- **Tone & Identity:** Instrument, not brochure. High-precision engineering tool, dark theme (`#080C0F` ground, `#10B981` emerald accent).
- **Typography:** Archivo for display headers, Inter for interface copy, IBM Plex Mono for all numerical data, scores, and metrics.
- **Visual Truth:** Numbers and metrics represent real calculations. No superficial decoration disguised as data.

## Evidence on Hand

- `HireWin-PRD.md`: Complete functional requirements, tiering model, edge cases, and feature roadmap.
- `DESIGN.md`: Established token system, palette rules, typography scale, and data display guidelines.
- `app/`: Production codebase featuring Next.js 15 App Router pages for `/`, `/analyze`, `/builder`, `/opportunities`, `/ats-score-checker`, and `/pricing`.

## Product Principles

1. **Truth Over Hype:** Never invent credentials or fake experience to game ATS scanners; optimize the presentation of genuine candidate proof.
2. **Numbers Carry Gravity:** Every score, metric, or count is an instrument reading set in the data face (`IBM Plex Mono`) with clear attribution.
3. **Signal Over Decoration:** Color, status dots, and badges convey actionable status (verified, closing soon, attention needed) rather than aesthetic filler.
4. **Actionable Outcomes:** Every analysis must immediately give the candidate clear next steps: what to edit, what to defend in an interview, and whom to message.

## Accessibility & Inclusion

- Keyboard navigability across all core workflows (upload, review, edit, export).
- Minimum text size of 11px (`--text-micro`) with strict contrast standards against dark surfaces.
- Explicit text fallbacks for all icon buttons, status indicators, and screen-reader accessible forms.
