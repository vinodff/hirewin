'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LogOut, FileText, CreditCard, History, Zap, LayoutGrid, Shield,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/analyze', label: 'Optimize' },
  { href: '/my-resumes', label: 'My Resumes' },
  { href: '/history', label: 'History' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/billing', label: 'Billing & Usage' },
];

export default function AppNav() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

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
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    window.location.href = '/';
  }

  const name =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    user?.email ||
    'Account';
  const shortName = name.split(' ')[0] || 'Account';
  const initial = (name[0] ?? 'U').toUpperCase();
  const avatar = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <nav
      className="sticky top-0 z-50 border-b border-white/[0.06]"
      style={{
        background: 'rgba(8,13,26,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <span
            className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-extrabold"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            H
          </span>
          <span className="font-bold text-white tracking-tight text-sm">
            Hire<span className="gradient-text">Win</span>
          </span>
        </Link>

        {/* Center nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={
                  active
                    ? { color: '#fff', background: 'rgba(124,58,237,0.18)' }
                    : { color: '#94a3b8' }
                }
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Upgrade button */}
          <Link
            href="/pricing"
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            <Zap className="w-3 h-3" />
            Upgrade
          </Link>

          {/* User menu */}
          {loading ? (
            <div className="w-8 h-8 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
          ) : !user ? (
            <a
              href="/auth/login"
              className="text-sm font-semibold px-3 py-1.5 rounded-lg text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
            >
              Sign in
            </a>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt={name} className="w-7 h-7 rounded-full" />
                ) : (
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                  >
                    {initial}
                  </span>
                )}
                <span className="text-slate-300 text-sm max-w-[100px] truncate hidden sm:inline">
                  {shortName}
                </span>
                <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 rounded-xl p-1 z-50"
                  style={{
                    background: '#0f1629',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  }}
                >
                  <div className="px-3 py-2 border-b border-white/5 mb-1">
                    <div className="text-xs font-semibold text-white truncate">{name}</div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{user.email}</div>
                  </div>
                  <MenuLink href="/analyze" icon={<FileText className="w-4 h-4" />} label="Optimize Resume" onClose={() => setMenuOpen(false)} />
                  <MenuLink href="/my-resumes" icon={<LayoutGrid className="w-4 h-4" />} label="My Resumes" onClose={() => setMenuOpen(false)} />
                  <MenuLink href="/pricing" icon={<Zap className="w-4 h-4" />} label="Pricing" onClose={() => setMenuOpen(false)} />
                  <MenuLink href="/billing" icon={<CreditCard className="w-4 h-4" />} label="Billing & Usage" onClose={() => setMenuOpen(false)} />
                  <MenuLink href="/history" icon={<History className="w-4 h-4" />} label="History" onClose={() => setMenuOpen(false)} />
                  {isAdmin && (
                    <MenuLink href="/admin" icon={<Shield className="w-4 h-4" />} label="Admin" onClose={() => setMenuOpen(false)} />
                  )}
                  <div className="border-t border-white/5 mt-1 pt-1">
                    <button
                      onClick={signOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-white/[0.05] px-4 pb-2 flex gap-1 overflow-x-auto">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0"
              style={
                active
                  ? { color: '#fff', background: 'rgba(124,58,237,0.18)' }
                  : { color: '#94a3b8' }
              }
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MenuLink({
  href,
  icon,
  label,
  onClose,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
    >
      <span className="text-slate-500">{icon}</span>
      {label}
    </Link>
  );
}
