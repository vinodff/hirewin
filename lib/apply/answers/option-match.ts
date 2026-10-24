/**
 * Map a desired answer onto one of a form question's options.
 *
 * Adapted from averatec0773/offeros (packages/autofill/src/option-match.ts),
 * Apache-2.0, and from match_answer_to_option / find_bad_word in
 * GodsScion/Auto_job_applier_linkedIn (runAiBot.py), MIT.
 *
 * Why this is its own tested module rather than a `.includes()` in the
 * applier: every naive matcher the reference projects shipped first produced a
 * real wrong answer on a live form.
 *
 *   - `'no' in option` answered "Are you authorized to work?" with the option
 *     "Non-citizen allowed to work" — a No landing on a Yes-shaped option.
 *   - `'java' in option` picked "JavaScript".
 *   - "select the first option when nothing matches" put a fresher into
 *     "5+ years" because that happened to be listed first.
 *
 * So the rules are: whole words only, Yes/No polarity must agree, numbers are
 * compared as ranges rather than as text, ambiguity is a miss, and a miss is
 * `null` — the caller leaves the control alone rather than guessing.
 */
import type { FieldOption, FormQuestion } from '@/lib/apply/types';

// ── Text helpers ───────────────────────────────────────────────────────────

const CHOICE_KINDS = new Set<FormQuestion['kind']>(['select', 'combobox', 'radio', 'checkbox']);

/** A question whose answer must be one of its option values. */
export function isChoiceQuestion(q: Pick<FormQuestion, 'kind' | 'options'>): boolean {
  return CHOICE_KINDS.has(q.kind) && q.options.length > 0;
}

/** Unicode-normalised, curly quotes and dashes flattened, whitespace collapsed. */
export function cleanText(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Punctuation-insensitive form: "E-mail address" and "E‑mail  Address" both
 * become "e mail address". `+` and `#` survive so "C++" and "C#" stay distinct
 * from "C".
 */
export function normalizeText(s: string): string {
  return cleanText(s)
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, ' ')
    .trim();
}

