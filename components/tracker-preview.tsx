import Link from 'next/link';
import { ArrowRight, Briefcase, Calendar, ClipboardList } from 'lucide-react';
import ScrollReveal from '@/components/scroll-reveal';

/**
 * TrackerPreview — (d) job-tracker preview.
 * Original kanban-style preview with abstract example companies/roles.
 * No real applications, no real user data. Links to the real /history
 * (job tracker) and /my-resumes.
 */
const COLUMNS: { title: string; accent: string; cards: { company: string; role: string; meta: string }[] }[] = [
  { title: 'Applied', accent: '#94a3b8', cards: [{ company: 'Acme Labs', role: 'Frontend Engineer', meta: 'Applied · 3 days ago' }, { company: 'Northwind', role: 'Full-stack Engineer', meta: 'Applied · 1 week ago' }] },
  { title: 'Interview', accent: '#3b82f6', cards: [{ company: 'Vertex Systems', role: 'Software Engineer', meta: 'Round 2 · This week' }] },
  { title: 'Offer', accent: '#34d399', cards: [{ company: 'Example Co', role: 'Product Engineer', meta: 'Offer received · Illustrative' }] },
];

export default function TrackerPreview() {
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <ScrollReveal className="text-center mb-10">
        <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-300 mb-5" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
          <ClipboardList className="w-4 h-4" /> Job tracker
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-[1.05] tracking-tight">
          Builder and tracker,<br className="hidden sm:block" /> <span className="gradient-text">in one place.</span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Don&apos;t lose track in spreadsheets. See every application, every
          interview, and every version of your resume — together.
        </p>
      </ScrollReveal>

      <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
        {COLUMNS.map((col, i) => (
          <ScrollReveal key={col.title} delay={i * 90}>
            <div className="rounded-2xl p-4 h-full" style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="flex items-center gap-2 text-sm font-bold text-white mb-4">
                <span className="w-2 h-2 rounded-full" style={{ background: col.accent }} /> {col.title}
                <span className="ml-auto text-xs font-medium text-slate-500">{col.cards.length}</span>
              </p>
              <div className="space-y-3">
                {col.cards.map((c) => (
                  <div key={c.company} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="flex items-center gap-2 text-sm font-bold text-white"><Briefcase className="w-4 h-4 text-slate-400 shrink-0" />{c.role}</p>
                    <p className="text-sm text-slate-400 mt-1">{c.company}</p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-2"><Calendar className="w-3.5 h-3.5" />{c.meta}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
      <p className="text-center text-xs text-slate-500 mt-6">Illustrative preview · Your tracker starts empty and fills as you apply.</p>
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <Link href="/history" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors hover:brightness-110" style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>Open job tracker <ArrowRight className="w-4 h-4" /></Link>
        <Link href="/my-resumes" className="inline-flex items-center gap-2 text-slate-200 font-semibold px-6 py-3 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>My resumes →</Link>
      </div>
    </section>
  );
}
