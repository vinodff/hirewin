/**
 * CalmDepth — static, professional page depth.
 *
 * Replaces CinematicBackground's perpetual requestAnimationFrame loop,
 * aurora ribbons, floating shapes and cursor spotlight with a single
 * static layer: a very subtle top radial wash and a faint hairline grid.
 * No JavaScript, no animation, no scroll listener — it costs nothing
 * after first paint and never moves while the user reads.
 */
export default function CalmDepth() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124,58,237,0.10) 0%, rgba(8,13,26,0) 60%), #080d1a',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
        }}
      />
      <div
        className="absolute top-0 inset-x-0 h-24"
        style={{ background: 'linear-gradient(180deg, rgba(8,13,26,0.6), transparent)' }}
      />
    </div>
  );
}
