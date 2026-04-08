/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Ensure server-only code is never accidentally bundled on the client
  experimental: {
    typedRoutes: false,
  },
}

module.exports = nextConfig
