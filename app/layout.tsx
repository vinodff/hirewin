import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import PresenceBeat from '@/components/presence-beat';

/* ── Next.js font optimization ──────────────────────────────────
   Replaces the render-blocking @import in CSS.
   Next.js automatically self-hosts the font, subsets it,
   and preloads only the glyphs the page actually uses. */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',            // shows fallback font instantly, swaps when ready
  variable: '--font-inter',   // CSS variable for Tailwind
  preload: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080d1a',
};

export const metadata: Metadata = {
  title: 'HireWin — AI Resume Optimizer',
  description:
    'Get your resume optimized for any company in 15 seconds. Company-specific tone, ATS scoring, skill gap analysis, and cold outreach — all in one shot.',
  openGraph: {
    title: 'HireWin — AI Resume Optimizer',
    description: 'Company-specific resume optimization powered by Claude AI.',
    type: 'website',
  },
  other: {
    // Preconnect to Supabase so auth check starts faster
    'dns-prefetch': process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Preconnect to Supabase for faster auth round-trip */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />
        )}
      </head>
      <body>
        <PresenceBeat />
        {children}
      </body>
    </html>
  );
}
