'use client';

import { useMemo, useState } from 'react';
import {
  ArrowUpRight, Search, Clock, Flame, GraduationCap, Briefcase, Trophy,
  AlertTriangle, CalendarClock, Wallet, Building2,
} from 'lucide-react';
import type { Opportunity, Urgency } from '@/lib/opportunities';
import LOGOS from '@/lib/company-logos.json';

const ALL = 'All';

const LOGO_BY_COMPANY = LOGOS as Record<string, string>;

const SIGNAL: Record<Urgency, { label: string; color: string; tint: string; Icon: typeof Flame }> = {
  closing:  { label: 'Closing soon', color: 'var(--warn)',        tint: 'rgba(251,191,36,0.12)',  Icon: Flame },
  open:     { label: 'Open now',     color: 'var(--accent-soft)', tint: 'rgba(var(--accent-rgb),0.12)', Icon: Clock },
  upcoming: { label: 'Opens later',  color: 'var(--dim)',         tint: 'rgba(255,255,255,0.05)', Icon: CalendarClock },
  stale:    { label: 'Verify first', color: 'var(--faint)',       tint: 'rgba(255,255,255,0.04)', Icon: AlertTriangle },
};

const TYPE_ICON: Record<string, typeof Briefcase> = {
  Internship: GraduationCap,
  Job: Briefcase,
  Hackathon: Trophy,
};

/**
 * Identity tints for the company monogram. Muted and deterministic so a company is
 * recognisable at a glance — identity, never status.
 *
 * Hue choice is constrained twice over: emerald and amber are load-bearing here
 * (actionable / time pressure) so an identity tile must not borrow them, and the
 * violet-blue family belongs to the retired brand palette that __tests__/palette.test.ts
 * guards against. What is left is sky, cyan, rose, and slate, none of which mean
 * anything in this system.
 */
const MONOGRAM_TINTS = [
  { bg: 'rgba(56,189,248,0.14)',  fg: '#7DD3FC' },
  { bg: 'rgba(34,211,238,0.13)',  fg: '#67E8F9' },
  { bg: 'rgba(244,114,182,0.13)', fg: '#F9A8D4' },
  { bg: 'rgba(148,163,184,0.16)', fg: '#CBD5E1' },
];

/**
 * The company's real mark where we have one, initials where we don't. Both sit in
 * the same tile at the same size so a mixed set still reads as one system.
 *
 * The tile is white on purpose. Brand marks are drawn for light backgrounds —
 * ServiceNow's is dark green, EPAM's is black — and on a dark tile they simply
 * vanish. Lightening them instead would wreck the ones that are already pale, so
 * the background moves rather than the logo.
 */
function CompanyMark({ company }: { company: string }) {
  const file = LOGO_BY_COMPANY[company];
  const mono = monogram(company);

  return (
    <div
      className="w-12 h-12 rounded-xl grid place-items-center shrink-0 overflow-hidden"
      style={{
        background: file ? '#F4F7F8' : mono.bg,
        border: '1px solid rgba(255,255,255,0.09)',
      }}
    >
      {file ? (
        // eslint-disable-next-line @next/next/no-img-element -- static local asset, no optimizer needed
        <img
          src={`/logos/${file}`}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          className="w-7 h-7 object-contain"
        />
      ) : (
        <span className="font-display font-bold text-sm" style={{ color: mono.fg }}>{mono.letters}</span>
      )}
    </div>
  );
}

