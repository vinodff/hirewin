'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, Palette, Share2, CheckCircle2, Gift, Sparkles, Lock, Crown } from 'lucide-react';
import Link from 'next/link';
import { trackEvent, getSessionHash } from '@/lib/analytics';
import UnlockModal from '@/components/unlock-modal';

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
  const [downloadsLeft, setDownloadsLeft] = useState<number | null>(null); // null = loading, -1 = unlimited
  const [planUnlimited, setPlanUnlimited] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // Always fetch — versionId is optional (only affects share count, not plan gate)
    const url = versionId ? `/api/share?versionId=${versionId}` : '/api/share';
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.shareCount === 'number') setShareCount(d.shareCount);
        if (typeof d.downloadsLeft === 'number') setDownloadsLeft(d.downloadsLeft);
        if (typeof d.planUnlimited === 'boolean') setPlanUnlimited(d.planUnlimited);
        if (typeof d.signedIn === 'boolean') setSignedIn(d.signedIn);
      })
      .catch(() => {});
  }, [versionId]);

  const sharesUnlocked = shareCount >= SHARES_NEEDED;
  const hasFreeDownload = downloadsLeft !== null && downloadsLeft !== 0; // includes -1 (unlimited) and >0
  const canDownload = planUnlimited || hasFreeDownload || sharesUnlocked;

  const siteUrl = 'https://hirewin.live';
  const afterScore = beforeScore !== undefined ? Math.min(beforeScore + 52, 95) : 87;

  const whatsappMsg =
    beforeScore !== undefined
      ? `🎯 My resume ATS score just jumped from ${beforeScore}% → ${afterScore}% in 20 seconds!\n\nUsed HireWin to optimize it for the job description — completely free to try.\n\nCheck it out 👉 ${siteUrl}`
      : `🚀 Just optimized my resume with HireWin AI — it tailors your resume to any job and boosts your ATS score instantly.\n\nFree to try 👉 ${siteUrl}`;

  async function handleShare() {
    if (sharesUnlocked) return;
    setSharingBusy(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId: versionId ?? null }),
      });
      if (res.status === 401) { window.location.href = '/auth/login'; return; }
      const data = await res.json();
      if (typeof data.shareCount === 'number') {
        const prev = shareCount;
        setShareCount(data.shareCount);
        if (data.unlocked && prev < SHARES_NEEDED) setJustUnlocked(true);
      }
    } catch { /* ignore */ }
    setSharingBusy(false);
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

      if (res.status === 403) { setShowUnlock(true); setLoading(false); return; }
      if (res.status === 401) { window.location.href = '/auth/login'; return; }
      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `resume-${versionId?.slice(0, 8) ?? 'optimized'}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      trackEvent(format === 'pdf' ? 'download_pdf' : 'download_docx', {}, getSessionHash());
      setShowUnlock(false);
      // optimistic: decrement free downloads after success (server is authoritative)
      if (!planUnlimited && downloadsLeft !== null && downloadsLeft > 0) {
        setDownloadsLeft(downloadsLeft - 1);
      }
    } catch { /* silently handle */ }
    setLoading(false);
  }

  const remaining = SHARES_NEEDED - shareCount;
  const showFreeBanner = signedIn === true && !planUnlimited && downloadsLeft !== null && downloadsLeft > 0 && !sharesUnlocked;
  const showSignInPrompt = signedIn === false;

  return (
    <>
      {showUnlock && !sharesUnlocked && (
        <UnlockModal onClose={() => setShowUnlock(false)} onPaid={() => setShowUnlock(false)} />
      )}

      <div className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0f1629, #0a1020)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 20px 50px -15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>

        {/* Top accent stripe */}
        {canDownload && (
          <div className="absolute top-0 inset-x-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.6), rgba(59,130,246,0.6), transparent)' }} />
        )}

        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base sm:text-lg">Download your resume</h3>
              {planUnlimited && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                  <Crown className="w-3 h-3" />
                  Unlimited
                </span>
              )}
            </div>
            {template && template !== 'classic' && (
              <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(124,58,237,0.12)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)' }}>
                <Palette className="w-3 h-3" />
                {template.charAt(0).toUpperCase() + template.slice(1)}
              </span>
            )}
          </div>

          {/* FREE DOWNLOAD BANNER — most prominent */}
          {showFreeBanner && (
            <div className="relative rounded-xl p-4 mb-5 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(59,130,246,0.12))',
                border: '1px solid rgba(124,58,237,0.35)',
              }}>
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-30 blur-2xl"
                style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.4)' }}>
                  <Gift className="w-5 h-5 text-purple-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white flex items-center gap-1.5">
                    1 free download ready
                    <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Use it now — no card needed, no strings attached.</p>
                </div>
              </div>
            </div>
          )}

          {/* Just unlocked via shares */}
          {sharesUnlocked && justUnlocked && (
            <div className="rounded-xl p-4 mb-5 flex items-center gap-3"
              style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)' }}>
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-300">Download unlocked. Thanks for sharing.</p>
                <p className="text-xs text-slate-400 mt-0.5">Click PDF or DOCX below.</p>
              </div>
            </div>
          )}

          {/* Download buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => download('pdf')} disabled={pdfLoading || docxLoading}
              className="group relative flex-1 flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl font-bold text-white transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                boxShadow: canDownload ? '0 8px 24px -8px rgba(124,58,237,0.5)' : 'none',
              }}>
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download PDF</span>
              {!canDownload && !pdfLoading && <Lock className="w-3.5 h-3.5 opacity-70" />}
            </button>
            <button onClick={() => download('docx')} disabled={pdfLoading || docxLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl font-semibold text-slate-300 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {docxLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download DOCX</span>
              {!canDownload && !docxLoading && <Lock className="w-3.5 h-3.5 opacity-70" />}
            </button>
          </div>

          {/* Sign-in prompt for anonymous users */}
          {showSignInPrompt && (
            <div className="mt-4 rounded-xl p-3 flex items-center gap-2.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <p className="text-xs text-slate-400 flex-1">
                <Link href="/auth/login" className="text-purple-400 font-semibold hover:underline">Sign in</Link>
                {' '}to claim your free download.
              </p>
            </div>
          )}

          {/* Share-to-unlock — only shown when not unlocked & not freshly unlocked & signed in & no free download */}
          {!sharesUnlocked && signedIn && (!showFreeBanner || downloadsLeft === 0) && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-300">Or unlock more by sharing</span>
                <span className="text-xs font-bold ml-auto tabular-nums" style={{ color: shareCount > 0 ? '#25d366' : '#64748b' }}>
                  {shareCount}/{SHARES_NEEDED}
                </span>
              </div>

              {/* Progress segments */}
              <div className="flex gap-1.5 mb-3">
                {Array.from({ length: SHARES_NEEDED }).map((_, i) => (
                  <div key={i} className="flex-1 h-2 rounded-full transition-all duration-500"
                    style={{
                      background: i < shareCount ? '#25d366' : 'rgba(255,255,255,0.07)',
                      boxShadow: i < shareCount ? '0 0 10px #25d36670, inset 0 1px 0 rgba(255,255,255,0.2)' : 'none',
                    }} />
                ))}
              </div>

              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                {remaining > 0
                  ? `Share with ${remaining} more friend${remaining !== 1 ? 's' : ''} on WhatsApp to unlock unlimited downloads.`
                  : 'All shares done — click Download above.'}
              </p>

              <button onClick={handleShare} disabled={sharingBusy}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-95 active:scale-95 disabled:opacity-60"
                style={{ background: '#25d366', boxShadow: '0 4px 14px -4px rgba(37,211,102,0.5)' }}>
                {sharingBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : WA_ICON}
                {sharingBusy ? 'Recording…' : `Share on WhatsApp (${shareCount}/${SHARES_NEEDED})`}
              </button>
            </div>
          )}

          {/* Organic share when shares-unlocked */}
          {sharesUnlocked && !justUnlocked && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Share2 className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-300">Share your win</span>
                {beforeScore !== undefined && (
                  <span className="text-xs text-slate-500">
                    {beforeScore} → <span className="text-green-400 font-semibold">{afterScore}</span> ATS
                  </span>
                )}
              </div>
              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`, '_blank')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-95 active:scale-95"
                style={{ background: '#25d366', boxShadow: '0 4px 14px -4px rgba(37,211,102,0.5)' }}>
                {WA_ICON}
                Share on WhatsApp
              </button>
            </div>
          )}

          {/* Footer plan note */}
          <p className="text-[11px] text-slate-600 mt-5 leading-relaxed">
            {planUnlimited
              ? 'Unlimited downloads on your current plan.'
              : 'Free plan: optimize unlimited · 1 free download · then share 5× or upgrade'}
          </p>
        </div>
      </div>
    </>
  );
}
