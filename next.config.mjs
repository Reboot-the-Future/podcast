/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const csp = [
      "default-src 'self'",
      // Allow Buzzsprout player scripts
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.buzzsprout.com https://player.buzzsprout.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com",
      // Allow Buzzsprout player connections
      "connect-src 'self' https: https://www.buzzsprout.com https://player.buzzsprout.com",
      // Media (audio) can come from https, including Buzzsprout
      "media-src 'self' https:",
      // Allow embedding Buzzsprout player iframes
      "frame-src https://www.buzzsprout.com https://player.buzzsprout.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    const securityHeaders = [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // HSTS enabled only when behind HTTPS
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
    ];

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  async redirects() {
    return [
      // Redirect all old Buzzsprout account ID patterns that Bing indexed
      // This catches /2068911/episodes, /2068911/about, /2068911/anything
      {
        source: '/2068911/:path*',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;