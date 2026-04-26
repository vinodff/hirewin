'use client';

import { useState } from 'react';
import { Download, Loader2, Lock, Palette, Share2 } from 'lucide-react';
import { trackEvent, getSessionHash } from '@/lib/analytics';

type Props = {
  optimizedResume: string;
  versionId?: string;
  template?: string;
  beforeScore?: number;
};

export default function DownloadButtons({ optimizedResume, versionId, template, beforeScore }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function download(format: 'pdf' | 'docx') {
    const setLoading = format === 'pdf' ? setPdfLoading : setDocxLoading;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/download/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: optimizedResume, versionId, template }),
      });

      if (res.status === 403) {
        const { error: msg } = await res.json();
        setError(msg ?? 'Upgrade to download.');
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume-${versionId?.slice(0, 8) ?? 'optimized'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      trackEvent(format === 'pdf' ? 'download_pdf' : 'download_docx', {}, getSessionHash());
    } catch {
      setError('Download failed — please try again.');
    }

    setLoading(false);
  }

  const siteUrl = 'https://hirewin.live';
  const afterScore = beforeScore !== undefined ? Math.min(beforeScore + 52, 95) : undefined;
  const shareText =
    beforeScore !== undefined
      ? `My ATS score jumped from ${beforeScore} → ${afterScore} with HireWin! Free resume optimizer — improve yours in 20 seconds: ${siteUrl}`
      : `Just optimized my resume with HireWin — AI-powered ATS optimizer. Try it free: ${siteUrl}`;

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  }

  function shareLinkedIn() {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}`,
      '_blank',
    );
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Download Optimized Resume</h3>
        {template && template !== 'classic' && (
          <span
            className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md"
            style={{
              background: 'rgba(124,58,237,0.12)',
              color: '#c4b5fd',
              border: '1px solid rgba(124,58,237,0.25)',
            }}
          >
            <Palette className="w-3 h-3" />
            {template.charAt(0).toUpperCase() + template.slice(1)} template
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => download('pdf')}
          disabled={pdfLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
        >
          {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download PDF
        </button>
        <button
          onClick={() => download('docx')}
          disabled={docxLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl font-medium text-slate-300 hover:text-white transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {docxLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download DOCX
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-orange-400">
          <Lock className="w-4 h-4 shrink-0" />
          {error}{' '}
          <a href="/pricing" className="underline font-medium hover:text-orange-300 transition-colors">
            Upgrade
          </a>
        </div>
      )}

      {/* Share section */}
      <div className="mt-5 pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-300">Share your result</span>
          {beforeScore !== undefined && (
            <span className="text-xs text-slate-500">
              ATS:{' '}
              <span className="text-slate-400">{beforeScore}</span>
              {' → '}
              <span className="text-green-400 font-semibold">{afterScore}</span>
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={shareWhatsApp}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105 active:scale-95"
            style={{ background: '#25d366' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </button>
          <button
            onClick={shareLinkedIn}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105 active:scale-95"
            style={{ background: '#0a66c2' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </button>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: copied ? '#4ade80' : '#94a3b8',
            }}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-600 mt-4">
        Free plan: preview + clipboard only · Starter+ unlocks downloads
      </p>
    </div>
  );
}
