import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure proper asset prefixes
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : undefined,
  
  // Generate unique build ID each time to prevent stale caches
  generateBuildId: async () => {
    return `build-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
         {
        protocol: 'https',
        hostname: 'dhsfknqqldrfztywhmsq.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
  },
  // Ensure proper headers are set
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
      {
        source: '/_next/static/:path*.css',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
