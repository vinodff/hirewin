/**
 * Unstop (formerly Dare2Compete) Live Harvester
 *
 * Sourced directly from Unstop's public opportunity search.
 * Filters strictly for active, verified competitions, hackathons, internships and jobs
 * with open registrations and live future deadlines.
 */

import type { OpportunityCandidate, OpportunityKind, WorkMode } from './types';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const TIMEOUT_MS = 12_000;

function cleanHtml(html: string | null | undefined, max = 500): string | null {
  if (!html) return null;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.slice(0, max) : null;
}

interface UnstopItem {
  id: number;
  title: string;
  seo_url?: string;
  details?: string;
  approved_date?: string;
  updated_at?: string;
  organisation?: { name?: string };
  prizes?: Array<{ rank?: string; cash?: number; currency?: string }>;
  locations?: string[];
  required_skills?: Array<{ skill_name?: string; skill?: string }>;
  filters?: Array<{ name?: string; type?: string }>;
  regnRequirements?: {
    reg_status?: string;
    remain_days?: string;
    end_regn_dt?: string;
    work_location_type?: string;
  };
}

export async function harvestUnstop(): Promise<OpportunityCandidate[]> {
  const queryConfigs: Array<{ apiParam: string; searchTerm?: string; kind: OpportunityKind }> = [
    // Flagship Hiring Challenges & Hackathons (Campus PPIs & Competitions)
    { apiParam: 'hiring-challenges', kind: 'hackathon' },
    { apiParam: 'hackathons', kind: 'hackathon' },

    // Fresher & Entry-Level Software Engineering Jobs
    { apiParam: 'jobs', searchTerm: 'software', kind: 'job' },
    { apiParam: 'jobs', searchTerm: 'developer', kind: 'job' },
    { apiParam: 'jobs', searchTerm: 'fresher', kind: 'job' },
    { apiParam: 'jobs', searchTerm: 'graduate', kind: 'job' },
    { apiParam: 'jobs', searchTerm: 'engineer', kind: 'job' },
    { apiParam: 'jobs', searchTerm: 'frontend', kind: 'job' },
    { apiParam: 'jobs', searchTerm: 'backend', kind: 'job' },
    { apiParam: 'jobs', searchTerm: 'full stack', kind: 'job' },
    { apiParam: 'jobs', searchTerm: 'python', kind: 'job' },
    { apiParam: 'jobs', searchTerm: 'ai', kind: 'job' },
    { apiParam: 'jobs', searchTerm: 'data science', kind: 'job' },

    // High-Craft Tech Internships
    { apiParam: 'internships', searchTerm: 'software', kind: 'internship' },
    { apiParam: 'internships', searchTerm: 'developer', kind: 'internship' },
    { apiParam: 'internships', searchTerm: 'frontend', kind: 'internship' },
    { apiParam: 'internships', searchTerm: 'backend', kind: 'internship' },
    { apiParam: 'internships', searchTerm: 'web', kind: 'internship' },
    { apiParam: 'internships', searchTerm: 'ai', kind: 'internship' },
    { apiParam: 'internships', searchTerm: 'data science', kind: 'internship' },
    { apiParam: 'internships', searchTerm: 'python', kind: 'internship' },
  ];

  const NON_CAREER_GAMES =
    /\b(ipl auction|barter mania|mock stock|treasure hunt|bgmi|pubg|free fire|meme|photography contest|dance competition|singing|rangoli|fashion show|gaming tournament|carrom|chess tournament|esports)\b/i;

  const results: OpportunityCandidate[] = [];
  const seenUrls = new Set<string>();
  const now = Date.now();

  // Fetch in concurrent chunks of 4 to stay fast and avoid sequential delays
  const CHUNK_SIZE = 4;
  for (let i = 0; i < queryConfigs.length; i += CHUNK_SIZE) {
    const chunk = queryConfigs.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async ({ apiParam, searchTerm, kind }) => {
        try {
          const searchParam = searchTerm ? `&searchTerm=${encodeURIComponent(searchTerm)}` : '';
          const url = `https://unstop.com/api/public/opportunity/search-result?opportunity=${apiParam}${searchParam}&per_page=25&page=1`;
          const res = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
            signal: AbortSignal.timeout(TIMEOUT_MS),
          });

          if (!res.ok) return;
          const json = await res.json();
          const items: UnstopItem[] = json?.data?.data || [];

          for (const item of items) {
            // Discard non-career gaming/fest activities
            if (NON_CAREER_GAMES.test(item.title)) {
              continue;
            }

            const req = item.regnRequirements;
            const status = req?.reg_status;
            const remain = req?.remain_days ?? '';
            const endDateStr = req?.end_regn_dt;

            // Strict verification: only open registrations with real future deadline
            const isStarted = status === 'STARTED';
            const notEnded = !remain.toLowerCase().includes('ended');
            const endDateMs = endDateStr ? new Date(endDateStr).getTime() : 0;
            const isFuture = endDateMs > now;

            if (!((isStarted || notEnded) && isFuture)) {
              continue;
            }

            const org = item.organisation?.name?.trim() || 'Unstop Partner';
            const applyUrl = item.seo_url?.startsWith('http')
              ? item.seo_url
              : `https://unstop.com/${apiParam}/${item.id}`;

            const canonical = applyUrl.toLowerCase();
            if (seenUrls.has(canonical)) continue;
            seenUrls.add(canonical);

            // Prizes or compensation
            let compensation: string | null = null;
            if (item.prizes && item.prizes.length > 0) {
              const totalCash = item.prizes.reduce((sum, p) => sum + (Number(p.cash) || 0), 0);
              if (totalCash > 0) {
                compensation = `₹${totalCash.toLocaleString('en-IN')} Prize Pool`;
              } else {
                const firstPrize = item.prizes[0];
                if (firstPrize?.cash) compensation = `₹${firstPrize.cash.toLocaleString('en-IN')} First Prize`;
              }
            }

            // Skills
            const skills: string[] = [];
            if (item.required_skills) {
              for (const s of item.required_skills) {
                const name = s.skill_name || s.skill;
                if (name && !skills.includes(name)) skills.push(name);
              }
            }

            // Eligibility
            const eligibilityParts: string[] = [];
            if (item.filters) {
              for (const f of item.filters) {
                if (f.name && f.type === 'eligible') eligibilityParts.push(f.name);
              }
            }

            // Location & Work Mode
            let location = 'India';
            let workMode: WorkMode = 'onsite';
            if (req?.work_location_type === 'virtual' || req?.work_location_type === 'online') {
              workMode = 'remote';
              location = 'Online / Remote';
            } else if (item.locations && item.locations.length > 0) {
              location = item.locations.join(', ');
            }

            const deadline = endDateStr ? endDateStr.slice(0, 10) : null;
            const postedAt = item.approved_date ? item.approved_date.slice(0, 10) : item.updated_at ? item.updated_at.slice(0, 10) : null;

            results.push({
              title: item.title.trim(),
              organization: org,
              kind,
              applyUrl,
              sourceUrl: applyUrl,
              location,
              workMode,
              eligibility: eligibilityParts.length > 0 ? eligibilityParts.join(' · ') : 'Open to Freshers & Students',
              skills,
              description: cleanHtml(item.details),
              compensation,
              deadline,
              postedAt,
            });
          }
        } catch (err) {
          console.warn(`[unstop-harvester] Failed fetching ${apiParam}${searchTerm ? ` (${searchTerm})` : ''}:`, (err as Error).message);
        }
      })
    );
  }

  return results;
}
