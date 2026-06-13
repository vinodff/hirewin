'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Linkedin, Upload, FileText, Check, Loader2, ArrowRight, Puzzle, Sparkles, X,
} from 'lucide-react';
import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';

const LINKEDIN_URL = 'https://www.linkedin.com/in/me/';

export default function LinkedInOptimizerPage() {
  const [resumeText, setResumeText] = useState('');
  const [resumeName, setResumeName] = useState('');      // file name or "latest resume"
  const [targetRole, setTargetRole] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Auto-load the user's latest HireWin resume so they can go straight to LinkedIn.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/history');
        if (!res.ok) return;
        const { versions } = await res.json();
        const latest = Array.isArray(versions) ? versions[0] : null;
        const text = (latest?.optimized_resume || latest?.original_resume || '').trim();
        if (text && !resumeText) {
          setResumeText(text);
          setResumeName(latest.role ? `Latest resume — ${latest.role}` : 'Your latest HireWin resume');
        }
      } catch { /* optional */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(file: File) {
    setParseError('');
    if (file.type !== 'application/pdf') { setParseError('Please upload a PDF.'); return; }
    if (file.size > 5 * 1024 * 1024) { setParseError('File too large — max 5 MB.'); return; }
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setParseError(data.error ?? 'Could not read this PDF.'); return; }
      setResumeText(data.text ?? '');
      setResumeName(file.name);
    } catch {
      setParseError('Could not read this PDF. Paste your resume text instead.');
    } finally {
      setParsing(false);
    }
  }

  async function handleOptimize() {
    setError('');
    if (!resumeText.trim()) { setError('Add your resume first (upload, paste, or use your latest).'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/linkedin-prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, targetRole }),
      });
      if (res.status === 401) { window.location.href = '/auth/login?next=/linkedin-optimizer'; return; }
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Could not save. Try again.'); return; }
      setSaved(true);
      // Off to LinkedIn — the extension panel takes over there.
      window.open(LINKEDIN_URL, '_blank');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
            style={{ background: 'rgba(10,102,194,0.12)', border: '1px solid rgba(10,102,194,0.3)', color: '#5ea9ff' }}>
            <Linkedin className="w-3.5 h-3.5" />
            LinkedIn Optimizer
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight tracking-tight">
            Optimize your LinkedIn<br />
            <span style={{ background: 'linear-gradient(135deg,#0a66c2,#5ea9ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              right on the page
            </span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Add your resume and target role here, then jump to your LinkedIn profile. Our extension scores your profile and rewrites every section live — you apply each change with one click.
          </p>
        </div>

        {/* Step 1: resume */}
        <div className="rounded-2xl p-5 sm:p-6 mb-5" style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, #0a66c2, #3b82f6)' }}>1</span>
            <h2 className="text-sm font-bold text-white">Your resume <span className="text-slate-500 font-normal">— the source of truth</span></h2>
          </div>

          {resumeText ? (
            <div className="rounded-xl p-4 flex items-center justify-between gap-3" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm text-slate-200 truncate">{resumeName || 'Resume added'}</span>
              </div>
              <button onClick={() => { setResumeText(''); setResumeName(''); }} className="text-slate-500 hover:text-white shrink-0" title="Remove">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              className="rounded-xl p-6 text-center cursor-pointer transition-all hover:border-blue-500/40"
              style={{ background: '#0a1020', border: '1px dashed rgba(255,255,255,0.14)' }}
            >
              {parsing ? (
                <div className="flex items-center justify-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Reading your PDF…</div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-300 font-medium">Drop your resume PDF or click to upload</p>
                  <p className="text-xs text-slate-600 mt-1">or paste the text below</p>
                </>
              )}
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          )}
          {parseError && <p className="text-xs text-red-400 mt-2">{parseError}</p>}

          <textarea
            value={resumeText}
            onChange={(e) => { setResumeText(e.target.value); if (!resumeName) setResumeName('Pasted resume'); }}
            rows={5}
            placeholder="…or paste your resume text here"
            className="mt-3 w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-blue-500/50 resize-y"
            style={{ background: '#0a1020', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>

        {/* Step 2: target role */}
        <div className="rounded-2xl p-5 sm:p-6 mb-5" style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, #0a66c2, #3b82f6)' }}>2</span>
            <h2 className="text-sm font-bold text-white">Target role <span className="text-slate-500 font-normal">— optional, sharpens keywords</span></h2>
          </div>
          <input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Frontend Engineer"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-blue-500/50"
            style={{ background: '#0a1020', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>

        {error && <p className="text-sm text-red-400 mb-3 text-center">{error}</p>}

        {/* CTA */}
        <button
          onClick={handleOptimize}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #0a66c2, #3b82f6)' }}
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {saving ? 'Saving…' : 'Optimize on LinkedIn'}
          {!saving && <ArrowRight className="w-5 h-5" />}
        </button>

        {saved && (
          <div className="mt-4 rounded-xl px-4 py-3.5 text-sm" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#6ee7b7' }}>
            <div className="flex items-center gap-2 mb-1"><Check className="w-4 h-4 shrink-0" /> Saved. We opened your LinkedIn profile in a new tab.</div>
            <p className="text-slate-400 text-xs leading-relaxed">There, click <strong className="text-slate-200">Optimize with HireWin</strong> (bottom-right). The panel auto-runs and rewrites each section from this resume. <a className="text-blue-400 underline" href={LINKEDIN_URL} target="_blank" rel="noreferrer">Open LinkedIn again</a></p>
          </div>
        )}

        {/* Setup help */}
        <div className="mt-6 rounded-2xl p-5" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.18)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Puzzle className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">First time? Set up the extension (once)</h3>
          </div>
          <ol className="space-y-1.5 text-xs text-slate-400 list-decimal list-inside">
            <li>Install the HireWin LinkedIn extension in Chrome.</li>
            <li><Link href="/connect-extension" className="text-blue-400 underline">Get your connection code</Link> and paste it into the extension popup.</li>
            <li>Come back here, click <strong className="text-slate-200">Optimize on LinkedIn</strong>, and you're set.</li>
          </ol>
        </div>
      </div>

      <Footer />
    </div>
  );
}
