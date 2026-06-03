'use client';

import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import type { SkillEvidence, InterviewRisk, EvidenceConfidence } from '@/types';

type Props = {
  trustScore?: number;
  skillEvidence?: SkillEvidence[];
  interviewRisks?: InterviewRisk[];
};

const CONFIDENCE_CFG: Record<EvidenceConfidence, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  high:          { label: 'Verified',  color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.3)',  icon: CheckCircle2 },
  medium:        { label: 'Partial',   color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)',  icon: HelpCircle },
  low:           { label: 'Weak',      color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.3)',  icon: HelpCircle },
  claimed_only:  { label: 'Unverified', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', icon: AlertTriangle },
};

function trustColor(score: number) {
  if (score >= 85) return { color: '#34d399', label: 'High trust' };
  if (score >= 70) return { color: '#fbbf24', label: 'Good trust' };
  if (score >= 50) return { color: '#fb923c', label: 'Moderate' };
  return { color: '#f87171', label: 'Low trust' };
}

export default function TrustPanel({ trustScore, skillEvidence, interviewRisks }: Props) {
  const hasEvidence = skillEvidence && skillEvidence.length > 0;
  const hasRisks = interviewRisks && interviewRisks.length > 0;
  const hasScore = typeof trustScore === 'number';

  if (!hasEvidence && !hasRisks && !hasScore) return null;

  const trust = hasScore ? trustColor(trustScore!) : null;

  return (
    <div className="rounded-2xl p-6"
      style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Header with trust score */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Trust & Evidence</h3>
        </div>
        {hasScore && trust && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{trust.label}</span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg"
              style={{ background: `${trust.color}15`, border: `1px solid ${trust.color}40` }}>
              <span className="text-lg font-extrabold" style={{ color: trust.color }}>{trustScore}</span>
              <span className="text-xs font-medium" style={{ color: trust.color }}>/100</span>
            </div>
          </div>
        )}
      </div>

      {/* Trust score explainer */}
      {hasScore && (
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          How well your optimized resume's claims are backed by your original. Higher = safer in interviews.
        </p>
      )}

      {/* Evidence map */}
      {hasEvidence && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Skill evidence map</p>
          <div className="space-y-2">
            {skillEvidence!.map((e, i) => {
              const cfg = CONFIDENCE_CFG[e.confidence];
              const Icon = cfg.icon;
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{e.skill}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{e.evidence}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interview risks */}
      {hasRisks && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Interview risk alerts</p>
          </div>
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}>
            {interviewRisks!.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-amber-200">{r.skill}</span>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{r.reason}</p>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-slate-600 italic pt-2 border-t border-amber-500/10">
              Prepare a short story or example for each before applying.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