function monogram(company: string) {
  const letters = company
    .replace(/\(.*?\)/g, '')
    .split(/[\s/]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  let hash = 0;
  for (let i = 0; i < company.length; i++) hash = (hash * 31 + company.charCodeAt(i)) >>> 0;

  return { letters: letters || company.slice(0, 2).toUpperCase(), ...MONOGRAM_TINTS[hash % MONOGRAM_TINTS.length] };
}

/** "Closes in 4 days" beats "2026-08-10 17:00 ET" for someone deciding what to do today. */
function countdown(days: number | null): string | null {
  if (days === null) return null;
  if (days < 0) return 'Deadline passed';
  if (days === 0) return 'Closes today';
  if (days === 1) return 'Closes tomorrow';
  if (days <= 30) return `Closes in ${days} days`;
  return null;
}

function Card({ item }: { item: Opportunity }) {
  const signal = SIGNAL[item.urgency];
  const TypeIcon = TYPE_ICON[item.type] ?? Briefcase;
  const timer = countdown(item.daysLeft);
  const urgent = item.daysLeft !== null && item.daysLeft >= 0 && item.daysLeft <= 7;
  const expired = item.daysLeft !== null && item.daysLeft < 0;
  const unverified = item.urgency === 'stale' || expired;

  return (
    <article
      className="group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
      style={{
        // Layered: a lit top edge fading into the ground, not one flat fill.
        background: urgent
          ? 'linear-gradient(180deg, rgba(251,191,36,0.06) 0%, var(--surface-2) 42%)'
          : 'linear-gradient(180deg, var(--surface) 0%, var(--surface-2) 46%)',
        border: `1px solid ${urgent ? 'rgba(251,191,36,0.3)' : 'var(--edge)'}`,
        boxShadow: urgent ? '0 10px 30px -18px rgba(251,191,36,0.35)' : 'var(--lift)',
        opacity: item.urgency === 'stale' ? 0.72 : 1,
      }}
    >
      {/* Deal-style ribbon. Only ever earned by a real date inside a week. */}
      {urgent && (
        <div
          className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ background: 'rgba(251,191,36,0.14)', color: 'var(--warn)' }}
        >
          <Flame className="w-3 h-3" aria-hidden />
          {timer}
        </div>
      )}

      <div className="flex flex-col flex-1 p-4">
        {/* Identity */}
        <div className="flex items-start gap-3">
          <CompanyMark company={item.company} />
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-semibold text-sm leading-tight truncate" style={{ color: 'var(--fg)' }}>
              {item.company}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: 'var(--faint)' }}>
              <Building2 className="w-3 h-3 shrink-0" aria-hidden />
              <span className="truncate">{item.category}</span>
            </p>
          </div>
          {!urgent && (
            <span
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider shrink-0"
              style={{ background: signal.tint, color: signal.color }}
            >
              <signal.Icon className="w-2.5 h-2.5" aria-hidden />
              {signal.label}
            </span>
          )}
        </div>

        {/* Role */}
        <p
          className="mt-3 text-sm font-medium leading-snug line-clamp-2"
          style={{ color: 'var(--fg)', minHeight: '2.5rem' }}
          title={item.title}
        >
          {item.title}
        </p>

        {/* Comp is this card's price tag: the thing that decides the click. */}
        <div
          className="mt-3 rounded-xl px-3 py-2.5"
          style={{
            background: item.benefits ? 'rgba(var(--accent-rgb),0.07)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${item.benefits ? 'rgba(var(--accent-rgb),0.16)' : 'var(--edge)'}`,
          }}
        >
          <div className="flex items-start gap-2">
            <Wallet
              className="w-3.5 h-3.5 mt-0.5 shrink-0"
              style={{ color: item.benefits ? 'var(--accent-soft)' : 'var(--faint)' }}
              aria-hidden
            />
            <p
              className="font-data text-xs leading-relaxed line-clamp-2"
              style={{ color: item.benefits ? 'var(--accent-soft)' : 'var(--faint)' }}
              title={item.benefits ?? undefined}
            >
              {item.benefits ?? 'Compensation not published'}
            </p>
          </div>
        </div>

        {/* Timing + kind. Never blank: falls back to the status word. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]" style={{ color: 'var(--dim)' }}>
          <span className="flex items-center gap-1">
            <TypeIcon className="w-3 h-3" aria-hidden />
            {item.type}
          </span>
          <span className="flex items-center gap-1" style={{ color: urgent ? 'var(--warn)' : 'var(--dim)' }}>
            <Clock className="w-3 h-3" aria-hidden />
            {timer ?? item.deadline ?? item.status}
          </span>
        </div>

        {/* CTA pinned to the bottom so every card in a row ends level */}
        <div className="mt-auto pt-4">
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full rounded-xl py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 group-hover:brightness-110"
              /* Three weights, so the page has a hierarchy instead of 52 identical
                 green buttons. Solid emerald is reserved for the ones on a clock;
                 the everyday case is a tinted button that fills in on hover; a
                 listing we can't vouch for keeps its link but drops to outline. */
              style={
                unverified
                  ? { background: 'transparent', border: '1px solid var(--edge-strong)', color: 'var(--dim)' }
                  : urgent
                    ? { background: 'var(--accent-fill)', color: 'var(--on-accent)' }
                    : {
                        background: 'rgba(var(--accent-rgb),0.12)',
                        border: '1px solid rgba(var(--accent-rgb),0.3)',
                        color: 'var(--accent-soft)',
                      }
              }
            >
              {unverified ? 'Check listing' : 'Apply now'}
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </a>
          ) : (
            <span
              className="flex items-center justify-center w-full rounded-xl py-2.5 text-sm font-medium"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--faint)' }}
            >
              No application link
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2"
      style={{
        color: active ? '#fff' : 'var(--dim)',
        background: active ? 'rgba(var(--accent-rgb), 0.18)' : 'transparent',
        border: `1px solid ${active ? 'rgba(var(--accent-rgb), 0.35)' : 'var(--edge)'}`,
      }}
    >
      {children}
    </button>
  );
}

