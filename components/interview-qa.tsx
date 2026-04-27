'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Mic, Lightbulb, MessageSquare } from 'lucide-react';

type Question = {
  category: 'Behavioral' | 'Technical' | 'Role-Specific' | 'Culture & Motivation';
  question: string;
  tip: string;
  sampleAnswer: string;
};

type Props = {
  resumeText: string;
  role: string;
  company: string;
  jdText?: string;
};

const categoryConfig: Record<string, { color: string; bg: string; border: string }> = {
  Behavioral: { color: '#a78bfa', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' },
  Technical: { color: '#60a5fa', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
  'Role-Specific': { color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  'Culture & Motivation': { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
};

export default function InterviewQA({ resumeText, role, company, jdText }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [generated, setGenerated] = useState(false);

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, role, company, jdText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setQuestions(data.questions ?? []);
      setGenerated(true);
      setExpanded(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate questions.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-purple-400" />
          <h3 className="font-semibold text-white">Interview Prep</h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(124,58,237,0.12)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)' }}
          >
            AI-powered
          </span>
        </div>
        {!generated && !loading && (
          <button
            onClick={generate}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            Generate Questions
          </button>
        )}
        {generated && !loading && (
          <button
            onClick={generate}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Regenerate
          </button>
        )}
      </div>

      {!generated && !loading && (
        <div
          className="rounded-xl p-5 flex flex-col items-center text-center gap-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.12)' }}
          >
            <MessageSquare className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300 mb-1">Ready to prep for your {role} interview?</p>
            <p className="text-xs text-slate-500">
              Get 8 tailored questions — behavioral, technical, role-specific & culture — with sample answers based on your resume.
            </p>
          </div>
          <button
            onClick={generate}
            className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            Generate Interview Questions
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-8 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          <span className="text-sm">Generating questions for {role} at {company}…</span>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 mt-2">{error}</p>
      )}

      {generated && questions.length > 0 && (
        <div className="space-y-2">
          {questions.map((q, i) => {
            const cfg = categoryConfig[q.category] ?? categoryConfig.Behavioral;
            const isOpen = expanded === i;
            return (
              <div
                key={i}
                className="rounded-xl overflow-hidden transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className="w-full flex items-start gap-3 p-4 text-left"
                >
                  <span
                    className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5"
                    style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                  >
                    {q.category}
                  </span>
                  <span className="flex-1 text-sm text-slate-200 font-medium leading-snug pr-2">
                    {q.question}
                  </span>
                  <span className="shrink-0 mt-0.5 text-slate-600">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 animate-in">
                    <div
                      className="flex items-start gap-2 rounded-lg p-3"
                      style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-300/80">{q.tip}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Sample Answer</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{q.sampleAnswer}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
