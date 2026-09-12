/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)' },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/sky/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/surveys/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
        ],
      },
      {
        source: '/stellarium-web/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: '/surveys/:path*',
          destination: 'https://stellarium.sfo2.cdn.digitaloceanspaces.com/surveys/:path*',
        },
        {
          source: '/stellarium-web/:path*',
          destination: 'https://stellarium.sfo2.cdn.digitaloceanspaces.com/stellarium-web/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
