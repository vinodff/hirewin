'use client';

import { useReducer, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Upload, Link as LinkIcon, FileText, Loader2, Copy, Check,
  AlertCircle, Target, BarChart2,
} from 'lucide-react';
import { trackEvent, getSessionHash } from '@/lib/analytics';
import type { AnalysisResult, SSEEvent } from '@/types';
import AppNav from '@/components/app-nav';

const AtsGauge = dynamic(() => import('@/components/ats-gauge'), { ssr: false });
const KeywordChips = dynamic(() => import('@/components/keyword-chips'), { ssr: false });
const SkillGapList = dynamic(() => import('@/components/skill-gap-list'), { ssr: false });
const BeforeAfter = dynamic(() => import('@/components/before-after'), { ssr: false });
const DownloadButtons = dynamic(() => import('@/components/download-buttons'), { ssr: false });

type Step = 'input' | 'analyzing' | 'results';

type State = {
  step: Step;
  resumeText: string;
  jdText: string;
  jdUrl: string;
  jdMode: 'paste' | 'url';
  fileName: string;
  fileData: string | null;
  instructions: string;
  resumeLength: 'auto' | '1page' | '2page' | 'academic';
  error: string;
  partial: Partial<AnalysisResult>;
  result: AnalysisResult | null;
  versionId: string | null;
  originalResume: string;
  editedResume: string;
};

type Action =
  | { type: 'SET_RESUME_TEXT'; text: string }
  | { type: 'SET_FILE'; name: string; data: string }
  | { type: 'SET_JD_TEXT'; text: string }
  | { type: 'SET_JD_URL'; url: string }
  | { type: 'SET_JD_MODE'; mode: 'paste' | 'url' }
  | { type: 'SET_INSTRUCTIONS'; text: string }
  | { type: 'SET_LENGTH'; length: State['resumeLength'] }
  | { type: 'START_ANALYSIS' }
  | { type: 'FIELD_UPDATE'; field: string; value: unknown }
  | { type: 'COMPLETE'; versionId: string; result: AnalysisResult; originalResume: string }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' }
  | { type: 'EDIT_RESUME'; text: string };

const initial: State = {
  step: 'input',
  resumeText: '',
  jdText: '',
  jdUrl: '',
  jdMode: 'paste',
  fileName: '',
  fileData: null,
  instructions: '',
  resumeLength: 'auto',
  error: '',
  partial: {},
  result: null,
  versionId: null,
  originalResume: '',
  editedResume: '',
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_RESUME_TEXT': return { ...state, resumeText: action.text, fileData: null, fileName: '' };
    case 'SET_FILE': return { ...state, fileData: action.data, fileName: action.name, resumeText: '' };
    case 'SET_JD_TEXT': return { ...state, jdText: action.text };
    case 'SET_JD_URL': return { ...state, jdUrl: action.url };
    case 'SET_JD_MODE': return { ...state, jdMode: action.mode };
    case 'SET_INSTRUCTIONS': return { ...state, instructions: action.text };
    case 'SET_LENGTH': return { ...state, resumeLength: action.length };
    case 'START_ANALYSIS': return { ...state, step: 'analyzing', error: '', partial: {}, result: null };
    case 'FIELD_UPDATE': return { ...state, partial: { ...state.partial, [action.field]: action.value } };
    case 'COMPLETE': return {
      ...state,
      step: 'results',
      result: action.result,
      versionId: action.versionId,
      originalResume: action.originalResume,
      editedResume: action.result.optimizedResume,
    };
    case 'ERROR': return { ...state, step: 'input', error: action.message };
    case 'EDIT_RESUME': return { ...state, editedResume: action.text };
    case 'RESET': return { ...initial };
    default: return state;
  }
}

const FIELD_LABELS: Record<string, string> = {
  atsScore: 'ATS Score',
  jobFitScore: 'Job Fit Score',
  careerLevel: 'Career Level',
  keywordsMatched: 'Matched Keywords',
  keywordsMissing: 'Missing Keywords',
  skillGaps: 'Skill Gaps',
  company: 'Company',
  role: 'Role',
  optimizedResume: 'Optimized Resume',
  outreachEmail: 'Cold Email',
  outreachLinkedIn: 'LinkedIn Note',
};

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#e2e8f0',
};

