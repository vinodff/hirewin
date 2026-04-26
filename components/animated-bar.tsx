'use client';
import { useEffect, useRef, useState } from 'react';

export default function AnimatedBar({
  value,
  color,
  delay = 0,
}: {
  value: number;
  color: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setWidth(value), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, delay]);

  return (
    <div
      ref={ref}
      className="h-1.5 rounded-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.06)' }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: color,
          transition: `width 1.1s cubic-bezier(0.22,1,0.36,1)`,
        }}
      />
    </div>
  );
}
