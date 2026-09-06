/**
 * Regression tests for gaps found by running the pipeline against live boards.
 *
 * Kept separate from opportunity-verify.test.ts and opportunity-region.test.ts,
 * which are straight ports of the BVCITS suites. These cover the two leaks the
 * first full harvest of 7,233 real postings actually exposed — cases the
 * original rules were written to stop but did not.
 */
import { describe, expect, test } from 'vitest';
import { isStudentLevel, verifyCandidate } from '@/lib/opportunities/verify';
import { classifyRegion, regionVerdict } from '@/lib/opportunities/region';
import type { OpportunityCandidate } from '@/lib/opportunities/types';

const NOW = new Date('2026-09-06T00:00:00Z');

function candidate(overrides: Partial<OpportunityCandidate> = {}): OpportunityCandidate {
  return {
    title: 'Backend Engineer',
    organization: 'Example Corp',
    kind: 'job',
    applyUrl: 'https://boards.greenhouse.io/example/jobs/1',
    location: 'Bengaluru, India',
    ...overrides,
  };
}

describe('seniority: a word between the rank and the role must not bypass the gate', () => {
  // Every title below was published to a student board by a live harvest before
  // SENIOR_MARKERS was widened. `staff\s+engineer` matched none of them.
  test.each([
    'Staff Backend Engineer',
    'Staff Site Reliability Engineer - Monitoring',
    'Staff Fullstack Engineer - Data Products',
    'Staff Infrastructure Security Engineer',
    'Lead Product Designer',
    'Distinguished Engineer',
    'Principal Software Engineer',
    'Senior Software Engineer',
  ])('%s is not student-level', (title) => {
    expect(isStudentLevel(candidate({ title }))).toBe(false);
  });

  test('a student title still wins outright over a seniority word', () => {
    // The reason bare `lead` and `staff` are safe to match: STUDENT_MARKERS is
    // consulted first, so this stays an internship.
    expect(isStudentLevel(candidate({ title: 'Lead Generation Intern', kind: 'internship' }))).toBe(
      true
    );
    expect(isStudentLevel(candidate({ title: 'Staff Engineering Intern', kind: 'internship' }))).toBe(
      true
    );
  });

  test('an ordinary entry-level title still passes', () => {
    expect(isStudentLevel(candidate({ title: 'Backend Engineer' }))).toBe(true);
    expect(isStudentLevel(candidate({ title: 'Graduate Engineer Trainee' }))).toBe(true);
  });

  test('seniority is not asked of a hackathon', () => {
    // Non-employment kinds have no seniority to speak of.
    expect(isStudentLevel(candidate({ title: 'Lead the Build Challenge', kind: 'hackathon' }))).toBe(
      true
    );
  });

  test('a senior role is rejected end to end, not merely held', () => {
    const verdict = verifyCandidate(candidate({ title: 'Staff Backend Engineer' }), {
      now: NOW,
      reachability: 'ok',
    });
    expect(verdict.status).toBe('rejected');
  });
});

describe('region: a stated location outvotes company boilerplate', () => {
  test('a Malaysian role at an Indian company is not Indian', () => {
    // Razorpay's Kuala Lumpur postings were published as Indian, because the
    // blurb underneath says "India's leading payments company". Both statements
    // are true; only the location says where the job is.
    const fit = classifyRegion({
      location: 'Malaysia',
      title: 'Software Development Engineer',
      description: "Razorpay is India's leading payments company, based in Bengaluru.",
      eligibility: null,
    });
    expect(fit).not.toBe('india');
  });

  test('such a posting is held for review rather than published', () => {
    const verdict = verifyCandidate(
      candidate({
        location: 'Malaysia',
        description: "India's leading payments company",
      }),
      { now: NOW, reachability: 'ok' }
    );
    expect(verdict.status).toBe('pending');
  });

  test('a genuinely Indian location still reads as India', () => {
    expect(classifyRegion({ location: 'Bengaluru, India', title: 'x', description: null, eligibility: null })).toBe(
      'india'
    );
    expect(classifyRegion({ location: 'Hyderabad', title: 'x', description: null, eligibility: null })).toBe('india');
  });

  test('India still wins over foreign WITHIN one location field', () => {
    // A multi-site posting is genuinely reachable from here.
    expect(
      classifyRegion({
        location: 'Bengaluru, India; London, United Kingdom',
        title: 'x',
        description: null,
        eligibility: null,
      })
    ).toBe('india');
  });

  test('an explicitly foreign location is still rejected outright', () => {
    expect(regionVerdict(candidate({ location: 'Santa Clara, California' })).acceptable).toBe(false);
  });

  test('with no location at all, the description is still consulted', () => {
    // The fallback path has to keep working — dropping it would lose every
    // posting that names its country only in prose.
    expect(
      classifyRegion({
        location: null,
        title: 'Backend Engineer',
        description: 'Join our Bengaluru office.',
        eligibility: null,
      })
    ).toBe('india');
  });

  test('a remote posting with no country is held, not published', () => {
    const verdict = regionVerdict(candidate({ location: 'Remote' }));
    expect(verdict.acceptable).toBe(true);
    expect(verdict.needsReview).toBe(true);
  });
});
