import { describe, expect, test } from 'vitest';
import { ingestCandidates } from '@/lib/opportunities/ingest';
import type { OpportunityCandidate } from '@/lib/opportunities/types';

const NOW = new Date('2026-09-06T00:00:00Z');

/**
 * A stand-in for the Supabase client that records what it was asked to write.
 *
 * Only `.from().upsert()` is exercised, which is the entire database surface
 * ingest touches — so this is a complete double rather than a partial one.
 */
function fakeClient() {
  const batches: Record<string, unknown>[][] = [];
  const updates: { patch: Record<string, unknown>; filters: string[] }[] = [];

  const client = {
    from() {
      return {
        async upsert(rows: Record<string, unknown>[]) {
          batches.push(rows);
          return { error: null };
        },
        // PostgREST's update builder is a thenable chain, so the double has to
        // be one too: .update().in().not().is() must resolve like a promise.
        update(patch: Record<string, unknown>) {
          const filters: string[] = [];
          const chain = {
            in: (col: string) => (filters.push(`in:${col}`), chain),
            eq: (col: string, value: unknown) => (filters.push(`eq:${col}:${String(value)}`), chain),
            not: (col: string, op: string) => (filters.push(`not:${col}:${op}`), chain),
            is: (col: string, value: unknown) => (filters.push(`is:${col}:${String(value)}`), chain),
            then: (resolve: (v: { error: null }) => void) => {
              updates.push({ patch, filters });
              resolve({ error: null });
            },
          };
          return chain;
        },
      };
    },
  };
  // The real client's type is far wider than what ingest uses; the cast keeps
  // the double honest about that rather than stubbing forty unused methods.
  return {
    client: client as never,
    batches,
    updates,
    get written() {
      return batches.flat();
    },
  };
}

function candidate(overrides: Partial<OpportunityCandidate> = {}): OpportunityCandidate {
  return {
    title: 'Software Engineering Intern',
    organization: 'Razorpay',
    kind: 'internship',
    applyUrl: 'https://boards.greenhouse.io/razorpay/jobs/1',
    location: 'Bengaluru, India',
    description: 'Six month internship for final-year students.',
    deadline: '2026-11-30',
    ...overrides,
  };
}

