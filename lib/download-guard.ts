import type { SupabaseClient } from '@supabase/supabase-js';
import { canDownload } from '@/lib/usage';
import { PLAN_LIMITS, type Plan } from '@/types';

export const SHARES_NEEDED = 5;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DownloadAuthorization =
  | { kind: 'plan'; limit: number }
  | { kind: 'share'; downloadText: string; versionId: string }
  | { kind: 'denied' };

/**
 * Decide how a download may proceed, before generation.
 *
 * Behaviour, and why it differs from the pre-batch-2 routes:
 * - Plan path: quota is NOT consumed here. The caller must generate
 *   first, then call try_increment_downloads_used (012) and only
 *   deliver the file if it returns true. That closes both the
 *   concurrent-download race (check-and-increment in one UPDATE) and
 *   the "generation failure burns a credit" bug.
 * - Share path: a versionId must be present, must belong to the
 *   caller (checked against resume_versions, not trusted from the
 *   request), and must have >= SHARES_NEEDED share_events. The
 *   download then serves the STORED version text (optimized, falling
 *   back to original), NOT the caller-supplied resumeText. That is
 *   the fix for P1-5: previously 5 shares on one owned version
 *   unlocked unlimited downloads of any pasted text, forever.
 *   Behaviour change to note for users: a share-unlocked download
 *   of an edited (unsaved) resume will download the saved version
 *   instead of the edited text. Plan-allowed downloads are
 *   unaffected and still use the supplied text. The viewer modal
 *   already sends stored text, so it is unaffected.
 * - No versionId, foreign versionId, or too few shares => denied.
 */
export async function authorizeDownload(
  supabase: SupabaseClient,
  userId: string,
  plan: string,
  downloadsUsed: number,
  versionId: unknown
): Promise<DownloadAuthorization> {
  const limits = PLAN_LIMITS[plan as Plan];
  const limit = limits ? limits.downloads : 0;

  if (canDownload(plan as Plan, downloadsUsed)) {
    return { kind: 'plan', limit };
  }

  if (typeof versionId !== 'string' || !UUID_RE.test(versionId)) {
    return { kind: 'denied' };
  }

  // Ownership first: a foreign or nonexistent version can never unlock.
  const { data: version } = await supabase
    .from('resume_versions')
    .select('id, optimized_resume, original_resume')
    .eq('id', versionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!version) {
    return { kind: 'denied' };
  }

  const { count } = await supabase
    .from('share_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('version_id', versionId);

  if ((count ?? 0) < SHARES_NEEDED) {
    return { kind: 'denied' };
  }

  const downloadText = (version.optimized_resume as string | null) ?? (version.original_resume as string | null) ?? '';
  if (!downloadText.trim()) {
    return { kind: 'denied' };
  }

  return { kind: 'share', downloadText, versionId };
}

/**
 * Consume one download credit atomically, after successful generation.
 * Returns true if the credit was consumed (or the plan is unlimited,
 * in which case no counter is touched). Returns false if the quota
 * was lost in a race — the caller must NOT deliver the file then.
 */
export async function consumeDownloadCredit(
  supabase: SupabaseClient,
  userId: string,
  limit: number
): Promise<boolean> {
  // Mirror canDownload: the kill-switch disables the limit entirely,
  // so the atomic increment must not re-impose it.
  if (process.env.DOWNLOAD_LIMITS_DISABLED === 'true') return true;
  if (limit === Infinity) return true;
  const { data, error } = await supabase.rpc('try_increment_downloads_used', {
    p_user_id: userId,
    p_limit: limit,
  });
  if (error) return false;
  return data === true;
}
