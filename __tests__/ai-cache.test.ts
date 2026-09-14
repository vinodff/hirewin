import { describe, expect, test } from 'vitest';
import { cacheKey } from '@/lib/ai/cache';

/**
 * The key IS the cache.
 *
 * Too strict and the hit rate collapses to nothing — every trailing newline
 * becomes a miss, and a miss is a whole request off a 50/day budget. Too loose
 * and someone is served an analysis of a different resume, which is far worse
 * than a wasted call. These tests pin both edges.
 */

const base = {
  resumeText: 'Vinod Kondeti. B.Tech CSE 2026. Next.js, Supabase, Python.',
  jobDescription: 'Backend Intern, Bengaluru. Python, REST, SQL.',
};

describe('cacheKey — what must COLLIDE', () => {
  test('identical input gives an identical key', () => {
    expect(cacheKey(base)).toBe(cacheKey({ ...base }));
  });

  test('whitespace differences collide', () => {
    // A pasted resume picks up stray newlines and double spaces constantly.
    // Treating those as different inputs would cost a request for nothing.
    expect(cacheKey(base)).toBe(
      cacheKey({
        ...base,
        resumeText: '  Vinod Kondeti.   B.Tech CSE 2026.\n\nNext.js, Supabase, Python.  ',
      })
    );
  });

  test('case differences collide', () => {
    expect(cacheKey(base)).toBe(
      cacheKey({ ...base, resumeText: base.resumeText.toUpperCase() })
    );
  });

  test('an absent option and its default collide', () => {
    // `resumeLength: undefined` and `'auto'` are the same request, and the
    // route passes whichever the UI happened to send.
    expect(cacheKey(base)).toBe(cacheKey({ ...base, resumeLength: 'auto' }));
    expect(cacheKey(base)).toBe(cacheKey({ ...base, instructions: '' }));
    expect(cacheKey(base)).toBe(cacheKey({ ...base, instructions: '   ' }));
  });
});

describe('cacheKey — what must NOT collide', () => {
  test('a different resume', () => {
    expect(cacheKey(base)).not.toBe(
      cacheKey({ ...base, resumeText: 'Someone else entirely. MBA 2024.' })
    );
  });

  test('a different job description', () => {
    // The same resume against two jobs is the COMMON case, and serving the
    // wrong one would be the worst failure this cache could produce.
    expect(cacheKey(base)).not.toBe(
      cacheKey({ ...base, jobDescription: 'Frontend Engineer, Remote. React.' })
    );
  });

  test('different candidate instructions', () => {
    expect(cacheKey({ ...base, instructions: 'Emphasise leadership' })).not.toBe(
      cacheKey({ ...base, instructions: 'Emphasise data work' })
    );
  });

  test('a different length setting', () => {
    // One-page and two-page produce genuinely different resumes.
    expect(cacheKey({ ...base, resumeLength: '1page' })).not.toBe(
      cacheKey({ ...base, resumeLength: '2page' })
    );
  });

  test('keyword-stuffing mode is its own entry', () => {
    expect(cacheKey({ ...base, resumeLength: 'auto' })).not.toBe(
      cacheKey({ ...base, resumeLength: 'keyword-stuffing' })
    );
  });
});

describe('cacheKey — shape', () => {
  test('is a hex SHA-256, not the content', () => {
    // The key must never be readable. It goes in a primary-key index, and a
    // readable one would make that index an archive of who applied where.
    const key = cacheKey(base);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain('Vinod');
    expect(key.toLowerCase()).not.toContain('bengaluru');
  });

  test('swapping resume and job description does not collide', () => {
    // Guards against a key built by concatenating fields without separation,
    // where moving text across a boundary would produce the same string.
    expect(cacheKey({ resumeText: 'AAA', jobDescription: 'BBB' })).not.toBe(
      cacheKey({ resumeText: 'BBB', jobDescription: 'AAA' })
    );
  });
});
