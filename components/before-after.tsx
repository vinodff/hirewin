'use client';

import { useState, useCallback } from 'react';
import { Copy, Check, FileText, Pencil, Eye, ArrowLeftRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { TemplateName } from './template-selector';
import { ScaledPaper } from './resume-preview';

const ResumeEditor = dynamic(() => import('./resume-editor'), { ssr: false });
const ResumePreview = dynamic(() => import('./resume-preview'), { ssr: false });
const TemplateSelector = dynamic(() => import('./template-selector'), { ssr: false });

type Props = {
  original: string;
  optimized: string;
  atsScore?: number;
  jobFitScore?: number;
  onResumeUpdate?: (text: string) => void;
};

type ViewMode = 'compare' | 'edit' | 'preview';

export default function BeforeAfter({ original, optimized, atsScore, jobFitScore, onResumeUpdate }: Props) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('compare');
  const [editedText, setEditedText] = useState(optimized);
  const [template, setTemplate] = useState<TemplateName>('classic');
  const [hasEdits, setHasEdits] = useState(false);
  const [mobileTab, setMobileTab] = useState<'original' | 'optimized'>('optimized');

  function copy() {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handleSave = useCallback(
    (text: string) => {
      setEditedText(text);
      setHasEdits(true);
      onResumeUpdate?.(text);
    },
    [onResumeUpdate]
  );

  const viewModes: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'compare', label: 'Compare', icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
    { mode: 'edit', label: 'Edit', icon: <Pencil className="w-3.5 h-3.5" /> },
    { mode: 'preview', label: 'Preview', icon: <Eye className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div
        className="rounded-2xl p-5"
        style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white">Before / After</h3>
            {typeof atsScore === 'number' && typeof jobFitScore === 'number' && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {atsScore}
                </span>
                <span className="text-slate-600 text-xs">→</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
                  {jobFitScore}
                </span>
                <span className="text-xs font-semibold text-emerald-400">
                  +{jobFitScore - atsScore} pts
                </span>
              </div>
            )}
            {hasEdits && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(124,58,237,0.12)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)' }}>
                Edited
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {viewModes.map(({ mode, label, icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
                  style={
                    viewMode === mode
                      ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff' }
                      : { color: '#94a3b8' }
                  }
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-white/10" />

            {/* Copy button */}
            <button
              onClick={copy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Template selector (visible in edit and preview modes) */}
      {(viewMode === 'edit' || viewMode === 'preview') && (
        <TemplateSelector selected={template} onSelect={setTemplate} />
      )}

      {/* Compare view */}
      {viewMode === 'compare' && (
        <div
          className="rounded-2xl sm:p-6"
          style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Mobile tab toggle */}
          <div className="flex sm:hidden mx-3 mt-3 mb-3 rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={() => setMobileTab('original')}
              className="flex-1 py-2.5 text-xs font-semibold transition-all"
              style={mobileTab === 'original'
                ? { background: 'rgba(239,68,68,0.18)', color: '#fca5a5' }
                : { color: '#64748b' }}>
              Before{typeof atsScore === 'number' && <span className="ml-1 opacity-70">({atsScore})</span>}
            </button>
            <button onClick={() => setMobileTab('optimized')}
              className="flex-1 py-2.5 text-xs font-semibold transition-all"
              style={mobileTab === 'optimized'
                ? { background: 'rgba(16,185,129,0.18)', color: '#34d399' }
                : { color: '#64748b' }}>
              After{typeof jobFitScore === 'number' && <span className="ml-1 opacity-70">({jobFitScore})</span>}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 sm:gap-5">
            <div className={mobileTab === 'optimized' ? 'hidden sm:block' : ''}>
              <PaperPreview
                label="Before"
                content={original}
                badge={
                  typeof atsScore === 'number' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>
                        Score: {atsScore}
                      </span>
                    </div>
                  ) : null
                }
              />
            </div>
            <div className={mobileTab === 'original' ? 'hidden sm:block' : ''}>
              <ResumePreview
                resumeText={editedText}
                template={template}
                label="After"
                badge={
                  <div className="flex items-center gap-2">
                    {typeof jobFitScore === 'number' && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
                        Score: {jobFitScore}
                      </span>
                    )}
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                      style={{ background: 'rgba(16,185,129,0.08)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' }}>
                      ATS-Optimized ✓
                    </span>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit view */}
      {viewMode === 'edit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResumeEditor
            initialText={editedText}
            onSave={handleSave}
          />
          <div
            className="rounded-2xl p-6"
            style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <ResumePreview
              resumeText={editedText}
              template={template}
              label="Live Preview"
              badge={
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-md"
                  style={{
                    background: 'rgba(124,58,237,0.12)',
                    color: '#c4b5fd',
                    border: '1px solid rgba(124,58,237,0.25)',
                  }}
                >
                  {template.charAt(0).toUpperCase() + template.slice(1)}
                </span>
              }
            />
          </div>
        </div>
      )}

      {/* Full preview view */}
      {viewMode === 'preview' && (
        <div
          className="rounded-2xl p-6"
          style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="max-w-2xl mx-auto">
            <ResumePreview
              resumeText={editedText}
              template={template}
              label="Full Preview"
              badge={
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-md"
                  style={{
                    background: 'rgba(124,58,237,0.12)',
                    color: '#c4b5fd',
                    border: '1px solid rgba(124,58,237,0.25)',
                  }}
                >
                  {template.charAt(0).toUpperCase() + template.slice(1)} template
                </span>
              }
              showDownload
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Simple Paper Preview for Original ─────── */
function PaperPreview({
  label,
  content,
  badge,
}: {
  label: string;
  content: string;
  badge?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-3 pt-3 sm:px-0 sm:pt-0 sm:mb-3">
        <div className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 text-slate-500">
          <FileText className="w-3.5 h-3.5" />
          {label}
        </div>
        {badge}
      </div>

      <div
        className="rounded-none sm:rounded-lg overflow-hidden p-0 sm:p-[10px]"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <ScaledPaper shadow="0 10px 30px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.25)">
          <pre
            className="whitespace-pre-wrap break-words"
            style={{
              padding: '40px 48px',
              fontFamily: '"Calibri", "Segoe UI", Arial, sans-serif',
              fontSize: '11.5px',
              lineHeight: '1.55',
              color: '#111827',
              margin: 0,
            }}
          >
            {content?.trim() ? content : '(No content)'}
          </pre>
        </ScaledPaper>
      </div>
    </div>
  );
}
