/**
 * Pre-Flight Link Liveness & Tombstone Validator
 *
 * Verifies that an opportunity's direct application URL is active, reachable,
 * returns HTTP 200, and does NOT lead to an expired or closed requisition page
 * (e.g. Greenhouse ?error=true, Amazon 404, or "job is no longer open" tombstones).
 */

export const DEAD_PATTERNS = [
  /the job you are looking for is no longer open/i,
  /the job you are looking for is not open/i,
  /sorry, the job you're looking for isn't available/i,
  /this job is no longer available/i,
  /this posting is no longer available/i,
  /this position has been filled/i,
  /this job posting has expired/i,
  /no longer accepting applications/i,
  /applications are closed/i,
  /registration has ended/i,
  /the page you are looking for cannot be found/i,
  /page not found/i,
  /\?error=true/i,
];

export async function validateDirectLink(
  url: string,
  timeoutMs = 8000,
  retries = 1
): Promise<{ isValid: boolean; reason?: string }> {
  if (!url || !url.startsWith('http')) {
    return { isValid: false, reason: 'Invalid URL' };
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        // Some bot firewalls return 403 to automated probes; official domains are still reachable by browser
        if (res.status === 403 && (url.includes('unstop.com') || url.includes('lever.co') || url.includes('amazon.jobs'))) {
          return { isValid: true };
        }
        return { isValid: false, reason: `HTTP ${res.status}` };
      }

      const finalUrl = res.url;
      if (finalUrl.includes('?error=true')) {
        return { isValid: false, reason: 'Redirected to error page (?error=true)' };
      }

      const text = await res.text();
      for (const pattern of DEAD_PATTERNS) {
        if (pattern.test(text) || pattern.test(finalUrl)) {
          return { isValid: false, reason: `Tombstone matched (${pattern.source})` };
        }
      }

      return { isValid: true };
    } catch (err: unknown) {
      if (attempt < retries) {
        // Wait 300ms and retry once on network hiccup
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      // If blocked by crawler firewall or timed out, allow known official platforms
      const msg = (err as Error).message;
      if (
        url.includes('unstop.com') ||
        url.includes('google.com') ||
        url.includes('microsoft.com') ||
        url.includes('lever.co') ||
        url.includes('greenhouse.io') ||
        url.includes('tcs.com') ||
        url.includes('wipro.com') ||
        url.includes('zoho.com')
      ) {
        return { isValid: true };
      }
      return { isValid: false, reason: msg };
    }
  }

  return { isValid: false, reason: 'Request timed out' };
}

/**
 * Filter an array of candidates or records, verifying links in bounded concurrency.
 */
export async function filterLiveOpportunities<T extends { applyUrl: string }>(
  items: T[],
  concurrency = 8
): Promise<T[]> {
  const verified: T[] = [];
  const queue = [...items];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const check = await validateDirectLink(item.applyUrl);
      if (check.isValid) {
        verified.push(item);
      } else {
        console.log(`[link-validator] Dropping dead opportunity: ${item.applyUrl} -> ${check.reason}`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);

  return verified;
}
