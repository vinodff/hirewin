'use client';

import { useState } from 'react';
import { Palette, Check, Layout, Columns, FileText, Briefcase, GraduationCap, Star } from 'lucide-react';

/* ── Template definitions ──────────────────── */
export type TemplateName = 'classic' | 'modern' | 'executive' | 'creative' | 'minimal' | 'two-column';

export type TemplateConfig = {
  name: TemplateName;
  label: string;
  icon: React.ReactNode;
  description: string;
  accentColor: string;
  fontFamily: string;
  headerAlign: 'center' | 'left';
  headerBg: string | null;
  headerTextColor: string;
  sectionTitleStyle: 'underline' | 'bg-band' | 'left-accent' | 'capsule' | 'minimal' | 'side-label';
  sectionTitleColor: string;
  bodyFont: string;
  bodySize: string;
  lineHeight: string;
  layout: 'single' | 'two-column';
  paperBg: string;
  paperShadow: string;
  accentBorder: string;
};

export const TEMPLATES: Record<TemplateName, TemplateConfig> = {
  classic: {
    name: 'classic',
    label: 'Classic',
    icon: <FileText className="w-4 h-4" />,
    description: 'Traditional ATS-friendly format',
    accentColor: '#1a1a1a',
    fontFamily: '"Times New Roman", Georgia, serif',
    headerAlign: 'center',
    headerBg: null,
    headerTextColor: '#111827',
    sectionTitleStyle: 'underline',
    sectionTitleColor: '#111827',
    bodyFont: '"Times New Roman", Georgia, serif',
    bodySize: '11.5px',
    lineHeight: '1.55',
    layout: 'single',
    paperBg: '#ffffff',
    paperShadow: '0 10px 30px rgba(0,0,0,0.4)',
    accentBorder: '#cccccc',
  },
  modern: {
    name: 'modern',
    label: 'Modern',
    icon: <Layout className="w-4 h-4" />,
    description: 'Clean, contemporary design',
    accentColor: '#7c3aed',
    fontFamily: '"Calibri", "Segoe UI", Arial, sans-serif',
    headerAlign: 'left',
    headerBg: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
    headerTextColor: '#ffffff',
    sectionTitleStyle: 'left-accent',
    sectionTitleColor: '#7c3aed',
    bodyFont: '"Calibri", "Segoe UI", Arial, sans-serif',
    bodySize: '11.5px',
    lineHeight: '1.55',
    layout: 'single',
    paperBg: '#ffffff',
    paperShadow: '0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,58,237,0.15)',
    accentBorder: '#7c3aed',
  },
  executive: {
    name: 'executive',
    label: 'Executive',
    icon: <Briefcase className="w-4 h-4" />,
    description: 'Refined, senior-level appearance',
    accentColor: '#0f4c81',
    fontFamily: '"Georgia", "Palatino", serif',
    headerAlign: 'center',
    headerBg: '#0f2237',
    headerTextColor: '#ffffff',
    sectionTitleStyle: 'bg-band',
    sectionTitleColor: '#0f4c81',
    bodyFont: '"Georgia", "Palatino", serif',
    bodySize: '11px',
    lineHeight: '1.6',
    layout: 'single',
    paperBg: '#ffffff',
    paperShadow: '0 10px 30px rgba(0,0,0,0.4)',
    accentBorder: '#0f4c81',
  },
  creative: {
    name: 'creative',
    label: 'Creative',
    icon: <Star className="w-4 h-4" />,
    description: 'Bold, standout template',
    accentColor: '#e11d48',
    fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    headerAlign: 'left',
    headerBg: 'linear-gradient(135deg, #e11d48, #f97316)',
    headerTextColor: '#ffffff',
    sectionTitleStyle: 'capsule',
    sectionTitleColor: '#e11d48',
    bodyFont: '"Inter", "Helvetica Neue", sans-serif',
    bodySize: '11px',
    lineHeight: '1.6',
    layout: 'single',
    paperBg: '#ffffff',
    paperShadow: '0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(225,29,72,0.15)',
    accentBorder: '#e11d48',
  },
  minimal: {
    name: 'minimal',
    label: 'Minimal',
    icon: <GraduationCap className="w-4 h-4" />,
    description: 'Ultra-clean, whitespace-focused',
    accentColor: '#374151',
    fontFamily: '"Helvetica Neue", Arial, sans-serif',
    headerAlign: 'left',
    headerBg: null,
    headerTextColor: '#111827',
    sectionTitleStyle: 'minimal',
    sectionTitleColor: '#374151',
    bodyFont: '"Helvetica Neue", Arial, sans-serif',
    bodySize: '11px',
    lineHeight: '1.65',
    layout: 'single',
    paperBg: '#ffffff',
    paperShadow: '0 10px 30px rgba(0,0,0,0.3)',
    accentBorder: '#e5e7eb',
  },
  'two-column': {
    name: 'two-column',
    label: 'Two Column',
    icon: <Columns className="w-4 h-4" />,
    description: 'Side panel with skills & contact',
    accentColor: '#059669',
    fontFamily: '"Segoe UI", "Roboto", sans-serif',
    headerAlign: 'left',
    headerBg: '#064e3b',
    headerTextColor: '#ffffff',
    sectionTitleStyle: 'left-accent',
    sectionTitleColor: '#059669',
    bodyFont: '"Segoe UI", "Roboto", sans-serif',
    bodySize: '10.5px',
    lineHeight: '1.55',
    layout: 'two-column',
    paperBg: '#ffffff',
    paperShadow: '0 10px 30px rgba(0,0,0,0.4)',
    accentBorder: '#059669',
  },
};

