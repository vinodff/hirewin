# Design System — HireWin

Inferred from the shipped codebase (`app/globals.css`, `app/layout.tsx`, `tailwind.config.ts`)
rather than invented. This file documents what already existed and the rules the
`/opportunities` page added on top.

## Product Context
- **What this is:** An AI resume optimizer. Upload a resume and a job, get a tailored
  rewrite, an ATS score, a skill-gap read, and cold outreach in one pass.
- **Who it's for:** Students and early-career engineers applying at volume, mostly in India.
- **Space:** Job-search tooling. Peers: Jobscan, Teal, Rezi, Simplify.
- **Project type:** Web app with a marketing front.

## Aesthetic Direction
- **Direction:** Instrument, not brochure. Dark, dense, engineered.
- **Decoration level:** Intentional. Glow and lift tokens exist and are used sparingly
  as signal, never as ornament.
- **Mood:** The product should feel like a measuring device. It reports numbers about
  your resume; the interface should look like something that measures.
- **The memorable thing:** the score moved, and you can see exactly why.

This is stated outright in `app/layout.tsx`: the mono data face exists because
"this product's substance is numbers ... setting them in an engineering face makes the
whole thing read as an instrument, which is exactly the brand claim." Every visual
decision serves that.

## Typography
Loaded through `next/font/google` — self-hosted, subset, no CDN, no layout shift.

- **Display:** Archivo 600/700 (`--font-display`). A sturdier grotesque than Inter so
  headlines read as a voice, not scaled-up body copy.
- **Body:** Inter (`--font-inter`). Already tuned for UI reading.
- **Data:** IBM Plex Mono 400/500 (`--font-data`), `tabular-nums` + slashed zero.
  Every number the product asserts goes here: scores, comp figures, counts.
- **Scale:** `--text-micro` 11px is the floor, nothing smaller ships.
  xs 12 / sm 14 / base 16 / lg 18.

**Rule:** if it is a number the user will compare or trust, it is set in the data face.

## Color
Near-black ground, emerald accent. Utilities are named `accent-*` rather than a hue
so a palette change never leaves class names lying.

| Token | Value | Use |
|---|---|---|
| `--ground` | `#080C0F` | Page background |
| `--surface` | `#111A20` | Raised card, hover state |
| `--surface-2` | `#0C1418` | Resting card |
| `--edge` | `rgba(255,255,255,0.07)` | Default border |
| `--edge-strong` | `rgba(255,255,255,0.12)` | Hover border |
| `--fg` | `#E9F0F3` | Primary text |
| `--dim` | `#7E8F9B` | Secondary text |
| `--faint` | `#4E5C66` | Labels, metadata |
| `--accent` | `#10B981` | Primary action, "good" |
| `--accent-soft` | `#34D399` | Accent text on dark |
| `--warn` | `#FBBF24` | Urgency, closing soon |
| `--danger` | `#F87171` | Failure |

**Rule:** color carries meaning. Emerald means verified or actionable, amber means time
pressure, faint means unverified. Never decorative.

## Spacing & Layout
- **Base unit:** 4px (Tailwind default scale).
- **Density:** Comfortable in marketing, compact in data views.
- **Max content width:** `max-w-6xl` for list/data pages, `max-w-7xl` for nav.
- **Radius:** `rounded-lg` (8px) for controls, `rounded-xl` (12px) for cards.
- **Sticky surfaces:** `rgba(var(--ground-rgb), 0.92)` + 12px backdrop blur. The nav
  uses it; any second sticky layer must sit at `top-14` to clear it.

## Motion
- **Approach:** Minimal-functional. Transitions confirm state, they do not perform.
- **Properties:** `color`, `background`, `border-color`, `opacity`, `transform` only.
- **Duration:** 150–250ms.

## Data Display Rules
Added by `/opportunities`, applies to any list of records:

1. **Absent is absent.** "Not specified", "-", and empty strings are normalized to
   `null` upstream and the element is not rendered. Never print a placeholder that
   looks like content.
2. **Status is a signal, not a badge.** A 1.5px dot in a semantic color, plus a count
   in the header so the whole list can be read at a glance.
3. **Unverified data stays visible and stays marked.** Dim it, label it, sort it last.
   Hiding data you collected is worse than labelling it.
4. **Rows collapse, cards do not.** When most records have empty fields, use rows.
   Cards leave holes that read as broken data.
5. **Filters derive from the data.** A new category in the source needs no code change.
6. **Label every filter dimension.** Two unlabelled chip rows with a shared value read
   as one confusing strip.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-08-06 | Documented the existing system rather than proposing a new one | Archivo/Inter/IBM Plex Mono + emerald-on-near-black was already shipped and coherent; the gap was that it lived only in CSS comments |
| 2026-08-06 | `/opportunities` uses an instrument list, not a card grid | 24 of 52 rows have no deadline and none have logos; cards would render half-empty |
| 2026-08-06 | Comp figures set in the data face as the row's visual hook | Comp is what makes a student click, and it is the one field competitors bury |
