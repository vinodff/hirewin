'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export default function NavAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (data.user) {
        fetch('/api/auth/is-admin').then((r) => r.json()).then(({ isAdmin }) => setIsAdmin(!!isAdmin)).catch(() => {});
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

  if (loading) {
    return <div className="w-20 h-8 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />;
  }

  if (!user) {
    return (
      <a
        href="/auth/login"
        className="text-sm font-semibold px-3 py-1.5 rounded-lg text-white transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
      >
        Sign in
      </a>
    );
  }

  const avatar = user.user_metadata?.avatar_url as string | undefined;
  const name = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || user.email || 'Account';
  const initial = (name[0] ?? 'U').toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="w-7 h-7 rounded-full" />
        ) : (
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            {initial}
          </span>
        )}
        <span className="text-slate-300 max-w-[140px] truncate hidden sm:inline">{name}</span>
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-xl p-1 z-50"
          style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
        >
          <div className="px-3 py-2 text-xs text-slate-500 border-b border-white/5 mb-1 truncate">{user.email}</div>
          <a
            href="/history"
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
          >
            <UserIcon className="w-4 h-4" />
            History
          </a>
          {isAdmin && (
            <a
              href="/admin"
              className="flex items-center gap-2 px-3 py-2 text-sm text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
            >
              <Shield className="w-4 h-4" />
              Admin
            </a>
          )}
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
