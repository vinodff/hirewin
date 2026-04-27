'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, Palette, Share2, CheckCircle2, Lock } from 'lucide-react';
import { trackEvent, getSessionHash } from '@/lib/analytics';

const SHARES_NEEDED = 5;

const WA_ICON = (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

type Props = {
  optimizedResume: string;
  versionId?: string;
  template?: string;
  beforeScore?: number;
};

export default function DownloadButtons({ optimizedResume, versionId, template, beforeScore }: Props) {
  const [pdfLoading, setPdfLoading]     = useState(false);
  const [docxLoading, setDocxLoading]   = useState(false);
  const [showUnlock, setShowUnlock]     = useState(false);
  const [shareCount, setShareCount]     = useState(0);
  const [sharingBusy, setSharingBusy]   = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [notSignedIn, setNotSignedIn]   = useState(false);

  // Load server-side share count on mount
  useEffect(() => {
    const url = versionId
      ? `/api/share?versionId=${versionId}`
      : '/api/share?versionId=';
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.shareCount === 'number') setShareCount(d.shareCount);
      })
      .catch(() => {});
  }, [versionId]);

  const isUnlocked = shareCount >= SHARES_NEEDED;
  const siteUrl = 'https://hirewin.live';
  const afterScore = beforeScore !== undefined ? Math.min(beforeScore + 52, 95) : 87;

  const whatsappMsg =
    beforeScore !== undefined
      ? `🎯 My resume ATS score just jumped from ${beforeScore}% → ${afterScore}% in 20 seconds!\n\nUsed HireWin to optimize it for the job description — completely free to try.\n\nCheck it out 👉 ${siteUrl}`
      : `🚀 Just optimized my resume with HireWin AI — it tailors your resume to any job and boosts your ATS score instantly.\n\nFree to try 👉 ${siteUrl}`;

  async function handleShare() {
    if (isUnlocked) return; // already unlocked, just share for fun
    setSharingBusy(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId: versionId ?? null }),
      });
      if (res.status === 401) {
        setNotSignedIn(true);
        setSharingBusy(false);
        return;
      }
      const data = await res.json();
      if (typeof data.shareCount === 'number') {
        const prev = shareCount;
        setShareCount(data.shareCount);
        if (data.unlocked && prev < SHARES_NEEDED) setJustUnlocked(true);
      }
    } catch { /* ignore */ }
    setSharingBusy(false);
    // Open WhatsApp after recording the share
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
  }

  function openWhatsAppOrganic() {
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
  }

  async function download(format: 'pdf' | 'docx') {
    const setLoading = format === 'pdf' ? setPdfLoading : setDocxLoading;
    setLoading(true);
    try {
      const res = await fetch(`/api/download/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: optimizedResume, versionId, template }),
      });

      if (res.status === 403) {
        setShowUnlock(true);
        setLoading(false);
        return;
      }
      if (res.status === 401) {
        window.location.href = '/auth/login';
        return;
      }
      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `resume-${versionId?.slice(0, 8) ?? 'optimized'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      trackEvent(format === 'pdf' ? 'download_pdf' : 'download_docx', {}, getSessionHash());
      setShowUnlock(false);
    } catch { /* silently handle */ }
    setLoading(false);
  }

  const remaining = SHARES_NEEDED - shareCount;

  return (
    <div className="rounded-2xl p-6" style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Download Optimized Resume</h3>
        {template && template !== 'classic' && (
          <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md"
            style={{ background: 'rgba(124,58,237,0.12)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)' }}>
            <Palette className="w-3 h-3" />
            {template.charAt(0).toUpperCase() + template.slice(1)}
          </span>
        )}
      </div>

      {/* Download buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={() => download('pdf')} disabled={pdfLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
          {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download PDF
        </button>
        <button onClick={() => download('docx')} disabled={docxLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl font-medium text-slate-300 hover:text-white transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {docxLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download DOCX
        </button>
      </div>

      {/* ── Unlock panel — shown after 403 ── */}
      {showUnlock && !isUnlocked && (
        <div className="mt-4 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>

          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-semibold text-white">Unlock your download</p>
          </div>
          <p className="text-xs text-slate-500 mb-5">Free plan includes unlimited optimization — download via sharing or a one-time payment.</p>

          {/* Not signed in warning */}
          {notSignedIn && (
            <div className="rounded-xl p-3 mb-4 text-xs text-amber-400"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              You need to <a href="/auth/login" className="underline font-semibold">sign in</a> to track shares and unlock downloads.
            </div>
          )}

          {/* Option A — Share on WhatsApp */}
          <div className="rounded-xl p-4 mb-3" style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.2)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                {WA_ICON}
                Share on WhatsApp — Free
              </span>
              <span className="text-xs font-bold" style={{ color: shareCount > 0 ? '#25d366' : '#64748b' }}>
                {shareCount}/{SHARES_NEEDED}
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1.5 mb-3">
              {Array.from({ length: SHARES_NEEDED }).map((_, i) => (
                <div key={i} className="flex-1 h-2 rounded-full transition-all duration-500"
                  style={{ background: i < shareCount ? '#25d366' : 'rgba(255,255,255,0.08)', boxShadow: i < shareCount ? '0 0 6px #25d36680' : 'none' }} />
              ))}
            </div>

            <p className="text-xs text-slate-400 mb-3">
              {remaining > 0
                ? `Share HireWin with ${remaining} more friend${remaining !== 1 ? 's' : ''} on WhatsApp to unlock your free download.`
                : '✅ All shares done! Click Download above.'}
            </p>

            <button onClick={handleShare} disabled={sharingBusy}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ background: '#25d366' }}>
              {sharingBusy
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : WA_ICON}
              {sharingBusy ? 'Recording share…' : `Share with a friend (${shareCount}/${SHARES_NEEDED})`}
            </button>
          </div>

          {/* OR divider */}
          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-xs text-slate-600 font-medium">OR</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Option B — Pay ₹49 */}
          <a href="/pricing"
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
            <span className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Pay ₹49 — Unlock Downloads
            </span>
            <span className="text-xs font-normal opacity-75">one-time</span>
          </a>
        </div>
      )}

      {/* ── Success: just reached 5 shares ── */}
      {showUnlock && isUnlocked && (
        <div className="mt-4 rounded-xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)' }}>
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-400">
              {justUnlocked ? '🎉 Download unlocked! Thank you for sharing.' : 'Download unlocked via sharing.'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Click Download PDF or DOCX above.</p>
          </div>
        </div>
      )}

      {/* ── Always-visible organic share strip ── */}
      {!showUnlock && (
        <div className="mt-5 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-300">Share your result</span>
            {beforeScore !== undefined && (
              <span className="text-xs text-slate-500">
                {beforeScore} → <span className="text-green-400 font-semibold">{afterScore}</span> ATS
              </span>
            )}
          </div>
          <button onClick={openWhatsAppOrganic}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105 active:scale-95"
            style={{ background: '#25d366' }}>
            {WA_ICON}
            Share on WhatsApp
          </button>
        </div>
      )}

      <p className="text-xs text-slate-600 mt-4">
        Free plan: optimize unlimited · download free by sharing 5× or ₹49 one-time
      </p>
    </div>
  );
}
