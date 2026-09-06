import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import OpportunitiesConsole from './console';

export const dynamic = 'force-dynamic';

export default async function AdminOpportunitiesPage() {
  const admin = await requireAdmin();
  if (!admin) {
    redirect('/auth/login?next=/admin/opportunities');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ground)' }}>
      <nav
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ background: 'rgba(8,12,15,0.9)', borderColor: 'var(--edge)' }}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
            <img src="/logo.png" alt="HireWin Logo" className="w-6 h-6 object-contain" />
            <span>
              Hire<span className="gradient-text">Win</span>
              <span className="ml-2 text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--faint)' }}>
                Admin
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm transition-colors" style={{ color: 'var(--dim)' }}>
              Overview
            </Link>
            <Link href="/opportunities" className="text-sm transition-colors" style={{ color: 'var(--dim)' }}>
              Public board
            </Link>
            <span className="text-xs" style={{ color: 'var(--faint)' }}>
              {admin.email}
            </span>
          </div>
        </div>
      </nav>
      <OpportunitiesConsole />
    </div>
  );
}
