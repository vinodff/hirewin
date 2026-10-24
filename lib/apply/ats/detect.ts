/**
 * Which applicant-tracking system a career-site URL belongs to.
 *
 * Detection is by hostname only, and by exact host or a dot-bounded suffix —
 * never a substring. `jobs.lever.co.evil.com` must not be treated as Lever:
 * the adapter would then submit the owner's details to whoever registered it.
 *
 * `supported` means an adapter exists that may submit on its own. A
 * recognized-but-unsupported ATS (iCIMS, Taleo, ...) is still named so the run
 * log says what the site was, but it only ever gets the generic fill-and-pause
 * treatment.
 */

export interface AtsDetection {
  /** 'greenhouse', 'lever', ..., a recognized unsupported name, or 'unknown'. */
  name: string;
  supported: boolean;
}

/** Host equals `domain` or is a subdomain of it (dot-bounded). */
function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

const GREENHOUSE_HOSTS = new Set([
  'boards.greenhouse.io',
  'job-boards.greenhouse.io',
  'job-boards.eu.greenhouse.io',
  'boards.eu.greenhouse.io',
]);

const LEVER_HOSTS = new Set(['jobs.lever.co', 'jobs.eu.lever.co']);

/** Recognized ATSs with no submitting adapter, matched by registrable domain. */
const UNSUPPORTED: ReadonlyArray<{ name: string; test: (host: string) => boolean }> = [
  { name: 'icims', test: (h) => hostIs(h, 'icims.com') },
  { name: 'taleo', test: (h) => hostIs(h, 'taleo.net') },
  {
    name: 'successfactors',
    test: (h) =>
      hostIs(h, 'successfactors.com') || hostIs(h, 'successfactors.eu') || hostIs(h, 'sapsf.com'),
  },
  {
    name: 'zoho',
    test: (h) => hostIs(h, 'zohorecruit.com') || hostIs(h, 'zohorecruit.in') || hostIs(h, 'zohorecruit.eu'),
  },
  { name: 'darwinbox', test: (h) => hostIs(h, 'darwinbox.in') || hostIs(h, 'darwinbox.com') },
  { name: 'keka', test: (h) => hostIs(h, 'keka.com') },
  { name: 'freshteam', test: (h) => hostIs(h, 'freshteam.com') },
  {
    // Naukri's recruiter/RMS career portals (e.g. <company>.recruit.naukri.com,
    // rms.naukri.com). Plain www.naukri.com is the job board itself, not an ATS.
    name: 'naukri-recruit',
    test: (h) => hostIs(h, 'naukri.com') && /(^|\.)(recruit|rms)\./.test(h),
  },
];

export function detectAts(url: string): AtsDetection {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { name: 'unknown', supported: false };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { name: 'unknown', supported: false };
  }
  const host = parsed.hostname.toLowerCase();

  if (GREENHOUSE_HOSTS.has(host)) return { name: 'greenhouse', supported: true };
  if (LEVER_HOSTS.has(host)) return { name: 'lever', supported: true };
  if (host === 'jobs.ashbyhq.com') return { name: 'ashby', supported: true };
  if (host === 'jobs.smartrecruiters.com') return { name: 'smartrecruiters', supported: true };
  if (hostIs(host, 'myworkdayjobs.com') && host !== 'myworkdayjobs.com') {
    return { name: 'workday', supported: true };
  }

  for (const entry of UNSUPPORTED) {
    if (entry.test(host)) return { name: entry.name, supported: false };
  }

  // A company careers page embedding the Greenhouse board carries the job id
  // as ?gh_jid=. The form itself then lives in the grnhse iframe; index.ts
  // also checks the DOM for that iframe when the URL gives no hint.
  if (parsed.searchParams.has('gh_jid')) return { name: 'greenhouse', supported: true };

  return { name: 'unknown', supported: false };
}
