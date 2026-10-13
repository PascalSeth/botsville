import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure proper asset prefixes
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : undefined,
  
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
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
        hostname: 'wsrv.nl',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
  },
};

export default nextConfig;
