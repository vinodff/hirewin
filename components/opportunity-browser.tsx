'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import type { Opportunity, Urgency } from '@/lib/opportunities';

/** Signal colours. Status is the honest urgency cue here — most rows have no date. */
const SIGNAL: Record<Urgency, { dot: string; label: string; text: string }> = {
  closing:  { dot: 'var(--warn)',   label: 'Closing soon', text: 'var(--warn)' },
  open:     { dot: 'var(--accent)', label: 'Open',         text: 'var(--accent-soft)' },
  upcoming: { dot: 'var(--dim)',    label: 'Not yet open', text: 'var(--dim)' },
  stale:    { dot: 'var(--faint)',  label: 'Verify first', text: 'var(--faint)' },
};

const ALL = 'All';

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

function ChipGroup({
  label, options, value, onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className="text-[11px] uppercase tracking-wider w-full sm:w-24 shrink-0"
        style={{ color: 'var(--faint)' }}
      >
        {label}
      </span>
      {options.map((o) => (
        <Chip key={o} active={value === o} onClick={() => onChange(o)}>{o}</Chip>
      ))}
    </div>
  );
}

function Row({ item }: { item: Opportunity }) {
  const signal = SIGNAL[item.urgency];
  const faded = item.urgency === 'stale';

  const body = (
    <div
      className="grid gap-x-5 gap-y-2 items-center px-4 py-4 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)_minmax(0,240px)_auto]"
      style={{ opacity: faded ? 0.55 : 1 }}
    >
      {/* Company + what kind of thing this is */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: signal.dot, boxShadow: item.urgency === 'closing' ? '0 0 8px var(--warn)' : undefined }}
            aria-hidden
          />
          <span className="font-display font-semibold text-sm truncate" style={{ color: 'var(--fg)' }}>
            {item.company}
          </span>
        </div>
        <div className="mt-1 pl-3.5 text-[11px] uppercase tracking-wider" style={{ color: 'var(--faint)' }}>
          {item.type} · {item.category.replace(' Platform', '').replace('-Based', '')}
        </div>
      </div>

      {/* The role itself */}
      <div className="min-w-0">
        <p className="text-sm leading-snug" style={{ color: 'var(--fg)' }}>{item.title}</p>
        {(item.deadline || item.urgency !== 'open') && (
          <p className="mt-1 text-xs" style={{ color: signal.text }}>
            {item.urgency !== 'open' ? signal.label : null}
            {item.urgency !== 'open' && item.deadline ? ' · ' : null}
            {item.deadline}
          </p>
        )}
      </div>

      {/* Comp is the hook. Mono, because this product reads numbers as an instrument. */}
      <div className="min-w-0">
        {item.benefits && (
          <p className="font-data text-xs leading-snug" style={{ color: 'var(--accent-soft)' }}>
            {item.benefits}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs font-semibold justify-self-start md:justify-self-end"
        style={{ color: item.url ? 'var(--accent-soft)' : 'var(--faint)' }}
      >
        {item.url ? 'Apply' : 'No link'}
        {item.url && <ArrowUpRight className="w-3.5 h-3.5" />}
      </div>
    </div>
  );

  const shell = 'block rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2';
  const style = { background: 'var(--surface-2)', border: '1px solid var(--edge)' };

  if (!item.url) return <div className={shell} style={style}>{body}</div>;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${shell} hover:border-[var(--edge-strong)] hover:bg-[var(--surface)]`}
      style={style}
    >
      {body}
    </a>
  );
}

export default function OpportunityBrowser({ opportunities }: { opportunities: Opportunity[] }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState(ALL);
  const [category, setCategory] = useState(ALL);

  // Filters come from the data, so a new category in the sheet needs no code change.
  const types = useMemo(() => [ALL, ...Array.from(new Set(opportunities.map((o) => o.type)))], [opportunities]);
  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(opportunities.map((o) => o.category)))],
    [opportunities]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunities.filter((o) => {
      if (type !== ALL && o.type !== type) return false;
      if (category !== ALL && o.category !== category) return false;
      if (!q) return true;
      return `${o.company} ${o.title} ${o.benefits ?? ''}`.toLowerCase().includes(q);
    });
  }, [opportunities, query, type, category]);

  const counts = useMemo(() => {
    const c: Partial<Record<Urgency, number>> = {};
    for (const o of opportunities) c[o.urgency] = (c[o.urgency] ?? 0) + 1;
    return c;
  }, [opportunities]);

  return (
    <>
      {/* Signal legend — doubles as an at-a-glance read on the whole list */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 text-xs">
        {(Object.keys(SIGNAL) as Urgency[]).filter((u) => counts[u]).map((u) => (
          <span key={u} className="flex items-center gap-2" style={{ color: 'var(--dim)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: SIGNAL[u].dot }} aria-hidden />
            <span className="font-data" style={{ color: 'var(--fg)' }}>{counts[u]}</span>
            {SIGNAL[u].label}
          </span>
        ))}
      </div>

      {/* Filters */}
      <div
        className="sticky top-14 z-30 -mx-4 px-4 py-3 mb-5 space-y-3"
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
            className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--edge)', color: 'var(--fg)' }}
          />
        </div>

        {/* Two dimensions, and "Hackathon" is a value in both — label them or the
            rows read as one confusing strip with two "All" chips. */}
        <ChipGroup label="Looking for" options={types} value={type} onChange={setType} />
        <ChipGroup label="Company" options={categories} value={category} onChange={setCategory} />
      </div>

      <p className="mb-3 text-xs font-data" style={{ color: 'var(--faint)' }}>
        {visible.length} of {opportunities.length}
      </p>

      {visible.length === 0 ? (
        <div className="rounded-xl px-4 py-12 text-center text-sm"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--edge)', color: 'var(--dim)' }}
        >
          Nothing matches that. Try clearing a filter.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((o) => <Row key={o.id} item={o} />)}
        </div>
      )}
    </>
  );
}
