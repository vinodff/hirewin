'use client';

import { useState } from 'react';
import { X, Copy, Check, Download, Loader2 } from 'lucide-react';

export type ViewableResume = {
  id: string;
  role?: string | null;
  company?: string | null;
  created_at?: string;
  ats_score?: number;
  job_fit_score?: number;
  original_resume?: string | null;
  optimized_resume?: string | null;
};

function fmtDate(ds?: string) {
  if (!ds) return '';
  return new Date(ds).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Before / after resume viewer with copy + DOCX/PDF download.
 * Shared between the Job Tracker (history) and My Resumes pages.
 */
export default function ResumeViewerModal({ v, onClose }: { v: ViewableResume; onClose: () => void }) {
  const [tab, setTab]       = useState<'optimized' | 'original'>('optimized');
  const [copied, setCopied] = useState(false);
  const [dlBusy, setDlBusy] = useState<'docx' | 'pdf' | null>(null);
  const [dlError, setDlError] = useState('');

  const hasOriginal = !!v.original_resume?.trim();
  const text = tab === 'original' ? (v.original_resume ?? '') : (v.optimized_resume ?? '');

  async function copy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function download(format: 'docx' | 'pdf') {
    if (!v.optimized_resume) return;
    setDlBusy(format);
    setDlError('');
    try {
      const res = await fetch(`/api/download/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: v.optimized_resume, versionId: v.id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setDlError(d.error === 'locked'
          ? 'Download locked — upgrade your plan or share the result to unlock.'
          : (d.error ?? 'Download failed.'));
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${v.role ?? 'resume'}-${v.company ?? 'hirewin'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDlBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-3xl flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: '#0d1220', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="min-w-0 pr-4">
            <h2 className="font-bold text-white truncate">
              {v.role}{v.company ? ` · ${v.company}` : ''}
            </h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {v.created_at && <span className="text-xs text-slate-500">{fmtDate(v.created_at)}</span>}
              {typeof v.ats_score === 'number' && <span className="text-xs text-purple-400 font-semibold">ATS {v.ats_score}</span>}
              {typeof v.job_fit_score === 'number' && <span className="text-xs text-blue-400 font-semibold">Fit {v.job_fit_score}</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="shrink-0 p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button type="button" onClick={() => setTab('optimized')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={tab === 'optimized'
              ? { background: 'rgba(52,211,153,0.18)', color: '#34d399', border: '1px solid rgba(52,211,153,0.35)' }
              : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }}>
            ✦ After (Optimized)
          </button>
          {hasOriginal && (
            <button type="button" onClick={() => setTab('original')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={tab === 'original'
                ? { background: 'rgba(148,163,184,0.18)', color: '#cbd5e1', border: '1px solid rgba(148,163,184,0.35)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }}>
              Before (Original)
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {text ? (
            <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">{text}</pre>
          ) : (
            <p className="text-sm text-slate-600 italic">Resume text not available for this entry.</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 shrink-0 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {dlError && <p className="text-xs text-red-400 text-center">{dlError}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={copy}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-slate-200 transition-all hover:text-white hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy text'}
            </button>
            <button type="button" onClick={() => download('docx')} disabled={!!dlBusy || !v.optimized_resume}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
              {dlBusy === 'docx' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              DOCX
            </button>
            <button type="button" onClick={() => download('pdf')} disabled={!!dlBusy || !v.optimized_resume}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              {dlBusy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
