/**
 * The auto-apply engine is local-only, and these routes enforce it.
 *
 * It drives the owner's own logged-in Chrome profile and submits real job
 * applications under their identity. Exposed on a public deployment, anyone
 * reaching the URL could apply as them. So instead of the relaxed "no login
 * for testing" checks, the routes refuse unless ALL of these hold:
 *
 *  - not running on Vercel (the engine cannot work there anyway: no desktop
 *    Chrome, no persistent disk, no display for the one-time login window);
 *  - the request arrived on a loopback host (localhost / 127.0.0.1 / ::1),
 *    so another device on the same Wi-Fi cannot drive it;
 *  - development mode, or HIREWIN_LOCAL_RUNNER=1 set explicitly for a local
 *    production build.
 */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export interface LocalVerdict {
  ok: boolean;
  reason?: string;
}

export function localRunnerVerdict(req: { headers: Headers; url: string }): LocalVerdict {
  if (process.env.VERCEL) {
    return { ok: false, reason: 'Auto-apply runs only on your own PC, not on the hosted site.' };
  }
  const enabled = process.env.NODE_ENV !== 'production' || process.env.HIREWIN_LOCAL_RUNNER === '1';
  if (!enabled) {
    return { ok: false, reason: 'Set HIREWIN_LOCAL_RUNNER=1 to use auto-apply in a local production build.' };
  }

  // Host header first (what the browser actually used), then the parsed URL.
  const rawHost = req.headers.get('host') ?? new URL(req.url).host;
  const hostname = rawHost.startsWith('[') ? rawHost.slice(0, rawHost.indexOf(']') + 1) : rawHost.split(':')[0];
  if (!LOOPBACK.has(hostname.toLowerCase())) {
    return { ok: false, reason: 'Open HireWin at http://localhost to use auto-apply.' };
  }

  /*
   * Next's own server sets x-forwarded-for on EVERY request (to the socket
   * address), so its mere presence proves nothing — refusing on presence
   * blocked every local request, which the first live call showed. What
   * matters is where it points: a tunnel or proxy relays a non-loopback
   * client address, so every hop listed must be this machine.
   */
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded && process.env.HIREWIN_TRUST_FORWARDED !== '1') {
    const hops = forwarded.split(',').map((h) => h.trim().toLowerCase());
    if (!hops.every(isLoopbackAddress)) {
      return { ok: false, reason: 'Auto-apply refuses requests relayed from another machine.' };
    }
  }
  return { ok: true };
}

function isLoopbackAddress(address: string): boolean {
  return (
    address === '::1' ||
    address === '[::1]' ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(address) ||
    /^::ffff:127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(address)
  );
}
