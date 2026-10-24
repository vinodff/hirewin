'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight, Search, Clock, Flame, GraduationCap, Briefcase, Trophy,
  Building2, Heart, ShieldCheck, Sparkles, X, MapPin, CheckCircle2,
  RefreshCw, LayoutGrid, ListFilter, Share2, Eye, Filter
} from 'lucide-react';
import { splitHighlight, type Opportunity, type Urgency } from '@/lib/opportunities';
import LOGOS from '@/lib/company-logos.json';

const ALL = 'All';

const LOGO_BY_COMPANY = LOGOS as Record<string, string>;

const SIGNAL: Record<Urgency, { label: string; color: string; tint: string; Icon: typeof Flame }> = {
  closing:  { label: 'Closing soon', color: 'var(--warn)', tint: 'rgba(251,191,36,0.12)', Icon: Flame },
  open:     { label: 'Active', color: 'var(--accent-soft)', tint: 'rgba(var(--accent-rgb),0.12)', Icon: Clock },
  upcoming: { label: 'Opens later', color: 'var(--dim)', tint: 'rgba(255,255,255,0.05)', Icon: Clock },
  stale:    { label: 'Verify first', color: 'var(--faint)', tint: 'rgba(255,255,255,0.04)', Icon: Clock },
};

const TYPE_ICON: Record<string, typeof Briefcase> = {
  Internship: GraduationCap,
  Job: Briefcase,
  Hackathon: Trophy,
  Competition: Trophy,
};

const MONOGRAM_TINTS = [
  { bg: 'rgba(56,189,248,0.14)',  fg: '#7DD3FC' },
  { bg: 'rgba(34,211,238,0.13)',  fg: '#67E8F9' },
  { bg: 'rgba(244,114,182,0.13)', fg: '#F9A8D4' },
  { bg: 'rgba(148,163,184,0.16)', fg: '#CBD5E1' },
];

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

