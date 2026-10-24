'use client';

import dynamic from 'next/dynamic';

// Scroll story is enhancement only: hero text and CTAs are server-rendered
// above it, and this placeholder reserves space so the page does not shift
// when the scroll code loads. Without JS, hero and all sections remain
// plain, working links.
const ScrollStory = dynamic(() => import('@/components/scroll-story'), {
  ssr: false,
  loading: () => (
    <div
      className="relative max-w-3xl mx-auto rounded-2xl mx-4 sm:mx-auto"
      style={{ minHeight: 340, background: '#0d1526', border: '1px solid rgba(255,255,255,0.09)' }}
      aria-hidden="true"
    />
  ),
});

export default function ScrollStoryLazy() {
  return <ScrollStory />;
}
