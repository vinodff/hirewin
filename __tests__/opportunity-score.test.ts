import { describe, expect, test } from 'vitest';
import { daysUntil, rankOpportunities, scoreOpportunity } from '@/lib/opportunities/score';
import type { OpportunityRecord } from '@/lib/opportunities/types';

const NOW = new Date('2026-09-06T09:00:00Z');

function record(overrides: Partial<OpportunityRecord> = {}): OpportunityRecord {
  return {
    id: 'r1',
    title: 'Software Engineering Intern',
    organization: 'Example Corp',
    kind: 'internship',
    applyUrl: 'https://boards.greenhouse.io/example/jobs/1',
    skills: [],
    deadline: null,
    compensation: null,
    status: 'verified',
    sourceTier: 'official',
    signals: [],
    discoveredAt: NOW.toISOString(),
    corroborations: 1,
    lastCheckedAt: null,
    ...overrides,
  };
}

describe('daysUntil', () => {
  test('a deadline of today is 0, not 1', () => {
    // The whole promise is "never miss a deadline". Reporting the last day of a
    // window as "closes in 1 day" is the one rounding error that matters here.
    expect(daysUntil('2026-09-06', NOW)).toBe(0);
  });

  test('counts whole calendar days forward and backward', () => {
    expect(daysUntil('2026-09-13', NOW)).toBe(7);
    expect(daysUntil('2026-09-05', NOW)).toBe(-1);
  });

  test('absent or unparseable deadlines are null, never 0', () => {
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil(undefined, NOW)).toBeNull();
    expect(daysUntil('not a date', NOW)).toBeNull();
  });
});

describe('scoreOpportunity', () => {
  test('something closing in two days outranks the same thing closing in three months', () => {
    const soon = scoreOpportunity(record({ deadline: '2026-09-08' }), NOW);
    const later = scoreOpportunity(record({ deadline: '2026-12-08' }), NOW);
    expect(soon.total).toBeGreaterThan(later.total);
  });

  test('an official source outranks an aggregator, all else equal', () => {
    const official = scoreOpportunity(record({ sourceTier: 'official' }), NOW);
    const aggregator = scoreOpportunity(record({ sourceTier: 'aggregator' }), NOW);
    expect(official.total).toBeGreaterThan(aggregator.total);
  });

  test('a closed listing scores no urgency at all', () => {
    const closed = scoreOpportunity(record({ deadline: '2026-08-01' }), NOW);
    expect(closed.breakdown.urgency).toBe(0);
  });

  test('the total is capped at 100 and never negative', () => {
    const best = scoreOpportunity(
      record({ deadline: '2026-09-06', sourceTier: 'official', kind: 'internship' }),
      NOW
    );
    expect(best.total).toBeLessThanOrEqual(100);
    expect(best.total).toBeGreaterThanOrEqual(0);
  });

  test('says "Closes today" rather than "Closes in 0 days"', () => {
    const today = scoreOpportunity(record({ deadline: '2026-09-06' }), NOW);
    expect(today.reasons).toContain('Closes today');
  });

  test('pluralises the countdown correctly', () => {
    expect(scoreOpportunity(record({ deadline: '2026-09-07' }), NOW).reasons).toContain(
      'Closes in 1 day'
    );
    expect(scoreOpportunity(record({ deadline: '2026-09-09' }), NOW).reasons).toContain(
      'Closes in 3 days'
    );
  });

  test('does not claim urgency for a listing with no deadline', () => {
    const undated = scoreOpportunity(record({ deadline: null }), NOW);
    expect(undated.reasons.some((r) => r.startsWith('Closes'))).toBe(false);
  });

  test('reports corroboration only when there is more than one source', () => {
    expect(scoreOpportunity(record({ corroborations: 1 }), NOW).reasons).not.toContain(
      'Seen on 1 sources'
    );
    expect(scoreOpportunity(record({ corroborations: 3 }), NOW).reasons).toContain(
      'Seen on 3 sources'
    );
  });

  test('a stale row loses its freshness points', () => {
    const old = scoreOpportunity(
      record({ discoveredAt: '2026-01-01T00:00:00Z' }),
      NOW
    );
    expect(old.breakdown.freshness).toBe(0);
  });
});

describe('rankOpportunities', () => {
  test('orders by score, breaking ties on the nearer deadline', () => {
    const ranked = rankOpportunities(
      [
        record({ id: 'far', deadline: '2026-12-01' }),
        record({ id: 'near', deadline: '2026-09-08' }),
        record({ id: 'none', deadline: null }),
      ],
      NOW
    );
    expect(ranked[0].opportunity.id).toBe('near');
  });

  test('an empty list ranks to an empty list', () => {
    expect(rankOpportunities([], NOW)).toEqual([]);
  });
});
