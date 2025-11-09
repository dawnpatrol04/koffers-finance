import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.parsons.ai',
        port: '',
        pathname: '/v1/storage/**',
      },
    ],
  },
};

export default config;
