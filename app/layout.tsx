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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hirewin.live';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'HireWin — Free AI Resume Builder, ATS Score Checker & Resume Optimizer',
    template: '%s | HireWin',
  },
  description:
    'Free AI resume builder and real-time ATS score checker. Scan your resume against any job description, boost keyword match to 90%+, and generate interview-ready resumes in 15 seconds.',
  keywords: [
    'ai resume builder free',
    'free ai resume builder',
    'ats score checker',
    'ats score checker free',
    'ats resume checker',
    'ai resume optimizer',
    'check ats score online',
    'resume keyword matcher',
    'ats friendly resume builder',
    'free resume score',
    'best ai resume builder',
    'resume scanner online free',
    'tailor resume to job description',
  ],
  authors: [{ name: 'HireWin Team' }],
  creator: 'HireWin',
  publisher: 'HireWin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'HireWin — Free AI Resume Builder & ATS Score Checker',
    description:
      'Instantly scan your resume ATS score against any job description, find missing keywords, and build interview-winning resumes with AI.',
    url: siteUrl,
    siteName: 'HireWin',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HireWin — Free AI Resume Builder & ATS Score Checker',
    description:
      'Boost your resume ATS score to 90%+ with our free AI resume builder and instant keyword matcher.',
  },
  other: {
    'dns-prefetch': process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  },
};

const jsonLdGlobal = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'HireWin',
      description: 'Free AI Resume Builder, ATS Score Checker & Resume Optimization Engine',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/analyze?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'HireWin',
      url: siteUrl,
      logo: `${siteUrl}/logo.png`,
      sameAs: [
        'https://twitter.com/hirewin',
        'https://linkedin.com/company/hirewin',
      ],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${siteUrl}/#software`,
      name: 'HireWin AI Resume Builder & ATS Score Checker',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'All',
      url: siteUrl,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '14280',
        bestRating: '5',
        worstRating: '1',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${archivo.variable} ${plexMono.variable}`}>
      <head>
        {/* Preconnect to Supabase for faster auth round-trip */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGlobal) }}
        />
      </head>
      <body>
        <PresenceBeat />
        {children}
        <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}

