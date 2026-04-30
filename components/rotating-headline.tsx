'use client';

import { useEffect, useState } from 'react';

type Props = {
  words: string[];
  intervalMs?: number;
};

export default function RotatingHeadline({ words, intervalMs = 2400 }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % words.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  const widest = words.reduce((a, b) => (a.length > b.length ? a : b), '');

  return (
    <span className="relative inline-block align-baseline">
      {/* Invisible sizer keeps the layout stable as the word changes */}
      <span aria-hidden className="invisible">{widest}</span>
      <span
        key={idx}
        className="absolute inset-0 gradient-text-animated rotate-word-in whitespace-nowrap"
      >
        {words[idx]}
      </span>
    </span>
  );
}