export default function OpportunityBrowser({ opportunities }: { opportunities: Opportunity[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(ALL);

  /**
   * One filter, not two. Type and company-kind used to be separate rows, which meant
   * two "All" chips and "Hackathon" appearing twice. They are folded into a single
   * single-select list — the search box handles anything more specific.
   * Derived from the data, so a new value in the sheet needs no code change.
   */
  const filters = useMemo(() => {
    const types = Array.from(new Set(opportunities.map((o) => o.type)));
    const kinds = Array.from(new Set(opportunities.map((o) => o.category)))
      // "Hackathon Platform" is already reachable via the Hackathon type chip.
      .filter((c) => !types.some((t) => c.toLowerCase().startsWith(t.toLowerCase())));
    return [ALL, ...types, ...kinds];
  }, [opportunities]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunities.filter((o) => {
      if (filter !== ALL && o.type !== filter && o.category !== filter) return false;
      if (!q) return true;
      return `${o.company} ${o.title} ${o.benefits ?? ''}`.toLowerCase().includes(q);
    });
  }, [opportunities, query, filter]);

  const counts = useMemo(() => {
    const c: Partial<Record<Urgency, number>> = {};
    for (const o of opportunities) c[o.urgency] = (c[o.urgency] ?? 0) + 1;
    return c;
  }, [opportunities]);

  const closingThisWeek = useMemo(
    () => opportunities.filter((o) => o.daysLeft !== null && o.daysLeft >= 0 && o.daysLeft <= 7).length,
    [opportunities]
  );

  return (
    <>
      {/* At-a-glance read on the whole board */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {closingThisWeek > 0 && (
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--warn)' }}
          >
            <Flame className="w-3.5 h-3.5" aria-hidden />
            {closingThisWeek} closing this week
          </span>
        )}
        {(Object.keys(SIGNAL) as Urgency[]).filter((u) => counts[u]).map((u) => (
          <span
            key={u}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--dim)' }}
          >
            <span className="font-data font-semibold" style={{ color: SIGNAL[u].color }}>{counts[u]}</span>
            {SIGNAL[u].label}
          </span>
        ))}
      </div>

      {/* Filters */}
      <div
        className="sticky top-14 z-30 -mx-4 px-4 py-3 mb-6 space-y-3"
        style={{ background: 'rgba(var(--ground-rgb), 0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--faint)' }} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, role, or comp"
            aria-label="Search opportunities"
            className="w-full rounded-xl pl-9 pr-3 py-3 text-sm focus-visible:outline-none focus-visible:ring-2"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--edge)', color: 'var(--fg)' }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
          ))}
        </div>
      </div>

      <p className="mb-4 text-xs font-data" style={{ color: 'var(--faint)' }}>
        {visible.length} of {opportunities.length}
      </p>

      {visible.length === 0 ? (
        <div
          className="rounded-2xl px-4 py-16 text-center text-sm"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--edge)', color: 'var(--dim)' }}
        >
          Nothing matches that. Try clearing a filter.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((o) => <Card key={o.id} item={o} />)}
        </div>
      )}
    </>
  );
}
