/**
 * Regression tests for fabricated or false-positive data in Naukri matching
 * and resume analysis — findings from the silent-failure review.
 *
 * Every case here was live: each asserts the opposite of what the old code
 * did, so it fails against that code and passes against the fix.
 */
import { describe, expect, test } from 'vitest';
import {
  extractQuickProfile,
  extractContactInfo,
  buildNaukriSearchStrategy,
} from '@/lib/naukri/resume-analyzer';
import { scoreNaukriJob } from '@/lib/naukri/matcher';
import type { CandidateProfile, NaukriJobListing } from '@/lib/naukri/types';

const job = (o: Partial<NaukriJobListing> = {}): NaukriJobListing => ({
  id: 'j1',
  title: 'Engineer',
  company: 'Co',
  experienceText: '0-1 Yrs',
  experienceMin: 0,
  experienceMax: 1,
  salaryText: '',
  location: 'Bengaluru',
  workMode: 'onsite',
  skills: [],
  descriptionSnippet: '',
  jobUrl: 'https://www.naukri.com/job-listings-x-1',
  postedDateText: '',
  applyType: 'naukri_easy_apply',
  ...o,
});

const profile = (o: Partial<CandidateProfile> = {}): CandidateProfile => ({
  experienceLevel: 'fresher',
  totalYearsExperience: 0,
  targetRoles: [],
  coreSkills: [],
  domainInterests: [],
  preferredLocations: [],
  ...o,
});

describe('matcher — no phantom skill matches', () => {
  test('Java does not satisfy a JavaScript requirement', () => {
    // "javascript".includes("java") used to count as a match.
    const r = scoreNaukriJob(profile({ coreSkills: ['Java'] }), job({ skills: ['JavaScript'] }));
    expect(r.matchingSkills).toEqual([]);
  });

  test('TypeScript and JavaScript are not the same skill', () => {
    const r = scoreNaukriJob(profile({ coreSkills: ['TypeScript'] }), job({ skills: ['JavaScript'] }));
    expect(r.matchingSkills).toEqual([]);
  });

  test('React does not satisfy a job tagged with the category "Frontend"', () => {
    const r = scoreNaukriJob(profile({ coreSkills: ['React'] }), job({ skills: ['Frontend'] }));
    expect(r.matchingSkills).toEqual([]);
  });

  test('genuine spellings of the same technology still match', () => {
    const r = scoreNaukriJob(
      profile({ coreSkills: ['React.js', 'NodeJS', 'Tailwind CSS', 'JS'] }),
      job({ skills: ['React', 'Node.js', 'Tailwind', 'JavaScript'] })
    );
    expect(r.matchingSkills).toHaveLength(4);
  });

  test('a job with nothing in common can score below the old 15 floor', () => {
    const r = scoreNaukriJob(
      profile({ coreSkills: ['Java'] }),
      job({
        title: 'Principal Architect',
        skills: ['Go'],
        location: 'Mumbai',
        experienceMin: 5,
        experienceMax: 8,
        experienceText: '5-8 Yrs',
      })
    );
    expect(r.fitScore).toBeGreaterThanOrEqual(0);
    expect(r.fitScore).toBeLessThan(15);
  });

  test('a strong match never claims to be "verified"', () => {
    const r = scoreNaukriJob(
      profile({ coreSkills: ['React', 'TypeScript'], targetRoles: ['React Developer'], preferredLocations: ['Bengaluru'] }),
      job({ title: 'React Developer Fresher', skills: ['React', 'TypeScript'] })
    );
    expect(r.fitReason).not.toMatch(/verified/i);
  });
});

describe('resume analysis — nothing invented about the candidate', () => {
  const plain = `Jane Doe
jane@example.com
B.Tech Computer Science (2022 - 2026)
Skills: Java, SQL`;

  test('no expected salary or notice period is invented', () => {
    // These were `years * 3.5` and a hardcoded "30 Days", and they pre-filled
    // the auto-apply form sent to employers.
    const p = extractQuickProfile(plain);
    expect(p.expectedCtcLpa).toBeUndefined();
    expect(p.currentNoticePeriod).toBeUndefined();
  });

  test('domainInterests is not the same constant for every candidate', () => {
    expect(extractQuickProfile(plain).domainInterests).not.toEqual([
      'Software Engineering',
      'Web Development',
    ]);
  });

  test('a resume naming no city gets no preferred locations', () => {
    expect(extractQuickProfile(plain).preferredLocations).toEqual([]);
  });

  test('a heuristic profile says it is heuristic', () => {
    expect(extractQuickProfile(plain).analysisSource).toBe('heuristic');
  });

  test('graduation years past the old hardcoded window are still recognised', () => {
    // The literal /202[2-7]/ would silently stop matching 2028 graduates.
    const future = new Date().getFullYear() + 2;
    const p = extractQuickProfile(`Sam Rao\nsam@example.com\nB.Tech CSE (${future - 4} - ${future})\nSkills: Python`);
    expect(p.graduationYear).toBe(future);
  });

  test('a headline line is not taken as the candidate name', () => {
    const c = extractContactInfo(`Experienced Full-Stack Developer\nJane Doe\njane@example.com`);
    expect(c.name).toBe('Jane Doe');
  });

  test('an unlabelled 10-digit id is not taken as the phone number', () => {
    const c = extractContactInfo(`Jane Doe\njane@example.com\nEmployee ID 4155551234`);
    expect(c.phone).toBeUndefined();
  });
});

describe('search strategy — unknowns stay unknown', () => {
  test('no skills and no city does not become a React search in Bengaluru', () => {
    const s = buildNaukriSearchStrategy(profile({ targetRoles: ['Data Analyst'] }));
    expect(s.primarySearch.keywords.toLowerCase()).not.toContain('react');
    expect(s.primarySearch.cityTypeGid).toBeUndefined();
    expect(s.naukriDirectUrl).not.toContain('cityTypeGid');
    for (const alt of s.alternativeSearches) {
      expect(alt.location).toBeUndefined();
    }
  });
});
