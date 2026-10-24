/**
 * Guards: questions an automated answer must not decide on its own.
 *
 * Adapted from averatec0773/offeros (packages/autofill/src/guards.ts),
 * Apache-2.0. The idea kept from there: the same question shows up as a radio
 * group on one site and a textarea on the next, so the classification lives in
 * one tested place and runs BEFORE any rule, cache or AI gets a say.
 *
 * Classes, and why each is handled the way it is:
 *
 *   sensitive      Demographic self-identification (gender, caste/reservation
 *                  category, religion, disability, veteran, ethnicity,
 *                  orientation, marital status, nationality), criminal record
 *                  and background checks, and legal attestations ("I certify
 *                  that..."). A guess is never appropriate. If the form offers
 *                  "Prefer not to say" that is chosen; otherwise the question
 *                  is left blank and marked sensitive so the caller routes the
 *                  job to needs_review.
 *
 *   sponsorship    Answered only from profile.requiresSponsorship.
 *   authorization  Answered only from profile.authorizedToWorkIn.
 *                  A wrong answer to either is a misrepresentation on a real
 *                  application, so when the profile does not say, they become
 *                  sensitive. Citizenship, visa status and permanent residency
 *                  cannot be derived from either field and are always sensitive.
 *
 *   no-basis       Personal facts the profile does not hold at all (date of
 *                  birth, Aadhaar, PAN, passport, parents' names). Not
 *                  sensitive, but no model may be asked, because the only thing
 *                  it could produce is an invention.
 *
 *   consent        Privacy-policy / data-processing / terms checkboxes. These
 *                  block submission when unticked and carry no claim about the
 *                  applicant, so they are ticked (owner decision) and the
 *                  reason records it.
 */
import type { Answer, AnswerContext, FieldOption, FormQuestion } from '@/lib/apply/types';
import {
  canonicalCountry,
  cleanText,
  countryOfPlace,
  findDeclineOption,
  isChoiceQuestion,
  matchOption,
  normalizeText,
  polarityOf,
} from './option-match';

export type GuardKind = 'sensitive' | 'sponsorship' | 'authorization' | 'no-basis' | 'consent';

const DEMOGRAPHIC =
  /\bgender\b|\bsex\b|\bpronouns?\b|\bcaste\b|\bsub-?caste\b|\breligio(n|us)\b|\bdisabilit(y|ies)\b|\bdisabled\b|\bdifferently[- ]abled\b|\bpwd\b|\bpwbd\b|\bhandicap|\bphysically challenged\b|\bveteran\b|\bex-?servicem[ae]n\b|\barmed forces\b|\bmilitary (service|status)\b|\bethnic(ity)?\b|\brace\b(?! condition)|\bracial\b|\bsexual orientation\b|\blgbt|\bmarital status\b|\bnationality\b|\breservation\b|\b(social|caste|reserved|reservation) category\b|\bobc\b|\bews\b|\bsc ?\/ ?st\b|\bscheduled (caste|tribe)s?\b/;

const CRIMINAL =
  /\bcriminal\b|\bconvict(ed|ion|ions)?\b|\bfelon(y|ies)?\b|\barrest(ed)?\b|\boffen[cs]es?\b|\bpending (legal |criminal |court )?(case|cases|charges?)\b|\bbackground (check|verification|screening)\b|\bpolice (record|verification|clearance)\b|\bdrug (test|screen)/;

const ATTESTATION =
  /\bi (hereby )?(certify|attest|declare|affirm|swear)\b|\bcertify that\b|\battest that\b|\bdeclaration\b/;

const SPONSORSHIP = /\bsponsor(ship|ed|ing)?\b|\bh-?1b\b/;

const AUTHORIZATION =
  /\bauthori[sz](ed|ation)\b.*\bwork\b|\bwork\b.*\bauthori[sz](ed|ation)\b|\b(legally|lawfully)\b.*\b(eligible|allowed|permitted|able|entitled)\b.*\bwork\b|\beligib(le|ility)\b.*\bto work\b|\bright to work\b|\bwork permit\b|\bpermitted to work\b|\ballowed to work\b/;

const OTHER_STATUS = /\bvisa\b|\bcitizen(ship)?\b|\bpermanent resident\b|\bgreen card\b|\bimmigration\b/;

