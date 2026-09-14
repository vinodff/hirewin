import type { NaukriJobListing, NaukriSearchParams } from './types';

/**
 * Deterministic parser that parses Naukri job listings from scraped markdown
 * (such as Jina Reader output from https://r.jina.ai/https://www.naukri.com/...).
 */
export function parseNaukriMarkdown(markdown: string): NaukriJobListing[] {
  const jobs: NaukriJobListing[] = [];
  if (!markdown || markdown.length < 100) return jobs;

  // Split content by job heading blocks: ## [Title](URL)
  const jobBlocks = markdown.split(/\n(?=##\s+\[)/g);

  for (const block of jobBlocks) {
    if (!block.trim().startsWith('## [')) continue;

    try {
      // 1. Title and URL
      const titleMatch = block.match(/##\s+\[([^\]]+)\]\((https?:\/\/www\.naukri\.com\/job-listings-[^)]+)\)/i);
      if (!titleMatch) continue;

      const title = titleMatch[1].trim();
      const jobUrl = titleMatch[2].trim().split(' ')[0]; // strip optional markdown title

      // Extract unique Naukri Job ID from URL (e.g. -250326013315 or similar)
      const idMatch = jobUrl.match(/-([a-zA-Z0-9]{8,15})(?:\?|$)/);
      const id = idMatch ? idMatch[1] : `naukri-${Math.abs(hashString(jobUrl))}`;

      // 2. Company Name & Rating
      let company = 'Hiring Company';
      let companyRating: number | undefined;
      let companyReviewsCount: number | undefined;

      const companyMatch = block.match(/\[([A-Za-z0-9\s.,&'-]+)\]\(https?:\/\/www\.naukri\.com\/[^/]+-jobs-careers-\d+/i);
      if (companyMatch) {
        company = companyMatch[1].trim();
      } else {
        // Fallback line right after title
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 1 && !lines[1].startsWith('![')) {
          company = lines[1].replace(/\[|\]/g, '').split('(')[0].trim();
        }
      }

      const ratingMatch = block.match(/\[([1-5]\.\d)\]\(https?:\/\/www\.ambitionbox\.com/i);
      if (ratingMatch) {
        companyRating = parseFloat(ratingMatch[1]);
      }

      // 3. Experience, Salary, Location
      let experienceText = '0-1 Yrs';
      let experienceMin = 0;
      let experienceMax = 1;
      let salaryText = 'Not Disclosed';
      let location = 'India';
      let workMode: 'onsite' | 'remote' | 'hybrid' = 'onsite';

      // Experience extraction: handles "5-7 Yrs", "0-1 Years", "Fresher", and "6 months duration"
      const expMatch = block.match(/(\d+(?:\s*-\s*\d+)?|\bFresher\b)\s*(?:Yrs|Years?)/i);
      const isInternCard = /\b(?:internship|intern|\bduration\b)\b/i.test(block);

      if (expMatch) {
        experienceText = expMatch[0];
        if (/fresher/i.test(expMatch[1])) {
          experienceMin = 0;
          experienceMax = 0;
        } else {
          const numbers = expMatch[1].split('-').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
          if (numbers.length === 2) {
            experienceMin = numbers[0];
            experienceMax = numbers[1];
          } else if (numbers.length === 1) {
            experienceMin = numbers[0];
            experienceMax = numbers[1];
          }
        }
      } else if (isInternCard) {
        const durationMatch = block.match(/(\d+\s*(?:months?|weeks?)\s*duration)/i);
        if (durationMatch) {
          experienceText = `${durationMatch[1]} (Fresher)`;
        } else {
          experienceText = 'Fresher / Intern (0-1 Yrs)';
        }
        experienceMin = 0;
        experienceMax = 1;
      }

      // Salary / Stipend extraction (handles "11-12 Lacs PA", "Unpaid", "15k-20k", "50,000 /month")
      const salaryMatch = block.match(/(\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\s*(?:Lacs|LPA|Cr)\s*(?:PA|per annum)?)/i);
      const stipendMatch = block.match(/\b(Unpaid|\d+k\s*-\s*\d+k|\d+\s*-\s*\d+\s*(?:k|thousand|month))\b/i);
      if (salaryMatch) {
        salaryText = salaryMatch[1];
      } else if (stipendMatch) {
        salaryText = stipendMatch[1];
      }

      // Work mode
      const modeMatch = block.match(/\b(Hybrid|Remote|Work from office)\b/i);
      if (modeMatch) {
        const m = modeMatch[1].toLowerCase();
        if (m.includes('remote')) workMode = 'remote';
        else if (m.includes('hybrid')) workMode = 'hybrid';
        else workMode = 'onsite';
      }

      // Robust Location Extraction:
      // A. Extract from the metadata line containing experience / duration / mode
      const metaLine = block.split('\n').find(l => /(\d+\s*-\s*\d+\s*Yrs|\bFresher\b|\bduration\b)/i.test(l));
      if (metaLine) {
        let rest = metaLine;
        rest = rest.replace(/\b(?:\d+\s*-\s*\d+|\d+|\bFresher\b)\s*Yrs\b/gi, '');
        rest = rest.replace(/\b\d+\s*(?:months?|weeks?)\s*duration\b/gi, '');
        rest = rest.replace(/\b\d+(?:\.\d+)?\s*(?:-\s*\d+(?:\.\d+)?)?\s*(?:Lacs|LPA|Cr)?\s*(?:PA|per annum)?\b/gi, '');
        rest = rest.replace(/\b(Not Disclosed|Unpaid|\d+k\s*-\s*\d+k)\b/gi, '');
        rest = rest.replace(/\b(?:Hybrid|Remote|Work from office)\s*-\s*/gi, '');
        rest = rest.replace(/\bPA\b/gi, '');
        rest = rest.replace(/^[-,|\s]+|[-,|\s]+$/g, '').trim();
        if (rest.length >= 2 && rest.length <= 60 && !/Required Skills|ideal candidate/i.test(rest)) {
          location = rest;
        }
      }

      // B. Fallback: Parse canonical city from Naukri Job URL
      // Pattern: /job-listings-[title]-[company]-[city]-[experience]-[id]
      if (location === 'India') {
        const urlCityMatch = jobUrl.match(/-([a-z]+)-\d+-to-\d+-years/i);
        if (urlCityMatch && urlCityMatch[1] !== 'jobs' && urlCityMatch[1] !== 'careers') {
          const rawCity = urlCityMatch[1];
          location = rawCity.charAt(0).toUpperCase() + rawCity.slice(1);
        }
      }

      // 4. Skills extraction from markdown lists: * Skill
      const skills: string[] = [];
      const skillMatches = block.matchAll(/^\s*\*\s+([A-Za-z0-9#+.\t /-]{2,40})/gm);
      for (const sm of skillMatches) {
        const s = sm[1].trim();
        if (s && !skills.includes(s) && !/save|applied|days ago|reviews/i.test(s)) {
          skills.push(s);
        }
      }

      // 5. Snippet description
      let descriptionSnippet = '';
      const snippetMatch = block.match(/(?:Required Skills|Job description|The ideal candidate)[\s\S]*?(?=\n\*|\n##|$)/i);
      if (snippetMatch) {
        descriptionSnippet = snippetMatch[0].slice(0, 200).replace(/\s+/g, ' ').trim();
      }

      // 6. Posted age
      let postedDateText = 'Recently posted';
      const dateMatch = block.match(/(\d+\+?\s*(?:days?|weeks?|hours?)\s*ago|today|just now)/i);
      if (dateMatch) {
        postedDateText = dateMatch[1];
      }

      jobs.push({
        id,
        title,
        company,
        companyRating,
        companyReviewsCount,
        experienceText,
        experienceMin,
        experienceMax,
        salaryText,
        location,
        workMode,
        skills: skills.slice(0, 10),
        descriptionSnippet: descriptionSnippet || `${title} at ${company} located in ${location}`,
        jobUrl,
        postedDateText,
        applyType: 'naukri_easy_apply',
      });
    } catch (e) {
      console.warn('[cloud-scraper] Failed to parse a job block:', e);
    }
  }

  return jobs;
}

/**
 * Normalizes complex or compound tech skills into canonical Naukri slugs and search keywords.
 * For example: "SQL Query Optimization" -> baseSlug: 'sql', cleanKeywords: 'sql query optimization'
 */
export interface CleanedNaukriSlug {
  baseSlug: string;
  cleanKeywords: string;
  isFresher: boolean;
}

export function cleanSkillForNaukriSlug(query: string, isFresher: boolean = false): CleanedNaukriSlug {
  const raw = (query || '').toLowerCase().trim();
  const detectedFresher = isFresher || /\b(fresher|freshers|entry[\s-]*level|trainee|intern|internship|graduate|student)\b/i.test(raw);

  const cleaned = raw
    .replace(/\b(fresher|freshers|entry[\s-]*level|trainee|junior|intern|internship|jobs?|vacancies|openings?|batch|passout|\d{4})\b/gi, '')
    .replace(/[^a-z0-9\s#+.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let baseSlug = '';

  if (/\b(sql|mysql|postgresql|postgres|database|query|plsql|oracle)\b/i.test(cleaned)) {
    baseSlug = 'sql';
  } else if (/\b(react|react\.?js|reactjs|next\.?js|nextjs)\b/i.test(cleaned)) {
    baseSlug = 'react-js';
  } else if (/\b(frontend|front[\s-]*end|ui\b|web\s*dev)/i.test(cleaned)) {
    baseSlug = 'frontend-developer';
  } else if (/\b(backend|back[\s-]*end)\b/i.test(cleaned)) {
    baseSlug = 'backend-developer';
  } else if (/\b(node|node\.?js|nodejs|express)\b/i.test(cleaned)) {
    baseSlug = 'node-js';
  } else if (/\b(full[\s-]*stack|mern|mean)\b/i.test(cleaned)) {
    baseSlug = 'full-stack-developer';
  } else if (/\b(python|django|fastapi|flask)\b/i.test(cleaned)) {
    baseSlug = 'python';
  } else if (/\b(java|spring|springboot)\b/i.test(cleaned)) {
    baseSlug = 'java';
  } else if (/\b(data\s*analyst|data\s*analytics|power\s*bi|tableau)\b/i.test(cleaned)) {
    baseSlug = 'data-analyst';
  } else if (/\b(data\s*science|machine\s*learning|ai|deep\s*learning)\b/i.test(cleaned)) {
    baseSlug = 'data-science';
  } else if (/\b(devops|aws|cloud|docker|kubernetes)\b/i.test(cleaned)) {
    baseSlug = 'devops';
  } else if (/\b(qa|automation\s*testing|selenium|software\s*tester)\b/i.test(cleaned)) {
    baseSlug = 'qa';
  } else {
    const words = cleaned.split(/\s+/).filter(Boolean);
    baseSlug = words.slice(0, 2).join('-') || 'software-engineer';
  }

  const cleanKeywords = cleaned || baseSlug.replace(/-/g, ' ');

  return {
    baseSlug,
    cleanKeywords,
    isFresher: detectedFresher,
  };
}

/**
 * Executes a live search on Naukri via Jina Reader Gateway using a multi-tier search URL strategy.
 */
export async function scrapeNaukriJobs(params: NaukriSearchParams): Promise<NaukriJobListing[]> {
  const isFresher = (params.experienceYears ?? 0) === 0;
  const exp = params.experienceYears ?? 0;
  const cityGid = params.cityTypeGid;
  const { baseSlug, cleanKeywords } = cleanSkillForNaukriSlug(params.keywords, isFresher);

  // Build candidate URLs in priority order for robust live search matching
  const candidateUrls: string[] = [];

  if (isFresher) {
    // 1. Fresher search endpoint with keyword
    candidateUrls.push(
      `https://www.naukri.com/fresher-jobs?k=${encodeURIComponent(cleanKeywords)}&experience=0${cityGid ? `&cityTypeGid=${cityGid}` : ''}`
    );
    // 2. Category fresher slug
    candidateUrls.push(
      `https://www.naukri.com/${baseSlug}-fresher-jobs?experience=0${cityGid ? `&cityTypeGid=${cityGid}` : ''}`
    );
    // 3. Category jobs with experience=0
    candidateUrls.push(
      `https://www.naukri.com/${baseSlug}-jobs?k=${encodeURIComponent(cleanKeywords)}&experience=0${cityGid ? `&cityTypeGid=${cityGid}` : ''}`
    );
  } else {
    // 1. Category search with keyword & experience
    candidateUrls.push(
      `https://www.naukri.com/${baseSlug}-jobs?k=${encodeURIComponent(cleanKeywords)}&experience=${exp}${cityGid ? `&cityTypeGid=${cityGid}` : ''}`
    );
    // 2. Category search by experience
    candidateUrls.push(
      `https://www.naukri.com/${baseSlug}-jobs?experience=${exp}${cityGid ? `&cityTypeGid=${cityGid}` : ''}`
    );
  }

  const headers: Record<string, string> = {
    Accept: 'text/plain',
    'X-With-Images-Summary': 'false',
    'X-With-Links-Summary': 'false',
    'X-No-Cache': 'true',
  };
  if (process.env.JINA_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`;
  }

  // Try candidate URLs sequentially until real listings are returned
  for (const targetNaukriUrl of candidateUrls) {
    const jinaUrl = `https://r.jina.ai/${targetNaukriUrl}`;
    try {
      const res = await fetch(jinaUrl, {
        headers,
        signal: AbortSignal.timeout(16000), // 16s timeout per tier
      });

      if (res.ok) {
        const markdown = await res.text();
        const parsedJobs = parseNaukriMarkdown(markdown);
        if (parsedJobs.length > 0) {
          return parsedJobs;
        }
      }
    } catch (err) {
      console.warn(`[cloud-scraper] Tier failed for (${jinaUrl}):`, err);
    }
  }

  /*
   * No results means NO RESULTS.
   *
   * An empty list is a truthful product. Fabricated fallback jobs with fake URLs
   * lead to 404s and broken auto-apply runs.
   */
  return [];
}

/*
 * generateCuratedNaukriJobs() was removed here, deliberately.
 *
 * It returned hardcoded listings at real companies with invented salaries,
 * ratings and URLs whenever the live scrape failed. Keeping it as dead code
 * invites a future caller to reach for it as a "fallback"; the whole problem
 * was that it looked like a reasonable fallback. See the return [] above.
 */

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
