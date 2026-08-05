import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkDownload, commitDownload, SHARES_NEEDED } from '@/lib/download-gate';
import { PLAN_LIMITS } from '@/types';

const VALID_UUID = '11111111-2222-4333-8444-555555555555';

/** Minimal Supabase stub recording the RPC calls the gate makes. */
function makeSupabase(opts: {
  plan?: string | null;
  used?: number;
  credits?: number;
  shares?: number;
  ownsVersion?: boolean;
}) {
  let credits = opts.credits ?? 0;
  const rpcCalls: Array<{ fn: string; args: unknown }> = [];

  const supabase = {
    rpcCalls,
    rpc: vi.fn(async (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      if (fn === 'try_increment_downloads_used') {
        const limit = (args as { p_limit: number }).p_limit;
        if (limit < 0) return { data: true };
        if (credits > 0) { credits -= 1; return { data: true }; }
        return { data: false };
      }
      return { data: null };
    }),
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: opts.plan === null
                  ? null
                  : { plan: opts.plan ?? 'free', downloads_used: opts.used ?? 0 },
              }),
            }),
          }),
        };
      }
      if (table === 'resume_versions') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.ownsVersion ? { id: VALID_UUID } : null }) }) }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ eq: async () => ({ count: opts.shares ?? 0 }) }) }) };
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase as any;
}

const incrementCalls = (sb: { rpcCalls: Array<{ fn: string; args: unknown }> }) =>
  sb.rpcCalls.filter((c) => c.fn === 'try_increment_downloads_used');

beforeEach(() => { delete process.env.DOWNLOAD_LIMITS_DISABLED; });

describe('checkDownload — read-only eligibility', () => {
  it('blocks a free user: the free tier has no downloads', async () => {
    const sb = makeSupabase({ plan: 'free' });
    expect(await checkDownload(sb, 'u1', null)).toEqual({ allowed: false, status: 403, error: 'locked' });
  });

  it('never writes while checking — no credit is spent on the check', async () => {
    const sb = makeSupabase({ plan: 'starter', used: 0 });
    await checkDownload(sb, 'u1', null);
    expect(incrementCalls(sb)).toHaveLength(0);
  });

  it('allows a starter user with an unused credit', async () => {
    const sb = makeSupabase({ plan: 'starter', used: 0 });
    expect(await checkDownload(sb, 'u1', null)).toEqual({ allowed: true, spendLimit: 1 });
  });

  it('blocks a starter user who already spent their credit', async () => {
    const sb = makeSupabase({ plan: 'starter', used: 1 });
    expect((await checkDownload(sb, 'u1', null)).allowed).toBe(false);
  });

  it('allows pack3 up to three, then blocks', async () => {
    const ok = makeSupabase({ plan: 'pack3', used: PLAN_LIMITS.pack3.downloads - 1 });
    expect((await checkDownload(ok, 'u1', null)).allowed).toBe(true);
    const spent = makeSupabase({ plan: 'pack3', used: PLAN_LIMITS.pack3.downloads });
    expect((await checkDownload(spent, 'u1', null)).allowed).toBe(false);
  });

  it('marks unlimited plans with -1 rather than Infinity', async () => {
    const sb = makeSupabase({ plan: 'pro' });
    expect(await checkDownload(sb, 'u1', null)).toEqual({ allowed: true, spendLimit: -1 });
  });

  it('unlocks via shares only for a version the user owns', async () => {
    const sb = makeSupabase({ plan: 'free', shares: SHARES_NEEDED, ownsVersion: true });
    expect(await checkDownload(sb, 'u1', VALID_UUID)).toEqual({ allowed: true, spendLimit: null });
  });

  it('refuses share-unlock for a version the user does not own', async () => {
    const sb = makeSupabase({ plan: 'free', shares: SHARES_NEEDED, ownsVersion: false });
    expect((await checkDownload(sb, 'u1', VALID_UUID)).allowed).toBe(false);
  });

  it('refuses share-unlock below the threshold', async () => {
    const sb = makeSupabase({ plan: 'free', shares: SHARES_NEEDED - 1, ownsVersion: true });
    expect((await checkDownload(sb, 'u1', VALID_UUID)).allowed).toBe(false);
  });

  it('ignores a non-UUID versionId instead of querying with it', async () => {
    const sb = makeSupabase({ plan: 'free', shares: 99, ownsVersion: true });
    expect((await checkDownload(sb, 'u1', "' OR 1=1 --")).allowed).toBe(false);
  });

  it('blocks when the profile row is missing', async () => {
    expect((await checkDownload(makeSupabase({ plan: null }), 'u1', null)).allowed).toBe(false);
  });
});

describe('commitDownload — charged only on delivery', () => {
  it('charges the quota path atomically via the RPC', async () => {
    const sb = makeSupabase({ plan: 'starter', credits: 1 });
    expect(await commitDownload(sb, 'u1', 1)).toBe(true);
    expect(incrementCalls(sb)[0].args).toEqual({ p_user_id: 'u1', p_limit: 1 });
  });

  it('charges nothing on the share-unlocked path', async () => {
    const sb = makeSupabase({ plan: 'free' });
    expect(await commitDownload(sb, 'u1', null)).toBe(true);
    expect(incrementCalls(sb)).toHaveLength(0);
  });

  it('returns false when a concurrent request took the last credit', async () => {
    const sb = makeSupabase({ plan: 'starter', credits: 1 });
    expect(await commitDownload(sb, 'u1', 1)).toBe(true);
    expect(await commitDownload(sb, 'u1', 1)).toBe(false);
  });

  it('clicking PDF and DOCX together spends one credit, not two', async () => {
    const sb = makeSupabase({ plan: 'starter', credits: 1 });
    const [pdf, docx] = await Promise.all([
      commitDownload(sb, 'u1', 1),
      commitDownload(sb, 'u1', 1),
    ]);
    expect([pdf, docx].filter(Boolean)).toHaveLength(1);
  });
});

describe('a failed render costs the user nothing', () => {
  it('leaves the credit unspent when generation throws before commit', async () => {
    const sb = makeSupabase({ plan: 'starter', used: 0, credits: 1 });

    const grant = await checkDownload(sb, 'u1', null);
    expect(grant.allowed).toBe(true);

    // Stand-in for generatePdf blowing up after the gate passed.
    await expect(Promise.reject(new Error('pdfkit exploded'))).rejects.toThrow();

    // The route's catch returns 500 without reaching commitDownload.
    expect(incrementCalls(sb)).toHaveLength(0);

    // The credit survives, so the next attempt still works.
    expect(await commitDownload(sb, 'u1', 1)).toBe(true);
  });
});
