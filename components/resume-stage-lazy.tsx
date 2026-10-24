'use client';

import dynamic from 'next/dynamic';

// The 3D stage is loaded lazily so it never blocks the server-rendered
// headline and CTAs. The placeholder reserves the stage's space so the
// page does not shift when the stage loads. With JavaScript disabled the
// headline, CTAs and all other sections remain plain, working links.
const ResumeStage = dynamic(() => import('@/components/resume-stage'), {
  ssr: false,
  loading: () => (
    <div
      className="relative max-w-3xl mx-auto rounded-2xl"
      style={{ minHeight: 320, background: '#0d1526', border: '1px solid rgba(255,255,255,0.09)' }}
      aria-hidden="true"
    />
  ),
});

export default function ResumeStageLazy() {
  return <ResumeStage />;
}