/** "B.Tech" and "BTech" compare equal here; used only for equality, never containment. */
function compact(s: string): string {
  return cleanText(s)
    .toLowerCase()
    .replace(/[^a-z0-9+#]/g, '');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * True when `phrase` appears in `text` as a whole word or phrase.
 *
 * Boundaries are applied only on the alphanumeric edges of the phrase (the
 * find_bad_word rule), so ".NET" still matches "ASP.NET" while "Java" does
 * not match "JavaScript" and "no" does not match "Non-citizen".
 */
export function containsWord(text: string, phrase: string): boolean {
  const p = cleanText(phrase);
  if (!p) return false;
  const left = /^[A-Za-z0-9_]/.test(p) ? '(?<![A-Za-z0-9_])' : '';
  const right = /[A-Za-z0-9_]$/.test(p) ? '(?![A-Za-z0-9_])' : '';
  return new RegExp(left + escapeRegExp(p) + right, 'i').test(cleanText(text));
}

// ── Polarity ───────────────────────────────────────────────────────────────

export type Polarity = 'positive' | 'negative' | 'decline' | 'neutral';

const DECLINE_TERMS = [
  'prefer not',
  'decline',
  'not wish',
  "don't wish",
  'do not wish',
  'rather not',
  'not to disclose',
  'do not disclose',
  "don't disclose",
  'not disclosed',
  'not to say',
  'choose not',
  'not to answer',
  "don't want to answer",
  'not to specify',
];

const NEGATION_TERMS = [
  'no',
  'not',
  'never',
  "don't",
  'dont',
  "doesn't",
  "won't",
  "can't",
  'cannot',
  'unable',
  'unwilling',
  'disagree',
  'nope',
  'false',
];

const AFFIRM_TERMS = [
  'yes',
  'yeah',
  'yep',
  'agree',
  'i agree',
  'i do',
  'i have',
  'i am',
  'i will',
  'i can',
  'willing',
  'accept',
  'sure',
  'true',
];

const anyWord = (text: string, terms: string[]) => terms.some((t) => containsWord(text, t));

/**
 * Whether an option (or answer) reads as Yes, No, a decline, or neither.
 * Decline is checked first because "I don't wish to answer" also contains a
 * negation, and negation before affirmation because "I do not" contains "I do".
 */
export function polarityOf(text: string): Polarity {
  if (anyWord(text, DECLINE_TERMS)) return 'decline';
  if (anyWord(text, NEGATION_TERMS)) return 'negative';
  if (anyWord(text, AFFIRM_TERMS)) return 'positive';
  return 'neutral';
}

/**
 * Polarity of a desired answer, but only when the answer IS a yes/no.
 * "I am willing to relocate" is left to phrase matching; "Yes" and
 * "No, I am not" are polarity answers.
 */
function desiredPolarity(want: string): Polarity | null {
  const n = normalizeText(want);
  if (/^(yes|y|yeah|yep|true)\b/.test(n)) return 'positive';
  if (/^(no|n|nope|false)\b/.test(n)) return 'negative';
  if (anyWord(want, DECLINE_TERMS)) return 'decline';
  return null;
}

function pickByPolarity(options: FieldOption[], want: Polarity): FieldOption | null {
  const pool = options.filter((o) => polarityOf(o.label) === want);
  if (pool.length === 0) return null;
  if (pool.length === 1 || want === 'decline') return pool[0];
  // Several Yes-shaped options ("Yes", "Yes, with notice"): only a plain
  // "Yes"/"No" head settles it. Anything else is ambiguous, so a miss.
  const head = want === 'positive' ? 'yes' : want === 'negative' ? 'no' : null;
  if (!head) return null;
  const exact = pool.filter((o) => normalizeText(o.label) === head);
  if (exact.length === 1) return exact[0];
  const starts = pool.filter((o) => new RegExp(`^${head}\\b`).test(normalizeText(o.label)));
  return starts.length === 1 ? starts[0] : null;
}

/** The "Prefer not to say" / "Decline to self-identify" option, when there is one. */
export function findDeclineOption(options: FieldOption[]): FieldOption | null {
  return options.find((o) => polarityOf(o.label) === 'decline') ?? null;
}

const isNegated = (text: string) => {
  const p = polarityOf(text);
  return p === 'negative' || p === 'decline';
};

// ── Geography ──────────────────────────────────────────────────────────────

/**
 * Names forms use interchangeably. A profile saying "Bengaluru" must select
 * "Bangalore"; neither is wrong, and a miss here would push a plain location
 * question to the AI for no reason.
 */
const PLACE_SYNONYMS: string[][] = [
  ['bengaluru', 'bangalore'],
  ['mumbai', 'bombay'],
  ['gurugram', 'gurgaon'],
  ['chennai', 'madras'],
  ['kolkata', 'calcutta'],
  ['delhi', 'new delhi'],
  ['pune', 'poona'],
  ['thiruvananthapuram', 'trivandrum'],
  ['kochi', 'cochin'],
  ['mysuru', 'mysore'],
  ['vadodara', 'baroda'],
  ['visakhapatnam', 'vizag'],
  ['india', 'republic of india'],
  ['united states', 'united states of america', 'usa'],
  ['united kingdom', 'uk', 'great britain', 'britain'],
  ['united arab emirates', 'uae'],
];

function placeVariants(want: string): string[] {
  const n = normalizeText(want);
  const group = PLACE_SYNONYMS.find((g) => g.includes(n));
  return group ? group.filter((v) => v !== n) : [];
}

const COUNTRIES: string[][] = [
  ['india'],
  ['united states', 'united states of america', 'usa', 'america'],
  ['united kingdom', 'uk', 'great britain', 'britain', 'england'],
  ['canada'],
  ['australia'],
  ['germany'],
  ['singapore'],
  ['united arab emirates', 'uae', 'dubai'],
  ['netherlands'],
  ['ireland'],
  ['france'],
  ['japan'],
  ['new zealand'],
  ['european union', 'eu'],
];

const INDIAN_CITIES = [
  'bengaluru', 'bangalore', 'mumbai', 'delhi', 'new delhi', 'gurugram', 'gurgaon', 'noida',
  'hyderabad', 'chennai', 'pune', 'kolkata', 'ahmedabad', 'jaipur', 'kochi', 'cochin',
  'thiruvananthapuram', 'trivandrum', 'chandigarh', 'indore', 'coimbatore', 'nagpur',
  'lucknow', 'bhubaneswar', 'visakhapatnam', 'vizag', 'mysuru', 'mysore', 'vadodara',
  'surat', 'navi mumbai', 'thane', 'mohali', 'bhopal', 'madurai', 'vijayawada',
];

/** Canonical country name for text that names a country, else null. */
export function canonicalCountry(text: string): string | null {
  // "US" is only a country in capitals: lower-cased, "us" is "tell us about".
  // The lookahead also rejects "USD" and "USB".
  if (/\bU\.?S\.?A?\.?(?![A-Za-z])/.test(cleanText(text))) return 'united states';
  for (const group of COUNTRIES) {
    if (group.some((name) => containsWord(text, name))) return group[0];
  }
  return null;
}

/** Country the text refers to, falling back to "india" for a known Indian city. */
export function countryOfPlace(text: string): string | null {
  const country = canonicalCountry(text);
  if (country) return country;
  return INDIAN_CITIES.some((c) => containsWord(text, c)) ? 'india' : null;
}

// ── Quantities and ranges ──────────────────────────────────────────────────

export type QuantityUnit = 'year' | 'month' | 'week' | 'day' | 'lpa' | 'rupee';

export interface Quantity {
  value: number;
  unit: QuantityUnit;
}

type Family = 'duration' | 'money';

const FAMILY: Record<QuantityUnit, Family> = {
  year: 'duration',
  month: 'duration',
  week: 'duration',
  day: 'duration',
  lpa: 'money',
  rupee: 'money',
};

/**
 * Base units: days for durations, LPA for money. A year is 360 days so that
 * "12 months" and "1 year" land on the same number — the boundary between two
 * experience bands must not depend on which word the form used.
 */
const TO_BASE: Record<QuantityUnit, number> = {
  year: 360,
  month: 30,
  week: 7,
  day: 1,
  lpa: 1,
  rupee: 1 / 100_000,
};

export interface ParsedRange {
  /** In base units (days, or LPA). */
  min: number;
  max: number;
  minExclusive: boolean;
  maxExclusive: boolean;
  family: Family;
  /** Unit of the first number, for callers comparing a bare number. */
  unit: QuantityUnit;
}

const NUM_UNIT =
  /(\d[\d,]*(?:\.\d+)?)\s*(years?|yrs?|months?|mos|mths?|weeks?|wks?|days?|lpa|lakhs?|lacs?|lac|crores?|cr|l|k)?(?![a-z])/g;

function unitOf(token: string | undefined): { unit: QuantityUnit | null; factor: number } {
  if (!token) return { unit: null, factor: 1 };
  if (/^(years?|yrs?)$/.test(token)) return { unit: 'year', factor: 1 };
  if (/^(months?|mos|mths?)$/.test(token)) return { unit: 'month', factor: 1 };
  if (/^(weeks?|wks?)$/.test(token)) return { unit: 'week', factor: 1 };
  if (/^days?$/.test(token)) return { unit: 'day', factor: 1 };
  if (/^(crores?|cr)$/.test(token)) return { unit: 'lpa', factor: 100 };
  if (token === 'k') return { unit: null, factor: 1000 };
  return { unit: 'lpa', factor: 1 };
}

/**
 * Read a band like "0-1 years", "Less than 1 year", "5+ years",
 * "Immediate / 15 days or less", "More than 3 months", "3-5 LPA",
 * "₹3,00,000 - ₹5,00,000" or "10 Lakh+".
 *
 * `defaultUnit` covers labels with no unit at all ("0-2") — the caller knows
 * whether the question is about years or salary. Returns null for anything
 * that is not a quantity ("Serving notice period").
 */
export function parseRange(label: string, defaultUnit?: QuantityUnit): ParsedRange | null {
  const text = cleanText(label)
    .toLowerCase()
    .replace(/\b(an?|one)\s+(year|month|week|day)\b/g, '1 $2');
  const hasRupee = /₹|\brs\b|\binr\b|\brupees?\b/.test(text);
  const immediate = /\bimmediate(ly)?\b|\bavailable (now|immediately)\b|\bcurrently available\b/.test(text);
  const fresher = /\bfresher\b|\bno (prior |work )?experience\b|\bentry[- ]level\b/.test(text);

  const tokens: { n: number; unit: QuantityUnit | null }[] = [];
  for (const m of text.matchAll(NUM_UNIT)) {
    const { unit, factor } = unitOf(m[2]);
    const n = Number(m[1].replace(/,/g, '')) * factor;
    if (Number.isFinite(n)) tokens.push({ n, unit });
  }

  if (tokens.length === 0) {
    if (immediate || fresher) {
      return { min: 0, max: 0, minExclusive: false, maxExclusive: false, family: 'duration', unit: 'day' };
    }
    return null;
  }

  // "0-1 years": the 0 borrows the unit of the next number that has one.
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i].unit === null && i + 1 < tokens.length) tokens[i].unit = tokens[i + 1].unit;
  }
  for (const t of tokens) {
    if (t.unit !== null) continue;
    if (hasRupee) t.unit = 'rupee';
    else if (defaultUnit && FAMILY[defaultUnit] === 'money') t.unit = t.n >= 1000 ? 'rupee' : 'lpa';
    else if (defaultUnit) t.unit = defaultUnit;
    else return null;
  }

  const units = tokens.map((t) => t.unit as QuantityUnit);
  const family = FAMILY[units[0]];
  if (units.some((u) => FAMILY[u] !== family)) return null;
  const values = tokens.map((t) => t.n * TO_BASE[t.unit as QuantityUnit]);
  const base = { family, unit: units[0], minExclusive: false, maxExclusive: false };

  if (values.length >= 2) {
    const lo = immediate ? 0 : Math.min(values[0], values[1]);
    return { ...base, min: lo, max: Math.max(values[0], values[1]) };
  }

  const v = values[0];
  if (/\bor less\b|\bup ?to\b|\bwithin\b|\bat most\b|\band below\b|\bor below\b|\bmaximum\b|\bmax\b|<=|≤/.test(text)) {
    return { ...base, min: 0, max: v };
  }
  if (/\bless than\b|\blesser than\b|\bbelow\b|\bunder\b|</.test(text)) {
    return { ...base, min: 0, max: v, maxExclusive: true };
  }
  if (/\bat least\b|\bor more\b|\band above\b|\bor above\b|\bminimum\b|\bmin\b|\bplus\b|\+|>=|≥/.test(text)) {
    return { ...base, min: v, max: Infinity };
  }
  if (/\bmore than\b|\bgreater than\b|\babove\b|\bover\b|>/.test(text)) {
    return { ...base, min: v, max: Infinity, minExclusive: true };
  }
  return { ...base, min: immediate ? 0 : v, max: v };
}

