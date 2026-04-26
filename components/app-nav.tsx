'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LogOut, FileText, CreditCard, History, Zap, LayoutGrid, Shield, Menu, X,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/analyze',    label: 'Optimize',        icon: FileText   },
  { href: '/my-resumes', label: 'My Resumes',       icon: LayoutGrid },
  { href: '/history',    label: 'History',          icon: History    },
  { href: '/pricing',    label: 'Pricing',          icon: Zap        },
  { href: '/billing',    label: 'Billing & Usage',  icon: CreditCard },
];

export default function AppNav() {
  const [user, setUser]           = useState<User | null>(null);
  const [loading, setLoading]     = useState(true);
  const [menuOpen, setMenuOpen]   = useState(false);   // desktop avatar dropdown
  const [mobileOpen, setMobileOpen] = useState(false); // hamburger drawer
  const [isAdmin, setIsAdmin]     = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const menuRef  = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  // Close mobile drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (data.user) {
        fetch('/api/auth/is-admin')
          .then((r) => r.json())
          .then(({ isAdmin }) => setIsAdmin(!!isAdmin))
          .catch(() => {});
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAvatarError(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Close desktop dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    setMobileOpen(false);
    window.location.href = '/';
  }

  const name      = (user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || user?.email || 'Account';
  const shortName = name.split(' ')[0] || 'Account';
  const initial   = (name[0] ?? 'U').toUpperCase();
  const avatar    = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <nav
      className="sticky top-0 z-50 border-b border-white/[0.06]"
      style={{ background: 'rgba(8,13,26,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      {/* ── Main bar ── */}
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <img src="/logo.png" alt="HireWin Logo" className="w-7 h-7 object-contain" />
          <span className="font-bold text-white tracking-tight text-sm">
            Hire<span className="gradient-text">Win</span>
          </span>
        </Link>

        {/* Desktop center nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
            return (
              <Link key={href} href={href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={active ? { color: '#fff', background: 'rgba(124,58,237,0.18)' } : { color: '#94a3b8' }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Upgrade pill — desktop */}
          <Link href="/pricing"
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            <Zap className="w-3 h-3" />
            Upgrade
          </Link>

          {/* Auth state */}
          {loading ? (
            <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
          ) : !user ? (
            <a href="/auth/login"
              className="text-sm font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
            >
              Sign in
            </a>
          ) : (
            <>
              {/* Desktop avatar dropdown */}
              <div className="relative hidden md:block" ref={menuRef}>
                <button onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {avatar && !avatarError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt={name} referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
                      {initial}
                    </span>
                  )}
                  <span className="text-slate-300 text-sm max-w-[100px] truncate">{shortName}</span>
                  <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl p-1 z-50"
                    style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                  >
                    <div className="px-3 py-2 border-b border-white/5 mb-1">
                      <div className="text-xs font-semibold text-white truncate">{name}</div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{user.email}</div>
                    </div>
                    <MenuLink href="/analyze"    icon={<FileText   className="w-4 h-4" />} label="Optimize Resume"  onClose={() => setMenuOpen(false)} />
                    <MenuLink href="/my-resumes" icon={<LayoutGrid  className="w-4 h-4" />} label="My Resumes"       onClose={() => setMenuOpen(false)} />
                    <MenuLink href="/pricing"    icon={<Zap         className="w-4 h-4" />} label="Pricing"          onClose={() => setMenuOpen(false)} />
                    <MenuLink href="/billing"    icon={<CreditCard  className="w-4 h-4" />} label="Billing & Usage"  onClose={() => setMenuOpen(false)} />
                    <MenuLink href="/history"    icon={<History     className="w-4 h-4" />} label="History"          onClose={() => setMenuOpen(false)} />
                    {isAdmin && <MenuLink href="/admin" icon={<Shield className="w-4 h-4" />} label="Admin" onClose={() => setMenuOpen(false)} />}
                    <div className="border-t border-white/5 mt-1 pt-1">
                      <button onClick={signOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile avatar + hamburger */}
              <div className="flex items-center gap-2 md:hidden">
                {avatar && !avatarError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt={name} referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
                    {initial}
                  </span>
                )}
                <button
                  onClick={() => setMobileOpen((v) => !v)}
                  className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors active:scale-95"
                  style={{ background: mobileOpen ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)' }}
                  aria-label="Open menu"
                >
                  {mobileOpen
                    ? <X    className="w-5 h-5 text-white" />
                    : <Menu className="w-5 h-5 text-slate-300" />
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && user && (
        <div className="md:hidden border-t border-white/[0.06]"
          style={{ background: 'rgba(6,10,22,0.98)', backdropFilter: 'blur(16px)' }}
        >
          {/* User info row */}
          <div className="px-4 py-4 flex items-center gap-3 border-b border-white/[0.06]">
            {avatar && !avatarError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={name} referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full object-cover shrink-0"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <span className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{name}</div>
              <div className="text-xs text-slate-500 truncate">{user.email}</div>
            </div>
          </div>

          {/* Nav links */}
          <div className="px-3 pt-3 pb-2 space-y-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
              return (
                <Link key={href} href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
                  style={active
                    ? { color: '#fff', background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.3)' }
                    : { color: '#94a3b8', border: '1px solid transparent' }
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: active ? '#a78bfa' : '#475569' }} />
                  {label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link href="/admin" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-slate-400 transition-all active:scale-[0.98]"
                style={{ border: '1px solid transparent' }}
              >
                <Shield className="w-4 h-4 shrink-0 text-slate-500" />
                Admin
              </Link>
            )}
          </div>

          {/* Upgrade + Sign out */}
          <div className="px-3 pt-2 pb-5 space-y-2 border-t border-white/[0.06]">
            <Link href="/pricing" onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
            >
              <Zap className="w-4 h-4" />
              Upgrade to Pro
            </Link>
            <button onClick={signOut}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-slate-400 transition-all active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

function MenuLink({ href, icon, label, onClose }: {
  href: string; icon: React.ReactNode; label: string; onClose: () => void;
}) {
  return (
    <Link href={href} onClick={onClose}
      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
    >
      <span className="text-slate-500">{icon}</span>
      {label}
    </Link>
  );
}
