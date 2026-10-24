'use client';

import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';

type MatrixRow = {
  feature: string;
  desc: string;
  hirewin: { status: 'check' | 'warn' | 'cross'; text: string };
  chatgpt: { status: 'check' | 'warn' | 'cross'; text: string };
  legacy: { status: 'check' | 'warn' | 'cross'; text: string };
};

const MATRIX_ROWS: MatrixRow[] = [
  {
    feature: 'Evidence & Truth Verification',
    desc: 'Cross-checks every claim against your actual experience',
    hirewin: { status: 'check', text: '100% verified with Trust Score' },
    chatgpt: { status: 'cross', text: 'Hallucinates fake claims' },
    legacy: { status: 'cross', text: 'No verification mechanism' },
  },
  {
    feature: 'Interview Risk Detection',
    desc: 'Warns you about claims recruiters will aggressively probe',
    hirewin: { status: 'check', text: 'Flags risky bullet points' },
    chatgpt: { status: 'cross', text: 'Leaves you unprepared' },
    legacy: { status: 'cross', text: 'No interview intelligence' },
  },
  {
    feature: 'ATS Algorithm Matching',
    desc: 'Analyzes JD keywords & hard skills against ATS parsers',
    hirewin: { status: 'check', text: 'Surgical semantic match (94%+)' },
    chatgpt: { status: 'warn', text: 'Generic keyword stuffing' },
    legacy: { status: 'warn', text: 'Basic word count search' },
  },
  {
    feature: 'Recruiter Phrasing & Metrics',
    desc: 'Quantifies achievements using XYZ framework',
    hirewin: { status: 'check', text: 'Executive-level impact verbs' },
    chatgpt: { status: 'warn', text: 'Clichéd AI buzzwords' },
    legacy: { status: 'cross', text: 'Generic templates' },
  },
  {
    feature: 'ATS-Proof Export Formats',
    desc: 'Clean single/multi-page PDF & DOCX without parsing bugs',
    hirewin: { status: 'check', text: 'Standard ATS-cleared layouts' },
    chatgpt: { status: 'cross', text: 'Raw text only' },
    legacy: { status: 'warn', text: 'Complex tables that break ATS' },
  },
];

function StatusIcon({ status }: { status: 'check' | 'warn' | 'cross' }) {
  if (status === 'check') {
    return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
  }
  if (status === 'warn') {
    return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
  }
  return <XCircle className="w-4 h-4 text-red-400/80 shrink-0" />;
}

export default function TrustMatrix() {
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      {/* Section header */}
      <div className="text-center mb-12 sm:mb-16">
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-accent-300 mb-4"
          style={{
            background: 'rgba(var(--accent-rgb), 0.1)',
            border: '1px solid rgba(var(--accent-rgb), 0.25)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <ShieldCheck className="w-4 h-4 text-accent-400" />
          Why HireWin is Different
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.05] mb-4 font-display">
          Built for interviews, <br className="hidden sm:block" />
          <span className="text-emerald-400">not just keyword games.</span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          See how HireWin protects your reputation and guarantees interview readiness compared to generic AI tools and outdated builders.
        </p>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div
          className="rounded-2xl overflow-hidden min-w-[620px] sm:min-w-0 bg-[#0E151C] border border-white/[0.08] shadow-2xl"
        >
          {/* Table header */}
          <div
            className="grid grid-cols-12 gap-4 p-5 sm:p-6 border-b text-xs sm:text-sm font-bold items-center"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="col-span-4 text-slate-400 uppercase tracking-wider text-[11px]">
              Capability
            </div>
            <div className="col-span-3 text-left flex items-center justify-start gap-1.5">
              <span
                className="px-2.5 py-1 rounded-lg text-emerald-400 font-extrabold text-xs sm:text-sm flex items-center gap-1.5"
                style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                HireWin AI
              </span>
            </div>
            <div className="col-span-3 text-slate-400 text-left">
              ChatGPT / Generic AI
            </div>
            <div className="col-span-2 text-slate-400 text-left">
              Legacy Builders
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.04]">
            {MATRIX_ROWS.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-4 p-5 sm:p-6 items-center transition-colors hover:bg-white/[0.015]"
              >
                {/* Feature title & description */}
                <div className="col-span-4">
                  <p className="text-xs sm:text-sm font-bold text-white mb-0.5">{row.feature}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{row.desc}</p>
                </div>

                {/* HireWin column (Highlighted) */}
                <div className="col-span-3 flex items-start gap-2">
                  <StatusIcon status={row.hirewin.status} />
                  <span className="text-xs sm:text-sm font-semibold text-emerald-300 leading-tight">
                    {row.hirewin.text}
                  </span>
                </div>

                {/* ChatGPT column */}
                <div className="flex col-span-3 items-start gap-2">
                  <StatusIcon status={row.chatgpt.status} />
                  <span className="text-xs sm:text-sm text-slate-400 leading-tight">
                    {row.chatgpt.text}
                  </span>
                </div>

                {/* Legacy builders column */}
                <div className="col-span-2 flex items-start justify-start gap-2 text-left">
                  <StatusIcon status={row.legacy.status} />
                  <span className="text-xs sm:text-sm text-slate-400 leading-tight">
                    {row.legacy.text}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
