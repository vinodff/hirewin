'use client';

import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Eye, AlertTriangle, Gauge, CheckCircle2, XCircle } from 'lucide-react';

type Pillar = {
  icon: typeof ShieldCheck;
  tag: string;
  title: string;
  desc: string;
  color: string;
  others: string;
  hirewin: string;
};

const PILLARS: Pillar[] = [
  {
    icon: ShieldCheck,
    tag: 'Trust Score',
    title: 'We score how truthful your resume is.',
    desc: 'Every claim is cross-checked against your original resume. If something is inflated, we flag it before a recruiter does.',
    color: '#a78bfa',
    others: 'Keyword stuffing. Adds skills you can\'t defend.',
    hirewin: 'Honesty-graded. 0–100 trust score on every export.',
  },
  {
    icon: Eye,
    tag: 'Evidence Map',
    title: 'Every skill is backed by proof.',
    desc: 'We link each technical skill to the exact project, internship, or coursework that proves it — labeled Verified, Partial, Weak, or Unverified.',
    color: '#60a5fa',
    others: 'Lists 30 skills with no proof. Recruiters spot it.',
    hirewin: 'Each skill tagged with its real evidence source.',
  },
  {
    icon: AlertTriangle,
    tag: 'Interview Risk',
    title: 'We tell you what they\'ll probe in the interview.',
    desc: 'Before you apply, we flag claims a recruiter could expose. You walk into the interview prepared, not blindsided.',
    color: '#fbbf24',
    others: 'Generates resume. Walks away.',
    hirewin: 'Warns you about risky claims. Tells you what to prep.',
  },
  {
    icon: Gauge,
    tag: 'ATS + Recruiter Brain',
    title: 'Optimized for bots AND humans.',
    desc: 'Other tools chase ATS scores and produce robotic resumes. We balance keyword density with recruiter psychology — the resume that gets past the filter and the human.',
    color: '#34d399',
    others: 'Pure keyword stuffing. Reads like spam.',
    hirewin: 'ATS-optimized but human-readable. Real impact.',
  },
];

function PillarCard({ pillar, index }: { pillar: Pillar; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0, rootMargin: '0px 0px -10% 0px' }
    );
    io.observe(el);
    const fallback = setTimeout(() => setVisible(true), 800);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, []);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    setTilt({ x: -y * 6, y: x * 6 });
  }

  function reset() { setTilt({ x: 0, y: 0 }); }

  const Icon = pillar.icon;

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className="group relative will-change-transform"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(0)`
          : 'perspective(1200px) translateY(40px)',
        transition: 'opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.4s cubic-bezier(0.22,1,0.36,1)',
        transitionDelay: visible ? `${index * 100}ms` : '0ms',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Glow halo */}
      <div className="absolute -inset-px rounded-3xl opacity-40 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-xl"
        style={{ background: `radial-gradient(ellipse at center, ${pillar.color}40, transparent 70%)` }} />

      {/* Card */}
      <div className="relative rounded-3xl overflow-hidden h-full"
        style={{
          background: 'linear-gradient(145deg, #0e1530, #0a1020)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: `0 30px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}>

        {/* Premium gradient top stripe */}
        <div className="absolute top-0 inset-x-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${pillar.color}80, transparent)` }} />

        <div className="p-6 sm:p-8" style={{ transform: 'translateZ(40px)' }}>
          {/* Tag */}
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md mb-5"
            style={{
              background: `${pillar.color}12`,
              border: `1px solid ${pillar.color}30`,
              color: pillar.color,
            }}>
            <Icon className="w-3 h-3" />
            {pillar.tag}
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-tight mb-3">
            {pillar.title}
          </h3>

          {/* Desc */}
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            {pillar.desc}
          </p>

          {/* Comparison strip */}
          <div className="space-y-2 pt-4 border-t border-white/5">
            <div className="flex items-start gap-2.5">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400/70" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400/80">Others</span>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{pillar.others}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: pillar.color }} />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: pillar.color }}>HireWin</span>
                <p className="text-xs text-slate-300 mt-0.5 leading-snug font-medium">{pillar.hirewin}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Soft inner glow on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top, ${pillar.color}10, transparent 60%)` }} />
      </div>
    </div>
  );
}

export default function WhyDifferent() {
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-28">
      {/* Section heading */}
      <div className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-400 mb-5"
          style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
          <ShieldCheck className="w-3.5 h-3.5" />
          Built differently
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-white mb-5 leading-[1.05] tracking-tight">
          Every AI writes a resume.<br className="hidden sm:block" />
          <span className="gradient-text">Only HireWin proves it&apos;s yours.</span>
        </h2>
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Other tools keyword-stuff and inflate. <span className="text-white font-semibold">HireWin verifies every claim
          against your real experience</span> — so you walk into interviews confident, not caught out.
        </p>
      </div>

      {/* 3D card grid */}
      <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
        {PILLARS.map((p, i) => (
          <PillarCard key={p.tag} pillar={p} index={i} />
        ))}
      </div>
    </section>
  );
}
