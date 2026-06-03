'use client';

import { useEffect, useRef } from 'react';

/**
 * Multi-layer cinematic background:
 *  - Deep gradient base
 *  - Animated aurora ribbons (CSS-only)
 *  - Floating geometric shapes
 *  - Cursor-following spotlight
 *  - Subtle grid pulse
 *
 * All layers are pointer-events:none and fixed so they never block UI.
 */
export default function CinematicBackground() {
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;

    function onMove(e: MouseEvent) {
      tx = e.clientX;
      ty = e.clientY;
    }

    function tick() {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      if (spotRef.current) {
        spotRef.current.style.transform = `translate(${cx - 300}px, ${cy - 300}px)`;
      }
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
      {/* Base gradient */}
      <div className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at top, #0e1530 0%, #080d1a 50%, #050810 100%)',
        }} />

      {/* Animated grid */}
      <div className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          animation: 'grid-drift 30s linear infinite',
        }} />

      {/* Aurora ribbons */}
      <div className="absolute inset-0">
        <div className="aurora aurora-1" />
        <div className="aurora aurora-2" />
        <div className="aurora aurora-3" />
      </div>

      {/* Floating shapes */}
      <div className="absolute inset-0">
        {[
          { size: 240, top: '12%', left: '8%',  hue: 'rgba(124,58,237,0.18)', delay: '0s',  dur: '22s' },
          { size: 180, top: '20%', right: '12%', hue: 'rgba(59,130,246,0.16)', delay: '-7s', dur: '26s' },
          { size: 320, bottom:'8%', left: '18%', hue: 'rgba(167,139,250,0.14)', delay: '-14s', dur: '28s' },
          { size: 200, bottom:'18%', right: '6%', hue: 'rgba(52,211,153,0.12)', delay: '-3s', dur: '24s' },
          { size: 150, top: '55%', left: '45%', hue: 'rgba(244,114,182,0.10)', delay: '-10s', dur: '32s' },
        ].map((s, i) => (
          <div key={i}
            className="absolute rounded-full blur-3xl"
            style={{
              width: s.size, height: s.size,
              ...s,
              background: `radial-gradient(circle, ${s.hue}, transparent 70%)`,
              animation: `float-drift ${s.dur} ease-in-out ${s.delay} infinite`,
              willChange: 'transform',
            }} />
        ))}
      </div>

      {/* Cursor-following spotlight */}
      <div ref={spotRef}
        className="absolute w-[600px] h-[600px] rounded-full will-change-transform"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.07), transparent 65%)',
          transform: 'translate(-9999px,-9999px)',
        }} />

      {/* Top vignette to keep nav readable */}
      <div className="absolute top-0 inset-x-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(8,13,26,0.5), transparent)' }} />

      {/* Noise overlay (premium texture) */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>")`,
        }} />
    </div>
  );
}
