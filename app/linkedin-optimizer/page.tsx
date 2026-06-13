'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Linkedin, Sparkles, Copy, Check, Lock, ChevronDown, ChevronUp,
  Briefcase, FileText, Tag, Lightbulb, Loader2, ArrowRight,
} from 'lucide-react';
import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';

type ExperienceRewrite = { title: string; company: string; bullets: string[] };
type Result = {
  headlines: string[];
  about: string;
  experience: ExperienceRewrite[];
  skills: string[];
  tips: string[];
};

type ScrapedProfile = {
  name?: string;
  headline?: string;
  about?: string;
  experience?: { title?: string; company?: string; description?: string }[];
  skills?: string[];
  education?: string;
};

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:bg-white/10 shrink-0"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: copied ? '#34d399' : '#cbd5e1' }}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function SectionCard({
  icon: Icon, title, children, accent = '#a78bfa',
}: { icon: typeof FileText; title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-2xl p-5 sm:p-6" style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <h3 className="font-bold text-white text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function LinkedInOptimizerPage() {
  // Form state
  const [headline, setHeadline] = useState('');
  const [about, setAbout] = useState('');
  const [experienceRaw, setExperienceRaw] = useState('');
  const [skillsRaw, setSkillsRaw] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [name, setName] = useState('');
  const [education, setEducation] = useState('');
  const [showJD, setShowJD] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [locked, setLocked] = useState(false);
  const [fromExtension, setFromExtension] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  // Auto-loaded resume context (from the user's latest HireWin resume).
  const [resumeMeta, setResumeMeta] = useState<{ role?: string; company?: string } | null>(null);
  const [useResume, setUseResume] = useState(true);
  const [showResume, setShowResume] = useState(false);

  // Pull the user's most recent HireWin resume to use as optimization context.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/history');
        if (!res.ok) return;
        const { versions } = await res.json();
        const latest = Array.isArray(versions) ? versions[0] : null;
        if (!latest || cancelled) return;
        const text = (latest.optimized_resume || latest.original_resume || '').trim();
        if (text) {
          setResumeText(text);
          setResumeMeta({ role: latest.role, company: latest.company });
        }
      } catch { /* not signed in or no history — fine, optional context */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Listen for profile data injected by the HireWin Chrome extension.
  // The extension posts { type: 'HIREWIN_LINKEDIN_PROFILE', profile } after
  // scraping the user's LinkedIn page.
  useEffect(() => {
    function applyProfile(p: ScrapedProfile) {
      if (p.name) setName(p.name);
      if (p.headline) setHeadline(p.headline);
      if (p.about) setAbout(p.about);
      if (p.skills?.length) setSkillsRaw(p.skills.join(', '));
      if (p.education) setEducation(p.education);
      if (p.experience?.length) {
        setExperienceRaw(
          p.experience
            .map((e) => `${[e.title, e.company].filter(Boolean).join(' at ')}\n${e.description ?? ''}`.trim())
            .join('\n\n')
        );
      }
      setFromExtension(true);
    }

    function onMessage(ev: MessageEvent) {
      if (ev.source !== window) return;
      if (ev.data?.type === 'HIREWIN_LINKEDIN_PROFILE' && ev.data.profile) {
        applyProfile(ev.data.profile as ScrapedProfile);
      }
    }
    window.addEventListener('message', onMessage);

    // Also check sessionStorage in case the extension wrote it before listener mounted
    try {
      const stashed = sessionStorage.getItem('hirewin_linkedin_profile');
      if (stashed) {
        applyProfile(JSON.parse(stashed));
        sessionStorage.removeItem('hirewin_linkedin_profile');
      }
    } catch { /* ignore */ }

    // Tell the extension bridge we're ready to receive
    window.postMessage({ type: 'HIREWIN_OPTIMIZER_READY' }, '*');

    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Parse the free-text experience box into structured roles.
  // Each role block: first line "Title at Company", remaining lines = description.
  function parseExperience(raw: string) {
    return raw
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const lines = block.split('\n');
        const head = lines[0] ?? '';
        const desc = lines.slice(1).join('\n').trim();
        const m = head.split(/\s+at\s+|\s*[-|–]\s*/i);
        return {
          title: (m[0] ?? head).trim(),
          company: (m[1] ?? '').trim(),
          description: desc || head,
        };
      });
  }

  async function handleOptimize() {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const payload = {
        name: name || undefined,
        headline: headline || undefined,
        about: about || undefined,
        experience: experienceRaw ? parseExperience(experienceRaw) : undefined,
        skills: skillsRaw ? skillsRaw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) : undefined,
        education: education || undefined,
        targetRole: targetRole || undefined,
        jobDescription: jobDescription || undefined,
        resumeText: useResume && resumeText ? resumeText : undefined,
      };

      const res = await fetch('/api/linkedin-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) { window.location.href = '/auth/login'; return; }
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return; }

      setResult(data.result);
      setLocked(!!data.locked);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !!(headline || about || experienceRaw || skillsRaw || (useResume && resumeText));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
            style={{ background: 'rgba(10,102,194,0.12)', border: '1px solid rgba(10,102,194,0.3)', color: '#5ea9ff' }}>
            <Linkedin className="w-3.5 h-3.5" />
            LinkedIn Optimizer
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight tracking-tight">
            Get found by recruiters on<br />
            <span style={{ background: 'linear-gradient(135deg,#0a66c2,#5ea9ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              LinkedIn
            </span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Paste your current profile (or use our Chrome extension to pull it automatically). We rewrite every section to rank higher in recruiter search.
          </p>
        </div>

        {fromExtension && (
          <div className="mb-5 rounded-xl px-4 py-3 flex items-center gap-2.5 text-sm"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#6ee7b7' }}>
            <Check className="w-4 h-4 shrink-0" />
            Profile imported from the HireWin extension. Review and optimize below.
          </div>
        )}

        {/* Resume context banner — the optimizer uses your real resume as the source of truth */}
        {resumeMeta && (
          <div className="mb-5 rounded-xl px-4 py-3.5"
            style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.22)' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 shrink-0 text-purple-400" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    Optimizing from your resume{resumeMeta.role ? ` — ${resumeMeta.role}` : ''}
                  </div>
                  <div className="text-xs text-slate-400">
                    {resumeMeta.company ? `${resumeMeta.company} · ` : ''}We rewrite your LinkedIn from your real experience.
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                <input type="checkbox" checked={useResume} onChange={(e) => setUseResume(e.target.checked)}
                  className="w-4 h-4 accent-purple-500" />
                <span className="text-xs text-slate-300">Use</span>
              </label>
            </div>
            <button onClick={() => setShowResume((v) => !v)}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors">
              {showResume ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showResume ? 'Hide' : 'View / edit'} resume text
            </button>
            {showResume && (
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={6}
                className="mt-2 w-full px-3.5 py-2.5 rounded-xl text-xs text-slate-300 placeholder:text-slate-600 outline-none transition-all focus:border-purple-500/50 resize-y"
                style={{ background: '#0a1020', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            )}
          </div>
        )}

        {/* Input form */}
        <div className="rounded-2xl p-5 sm:p-6 space-y-4 mb-6" style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Current Headline</label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Software Engineer at Acme | React, Node.js"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-purple-500/50"
              style={{ background: '#0a1020', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Current About / Summary</label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={4}
              placeholder="Paste your current LinkedIn About section..."
              className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-purple-500/50 resize-y"
              style={{ background: '#0a1020', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Experience <span className="text-slate-600 font-normal">— one role per block, blank line between. First line: "Title at Company"</span>
            </label>
            <textarea
              value={experienceRaw}
              onChange={(e) => setExperienceRaw(e.target.value)}
              rows={5}
              placeholder={'Software Engineer at Acme\nBuilt the billing system and APIs...\n\nIntern at Beta Corp\nWorked on the mobile app...'}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-purple-500/50 resize-y"
              style={{ background: '#0a1020', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Current Skills <span className="text-slate-600 font-normal">— comma separated</span></label>
              <input
                value={skillsRaw}
                onChange={(e) => setSkillsRaw(e.target.value)}
                placeholder="React, Node.js, AWS, Python"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-purple-500/50"
                style={{ background: '#0a1020', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Role <span className="text-slate-600 font-normal">— optional</span></label>
              <input
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="Senior Frontend Engineer"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-purple-500/50"
                style={{ background: '#0a1020', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </div>

          {/* Optional JD toggle */}
          <button
            onClick={() => setShowJD((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            {showJD ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Add a target job description (sharpens keyword targeting)
          </button>
          {showJD && (
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={4}
              placeholder="Paste the job description you're targeting..."
              className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-purple-500/50 resize-y"
              style={{ background: '#0a1020', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={handleOptimize}
            disabled={loading || !canSubmit}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #0a66c2, #3b82f6)' }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'Optimizing your profile…' : 'Optimize My LinkedIn'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div ref={resultsRef} className="space-y-5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Your optimized profile
            </h2>

            {/* Headlines */}
            <SectionCard icon={Tag} title="Headline options" accent="#5ea9ff">
              <div className="space-y-2.5">
                {result.headlines.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-xl p-3" style={{ background: '#0a1020', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-sm text-slate-200 flex-1 leading-relaxed">{h}</span>
                    <CopyButton text={h} />
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* About */}
            <SectionCard icon={FileText} title="About section">
              {locked ? (
                <LockedTeaser teaser={result.about} />
              ) : (
                <div>
                  <div className="flex justify-end mb-2"><CopyButton text={result.about} label="Copy About" /></div>
                  <div className="rounded-xl p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap" style={{ background: '#0a1020', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {result.about}
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Experience */}
            {!locked && result.experience.length > 0 && (
              <SectionCard icon={Briefcase} title="Experience rewrites" accent="#34d399">
                <div className="space-y-4">
                  {result.experience.map((exp, i) => {
                    const allBullets = exp.bullets.map((b) => `• ${b}`).join('\n');
                    return (
                      <div key={i} className="rounded-xl p-4" style={{ background: '#0a1020', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div>
                            <div className="text-sm font-semibold text-white">{exp.title}</div>
                            {exp.company && <div className="text-xs text-slate-500">{exp.company}</div>}
                          </div>
                          <CopyButton text={allBullets} />
                        </div>
                        <ul className="space-y-1.5">
                          {exp.bullets.map((b, j) => (
                            <li key={j} className="flex gap-2 text-sm text-slate-300 leading-relaxed">
                              <span className="text-green-400 shrink-0">•</span>{b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {locked && (
              <div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(59,130,246,0.08))', border: '1px solid rgba(124,58,237,0.25)' }}>
                <Lock className="w-6 h-6 text-purple-400 mx-auto mb-3" />
                <h3 className="font-bold text-white mb-1.5">Unlock your full About + Experience rewrites</h3>
                <p className="text-sm text-slate-400 mb-4 max-w-sm mx-auto">
                  Free preview includes headlines, skills, and tips. Upgrade to get your complete first-person About section and per-role experience rewrites.
                </p>
                <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
                  See plans <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Skills */}
            <SectionCard icon={Tag} title="Recommended skills" accent="#f472b6">
              <div className="flex justify-end mb-3"><CopyButton text={result.skills.join(', ')} label="Copy all" /></div>
              <div className="flex flex-wrap gap-2">
                {result.skills.map((s, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200" style={{ background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.2)' }}>
                    {s}
                  </span>
                ))}
              </div>
            </SectionCard>

            {/* Tips */}
            <SectionCard icon={Lightbulb} title="Profile quick wins" accent="#fbbf24">
              <ul className="space-y-2.5">
                {result.tips.map((t, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-300 leading-relaxed">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function LockedTeaser({ teaser }: { teaser: string }) {
  return (
    <div className="relative">
      <div className="rounded-xl p-4 text-sm text-slate-300 leading-relaxed" style={{ background: '#0a1020', border: '1px solid rgba(255,255,255,0.06)' }}>
        {teaser}
        <div className="mt-2 space-y-1.5" style={{ filter: 'blur(4px)', userSelect: 'none' }} aria-hidden>
          <div className="h-3 rounded bg-white/10 w-full" />
          <div className="h-3 rounded bg-white/10 w-11/12" />
          <div className="h-3 rounded bg-white/10 w-10/12" />
          <div className="h-3 rounded bg-white/10 w-full" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-3">
        <Link href="/pricing" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
          <Lock className="w-3 h-3" /> Unlock full About
        </Link>
      </div>
    </div>
  );
}
