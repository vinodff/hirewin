'use client';

/**
 * A run as it happens: per-job status, the proof behind it, every answer that
 * was entered (and where it came from), screenshots, and the raw log.
 *
 * The log is shown, not summarised away. When an application fails, the user
 * (and whoever debugs it) should be reading what the browser actually saw.
 */
import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Image as ImageIcon, Loader2 } from 'lucide-react';
import type { RunJob, RunRecord } from '@/lib/apply/run-store';
import type { ApplyStatus } from '@/lib/apply/types';
import { SOURCE_LABEL, STATUS_META, STATUS_ORDER } from './status';

function Dot({ color }: { color: string }) {
  return <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} aria-hidden />;
}

function time(t: number): string {
  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function JobRow({ runId, job }: { runId: string; job: RunJob }) {
  const [open, setOpen] = useState(false);
  const result = job.result;
  const meta = result ? STATUS_META[result.status] : null;

  return (
    <li className="rounded-xl border" style={{ background: 'var(--surface-2)', borderColor: 'var(--edge)' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-3 flex items-start gap-3"
        aria-expanded={open}
      >
        <span className="mt-1">
          {job.phase === 'running' ? (
            <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--dim)' }} />
          ) : (
            <Dot color={meta?.color ?? 'var(--faint)'} />
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-semibold truncate" style={{ color: 'var(--fg)' }}>
            {job.title}
          </span>
          <span className="block text-[11px] truncate" style={{ color: 'var(--dim)' }}>
            {job.company}
          </span>
          {result && (
            <span className="block text-[11px] mt-1" style={{ color: 'var(--dim)' }}>
              {result.message}
            </span>
          )}
        </span>
        <span className="text-[11px] font-semibold shrink-0 flex items-center gap-1" style={{ color: meta?.color ?? 'var(--faint)' }}>
          {job.phase === 'queued' ? 'Waiting' : job.phase === 'running' ? 'Working…' : meta?.label}
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: 'var(--edge)' }}>
          {meta?.hint && (
            <p className="text-[11px] pt-2" style={{ color: meta.color }}>
              {meta.hint}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] flex items-center gap-1" style={{ color: 'var(--accent-soft)' }}>
              <ExternalLink className="w-3 h-3" /> Open job
            </a>
            {result?.externalUrl && (
              <a href={result.externalUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] flex items-center gap-1" style={{ color: 'var(--accent-soft)' }}>
                <ExternalLink className="w-3 h-3" /> Company site{result.atsName ? ` (${result.atsName})` : ''}
              </a>
            )}
            {result?.screenshots.map((file) => (
              <a
                key={file}
                href={`/api/apply/runs/${runId}/screenshots/${encodeURIComponent(file)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] flex items-center gap-1"
                style={{ color: 'var(--dim)' }}
              >
                <ImageIcon className="w-3 h-3" /> {file.replace(/\.png$/, '')}
              </a>
            ))}
          </div>

          {result && result.evidence.length > 0 && (
            <div>
              <h5 className="text-[11px] font-semibold mb-1" style={{ color: 'var(--faint)' }}>Evidence</h5>
              <ul className="space-y-0.5">
                {result.evidence.map((e, i) => (
                  <li key={i} className="text-[11px] font-data" style={{ color: 'var(--dim)' }}>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result && result.answers.length > 0 && (
            <div className="overflow-x-auto">
              <h5 className="text-[11px] font-semibold mb-1" style={{ color: 'var(--faint)' }}>Answers sent</h5>
              <table className="w-full text-[11px]">
                <tbody>
                  {result.answers.map((a) => (
                    <tr key={a.questionId} className="align-top border-t" style={{ borderColor: 'var(--edge)' }}>
                      <td className="py-1 pr-2" style={{ color: 'var(--dim)' }}>{a.label}</td>
                      <td className="py-1 pr-2" style={{ color: a.value === null ? 'var(--warn)' : 'var(--fg)' }}>
                        {a.value === null ? 'left blank' : Array.isArray(a.value) ? a.value.join(', ') : a.value}
                      </td>
                      <td className="py-1 whitespace-nowrap font-data tabular-nums" style={{ color: 'var(--faint)' }} title={a.reason}>
                        {SOURCE_LABEL[a.source]}
                        {a.source === 'ai' ? ` · ${a.confidence}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {job.logs.length > 0 && (
            <div>
              <h5 className="text-[11px] font-semibold mb-1" style={{ color: 'var(--faint)' }}>Log</h5>
              <pre
                className="text-[11px] font-data whitespace-pre-wrap max-h-56 overflow-y-auto rounded-lg p-2"
                style={{ background: 'var(--ground)', color: 'var(--dim)' }}
              >
                {job.logs
                  .map((l) => `${time(l.t)} ${l.level.toUpperCase().padEnd(5)} ${l.step}: ${l.msg}${l.data ? ` ${JSON.stringify(l.data)}` : ''}`)
                  .join('\n')}
              </pre>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export function RunView({ run }: { run: RunRecord }) {
  const done = run.jobs.filter((j) => j.phase === 'done').length;
  const counts = new Map<ApplyStatus, number>();
  for (const job of run.jobs) {
    if (job.result) counts.set(job.result.status, (counts.get(job.result.status) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs" style={{ color: 'var(--dim)' }}>
          {run.submit ? 'Submitting applications' : 'Preview — nothing is submitted'} ·{' '}
          <span className="font-data tabular-nums" style={{ color: 'var(--fg)' }}>
            {done}/{run.jobs.length}
          </span>{' '}
          done{run.finishedAt ? '' : ` · ${run.concurrency} at a time`}
        </p>
        <div className="flex flex-wrap gap-3">
          {STATUS_ORDER.filter((s) => counts.has(s)).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--dim)' }}>
              <Dot color={STATUS_META[s].color} />
              {STATUS_META[s].label}
              <span className="font-data tabular-nums" style={{ color: 'var(--fg)' }}>
                {counts.get(s)}
              </span>
            </span>
          ))}
        </div>
      </div>

      {run.fatal && (
        <div className="rounded-xl p-3 text-xs border" style={{ borderColor: 'rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.06)', color: 'var(--warn)' }}>
          {run.fatal}
        </div>
      )}

      <ul className="space-y-2">
        {run.jobs.map((job) => (
          <JobRow key={job.jobId} runId={run.runId} job={job} />
        ))}
      </ul>
    </div>
  );
}
