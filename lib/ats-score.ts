/**
 * Deterministic ATS scoring.
 *
 * The score used to come from the model, which meant two things went wrong:
 * the same resume scored differently on every run, and a resume HireWin had
 * already optimized got scored as if it were a bad "before" (the prompt told
 * the model that before-resumes score 20-50%).
 *
 * This is arithmetic instead. Same text + same keywords => same number, always.
 * The identical function scores the original and the optimized resume, so the
 * two are actually comparable — and the "after" is free to come out lower if
 * the rewrite genuinely didn't help.
 */

const WEIGHTS = {
  keywords: 50,
  sections: 15,
  contact: 10,
  bullets: 10,
  hazards: 10,
  length: 5,
} as const;

const MIN_WORDS = 300;
const MAX_WORDS = 1200;
const MAX_BULLET_WORDS = 20;

// Section headers a parser looks for. Experience and projects are
// interchangeable — a student with only projects isn't missing a section.
const SECTION_PATTERNS: RegExp[] = [
  /\b(professional\s+summary|summary|profile|objective)\b/i,
  /\b(technical\s+skills|skills|core\s+competencies)\b/i,
  /\b(experience|employment|work\s+history|projects?)\b/i,
  /\b(education|academic)\b/i,
];

const CONTACT_PATTERNS: RegExp[] = [
  /[\w.+-]+@[\w-]+\.[\w.]+/,                      // email
  /(\+?\d[\d\s().-]{7,}\d)/,                       // phone
  /\b(linkedin\.com|github\.com)\b/i,              // profile link
];

const ACTION_VERBS = [
  'built', 'developed', 'implemented', 'designed', 'integrated', 'debugged',
  'created', 'led', 'architected', 'spearheaded', 'scaled', 'managed',
  'delivered', 'launched', 'automated', 'optimized', 'reduced', 'improved',
  'migrated', 'refactored', 'deployed', 'maintained', 'analyzed', 'engineered',
  'collaborated', 'coordinated', 'authored', 'tested', 'configured', 'resolved',
];

/** Non-word chars collapse to spaces so "Node.js" matches "node js". */
function canonical(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Whole-token containment: "react" must not match "reactive", and multi-word
 * keywords ("rest apis") must appear as an adjacent run.
 */
function containsKeyword(haystackTokens: string[], keyword: string): boolean {
  const needle = canonical(keyword).split(' ').filter(Boolean);
  if (needle.length === 0) return false;
  for (let i = 0; i + needle.length <= haystackTokens.length; i++) {
    let hit = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystackTokens[i + j] !== needle[j]) { hit = false; break; }
    }
    if (hit) return true;
  }
  return false;
}

function keywordScore(tokens: string[], keywords: string[]): number {
  // De-dupe: the model can return the same keyword in matched and missing.
  const unique = Array.from(new Set(keywords.map(canonical).filter(Boolean)));
  if (unique.length === 0) return 1; // no JD signal — don't punish the resume
  const hits = unique.filter((k) => containsKeyword(tokens, k)).length;
  return hits / unique.length;
}

function sectionScore(text: string): number {
  const found = SECTION_PATTERNS.filter((re) => re.test(text)).length;
  return found / SECTION_PATTERNS.length;
}

function contactScore(text: string): number {
  const found = CONTACT_PATTERNS.filter((re) => re.test(text)).length;
  return found / CONTACT_PATTERNS.length;
}

function bulletScore(text: string): number {
  const bullets = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[•\-*•]/.test(l))
    .map((l) => l.replace(/^[•\-*•]\s*/, ''));

  if (bullets.length === 0) return 0;

  const good = bullets.filter((b) => {
    const words = b.split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > MAX_BULLET_WORDS) return false;
    return ACTION_VERBS.includes(canonical(words[0]));
  }).length;

  return good / bullets.length;
}

// The exact characters normalizeResumeText() strips — smart quotes, dashes,
// zero-width joiners, nbsp. Real ATS parsers mangle these.
const HAZARD_CHARS = /[—–“”„‟‘’‚‛…​‌‍⁠﻿ ]/g;

/**
 * Full credit when clean; the penalty scales with how much junk is in there
 * rather than being all-or-nothing.
 */
function hazardScore(text: string): number {
  const junkChars = (text.match(HAZARD_CHARS) || []).length;

  // One unbroken blob with no line breaks is unparseable regardless of chars.
  const lines = text.split('\n').filter((l) => l.trim()).length;
  const words = text.split(/\s+/).filter(Boolean).length;
  const blobPenalty = words > 100 && lines < 5 ? 0.5 : 0;

  const junkRatio = words > 0 ? junkChars / words : 0;
  return clamp01(1 - junkRatio - blobPenalty);
}

function lengthScore(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words >= MIN_WORDS && words <= MAX_WORDS) return 1;
  if (words < MIN_WORDS) return clamp01(words / MIN_WORDS);
  return clamp01(MAX_WORDS / words);
}

/**
 * Score a resume against a job description's keyword set.
 *
 * @param text       Resume plain text (original or optimized).
 * @param jdKeywords Keywords extracted from the JD. Must be the SAME list for
 *                   the before and after call, otherwise the two aren't comparable.
 * @returns Integer 0-100.
 */
export function scoreResume(text: string, jdKeywords: string[]): number {
  if (!text || !text.trim()) return 0;

  const tokens = canonical(text).split(' ').filter(Boolean);

  const total =
    keywordScore(tokens, jdKeywords) * WEIGHTS.keywords +
    sectionScore(text) * WEIGHTS.sections +
    contactScore(text) * WEIGHTS.contact +
    bulletScore(text) * WEIGHTS.bullets +
    hazardScore(text) * WEIGHTS.hazards +
    lengthScore(text) * WEIGHTS.length;

  return Math.round(clamp01(total / 100) * 100);
}
