/**
 * Is the automation browser signed in to Naukri?
 *
 * The engine never automates the login itself (OTP, captcha and a password in
 * a script are all lines this project does not cross). The owner signs in once
 * by hand in the persistent profile; this module only checks that the sign-in
 * is still there, so a run can stop up front instead of opening twenty job
 * pages that each say "Continue with Google".
 *
 * Signed in requires POSITIVE evidence. The first live check against a brand
 * new profile — zero Naukri cookies — reported loggedIn:true, because the rule
 * was "on /mnjuser and no Login button visible": a page that had not rendered
 * its header (or rendered something else) looked exactly like a signed-in one.
 * Absence of a Login button proves nothing. Now:
 *   - page checked: a signed-in header element must be visible (profile
 *     drawer / avatar / profile link), on a naukri.com /mnjuser page, with no
 *     Login/Register control;
 *   - page not checked: the auth cookie (`nauk_at`, as reported by open-source
 *     bots) must be present.
 * Anything else is "not confirmed", which is reported as not logged in with
 * the reason. Only cookie NAMES are ever read into evidence.
 */
import type { Page } from 'playwright';

export const NAUKRI_ORIGIN = 'https://www.naukri.com';
export const NAUKRI_HOMEPAGE_URL = `${NAUKRI_ORIGIN}/mnjuser/homepage`;

const AUTH_COOKIE_PREFIX = 'nauk_at';

/** Header controls only a signed-out visitor sees (ids from Naukri's header; text as a fallback). */
export const LOGIN_CONTROL_SELECTOR = [
  '#login_Layer',
  '#register_Layer',
  'a:text-is("Login")',
  'button:text-is("Login")',
  'a:text-is("Register")',
  'button:text-is("Register")',
].join(', ');

/** Elements only a signed-in header renders. Positive evidence of a session. */
export const SIGNED_IN_SELECTOR = [
  '.nI-gNb-drawer__icon',
  '.nI-gNb-icon-img',
  'a[href*="/mnjuser/profile"]',
].join(', ');

/** Either outcome has rendered; used to stop waiting early. */
const SETTLED_SELECTOR = `${LOGIN_CONTROL_SELECTOR}, ${SIGNED_IN_SELECTOR}, input[type="password"]`;

export interface HomepageFacts {
  /** Final URL after any redirect. */
  url: string;
  loginControlVisible: boolean;
  /** A signed-in header element is visible. */
  signedInMarkerVisible: boolean;
  /**
   * Naukri's CDN refused the browser (HTTP 403 / "Access Denied"). Seen live:
   * headless Chrome gets exactly this on every Naukri page. A block page has
   * no Login button, which is how it once passed for a signed-in page.
   */
  accessDenied: boolean;
}

export interface LoginCheck {
  loggedIn: boolean;
  evidence: string;
}

function isNaukriHost(host: string): boolean {
  return host === 'naukri.com' || host.endsWith('.naukri.com');
}

/** Pure decision from cookie names and (optionally) what the homepage showed. */
export function interpretLoginSignals(cookieNames: string[], home: HomepageFacts | null): LoginCheck {
  const naukriNames = [...new Set(cookieNames.filter((n) => /^nauk/i.test(n)))].sort();
  const hasAuthCookie = cookieNames.some((n) => n.startsWith(AUTH_COOKIE_PREFIX));
  const cookiePart = hasAuthCookie
    ? `auth cookie present (names: ${naukriNames.join(', ')})`
    : `no ${AUTH_COOKIE_PREFIX} auth cookie (naukri cookie names: ${naukriNames.join(', ') || 'none'})`;

  if (!home) {
    return { loggedIn: hasAuthCookie, evidence: `${cookiePart}; homepage not checked` };
  }

  let host = '';
  let pathname = '';
  try {
    const u = new URL(home.url);
    host = u.hostname.toLowerCase();
    pathname = u.pathname;
  } catch {
    return { loggedIn: false, evidence: `${cookiePart}; homepage ended on an unreadable URL` };
  }

  if (home.accessDenied) {
    return { loggedIn: false, evidence: `${cookiePart}; Naukri refused the automated browser on ${pathname} (HTTP 403 Access Denied)` };
  }
  if (!isNaukriHost(host) || /\/n?login\b/i.test(pathname)) {
    return { loggedIn: false, evidence: `${cookiePart}; homepage redirected to ${host}${pathname}` };
  }
  if (home.loginControlVisible) {
    return { loggedIn: false, evidence: `${cookiePart}; ${pathname} shows Login/Register` };
  }
  if (!pathname.startsWith('/mnjuser')) {
    return { loggedIn: false, evidence: `${cookiePart}; homepage landed on ${pathname}, not /mnjuser` };
  }
  if (!home.signedInMarkerVisible) {
    return {
      loggedIn: false,
      evidence: `${cookiePart}; ${pathname} showed no signed-in header (not confirmed — page may not have rendered)`,
    };
  }
  return { loggedIn: true, evidence: `${cookiePart}; ${pathname} shows the signed-in header` };
}

export interface LoginCheckOptions {
  /** Load the homepage as well as reading cookies. Default true. */
  navigate?: boolean;
  navigationTimeoutMs?: number;
  /** How long to wait for the header to render after DOMContentLoaded. */
  settleTimeoutMs?: number;
}

/**
 * Check the sign-in on the given page. With `navigate` (default) this page is
 * sent to the Naukri homepage, so pass a page that is free to navigate.
 */
export async function checkNaukriLogin(page: Page, options: LoginCheckOptions = {}): Promise<LoginCheck> {
  const { navigate = true, navigationTimeoutMs = 45_000, settleTimeoutMs = 8_000 } = options;

  let names: string[] = [];
  try {
    names = (await page.context().cookies(NAUKRI_ORIGIN)).map((c) => c.name);
  } catch {
    // Cookie access failing is not proof of anything; the homepage check decides.
  }

  if (!navigate) return interpretLoginSignals(names, null);

  try {
    const response = await page.goto(NAUKRI_HOMEPAGE_URL, { waitUntil: 'domcontentloaded', timeout: navigationTimeoutMs });
    await page
      .locator(SETTLED_SELECTOR)
      .first()
      .waitFor({ state: 'visible', timeout: settleTimeoutMs })
      .catch(() => undefined);
    const loginControlVisible = (await page.locator(LOGIN_CONTROL_SELECTOR).visible().count()) > 0;
    const signedInMarkerVisible = (await page.locator(SIGNED_IN_SELECTOR).visible().count()) > 0;
    const title = await page.title().catch(() => '');
    const accessDenied = response?.status() === 403 || /access denied/i.test(title);
    return interpretLoginSignals(names, { url: page.url(), loginControlVisible, signedInMarkerVisible, accessDenied });
  } catch (err) {
    // The page could not be checked: only the cookie can speak, and the
    // evidence says the page check failed.
    const fallback = interpretLoginSignals(names, null);
    const reason = err instanceof Error ? err.message.split('\n')[0] : 'unknown error';
    return { ...fallback, evidence: `${fallback.evidence} (homepage load failed: ${reason})` };
  }
}
