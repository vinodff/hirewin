'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ShieldAlert, Sparkles, Video, Send, Lock, ArrowRight,
  CheckCircle2, ChevronRight, Award
} from 'lucide-react';
import type { InterviewRisk } from '@/types';
import UnlockModal from '@/components/unlock-modal';

// Lazy-load interactive pro modules
const TrustPanel = dynamic(() => import('@/components/trust-panel'), { ssr: false });
const SelfDescription = dynamic(() => import('@/components/self-description'), { ssr: false });
const VoiceInterview = dynamic(() => import('@/components/voice-interview'), { ssr: false });
const OutreachSection = dynamic(() => import('@/components/outreach-section'), { ssr: false });

type ProTab = 'risks' | 'intro' | 'interview' | 'outreach';

type Props = {
  isPaid: boolean;
  resumeText: string;
  role: string;
  company: string;
  jdText?: string;
  interviewRisks?: InterviewRisk[];
  versionId?: string;
  beforeScore?: number;
  afterScore?: number;
};

export default function ProToolkit({
  isPaid,
  resumeText,
  role,
  company,
  jdText,
  interviewRisks,
  versionId,
  beforeScore,
  afterScore,
}: Props) {
  const [activeTab, setActiveTab] = useState<ProTab>('intro');
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  // If user is on the free tier, show the clean, minimized, high-converting Pro preview
  if (!isPaid) {
    return (
      <>
        <div
          className="rounded-2xl p-6 sm:p-7 relative overflow-hidden transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(var(--surface-rgb, 15, 23, 42), 0.95), rgba(var(--surface-rgb, 15, 23, 42), 0.85))',
            border: '1px solid rgba(var(--accent-rgb), 0.25)',
            boxShadow: '0 8px 32px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Subtle decorative glow */}
          <div
            className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none blur-3xl opacity-20"
            style={{ background: 'radial-gradient(circle, var(--accent-fill) 0%, transparent 70%)' }}
          />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-accent-300 bg-accent-500/10 border border-accent-500/20 mb-2">
                <Lock className="w-3 h-3" />
                <span>PRO CAREER SUITE</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Interview Preparation & Outreach Toolkit
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Take your application beyond ATS scoring. Unlock 4 AI tools built specifically for your interview with {company}.
              </p>
            </div>

            <button
              onClick={() => setShowUnlockModal(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-[var(--on-accent)] bg-gradient-to-r from-accent-500 to-indigo-600 hover:opacity-95 active:scale-[0.98] transition-all shrink-0 shadow-lg shadow-accent-500/25"
            >
              Unlock Pro Suite (₹19)
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 4 Minimized Locked Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-10">
            {/* 1. Interview Risk Alerts */}
            <div
              onClick={() => setShowUnlockModal(true)}
              className="group p-4 rounded-xl cursor-pointer transition-all hover:border-amber-500/40 hover:bg-amber-500/5 relative"
              style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)' }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                    Interview Risk Alerts
                  </h3>
                </div>
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  <Lock className="w-2.5 h-2.5" /> Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Flags potential background gaps or role pivots interviewers probe on, complete with strategic answers.
              </p>
            </div>

            {/* 2. Self-Introduction Generator */}
            <div
              onClick={() => setShowUnlockModal(true)}
              className="group p-4 rounded-xl cursor-pointer transition-all hover:border-accent-500/40 hover:bg-accent-500/5 relative"
              style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)' }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent-500/10 border border-accent-500/20 text-accent-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-accent-300 transition-colors">
                    Self-Introduction Generator
                  </h3>
                </div>
                <span className="flex items-center gap-1 text-[11px] font-medium text-accent-400/90 bg-accent-500/10 px-2 py-0.5 rounded-md border border-accent-500/20">
                  <Lock className="w-2.5 h-2.5" /> Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Get 3 tailored answers to &quot;Tell me about yourself&quot; — a 30s pitch, full 2-min answer, and casual tone.
              </p>
            </div>

            {/* 3. Live AI Mock Interview */}
            <div
              onClick={() => setShowUnlockModal(true)}
              className="group p-4 rounded-xl cursor-pointer transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5 relative"
              style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)' }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Video className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                    HireWin Live Mock Interview
                  </h3>
                </div>
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <Lock className="w-2.5 h-2.5" /> Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Practice in a voice simulation with AI recruiter Sarah Chen and receive a comprehensive scorecard.
              </p>
            </div>

            {/* 4. Cold Outreach Drafts */}
            <div
              onClick={() => setShowUnlockModal(true)}
              className="group p-4 rounded-xl cursor-pointer transition-all hover:border-blue-500/40 hover:bg-blue-500/5 relative"
              style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)' }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <Send className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                    Personalized Cold Outreach
                  </h3>
                </div>
                <span className="flex items-center gap-1 text-[11px] font-medium text-blue-400/90 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                  <Lock className="w-2.5 h-2.5" /> Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate 1-click personalized cold emails and LinkedIn connection notes crafted to the hiring team.
              </p>
            </div>
          </div>

          {/* Bottom assurance footer */}
          <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 relative z-10">
            <span className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Includes 3 HD resume downloads (PDF + DOCX) + all 4 pro interview modules
            </span>
            <button
              onClick={() => setShowUnlockModal(true)}
              className="text-accent-400 hover:text-accent-300 font-semibold transition-colors flex items-center gap-1"
            >
              See pricing options →
            </button>
          </div>
        </div>

        {showUnlockModal && (
          <UnlockModal
            onClose={() => setShowUnlockModal(false)}
            beforeScore={beforeScore}
            afterScore={afterScore}
          />
        )}
      </>
    );
  }

  // If user is a Paid subscriber, render the clean tabbed toolkit
  return (
    <div
      className="rounded-2xl p-6 relative overflow-hidden transition-all space-y-5"
      style={{
        background: 'var(--surface)',
        border: '1px solid rgba(var(--accent-rgb), 0.25)',
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 mb-1.5">
            <Award className="w-3 h-3" />
            <span>PRO UNLOCKED</span>
          </div>
          <h2 className="text-xl font-bold text-white">Career Acceleration Toolkit</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Prepare for your interview at {company} using your optimized resume.
          </p>
        </div>
      </div>

      {/* Clean Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/5">
        {[
          { key: 'intro' as const, label: 'Self-Introduction', icon: Sparkles },
          { key: 'interview' as const, label: 'Mock Interview (Sarah)', icon: Video },
          { key: 'risks' as const, label: 'Interview Risks', icon: ShieldAlert },
          { key: 'outreach' as const, label: 'Cold Outreach', icon: Send },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0"
            style={activeTab === key
              ? { background: 'var(--accent-fill)', color: 'var(--on-accent)' }
              : { background: 'rgba(255, 255, 255, 0.04)', color: '#94a3b8' }}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <div className="pt-2">
        {activeTab === 'intro' && (
          <SelfDescription
            resumeText={resumeText}
            role={role}
            company={company}
            jdText={jdText}
          />
        )}

        {activeTab === 'interview' && (
          <VoiceInterview
            resumeText={resumeText}
            role={role}
            company={company}
            jdText={jdText}
            versionId={versionId}
          />
        )}

        {activeTab === 'risks' && (
          <div>
            {interviewRisks && interviewRisks.length > 0 ? (
              <TrustPanel
                variant="risks"
                interviewRisks={interviewRisks}
              />
            ) : (
              <div className="rounded-xl p-6 text-center bg-white/5 border border-white/5 text-slate-400 text-sm">
                No high-risk background anomalies were flagged for this role. Your experience aligns solidly with the job requirements!
              </div>
            )}
          </div>
        )}

        {activeTab === 'outreach' && (
          <OutreachSection
            optimizedResume={resumeText}
            role={role}
            company={company}
            jdText={jdText}
          />
        )}
      </div>
    </div>
  );
}
