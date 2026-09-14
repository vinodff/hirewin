/**
 * Regression tests for the auto-apply security fixes.
 *
 * Each block below corresponds to a bug that was live. They are written to
 * FAIL against the old code: before the fix, `checkJobUrl` did not exist and
 * `page.goto()` took whatever the request body contained, while the session
 * directory defaulted to one shared path for every caller.
 */
import { describe, expect, test } from 'vitest';
import { checkJobUrl, sessionDirForUser, proofsDir, safeIdFragment } from '@/lib/naukri/safety';

describe('checkJobUrl — SSRF gate', () => {
  test('allows a real Naukri posting', () => {
    const verdict = checkJobUrl(
      'https://www.naukri.com/job-listings-react-intern-code-inbound-new-delhi-251125508078'
    );
    expect(verdict.allowed).toBe(true);
  });

  test('allows naukri subdomains', () => {
    expect(checkJobUrl('https://m.naukri.com/job-listings-x-1').allowed).toBe(true);
    expect(checkJobUrl('https://naukri.com/job-listings-x-1').allowed).toBe(true);
  });

  test.each([
    // The one that matters most: a full browser fetching cloud credentials,
    // then screenshotting them into what used to be a public directory.
    ['http://169.254.169.254/latest/meta-data/iam/security-credentials/', 'cloud metadata'],
    ['https://169.254.169.254/latest/meta-data/', 'cloud metadata over https'],
    ['http://localhost:3000/api/admin/overview', 'own admin API'],
    ['http://127.0.0.1:6379/', 'local redis'],
    ['https://[::1]:8080/', 'ipv6 loopback'],
    ['http://10.0.0.5/internal', 'private range'],
    ['file:///etc/passwd', 'local file'],
    ['file:///C:/Users/vinod/Downloads/hirewin/.env.local', 'the env file'],
    ['data:text/html,<script>fetch("/")</script>', 'data URL'],
    ['about:config', 'browser internals'],
    ['https://evil.test/steal', 'an arbitrary host'],
  ])('blocks %s (%s)', (url) => {
    expect(checkJobUrl(url).allowed).toBe(false);
  });

  test('blocks a lookalike host', () => {
    // `naukri.com.evil.test` ends with neither `naukri.com` nor `.naukri.com`,
    // and a naive `includes('naukri.com')` would have let it through.
    expect(checkJobUrl('https://naukri.com.evil.test/job').allowed).toBe(false);
    expect(checkJobUrl('https://notnaukri.com/job').allowed).toBe(false);
  });

  test('blocks credentials embedded in the URL', () => {
    // https://naukri.com@evil.test/ has hostname evil.test, but reads as
    // Naukri to a human skimming a log line.
    expect(checkJobUrl('https://naukri.com@evil.test/job').allowed).toBe(false);
  });

  test('blocks plain http even on an allowed host', () => {
    // http can be transparently redirected, which defeats knowing the
    // destination before navigating.
    expect(checkJobUrl('http://www.naukri.com/job-listings-x-1').allowed).toBe(false);
  });

  test('rejects junk without throwing', () => {
    for (const bad of [null, undefined, '', '   ', 42, {}, [], 'not a url']) {
      const verdict = checkJobUrl(bad);
      expect(verdict.allowed).toBe(false);
      expect(verdict.reason).toBeTruthy();
    }
  });

  test('every refusal explains itself', () => {
    // The reason goes into the API response and the log; "false" alone is
    // undebuggable at 2am.
    expect(checkJobUrl('file:///etc/passwd').reason).toContain('https');
    expect(checkJobUrl('https://evil.test/x').reason).toContain('evil.test');
  });
});

describe('sessionDirForUser — one browser profile per user', () => {
  test('two users never share a directory', () => {
    // The old default was a single shared path, so whoever logged into Naukri
    // last was who everyone else applied as.
    expect(sessionDirForUser('user-a')).not.toBe(sessionDirForUser('user-b'));
  });

  test('the same user is stable across calls', () => {
    // Otherwise the Naukri login is lost between runs and every application
    // stops at requires_login.
    expect(sessionDirForUser('user-a')).toBe(sessionDirForUser('user-a'));
  });

  test('the path does not leak the user id', () => {
    const id = '3f9c1a20-dead-beef-cafe-000000000001';
    expect(sessionDirForUser(id)).not.toContain(id);
  });

  test('lives outside the project directory', () => {
    // A persistent browser profile inside process.cwd() is a serving surface
    // on some hosts, and on a read-only deploy filesystem it cannot be created
    // at all.
    const dir = sessionDirForUser('user-a');
    expect(dir).not.toContain('hirewin\\lib');
    expect(dir).not.toContain('hirewin/lib');
    expect(dir.length).toBeGreaterThan(0);
  });
});

describe('proofsDir — screenshots are not public', () => {
  test('is not under public/', () => {
    // Screenshots show the filled form: name, email, phone, current and
    // expected CTC. Serving them statically meant anyone who guessed the
    // filename could read them.
    const dir = proofsDir();
    expect(dir).not.toMatch(/[\\/]public[\\/]/);
  });
});

describe('safeIdFragment — filenames from caller-supplied ids', () => {
  test('strips path traversal', () => {
    expect(safeIdFragment('../../../etc/passwd')).not.toContain('..');
    expect(safeIdFragment('../../../etc/passwd')).not.toContain('/');
  });

  test('strips separators and keeps it short', () => {
    expect(safeIdFragment('a/b\\c:d')).toBe('a_b_c_d');
    expect(safeIdFragment('x'.repeat(500)).length).toBeLessThanOrEqual(64);
  });

  test('never returns an empty name', () => {
    expect(safeIdFragment('///')).toBeTruthy();
    expect(safeIdFragment('')).toBe('unknown');
  });
});
