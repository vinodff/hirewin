import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hirewin.live';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/ats-score-checker',
          '/ai-resume-builder-free',
          '/builder',
          '/analyze',
          '/job-scan',
          '/linkedin-optimizer',
          '/pricing',
          '/about',
          '/contact',
          '/terms',
          '/privacy',
          '/refund',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/auth/',
          '/history/',
          '/my-resumes/',
          '/billing/',
          '/payment/',
          '/_next/',
          '/scratch/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