const EPS = 1e-9;

function rangeContains(r: ParsedRange, v: number): boolean {
  const aboveMin = r.minExclusive ? v > r.min + EPS : v >= r.min - EPS;
  const belowMax = r.maxExclusive ? v < r.max - EPS : v <= r.max + EPS;
  return aboveMin && belowMax;
}

/**
 * The option whose band contains the quantity.
 *
 * When several bands contain it the narrowest wins ("Immediate" beats
 * "15 days or less" for a 0-day notice), and on a shared boundary the band
 * that STARTS at the value wins — 1 year of experience is "1-3 years", the
 * same convention as "5+ years" including 5.
 */
export function matchQuantityOption(options: FieldOption[], q: Quantity): FieldOption | null {
  const pick = (value: number): FieldOption | null => {
    const base = value * TO_BASE[q.unit];
    const hits: { option: FieldOption; width: number; atMin: boolean }[] = [];
    for (const option of options) {
      const r = parseRange(option.label, q.unit);
      if (!r || r.family !== FAMILY[q.unit] || !rangeContains(r, base)) continue;
      hits.push({ option, width: r.max - r.min, atMin: Math.abs(r.min - base) < 1e-6 });
    }
    // Boundary convention first, then width: 1 year is "1-3 years" even though
    // "0-1 years" is narrower. Among bands that all start at the value
    // ("Immediate" and "15 days or less" for 0 days) the narrowest wins.
    hits.sort((a, b) => Number(b.atMin) - Number(a.atMin) || a.width - b.width);
    return hits[0]?.option ?? null;
  };
  const exact = pick(q.value);
  if (exact) return exact;
  // Point-valued options ("1", "2", "3" years): 2.5 years honestly reads as "2".
  return Number.isInteger(q.value) ? null : pick(Math.floor(q.value));
}

