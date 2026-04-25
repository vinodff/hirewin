const KNOWN_ATS_DOMAINS = [
  'greenhouse.io',
  'lever.co',
  'workday.com',
  'taleo.net',
  'icims.com',
  'jobvite.com',
  'smartrecruiters.com',
  'myworkdayjobs.com',
  'successfactors.com',
  'ultipro.com',
];

export function isKnownAtsDomain(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return KNOWN_ATS_DOMAINS.some((domain) => hostname.includes(domain));
  } catch {
    return false;
  }
}

export async function fetchJobDescription(url: string): Promise<string> {
  if (!url.startsWith('https://')) {
    throw new Error('Only https:// URLs are supported');
  }
  const jinaUrl = `https://r.jina.ai/${url}`;

  const res = await fetch(jinaUrl, {
    headers: {
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      Accept: 'text/plain',
      'X-Return-Format': 'text',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Jina fetch failed: ${res.status}`);
  }

  const text = await res.text();
  const trimmed = text.trim();

  if (!trimmed || trimmed.length < 100) {
    throw new Error('Empty response from URL');
  }

  // Truncate to ~3000 chars to keep within token budget
  return trimmed.slice(0, 3000);
}
