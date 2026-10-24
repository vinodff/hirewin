import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hirewin.live';

export const metadata: Metadata = {
  title: 'AI Resume Builder — Create ATS-Compliant Resumes Free',
  description:
    'Build and download an ATS-compliant resume with our intelligent AI resume builder. Formulate Google X-Y-Z bullets, choose professional templates, and export PDF/DOCX.',
  keywords: [
    'ai resume builder',
    'free resume builder',
    'online resume maker',
    'ats resume builder free',
    'create resume online',
    'resume maker with ai',
  ],
  alternates: {
    canonical: `${siteUrl}/builder`,
  },
  openGraph: {
    title: 'AI Resume Builder — Create ATS-Compliant Resumes Free | HireWin',
    description:
      'Build and export an interview-winning, ATS-tested resume in minutes. Free PDF download, professional templates, and AI bullet formulation.',
    url: `${siteUrl}/builder`,
    type: 'website',
  },
};

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
