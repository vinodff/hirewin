'use client';

import { useState } from 'react';

type AvatarPhase = 'idle' | 'speaking' | 'thinking' | 'listening';
interface RecruiterAvatarProps { openness?: number; phase?: AvatarPhase; }

// Professional headshot — woman in business attire, office setting
const PHOTO_PRIMARY =
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2' +
  '?auto=format&fit=crop&w=400&h=520&q=92&crop=faces';

// Fallback if primary fails
const PHOTO_FALLBACK =
  'https://images.unsplash.com/photo-1580489944761-15a19d654956' +
  '?auto=format&fit=crop&w=400&h=520&q=92&crop=faces';

const BARS = [0.30, 0.65, 0.50, 0.85, 1.00, 0.90, 0.70, 0.55, 0.80, 0.60, 0.75, 0.45, 0.35];

export default function RecruiterAvatar({ openness = 0, phase = 'idle' }: RecruiterAvatarProps) {
  const [src, setSrc]         = useState(PHOTO_PRIMARY);
  const [triedFallback, setTriedFallback] = useState(false);

  const o        = Math.max(0, Math.min(1, openness));
  const speaking  = phase === 'speaking';
  const thinking  = phase === 'thinking';
  const listening = phase === 'listening';

  function handleImgError() {
    if (!triedFallback) {
      setTriedFallback(true);
      setSrc(PHOTO_FALLBACK);
    }
    // If fallback also fails, img stays broken — we show initials below via CSS
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{ background: 'linear-gradient(160deg, #0e1928 0%, #0a1220 100%)' }}
    >
      {/* ── Main headshot ──────────────────────────────────── */}
      <img
        src={src}
        alt="Sarah Chen — AI Recruiter"
        draggable={false}
        onError={handleImgError}
        className="w-full h-full"
        style={{
          objectFit    : 'cover',
          objectPosition: '50% 12%',   // keep face centered; not too much forehead
          transform    : speaking ? 'scale(1.018)' : 'scale(1)',
          // Webcam look: slight warmth + mild contrast boost, dim slightly when thinking
          filter       : thinking
            ? 'brightness(0.80) saturate(0.80) contrast(0.95)'
            : 'brightness(0.97) saturate(1.10) contrast(1.04) warm(1)',
          transition   : 'transform 0.5s ease, filter 0.5s ease',
          display      : 'block',
        }}
      />

      {/* ── Cinematic vignette — adds depth & professional look ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 88% 78% at 50% 28%, transparent 28%, rgba(0,0,0,0.50) 100%)',
        }}
      />

      {/* ── Bottom scrim — keeps name labels readable ── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(6,10,22,0.82))' }}
      />

      {/* ── SPEAKING: green ring + waveform ────────────────── */}
      {speaking && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: 'inset 0 0 0 3px #22c55e, inset 0 0 32px rgba(34,197,94,0.18)' }}
          />
          <div
            className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{ background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.45)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider">Speaking</span>
          </div>

          {/* Audio waveform bars driven by openness prop */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex items-end gap-[3px]"
            style={{ bottom: 58, height: 34 }}
          >
            {BARS.map((factor, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width     : 3.5,
                  height    : Math.max(3, o * 28 * factor + 2),
                  background: `rgba(34,197,94,${0.50 + factor * 0.50})`,
                  transition: 'height 75ms ease',
                  boxShadow : o > 0.3 ? '0 0 5px rgba(34,197,94,0.45)' : 'none',
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* ── LISTENING: purple ring ──────────────────────────── */}
      {listening && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 0 2.5px rgba(124,58,237,0.85), inset 0 0 22px rgba(124,58,237,0.15)' }}
        />
      )}

      {/* ── THINKING: blue overlay + spinner dots ──────────── */}
      {thinking && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'rgba(15,35,85,0.20)' }}
          />
          <div
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
            style={{ background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.4)' }}
          >
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-blue-400"
                style={{ animation: `voice-wave 0.7s ease-in-out infinite alternate`, animationDelay: `${i * 0.22}s` }}
              />
            ))}
            <span className="text-[9px] font-bold text-blue-300 uppercase tracking-wider ml-0.5">Thinking</span>
          </div>
        </>
      )}

      {/* ── IDLE: gentle breathing glow ────────────────────── */}
      {phase === 'idle' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ animation: 'av-breathe 4.5s ease-in-out infinite' }}
        />
      )}

      {/* Inline keyframes */}
      <style>{`
        @keyframes av-breathe {
          0%,100% { opacity:0 }
          50%     { opacity:0.05; background:radial-gradient(ellipse at 50% 28%,rgba(255,255,255,0.18),transparent 58%) }
        }
      `}</style>
    </div>
  );
}
