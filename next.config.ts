import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'gateway.pinata.cloud',
      'ipfs.io',
      'cloudflare-ipfs.com',
      'dweb.link',
      'cf-ipfs.com',
      // Add any other domains you use
    ],
    unoptimized: true, // Disable optimization for better IPFS compatibility
  },
  eslint: {
    ignoreDuringBuilds: true, 
  },
};

export default nextConfig;
