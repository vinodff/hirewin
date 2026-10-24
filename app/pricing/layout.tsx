import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hirewin.live';

export const metadata: Metadata = {
  title: 'Pricing — Free & Pro Plans for Jobseekers',
  description:
    'Affordable, transparent pricing. Free preview and optimization tiers, plus Pro plans with unlimited resume rewrites, ATS score checks, and outreach generator.',
  alternates: {
    canonical: `${siteUrl}/pricing`,
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
