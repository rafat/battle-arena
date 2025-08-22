import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'gateway.pinata.cloud',
      'ipfs.io'
      // Add any other domains you use
    ],
  },
  eslint: {
    ignoreDuringBuilds: true, 
  },
};

export default nextConfig;