const cardStyle = { background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' };

const LENGTH_OPTIONS: { key: State['resumeLength']; label: string; sub: string }[] = [
  { key: 'auto', label: 'Auto-detect', sub: 'Let AI decide' },
  { key: '1page', label: '1 Page', sub: 'Preferred · 1 pg min' },
  { key: '2page', label: '2 Pages', sub: '1-2 pgs max' },
  { key: 'academic', label: 'Academic CV', sub: 'PhD / research / academia' },
];

const INSTRUCTION_HINTS = [
  "I led a team of 6 but forgot to add it",
  "Focus on Python and ML",
  "Switching from finance to tech",
  "Remove the 2022 gap",
];

export default function AnalyzePage() {
  const [state, dispatch] = useReducer(reducer, initial);
  const abortRef = useRef<AbortController | null>(null);
  const sessionHash = typeof window !== 'undefined' ? getSessionHash() : '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResumeUpdate = useCallback((text: string) => {
    dispatch({ type: 'EDIT_RESUME', text });
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      dispatch({ type: 'SET_FILE', name: file.name, data: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      dispatch({ type: 'SET_FILE', name: file.name, data: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  async function handleFetchJd() {
    if (!state.jdUrl.trim()) return;
    try {
      const { fetchJobDescription } = await import('@/lib/jina');
      const text = await fetchJobDescription(state.jdUrl);
      dispatch({ type: 'SET_JD_TEXT', text });
      dispatch({ type: 'SET_JD_MODE', mode: 'paste' });
    } catch {
      // silently fallback — user can paste manually
    }
  }

  async function handleAnalyze() {
    const hasResume = state.fileData || state.resumeText.trim();
    const hasJd = state.jdMode === 'paste' ? state.jdText.trim() : state.jdUrl.trim();
    if (!hasResume || !hasJd) {
      dispatch({ type: 'ERROR', message: 'Please provide both your resume and the job description.' });
      return;
    }

    dispatch({ type: 'START_ANALYSIS' });
    trackEvent('analysis_started', {}, sessionHash);

    abortRef.current = new AbortController();

    try {
      const formData = new FormData();

      if (state.fileData) {
        const res = await fetch(state.fileData);
        const blob = await res.blob();
        formData.append('resumeFile', blob, state.fileName);
      } else {
        formData.append('resumeText', state.resumeText);
      }

      if (state.jdMode === 'paste') {
        formData.append('jdText', state.jdText);
      } else {
        formData.append('jdUrl', state.jdUrl);
      }

      if (state.instructions.trim()) {
        formData.append('instructions', state.instructions);
      }
      formData.append('resumeLength', state.resumeLength);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Server error — please try again.');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));
            if (event.type === 'field') {
              dispatch({ type: 'FIELD_UPDATE', field: event.field as string, value: event.value });
            } else if (event.type === 'complete') {
              dispatch({ type: 'COMPLETE', versionId: event.versionId, result: event.result, originalResume: event.originalResume });
              trackEvent('analysis_complete', { company: event.result.company }, sessionHash);
            } else if (event.type === 'error') {
              dispatch({ type: 'ERROR', message: event.message });
            }
          } catch {
            // malformed SSE line
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      dispatch({ type: 'ERROR', message: e instanceof Error ? e.message : 'Analysis failed — try again.' });
    }
  }

  const { step, partial, result, versionId } = state;

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">

        {/* INPUT STEP */}
        {step === 'input' && (
          <div className="animate-in">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-10">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-3 leading-tight">
                Improve Your Resume{' '}
                <span className="gradient-text">for Any Job</span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto px-2">
                Paste your resume and the job you want. We improve it to match — automatically.{' '}
                <span className="text-white font-medium">Get 2 free resumes per month.</span>
              </p>
            </div>

            {/* Two-column input */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Resume panel */}
              <div className="rounded-2xl p-5" style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <h2 className="font-semibold text-white text-sm">Your Resume</h2>
                  <span className="text-xs text-slate-500">Paste text or upload a PDF</span>
                </div>

                <textarea
                  value={state.resumeText}
                  onChange={(e) => dispatch({ type: 'SET_RESUME_TEXT', text: e.target.value })}
                  placeholder="Paste your resume text here… Include your work experience, education, skills, and any other relevant sections."
                  className="w-full h-36 sm:h-44 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                  style={inputStyle}
                />

                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 rounded-xl p-4 text-center cursor-pointer transition-all hover:border-purple-500/40"
                  style={{ border: '2px dashed rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {state.fileName ? (
                    <div className="flex items-center justify-center gap-2 text-purple-400">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-medium">{state.fileName}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="w-5 h-5 text-slate-600" />
                      <p className="text-xs text-slate-500">
                        Drag & drop PDF or{' '}
                        <span className="text-purple-400 font-medium">click to upload</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Description panel */}
              <div className="rounded-2xl p-5" style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-slate-400" />
                  <h2 className="font-semibold text-white text-sm">Job Description</h2>
                  <span className="text-xs text-slate-500">Paste or fetch from a URL</span>
                </div>

                <textarea
                  value={state.jdText}
                  onChange={(e) => dispatch({ type: 'SET_JD_TEXT', text: e.target.value })}
                  placeholder="Paste the full job description here… Include requirements, responsibilities, qualifications, and any preferred skills."
                  className="w-full h-36 sm:h-44 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                  style={inputStyle}
                />

                {/* URL fetch */}
                <div className="mt-3 flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                    <input
                      type="url"
                      value={state.jdUrl}
                      onChange={(e) => dispatch({ type: 'SET_JD_URL', url: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleFetchJd()}
                      placeholder="Or fetch from a job posting URL…"
                      className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                      style={inputStyle}
                    />
                  </div>
                  <button
                    onClick={handleFetchJd}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                  >
                    Fetch
                  </button>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="rounded-2xl p-5 mb-4" style={cardStyle}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-medium text-white">Anything specific to add or change?</h3>
                <span className="text-xs text-slate-600 italic">optional</span>
              </div>
              <textarea
                value={state.instructions}
                onChange={(e) => dispatch({ type: 'SET_INSTRUCTIONS', text: e.target.value })}
                placeholder='e.g. "I led a team of 6 but forgot to add it"'
                className="w-full h-16 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                style={inputStyle}
              />
              <div className="overflow-x-auto scrollbar-none -mx-1 px-1 mt-2">
                <div className="flex gap-2 min-w-max">
                  {INSTRUCTION_HINTS.map((hint) => (
                    <button
                      key={hint}
                      onClick={() => dispatch({ type: 'SET_INSTRUCTIONS', text: hint })}
                      className="text-xs px-3 py-1.5 rounded-full text-slate-400 hover:text-white transition-colors whitespace-nowrap active:scale-95"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Resume length */}
            <div className="mb-6">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                RESUME LENGTH
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {LENGTH_OPTIONS.map(({ key, label, sub }) => (
                  <button
                    key={key}
                    onClick={() => dispatch({ type: 'SET_LENGTH', length: key })}
                    className="rounded-xl p-3 text-left transition-all"
                    style={
                      state.resumeLength === key
                        ? { background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.5)', color: '#fff' }
                        : { ...cardStyle, color: '#94a3b8' }
                    }
                  >
                    <div className="text-sm font-semibold">{label}</div>
                    <div className="text-xs mt-0.5 opacity-70">{sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {state.error && (
              <div className="flex items-center gap-2 rounded-xl p-4 text-sm text-red-300 mb-4"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                {state.error}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleAnalyze}
              className="w-full py-4 sm:py-4 rounded-xl text-white font-bold text-base sm:text-lg transition-all hover:opacity-90 active:scale-[0.99] glow-purple"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', minHeight: '54px' }}
            >
              Improve My Resume →
            </button>

            {/* Feature badges */}
            <div className="mt-5 overflow-x-auto pb-1 -mx-1 px-1">
              <div className="flex items-center gap-3 text-xs text-slate-500 min-w-max mx-auto w-fit">
                {[
                  { icon: <Target className="w-3.5 h-3.5 text-purple-400 shrink-0" />, label: 'ATS Keyword Analysis' },
                  { icon: <span className="text-purple-400 shrink-0">✦</span>, label: 'Smart Bullet Rewrites' },
                  { icon: <BarChart2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />, label: 'Smart Page Length' },
                  { icon: <span className="text-purple-400 shrink-0">⇄</span>, label: 'Before/After Scoring' },
                  { icon: <span className="text-emerald-400 shrink-0">~</span>, label: '~20 Second Results' },
                ].map(({ icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5 whitespace-nowrap">
                    {icon}
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ANALYZING STEP */}
        {step === 'analyzing' && (
          <div className="max-w-lg mx-auto animate-in">
            <div className="rounded-2xl p-8 text-center mb-6" style={cardStyle}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(124,58,237,0.15)' }}>
                <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
              </div>
              <h2 className="font-semibold text-white text-lg mb-1">Improving your resume…</h2>
              <p className="text-sm text-slate-500">Results stream in as they&apos;re ready (~20 seconds)</p>
            </div>

            <div className="space-y-2">
              {Object.entries(FIELD_LABELS).map(([field, label]) => {
                const value = partial[field as keyof AnalysisResult];
                const done = value !== undefined;
                return (
                  <div
                    key={field}
                    className={`rounded-xl p-3.5 flex items-center gap-3 transition-all ${done ? 'animate-in' : 'opacity-30'}`}
                    style={done
                      ? { background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }
                      : { background: '#0f1629', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={done
                        ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }
                        : { background: 'rgba(255,255,255,0.08)' }}>
                      {done && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm font-medium text-slate-300">{label}</span>
                    {done && field === 'atsScore' && (
                      <span className="ml-auto text-purple-400 font-bold">{value as number}%</span>
                    )}
                    {done && field === 'jobFitScore' && (
                      <span className="ml-auto text-blue-400 font-bold">{value as number}/100</span>
                    )}
                    {done && field === 'careerLevel' && (
                      <span className="ml-auto text-slate-400 text-sm">{value as string}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => { abortRef.current?.abort(); dispatch({ type: 'RESET' }); }}
              className="mt-6 text-sm text-slate-600 hover:text-slate-400 block mx-auto transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* RESULTS STEP */}
        {step === 'results' && result && (
          <div className="space-y-6 animate-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-white leading-snug">
                  <span className="line-clamp-1">{result.role}</span>
                  <span className="text-slate-500 font-normal text-base sm:text-xl"> at </span>
                  <span className="line-clamp-1">{result.company}</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 capitalize">
                  {result.companyType} · {result.careerLevel} level
                </p>
              </div>
              <button
                onClick={() => dispatch({ type: 'RESET' })}
                className="text-sm font-semibold px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90 shrink-0 w-full sm:w-auto"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
              >
                + New Resume
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AtsGauge score={result.atsScore} label="ATS Match Score" sublabel="Original resume vs. job description" />
              <AtsGauge score={result.jobFitScore} label="Job Fit Score" sublabel="Skills & experience match" color="emerald" />
            </div>

            <KeywordChips matched={result.keywordsMatched} missing={result.keywordsMissing} />
            <SkillGapList gaps={result.skillGaps} />
            <BeforeAfter
              original={state.originalResume || state.resumeText}
              optimized={result.optimizedResume}
              atsScore={result.atsScore}
              onResumeUpdate={handleResumeUpdate}
            />
            <DownloadButtons
              optimizedResume={state.editedResume || result.optimizedResume}
              versionId={versionId ?? undefined}
              beforeScore={result.atsScore}
            />
            <OutreachSection email={result.outreachEmail} linkedin={result.outreachLinkedIn} />
          </div>
        )}
      </div>
    </div>
  );
}


function OutreachSection({ email, linkedin }: { email: string; linkedin: string }) {
  const [tab, setTab] = useState<'email' | 'linkedin'>('email');
  const [copied, setCopied] = useState(false);
  const text = tab === 'email' ? email : linkedin;

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl p-6" style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h3 className="font-semibold text-white mb-4">Cold Outreach</h3>
      <div className="flex gap-2 mb-4">
        {(['email', 'linkedin'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 text-sm rounded-lg font-medium transition-all"
            style={tab === t
              ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
          >
            {t === 'email' ? 'Email' : 'LinkedIn'}
          </button>
        ))}
      </div>
      <div className="rounded-xl p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {text}
      </div>
      <button
        onClick={copy}
        className="mt-3 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
