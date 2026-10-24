import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hirewin.live';

export const metadata: Metadata = {
  title: 'AI Resume Optimizer & ATS Scanner — Tailor Resume to Job Description',
  description:
    'Scan and optimize your resume against any target job description. Real-time ATS scoring, keyword gap analysis, verified evidence mapping, and interview-ready rewrites.',
  keywords: [
    'ai resume optimizer',
    'tailor resume to job description',
    'resume ats scanner',
    'resume keyword matcher',
    'resume score checker',
    'ats resume optimization',
  ],
  alternates: {
    canonical: `${siteUrl}/analyze`,
  },
  openGraph: {
    title: 'AI Resume Optimizer & ATS Scanner | HireWin',
    description:
      'Instantly scan your resume against any job posting. Boost ATS keyword match to 90%+ with company-tailored rewrites in 20 seconds.',
    url: `${siteUrl}/analyze`,
    type: 'website',
  },
};

export default function AnalyzeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
