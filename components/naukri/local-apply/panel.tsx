'use client';

/**
 * Background auto-apply, run from this PC.
 *
 * Setup → the run. The run keeps going if this panel is closed (it lives in
 * the local Node process, not in the page), so the last run id is remembered
 * and reopening the panel shows its progress.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Play, X, Zap } from 'lucide-react';
import type { ScannedJob } from '@/app/job-scan/page';
import type { CandidateProfile } from '@/lib/naukri/types';
import type { RunRecord } from '@/lib/apply/run-store';
import { NaukriConnectionCard, useNaukriConnection } from './connection';
import {
  ProfileForm,
  draftFromProfile,
  draftProblems,
  draftToPayload,
  saveDraft,
  withSavedDraft,
  type ProfileDraft,
} from './profile-form';
import { RunView } from './run-view';

const LAST_RUN_KEY = 'hirewin:apply-last-run';
const MAX_JOBS = 25;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jobs: ScannedJob[];
  candidateProfile: CandidateProfile | null;
  resumeText: string;
}

/** Naukri job id from the listing URL, else a stable positional id. */
function jobIdFor(job: ScannedJob, index: number): string {
  if (job.id) return job.id;
  const digits = job.jobUrl.match(/-(\d{9,})(?:[?#/]|$)/);
  return digits ? digits[1] : `job-${index + 1}`;
}

function isNaukriUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'naukri.com' || u.hostname.endsWith('.naukri.com'));
  } catch {
    return false;
  }
}