/* ── Template Selector Component ───────────── */
type Props = {
  selected: TemplateName;
  onSelect: (name: TemplateName) => void;
};

export default function TemplateSelector({ selected, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);

  const templateList = Object.values(TEMPLATES);

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-purple-400" />
          <h3 className="font-semibold text-white">Resume Template</h3>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {expanded ? 'Collapse' : 'View all'}
        </button>
      </div>

      {/* Quick selector (always visible) */}
      <div className="flex gap-2 flex-wrap">
        {templateList.map((tpl) => (
          <button
            key={tpl.name}
            onClick={() => onSelect(tpl.name)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={
              selected === tpl.name
                ? {
                    background: `linear-gradient(135deg, ${tpl.accentColor}20, ${tpl.accentColor}10)`,
                    border: `1px solid ${tpl.accentColor}60`,
                    color: '#ffffff',
                    boxShadow: `0 0 20px ${tpl.accentColor}15`,
                  }
                : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#94a3b8',
                  }
            }
          >
            {tpl.icon}
            {tpl.label}
            {selected === tpl.name && <Check className="w-3 h-3 text-green-400" />}
          </button>
        ))}
      </div>

      {/* Expanded view with previews */}
      {expanded && (
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in">
          {templateList.map((tpl) => (
            <button
              key={tpl.name}
              onClick={() => onSelect(tpl.name)}
              className="group relative rounded-xl overflow-hidden transition-all text-left"
              style={{
                border:
                  selected === tpl.name
                    ? `2px solid ${tpl.accentColor}`
                    : '2px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Mini preview */}
              <div
                className="aspect-[8.5/5] p-3 flex flex-col"
                style={{ background: tpl.paperBg }}
              >
                {/* Header preview */}
                <div
                  className="rounded-sm px-2 py-1 mb-1.5"
                  style={{
                    background: tpl.headerBg || 'transparent',
                    textAlign: tpl.headerAlign,
                  }}
                >
                  <div
                    className="h-2 rounded-full w-16 mx-auto"
                    style={{
                      background: tpl.headerBg
                        ? 'rgba(255,255,255,0.6)'
                        : tpl.headerTextColor,
                      ...(tpl.headerAlign === 'left'
                        ? { marginLeft: 0 }
                        : {}),
                    }}
                  />
                </div>
                {/* Section title preview */}
                <div className="flex items-center gap-1 mt-1">
                  {tpl.sectionTitleStyle === 'left-accent' && (
                    <div
                      className="w-0.5 h-2 rounded-full"
                      style={{ background: tpl.accentColor }}
                    />
                  )}
                  <div
                    className="h-1.5 rounded-full w-12"
                    style={{
                      background:
                        tpl.sectionTitleStyle === 'bg-band'
                          ? `${tpl.accentColor}20`
                          : tpl.sectionTitleColor,
                      ...(tpl.sectionTitleStyle === 'capsule'
                        ? {
                            background: `${tpl.accentColor}15`,
                            border: `1px solid ${tpl.accentColor}30`,
                            padding: '1px 4px',
                          }
                        : {}),
                    }}
                  />
                </div>
                {/* Content preview lines */}
                {[0.85, 0.7, 0.9, 0.6].map((w, i) => (
                  <div
                    key={i}
                    className="h-1 rounded-full mt-1"
                    style={{
                      background: '#e5e7eb',
                      width: `${w * 100}%`,
                    }}
                  />
                ))}
              </div>

              {/* Label */}
              <div className="px-3 py-2.5" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  {tpl.icon}
                  {tpl.label}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{tpl.description}</div>
              </div>

              {/* Selected badge */}
              {selected === tpl.name && (
                <div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: tpl.accentColor }}
                >
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
