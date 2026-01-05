import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker/Coolify deployment (also works with Vercel)
  output: 'standalone',
  // TypeScript: All type issues have been resolved
  typescript: {
    ignoreBuildErrors: false,
  },
  // Externalize heavy packages for serverless functions to reduce bundle size
  serverExternalPackages: [
    '@google/generative-ai',
  ],
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    return [
      // Security headers for all routes
      // Note: Permissions-Policy is handled by middleware.ts for route-specific camera access
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Note: Permissions-Policy is set by middleware.ts for route-specific camera access
          // HSTS - Force HTTPS for 1 year (only in production)
          ...(isProduction ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          }] : []),
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://web.squarecdn.com https://sandbox.web.squarecdn.com https://js.sentry-cdn.com https://browser.sentry-cdn.com https://www.paypal.com https://www.paypalobjects.com https://js.stripe.com https://vercel.live https://www.googletagmanager.com https://www.google-analytics.com",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com https://vercel.live",
              `img-src 'self' data: blob: https: ${isDevelopment ? 'http://localhost:*' : ''} https://lh3.googleusercontent.com https://images.unsplash.com https://unsplash.com https://convex.toolboxhosting.com`.replace(/\s+/g, ' ').trim(),
              "connect-src 'self' https://convex.toolboxhosting.com wss://convex.toolboxhosting.com https://api.stripe.com https://stripe.com https://m.stripe.com https://m.stripe.network https://web.squarecdn.com https://sandbox.web.squarecdn.com https://connect.squareup.com https://pci-connect.squareup.com https://www.paypal.com https://api.paypal.com https://*.sentry.io https://www.google-analytics.com https://www.googletagmanager.com https://region1.google-analytics.com",
              "frame-src 'self' https://web.squarecdn.com https://sandbox.web.squarecdn.com https://www.paypal.com https://js.stripe.com https://vercel.live",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          // Disable caching in development
          ...(isDevelopment ? [
            {
              key: 'Cache-Control',
              value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
            },
            {
              key: 'Pragma',
              value: 'no-cache',
            },
            {
              key: 'Expires',
              value: '0',
            },
          ] : []),
        ],
      },
      // Cache Next.js static files (JS, CSS) aggressively in production
      ...(isProduction ? [
        {
          source: '/_next/static/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
        // Cache static assets (fonts, images)
        {
          source: '/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff|woff2|ttf|otf)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=86400, must-revalidate',
            },
          ],
        },
        // No cache for API routes
        {
          source: '/api/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, no-cache, must-revalidate',
            },
          ],
        },
      ] : []),
    ];
  },
  async redirects() {
    return [
      // Story 3.4: Fix 404 Routes
      // /calendar → /events (calendar functionality is in events page)
      {
        source: '/calendar',
        destination: '/events',
        permanent: false,
      },
      // /organizer → /organizer/events (organizer dashboard)
      {
        source: '/organizer',
        destination: '/organizer/events',
        permanent: false,
      },
      // /cart → /marketplace/checkout (unified cart coming in future)
      {
        source: '/cart',
        destination: '/marketplace/checkout',
        permanent: false,
      },
      // /checkout → /events/checkout (most common checkout path)
      {
        source: '/checkout',
        destination: '/events/checkout',
        permanent: false,
      },
      // /tickets → /my-tickets (user's purchased tickets)
      {
        source: '/tickets',
        destination: '/my-tickets',
        permanent: false,
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "unsplash.com",
        pathname: "/**",
      },
      // Note: localhost removed for production - add back in development if needed
      {
        protocol: "https",
        hostname: "stepperslife.com",
        pathname: "/api/**",
      },
      {
        protocol: "https",
        hostname: "convex.toolboxhosting.com",
        pathname: "/api/storage/**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the Sentry DSN is set in the NEXT_PUBLIC_SENTRY_DSN environment variable.
  tunnelRoute: "/monitoring",

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: false,
});
