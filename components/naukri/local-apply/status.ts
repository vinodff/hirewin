/**
 * How each apply status reads to the user.
 *
 * Colour carries meaning (DESIGN.md): emerald = proven done, amber = needs the
 * user, danger = failed, faint = nothing to do here. Only `applied` is emerald,
 * because only `applied` is backed by Naukri's or the ATS's own confirmation.
 */
import type { ApplyStatus, AnswerSource } from '@/lib/apply/types';

export interface StatusMeta {
  label: string;
  /** CSS color value (a design token). */
  color: string;
  /** What the user should do next, when anything. */
  hint: string | null;
}

export const STATUS_META: Record<ApplyStatus, StatusMeta> = {
  applied: { label: 'Applied', color: 'var(--accent)', hint: null },
  already_applied: { label: 'Already applied', color: 'var(--dim)', hint: null },
  needs_review: { label: 'Needs you', color: 'var(--warn)', hint: 'Open the job, check the answers and submit it yourself.' },
  requires_login: { label: 'Naukri login needed', color: 'var(--warn)', hint: 'Connect Naukri, then run this job again.' },
  quota_exceeded: { label: 'Daily quota reached', color: 'var(--warn)', hint: 'Naukri limits applications per day. Try again tomorrow.' },
  captcha: { label: 'Captcha blocked it', color: 'var(--warn)', hint: 'Open the job and complete the check by hand.' },
  external_unsupported: { label: 'Company site', color: 'var(--faint)', hint: 'This career site is not automated yet. Apply there directly.' },
  unavailable: { label: 'Closed', color: 'var(--faint)', hint: null },
  error: { label: 'Failed', color: 'var(--danger)', hint: 'See the log for what went wrong.' },
};

export const STATUS_ORDER: ApplyStatus[] = [
  'applied',
  'needs_review',
  'captcha',
  'requires_login',
  'quota_exceeded',
  'external_unsupported',
  'already_applied',
  'unavailable',
  'error',
];

export const SOURCE_LABEL: Record<AnswerSource, string> = {
  profile: 'from profile',
  cache: 'earlier answer',
  ai: 'AI chosen',
  none: 'left blank',
};
