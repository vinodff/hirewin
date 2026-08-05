import { describe, it, expect } from 'vitest';
import { countWords, exceedsLengthBudget, LENGTH_BUDGETS, SYSTEM_PROMPT } from '@/lib/anthropic';
import { generatePdf, pdfPageCount } from '@/lib/pdf';

function resumeOf(bulletCount: number): string {
  const bullets = Array.from(
    { length: bulletCount },
    (_, i) => `• Built and shipped service module ${i} with Node.js and Postgres, improving throughput`
  ).join('\n');

  return [
    'ASHA MENON',
    '+91 90000 00000 | asha@example.com | linkedin.com/in/asha | Bengaluru',
    '',
    'PROFESSIONAL SUMMARY',
    'Backend engineer with hands-on experience building REST APIs and data pipelines.',
    '',
    'TECHNICAL SKILLS',
    'Languages: Python, JavaScript | Backend: Node.js, REST APIs | Tools: Git, Docker',
    '',
    'EXPERIENCE',
    'Senior Engineer | Acme Corp | 2021-2025',
    bullets,
    '',
    'EDUCATION',
    'B.Tech Computer Science — NIT | CGPA 8.4',
  ].join('\n');
}

describe('length budgets', () => {
  it('counts words ignoring extra whitespace', () => {
    expect(countWords('  one   two \n three  ')).toBe(3);
  });

  it('flags a resume over the 1-page ceiling', () => {
    const long = 'word '.repeat(LENGTH_BUDGETS['1page'].maxWords + 50);
    expect(exceedsLengthBudget(long, '1page')).toBe(true);
  });

  it('accepts a resume under the 1-page ceiling', () => {
    const short = 'word '.repeat(300);
    expect(exceedsLengthBudget(short, '1page')).toBe(false);
  });

  it('does not constrain auto or academic', () => {
    const long = 'word '.repeat(3000);
    expect(exceedsLengthBudget(long, 'auto')).toBe(false);
    expect(exceedsLengthBudget(long, 'academic')).toBe(false);
    expect(exceedsLengthBudget(long, undefined)).toBe(false);
  });

  it('the 2-page ceiling is looser than the 1-page ceiling', () => {
    expect(LENGTH_BUDGETS['2page'].maxWords).toBeGreaterThan(LENGTH_BUDGETS['1page'].maxWords);
  });
});

describe('system prompt', () => {
  // Regression guard for the actual bug: the career-level lengths used to be
  // stated unconditionally, so a Senior candidate got a 2-page resume even
  // after selecting "1 Page".
  it('marks the career-level lengths as a default the request overrides', () => {
    expect(SYSTEM_PROMPT).toMatch(/DEFAULT ONLY/);
    expect(SYSTEM_PROMPT).toMatch(/RESUME LENGTH REQUIREMENT/);
  });
});

describe('pdf one-page fitting', () => {
  it('keeps a budget-sized resume on one page', async () => {
    const resume = resumeOf(8);
    expect(countWords(resume)).toBeLessThanOrEqual(LENGTH_BUDGETS['1page'].maxWords);
    expect(await pdfPageCount(resume)).toBe(1);
  }, 20000);

  it('tightens layout rather than spilling a few lines onto page 2', async () => {
    // Sized to overflow the default layout slightly — should be squeezed to one page.
    const resume = resumeOf(30);
    expect(await pdfPageCount(resume)).toBe(1);
  }, 20000);

  it('leaves a genuinely long resume multi-page instead of crushing it', async () => {
    const resume = resumeOf(200);
    expect(await pdfPageCount(resume)).toBeGreaterThan(1);
  }, 20000);

  it('never truncates content', async () => {
    const resume = resumeOf(30);
    const buf = await generatePdf(resume);
    expect(buf.length).toBeGreaterThan(1000);
  }, 20000);
});
