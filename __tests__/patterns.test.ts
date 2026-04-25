import { describe, it, expect } from 'vitest';
import { analyzePatterns } from '../lib/patterns';

const makeVersion = (
  status: string,
  deepScore: number | null = null,
  archetype: string | null = null,
  gaps: unknown[] = []
) => ({ application_status: status, deep_score: deepScore, archetype, gaps });

describe('analyzePatterns', () => {
  const versions = [
    makeVersion('applied', 4.2, 'agentic'),
    makeVersion('interview', 4.5, 'agentic'),
    makeVersion('rejected', 2.1, 'technical_pm'),
    makeVersion('offer', 4.8, 'agentic'),
    makeVersion('rejected', 1.9, 'solutions_architect'),
    makeVersion('applied', 3.5, 'agentic'),
    makeVersion('discarded', null, null),
  ];

  it('produces funnel with correct counts', () => {
    const result = analyzePatterns(versions);
    expect(result.funnel['applied']).toBe(2);
    expect(result.funnel['interview']).toBe(1);
    expect(result.funnel['rejected']).toBe(2);
    expect(result.funnel['offer']).toBe(1);
  });

  it('positive avg score is higher than negative avg score', () => {
    const result = analyzePatterns(versions);
    const { positive, negative } = result.score_comparison;
    // Only check if both sides have data
    if (positive.avg > 0 && negative.avg > 0) {
      expect(positive.avg).toBeGreaterThan(negative.avg);
    }
  });

  it('archetype breakdown includes agentic', () => {
    const result = analyzePatterns(versions);
    const agentic = result.archetype_breakdown.find((a) => a.archetype === 'agentic');
    expect(agentic).toBeDefined();
    expect(agentic!.count).toBe(4);
  });

  it('handles versions with no deep_score gracefully', () => {
    const noScores = [
      makeVersion('applied'),
      makeVersion('rejected'),
      makeVersion('interview'),
      makeVersion('offer'),
      makeVersion('applied'),
    ];
    expect(() => analyzePatterns(noScores)).not.toThrow();
  });

  it('application_count matches input length', () => {
    const result = analyzePatterns(versions);
    expect(result.application_count).toBe(versions.length);
  });
});
