'use client';

import { useState } from 'react';
import { Loader2, Copy, Check } from 'lucide-react';

export default function OutreachSection({
  optimizedResume,
  role,
  company,
  jdText,
}: {
  optimizedResume: string;
  role: string;
  company: string;
  jdText?: string;
}) {
  const [tab, setTab]           = useState<'email' | 'linkedin'>('email');
  const [email, setEmail]       = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState(false);

  const generated = email || linkedin;
  const text = tab === 'email' ? email : linkedin;

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optimizedResume, role, company, jdText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate outreach');
      setEmail(data.email ?? '');
      setLinkedin(data.linkedin ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
    setLoading(false);
  }

  function copy() {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openSend() {
    if (tab === 'email') {
      const lines = email.split('\n');
      const subjectLine = lines.find((l) => /^subject:/i.test(l.trim()));
      const subject = subjectLine ? subjectLine.replace(/^subject:\s*/i, '').trim() : 'Job Application';
      const body = subjectLine ? lines.filter((l) => l !== subjectLine).join('\n').trim() : email;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else {
      window.open('https://www.linkedin.com/messaging/', '_blank');
    }
  }

  return (
    <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white">Cold Outreach Generator</h3>
          <p className="text-xs text-slate-400 mt-0.5">Reach hiring managers with targeted cold emails & LinkedIn connection notes</p>
        </div>
        {generated && (
          <button
            onClick={generate}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Regenerate
          </button>
        )}
      </div>

      {!generated ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <p className="text-sm text-slate-400 text-center max-w-sm">
            Generate a personalized cold email draft and LinkedIn note tailored specifically to this role and company based on your optimized resume.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <button
              onClick={() => { setTab('email'); generate(); }}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 shadow-lg"
              style={{ background: '#ea4335' }}
            >
              {loading && tab === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              )}
              Generate Cold Email Draft
            </button>
            <button
              onClick={() => { setTab('linkedin'); generate(); }}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 shadow-lg"
              style={{ background: '#0a66c2' }}
            >
              {loading && tab === 'linkedin' ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              )}
              Generate LinkedIn Note
            </button>
          </div>
          {error && (
            <div className="rounded-xl px-4 py-2.5 text-xs text-red-300 bg-red-500/10 border border-red-500/20">
              {error}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            {(['email', 'linkedin'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-1.5 text-sm rounded-lg font-medium transition-all"
                style={tab === t
                  ? { background: 'var(--accent-fill)', color: 'var(--on-accent)' }
                  : { background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
              >
                {t === 'email' ? 'Cold Email' : 'LinkedIn Note'}
              </button>
            ))}
          </div>
          <div className="rounded-xl p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {text || <span className="text-slate-600 italic">Not generated yet — switch tab and click Regenerate</span>}
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={openSend}
              disabled={!text}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{ background: tab === 'email' ? '#ea4335' : '#0a66c2' }}
            >
              {tab === 'email' ? (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                  Open in Gmail
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  Open LinkedIn
                </>
              )}
            </button>
            <button
              onClick={copy}
              disabled={!text}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
            >
              {copied ? <Check className="w-4 h-4 text-[var(--signal)]" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy text'}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            {tab === 'email'
              ? 'Opens your default email app with the draft pre-filled · edit before sending'
              : 'Copy the note above · paste when sending a LinkedIn connection request'}
          </p>
        </>
      )}
    </div>
  );
}