const NUMERIC_ANSWER =
  /^(?:₹|rs\.?|inr)?\s*\d[\d,]*(?:\.\d+)?\s*(years?|yrs?|months?|weeks?|days?|lpa|lakhs?|lacs?|l)?$/i;

// ── The matcher ────────────────────────────────────────────────────────────

/**
 * Equality only: exact label, punctuation-insensitive, or compact ("BTech" =
 * "B.Tech"), including place synonyms. Used for short or generic candidates
 * ("BE", "Graduate") where containment would be a guess.
 */
export function matchOptionStrict(options: FieldOption[], desired: string): FieldOption | null {
  const want = cleanText(desired);
  if (!want || options.length === 0) return null;
  for (const variant of [want, ...placeVariants(want)]) {
    const lower = variant.toLowerCase();
    const n = normalizeText(variant);
    const c = compact(variant);
    const hit =
      options.find((o) => cleanText(o.label).toLowerCase() === lower) ??
      options.find((o) => normalizeText(o.label) === n) ??
      (c.length > 0 ? options.find((o) => compact(o.label) === c) : undefined);
    if (hit) return hit;
  }
  return null;
}

/**
 * The option that honestly carries `desired`, or null.
 *
 * Order: equality → Yes/No polarity → numeric band → whole-word containment
 * (unique, same negation). Never falls back to the first option.
 */