function CompanyMark({ company }: { company: string }) {
  const file = LOGO_BY_COMPANY[company];
  const mono = monogram(company);

  return (
    <div
      className="w-11 h-11 rounded-xl grid place-items-center shrink-0 overflow-hidden shadow-sm"
      style={{
        background: file ? '#FFFFFF' : mono.bg,
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {file ? (
        // eslint-disable-next-line @next/next/no-img-element -- static local asset
        <img
          src={`/logos/${file}`}
          alt={company}
          width={28}
          height={28}
          loading="lazy"
          className="w-7 h-7 object-contain"
        />
      ) : (
        <span className="font-display font-bold text-xs" style={{ color: mono.fg }}>{mono.letters}</span>
      )}
    </div>
  );
}

function countdown(days: number | null): string | null {
  if (days === null) return null;
  if (days < 0) return 'Deadline passed';
  if (days === 0) return 'Closes today!';
  if (days === 1) return 'Closes tomorrow';
  if (days <= 30) return `${days} days left`;
  return null;
}

interface CardProps {
  item: Opportunity;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
  onQuickView: (item: Opportunity) => void;
  viewMode: 'grid' | 'list';
}

function OpportunityCard({ item, isWishlisted, onToggleWishlist, onQuickView, viewMode }: CardProps) {
  const signal = SIGNAL[item.urgency] ?? SIGNAL.open;
  const TypeIcon = TYPE_ICON[item.type] ?? Briefcase;
  const timer = countdown(item.daysLeft);
  const { value, rest } = splitHighlight(item.benefits ?? item.compensation ?? '');
  const urgent = item.daysLeft !== null && item.daysLeft >= 0 && item.daysLeft <= 7;
  const isUnstop = Boolean(item.url?.includes('unstop.com') || item.source === 'Unstop');

  // Resume builder tailored url
  const tailorUrl = `/resume-editor?role=${encodeURIComponent(item.title)}&company=${encodeURIComponent(item.company)}`;

  if (viewMode === 'list') {
    return (
      <article
        className="group relative flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl gap-4 transition-all duration-200 hover:border-emerald-500/40"
        style={{
          background: 'linear-gradient(180deg, var(--surface) 0%, var(--surface-2) 100%)',
          border: '1px solid var(--edge)',
        }}
      >
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <CompanyMark company={item.company} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display font-bold text-sm text-white truncate">{item.company}</span>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                style={{ background: 'rgba(52,211,153,0.12)', color: 'var(--signal)' }}
              >
                <ShieldCheck className="w-3 h-3" />
                {isUnstop ? 'Unstop Verified' : 'Verified Direct'}
              </span>
              {item.isFresher && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{
                    background: 'rgba(var(--accent-rgb),0.15)',
                    color: 'var(--accent-soft)',
                    border: '1px solid rgba(var(--accent-rgb),0.3)',
                  }}
                >
                  <GraduationCap className="w-3 h-3" />
                  0-1 YOE · Freshers
                </span>
              )}
              {urgent && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400">
                  <Flame className="w-3 h-3" />
                  {timer}
                </span>
              )}
            </div>
            <h3 className="mt-1 text-sm font-semibold text-white/90 line-clamp-1">{item.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <TypeIcon className="w-3 h-3" />
                {item.type}
              </span>
              {item.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {item.location}
                </span>
              )}
              {value && (
                <span className="font-data font-semibold text-emerald-400">{value}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
          <button
            type="button"
            onClick={() => onToggleWishlist(item.id)}
            title={isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}
            className="p-2 rounded-lg border transition-colors hover:bg-white/5"
            style={{
              borderColor: isWishlisted ? '#F43F5E' : 'var(--edge)',
              color: isWishlisted ? '#F43F5E' : 'var(--dim)',
            }}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => onQuickView(item)}
            className="px-3 py-2 rounded-lg text-xs font-medium border text-slate-300 hover:text-white transition-colors"
            style={{ borderColor: 'var(--edge)', background: 'var(--surface-2)' }}
          >
            Quick View
          </button>

          <Link
            href={tailorUrl}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all hover:bg-emerald-500/10"
            style={{ borderColor: 'rgba(52,211,153,0.3)', color: 'var(--accent-soft)' }}
          >
            <Sparkles className="w-3 h-3" />
            Tailor Resume
          </Link>

          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              Apply Direct
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="px-3 py-2 text-xs text-slate-500">No link</span>
          )}
        </div>
      </article>
    );
  }

  // Flipkart Grid Card View
  return (
    <article
      className="group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
      style={{
        background: urgent
          ? 'linear-gradient(180deg, rgba(251,191,36,0.06) 0%, var(--surface-2) 42%)'
          : 'linear-gradient(180deg, var(--surface) 0%, var(--surface-2) 46%)',
        border: `1px solid ${urgent ? 'rgba(251,191,36,0.3)' : 'var(--edge)'}`,
        boxShadow: urgent ? '0 10px 30px -18px rgba(251,191,36,0.35)' : 'var(--lift)',
      }}
    >
      {/* Top Banner Ribbon */}
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b text-[11px]" style={{ borderColor: 'var(--edge)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-1.5 font-medium">
          <span
            className="inline-flex items-center gap-1 font-semibold"
            style={{ color: 'var(--signal)' }}
          >
            <ShieldCheck className="w-3 h-3" aria-hidden />
            {isUnstop ? 'Unstop Verified' : 'Direct Opportunity'}
          </span>
        </div>

        {urgent ? (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
            <Flame className="w-3 h-3" aria-hidden />
            {timer}
          </span>
        ) : (
          <span
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{ background: signal.tint, color: signal.color }}
          >
            <signal.Icon className="w-2.5 h-2.5" aria-hidden />
            {timer ?? item.status}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4">
        {/* Company Header & Wishlist Button */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <CompanyMark company={item.company} />
            <div className="min-w-0">
              <h3
                className="font-display font-bold text-base leading-snug truncate tracking-tight text-white group-hover:text-emerald-400 transition-colors"
                title={item.company}
              >
                {item.company}
              </h3>
              <p className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate">
                <Building2 className="w-3 h-3 shrink-0" aria-hidden />
                <span>{item.category}</span>
                {item.location && <span>· {item.location.split(',')[0]}</span>}
              </p>
            </div>
          </div>

          {/* Flipkart Wishlist Heart Button */}
          <button
            type="button"
            onClick={() => onToggleWishlist(item.id)}
            title={isWishlisted ? 'Saved to Wishlist' : 'Save to Wishlist'}
            aria-label={isWishlisted ? 'Saved to Wishlist' : 'Save to Wishlist'}
            className="p-2 rounded-xl transition-transform active:scale-90 hover:bg-white/5"
            style={{
              background: isWishlisted ? 'rgba(244,63,94,0.12)' : 'rgba(255,255,255,0.04)',
              color: isWishlisted ? '#F43F5E' : 'var(--dim)',
              border: `1px solid ${isWishlisted ? 'rgba(244,63,94,0.3)' : 'var(--edge)'}`,
            }}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Role Title */}
        <p
          className="mt-3 text-sm font-semibold leading-snug line-clamp-2 text-white/90"
          style={{ minHeight: '2.5rem' }}
          title={item.title}
        >
          {item.title}
        </p>

        {/* Fresher & Batch Eligibility Badge */}
        {item.isFresher && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: 'rgba(var(--accent-rgb),0.15)',
                color: 'var(--accent-soft)',
                border: '1px solid rgba(var(--accent-rgb),0.3)',
              }}
            >
              <GraduationCap className="w-3 h-3" />
              0-1 YOE · Freshers Eligible
            </span>
            {item.batchEligibility && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-300"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                {item.batchEligibility}
              </span>
            )}
          </div>
        )}

        {/* Flipkart Price / Compensation Tag */}
        <div
          className="mt-3 rounded-xl px-3.5 py-2.5 flex items-center justify-between"
          style={{
            background: value ? 'rgba(var(--accent-rgb),0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${value ? 'rgba(var(--accent-rgb),0.2)' : 'var(--edge)'}`,
          }}
        >
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
              {item.type === 'Hackathon' || item.type === 'Competition' ? 'Prize Pool / Rewards' : 'Compensation / Stipend'}
            </span>
            <p className="font-data font-bold text-sm text-emerald-400 mt-0.5 tracking-tight truncate">
              {value || (rest && rest.length < 35 ? rest : 'Market Competitive')}
            </p>
          </div>
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--fg)' }}
          >
            {item.type}
          </span>
        </div>

        {/* Eligibility & Skills tags */}
        <div className="mt-3 space-y-1.5">
          {item.eligibility && (
            <p className="text-[11px] text-slate-400 line-clamp-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 shrink-0 text-slate-500" />
              <span>{item.eligibility}</span>
            </p>
          )}

          {item.skills && item.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {item.skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-300"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {skill}
                </span>
              ))}
              {item.skills.length > 3 && (
                <span className="text-[10px] text-slate-500 self-center">+{item.skills.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Card Action Buttons */}
        <div className="mt-auto pt-4 flex items-center gap-2">
          {/* Quick Details button */}
          <button
            type="button"
            onClick={() => onQuickView(item)}
            className="flex-1 rounded-xl py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-all text-center border focus-visible:outline-none"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--edge)' }}
          >
            Quick View
          </button>

          {/* Direct Apply Button */}
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all hover:brightness-110 shadow-sm focus-visible:outline-none"
              style={{
                background: 'var(--accent)',
                color: 'var(--on-accent)',
              }}
            >
              Apply Direct
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
            </a>
          ) : (
            <span
              className="flex-1 text-center py-2.5 text-xs font-medium rounded-xl text-slate-500"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              No link
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function OpportunityBrowser({ opportunities: initialOpportunities }: { opportunities: Opportunity[] }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState(ALL);
  const [sortBy, setSortBy] = useState<'recommended' | 'closing' | 'comp' | 'newest'>('recommended');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [activeModalItem, setActiveModalItem] = useState<Opportunity | null>(null);

  // Load wishlist from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hirewin_wishlist');
      if (saved) setWishlist(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  const toggleWishlist = useCallback((id: string) => {
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('hirewin_wishlist', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Dynamic refresh from API
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/opportunities?refresh=1');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.opportunities) && data.opportunities.length > 0) {
          setOpportunities(data.opportunities);
        }
      }
    } catch (e) {
      console.warn('Refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Dynamic filter chips
  const counts = useMemo(() => {
    const all = opportunities.length;
    const freshers = opportunities.filter((o) => o.isFresher).length;
    const internships = opportunities.filter((o) => o.type === 'Internship').length;
    const jobs = opportunities.filter((o) => o.type === 'Job').length;
    const batch2025 = opportunities.filter(
      (o) => /2025/i.test(`${o.batchEligibility ?? ''} ${o.title} ${o.eligibility ?? ''}`)
    ).length;
    const batch2026_27 = opportunities.filter(
      (o) => /2026|2027/i.test(`${o.batchEligibility ?? ''} ${o.title} ${o.eligibility ?? ''}`)
    ).length;
    const hackathons = opportunities.filter((o) => o.type === 'Hackathon' || o.type === 'Competition').length;
    const remote = opportunities.filter((o) => o.category === 'Remote' || o.workMode === 'remote').length;
    const wishlisted = opportunities.filter((o) => wishlist.includes(o.id)).length;
    return { all, freshers, internships, jobs, batch2025, batch2026_27, hackathons, remote, wishlisted };
  }, [opportunities, wishlist]);

  const closingThisWeek = useMemo(
    () => opportunities.filter((o) => o.daysLeft !== null && o.daysLeft >= 0 && o.daysLeft <= 7).length,
    [opportunities]
  );

  // Filtered & Sorted list
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = opportunities.filter((o) => {
      // Category filter
      if (selectedFilter === 'Saved') {
        if (!wishlist.includes(o.id)) return false;
      } else if (selectedFilter === 'Freshers') {
        if (!o.isFresher) return false;
      } else if (selectedFilter === 'Batch2025') {
        if (!/2025/i.test(`${o.batchEligibility ?? ''} ${o.title} ${o.eligibility ?? ''}`)) return false;
      } else if (selectedFilter === 'Batch2026_27') {
        if (!/2026|2027/i.test(`${o.batchEligibility ?? ''} ${o.title} ${o.eligibility ?? ''}`)) return false;
      } else if (selectedFilter === 'Internships') {
        if (o.type !== 'Internship') return false;
      } else if (selectedFilter === 'Jobs') {
        if (o.type !== 'Job') return false;
      } else if (selectedFilter === 'Hackathons') {
        if (o.type !== 'Hackathon' && o.type !== 'Competition') return false;
      } else if (selectedFilter === 'Remote') {
        if (o.category !== 'Remote' && o.workMode !== 'remote') return false;
      } else if (selectedFilter === 'High Comp') {
        const hasHigh = /lpa|\$|₹[3-9]\d,\d\d\d|₹\d{2,3},\d\d\d|prize/i.test(o.benefits ?? o.compensation ?? '');
        if (!hasHigh) return false;
      }

      // Search query
      if (!q) return true;
      const haystack = `${o.company} ${o.title} ${o.benefits ?? ''} ${o.location ?? ''} ${(o.skills ?? []).join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === 'closing') {
        return (a.daysLeft ?? 999) - (b.daysLeft ?? 999);
      }
      if (sortBy === 'comp') {
        const hasA = Boolean(a.benefits || a.compensation);
        const hasB = Boolean(b.benefits || b.compensation);
        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;
        return a.company.localeCompare(b.company);
      }
      if (sortBy === 'newest') {
        return b.id.localeCompare(a.id);
      }
      // 'recommended': closing within 7 days first, then verified MNCs, then company name
      const urgentA = a.daysLeft !== null && a.daysLeft >= 0 && a.daysLeft <= 7 ? 0 : 1;
      const urgentB = b.daysLeft !== null && b.daysLeft >= 0 && b.daysLeft <= 7 ? 0 : 1;
      if (urgentA !== urgentB) return urgentA - urgentB;
      return (a.daysLeft ?? 999) - (b.daysLeft ?? 999);
    });
  }, [opportunities, query, selectedFilter, sortBy, wishlist]);

  return (
    <>
      {/* Live Dynamic Stats Banner */}
      <div
        className="rounded-2xl p-4 sm:p-5 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border shadow-sm"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(12,20,24,0.95) 100%)',
          borderColor: 'rgba(16,185,129,0.2)',
        }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Live Verified Fresher & Campus Catalog
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-400">
              100% Pre-Flight Verified Direct Links
            </span>
          </div>
          <p className="text-sm font-medium text-white/90">
            <span className="font-data font-bold text-emerald-400">{opportunities.length}</span> active openings, including{' '}
            <span className="font-data font-bold text-emerald-400">{counts.freshers}</span> verified college student & fresher roles (Batches 2024–2027) with active registration forms.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-stretch md:self-auto shrink-0">
          {closingThisWeek > 0 && (
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'rgba(251,191,36,0.14)', color: 'var(--warn)' }}
            >
              <Flame className="w-3.5 h-3.5" aria-hidden />
              {closingThisWeek} closing this week
            </span>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:bg-emerald-500/10 focus-visible:outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--fg)',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            {isRefreshing ? 'Syncing…' : 'Sync Feed'}
          </button>
        </div>
      </div>

      {/* Flipkart-Style Interactive Filter & Search Bar */}
      <div
        className="sticky top-14 z-30 -mx-4 px-4 py-3.5 mb-6 space-y-3 rounded-2xl border"
        style={{
          background: 'rgba(8,12,15,0.92)',
          borderColor: 'var(--edge)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by company, role title, skills (e.g. React, Python), or location…"
              aria-label="Search opportunities"
              className="w-full rounded-xl pl-10 pr-9 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--fg)' }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector & View Mode Switcher */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort opportunities"
              className="rounded-xl px-3 py-2 text-xs font-semibold focus-visible:outline-none cursor-pointer"
              style={{ background: 'var(--surface)', border: '1px solid var(--edge)', color: 'var(--fg)' }}
            >
              <option value="recommended">Recommended (Top)</option>
              <option value="closing">Closing Soonest</option>
              <option value="comp">Highest Compensation</option>
              <option value="newest">Recently Discovered</option>
            </select>

            <div className="flex items-center rounded-xl p-0.5 border" style={{ borderColor: 'var(--edge)', background: 'var(--surface)' }}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                title="List View"
                aria-label="List View"
              >
                <ListFilter className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Tabs Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: ALL, label: 'All Openings', count: counts.all },
            { id: 'Freshers', label: '🎓 Freshers (0-1 YOE)', count: counts.freshers },
            { id: 'Batch2025', label: '🎯 Batch 2025', count: counts.batch2025 },
            { id: 'Batch2026_27', label: '🚀 Batches 2026-2027', count: counts.batch2026_27 },
            { id: 'Internships', label: '💼 Internships', count: counts.internships },
            { id: 'Jobs', label: '🏢 Full-Time Jobs', count: counts.jobs },
            { id: 'Hackathons', label: '🏆 Hackathons & Challenges', count: counts.hackathons },
            { id: 'Remote', label: '🌐 Remote Only', count: counts.remote },
            { id: 'High Comp', label: '💰 High Stipend / CTC' },
            { id: 'Saved', label: '❤️ Wishlist', count: counts.wishlisted },
          ].map((tab) => {
            const active = selectedFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFilter(tab.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 focus-visible:outline-none"
                style={{
                  color: active ? '#FFFFFF' : 'var(--dim)',
                  background: active ? 'rgba(var(--accent-rgb), 0.2)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(var(--accent-rgb), 0.45)' : 'var(--edge)'}`,
                }}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className="font-data text-[10px] px-1.5 py-0.2 rounded-full"
                    style={{
                      background: active ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                      color: active ? 'var(--on-accent)' : 'var(--dim)',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count Bar */}
      <div className="flex items-center justify-between mb-4 px-1 text-xs text-slate-400">
        <p className="font-data">
          Showing <span className="font-bold text-white">{visible.length}</span> of {opportunities.length} verified openings
          {selectedFilter !== ALL && <span className="text-emerald-400 font-semibold ml-1">({selectedFilter})</span>}
        </p>

        {wishlist.length > 0 && selectedFilter !== 'Saved' && (
          <button
            type="button"
            onClick={() => setSelectedFilter('Saved')}
            className="flex items-center gap-1 text-rose-400 hover:underline"
          >
            <Heart className="w-3 h-3 fill-current" />
            <span>{wishlist.length} saved</span>
          </button>
        )}
      </div>

      {/* Grid or List of Cards */}
      {visible.length === 0 ? (
        <div
          className="rounded-2xl px-4 py-16 text-center space-y-3"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--edge)', color: 'var(--dim)' }}
        >
          <Filter className="w-8 h-8 mx-auto text-slate-500" />
          <p className="text-base font-semibold text-white">No opportunities match that filter</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try clearing the search query or switching to another category.
          </p>
          <button
            type="button"
            onClick={() => { setQuery(''); setSelectedFilter(ALL); }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors"
          >
            Reset all filters
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {visible.map((o) => (
            <OpportunityCard
              key={o.id}
              item={o}
              isWishlisted={wishlist.includes(o.id)}
              onToggleWishlist={toggleWishlist}
              onQuickView={setActiveModalItem}
              viewMode="list"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((o) => (
            <OpportunityCard
              key={o.id}
              item={o}
              isWishlisted={wishlist.includes(o.id)}
              onToggleWishlist={toggleWishlist}
              onQuickView={setActiveModalItem}
              viewMode="grid"
            />
          ))}
        </div>
      )}

      {/* Flipkart-Style Quick View Modal */}
      {activeModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-7 space-y-5 border shadow-2xl"
            style={{
              background: 'var(--surface)',
              borderColor: 'rgba(255,255,255,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setActiveModalItem(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Identity */}
            <div className="flex items-start gap-4 pr-8">
              <CompanyMark company={activeModalItem.company} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-white">{activeModalItem.company}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Direct Link
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1 leading-snug">{activeModalItem.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>{activeModalItem.type}</span>
                  <span>·</span>
                  <span>{activeModalItem.category}</span>
                  {activeModalItem.location && <span>· {activeModalItem.location}</span>}
                </p>
              </div>
            </div>

            {/* Compensation Tag */}
            <div
              className="rounded-2xl p-4 border"
              style={{
                background: 'rgba(var(--accent-rgb),0.07)',
                borderColor: 'rgba(var(--accent-rgb),0.2)',
              }}
            >
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                {activeModalItem.type === 'Hackathon' || activeModalItem.type === 'Competition' ? 'Prizes / Rewards' : 'Compensation & Benefits'}
              </span>
              <p className="text-base font-data font-bold text-emerald-400 mt-1">
                {activeModalItem.benefits || activeModalItem.compensation || 'Market Competitive Compensation'}
              </p>
            </div>

            {/* Key Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                <span className="text-slate-400 block text-[11px]">Location</span>
                <span className="font-semibold text-white mt-0.5 block truncate">
                  {activeModalItem.location || 'Pan-India'}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                <span className="text-slate-400 block text-[11px]">Work Mode</span>
                <span className="font-semibold text-white mt-0.5 block capitalize">
                  {activeModalItem.workMode || 'Onsite / Hybrid'}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02] col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[11px]">Deadline</span>
                <span className="font-semibold text-amber-400 mt-0.5 block">
                  {activeModalItem.deadline || 'Rolling / Active'}
                </span>
              </div>
            </div>

            {/* Fresher & Batch Eligibility Highlight */}
            {activeModalItem.isFresher && (
              <div
                className="rounded-2xl p-3.5 border flex items-center justify-between"
                style={{
                  background: 'rgba(var(--accent-rgb),0.06)',
                  borderColor: 'rgba(var(--accent-rgb),0.25)',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">0-1 Years Experience · Freshers Eligible</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {activeModalItem.batchEligibility ? `${activeModalItem.batchEligibility}` : 'Suitable for college students & 2024–2027 graduates'}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400">
                  Fresher Friendly
                </span>
              </div>
            )}

            {/* Eligibility */}
            {activeModalItem.eligibility && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-300">Eligibility & Target Batches</span>
                <p className="text-xs text-slate-400 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
                  {activeModalItem.eligibility}
                </p>
              </div>
            )}

            {/* Skills */}
            {activeModalItem.skills && activeModalItem.skills.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-300">Target Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {activeModalItem.skills.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-300 border border-emerald-500/20 bg-emerald-500/10"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Bottom Bar */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => toggleWishlist(activeModalItem.id)}
                className="w-full sm:w-auto px-4 py-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-colors hover:bg-white/5"
                style={{
                  borderColor: wishlist.includes(activeModalItem.id) ? '#F43F5E' : 'var(--edge)',
                  color: wishlist.includes(activeModalItem.id) ? '#F43F5E' : 'var(--fg)',
                }}
              >
                <Heart className={`w-4 h-4 ${wishlist.includes(activeModalItem.id) ? 'fill-current text-rose-500' : ''}`} />
                {wishlist.includes(activeModalItem.id) ? 'Saved' : 'Save'}
              </button>

              <Link
                href={`/resume-editor?role=${encodeURIComponent(activeModalItem.title)}&company=${encodeURIComponent(activeModalItem.company)}`}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-semibold border text-center transition-all hover:bg-emerald-500/10 flex items-center justify-center gap-1.5"
                style={{ borderColor: 'rgba(52,211,153,0.35)', color: 'var(--accent-soft)' }}
              >
                <Sparkles className="w-4 h-4" />
                Tailor Resume for Role
              </Link>

              {activeModalItem.url && (
                <a
                  href={activeModalItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all hover:brightness-110 shadow-lg"
                  style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                >
                  Apply on Official Site
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
