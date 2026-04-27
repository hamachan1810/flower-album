/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'commons.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'inaturalist-open-data.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'static.inaturalist.org',
      },
    ],
    unoptimized: false,
  },
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

export default nextConfig;