export default function LocalApplyPanel({ isOpen, onClose, jobs, candidateProfile, resumeText }: Props) {
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(candidateProfile, resumeText));
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submit, setSubmit] = useState(true);
  const [concurrency, setConcurrency] = useState(3);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<{ message: string; details: string[] } | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [run, setRun] = useState<RunRecord | null>(null);
  const connection = useNaukriConnection(false);

  const eligible = useMemo(() => jobs.map((j) => isNaukriUrl(j.jobUrl)), [jobs]);

  // Refill from the latest resume analysis, keeping the user's saved edits.
  useEffect(() => {
    if (!isOpen) return;
    setDraft(withSavedDraft(draftFromProfile(candidateProfile, resumeText)));
    setSelected(new Set(jobs.map((_, i) => i).filter((i) => eligible[i]).slice(0, MAX_JOBS)));
    try {
      const last = localStorage.getItem(LAST_RUN_KEY);
      if (last) setRunId((current) => current ?? last);
    } catch {
      // Storage blocked: no resume of the previous run, nothing else lost.
    }
  }, [isOpen, candidateProfile, resumeText, jobs, eligible]);

  // Poll the run until it finishes.
  useEffect(() => {
    if (!isOpen || !runId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await fetch(`/api/apply/runs/${runId}`, { cache: 'no-store' });
        if (res.status === 404) {
          setRunId(null);
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as RunRecord;
          if (stopped) return;
          setRun(data);
          if (data.finishedAt) return;
        }
      } catch {
        // Transient: the dev server may be recompiling. Try again.
      }
      if (!stopped) timer = setTimeout(tick, 1500);
    };
    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, runId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const updateDraft = (next: ProfileDraft) => {
    setDraft(next);
    saveDraft(next);
  };

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else if (next.size < MAX_JOBS) next.add(i);
      return next;
    });

  const problems = draftProblems(draft);
  const connected = connection.state.kind === 'connected';
  const canStart = problems.length === 0 && selected.size > 0 && connected && !starting;

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const targets = [...selected].sort((a, b) => a - b).map((i) => ({
        jobId: jobIdFor(jobs[i], i),
        title: jobs[i].title,
        company: jobs[i].company,
        jobUrl: jobs[i].jobUrl,
        location: jobs[i].location,
      }));
      const res = await fetch('/api/apply/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets, profile: draftToPayload(draft, resumeText), submit, concurrency }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ message: data.error ?? `Could not start (HTTP ${res.status}).`, details: data.details ?? [] });
        return;
      }
      setRun(null);
      setRunId(data.runId);
      try {
        localStorage.setItem(LAST_RUN_KEY, data.runId);
      } catch {
        // Not remembered across reloads; the run itself is unaffected.
      }
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : 'Network error', details: [] });
    } finally {
      setStarting(false);
    }
  }

  const running = run !== null && run.finishedAt === null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="local-apply-title"
        className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-xl border shadow-2xl"
        style={{ background: 'var(--ground)', borderColor: 'var(--edge-strong)' }}
      >
        <header className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--edge)' }}>
          <div>
            <h2 id="local-apply-title" className="font-display text-base font-semibold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              Background auto-apply
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--dim)' }}>
              Runs in the HireWin browser on this PC, several jobs at once. Only confirmed submissions count as applied.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-lg" style={{ color: 'var(--dim)' }}>
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {runId && run ? (
            <RunView run={run} />
          ) : runId ? (
            <p className="text-xs flex items-center gap-2" style={{ color: 'var(--dim)' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading run…
            </p>
          ) : (
            <>
              <section className="space-y-2">
                <h3 className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>1 · Naukri account</h3>
                <ConnectionSection connection={connection} />
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>2 · Your details</h3>
                <p className="text-[11px]" style={{ color: 'var(--faint)' }}>
                  Questions these don&apos;t cover are answered from your resume by AI; every answer is listed per job afterwards.
                  Demographic and legal declarations are never answered for you.
                </p>
                <ProfileForm draft={draft} onChange={updateDraft} />
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold flex items-center justify-between" style={{ color: 'var(--fg)' }}>
                  <span>3 · Jobs</span>
                  <span className="font-data tabular-nums text-[11px]" style={{ color: 'var(--dim)' }}>
                    {selected.size} selected
                  </span>
                </h3>
                <ul className="space-y-1 max-h-60 overflow-y-auto">
                  {jobs.map((job, i) => (
                    <li key={`${job.jobUrl}-${i}`}>
                      <label
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg ${eligible[i] ? 'cursor-pointer' : 'opacity-50'}`}
                        style={{ background: 'var(--surface-2)' }}
                      >
                        <input type="checkbox" checked={selected.has(i)} disabled={!eligible[i]} onChange={() => toggle(i)} />
                        <span className="flex-1 min-w-0 text-xs truncate" style={{ color: 'var(--fg)' }}>
                          {job.title} <span style={{ color: 'var(--dim)' }}>· {job.company}</span>
                        </span>
                        {eligible[i] ? (
                          <span className="font-data tabular-nums text-[11px]" style={{ color: 'var(--dim)' }}>
                            {job.fitScore}%
                          </span>
                        ) : (
                          <span className="text-[11px]" style={{ color: 'var(--faint)' }}>not a Naukri link</span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--dim)' }}>
                  <input type="radio" name="la-mode" checked={submit} onChange={() => setSubmit(true)} />
                  Submit applications
                </label>
                <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--dim)' }}>
                  <input type="radio" name="la-mode" checked={!submit} onChange={() => setSubmit(false)} />
                  Preview only (fill, don&apos;t submit)
                </label>
                <label className="flex items-center gap-2 text-xs ml-auto" style={{ color: 'var(--dim)' }}>
                  At once
                  <select
                    value={concurrency}
                    onChange={(e) => setConcurrency(Number(e.target.value))}
                    className="px-2 py-1 rounded-lg border text-xs font-data"
                    style={{ background: 'var(--ground)', borderColor: 'var(--edge)', color: 'var(--fg)' }}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              {(problems.length > 0 || error) && (
                <div className="text-[11px] space-y-1" style={{ color: 'var(--warn)' }}>
                  {problems.length > 0 && <p>Still needed: {problems.join(', ')}.</p>}
                  {error && <p>{error.message}</p>}
                  {error?.details.map((d) => (
                    <p key={d}>· {d}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <footer className="px-5 py-3 flex items-center justify-between border-t" style={{ borderColor: 'var(--edge)' }}>
          {runId ? (
            <>
              <span className="text-[11px]" style={{ color: 'var(--faint)' }}>
                {running ? 'You can close this; the run continues on this PC.' : 'Run finished.'}
              </span>
              <button
                type="button"
                disabled={running}
                onClick={() => {
                  setRunId(null);
                  setRun(null);
                  void connection.check();
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50"
                style={{ borderColor: 'var(--edge-strong)', color: 'var(--fg)' }}
              >
                New run
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} className="text-xs" style={{ color: 'var(--dim)' }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void start()}
                disabled={!canStart}
                title={!connected ? 'Connect Naukri first' : undefined}
                className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--accent)', color: '#04110b' }}
              >
                {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {submit ? `Apply to ${selected.size} job${selected.size === 1 ? '' : 's'}` : `Preview ${selected.size}`}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

/** Wraps the shared card so the panel's own hook instance gates the Start button. */
function ConnectionSection({ connection }: { connection: ReturnType<typeof useNaukriConnection> }) {
  useEffect(() => {
    void connection.check();
    // Checked once when the setup view mounts; the card's button re-checks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <NaukriConnectionCard autoCheck={false} controller={connection} />;
}
