import Link from 'next/link';

const links = {
  Product: [
    { label: 'Optimize Resume', href: '/analyze' },
    { label: 'My Resumes',      href: '/my-resumes' },
    { label: 'Job Tracker',     href: '/history' },
    { label: 'Pricing',         href: '/pricing' },
  ],
  Company: [
    { label: 'About',   href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Refund Policy',  href: '/refund' },
    { label: 'Shipping & Delivery', href: '/shipping' },
  ],
};

export default function Footer() {
  return (
    <footer
      className="border-t mt-auto"
      style={{ borderColor: 'rgba(255,255,255,0.05)', background: '#080d1a' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-1.5 mb-3">
              <img src="/logo.png" alt="HireWin" className="w-6 h-6 object-contain" />
              <span className="font-bold text-white text-sm">
                Hire<span style={{ background: 'linear-gradient(135deg,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Win</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[180px]">
              AI-powered resume optimizer built for jobseekers. Free to preview, pay only to download.
            </p>
            <a
              href="mailto:support@hirewin.live"
              className="inline-block mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              support@hirewin.live
            </a>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{group}</p>
              <ul className="space-y-2">
                {items.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 text-xs text-slate-600"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span>© {new Date().getFullYear()} HireWin. All rights reserved.</span>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-slate-400 transition-colors">Terms</Link>
            <Link href="/refund"  className="hover:text-slate-400 transition-colors">Refund</Link>
            <Link href="/shipping" className="hover:text-slate-400 transition-colors">Shipping</Link>
            <Link href="/contact" className="hover:text-slate-400 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
