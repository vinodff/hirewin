'use client';

/**
 * Naukri connection, checked for real.
 *
 * Replaces an "I've Logged In" button that set a sessionStorage flag: nothing
 * was checked, and signing in to naukri.com in your normal browser never
 * reached the automation browser anyway. Here the status comes from the
 * HireWin Chrome profile itself (GET /api/apply/session), with the evidence
 * shown, and "Connect" opens that profile's own window for a manual sign-in.
 */
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, LogIn, RefreshCw } from 'lucide-react';

export type ConnectionState =
  | { kind: 'checking' }
  | { kind: 'connected'; evidence: string }
  | { kind: 'disconnected'; evidence: string }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'error'; reason: string };

export function useNaukriConnection(autoCheck: boolean) {
  const [state, setState] = useState<ConnectionState>({ kind: 'checking' });
  const [opening, setOpening] = useState(false);
  const [note, setNote] = useState('');

  const check = useCallback(async () => {
    setState({ kind: 'checking' });
    try {
      const res = await fetch('/api/apply/session', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setState({ kind: 'unavailable', reason: data.error ?? 'Auto-apply runs only on your own PC.' });
      } else if (!res.ok) {
        setState({ kind: 'error', reason: data.error ?? `Check failed (HTTP ${res.status}).` });
      } else if (data.loggedIn) {
        setState({ kind: 'connected', evidence: data.evidence ?? '' });
      } else {
        setState({ kind: 'disconnected', evidence: data.evidence ?? '' });
      }
    } catch (error) {
      setState({ kind: 'error', reason: error instanceof Error ? error.message : 'Network error' });
    }
  }, []);

  const connect = useCallback(async () => {
    setOpening(true);
    setNote('');
    try {
      const res = await fetch('/api/apply/session', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      setNote(res.ok ? data.message : data.error ?? `Could not open the login window (HTTP ${res.status}).`);
    } catch (error) {
      setNote(error instanceof Error ? error.message : 'Network error');
    } finally {
      setOpening(false);
    }
  }, []);

  useEffect(() => {
    if (autoCheck) void check();
  }, [autoCheck, check]);

  return { state, check, connect, opening, note };
}

export function NaukriConnectionCard({
  autoCheck = true,
  controller,
}: {
  autoCheck?: boolean;
  /** Pass the parent's hook result when the parent also needs the state (e.g. to gate a Start button). */
  controller?: ReturnType<typeof useNaukriConnection>;
}) {
  // Always called, so hook order never changes; ignored when a controller is given.
  const own = useNaukriConnection(autoCheck && !controller);
  const { state, check, connect, opening, note } = controller ?? own;

  const dot =
    state.kind === 'connected' ? 'var(--accent)' : state.kind === 'checking' ? 'var(--faint)' : 'var(--warn)';
  const title =
    state.kind === 'connected'
      ? 'Naukri connected'
      : state.kind === 'checking'
        ? 'Checking the HireWin browser…'
        : state.kind === 'unavailable'
          ? 'Auto-apply is local-only'
          : state.kind === 'error'
            ? 'Could not check Naukri'
            : 'Naukri not connected';

  return (
    <div className="rounded-xl p-3.5 space-y-2.5 border" style={{ background: 'var(--surface-2)', borderColor: 'var(--edge)' }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} aria-hidden />
          <h4 className="text-xs font-semibold truncate" style={{ color: 'var(--fg)' }}>
            {title}
          </h4>
        </div>
        {state.kind !== 'unavailable' && (
          <button
            type="button"
            onClick={() => void check()}
            disabled={state.kind === 'checking'}
            className="text-[11px] flex items-center gap-1 transition-colors disabled:opacity-50"
            style={{ color: 'var(--dim)' }}
          >
            {state.kind === 'checking' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Check connection
          </button>
        )}
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--dim)' }}>
        {state.kind === 'connected' &&
          'The HireWin browser on this PC is signed in to Naukri, so applications go out from your own account.'}
        {state.kind === 'disconnected' &&
          'Sign in once in the HireWin browser window. Your login stays saved on this PC; HireWin never sees your password.'}
        {state.kind === 'unavailable' && state.reason}
        {state.kind === 'error' && state.reason}
        {state.kind === 'checking' && 'Looking for a Naukri sign-in in the HireWin browser profile.'}
      </p>

      {(state.kind === 'connected' || state.kind === 'disconnected') && state.evidence && (
        <p className="text-[11px] font-data tabular-nums" style={{ color: 'var(--faint)' }}>
          {state.evidence}
        </p>
      )}

      {(state.kind === 'disconnected' || state.kind === 'error') && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void connect()}
            disabled={opening}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-colors disabled:opacity-60"
            style={{ background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.35)', color: 'var(--accent-soft)' }}
          >
            {opening ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
            Connect Naukri
          </button>
          <a
            href="https://www.naukri.com/nlogin/login"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] flex items-center gap-1"
            style={{ color: 'var(--faint)' }}
            title="This opens Naukri in your normal browser, which does not connect the HireWin browser."
          >
            <ExternalLink className="w-3 h-3" />
            naukri.com
          </a>
        </div>
      )}

      {note && (
        <p className="text-[11px] flex items-start gap-1.5" style={{ color: 'var(--dim)' }}>
          <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'var(--faint)' }} />
          {note}
        </p>
      )}
    </div>
  );
}
