import Link from 'next/link';

/**
 * HowItWorks — replaces the unsourced testimonial marquee with a
 * straightforward, sourced-free explanation of the product. No counts,
 * no ratings, no quoted users. Each step links to the real /analyze flow.
 */
const STEPS = [
  {
    n: '1',
    title: 'Upload your resume',
    desc: 'Paste your resume or upload a PDF. No sign-up wall for the preview.',
  },
  {
    n: '2',
    title: 'Get a JD-matched rewrite',
    desc: 'HireWin reads the job description and rewrites your experience with real numbers and keywords.',
  },
  {
    n: '3',
    title: 'Download a trust-scored resume',
    desc: 'Every claim is checked against your original resume before you download.',
  },
];

export default function HowItWorks() {
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">How it works.</h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Three steps, in about twenty seconds for the preview.
        </p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
        {STEPS.map((step) => (
          <Link
            key={step.n}
            href="/analyze"
            className="rounded-2xl p-6 transition-colors hover:bg-white/[0.03]"
            style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <span className="inline-flex w-8 h-8 items-center justify-center rounded-full text-sm font-bold text-purple-300 mb-4"
              style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
              {step.n}
            </span>
            <h3 className="text-base font-bold text-white mb-1.5">{step.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
