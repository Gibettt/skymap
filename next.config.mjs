/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/sky/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
