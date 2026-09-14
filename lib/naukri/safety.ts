/**
 * Safety rails for the headless applier.
 *
 * The applier drives a real browser at a URL supplied in a request body, with
 * a real logged-in session attached. Two things follow from that, and both are
 * enforced here rather than inline, so there is one place to audit:
 *
 *   1. A URL from a request body is untrusted input, and `page.goto()` on
 *      untrusted input is server-side request forgery with a full browser
 *      attached — it will happily fetch cloud metadata, localhost admin panels
 *      and internal services, then screenshot the result.
 *
 *   2. A persistent browser profile holds login cookies. Sharing one across
 *      callers means whoever logged in last is who everyone else applies as.
 */

import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';

/**
 * Hosts the applier may navigate to.
 *
 * An allowlist, not a denylist. A denylist of "internal" addresses is
 * unwinnable: `169.254.169.254`, `[::1]`, `127.1`, `0.0.0.0`, a DNS name that
 * resolves to a private IP, a redirect from a public host to a private one.
 * The applier only ever has business on one job board, so it is allowed one
 * job board.
 */
const ALLOWED_HOSTS = ['naukri.com', 'www.naukri.com', 'm.naukri.com'] as const;

export interface UrlVerdict {
  allowed: boolean;
  /** Why not, in words a log reader can act on. */
  reason: string | null;
}

/** True when `host` is exactly `domain` or a subdomain of it. */
function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * May the applier navigate here?
 *
 * Rejects anything that is not https on an allowlisted job-board host. https
 * specifically: an http URL can be transparently redirected, and the whole
 * point of the allowlist is that the destination is known before navigating.
 */
export function checkJobUrl(raw: unknown): UrlVerdict {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { allowed: false, reason: 'job URL is missing' };
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { allowed: false, reason: 'job URL is not a valid URL' };
  }

  // Blocks file:, data:, about:, chrome:, view-source: and every other scheme
  // a browser will happily open but no job posting uses.
  if (url.protocol !== 'https:') {
    return { allowed: false, reason: `refusing to navigate to a non-https URL (${url.protocol})` };
  }

  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.some((allowed) => hostMatches(host, allowed))) {
    return {
      allowed: false,
      reason: `refusing to navigate to "${host}" — only Naukri job URLs are allowed`,
    };
  }

  // Credentials in a URL are never legitimate here and can confuse the
  // host parse in older clients (https://naukri.com@evil.test/).
  if (url.username || url.password) {
    return { allowed: false, reason: 'job URL must not contain credentials' };
  }

  return { allowed: true, reason: null };
}

/**
 * Where one user's browser profile lives.
 *
 * Keyed by a hash of the user id, not the id itself: the path ends up in logs
 * and error messages, and a directory listing should not enumerate user ids.
 *
 * Under the OS temp dir rather than the project directory. A persistent
 * profile inside `process.cwd()` is both a serving surface on some hosts and
 * an accident waiting to be committed; and on a read-only deployment
 * filesystem, writing inside the bundle fails outright.
 */
export function sessionDirForUser(userId: string): string {
  const digest = createHash('sha256').update(userId).digest('hex').slice(0, 16);
  return path.join(os.tmpdir(), 'hirewin-naukri-sessions', digest);
}

/**
 * Where proof screenshots go.
 *
 * NOT `public/`. A screenshot of a filled application form contains the
 * applicant's name, email, phone, current CTC and expected CTC. Serving that
 * from a static directory means anyone who can guess the filename — and the
 * old one was `applied-{jobId}-{Date.now()}.png`, where the caller supplies
 * the job id and the timestamp is a narrow guess — can read it.
 *
 * Also under the OS temp dir, because a Vercel-style deployment has a
 * read-only filesystem everywhere else and `fs.mkdirSync` on `public/` throws
 * EROFS at runtime.
 */
export function proofsDir(): string {
  return path.join(os.tmpdir(), 'hirewin-naukri-proofs');
}

/** Filesystem-safe fragment of an arbitrary id, for use in a filename. */
export function safeIdFragment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'unknown';
}