export function matchOption(options: FieldOption[], desired: string): FieldOption | null {
  const want = cleanText(desired);
  if (!want || options.length === 0) return null;

  const equal = matchOptionStrict(options, want);
  if (equal) return equal;

  const polarity = desiredPolarity(want);
  if (polarity) return pickByPolarity(options, polarity);

  if (NUMERIC_ANSWER.test(want)) {
    const point = parseRange(want);
    if (point && point.min === point.max) {
      return matchQuantityOption(options, { value: point.min / TO_BASE[point.unit], unit: point.unit });
    }
    // A bare number: compare in the unit the options themselves use.
    if (/^\d+(\.\d+)?$/.test(want)) {
      const unit = options.map((o) => parseRange(o.label)).find((r) => r !== null)?.unit;
      return unit ? matchQuantityOption(options, { value: Number(want), unit }) : null;
    }
    return null;
  }

  // Containment needs some substance: a two-letter "BE" inside "To be decided"
  // is a coincidence, not an answer.
  for (const variant of [want, ...placeVariants(want)]) {
    if (compact(variant).length < 3) continue;
    const negated = isNegated(variant);

    const forward = options.filter((o) => containsWord(o.label, variant) && isNegated(o.label) === negated);
    if (forward.length === 1) return forward[0];
    if (forward.length > 1) return null; // "Python" in both "Python 2" and "Python 3"

    const reverse = options
      .filter((o) => compact(o.label).length >= 3)
      .filter((o) => containsWord(variant, o.label) && isNegated(o.label) === negated)
      .sort((a, b) => cleanText(b.label).length - cleanText(a.label).length);
    if (reverse.length === 1) return reverse[0];
    if (reverse.length > 1 && cleanText(reverse[0].label).length > cleanText(reverse[1].label).length) {
      return reverse[0];
    }
    if (reverse.length > 1) return null;
  }
  return null;
}

/** Each desired answer mapped independently; misses dropped, duplicates removed. */
export function matchOptions(options: FieldOption[], desired: string[]): FieldOption[] {
  const out: FieldOption[] = [];
  for (const want of desired) {
    const hit = matchOption(options, want);
    if (hit && !out.some((o) => o.value === hit.value)) out.push(hit);
  }
  return out;
}
