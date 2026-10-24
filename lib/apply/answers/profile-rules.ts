/**
 * Deterministic answers taken straight from the applicant's profile.
 *
 * Rules run before the cache and the AI because a stored fact is the only
 * answer that is certainly true: a model asked "Expected CTC?" will produce a
 * plausible number, and plausible is exactly the failure this engine exists to
 * prevent.
 *
 * Two disciplines keep the rules honest:
 *
 *   1. A rule answers only when the profile actually has the value. 0 is a
 *      real value (a fresher's current CTC, zero years); an empty string or an
 *      empty list is not.
 *
 *   2. A rule whose label matched but whose value maps onto none of the
 *      options returns null, so the question falls through. Label regexes are
 *      approximate — "location" also matches "Are you comfortable with the job
 *      location?" — and a Yes/No form must not be blocked by a city name that
 *      could never fit it.
 *
 * Skill-specific experience ("years of experience in Java") is deliberately
 * NOT answered with total experience: a total is not a per-skill figure, and
 * GodsScion's bot learnt that on live forms.
 */
import type { Answer, ApplicantProfile, FormQuestion } from '@/lib/apply/types';
import {
  cleanText,
  isChoiceQuestion,
  matchOption,
  matchOptions,
  matchOptionStrict,
  matchQuantityOption,
  type Quantity,
} from './option-match';

interface Resolution {
  /** Free-text value. */
  text: string;
  /** For choice questions: compare bands numerically first. */
  quantity?: Quantity;
  /** For choice questions: tried in order through the full matcher. */
  candidates?: string[];
  /** For choice questions: tried in order through equality only (short or generic words). */
  strictCandidates?: string[];
  /** For multi-select questions: each mapped independently. */
  multi?: string[];
  /** For a single checkbox with no options. */
  checkbox?: boolean;
  reason: string;
}

