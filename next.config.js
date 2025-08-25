/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    runtime: 'edge',
  },
  reactStrictMode: true,
  swcMinify: true,
  // Disable image optimization for Cloudflare Pages
  images: {
    unoptimized: true,
  },
  
  // Environment variables that will be available in the browser
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // X-Frame-Options removed to allow embedding in Farcaster clients
          // Mini apps need to be displayed in iframes within Farcaster
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ]
  },
  
  // Webpack configuration for Cloudflare Workers compatibility
  webpack: (config, { isServer }) => {
    // Exclude Node.js built-ins for both server and client
    config.resolve.fallback = {
      ...config.resolve.fallback,
      // Node.js built-ins that aren't available in Cloudflare Workers
      async_hooks: false,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      path: false,
      os: false,
      stream: false,
      buffer: false,
      util: false,
      url: false,
      querystring: false,
      string_decoder: false,
      events: false,
      http: false,
      https: false,
      zlib: false,
      child_process: false,
      worker_threads: false,
      cluster: false,
      dgram: false,
      dns: false,
      module: false,
      readline: false,
      repl: false,
      vm: false,
    };

    // Note: async_hooks is handled via alias polyfill, not externals

    // Add module replacement for async_hooks specifically
    const path = require('path');
    config.resolve.alias = {
      ...config.resolve.alias,
      'async_hooks': path.resolve(__dirname, 'polyfills/async_hooks.js'),
    };
    
    return config;
  },
  
  // Trailing slashes configuration
  trailingSlash: false,
  
  // Disable powered by header
  poweredByHeader: false,
  
  // Compress responses
  compress: true,
  
  // Generate ETags
  generateEtags: true,
}

module.exports = nextConfig;
