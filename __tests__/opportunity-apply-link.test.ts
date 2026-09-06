import { describe, expect, test } from 'vitest';
import { inspectApplyUrl, isDirectApplyUrl } from '@/lib/opportunities/apply-link';

/**
 * The real URLs below were taken from live board responses while building the
 * ATS registry. The point of this check is that "Apply now" must land the
 * reader on ONE posting, never on a careers homepage or a search box.
 */

describe('real posting URLs are direct', () => {
  test.each([
    // Greenhouse — numeric id
    'https://job-boards.greenhouse.io/razorpaysoftwareprivatelimited/jobs/4731043005',
    // Greenhouse via a company domain that keeps the id in the query
    'https://stripe.com/jobs/search?gh_jid=8172508',
    // Lever — uuid
    'https://jobs.lever.co/meesho/8f2c1a30-4b7e-4a11-9c22-b7e1f0a91234',
    // Ashby — uuid
    'https://jobs.ashbyhq.com/sarvam/d3bc1ced-3ce4-4086-a050-555055dbb1ff',
    // SmartRecruiters — numeric id
    'https://jobs.smartrecruiters.com/BoschGroup/744000012345',
    // Workday — requisition number embedded in a slug
    'https://company.wd1.myworkdayjobs.com/en-US/careers/job/Bengaluru/Software-Intern_R-12345',
    // A descriptive slug with no id, but clearly one posting
    'https://careers.example.com/openings/software-engineering-intern-bengaluru-2026',
  ])('%s', (url) => {
    expect(isDirectApplyUrl(url)).toBe(true);
  });
});

describe('listing and search pages are not direct', () => {
  test.each([
    ['https://careers.google.com/', 'site root'],
    ['https://www.example.com', 'bare domain'],
    ['https://boards.greenhouse.io/example', 'board root'],
    ['https://careers.example.com/jobs', 'jobs index'],
    ['https://careers.example.com/careers', 'careers index'],
    ['https://example.com/openings', 'openings index'],
    ['https://example.com/positions/', 'positions index with a trailing slash'],
    ['https://jobs.example.com/search?q=intern', 'search results'],
    ['https://example.com/jobs?department=engineering', 'filtered list'],
    ['https://example.com/careers?location=bengaluru', 'location filter'],
  ])('%s (%s)', (url) => {
    expect(isDirectApplyUrl(url)).toBe(false);
  });

  test('explains why, in words an admin can act on', () => {
    expect(inspectApplyUrl('https://careers.example.com/jobs').reason).toContain('index');
    expect(inspectApplyUrl('https://example.com/jobs?q=intern').reason).toContain('filtered list');
    expect(inspectApplyUrl('https://example.com/').reason).toContain('site root');
  });
});

describe('an id in the query beats an otherwise bare path', () => {
  test('gh_jid makes a search URL direct', () => {
    // Stripe's own board links really are /jobs/search?gh_jid=… and they do go
    // to one posting. Treating the path alone would reject every Stripe row.
    const verdict = inspectApplyUrl('https://stripe.com/jobs/search?gh_jid=8172508');
    expect(verdict.direct).toBe(true);
    expect(verdict.reason).toContain('gh_jid');
  });

  test.each(['jobId', 'postingId', 'reqId', 'jid'])('%s also counts', (key) => {
    expect(isDirectApplyUrl(`https://example.com/careers?${key}=A1B2C3`)).toBe(true);
  });

  test('an id parameter too short to be an id does not count', () => {
    expect(isDirectApplyUrl('https://example.com/jobs?id=1')).toBe(false);
  });
});

describe('malformed input', () => {
  test.each([
    ['not-a-url', 'not a valid URL'],
    ['javascript:alert(1)', 'not an http(s) URL'],
    ['mailto:jobs@example.com', 'not an http(s) URL'],
    ['', 'not a valid URL'],
  ])('%s is rejected as %s', (url, reason) => {
    const verdict = inspectApplyUrl(url);
    expect(verdict.direct).toBe(false);
    expect(verdict.reason).toBe(reason);
  });
});

describe('identifier shapes', () => {
  test('a two-digit segment is not an id', () => {
    // "/en/2" is a page number, not a posting.
    expect(isDirectApplyUrl('https://example.com/careers/en/2')).toBe(false);
  });

  test('three digits or more is', () => {
    expect(isDirectApplyUrl('https://example.com/careers/1234')).toBe(true);
  });

  test('a short slug is not enough on its own', () => {
    // "about-us" and "life-at-example" are pages, not postings.
    expect(isDirectApplyUrl('https://example.com/careers/life-at-example')).toBe(false);
  });

  test('an id after the last segment still counts', () => {
    expect(isDirectApplyUrl('https://example.com/jobs/4731043005/apply')).toBe(true);
  });
});
