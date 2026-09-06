import { describe, expect, test } from 'vitest';
import { __internal } from '@/lib/opportunities/feed';
import type { OpportunityRecord } from '@/lib/opportunities/types';

const { toCard, mergeKey, statusOf, urgencyOf } = __internal;

const NOW = new Date('2026-09-06T09:00:00Z');

function record(overrides: Partial<OpportunityRecord> = {}): OpportunityRecord {
  return {
    id: 'abc-123',
    title: 'Software Engineering Intern',
    organization: 'Razorpay',
    kind: 'internship',
    applyUrl: 'https://boards.greenhouse.io/razorpay/jobs/1',
    location: 'Bengaluru, India',
    workMode: null,
    skills: [],
    description: 'Six month internship.',
    compensation: null,
    deadline: null,
    postedAt: null,
    status: 'verified',
    sourceTier: 'official',
    signals: [],
    discoveredAt: NOW.toISOString(),
    corroborations: 1,
    lastCheckedAt: null,
    ...overrides,
  };
}

describe('mergeKey', () => {
  test('the same role written two ways collides', () => {
    // This is what stops a curated sheet row and an agent row for the same
    // posting from both rendering as separate cards.
    expect(mergeKey('Google', 'STEP Internship 2026')).toBe(
      mergeKey('google', 'step internship')
    );
  });

  test('ignores punctuation and word order', () => {
    expect(mergeKey('Razorpay', 'Intern, Backend')).toBe(mergeKey('razorpay', 'Backend Intern'));
  });

  test('two genuinely different roles at one company do not collide', () => {
    expect(mergeKey('Razorpay', 'Backend Intern')).not.toBe(
      mergeKey('Razorpay', 'Frontend Intern')
    );
  });

  test('the same title at two companies does not collide', () => {
    expect(mergeKey('Razorpay', 'Backend Intern')).not.toBe(mergeKey('Groww', 'Backend Intern'));
  });
});

describe('urgencyOf', () => {
  test('within a week is closing, past is stale, far out is open', () => {
    expect(urgencyOf(3)).toBe('closing');
    expect(urgencyOf(7)).toBe('closing');
    expect(urgencyOf(8)).toBe('open');
    expect(urgencyOf(-1)).toBe('stale');
  });

  test('no deadline is open, not stale', () => {
    // A rolling posting with no stated deadline is live, not dead.
    expect(urgencyOf(null)).toBe('open');
  });
});

describe('statusOf', () => {
  test('an aggregator listing says it is second-hand', () => {
    expect(statusOf(record({ sourceTier: 'aggregator' }), null)).toBe(
      'Open · confirm on employer site'
    );
  });

  test('an official listing does not add a caveat it has not earned', () => {
    expect(statusOf(record({ sourceTier: 'official' }), null)).toBe('Open');
  });

  test('urgency and closure outrank the source caveat', () => {
    expect(statusOf(record({ sourceTier: 'aggregator' }), 2)).toBe('Closing soon');
    expect(statusOf(record({ sourceTier: 'aggregator' }), -5)).toBe('Closed');
  });
});

describe('toCard', () => {
  test('projects a record into the shape the browser renders', () => {
    const card = toCard(record({ deadline: '2026-09-10' }), NOW);
    expect(card.company).toBe('Razorpay');
    expect(card.title).toBe('Software Engineering Intern');
    expect(card.type).toBe('Internship');
    expect(card.url).toBe('https://boards.greenhouse.io/razorpay/jobs/1');
    expect(card.daysLeft).toBe(4);
    expect(card.urgency).toBe('closing');
  });

  test('namespaces the id so it cannot collide with a sheet row', () => {
    expect(toCard(record(), NOW).id).toBe('agent-abc-123');
  });

  test('published comp takes the benefits slot ahead of the description', () => {
    // DESIGN.md: comp reads as a price tag, so the figure wins the slot.
    const card = toCard(record({ compensation: 'Rs.50,000/month' }), NOW);
    expect(card.benefits).toBe('Rs.50,000/month');
  });

  test('the description fills the slot only when no figure was published', () => {
    expect(toCard(record({ compensation: null }), NOW).benefits).toBe('Six month internship.');
  });

  test('a slot with nothing to show is null, never an empty string', () => {
    // DESIGN.md rule 1: absent is absent — never render a placeholder.
    const bare = toCard(record({ compensation: null, description: null, location: null }), NOW);
    expect(bare.benefits).toBeNull();
    expect(bare.notes).toBeNull();
  });

  test('remote gets its own filter chip; everything else reuses the type', () => {
    expect(toCard(record({ workMode: 'remote' }), NOW).category).toBe('Remote');
    expect(toCard(record({ workMode: 'onsite' }), NOW).category).toBe('Internship');
    expect(toCard(record({ workMode: null }), NOW).category).toBe('Internship');
  });

  test('no deadline means no countdown, not a countdown to nothing', () => {
    const card = toCard(record({ deadline: null }), NOW);
    expect(card.daysLeft).toBeNull();
    expect(card.deadlineIso).toBeNull();
  });

  test('notes carry location and posting date when known', () => {
    const card = toCard(record({ location: 'Pune, India', postedAt: '2026-09-01' }), NOW);
    expect(card.notes).toBe('Pune, India · Posted 2026-09-01');
  });
});
