import type { createClient } from '@/lib/supabase/server';
import type { Plan } from '@/types';
import { getEffectiveLimits, isUnlimitedSession } from '@/lib/usage';

export const SHARES_NEEDED = 5;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Download quota, charged on delivery.
 *
 *   checkDownload()  read-only: may this user download at all?
 *        │
 *        ├── denied ──────────────► 403, nothing written
 *        │
 *        └── allowed
 *              │
 *          generatePdf/Docx()      ← if this throws, no credit was spent
 *              │
 *          commitDownload()        atomic: check + increment in one statement
 *              │
 *              ├── false ────────► 403 (a concurrent request took the last credit)
 *              └── true ─────────► deliver the file
 *
 * Spending before generating meant a 500 destroyed a paid purchase — for a
 * single-download buyer, their whole ₹19. The atomic commit still closes the
 * double-spend race: clicking PDF and DOCX together yields one credit, not two.
 */
export type DownloadGrant =
  /** Share-unlocked: unlimited, nothing to charge. */
  | { allowed: true; spendLimit: null }
  /** Quota path: call commitDownload(limit) once the file exists. */
  | { allowed: true; spendLimit: number }
  | { allowed: false; status: 401 | 403; error: string };

/** Read-only eligibility. Writes nothing.
 *  `email` must be the server-verified address from supabase.auth.getUser(). */
export async function checkDownload(
  supabase: Supabase,
  userId: string,
  rawVersionId: unknown,
  email?: string | null
): Promise<DownloadGrant> {
  // Admin testing accounts skip the paywall entirely — spendLimit null means
  // "nothing to charge", so no counter moves either.
  if (isUnlimitedSession(email)) return { allowed: true, spendLimit: null };

  await supabase.rpc('reset_monthly_usage_if_needed', { profile_id: userId });

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, downloads_used')
    .eq('id', userId)
    .single();

  if (!profile) return { allowed: false, status: 403, error: 'locked' };

  if (process.env.DOWNLOAD_LIMITS_DISABLED === 'true') {
    return { allowed: true, spendLimit: null };
  }

  const limit = getEffectiveLimits(profile.plan as Plan, email).downloads;
  const used = profile.downloads_used ?? 0;

  if (limit === Infinity) return { allowed: true, spendLimit: -1 };
  if (limit > 0 && used < limit) return { allowed: true, spendLimit: limit };

  // Out of credits — fall back to share-to-unlock. Only shares against a
  // version this user owns count, so a forged versionId unlocks nothing.
  const versionId =
    typeof rawVersionId === 'string' && UUID_RE.test(rawVersionId) ? rawVersionId : null;

  if (versionId) {
    const { data: owned } = await supabase
      .from('resume_versions')
      .select('id')
      .eq('id', versionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (owned) {
      const { count } = await supabase
        .from('share_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('version_id', versionId);

      if ((count ?? 0) >= SHARES_NEEDED) return { allowed: true, spendLimit: null };
    }
  }

  return { allowed: false, status: 403, error: 'locked' };
}

/**
 * Charge one download. Atomic — the check and the increment are a single
 * UPDATE, so concurrent requests cannot both pass.
 * Returns false when the credit was taken by a concurrent request.
 */
export async function commitDownload(
  supabase: Supabase,
  userId: string,
  spendLimit: number | null
): Promise<boolean> {
  if (spendLimit === null) return true; // share-unlocked, nothing to charge

  const { data: spent } = await supabase.rpc('try_increment_downloads_used', {
    p_user_id: userId,
    p_limit: spendLimit,
  });

  return !!spent;
}
