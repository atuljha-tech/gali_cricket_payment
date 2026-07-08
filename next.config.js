/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  images: {
    domains: ['res.cloudinary.com'],
  },
  // This is the key fix - allows larger uploads
  serverRuntimeConfig: {
    maxBodySize: '100mb',
  },
}

module.exports = nextConfig