describe('ingestCandidates', () => {
  test('publishes a trustworthy, student-level, Indian posting', async () => {
    const db = fakeClient();
    const summary = await ingestCandidates(db.client, [candidate()], { now: NOW });

    expect(summary.verified).toBe(1);
    expect(db.written).toHaveLength(1);
    expect(db.written[0].status).toBe('verified');
  });

  test('a US posting is rejected — the region gate is not advisory', async () => {
    const db = fakeClient();
    const summary = await ingestCandidates(
      db.client,
      [candidate({ location: 'Santa Clara, California' })],
      { now: NOW }
    );
    expect(summary.verified).toBe(0);
    expect(summary.rejected).toBe(1);
  });

  test('a senior role is rejected even from a trusted source', async () => {
    const db = fakeClient();
    const summary = await ingestCandidates(
      db.client,
      [candidate({ title: 'Principal Software Engineer', kind: 'job' })],
      { now: NOW }
    );
    expect(summary.verified).toBe(0);
    expect(summary.rejected).toBe(1);
  });

  test('a fee-demanding posting is rejected', async () => {
    const db = fakeClient();
    const summary = await ingestCandidates(
      db.client,
      [candidate({ description: 'Pay a registration fee of Rs.2000 to confirm your seat.' })],
      { now: NOW }
    );
    expect(summary.rejected).toBe(1);
  });

  test('two candidates with the same URL are written once', async () => {
    // Postgres refuses an ON CONFLICT that fires against another row in the
    // same statement, so this collapse has to happen before the upsert.
    const db = fakeClient();
    const summary = await ingestCandidates(db.client, [candidate(), candidate()], { now: NOW });

    expect(summary.duplicates).toBe(1);
    expect(db.written).toHaveLength(1);
  });

  test('every written row carries a URL and a content fingerprint', async () => {
    const db = fakeClient();
    await ingestCandidates(db.client, [candidate()], { now: NOW });

    expect(db.written[0].url_fingerprint).toBe('boards.greenhouse.io/razorpay/jobs/1');
    expect(db.written[0].content_fingerprint).toContain('razorpay');
  });

  test('a candidate with no usable URL is rejected, not written', async () => {
    const db = fakeClient();
    const summary = await ingestCandidates(
      db.client,
      [candidate({ applyUrl: 'javascript:alert(1)' })],
      { now: NOW }
    );
    expect(summary.rejected).toBe(1);
    expect(db.written).toHaveLength(0);
  });

  test('dropRejected keeps the count but skips the write', async () => {
    const db = fakeClient();
    const summary = await ingestCandidates(
      db.client,
      [candidate(), candidate({ applyUrl: 'https://x.test/2', location: 'Seattle, Washington' })],
      { now: NOW, dropRejected: true }
    );

    expect(summary.verified).toBe(1);
    expect(summary.rejected).toBe(1);
    // Counted, but not stored — the whole point of the flag.
    expect(db.written).toHaveLength(1);
  });

  test('without dropRejected the rejection is stored for the audit trail', async () => {
    const db = fakeClient();
    await ingestCandidates(
      db.client,
      [candidate({ applyUrl: 'https://x.test/2', location: 'Seattle, Washington' })],
      { now: NOW }
    );
    expect(db.written).toHaveLength(1);
    expect(db.written[0].status).toBe('rejected');
  });

  test('a large harvest is written in chunks, not one statement', async () => {
    const db = fakeClient();
    const many = Array.from({ length: 1200 }, (_, i) =>
      candidate({ applyUrl: `https://boards.greenhouse.io/razorpay/jobs/${i}` })
    );

    await ingestCandidates(db.client, many, { now: NOW });

    expect(db.written).toHaveLength(1200);
    expect(db.batches).toHaveLength(3); // 500 + 500 + 200
    for (const batch of db.batches) expect(batch.length).toBeLessThanOrEqual(500);
  });

  test('a blank title or organisation is skipped before verification', async () => {
    const db = fakeClient();
    const summary = await ingestCandidates(
      db.client,
      [candidate({ title: '   ' }), candidate({ organization: '' })],
      { now: NOW }
    );
    expect(summary.considered).toBe(0);
    expect(db.written).toHaveLength(0);
  });

  test('an empty batch touches the database not at all', async () => {
    const db = fakeClient();
    const summary = await ingestCandidates(db.client, [], { now: NOW });
    expect(summary.considered).toBe(0);
    expect(db.batches).toHaveLength(0);
  });

  test('the upsert never touches retirement columns', async () => {
    // Writing retired_at in the upsert would clear it for EVERY row, including
    // ones an admin removed by hand. Those columns must not appear here at all.
    const db = fakeClient();
    await ingestCandidates(db.client, [candidate()], { now: NOW });
    expect(db.written[0]).not.toHaveProperty('retired_at');
    expect(db.written[0]).not.toHaveProperty('retired_reason');
  });

  test('a returning row is un-retired only when the SWEEP retired it', async () => {
    const db = fakeClient();
    await ingestCandidates(db.client, [candidate()], { now: NOW, runId: 'run-1' });

    expect(db.updates).toHaveLength(1);
    expect(db.updates[0].patch).toMatchObject({ retired_at: null, retired_reason: null });
    // `retired_by IS NULL` is the whole safeguard: it means the sweep retired
    // the row, not a human. Without it, Remove would be undone twice a day.
    expect(db.updates[0].filters).toContain('is:retired_by:null');
    expect(db.updates[0].filters).toContain('not:retired_at:is');
  });

  test('the un-retire is keyed on the run, never on a list of URLs', async () => {
    // `.in('url_fingerprint', [...500 fingerprints])` builds a ~30KB query
    // string and PostgREST answers 400. One equality filter on last_seen_run
    // identifies the same rows in a URL of constant length. Caught in a live run.
    const db = fakeClient();
    const many = Array.from({ length: 600 }, (_, i) =>
      candidate({ applyUrl: `https://boards.greenhouse.io/razorpay/jobs/${i}` })
    );

    await ingestCandidates(db.client, many, { now: NOW, runId: 'run-1' });

    expect(db.updates).toHaveLength(1);
    expect(db.updates[0].filters).toContain('eq:last_seen_run:run-1');
    expect(db.updates[0].filters.some((f) => f.startsWith('in:'))).toBe(false);
  });

  test('no run id means no un-retire pass at all', async () => {
    const db = fakeClient();
    await ingestCandidates(db.client, [candidate()], { now: NOW });
    expect(db.updates).toHaveLength(0);
  });

  test('an empty batch issues no un-retire update either', async () => {
    const db = fakeClient();
    await ingestCandidates(db.client, [], { now: NOW });
    expect(db.updates).toHaveLength(0);
  });
});
