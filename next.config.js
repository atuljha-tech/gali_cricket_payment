/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable instrumentation.ts (auto-seed on startup)
  experimental: {
    instrumentationHook: true,
  },
  images: {
    domains: ['res.cloudinary.com'],
  },
}

module.exports = nextConfig
