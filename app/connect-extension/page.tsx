'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Check, Linkedin, Loader2, ShieldCheck } from 'lucide-react';
import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';

export default function ConnectExtensionPage() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/extension/token');
      if (res.status === 401) { window.location.href = '/auth/login?next=/connect-extension'; return; }
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Could not generate a code'); return; }
      setToken(data.token);
      setEmail(data.email);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="flex-1 w-full max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
            style={{ background: 'rgba(10,102,194,0.12)', border: '1px solid rgba(10,102,194,0.3)', color: '#5ea9ff' }}>
            <Linkedin className="w-3.5 h-3.5" />
            Connect the LinkedIn Extension
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-3">Link your HireWin account</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Copy this connection code and paste it into the HireWin extension popup. This lets the extension optimize your LinkedIn profile using your account.
          </p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" /> Generating your code…
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-sm text-red-400 mb-4">{error}</p>
              <button onClick={load} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #0a66c2, #3b82f6)' }}>
                Try again
              </button>
            </div>
          ) : (
            <>
              {email && (
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Signed in as <span className="text-slate-200 font-medium">{email}</span>
                </div>
              )}
              <label className="block text-xs font-semibold text-slate-300 mb-2">Connection code</label>
              <div className="rounded-xl p-3 mb-3 break-all text-xs text-slate-300 font-mono"
                style={{ background: '#0a1020', border: '1px solid rgba(255,255,255,0.08)' }}>
                {token}
              </div>
              <button
                onClick={async () => { await navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: copied ? '#059669' : 'linear-gradient(135deg, #0a66c2, #3b82f6)' }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied — now paste it in the extension' : 'Copy connection code'}
              </button>

              <ol className="mt-6 space-y-2.5 text-sm text-slate-400 list-decimal list-inside">
                <li>Click the HireWin extension icon in your browser toolbar.</li>
                <li>Paste this code into the <strong className="text-slate-200">Connection code</strong> box and hit Save.</li>
                <li>Open your LinkedIn profile and click <strong className="text-slate-200">Optimize with HireWin</strong>.</li>
              </ol>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Keep this code private — it links the extension to your account. You can regenerate it anytime by reloading this page.
        </p>
        <div className="text-center mt-4">
          <Link href="/linkedin-optimizer" className="text-sm text-slate-500 hover:text-slate-300">Or use the web optimizer →</Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
