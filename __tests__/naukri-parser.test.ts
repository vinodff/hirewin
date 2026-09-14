import { describe, it, expect } from 'vitest';
import { parseNaukriMarkdown } from '../lib/naukri/cloud-scraper';

describe('Naukri Markdown Scraper & Parser', () => {
  const sampleMarkdown = `
1 - 20 of 32903
# React Js Jobs

## [React JS Developer || Bangalore and Chennai | Immediate joiner](https://www.naukri.com/job-listings-react-js-developer-bangalore-and-chennai-immediate-joiner-capgemini-chennai-bengaluru-5-to-7-years-250326013315)

[Capgemini](https://www.naukri.com/capgemini-jobs-careers-649)[3.6](https://www.ambitionbox.com/reviews)

5-7 Yrs 11-12 Lacs PA Hybrid - Chennai, Bengaluru

Required Skills Strong experience in React.js, JavaScript, HTML5, CSS3 Experience with...

* Javascript
* React.Js
* Html/Css
* Typescript
* Redux
* Node.Js

3+ weeks ago save

## [Frontend React Developer (Fresher Batch 2024-2026)](https://www.naukri.com/job-listings-frontend-react-fresher-swiggy-bengaluru-0-to-1-years-987654321)

[Swiggy](https://www.naukri.com/swiggy-jobs-careers-101)[4.1](https://www.ambitionbox.com/reviews)

0-1 Yrs 7-9 Lacs PA Bengaluru

Looking for passionate freshers with hands-on React and TypeScript knowledge.

* React.Js
* JavaScript
* TypeScript
* Tailwind CSS

1 day ago
`;

  it('parses structured job listings from scraped markdown', () => {
    const jobs = parseNaukriMarkdown(sampleMarkdown);
    expect(jobs).toHaveLength(2);

    // Job 1 (Capgemini Experienced)
    expect(jobs[0].title).toBe('React JS Developer || Bangalore and Chennai | Immediate joiner');
    expect(jobs[0].company).toBe('Capgemini');
    expect(jobs[0].experienceMin).toBe(5);
    expect(jobs[0].experienceMax).toBe(7);
    expect(jobs[0].salaryText).toBe('11-12 Lacs PA');
    expect(jobs[0].workMode).toBe('hybrid');
    expect(jobs[0].skills).toContain('React.Js');
    expect(jobs[0].skills).toContain('Typescript');
    expect(jobs[0].id).toBe('250326013315');

    // Job 2 (Swiggy Fresher)
    expect(jobs[1].title).toBe('Frontend React Developer (Fresher Batch 2024-2026)');
    expect(jobs[1].company).toBe('Swiggy');
    expect(jobs[1].experienceMin).toBe(0);
    expect(jobs[1].experienceMax).toBe(1);
    expect(jobs[1].salaryText).toBe('7-9 Lacs PA');
    expect(jobs[1].skills).toContain('Tailwind CSS');
  });

  /*
   * This test used to assert the opposite: that a network timeout produced
   * eight "curated" listings. Those were invented — real employer names with
   * invented salaries, ratings and job URLs that resolve to nothing — and a
   * job seeker could not tell them from real openings.
   *
   * The behaviour being asserted now is that a parse failure yields NOTHING.
   * An empty list is a worse demo and an honest product.
   */
  it('returns nothing rather than inventing jobs when parsing fails', () => {
    expect(parseNaukriMarkdown('')).toEqual([]);
    expect(parseNaukriMarkdown('not a job board at all')).toEqual([]);
    expect(parseNaukriMarkdown('## [Heading](https://example.com/not-naukri)')).toEqual([]);
  });

  it('never returns a job without a real Naukri URL', () => {
    // The fabricated listings built URLs from a counter
    // (naukri-job-100000000), which looked plausible and led nowhere. Any
    // listing that survives parsing must carry a URL that came from the page.
    for (const job of parseNaukriMarkdown(sampleMarkdown)) {
      expect(job.jobUrl).toMatch(/^https:\/\/www\.naukri\.com\/job-listings-/);
      expect(job.jobUrl).not.toMatch(/naukri-job-\d+$/);
    }
  });
});