const NO_BASIS =
  /\bdate of birth\b|\bdob\b|\bbirth ?date\b|\bwhat is your age\b|\byour age\b|^age\b|\baadha?ar\b|\bpan (card|number|no)\b|\bpassport (number|no)\b|\b(father|mother|spouse|guardian)'?s? name\b|\bblood group\b/;

const CONSENT =
  /\bprivacy (policy|notice|statement)\b|\bdata (processing|protection|privacy)\b|\bprocess(ing)? (of )?my (personal )?(data|information)\b|\bpersonal (data|information)\b.*\b(consent|agree|process)|\bgdpr\b|\bterms (of (use|service)|and conditions|& conditions)\b/;

const GENDER_OPTIONS = new Set(['male', 'female', 'man', 'woman', 'transgender', 'non binary', 'nonbinary']);
const CATEGORY_OPTIONS = new Set(['general', 'gen', 'obc', 'obc ncl', 'sc', 'st', 'ews', 'sc st']);
const RELIGION_OPTIONS = new Set(['hindu', 'muslim', 'christian', 'sikh', 'buddhist', 'jain', 'parsi']);

/**
 * A neutral label ("Please select") can carry sensitive OPTIONS. Counting
 * exact option labels, not substrings, keeps "St. Xavier's College" in a
 * college list from reading as a caste category.
 */
function sensitiveOptionSet(options: FieldOption[]): boolean {
  const labels = options.map((o) => normalizeText(o.label));
  const count = (set: Set<string>) => labels.filter((l) => set.has(l)).length;
  const gender = labels.includes('male') || labels.includes('female');
  return (gender && count(GENDER_OPTIONS) >= 2) || count(CATEGORY_OPTIONS) >= 2 || count(RELIGION_OPTIONS) >= 2;
}

/** The guard class for a question, or null for an ordinary one. Most restrictive wins. */
export function classifyQuestion(q: FormQuestion): GuardKind | null {
  const label = cleanText(q.label).toLowerCase();
  const withOptions = [label, ...q.options.map((o) => cleanText(o.label).toLowerCase())].join(' \n ');

  if (DEMOGRAPHIC.test(label) || CRIMINAL.test(label) || ATTESTATION.test(label)) return 'sensitive';
  if (sensitiveOptionSet(q.options)) return 'sensitive';
  // Options count here: "Please select one" → "I will not require visa sponsorship".
  if (SPONSORSHIP.test(withOptions)) return 'sponsorship';
  if (AUTHORIZATION.test(withOptions)) return 'authorization';
  if (OTHER_STATUS.test(label)) return 'sensitive';
  if (NO_BASIS.test(label)) return 'no-basis';
  if (CONSENT.test(label) && (q.kind === 'checkbox' || isChoiceQuestion(q))) return 'consent';
  return null;
}

// ── Answer builders ────────────────────────────────────────────────────────

function base(q: FormQuestion): Pick<Answer, 'questionId' | 'label'> {
  return { questionId: q.id, label: q.label };
}

function wrap(q: FormQuestion, value: string): string | string[] {
  return q.multiple ? [value] : value;
}

/** Choose "Prefer not to say" when offered; otherwise leave blank and flag. */
export function sensitiveAnswer(q: FormQuestion, why: string): Answer {
  const decline = isChoiceQuestion(q) ? findDeclineOption(q.options) : null;
  if (decline) {
    return {
      ...base(q),
      value: wrap(q, decline.value),
      source: 'profile',
      confidence: 100,
      reason: `${why}; chose "${decline.label}" rather than answer for the applicant.`,
      sensitive: true,
    };
  }
  return {
    ...base(q),
    value: null,
    source: 'none',
    confidence: 0,
    reason: `${why}; left for the applicant (no "prefer not to say" option).`,
    sensitive: true,
  };
}

/**
 * A known yes/no fact entered in whatever shape the field has. A single
 * checkbox with no options is 'true' (tick) or 'false' (leave unticked).
 */
export function yesNoAnswer(q: FormQuestion, yes: boolean, reason: string): Answer {
  let value: string | string[] | null;
  if (isChoiceQuestion(q)) {
    const option = matchOption(q.options, yes ? 'Yes' : 'No');
    if (!option) {
      return {
        ...base(q),
        value: null,
        source: 'none',
        confidence: 0,
        reason: `${reason} But no option clearly means "${yes ? 'Yes' : 'No'}".`,
      };
    }
    value = wrap(q, option.value);
  } else if (q.kind === 'checkbox') {
    value = yes ? 'true' : 'false';
  } else {
    value = yes ? 'Yes' : 'No';
  }
  return { ...base(q), value, source: 'profile', confidence: 100, reason };
}

