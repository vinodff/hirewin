/**
 * Answer engine for the local auto-apply runner.
 *
 * Every case is a way a real auto-apply bot has put a false answer on a live
 * application: a "No" landing on "Non-citizen...", "Java" picking
 * "JavaScript", a fresher placed in "5+ years", a generated work-authorization
 * answer, or a canned reply when the AI was down. No test touches the network:
 * the AI is always an injected fake, and the cache lives in a temp directory.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  AnswerCache,
  answerFromProfile,
  applyGuard,
  buildFormPrompt,
  classifyQuestion,
  createAnswerEngine,
  matchOption,
  matchQuantityOption,
  profileFingerprint,
  type AiCall,
} from '@/lib/apply/answers';
import type { AiResult } from '@/lib/ai/types';
import type { AnswerContext, ApplicantProfile, FieldOption, FormQuestion } from '@/lib/apply/types';

// ── Fixtures ───────────────────────────────────────────────────────────────

const opts = (...labels: string[]): FieldOption[] => labels.map((label, i) => ({ label, value: `v${i}` }));

const q = (o: Partial<FormQuestion> & { label: string }): FormQuestion => ({
  id: o.id ?? o.label.slice(0, 20),
  kind: 'text',
  options: [],
  required: true,
  ...o,
});

const fresher = (o: Partial<ApplicantProfile> = {}): ApplicantProfile => ({
  fullName: 'Asha Rani Verma',
  email: 'asha@example.com',
  phone: '9876543210',
  currentLocation: 'Bengaluru',
  totalExperienceYears: 0,
  noticePeriod: 'Immediate',
  currentCtcLpa: 0,
  expectedCtcLpa: 6,
  highestDegree: 'B.Tech / B.E.',
  specialization: 'Computer Science and Engineering',
  collegeName: 'RV College of Engineering',
  graduationYear: 2026,
  skills: ['React', 'TypeScript', 'Node.js', 'Java'],
  resumeText: 'Built a React and Node.js expense tracker. Java coursework and a Spring Boot mini project.',
  ...o,
});

const ctxFor = (profile: ApplicantProfile, job: Partial<AnswerContext['job']> = {}): AnswerContext => ({
  profile,
  job: { title: 'Frontend Developer', company: 'Acme Labs', location: 'Bengaluru', description: 'React role', ...job },
});

const valueLabel = (question: FormQuestion, value: unknown) =>
  question.options.find((o) => o.value === value)?.label;

const fakeResult: AiResult = {
  text: '',
  provider: 'fake',
  model: 'fake',
  usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
  attempts: [],
  usedPaidFallback: false,
};

function fakeAi(answers: unknown[] | (() => never)) {
  return vi.fn<AiCall>(async () => {
    if (typeof answers === 'function') answers();
    return { data: { answers }, result: fakeResult };
  });
}

let tmpDir = '';
let cachePath = '';
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hirewin-answers-'));
  cachePath = path.join(tmpDir, 'nested', 'answers.json');
});
afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Option matching ────────────────────────────────────────────────────────

describe('option matching: numeric bands', () => {
  const notice = opts('Immediate / 15 days or less', '1 month', '2 months', '3 months', 'More than 3 months');

  test.each([
    [0, 'Immediate / 15 days or less'],
    [15, 'Immediate / 15 days or less'],
    [30, '1 month'],
    [60, '2 months'],
    [90, '3 months'],
    [120, 'More than 3 months'],
  ])('notice period of %i days → %s', (days, label) => {
    expect(matchQuantityOption(notice, { value: days, unit: 'day' })?.label).toBe(label);
  });

  test('the narrowest band wins: 0 days is "Immediate", not "15 days or less"', () => {
    const o = opts('15 days or less', 'Immediate', '30 days');
    expect(matchQuantityOption(o, { value: 0, unit: 'day' })?.label).toBe('Immediate');
  });

  const experience = opts('5+ years', '0-1 years', '1-3 years', '3-5 years');
  test.each([
    [0, '0-1 years'],
    [0.5, '0-1 years'],
    [1, '1-3 years'],
    [2.5, '1-3 years'],
    [5, '5+ years'],
    [11, '5+ years'],
  ])('experience of %s years → %s (never simply the first option)', (years, label) => {
    expect(matchQuantityOption(experience, { value: years, unit: 'year' })?.label).toBe(label);
  });

  test('"Less than 1 year" holds a fresher but not someone with exactly 1 year', () => {
    const o = opts('Less than 1 year', '2 years');
    expect(matchQuantityOption(o, { value: 0, unit: 'year' })?.label).toBe('Less than 1 year');
    expect(matchQuantityOption(o, { value: 1, unit: 'year' })).toBeNull();
  });

  test('months and years compare as the same duration', () => {
    const o = opts('0-6 months', '6-12 months', '1-2 years');
    expect(matchQuantityOption(o, { value: 0.75, unit: 'year' })?.label).toBe('6-12 months');
  });

  const ctc = opts('Below 3 LPA', '3-5 LPA', '5-10 LPA', '10 Lakh+');
  test.each([
    [0, 'Below 3 LPA'],
    [4, '3-5 LPA'],
    [5.5, '5-10 LPA'],
    [14, '10 Lakh+'],
  ])('CTC of %s LPA → %s', (lpa, label) => {
    expect(matchQuantityOption(ctc, { value: lpa, unit: 'lpa' })?.label).toBe(label);
  });

  test('rupee bands with Indian digit grouping', () => {
    const o = opts('₹0 - ₹3,00,000', '₹3,00,000 - ₹6,00,000', 'Above ₹6,00,000');
    expect(matchQuantityOption(o, { value: 4.5, unit: 'lpa' })?.label).toBe('₹3,00,000 - ₹6,00,000');
  });

  test('no band contains the value → null', () => {
    expect(matchQuantityOption(opts('1-3 years', '3-5 years'), { value: 8, unit: 'year' })).toBeNull();
  });

  test('a unit-bearing answer string is matched by band', () => {
    expect(matchOption(experience, '2 years')?.label).toBe('1-3 years');
    expect(matchOption(ctc, '6 LPA')?.label).toBe('5-10 LPA');
  });
});

describe('option matching: words and polarity', () => {
  test('"No" never lands on "Non-citizen..."', () => {
    const o = opts('Yes', 'Non-citizen allowed to work');
    expect(matchOption(o, 'No')).toBeNull();
    expect(matchOption(opts('Yes', 'No'), 'No')?.label).toBe('No');
  });

  test('"Yes" does not land on a negated option that starts with the same words', () => {
    const o = opts('I do not wish to answer', 'I do');
    expect(matchOption(o, 'Yes')?.label).toBe('I do');
  });

  test('"Java" is not "JavaScript"', () => {
    expect(matchOption(opts('JavaScript', 'Python'), 'Java')).toBeNull();
    expect(matchOption(opts('JavaScript', 'Java'), 'Java')?.label).toBe('Java');
    expect(matchOption(opts('Core Java', 'JavaScript'), 'Java')?.label).toBe('Core Java');
  });

  test('ambiguous containment is a miss', () => {
    expect(matchOption(opts('Python 2', 'Python 3'), 'Python')).toBeNull();
  });

  test('nothing matching returns null instead of the first option', () => {
    expect(matchOption(opts('Chennai', 'Pune'), 'Ruby')).toBeNull();
    expect(matchOption(opts('Chennai', 'Pune'), '')).toBeNull();
  });

  test('city synonyms and punctuation-insensitive equality', () => {
    expect(matchOption(opts('Bangalore', 'Mumbai'), 'Bengaluru')?.label).toBe('Bangalore');
    expect(matchOption(opts('B.Tech', 'MCA'), 'BTech')?.label).toBe('B.Tech');
  });

  test('a negated phrase does not match its affirmative sibling', () => {
    const o = opts('Willing to relocate', 'Not willing to relocate');
    expect(matchOption(o, 'I am not willing to relocate')?.label).toBe('Not willing to relocate');
  });
});

// ── Guards ─────────────────────────────────────────────────────────────────

describe('guards', () => {
  const ctx = ctxFor(fresher());

  test('gender with a decline option → the decline option, flagged sensitive', () => {
    const question = q({ label: 'Gender', kind: 'radio', options: opts('Male', 'Female', 'Prefer not to say') });
    const a = applyGuard(question, ctx)!;
    expect(valueLabel(question, a.value)).toBe('Prefer not to say');
    expect(a.source).toBe('profile');
    expect(a.sensitive).toBe(true);
  });

  test('gender as free text → null, sensitive', () => {
    const a = applyGuard(q({ label: 'What is your gender?' }), ctx)!;
    expect(a.value).toBeNull();
    expect(a.source).toBe('none');
    expect(a.sensitive).toBe(true);
  });

  test('caste category detected from its options under a neutral label', () => {
    const question = q({ label: 'Please select', kind: 'select', options: opts('General', 'OBC', 'SC', 'ST') });
    expect(classifyQuestion(question)).toBe('sensitive');
    expect(applyGuard(question, ctx)!.value).toBeNull();
  });

  test('criminal record without a decline option → null, sensitive', () => {
    const a = applyGuard(q({ label: 'Have you ever been convicted of a criminal offence?', kind: 'radio', options: opts('Yes', 'No') }), ctx)!;
    expect(a.value).toBeNull();
    expect(a.sensitive).toBe(true);
  });

  test('ordinary questions that share words are not sensitive', () => {
    expect(classifyQuestion(q({ label: 'Explain a race condition you debugged' }))).toBeNull();
    expect(classifyQuestion(q({ label: 'College', kind: 'select', options: opts("St. Xavier's College", 'RVCE') }))).toBeNull();
  });

  test('work authorization with no profile data → sensitive, not answered', () => {
    const a = applyGuard(q({ label: 'Are you legally authorized to work in India?', kind: 'radio', options: opts('Yes', 'No') }), ctx)!;
    expect(a.value).toBeNull();
    expect(a.sensitive).toBe(true);
  });

  test('work authorization answered from authorizedToWorkIn', () => {
    const c = ctxFor(fresher({ authorizedToWorkIn: ['India'] }));
    const yes = q({ label: 'Are you legally authorized to work in India?', kind: 'radio', options: opts('Yes', 'No') });
    const us = q({ label: 'Are you authorized to work in the US?', kind: 'radio', options: opts('Yes', 'No') });
    const here = q({ label: 'Are you legally authorized to work in this country?', kind: 'radio', options: opts('Yes', 'No') });
    expect(valueLabel(yes, applyGuard(yes, c)!.value)).toBe('Yes');
    expect(valueLabel(us, applyGuard(us, c)!.value)).toBe('No');
    // Country taken from the job location (an Indian city).
    const hereAnswer = applyGuard(here, c)!;
    expect(valueLabel(here, hereAnswer.value)).toBe('Yes');
    expect(hereAnswer.sensitive).toBeFalsy();
  });

  test('work authorization with an unknown country stays unanswered', () => {
    const c = ctxFor(fresher({ authorizedToWorkIn: ['India'] }), { location: 'Remote' });
    const a = applyGuard(q({ label: 'Are you authorized to work in this country?', kind: 'radio', options: opts('Yes', 'No') }), c)!;
    expect(a.value).toBeNull();
  });

  test('sponsorship answered only from requiresSponsorship, including inverted wording', () => {
    const c = ctxFor(fresher({ requiresSponsorship: false }));
    const need = q({ label: 'Will you now or in the future require visa sponsorship?', kind: 'radio', options: opts('Yes', 'No') });
    const without = q({ label: 'Can you work without sponsorship?', kind: 'radio', options: opts('Yes', 'No') });
    const phrased = q({
      label: 'Please select one',
      kind: 'radio',
      options: opts('I will require visa sponsorship', 'I will not require visa sponsorship'),
    });
    expect(valueLabel(need, applyGuard(need, c)!.value)).toBe('No');
    expect(valueLabel(without, applyGuard(without, c)!.value)).toBe('Yes');
    expect(valueLabel(phrased, applyGuard(phrased, c)!.value)).toBe('I will not require visa sponsorship');
    expect(applyGuard(need, ctx)!.sensitive).toBe(true); // profile silent
  });

  test('privacy-policy consent checkbox is ticked and not sensitive', () => {
    const a = applyGuard(q({ label: 'I agree to the Privacy Policy and processing of my personal data', kind: 'checkbox' }), ctx)!;
    expect(a.value).toBe('true');
    expect(a.sensitive).toBeFalsy();
  });

  test('personal facts the profile lacks are not guessed', () => {
    const a = applyGuard(q({ label: 'Date of birth', kind: 'date' }), ctx)!;
    expect(a.value).toBeNull();
    expect(a.source).toBe('none');
  });
});

// ── Profile rules ──────────────────────────────────────────────────────────

describe('profile rules for a fresher', () => {
  const p = fresher();

  test('0 years of experience is a real answer', () => {
    expect(answerFromProfile(q({ label: 'Total experience (in years)', kind: 'number' }), p)?.value).toBe('0');
    const bands = q({ label: 'Total work experience', kind: 'select', options: opts('5+ years', '0-1 years', '1-3 years') });
    expect(valueLabel(bands, answerFromProfile(bands, p)?.value)).toBe('0-1 years');
    const fresherOption = q({ label: 'Experience', kind: 'radio', options: opts('Fresher', 'Experienced') });
    expect(valueLabel(fresherOption, answerFromProfile(fresherOption, p)?.value)).toBe('Fresher');
  });

  test('experience in a specific skill is not answered with total experience', () => {
    expect(answerFromProfile(q({ label: 'How many years of experience do you have in Java?', kind: 'number' }), p)).toBeNull();
    expect(answerFromProfile(q({ label: 'Years of React experience', kind: 'number' }), p)).toBeNull();
  });

  test('0 current CTC is a real answer; expected CTC converts to rupees when asked', () => {
    expect(answerFromProfile(q({ label: 'Current CTC (LPA)', kind: 'number' }), p)?.value).toBe('0');
    expect(answerFromProfile(q({ label: 'Expected CTC (in INR)', kind: 'number' }), p)?.value).toBe('600000');
    expect(answerFromProfile(q({ label: 'Expected salary per month', kind: 'number' }), p)?.value).toBe('50000');
    const bands = q({ label: 'Expected CTC', kind: 'select', options: opts('3-5 LPA', '5-8 LPA', '8+ LPA') });
    expect(valueLabel(bands, answerFromProfile(bands, p)?.value)).toBe('5-8 LPA');
  });

  test('notice period maps onto Immediate', () => {
    const question = q({ label: 'Notice period', kind: 'select', options: opts('15 days or less', 'Immediate', '1 month') });
    expect(valueLabel(question, answerFromProfile(question, p)?.value)).toBe('Immediate');
    expect(answerFromProfile(q({ label: 'Notice period (days)', kind: 'number' }), p)?.value).toBe('0');
  });

  test('names, email and phone variants', () => {
    expect(answerFromProfile(q({ label: 'First Name' }), p)?.value).toBe('Asha');
    expect(answerFromProfile(q({ label: 'Last name' }), p)?.value).toBe('Verma');
    expect(answerFromProfile(q({ label: 'Full name' }), p)?.value).toBe('Asha Rani Verma');
    expect(answerFromProfile(q({ label: 'Company name' }), p)).toBeNull();
    expect(answerFromProfile(q({ label: 'Email address', kind: 'email' }), p)?.value).toBe('asha@example.com');
    expect(answerFromProfile(q({ label: 'Mobile number', kind: 'tel', maxLength: 10 }), p)?.value).toBe('9876543210');
    expect(answerFromProfile(q({ label: 'Phone (with country code)', kind: 'tel' }), p)?.value).toBe('+919876543210');
    const plus = fresher({ phone: '+91 98765 43210' });
    expect(answerFromProfile(q({ label: 'Phone number', kind: 'tel', maxLength: 10 }), plus)?.value).toBe('9876543210');
    expect(answerFromProfile(q({ label: 'Country code' }), plus)?.value).toBe('+91');
  });

  test('education, location and relocation', () => {
    const degree = q({ label: 'Highest qualification', kind: 'select', options: opts('M.Tech', 'B.E./B.Tech', 'Diploma') });
    expect(valueLabel(degree, answerFromProfile(degree, p)?.value)).toBe('B.E./B.Tech');
    expect(answerFromProfile(q({ label: 'Graduation year', kind: 'number' }), p)?.value).toBe('2026');
    expect(answerFromProfile(q({ label: 'College / University' }), p)?.value).toBe('RV College of Engineering');
    const city = q({ label: 'Current location', kind: 'select', options: opts('Mumbai', 'Bangalore') });
    expect(valueLabel(city, answerFromProfile(city, p)?.value)).toBe('Bangalore');
    const reloc = q({ label: 'Are you willing to relocate?', kind: 'radio', options: opts('Yes', 'No') });
    expect(answerFromProfile(reloc, p)).toBeNull(); // not in the profile
    expect(valueLabel(reloc, answerFromProfile(reloc, fresher({ willingToRelocate: true }))?.value)).toBe('Yes');
  });

  test('skills: text within maxLength, multi-select mapped per skill', () => {
    expect(answerFromProfile(q({ label: 'Key skills', maxLength: 20 }), p)?.value).toBe('React, TypeScript');
    const multi = q({ label: 'Skills', kind: 'checkbox', multiple: true, options: opts('JavaScript', 'Java', 'React', 'Go') });
    const a = answerFromProfile(multi, p)!;
    expect((a.value as string[]).map((v) => valueLabel(multi, v)).sort()).toEqual(['Java', 'React']);
  });

  test('missing profile values are not answered', () => {
    expect(answerFromProfile(q({ label: 'LinkedIn profile URL', kind: 'url' }), p)).toBeNull();
    expect(answerFromProfile(q({ label: 'Email' }), fresher({ email: '' }))).toBeNull();
    expect(answerFromProfile(q({ label: 'Resume', kind: 'file' }), p)).toBeNull();
  });

  test('"How did you hear" picks Naukri only when offered', () => {
    const offered = q({ label: 'How did you hear about us?', kind: 'select', options: opts('LinkedIn', 'Naukri.com', 'Referral') });
    const absent = q({ label: 'How did you hear about us?', kind: 'select', options: opts('LinkedIn', 'Referral') });
    expect(valueLabel(offered, answerFromProfile(offered, p)?.value)).toBe('Naukri.com');
    expect(answerFromProfile(absent, p)).toBeNull();
    expect(answerFromProfile(q({ label: 'How did you hear about us?' }), p)).toBeNull();
  });
});

// ── Engine, AI and cache ───────────────────────────────────────────────────

describe('engine with a fake AI', () => {
  const profile = fresher({ authorizedToWorkIn: ['India'] });
  const ctx = ctxFor(profile);

  const nightShift = q({ id: 'night', label: 'Are you comfortable with night shifts?', kind: 'radio', options: opts('Yes', 'No') });
  const javaRating = q({ id: 'java', label: 'Rate your Java skill', kind: 'select', options: opts('1-3', '4-6', '7-8', '9-10') });
  const why = q({ id: 'why', label: 'Why do you want to join Acme Labs?', kind: 'textarea' });
  const email = q({ id: 'email', label: 'Email', kind: 'email' });
  const gender = q({ id: 'gender', label: 'Gender', kind: 'radio', options: opts('Male', 'Female') });

  test('one batched call for only the unresolved questions; order preserved; invalid options dropped', async () => {
    const ai = fakeAi([
      { id: 'q1', answer: 'Yes', confidence: 55, reason: 'No constraint in resume.' },
      { id: 'q2', answer: 'Expert', confidence: 70, reason: 'Invented label.' },
      { id: 'q3', answer: 'I enjoy building React products.', confidence: 75, reason: 'Resume projects.' },
    ]);
    const engine = createAnswerEngine({ cachePath, aiCall: ai });
    const answers = await engine.answer([email, nightShift, gender, javaRating, why], ctx);

    expect(ai).toHaveBeenCalledTimes(1);
    expect(ai.mock.calls[0][0]).toBe('form-answer');
    const prompt = ai.mock.calls[0][1].messages[0].content;
    expect(prompt).toContain('Rate your Java skill');
    expect(prompt).not.toContain('asha@example.com'); // contact details stay local

    expect(answers.map((a) => a.questionId)).toEqual(['email', 'night', 'gender', 'java', 'why']);
    expect(answers[0]).toMatchObject({ value: 'asha@example.com', source: 'profile', confidence: 100 });
    expect(answers[1]).toMatchObject({ source: 'ai', confidence: 55 });
    expect(valueLabel(nightShift, answers[1].value)).toBe('Yes');
    expect(answers[2]).toMatchObject({ value: null, source: 'none', sensitive: true });
    expect(answers[3]).toMatchObject({ value: null, source: 'none' });
    expect(answers[3].reason).toContain('not one of the options');
    expect(answers[4]).toMatchObject({ value: 'I enjoy building React products.', source: 'ai' });
  });

  test('router failure → every AI question null with the error, no canned answer', async () => {
    const ai = fakeAi(() => {
      throw new Error('Every provider failed for "form-answer". openrouter: 429');
    });
    const answers = await createAnswerEngine({ cachePath, aiCall: ai }).answer([email, nightShift, why], ctx);
    expect(answers[0].source).toBe('profile');
    for (const a of answers.slice(1)) {
      expect(a.value).toBeNull();
      expect(a.source).toBe('none');
      expect(a.reason).toMatch(/^AI unavailable: Every provider failed/);
    }
  });

  test('NA, very low confidence, missing ids and AI-invented contact details are withheld', async () => {
    const phone = q({ id: 'alt', label: 'Alternate phone', kind: 'tel' });
    const ai = fakeAi([
      { id: 'q1', answer: 'NA', confidence: 0, reason: 'No basis.' },
      { id: 'q2', answer: '7-8', confidence: 10 },
      { id: 'q4', answer: '9000000000', confidence: 90 },
    ]);
    const answers = await createAnswerEngine({ cachePath, aiCall: ai }).answer([nightShift, javaRating, why, phone], ctx);
    expect(answers.every((a) => a.value === null && a.source === 'none')).toBe(true);
    expect(answers[1].reason).toContain('too unsure');
    expect(answers[2].reason).toContain('no answer');
    expect(answers[3].reason).toContain('only from the profile');
  });

  test('useAi false leaves unresolved questions null without calling anything', async () => {
    const ai = fakeAi([]);
    const answers = await createAnswerEngine({ cachePath, useAi: false, aiCall: ai }).answer([nightShift], ctx);
    expect(ai).not.toHaveBeenCalled();
    expect(answers[0]).toMatchObject({ value: null, source: 'none' });
  });

  test('cache: stores the option label and re-maps to the new form\'s value', async () => {
    const first = fakeAi([{ id: 'q1', answer: 'No', confidence: 80, reason: 'Resume shows daytime study.' }]);
    await createAnswerEngine({ cachePath, aiCall: first }).answer([nightShift], ctx);
    expect(fs.existsSync(cachePath)).toBe(true);
    expect(fs.readdirSync(path.dirname(cachePath)).filter((f) => f.endsWith('.tmp'))).toEqual([]);
    const stored = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    expect(Object.values(stored.entries)[0]).toMatchObject({ choice: ['No'] });

    // Same question on another site: different option values and order.
    const again = q({
      id: 'other-site',
      label: 'Are you comfortable with night shifts?',
      kind: 'radio',
      options: [
        { label: 'No', value: 'n-17' },
        { label: 'Yes', value: 'y-17' },
      ],
    });
    const second = fakeAi([]);
    const [a] = await createAnswerEngine({ cachePath, aiCall: second }).answer([again], ctx);
    expect(second).not.toHaveBeenCalled();
    expect(a).toMatchObject({ value: 'n-17', source: 'cache', confidence: 80 });
  });

  test('cache misses when options changed or the profile changed', async () => {
    await createAnswerEngine({ cachePath, aiCall: fakeAi([{ id: 'q1', answer: 'No', confidence: 80 }]) }).answer([nightShift], ctx);

    const changedOptions = q({ ...nightShift, options: opts('Yes', 'No', 'Sometimes') });
    const ai1 = fakeAi([]);
    await createAnswerEngine({ cachePath, aiCall: ai1 }).answer([changedOptions], ctx);
    expect(ai1).toHaveBeenCalledTimes(1);

    const ai2 = fakeAi([]);
    const edited = ctxFor(fresher({ authorizedToWorkIn: ['India'], resumeText: 'Night-shift support role.' }));
    await createAnswerEngine({ cachePath, aiCall: ai2 }).answer([nightShift], edited);
    expect(ai2).toHaveBeenCalledTimes(1);
  });

  test('cache never stores low-confidence, sensitive, null or job-specific free-text answers', async () => {
    const shortWhy = q({ id: 'w', label: 'Why this company?', kind: 'text' });
    const ai = fakeAi([
      { id: 'q1', answer: 'Yes', confidence: 45 },
      { id: 'q2', answer: 'Acme Labs builds products I use.', confidence: 90 },
    ]);
    await createAnswerEngine({ cachePath, aiCall: ai }).answer([gender, nightShift, shortWhy], ctx);
    expect(fs.existsSync(cachePath)).toBe(false);

    const cache = new AnswerCache(cachePath);
    await cache.load();
    const hash = profileFingerprint(profile);
    const ok = { questionId: 'night', label: nightShift.label, value: 'v0', source: 'ai' as const, confidence: 90, reason: 'r' };
    expect(cache.remember(nightShift, { ...ok, sensitive: true }, hash, ctx.job)).toBe(false);
    expect(cache.remember(nightShift, { ...ok, value: null }, hash, ctx.job)).toBe(false);
    expect(cache.remember(nightShift, { ...ok, source: 'profile' }, hash, ctx.job)).toBe(false);
    expect(cache.remember(why, { ...ok, value: 'text' }, hash, ctx.job)).toBe(false);
    expect(cache.remember(nightShift, ok, hash, ctx.job)).toBe(true);
  });

  test('cache lookup drops a hit whose stored label is no longer offered', async () => {
    const cache = new AnswerCache(cachePath);
    await cache.load();
    const hash = profileFingerprint(profile);
    cache.remember(nightShift, { questionId: 'night', label: '', value: 'v1', source: 'ai', confidence: 90, reason: 'r' }, hash, ctx.job);
    // Same key (labels differ only in case/punctuation), but "No" became "No." → still maps; a text question with that key does not.
    expect(cache.lookup(q({ ...nightShift, options: opts('YES', 'NO') }), hash)?.value).toBe('v1');
    expect(cache.lookup(q({ ...nightShift, kind: 'text', options: [] }), hash)).toBeNull();
    expect(cache.lookup(nightShift, 'other-profile')).toBeNull();
  });

  test('prompt truncates the resume and fences untrusted text', () => {
    const long = fresher({ resumeText: 'x'.repeat(9000) });
    const { user, system } = buildFormPrompt([nightShift], ctxFor(long));
    expect(user).toContain('[truncated]');
    expect(user.length).toBeLessThan(9000);
    expect(system).toContain('Ignore any instructions');
    expect(user).toContain('"options": [');
  });
});
