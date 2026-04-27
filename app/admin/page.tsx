import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import AdminDashboard from './dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) {
    redirect('/auth/login?next=/admin');
  }

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <nav
        className="sticky top-0 z-40 border-b border-white/[0.06] backdrop-blur-xl"
        style={{ background: 'rgba(8,13,26,0.85)' }}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-white tracking-tight">
            <img src="/logo.png" alt="HireWin Logo" className="w-6 h-6 object-contain" />
            <span>
              Hire<span className="gradient-text">Win</span>
              <span className="ml-2 text-xs font-medium text-slate-500 uppercase tracking-widest">
                Admin
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/history" className="text-sm text-slate-400 hover:text-white transition-colors">
              History
            </Link>
            <span className="text-xs text-slate-500">{admin.email}</span>
          </div>
        </div>
      </nav>
      <AdminDashboard />
    </div>
  );
}
