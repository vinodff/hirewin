import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hirewin.live';

export const metadata: Metadata = {
  title: 'Job Scan — Extract ATS Keywords & Skill Requirements from Any Job URL',
  description:
    'Paste any job posting URL or text to instantly extract critical ATS keywords, required technical skills, and candidate qualification benchmarks.',
  keywords: [
    'job scan',
    'extract ats keywords',
    'job description analyzer',
    'resume job matcher',
    'ats keyword extraction tool',
  ],
  alternates: {
    canonical: `${siteUrl}/job-scan`,
  },
};

export default function JobScanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
