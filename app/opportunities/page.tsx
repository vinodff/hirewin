import type { Metadata } from 'next';
import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';
import OpportunityBrowser from '@/components/opportunity-browser';
import { getMergedFeed } from '@/lib/opportunities';

export const metadata: Metadata = {
  title: 'Opportunities — HireWin',
  description:
    'Curated internships, new-grad roles, and hackathons at product and service companies. Comp and deadlines up front, updated hourly.',
};

export default async function OpportunitiesPage() {
  const { opportunities, isStale, agentCount } = await getMergedFeed();
  const companies = new Set(opportunities.map((o) => o.company)).size;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ground)' }}>
      <AppNav />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight" style={{ color: 'var(--fg)' }}>
            Opportunities
          </h1>
          <p className="mt-2 text-sm max-w-xl" style={{ color: 'var(--dim)' }}>
            <span className="font-data" style={{ color: 'var(--fg)' }}>{opportunities.length}</span> openings across{' '}
            <span className="font-data" style={{ color: 'var(--fg)' }}>{companies}</span> companies. Comp shown where it
            is published. Tailor your resume to any of them in one click.
          </p>
          {agentCount > 0 && (
            <p className="mt-1.5 text-xs" style={{ color: 'var(--faint)' }}>
              <span className="font-data">{agentCount}</span> sourced automatically this
              morning and evening, each link re-checked daily.
            </p>
          )}
        </header>

        {isStale && (
          <p
            className="mb-6 rounded-lg px-3 py-2 text-xs"
            style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.25)', color: 'var(--warn)' }}
          >
            Live list is unreachable right now, so this is the last saved copy. Links still work.
          </p>
        )}

        <OpportunityBrowser opportunities={opportunities} />
      </main>

      <Footer />
    </div>
  );
}
