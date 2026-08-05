import type { Metadata, Viewport } from 'next';
import { Inter, Archivo, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import PresenceBeat from '@/components/presence-beat';
import Script from 'next/script';

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

/* Three roles, not one face doing every job:
   DISPLAY — Archivo. A sturdier grotesque than Inter, so headlines read as a
     deliberate voice rather than scaled-up body copy. Only 600/700 ship.
   BODY    — Inter. Already tuned for UI reading; no reason to replace it.
   DATA    — IBM Plex Mono. This product's substance is numbers (34 → 89,
     trust 82, keyword counts). Setting them in an engineering face makes the
     whole thing read as an instrument, which is exactly the brand claim.
   Both are self-hosted and subset by next/font — no CDN, no layout shift. */
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-display',
  preload: true,
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-data',
  preload: false,             // data face is below the fold on most pages
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: 'var(--ground)',
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
    <html lang="en" className={`${inter.variable} ${archivo.variable} ${plexMono.variable}`}>
      <head>
        {/* Preconnect to Supabase for faster auth round-trip */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />
        )}
      </head>
      <body>
        <PresenceBeat />
        {children}
        <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