function sponsorshipAnswer(q: FormQuestion, ctx: AnswerContext): Answer {
  const requires = ctx.profile.requiresSponsorship;
  if (typeof requires !== 'boolean') {
    return sensitiveAnswer(q, 'Visa sponsorship is not recorded in the profile');
  }
  // "Can you work without sponsorship?" asks the inverse.
  const label = cleanText(q.label).toLowerCase();
  const inverted = /\bwithout\b.*\bsponsor/.test(label);
  const yes = inverted ? !requires : requires;
  return yesNoAnswer(
    q,
    yes,
    `Profile says the applicant ${requires ? 'requires' : 'does not require'} visa sponsorship.`,
  );
}

function authorizationAnswer(q: FormQuestion, ctx: AnswerContext): Answer {
  const allowed = ctx.profile.authorizedToWorkIn?.filter((c) => c.trim() !== '') ?? [];
  if (allowed.length === 0) {
    return sensitiveAnswer(q, 'Work authorization is not recorded in the profile');
  }
  const allowedCountries = allowed.map((c) => canonicalCountry(c) ?? normalizeText(c));
  const listText = allowed.join(', ');

  // "Which countries are you authorized to work in?" with country options.
  if (isChoiceQuestion(q) && q.options.every((o) => polarityOf(o.label) === 'neutral')) {
    const hits = q.options.filter((o) => {
      const country = canonicalCountry(o.label) ?? normalizeText(o.label);
      return allowedCountries.includes(country);
    });
    if (hits.length > 0 && (q.multiple || hits.length === 1)) {
      return {
        ...base(q),
        value: q.multiple ? hits.map((h) => h.value) : hits[0].value,
        source: 'profile',
        confidence: 100,
        reason: `Profile lists work authorization for ${listText}.`,
      };
    }
    return {
      ...base(q),
      value: null,
      source: 'none',
      confidence: 0,
      reason: `Profile lists work authorization for ${listText}, but no option clearly matches.`,
    };
  }

  const country = canonicalCountry(q.label) ?? (ctx.job.location ? countryOfPlace(ctx.job.location) : null);
  if (!country) {
    return {
      ...base(q),
      value: null,
      source: 'none',
      confidence: 0,
      reason: 'Could not tell which country this work-authorization question is about.',
      sensitive: true,
    };
  }
  const yes = allowedCountries.includes(country);
  return yesNoAnswer(
    q,
    yes,
    `Profile lists work authorization for ${listText}; the question is about ${country}.`,
  );
}

function consentAnswer(q: FormQuestion): Answer {
  const reason = 'Privacy / data-processing / terms consent; ticked because the form cannot be submitted without it.';
  if (!isChoiceQuestion(q)) return { ...base(q), value: 'true', source: 'profile', confidence: 100, reason };

  const single = q.options.length === 1 && polarityOf(q.options[0].label) !== 'negative' ? q.options[0] : null;
  const option =
    single ??
    matchOption(q.options, 'Yes') ??
    q.options.find((o) => /\b(agree|accept|consent|acknowledge)\b/i.test(o.label) && polarityOf(o.label) !== 'negative') ??
    null;
  if (!option) {
    return { ...base(q), value: null, source: 'none', confidence: 0, reason: 'Consent question with no clear "agree" option.' };
  }
  return { ...base(q), value: wrap(q, option.value), source: 'profile', confidence: 100, reason };
}

/**
 * The guard's decision for a question, or null when no guard applies and the
 * normal pipeline (profile rules → cache → AI) should answer it.
 */
export function applyGuard(q: FormQuestion, ctx: AnswerContext): Answer | null {
  switch (classifyQuestion(q)) {
    case 'sensitive':
      return sensitiveAnswer(q, 'Sensitive question (self-identification, background or legal attestation)');
    case 'sponsorship':
      return sponsorshipAnswer(q, ctx);
    case 'authorization':
      return authorizationAnswer(q, ctx);
    case 'no-basis':
      return {
        ...base(q),
        value: null,
        source: 'none',
        confidence: 0,
        reason: 'Asks for a personal detail the profile does not hold; not guessed.',
      };
    case 'consent':
      return consentAnswer(q);
    default:
      return null;
  }
}
