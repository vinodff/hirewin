import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'pdfkit'],
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
    // Enable PPR for instant static shell + streamed dynamic parts
    optimizePackageImports: ['lucide-react'],
  },
  // Enable gzip/brotli compression
  compress: true,
  // Powered-by header leaks framework info and adds bytes
  poweredByHeader: false,
  // Enable React strict mode for better dev warnings (no prod cost)
  reactStrictMode: true,
  webpack: (config) => {
    config.watchOptions = { ...config.watchOptions, ignored: /career-ops-main/ };
    return config;
  },
};

export default nextConfig;
