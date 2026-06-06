import Link from 'next/link';
import { Target, Zap, Shield, Heart } from 'lucide-react';
import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';

export const metadata = { title: 'About – HireWin' };

const values = [
  {
    icon: Target,
    title: 'Built for Jobseekers',
    desc: 'Every feature is designed around one goal — helping you land more interviews. Not a generic AI tool, but a focused career tool.',
    color: '#a78bfa',
  },
  {
    icon: Shield,
    title: 'Honest AI',
    desc: 'We never invent fake experience. HireWin only rewrites and reframes what is already yours — keeping your resume truthful and defensible in an interview.',
    color: '#34d399',
  },
  {
    icon: Zap,
    title: 'Speed & Simplicity',
    desc: '~20 seconds to a fully optimized resume. No complex forms, no jargon. Paste, optimize, download.',
    color: '#60a5fa',
  },
  {
    icon: Heart,
    title: 'Free to Preview',
    desc: 'You should be able to see exactly what you\'re getting before paying. That\'s why optimization and preview are always free.',
    color: '#f472b6',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="flex-1">
        {/* Hero */}
        <div className="max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-300 mb-6"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}
          >
            Our Story
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            We built HireWin because<br />
            <span style={{ background: 'linear-gradient(135deg,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              great candidates were losing to bad resumes.
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Most ATS systems reject 75% of resumes before a human ever sees them — not because the candidate is unqualified, but because the resume isn&rsquo;t formatted or worded for the job. HireWin fixes that in seconds.
          </p>
        </div>

        {/* Mission */}
        <div className="max-w-3xl mx-auto px-4 pb-16">
          <div
            className="rounded-2xl p-8 mb-10"
            style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h2 className="text-xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-slate-400 leading-relaxed">
              We believe every skilled professional deserves a fair shot at the jobs they want. The job market is competitive, and the hiring process is imperfect — but your resume shouldn&rsquo;t be the reason you&rsquo;re not getting interviews.
            </p>
            <p className="text-slate-400 leading-relaxed mt-3">
              HireWin uses AI to analyze job descriptions, identify exactly what recruiters and ATS systems are looking for, and rewrite your resume to match — while keeping everything truthful and authentically yours.
            </p>
          </div>

          {/* Values */}
          <h2 className="text-xl font-bold text-white mb-6">What We Stand For</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {values.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="rounded-2xl p-6"
                style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="font-bold text-white text-sm mb-2">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div
            className="rounded-2xl p-8 mb-10"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(59,130,246,0.08))',
              border: '1px solid rgba(124,58,237,0.2)',
            }}
          >
            <div className="grid grid-cols-3 gap-6 text-center">
              {[
                { value: '4,000+', label: 'Resumes Optimized' },
                { value: '4.8★',  label: 'Average Rating' },
                { value: '~20s',  label: 'Avg. Optimization Time' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white mb-1">{value}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h2 className="text-xl font-bold text-white mb-3">Get in Touch</h2>
            <p className="text-sm text-slate-400 mb-5 max-w-sm mx-auto">
              Have feedback, a feature request, or just want to say hi? We&rsquo;d love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
              >
                Contact Us
              </Link>
              <a
                href="mailto:support@hirewin.live"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-slate-300 transition-all hover:text-white"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                support@hirewin.live
              </a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
