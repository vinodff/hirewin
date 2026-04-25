'use client';

import { useState } from 'react';
import { Download, Loader2, Lock, FileText, Palette } from 'lucide-react';
import { trackEvent, getSessionHash } from '@/lib/analytics';

type Props = {
  optimizedResume: string;
  versionId?: string;
  template?: string;
};

export default function DownloadButtons({ optimizedResume, versionId, template }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="rounded-2xl p-6"
      style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
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
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
        >
          {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download PDF
        </button>
        <button
          onClick={() => download('docx')}
          disabled={docxLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-slate-300 hover:text-white transition-all disabled:opacity-40"
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
          <a href="/pricing" className="underline font-medium hover:text-orange-300 transition-colors">Upgrade</a>
        </div>
      )}
      <p className="text-xs text-slate-600 mt-3">Free plan: preview + clipboard only · Starter+ unlocks downloads</p>
    </div>
  );
}
