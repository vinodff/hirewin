import Link from 'next/link';
import { ArrowRight, LayoutTemplate } from 'lucide-react';
import ScrollReveal from '@/components/scroll-reveal';

/**
 * TemplateGallery — (c) 3–4 clean template previews, built as original
 * SVG/CSS cards in this file. No competitor template is copied, no
 * screenshot is used. Each preview is a miniature, abstract resume:
 * header lines, bullet lines and skill pills, in a restrained accent.
 * All previews link to the real /builder.
 */
type Template = { name: string; desc: string; accent: string; layout: 'classic' | 'modern' | 'creative' | 'minimal' };

const TEMPLATES: Template[] = [
  { name: 'Classic', desc: 'Clean, single-column, ATS-friendly.', accent: '#7c3aed', layout: 'classic' },
  { name: 'Modern', desc: 'Two-column with a quiet sidebar.', accent: '#3b82f6', layout: 'modern' },
  { name: 'Creative', desc: 'Bold header, still readable by ATS.', accent: '#0ea5e9', layout: 'creative' },
  { name: 'Minimal', desc: 'Maximum whitespace, no decoration.', accent: '#64748b', layout: 'minimal' },
];

function MiniResume({ t }: { t: Template }) {
  // Abstract lines only — no real person's data, no copied design.
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#f8fafc', border: '1px solid rgba(255,255,255,0.12)' }} aria-hidden="true">
      <div className="p-3" style={t.layout === 'creative' ? { background: t.accent, paddingBottom: 12 } : undefined}>
        <div className="h-2.5 rounded-full mb-1.5" style={{ width: '55%', background: t.layout === 'creative' ? '#fff' : '#0f172a' }} />
        <div className="h-1.5 rounded-full" style={{ width: '35%', background: t.layout === 'creative' ? 'rgba(255,255,255,0.7)' : '#94a3b8' }} />
      </div>
      <div className={`p-3 ${t.layout === 'modern' ? 'grid grid-cols-[72px_1fr] gap-3' : ''}`}>
        {t.layout === 'modern' && (
          <div className="space-y-1.5 pt-0.5">
            <div className="h-1.5 rounded-full" style={{ background: t.accent, width: '80%' }} />
            <div className="h-1.5 rounded-full bg-slate-300" style={{ width: '60%' }} />
            <div className="h-1.5 rounded-full bg-slate-300" style={{ width: '70%' }} />
          </div>
        )}
        <div className="space-y-2">
          <div className="h-1.5 rounded-full bg-slate-300" style={{ width: '90%' }} />
          <div className="h-1.5 rounded-full bg-slate-300" style={{ width: '75%' }} />
          <div className="h-1.5 rounded-full bg-slate-300" style={{ width: '85%' }} />
          <div className="flex gap-1 mt-1">
            {['', '', ''].map((_, i) => (
              <span key={i} className="h-3.5 rounded-full" style={{ width: 28, background: `${t.accent}22`, border: `1px solid ${t.accent}44` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplateGallery() {
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <ScrollReveal className="text-center mb-10">
        <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-300 mb-5" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
          <LayoutTemplate className="w-4 h-4" /> Templates
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-[1.05] tracking-tight">
          Pick a look that still<br className="hidden sm:block" /> <span className="gradient-text">passes the ATS.</span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Pretty templates that break parsing help no one. These are clean,
          structured, and built for both a human reader and a parser.
        </p>
      </ScrollReveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {TEMPLATES.map((t, i) => (
          <ScrollReveal key={t.name} delay={i * 90}>
            <Link href="/builder" className="block rounded-2xl p-4 transition-transform hover:-translate-y-1" style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
              <MiniResume t={t} />
              <h3 className="text-base font-bold text-white mt-4 mb-1">{t.name}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{t.desc}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-300 mt-3">Use this template <ArrowRight className="w-4 h-4" /></span>
            </Link>
          </ScrollReveal>
        ))}
      </div>
      <p className="text-center text-xs text-slate-500 mt-6">Template previews are abstract examples, not finished resumes.</p>
    </section>
  );
}
