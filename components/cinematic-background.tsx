'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Dynamic, GPU-accelerated cinematic background substrate:
 *  - Deep dark obsidian/slate base (#080C0F)
 *  - Dynamic floating ambient light beams (smooth CSS transforms)
 *  - Subtle technical grid with periodic scanning radar sweep
 *  - Interactive mouse spotlight for desktop (disabled on touch)
 *  - Tactile film grain overlay
 *
 * All layers are pointer-events:none and hardware-accelerated.
 */
export default function CinematicBackground() {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run mouse spotlight on pointer-capable devices
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) {
      return;
    }

    let rafId = 0;
    let targetX = -999;
    let targetY = -999;
    let currentX = -999;
    let currentY = -999;

    function handleMouseMove(e: MouseEvent) {
      targetX = e.clientX;
      targetY = e.clientY;
    }

    function animateSpotlight() {
      if (targetX !== -999) {
        // Smooth lerp (linear interpolation)
        currentX += (targetX - currentX) * 0.08;
        currentY += (targetY - currentY) * 0.08;

        if (spotlightRef.current) {
          spotlightRef.current.style.transform = `translate3d(${currentX - 350}px, ${currentY - 350}px, 0)`;
        }
      }
      rafId = requestAnimationFrame(animateSpotlight);
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    rafId = requestAnimationFrame(animateSpotlight);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
      {/* ── 1 · Base Deep Ground ──────────────────────────────────────── */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 100% 70% at 50% 0%, #0D1620 0%, var(--ground) 60%, #05080B 100%)',
        }} 
      />

      {/* ── 2 · Dynamic Floating Ambient Light Beams (CSS Keyframes) ─── */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary Emerald Aurora Orb */}
        <div 
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[120px] opacity-25 animate-drift-slow"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.28) 0%, rgba(5, 150, 105, 0.12) 50%, transparent 75%)',
            willChange: 'transform',
          }}
        />

        {/* Secondary Deep Cyan Beam */}
        <div 
          className="absolute top-10 -right-40 w-[550px] h-[550px] rounded-full blur-[130px] opacity-20 animate-drift-reverse"
          style={{
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.24) 0%, rgba(56, 189, 248, 0.10) 50%, transparent 75%)',
            willChange: 'transform',
          }}
        />

        {/* Tertiary Subtle Teal Core */}
        <div 
          className="absolute top-[45%] left-[25%] w-[480px] h-[480px] rounded-full blur-[140px] opacity-15 animate-pulse-slow"
          style={{
            background: 'radial-gradient(circle, rgba(20, 184, 166, 0.20) 0%, transparent 70%)',
            willChange: 'transform, opacity',
          }}
        />
      </div>

      {/* ── 3 · Architectural Fine Hairline Grid ──────────────────────── */}
      <div 
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 85%)',
        }} 
      />

      {/* ── 4 · Technical Radar Scanner Beam ──────────────────────────── */}
      <div 
        className="absolute inset-x-0 h-40 opacity-20 animate-scan-sweep pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(16, 185, 129, 0.08) 50%, rgba(52, 211, 153, 0.18) 98%, #10B981 100%)',
          maskImage: 'linear-gradient(90deg, transparent 5%, black 50%, transparent 95%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent 5%, black 50%, transparent 95%)',
        }}
      />

      {/* ── 5 · Interactive Desktop Cursor Spotlight ─────────────────── */}
      <div 
        ref={spotlightRef}
        className="absolute w-[700px] h-[700px] rounded-full pointer-events-none hidden md:block"
        style={{
          background: 'radial-gradient(circle 350px at center, rgba(16, 185, 129, 0.07) 0%, rgba(14, 165, 233, 0.03) 40%, transparent 70%)',
          transform: 'translate3d(-9999px, -9999px, 0)',
          willChange: 'transform',
        }}
      />

      {/* ── 6 · Top Vignette for Nav Contrast ─────────────────────────── */}
      <div 
        className="absolute top-0 inset-x-0 h-28 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(8,12,15,0.85) 0%, transparent 100%)' }} 
      />

      {/* ── 7 · Subtle Tactile Noise Grain ───────────────────────────── */}
      <div 
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>")`,
        }} 
      />
    </div>
  );
}
