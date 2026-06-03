'use client';

import { useState } from 'react';
import { Copy, Check, Loader2, User, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';

type DescVersion = {
  label: string;
  duration: string;
  text: string;
};

type DescData = {
  versions: {
    brief: DescVersion;
    full: DescVersion;
    casual: DescVersion;
  };
  keyStrengths: string[];
  careerNarrative: string;
};

type Tab = 'brief' | 'full' | 'casual';

type Props = {
  resumeText: string;
  role: string;
  company: string;
  jdText?: string;
};

const TAB_CONFIG: { key: Tab; icon: string; accent: string; bg: string; border: string }[] = [
  { key: 'brief',  icon: '⚡', accent: '#a78bfa', bg: 'rgba(124,58,237,0.08)',  border: 'rgba(124,58,237,0.25)' },
  { key: 'full',   icon: '🎯', accent: '#60a5fa', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)' },
  { key: 'casual', icon: '😊', accent: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)' },
];

const CARD = { background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' };
const INPUT_GHOST = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' };

export default function SelfDescription({ resumeText, role, company, jdText }: Props) {
  const [data, setData]       = useState<DescData | null>(null);
  const [tab, setTab]         = useState<Tab>('brief');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [copied, setCopied]   = useState(false);

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/self-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, role, company, jdText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      setData(json);
      setTab('brief');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!data) return;
    navigator.clipboard.writeText(data.versions[tab].text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeVersion = data?.versions[tab];
  const activeCfg = TAB_CONFIG.find((t) => t.key === tab)!;

  return (
    <div className="rounded-2xl p-6" style={CARD}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-purple-400" />
          <h3 className="font-semibold text-white">Self-Introduction Generator</h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(124,58,237,0.12)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)' }}
          >
            AI-powered
          </span>
        </div>
        {data && !loading && (
          <button
            onClick={generate}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>
        )}
      </div>

      {/* Pre-generate CTA */}
      {!data && !loading && (
        <div
          className="rounded-xl p-6 flex flex-col items-center text-center gap-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.07)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.12)' }}
          >
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-200 mb-1">
              "Tell me about yourself" — answered perfectly
            </p>
            <p className="text-xs text-slate-500 max-w-xs">
              Get 3 tailored versions of your self-introduction — a 30-second pitch, a full 2-minute answer, and a casual version — written in your voice.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { icon: '⚡', label: '30-sec pitch' },
              { icon: '🎯', label: '2-min answer' },
              { icon: '😊', label: 'Casual tone' },
            ].map(({ icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full text-slate-400"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span>{icon}</span>{label}
              </span>
            ))}
          </div>

          <button
            onClick={generate}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            <Sparkles className="w-4 h-4" />
            Generate My Self-Introduction
          </button>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <div className="relative">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.12)' }}
            >
              <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
            </div>
          </div>
          <p className="text-sm text-slate-400">
            Crafting your introduction for <span className="text-white font-medium">{role}</span> at <span className="text-white font-medium">{company}</span>…
          </p>
          <p className="text-xs text-slate-600">Personalising to your resume and the role</p>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-4">

          {/* Career narrative strip */}
          <div
            className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)' }}
          >
            <ChevronRight className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-300 leading-relaxed italic">
              &ldquo;{data.careerNarrative}&rdquo;
            </p>
          </div>

          {/* Key strengths */}
          <div className="flex flex-wrap gap-2">
            {data.keyStrengths.map((s) => (
              <span
                key={s}
                className="text-xs px-3 py-1.5 rounded-full font-medium text-slate-300"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                ✦ {s}
              </span>
            ))}
          </div>

          {/* Version tabs */}
          <div className="flex gap-2 flex-wrap">
            {TAB_CONFIG.map(({ key, icon, accent, bg, border }) => {
              const v = data.versions[key];
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => { setTab(key); setCopied(false); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={active
                    ? { background: bg, border: `1px solid ${border}`, color: accent }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#94a3b8' }}
                >
                  <span>{icon}</span>
                  <span>{v.label}</span>
                  <span
                    className="text-[10px] font-normal opacity-70"
                  >
                    {v.duration}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Text display */}
          {activeVersion && (
            <div
              className="rounded-xl p-5 relative"
              style={INPUT_GHOST}
            >
              {/* Usage hint */}
              <div
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider mb-3 px-2 py-1 rounded-md"
                style={{ background: activeCfg.bg, color: activeCfg.accent, border: `1px solid ${activeCfg.border}` }}
              >
                <span>{activeCfg.icon}</span>
                {activeVersion.label} · {activeVersion.duration}
              </div>

              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {activeVersion.text}
              </p>

              {/* Actions */}
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <button
                  onClick={copy}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                >
                  {copied
                    ? <><Check className="w-4 h-4" /> Copied!</>
                    : <><Copy className="w-4 h-4" /> Copy Text</>}
                </button>

                <span className="text-xs text-slate-600">
                  {tab === 'brief'  && 'Great for opening any interview'}
                  {tab === 'full'   && 'Best answer for "Tell me about yourself"'}
                  {tab === 'casual' && 'Perfect for startup & informal rounds'}
                </span>
              </div>
            </div>
          )}

          {/* Practice tip */}
          <div
            className="rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-yellow-300/70"
            style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)' }}
          >
            <span className="text-base shrink-0">💡</span>
            <p>
              <span className="font-semibold text-yellow-300/90">Practice tip:</span> Read this aloud 3 times before your interview. Personalise any line that doesn&apos;t feel natural — it should sound like <em>you</em>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
