/**
 * Job and internship openings, read live from a public Google Sheet.
 *
 * The sheet is the editing surface — add a row there and the page follows within
 * the hour. A committed snapshot backs it so an un-share, a Google outage, or a
 * throttle degrades to yesterday's list instead of an empty page.
 */
import fallback from './opportunities-fallback.json';

const SHEET_ID = '1MpfNvlmcGklUf_Qykuj3MailmPLk1yVPle8L736cE60';
const SHEET_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

const REVALIDATE_SECONDS = 3600;

/** Bucketed from the sheet's free-text Status so the UI has something to sort and colour by. */
export type Urgency = 'closing' | 'open' | 'upcoming' | 'stale';

export type Opportunity = {
  id: string;
  company: string;
  category: string;
  type: string;
  title: string;
  url: string | null;
  deadline: string | null;
  status: string;
  urgency: Urgency;
  benefits: string | null;
  notes: string | null;
};

/** Closing first, dead last. */
const URGENCY_ORDER: Record<Urgency, number> = {
  closing: 0,
  open: 1,
  upcoming: 2,
  stale: 3,
};

/** RFC 4180: quoted fields may contain commas, newlines, and "" escapes. */
function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c !== '"') { field += c; continue; }
      if (input[i + 1] === '"') { field += '"'; i++; continue; }
      quoted = false;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }

  return rows;
}

/**
 * Only http(s) survives. The sheet holds hand-entered text like
 * `https://careers.google.com (search "STEP")`, so take the URL and drop the prose
 * rather than rendering an href a browser would refuse or, worse, a javascript: URL.
 */
function safeUrl(raw: string): string | null {
  const candidate = raw.trim().split(/\s+/)[0];
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function classifyUrgency(status: string): Urgency {
  const s = status.toLowerCase();
  if (s.includes('closing')) return 'closing';
  if (s.includes('verify') || s.includes('closed')) return 'stale';
  if (s.includes('not yet')) return 'upcoming';
  return 'open';
}

/** "Not specified", "-", and friends are absence, not content. Don't render them. */
function clean(value: string | undefined): string | null {
  const v = (value ?? '').trim();
  if (!v || v === '-' || /^not specified$/i.test(v)) return null;
  return v;
}

function toOpportunities(csv: string): Opportunity[] {
  const rows = parseCsv(csv);
  const headerIndex = rows.findIndex((r) => r[0]?.trim() === 'Company');
  if (headerIndex === -1) return [];

  const header = rows[headerIndex].map((h) => h.trim());
  const at = (row: string[], name: string) => row[header.indexOf(name)];

  return rows
    .slice(headerIndex + 1)
    // The sheet repeats its header mid-data as a section divider, and leaves blank
    // spacer rows. Both would render as ghost entries.
    .filter((r) => r[0]?.trim() && r[0].trim() !== 'Company')
    .map((r, i) => {
      const status = clean(at(r, 'Status')) ?? 'Unknown';
      return {
        id: `${(at(r, 'Company') ?? '').trim()}-${i}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        company: (at(r, 'Company') ?? '').trim(),
        category: clean(at(r, 'Category')) ?? 'Other',
        type: clean(at(r, 'Opportunity Type')) ?? 'Job',
        title: (at(r, 'Title') ?? '').trim(),
        url: safeUrl(at(r, 'Application Link') ?? ''),
        deadline: clean(at(r, 'Last Date to Apply')),
        status,
        urgency: classifyUrgency(status),
        benefits: clean(at(r, 'Key Benefits')),
        notes: clean(at(r, 'Notes / Posted Date')),
      };
    })
    .filter((o) => o.company && o.title)
    .sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] || a.company.localeCompare(b.company));
}

export type OpportunityFeed = {
  opportunities: Opportunity[];
  /** True when the live sheet was unreachable and the committed snapshot is showing. */
  isStale: boolean;
};

export async function getOpportunities(): Promise<OpportunityFeed> {
  try {
    const res = await fetch(SHEET_CSV, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`sheet responded ${res.status}`);

    const opportunities = toOpportunities(await res.text());
    if (opportunities.length === 0) throw new Error('sheet parsed to zero rows');

    return { opportunities, isStale: false };
  } catch {
    return { opportunities: fallback as Opportunity[], isStale: true };
  }
}

// Exported for the snapshot generator and tests.
export const __internal = { parseCsv, toOpportunities, safeUrl, classifyUrgency };
