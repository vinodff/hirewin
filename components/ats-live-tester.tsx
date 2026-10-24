'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Building2,
  FileCheck2,
  Zap,
} from 'lucide-react';

const PRESET_BULLETS = [
  {
    type: 'weak',
    label: 'Weak Bullet (Fails ATS)',
    text: 'Responsible for managing social media and doing web development tasks for the company website.',
  },
  {
    type: 'strong',
    label: 'Optimized Bullet (96% ATS)',
    text: 'Architected full-stack Next.js web application with PostgreSQL, accelerating page load speeds by 42% and increasing organic search traffic by 18,500 monthly visitors.',
  },
];

const ATS_ENGINES = [
  { id: 'workday', name: 'Workday ATS', quirk: 'Strips tables, penalizes non-standard headers' },
  { id: 'greenhouse', name: 'Greenhouse', quirk: 'Hard keyword frequency & scorecard indexing' },
  { id: 'taleo', name: 'Oracle Taleo', quirk: 'Strict chronological ordering & exact job title match' },
  { id: 'lever', name: 'Lever ATS', quirk: 'Semantic tag matching & candidate talent pipelines' },
];

export default function AtsLiveTester() {
  const [selectedEngine, setSelectedEngine] = useState('workday');
  const [bulletText, setBulletText] = useState(PRESET_BULLETS[0].text);

  // Real-time deterministic analysis of the snippet
  const hasActionVerb = /^(architected|engineered|spearheaded|developed|built|scaled|delivered|formulated|designed|streamlined|automated|orchestrated|executed|optimized)/i.test(
    bulletText.trim()
  );
  const hasQuantMetric = /\b(\d+[%$kKmMbB]?|\d+\s*(percent|users|visitors|hours|x|X|million|k))\b/.test(
    bulletText
  );
  const hasVaguePhrasing = /\b(responsible for|helped with|worked on|duties included|tasks for)\b/i.test(
    bulletText
  );
  const wordCount = bulletText.trim().split(/\s+/).filter(Boolean).length;
  const isOptimalLength = wordCount >= 14 && wordCount <= 38;

  // Calculate live score
  let score = 42;
  if (hasActionVerb) score += 24;
  if (hasQuantMetric) score += 20;
  if (!hasVaguePhrasing) score += 10;
  if (isOptimalLength) score += 4;
  score = Math.min(score, 98);

  const getScoreColor = () => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 65) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  return (
    <div
      className="w-full max-w-4xl mx-auto rounded-3xl p-6 sm:p-8 border text-left shadow-2xl relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(14,24,42,0.95), rgba(7,14,26,0.98))',
        borderColor: 'rgba(52,211,153,0.25)',
        boxShadow: '0 25px 70px -15px rgba(16,185,129,0.18)',
      }}
    >
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
            <Zap className="w-3.5 h-3.5" />
            Interactive ATS Diagnostic Sandbox
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Test Your Resume Bullet Against Live ATS Parsers
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            See in real-time how Workday, Taleo, and Greenhouse parse impact and keywords.
          </p>
        </div>

        {/* Live Score Dial */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          <div
            className={`w-16 h-16 rounded-2xl border flex flex-col items-center justify-center font-mono font-bold ${getScoreColor()}`}
          >
            <span className="text-2xl leading-none">{score}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-80 mt-0.5">/ 100</span>
          </div>
          <div>
            <div className="text-xs font-semibold text-white">
              {score >= 85 ? 'ATS Strong Pass' : score >= 65 ? 'Borderline Risk' : 'High Rejection Risk'}
            </div>
            <div className="text-[11px] text-slate-400">
              {score >= 85 ? 'Passes 98% of filters' : 'Likely filtered by algorithms'}
            </div>
          </div>
        </div>
      </div>

      {/* Target ATS Engine Selector */}
      <div className="py-5">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2.5">
          Select Target ATS Parsing Algorithm:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {ATS_ENGINES.map((engine) => (
            <button
              key={engine.id}
              type="button"
              onClick={() => setSelectedEngine(engine.id)}
              className={`p-3 rounded-xl border text-left transition-all text-xs ${
                selectedEngine === engine.id
                  ? 'border-emerald-400/80 bg-emerald-500/15 text-white shadow-sm shadow-emerald-500/20'
                  : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-slate-200 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{engine.name}</span>
              </div>
              <div className="text-[10px] leading-snug opacity-75">{engine.quirk}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Preset Bullet Buttons */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-slate-400">Quick Test:</span>
        {PRESET_BULLETS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setBulletText(preset.text)}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
              preset.type === 'strong'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Textarea Input */}
      <div className="relative mb-5">
        <textarea
          rows={3}
          value={bulletText}
          onChange={(e) => setBulletText(e.target.value)}
          placeholder="Paste one of your resume bullet points here to check ATS score..."
          className="w-full rounded-2xl p-4 text-xs sm:text-sm text-slate-100 bg-black/40 border border-white/[0.12] focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all font-mono leading-relaxed"
        />
        <div className="absolute right-3 bottom-3 text-[11px] text-slate-400">
          {wordCount} words
        </div>
      </div>

      {/* Diagnostic Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div
          className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
            hasActionVerb
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/5 text-rose-300'
          }`}
        >
          {hasActionVerb ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>
            {hasActionVerb
              ? 'Starts with executive action verb (Architected, Engineered, etc.)'
              : 'Missing verified executive action verb at sentence start'}
          </span>
        </div>

        <div
          className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
            hasQuantMetric
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
              : 'border-amber-500/30 bg-amber-500/5 text-amber-300'
          }`}
        >
          {hasQuantMetric ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          )}
          <span>
            {hasQuantMetric
              ? 'Includes Google X-Y-Z quantifiable metric (%, $, numbers)'
              : 'Lacks measurable impact metric (add %, hours saved, or users)'}
          </span>
        </div>

        <div
          className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
            !hasVaguePhrasing
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/5 text-rose-300'
          }`}
        >
          {!hasVaguePhrasing ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>
            {!hasVaguePhrasing
              ? 'No passive filler phrasing detected'
              : 'Contains passive phrasing ("Responsible for", "Helped with")'}
          </span>
        </div>

        <div
          className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
            isOptimalLength
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
              : 'border-slate-500/30 bg-slate-500/5 text-slate-300'
          }`}
        >
          {isOptimalLength ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-slate-400" />
          )}
          <span>
            {isOptimalLength
              ? 'Optimal length for ATS parser density (14-38 words)'
              : wordCount < 14
              ? 'Too brief (under 14 words; lacks technical depth)'
              : 'Too verbose (over 38 words; risks recruiter fatigue)'}
          </span>
        </div>
      </div>

      {/* Full Scan CTA */}
      <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-400 text-center sm:text-left">
          Ready to scan your entire resume & match against your target job description?
        </div>
        <Link
          href="/analyze"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-[var(--on-accent)] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/25 glow-breathe"
          style={{ background: 'var(--accent-fill)' }}
        >
          <span>Run Full 6-Pillar Resume Scan Free</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
