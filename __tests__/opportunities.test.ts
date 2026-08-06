import { describe, it, expect } from 'vitest';
import { __internal } from '@/lib/opportunities';

const { toOpportunities, safeUrl, classifyUrgency } = __internal;

/** Shaped like the real sheet: a title row, a mid-data repeated header, a blank spacer. */
const CSV = `Job & Internship Openings,,,,,,,,
Company,Category,Opportunity Type,Title,Application Link,Last Date to Apply,Status,Key Benefits,Notes / Posted Date
Google,Product-Based,Job,"Software Engineer, AI/ML",https://careers.google.com/jobs/1,Not specified,Rolling,"$147k-$211k base + 15% bonus",Posted date unknown
Devpost,Hackathon Platform,Hackathon,Agent Hackathon,https://datahub.devpost.com/,2026-08-10 17:00 ET,Closing Soon,"$20,500 total prizes",Opened July 6
,,,,,,,,
Company,Category,Opportunity Type,Title,Application Link,Last Date to Apply,Status,Key Benefits,Notes / Posted Date
Meta,Product-Based,Internship,SWE Intern,"https://careers.google.com (search ""STEP"")",Not specified,Verify / Possibly Closed,-,Check page
Stripe,Product-Based,Internship,Backend Intern,https://stripe.com/jobs/2,Not specified,Not Yet Open,12-week paid,`;

describe('opportunities feed', () => {
  const rows = toOpportunities(CSV);

  it('drops the title row, the repeated header, and blank spacers', () => {
    // 4 real listings out of 8 CSV lines.
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.company)).not.toContain('Company');
    expect(rows.every((r) => r.company && r.title)).toBe(true);
  });

  it('sorts closing first and unverified last', () => {
    expect(rows[0].urgency).toBe('closing');
    expect(rows[rows.length - 1].urgency).toBe('stale');
  });

  it('reads quoted fields containing commas', () => {
    const google = rows.find((r) => r.company === 'Google');
    expect(google?.benefits).toBe('$147k-$211k base + 15% bonus');
    expect(google?.title).toBe('Software Engineer, AI/ML');
  });

  it('treats "Not specified" and "-" as absent, not as content', () => {
    expect(rows.find((r) => r.company === 'Google')?.deadline).toBeNull();
    expect(rows.find((r) => r.company === 'Meta')?.benefits).toBeNull();
  });

  it('salvages the URL from hand-typed link cells', () => {
    // The cell reads: https://careers.google.com (search "STEP")
    expect(rows.find((r) => r.company === 'Meta')?.url).toBe('https://careers.google.com/');
  });

  it('rejects non-http schemes rather than rendering them as links', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,<script>')).toBeNull();
    expect(safeUrl('not a url at all')).toBeNull();
    expect(safeUrl('https://example.com/x')).toBe('https://example.com/x');
  });

  it('buckets the sheet free-text status', () => {
    expect(classifyUrgency('Closing Soon')).toBe('closing');
    expect(classifyUrgency('Verify / Possibly Closed')).toBe('stale');
    expect(classifyUrgency('Not Yet Open')).toBe('upcoming');
    expect(classifyUrgency('Rolling')).toBe('open');
  });

  it('returns nothing rather than garbage when the header is missing', () => {
    // A Google error page or login redirect must trip the fallback, not render as rows.
    expect(toOpportunities('<!DOCTYPE html><html>Sign in</html>')).toEqual([]);
  });
});
