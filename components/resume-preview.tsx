'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import type { TemplateName, TemplateConfig } from './template-selector';
import { TEMPLATES } from './template-selector';

/* ── A4 paper constants (96 dpi) ─────────────── */
export const PAPER_W = 794;   // px  — matches what the PDF renderer uses
export const PAPER_H = 1123;  // px

/* ── ScaledPaper: renders children at full A4 width, scales to container ── */
export function ScaledPaper({
  children,
  bg = '#ffffff',
  shadow,
  maxPages = 2,
}: {
  children: React.ReactNode;
  bg?: string;
  shadow?: string;
  maxPages?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.getBoundingClientRect().width / PAPER_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const containerH = Math.min(PAPER_H * maxPages, PAPER_H * maxPages) * scale;

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: containerH, position: 'relative', overflow: 'hidden' }}
    >
      <div
        style={{
          width: PAPER_W,
          minHeight: PAPER_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
          background: bg,
          boxShadow: shadow ?? '0 4px 24px rgba(0,0,0,0.25)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Types ─────────────────────────────────── */
type Props = {
  resumeText: string;
  template: TemplateName;
  label?: string;
  badge?: React.ReactNode;
  showDownload?: boolean;
  onDownload?: () => void;
};

/* ── Parse resume text into structured sections ── */
type ParsedSection = {
  type: 'header' | 'contact' | 'section-title' | 'content' | 'blank';
  text: string;
};

function parseResume(text: string): ParsedSection[] {
  const lines = text.split('\n');
  const result: ParsedSection[] = [];
  let isFirst = true;
  let contactLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimEnd();

    if (isFirst && trimmed) {
      result.push({ type: 'header', text: trimmed });
      isFirst = false;
      let j = i + 1;
      while (j < lines.length && j <= i + 4) {
        const nextTrimmed = lines[j].trim();
        if (!nextTrimmed) { j++; continue; }
        if (
          nextTrimmed.length < 100 &&
          (nextTrimmed.includes('@') || nextTrimmed.includes('|') ||
            /^\+?\d[\d\s\-()]+$/.test(nextTrimmed) ||
            nextTrimmed.includes('linkedin') || nextTrimmed.includes('github') ||
            nextTrimmed.includes(','))
        ) {
          contactLines.push(nextTrimmed);
          j++;
        } else {
          break;
        }
      }
      if (contactLines.length > 0) {
        result.push({ type: 'contact', text: contactLines.join(' | ') });
        i = j - 1;
      }
      continue;
    }

    if (!trimmed) {
      result.push({ type: 'blank', text: '' });
      continue;
    }

    if (
      trimmed === trimmed.toUpperCase() &&
      trimmed.length > 2 &&
      !/^\d/.test(trimmed) &&
      !isFirst
    ) {
      result.push({ type: 'section-title', text: trimmed });
      continue;
    }

    result.push({ type: 'content', text: lines[i] });
    if (isFirst) isFirst = false;
  }
  return result;
}

/* ── Render section titles per template style ── */
function renderSectionTitle(text: string, tpl: TemplateConfig) {
  switch (tpl.sectionTitleStyle) {
    case 'underline':
      return (
        <div style={{ marginTop: '12px', marginBottom: '4px' }}>
          <div style={{ fontFamily: tpl.fontFamily, fontSize: '12px', fontWeight: 700, color: tpl.sectionTitleColor, letterSpacing: '1.5px', paddingBottom: '2px', borderBottom: `1.5px solid ${tpl.accentBorder}` }}>
            {text}
          </div>
        </div>
      );
    case 'bg-band':
      return (
        <div style={{ marginTop: '12px', marginBottom: '4px', background: `${tpl.sectionTitleColor}12`, padding: '4px 8px', borderLeft: `3px solid ${tpl.sectionTitleColor}` }}>
          <div style={{ fontFamily: tpl.fontFamily, fontSize: '11px', fontWeight: 700, color: tpl.sectionTitleColor, letterSpacing: '1.5px' }}>{text}</div>
        </div>
      );
    case 'left-accent':
      return (
        <div style={{ marginTop: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '3px', height: '16px', borderRadius: '2px', background: `linear-gradient(180deg, ${tpl.accentColor}, ${tpl.accentColor}80)` }} />
          <div style={{ fontFamily: tpl.fontFamily, fontSize: '11px', fontWeight: 700, color: tpl.sectionTitleColor, letterSpacing: '1.5px' }}>{text}</div>
        </div>
      );
    case 'capsule':
      return (
        <div style={{ marginTop: '12px', marginBottom: '4px' }}>
          <span style={{ display: 'inline-block', fontFamily: tpl.fontFamily, fontSize: '10px', fontWeight: 700, color: tpl.sectionTitleColor, letterSpacing: '2px', background: `${tpl.accentColor}10`, border: `1px solid ${tpl.accentColor}30`, padding: '3px 10px', borderRadius: '20px' }}>{text}</span>
        </div>
      );
    case 'minimal':
      return (
        <div style={{ marginTop: '14px', marginBottom: '4px' }}>
          <div style={{ fontFamily: tpl.fontFamily, fontSize: '10px', fontWeight: 600, color: tpl.sectionTitleColor, letterSpacing: '3px', textTransform: 'uppercase', opacity: 0.7 }}>{text}</div>
        </div>
      );
    case 'side-label':
      return (
        <div style={{ marginTop: '12px', marginBottom: '4px', borderTop: `1px solid ${tpl.accentBorder}`, paddingTop: '6px' }}>
          <div style={{ fontFamily: tpl.fontFamily, fontSize: '11px', fontWeight: 700, color: tpl.sectionTitleColor, letterSpacing: '1px' }}>{text}</div>
        </div>
      );
    default:
      return (
        <div style={{ marginTop: '10px', marginBottom: '4px' }}>
          <div style={{ fontFamily: tpl.fontFamily, fontSize: '11px', fontWeight: 700, color: '#333', letterSpacing: '1px' }}>{text}</div>
        </div>
      );
  }
}

/* ── Main Preview Component ────────────────── */
export default function ResumePreview({ resumeText, template, label = 'Preview', badge, showDownload, onDownload }: Props) {
  const tpl = TEMPLATES[template];
  const sections = useMemo(() => parseResume(resumeText), [resumeText]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 text-purple-400">
          <FileText className="w-3.5 h-3.5" />
          {label}
        </div>
        <div className="flex items-center gap-2">
          {badge}
          {showDownload && onDownload && (
            <button onClick={onDownload} className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors">
              <Download className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ background: `linear-gradient(180deg, ${tpl.accentColor}25, ${tpl.accentColor}10)`, padding: '10px' }}
      >
        <ScaledPaper bg={tpl.paperBg} shadow={tpl.paperShadow}>
          <div style={{ padding: tpl.layout === 'two-column' ? '0' : '40px 48px' }}>
            {tpl.layout === 'two-column'
              ? <TwoColumnLayout sections={sections} tpl={tpl} />
              : <SingleColumnLayout sections={sections} tpl={tpl} />
            }
          </div>
        </ScaledPaper>
      </div>
    </div>
  );
}

/* ── Single Column Layout ──────────────────── */
function SingleColumnLayout({ sections, tpl }: { sections: ParsedSection[]; tpl: TemplateConfig }) {
  return (
    <>
      {sections.map((section, i) => {
        switch (section.type) {
          case 'header':
            return (
              <div key={i} style={{ ...(tpl.headerBg ? { background: tpl.headerBg, margin: '-40px -48px 16px -48px', padding: '28px 48px 20px' } : { marginBottom: '4px' }), textAlign: tpl.headerAlign }}>
                <div style={{ fontFamily: tpl.fontFamily, fontSize: '20px', fontWeight: 800, color: tpl.headerTextColor, letterSpacing: '-0.5px' }}>{section.text}</div>
              </div>
            );
          case 'contact':
            return (
              <div key={i} style={{ fontFamily: tpl.bodyFont, fontSize: '9px', color: tpl.headerBg ? '#ffffff90' : '#6b7280', textAlign: tpl.headerAlign, ...(tpl.headerBg ? { margin: '-20px -48px 16px -48px', padding: '0 48px 16px', background: tpl.headerBg } : { marginBottom: '12px' }), letterSpacing: '0.3px' }}>
                {section.text}
              </div>
            );
          case 'section-title':
            return <div key={i}>{renderSectionTitle(section.text, tpl)}</div>;
          case 'content':
            return (
              <div key={i} style={{ fontFamily: tpl.bodyFont, fontSize: tpl.bodySize, lineHeight: tpl.lineHeight, color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {section.text}
              </div>
            );
          case 'blank':
            return <div key={i} style={{ height: '4px' }} />;
          default:
            return null;
        }
      })}
    </>
  );
}

/* ── Two Column Layout ─────────────────────── */
function TwoColumnLayout({ sections, tpl }: { sections: ParsedSection[]; tpl: TemplateConfig }) {
  const sidebarTitles = ['SKILLS', 'EDUCATION', 'CERTIFICATIONS', 'LANGUAGES', 'INTERESTS', 'CONTACT'];
  const sidebar: ParsedSection[] = [];
  const main: ParsedSection[] = [];
  let header: ParsedSection | null = null;
  let contact: ParsedSection | null = null;
  let currentTarget: 'main' | 'sidebar' = 'main';

  for (const section of sections) {
    if (section.type === 'header') { header = section; continue; }
    if (section.type === 'contact') { contact = section; continue; }
    if (section.type === 'section-title') {
      currentTarget = sidebarTitles.includes(section.text.toUpperCase()) ? 'sidebar' : 'main';
    }
    if (currentTarget === 'sidebar') sidebar.push(section);
    else main.push(section);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100%' }}>
      <div style={{ width: '35%', background: tpl.headerBg || '#064e3b', padding: '28px 16px', color: '#ffffff' }}>
        {header && <div style={{ fontFamily: tpl.fontFamily, fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>{header.text}</div>}
        {contact && (
          <div style={{ fontFamily: tpl.bodyFont, fontSize: '8px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px', lineHeight: '1.6' }}>
            {contact.text.split(' | ').map((part, i) => <div key={i}>{part.trim()}</div>)}
          </div>
        )}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '12px' }}>
          {sidebar.map((section, i) => {
            if (section.type === 'section-title') return <div key={i} style={{ fontFamily: tpl.fontFamily, fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '2px', marginTop: i > 0 ? '12px' : '0', marginBottom: '4px' }}>{section.text}</div>;
            if (section.type === 'content') return <div key={i} style={{ fontFamily: tpl.bodyFont, fontSize: '9px', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{section.text}</div>;
            return <div key={i} style={{ height: '3px' }} />;
          })}
        </div>
      </div>
      <div style={{ flex: 1, padding: '28px 24px' }}>
        {main.map((section, i) => {
          if (section.type === 'section-title') return <div key={i}>{renderSectionTitle(section.text, tpl)}</div>;
          if (section.type === 'content') return <div key={i} style={{ fontFamily: tpl.bodyFont, fontSize: tpl.bodySize, lineHeight: tpl.lineHeight, color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{section.text}</div>;
          return <div key={i} style={{ height: '4px' }} />;
        })}
      </div>
    </div>
  );
}