interface Rule {
  name: string;
  applies(label: string, q: FormQuestion): boolean;
  resolve(p: ApplicantProfile, q: FormQuestion, label: string): Resolution | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const has = (s: string | undefined | null): s is string => typeof s === 'string' && s.trim() !== '';
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const formatNum = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
const yesNo = (b: boolean) => (b ? 'Yes' : 'No');
/** Yes/No questions ("Do you have...?") must not be read as asking for the value itself. */
const asksYesNo = (label: string) => /^(do|does|did|have|has|are|is|will|would|can|could)\b/.test(label);

/** Items joined until the next one would overflow `max`; never cuts an item in half. */
function joinWithin(items: string[], max: number): string {
  let out = '';
  for (const item of items) {
    const next = out ? `${out}, ${item}` : item;
    if (next.length > max) break;
    out = next;
  }
  return out;
}

function nameParts(fullName: string): string[] {
  return cleanText(fullName).split(' ').filter(Boolean);
}

/** Digits of the stored phone plus what we can honestly say about its country code. */
function phoneParts(phone: string): { national: string; code: string | null } | null {
  const cleaned = phone.replace(/[\s()-]/g, '');
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (cleaned.startsWith('+')) {
    return { national: digits.slice(-10), code: `+${digits.slice(0, digits.length - 10)}` };
  }
  if (digits.length === 12 && digits.startsWith('91')) return { national: digits.slice(2), code: '+91' };
  // A bare 10-digit number starting 6-9 is the Indian mobile format.
  if (digits.length === 10) return { national: digits, code: /^[6-9]/.test(digits) ? '+91' : null };
  return { national: digits.slice(-10), code: null };
}

const NOTICE_DAYS: Record<ApplicantProfile['noticePeriod'], number> = {
  Immediate: 0,
  '15 Days': 15,
  '30 Days': 30,
  '60 Days': 60,
  '90 Days': 90,
};

const DEGREES: { pattern: RegExp; names: string[]; level: 'bachelor' | 'master' | 'doctorate' | 'diploma' }[] = [
  { pattern: /^b\.?\s?tech/i, names: ['B.Tech', 'Bachelor of Technology'], level: 'bachelor' },
  { pattern: /^b\.?\s?e\.?$/i, names: ['B.E.', 'Bachelor of Engineering'], level: 'bachelor' },
  { pattern: /^b\.?\s?sc/i, names: ['B.Sc', 'Bachelor of Science'], level: 'bachelor' },
  { pattern: /^bca$/i, names: ['BCA', 'Bachelor of Computer Applications'], level: 'bachelor' },
  { pattern: /^b\.?\s?com/i, names: ['B.Com', 'Bachelor of Commerce'], level: 'bachelor' },
  { pattern: /^b\.?\s?a\.?$/i, names: ['B.A.', 'Bachelor of Arts'], level: 'bachelor' },
  { pattern: /^bachelor/i, names: [], level: 'bachelor' },
  { pattern: /^m\.?\s?tech/i, names: ['M.Tech', 'Master of Technology'], level: 'master' },
  { pattern: /^m\.?\s?e\.?$/i, names: ['M.E.', 'Master of Engineering'], level: 'master' },
  { pattern: /^m\.?\s?sc/i, names: ['M.Sc', 'Master of Science'], level: 'master' },
  { pattern: /^mca$/i, names: ['MCA', 'Master of Computer Applications'], level: 'master' },
  { pattern: /^(mba|pgdm)/i, names: ['MBA', 'PGDM', 'Master of Business Administration'], level: 'master' },
  { pattern: /^master/i, names: [], level: 'master' },
  { pattern: /^ph\.?\s?d/i, names: ['PhD', 'Ph.D', 'Doctorate'], level: 'doctorate' },
  { pattern: /diploma/i, names: ['Diploma'], level: 'diploma' },
];

const LEVEL_NAMES: Record<string, string[]> = {
  bachelor: ["Bachelor's Degree", "Bachelor's", 'Bachelors', 'Graduate', 'Graduation', 'UG'],
  master: ["Master's Degree", "Master's", 'Masters', 'Post Graduate', 'Postgraduate', 'PG'],
  doctorate: ['Doctorate', 'PhD'],
  diploma: ['Diploma'],
};

function degreeCandidates(degree: string): { full: string[]; strict: string[] } {
  const parts = degree.split(/\s*[/|,]\s*/).filter(Boolean);
  const strict: string[] = [];
  for (const part of parts) {
    const known = DEGREES.find((d) => d.pattern.test(part.trim()));
    if (!known) continue;
    strict.push(...known.names);
    for (const name of LEVEL_NAMES[known.level]) if (!strict.includes(name)) strict.push(name);
  }
  return { full: [degree, ...parts], strict };
}

const BRANCH_ABBREVIATIONS: [RegExp, string[]][] = [
  [/computer science/i, ['CSE', 'CS', 'Computer Science']],
  [/information technology/i, ['IT', 'Information Technology']],
  [/electronics (and|&) communication/i, ['ECE']],
  [/electrical (and|&) electronics/i, ['EEE']],
  [/mechanical/i, ['Mechanical', 'Mechanical Engineering']],
  [/civil/i, ['Civil', 'Civil Engineering']],
];

// ── Rules, most specific first ─────────────────────────────────────────────

const RULES: Rule[] = [
  {
    name: 'resume-file',
    applies: (label, q) => q.kind === 'file' && /\b(resume|cv|curriculum vitae)\b/.test(label),
    resolve: (p) => (has(p.resumePdfPath) ? { text: p.resumePdfPath, reason: 'Resume PDF from the profile.' } : null),
  },
  {
    name: 'email',
    applies: (label) =>
      /\be-?mail\b/.test(label) && !/\b(alternate|alternative|secondary|referr\w*|reference|manager|hr|recruiter)\b/.test(label),
    resolve: (p, q) =>
      has(p.email) && q.kind !== 'checkbox' ? { text: p.email.trim(), reason: 'Email from the profile.' } : null,
  },
  {
    name: 'phone-country-code',
    // "Phone (with country code)" wants the whole number, not just the code.
    applies: (label) =>
      /\b(country|dial(ing)?|isd) code\b/.test(label) && !/\b(number|with|including)\b/.test(label),
    resolve: (p) => {
      const parts = has(p.phone) ? phoneParts(p.phone) : null;
      return parts?.code
        ? { text: parts.code, candidates: [parts.code, parts.code.slice(1)], reason: 'Country code of the profile phone number.' }
        : null;
    },
  },
  {
    name: 'phone',
    applies: (label) =>
      /\b(phone|mobile|contact (no|number)|cell|whatsapp|telephone)\b/.test(label) &&
      !/\b(alternate|alternative|secondary|reference|referee|manager|hr)\b/.test(label),
    resolve: (p, q, label) => {
      const parts = has(p.phone) ? phoneParts(p.phone) : null;
      if (!parts || q.kind === 'checkbox') return null;
      const wantsCode = /\bwith (the )?(country|isd) code\b/.test(label);
      const wantsNational =
        /\b10[- ]digits?\b|\bwithout (the )?(country|isd) code\b/.test(label) ||
        q.kind === 'number' ||
        (q.maxLength !== undefined && q.maxLength <= 10);
      let text: string;
      if (wantsCode && parts.code) text = `${parts.code}${parts.national}`;
      else if (wantsNational || !parts.code) text = parts.national;
      else text = `${parts.code}${parts.national}`;
      return { text, reason: 'Phone number from the profile, formatted for this field.' };
    },
  },
  {
    name: 'first-name',
    applies: (label) => /\b(first|given) name\b|^fname\b/.test(label),
    resolve: (p) => {
      const parts = nameParts(p.fullName ?? '');
      return parts.length > 0 ? { text: parts[0], reason: 'First name from the profile full name.' } : null;
    },
  },
  {
    name: 'middle-name',
    applies: (label) => /\bmiddle name\b/.test(label),
    resolve: (p) => {
      const parts = nameParts(p.fullName ?? '');
      return parts.length >= 3
        ? { text: parts.slice(1, -1).join(' '), reason: 'Middle name from the profile full name.' }
        : null;
    },
  },
  {
    name: 'last-name',
    applies: (label) => /\b(last|family) name\b|\bsurname\b|^lname\b/.test(label),
    resolve: (p) => {
      const parts = nameParts(p.fullName ?? '');
      return parts.length >= 2 ? { text: parts[parts.length - 1], reason: 'Last name from the profile full name.' } : null;
    },
  },
  {
    name: 'full-name',
    applies: (label) =>
      (/^((your|full|candidate'?s?|applicant'?s?|legal|complete)\s+)*name\b/.test(label) || /\bfull name\b/.test(label)) &&
      !/\b(company|college|university|school|institute|employer|manager|father|mother|spouse|guardian|reference|referee|referr\w*|recruiter|project|file|user ?name|nick ?name)\b/.test(label),
    resolve: (p, q) =>
      has(p.fullName) && q.kind !== 'checkbox' ? { text: cleanText(p.fullName), reason: 'Full name from the profile.' } : null,
  },
  {
    name: 'linkedin',
    applies: (label) => /\blinked ?in\b/.test(label),
    resolve: (p) => (has(p.linkedinUrl) ? { text: p.linkedinUrl.trim(), reason: 'LinkedIn URL from the profile.' } : null),
  },
  {
    name: 'github',
    applies: (label) => /\bgit ?hub\b/.test(label),
    resolve: (p) => (has(p.githubUrl) ? { text: p.githubUrl.trim(), reason: 'GitHub URL from the profile.' } : null),
  },
  {
    name: 'portfolio',
    applies: (label) =>
      /\bportfolio\b|\bpersonal (website|site|url|web ?page)\b|^website\b|\bwebsite url\b/.test(label) &&
      !/\bcompany\b/.test(label),
    resolve: (p) => (has(p.portfolioUrl) ? { text: p.portfolioUrl.trim(), reason: 'Portfolio URL from the profile.' } : null),
  },
  {
    name: 'preferred-location',
    applies: (label) =>
      /\bpreferred (job |work )?(locations?|cit(y|ies))\b|\blocation preferences?\b|\bwhere would you (like|prefer) to work\b/.test(label),
    resolve: (p, q) => {
      const list = (p.preferredLocations ?? []).filter(has).map((s) => s.trim());
      if (list.length === 0) return null;
      return {
        text: joinWithin(list, q.maxLength ?? Infinity),
        candidates: list,
        multi: list,
        reason: 'Preferred locations from the profile.',
      };
    },
  },
  {
    name: 'relocation',
    applies: (label) => /\brelocat/.test(label),
    resolve: (p) => {
      if (typeof p.willingToRelocate !== 'boolean') return null;
      return {
        text: yesNo(p.willingToRelocate),
        candidates: [yesNo(p.willingToRelocate)],
        checkbox: p.willingToRelocate,
        reason: `Profile says the applicant is ${p.willingToRelocate ? '' : 'not '}willing to relocate.`,
      };
    },
  },
  {
    name: 'current-location',
    applies: (label) =>
      (/\bcurrent (location|city)\b|\b(city|location) of residence\b|\bwhere are you (currently )?(based|located|living)\b|\bcurrently (based|located|residing|living)\b|^(location|city|current location)\b\??$/.test(label)) &&
      !/\b(job|work|office|preferred|interview)\b/.test(label),
    resolve: (p) =>
      has(p.currentLocation)
        ? { text: p.currentLocation.trim(), candidates: [p.currentLocation.trim()], reason: 'Current location from the profile.' }
        : null,
  },
  {
    name: 'notice-period',
    applies: (label) =>
      /\bnotice period\b|\bhow soon can you (join|start)\b|\bjoining (time|period|availability)\b|\bwhen can you (join|start)\b|\bearliest (start|joining)\b|\bavailability to (join|start)\b/.test(label) &&
      !/\bserving\b|\blast working day\b|\bbuy ?out\b|\bnegotiab/.test(label),
    resolve: (p, q, label) => {
      if (!(p.noticePeriod in NOTICE_DAYS)) return null;
      const days = NOTICE_DAYS[p.noticePeriod];
      let text: string = p.noticePeriod;
      if (/\bmonths?\b/.test(label)) text = formatNum(days / 30);
      else if (/\bdays?\b/.test(label) || q.kind === 'number') text = String(days);
      return {
        text,
        quantity: { value: days, unit: 'day' },
        candidates: days === 0 ? ['Immediate', 'Immediately', 'Immediate joiner'] : [p.noticePeriod],
        reason: `Notice period from the profile: ${p.noticePeriod}.`,
      };
    },
  },
  {
    name: 'total-experience',
    applies: (label) =>
      /\bexperience\b/.test(label) &&
      !/\bintern/.test(label) &&
      !/\brelevant\b/.test(label) &&
      // "experience in Java" is a per-skill figure; "experience (in years)" is not.
      // The words need not be adjacent: "years of experience do you have in Java?".
      !/\bexperience\b.*\b(in|with|using|on)\s+(?!(years?|yrs|months?|the (it |software )?industry|industry|it\b|total|overall))[a-z]/.test(label) &&
      !/\byears? of \w+(\s\w+)? experience\b/.test(label.replace(/\byears? of (total|overall|work|professional|industry|it) experience\b/, '')) &&
      (/\b(total|overall|years?|yrs|months?|how (much|many)|work|professional|industry)\b/.test(label) || /^experience\b/.test(label)),
    resolve: (p, q, label) => {
      if (!isNum(p.totalExperienceYears) || p.totalExperienceYears < 0) return null;
      const years = p.totalExperienceYears;
      const mentionsMonths = /\bmonths?\b/.test(label);
      const mentionsYears = /\byears?\b|\byrs\b/.test(label);
      const whole = Math.floor(years);
      const months = Math.round((years - whole) * 12);
      let text: string;
      if (mentionsMonths && !mentionsYears) text = String(Math.round(years * 12));
      else if (mentionsMonths && mentionsYears) {
        if (q.kind === 'number') return null; // one number cannot hold "years and months"
        text = `${whole} years ${months} months`;
      } else text = formatNum(years);
      const reason = `Total experience from the profile: ${formatNum(years)} years.`;
      if (asksYesNo(label)) return { text: yesNo(years > 0), candidates: [yesNo(years > 0)], reason };
      return {
        text,
        quantity: { value: years, unit: 'year' },
        candidates: years === 0 ? ['Fresher', 'No experience'] : [],
        reason,
      };
    },
  },
  {
    name: 'expected-ctc',
    applies: (label) =>
      /\bexpected (annual )?(ctc|salary|compensation|package|pay)\b|\bsalary expectations?\b|\bexpectations? (on|for|of|regarding) (ctc|salary)\b|\bdesired (salary|ctc|compensation)\b/.test(label),
    resolve: (p, q, label) => ctcResolution(p.expectedCtcLpa, q, label, 'Expected'),
  },
  {
    name: 'current-ctc',
    applies: (label) =>
      /\bcurrent (annual )?(ctc|salary|compensation|package|pay)\b|\bpresent (ctc|salary|package)\b|\blast drawn (salary|ctc)\b|\bexisting (ctc|salary)\b/.test(label) &&
      !/\bexpected\b/.test(label),
    resolve: (p, q, label) => ctcResolution(p.currentCtcLpa, q, label, 'Current'),
  },
  {
    name: 'highest-degree',
    applies: (label) =>
      /\bhighest (degree|qualification|education(al)?( level| qualification)?)\b|\b(educational )?qualification\b|^degree\b|\bdegree (name|type|level|obtained|pursued)\b|\blevel of education\b|\beducation level\b/.test(label) &&
      !asksYesNo(label) &&
      !/\b(percentage|cgpa|gpa|marks|grade|score)\b/.test(label),
    resolve: (p) => {
      if (!has(p.highestDegree)) return null;
      const { full, strict } = degreeCandidates(p.highestDegree.trim());
      return { text: p.highestDegree.trim(), candidates: full, strictCandidates: strict, reason: 'Highest degree from the profile.' };
    },
  },
  {
    name: 'specialization',
    applies: (label) =>
      /\bspeciali[sz]ation\b|\bmajor\b|\bbranch\b|\bfield of study\b|\bdiscipline\b|\bstream\b/.test(label) &&
      !asksYesNo(label) &&
      !/\b(minor|12th|10th|school|hsc|ssc|intermediate)\b/.test(label),
    resolve: (p) => {
      if (!has(p.specialization)) return null;
      const spec = p.specialization.trim();
      const short = spec.replace(/\s+(and|&)\s+engineering$/i, '').replace(/\s+engineering$/i, '');
      const strict = BRANCH_ABBREVIATIONS.filter(([re]) => re.test(spec)).flatMap(([, names]) => names);
      return { text: spec, candidates: [spec, short], strictCandidates: strict, reason: 'Specialization from the profile.' };
    },
  },
  {
    name: 'graduation-year',
    applies: (label) =>
      /\b(graduation|passing|pass(ing)?[- ]?out|completion) year\b|\byear of (graduation|passing|completion|pass ?out)\b|\bbatch\b/.test(label) &&
      !/\b(12th|10th|school|hsc|ssc)\b/.test(label),
    resolve: (p) =>
      isNum(p.graduationYear) && p.graduationYear > 1900
        ? { text: String(p.graduationYear), candidates: [String(p.graduationYear)], reason: 'Graduation year from the profile.' }
        : null,
  },
  {
    name: 'college',
    applies: (label) =>
      /\bcollege\b|\buniversity\b|\binstitut(e|ion)\b|\balma mater\b/.test(label) &&
      !asksYesNo(label) &&
      !/\b(12th|10th|school|hsc|ssc)\b/.test(label),
    resolve: (p) =>
      has(p.collegeName)
        ? { text: p.collegeName.trim(), candidates: [p.collegeName.trim()], reason: 'College from the profile.' }
        : null,
  },
  {
    name: 'skills',
    applies: (label) =>
      (/^((key|technical|primary|core|top|your)\s+)?skills?( ?set)?\b/.test(label) ||
        /\b(list|mention) (your|the) (key |technical )?skills\b|\bskills you (have|know|possess)\b|\btech(nology)? stack\b/.test(label)) &&
      !/\b(rate|rating|level|proficien\w*|how (good|well|many|much)|years?)\b/.test(label),
    resolve: (p, q) => {
      const skills = (p.skills ?? []).filter(has).map((s) => s.trim());
      if (skills.length === 0) return null;
      return { text: joinWithin(skills, q.maxLength ?? Infinity), multi: skills, reason: 'Skills from the profile.' };
    },
  },
  {
    name: 'heard-about',
    applies: (label, q) =>
      isChoiceQuestion(q) &&
      /\bhow did you (hear|find|learn|come to know|come across|get to know)\b|\bwhere did you (hear|find|see|learn)\b|\bsource of (this )?(application|job|hire|information)\b|\bjob source\b|\breferral source\b|\bapplication source\b/.test(label),
    // Choice only: "Naukri" is entered only when the form itself offers it.
    resolve: () => ({ text: 'Naukri', strictCandidates: ['Naukri', 'Naukri.com', 'naukri com'], reason: 'Applying through Naukri.' }),
  },
];

function ctcResolution(lpa: number, q: FormQuestion, label: string, which: 'Current' | 'Expected'): Resolution | null {
  if (!isNum(lpa) || lpa < 0) return null;
  // Another currency, or a split the profile does not store.
  if (/\b(usd|eur|gbp|dollars?|euros?)\b|[$€£]|\b(variable|bonus|fixed|stock|esop|in[- ]hand)\b/.test(label)) return null;
  const monthly = /\bper month\b|\bmonthly\b|\bp\.?\s?m\b/.test(label);
  const lakhs = /\blpa\b|\blakhs?\b|\blacs?\b|\bin l\b/.test(label);
  const rupees = !lakhs && /\b(inr|rupees?|rs)\b|₹/.test(label);
  let text: string;
  if (monthly) text = String(Math.round((lpa * 100_000) / 12));
  else if (rupees) text = String(Math.round(lpa * 100_000));
  else if (lakhs || q.kind === 'number') text = formatNum(lpa);
  else text = `${formatNum(lpa)} LPA`;
  return {
    text,
    quantity: monthly ? undefined : { value: lpa, unit: 'lpa' },
    strictCandidates: lpa === 0 && which === 'Current' ? ['0', 'Fresher', 'Not applicable', 'NA', 'Nil'] : [],
    reason: `${which} CTC from the profile: ${formatNum(lpa)} LPA.`,
  };
}

function realise(q: FormQuestion, res: Resolution): Answer | null {
  const base = { questionId: q.id, label: q.label, source: 'profile' as const, confidence: 100, reason: res.reason };

  if (isChoiceQuestion(q)) {
    if (q.multiple && res.multi) {
      const hits = matchOptions(q.options, res.multi);
      return hits.length > 0 ? { ...base, value: hits.map((h) => h.value) } : null;
    }
    const option =
      (res.quantity ? matchQuantityOption(q.options, res.quantity) : null) ??
      (res.candidates ?? []).map((c) => matchOption(q.options, c)).find((o) => o !== null) ??
      (res.strictCandidates ?? []).map((c) => matchOptionStrict(q.options, c)).find((o) => o !== null) ??
      null;
    if (!option) return null;
    return { ...base, value: q.multiple ? [option.value] : option.value };
  }

  if (q.kind === 'checkbox') {
    return res.checkbox === undefined ? null : { ...base, value: res.checkbox ? 'true' : 'false' };
  }
  if (q.kind === 'select' || q.kind === 'radio') return null; // choice kind with no options: nothing to pick
  if (!res.text) return null;
  if (q.kind === 'number' && !/^\d+(\.\d+)?$/.test(res.text)) return null;
  if (q.maxLength !== undefined && res.text.length > q.maxLength) return null;
  return { ...base, value: res.text };
}

/** The profile's answer to a question, or null when no rule honestly applies. */
export function answerFromProfile(q: FormQuestion, profile: ApplicantProfile): Answer | null {
  const label = cleanText(q.label).toLowerCase();
  for (const rule of RULES) {
    if (!rule.applies(label, q)) continue;
    const res = rule.resolve(profile, q, label);
    if (!res) continue;
    const answer = realise(q, res);
    if (answer) return answer;
  }
  return null;
}
