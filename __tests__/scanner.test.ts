import { describe, it, expect } from 'vitest';
import { detectApi } from '../lib/scanner';

describe('detectApi', () => {
  it('detects Greenhouse job-boards URL', () => {
    const result = detectApi({
      id: '1',
      name: 'Stripe',
      careers_url: 'https://job-boards.greenhouse.io/stripe',
      api_url: null,
      ats_platform: null,
    });
    expect(result).not.toBeNull();
    expect(result!.type).toBe('greenhouse');
    expect(result!.url).toContain('stripe');
  });

  it('detects Greenhouse boards URL', () => {
    const result = detectApi({
      id: '1',
      name: 'Airbnb',
      careers_url: 'https://boards.greenhouse.io/airbnb',
      api_url: null,
      ats_platform: null,
    });
    expect(result!.type).toBe('greenhouse');
    expect(result!.url).toContain('airbnb');
  });

  it('detects Ashby URL', () => {
    const result = detectApi({
      id: '2',
      name: 'Linear',
      careers_url: 'https://jobs.ashbyhq.com/linear',
      api_url: null,
      ats_platform: null,
    });
    expect(result!.type).toBe('ashby');
    expect(result!.url).toContain('linear');
  });

  it('detects Lever URL', () => {
    const result = detectApi({
      id: '3',
      name: 'Notion',
      careers_url: 'https://jobs.lever.co/notion',
      api_url: null,
      ats_platform: null,
    });
    expect(result!.type).toBe('lever');
    expect(result!.url).toContain('notion');
  });

  it('uses explicit api_url + ats_platform when provided', () => {
    const result = detectApi({
      id: '4',
      name: 'Custom',
      careers_url: 'https://custom.com/careers',
      api_url: 'https://boards-api.greenhouse.io/v1/boards/custom/jobs',
      ats_platform: 'greenhouse',
    });
    expect(result!.type).toBe('greenhouse');
    expect(result!.url).toBe('https://boards-api.greenhouse.io/v1/boards/custom/jobs');
  });

  it('returns null for unknown URL', () => {
    const result = detectApi({
      id: '5',
      name: 'Unknown',
      careers_url: 'https://example.com/careers',
      api_url: null,
      ats_platform: null,
    });
    expect(result).toBeNull();
  });
});
