import { describe, expect, test } from 'vitest';
import { isDue, istHour, validatePatch, DEFAULT_SETTINGS, type AgentSettings } from '@/lib/opportunities/settings';

function settings(overrides: Partial<AgentSettings> = {}): AgentSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

/** 06:30 IST on 6 Sep 2026 is 01:00 UTC. */
const AT_6AM_IST = new Date('2026-09-06T01:00:00Z');
const AT_6PM_IST = new Date('2026-09-06T13:00:00Z');
const AT_3AM_IST = new Date('2026-09-05T21:30:00Z');

describe('istHour', () => {
  test('converts UTC to the IST wall clock', () => {
    expect(istHour(AT_6AM_IST)).toBe(6);
    expect(istHour(AT_6PM_IST)).toBe(18);
  });

  test('handles the half-hour offset across midnight', () => {
    // 21:30 UTC is 03:00 IST the NEXT day — the +5:30 offset is why this
    // cannot be done with a plain hour addition.
    expect(istHour(AT_3AM_IST)).toBe(3);
  });
});

describe('isDue', () => {
  test('runs at a scheduled hour', () => {
    expect(isDue(settings({ runHoursIst: [6, 18] }), AT_6AM_IST).due).toBe(true);
    expect(isDue(settings({ runHoursIst: [6, 18] }), AT_6PM_IST).due).toBe(true);
  });

  test('does nothing at an unscheduled hour', () => {
    const verdict = isDue(settings({ runHoursIst: [6, 18] }), AT_3AM_IST);
    expect(verdict.due).toBe(false);
    // The reason has to name the hour and the schedule, or a silent no-op at
    // 22 of the 24 daily invocations is impossible to debug.
    expect(verdict.reason).toContain('3:00');
    expect(verdict.reason).toContain('6, 18');
  });

  test('pause beats the schedule', () => {
    const verdict = isDue(settings({ runHoursIst: [6, 18], paused: true }), AT_6AM_IST);
    expect(verdict.due).toBe(false);
    expect(verdict.reason).toContain('paused');
  });

  test('an admin can schedule any number of runs a day', () => {
    const fourTimes = settings({ runHoursIst: [0, 6, 12, 18] });
    expect(isDue(fourTimes, AT_6AM_IST).due).toBe(true);
    expect(isDue(fourTimes, AT_6PM_IST).due).toBe(true);
    expect(isDue(fourTimes, AT_3AM_IST).due).toBe(false);
  });

  test('compares hours, never minutes', () => {
    // Hobby fires a cron anywhere inside its scheduled hour, so 06:00 and 06:59
    // must both count as the 6 o'clock run.
    const early = new Date('2026-09-06T00:30:00Z'); // 06:00 IST
    const late = new Date('2026-09-06T01:29:00Z'); // 06:59 IST
    expect(isDue(settings({ runHoursIst: [6] }), early).due).toBe(true);
    expect(isDue(settings({ runHoursIst: [6] }), late).due).toBe(true);
  });
});

describe('validatePatch', () => {
  test('accepts a sane schedule', () => {
    expect(validatePatch({ runHoursIst: [6, 18] })).toBeNull();
    expect(validatePatch({ sweepLimit: 40, maxPublishPerRun: 200 })).toBeNull();
    expect(validatePatch({})).toBeNull();
  });

  test('refuses an empty schedule and points at Pause instead', () => {
    // An empty array means "never run" while still looking configured, which is
    // a confusing second way to express something Pause already says.
    const error = validatePatch({ runHoursIst: [] });
    expect(error).toContain('Pause');
  });

  test('refuses hours that are not hours', () => {
    expect(validatePatch({ runHoursIst: [24] })).toContain('between 0 and 23');
    expect(validatePatch({ runHoursIst: [-1] })).toContain('between 0 and 23');
    expect(validatePatch({ runHoursIst: [6.5] })).toContain('whole numbers');
  });

  test('bounds the sweep and publish limits', () => {
    expect(validatePatch({ sweepLimit: 500 })).toContain('between 0 and 200');
    expect(validatePatch({ maxPublishPerRun: 5000 })).toContain('between 0 and 1000');
  });

  test('errors read as sentences, not constraint names', () => {
    // The CHECKs in 014 are the floor; this exists so the admin gets English.
    const error = validatePatch({ runHoursIst: [99] });
    expect(error).toMatch(/^[A-Z].*\.$/);
  });
});
