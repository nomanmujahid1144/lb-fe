/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    poweredByHeader: false, // Remove X-Powered-By header
    reactStrictMode: true,
    // Ensure no dev features in production
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Credentials', value: 'true' },
                    { key: 'Access-Control-Allow-Origin', value: process.env.CORS_ALLOWED_ORIGIN || 'http://localhost:3000' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
                    { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
                ],
            },
            // NOTE: the /_next/static Cache-Control header was removed. Next.js already
            // applies `public, max-age=31536000, immutable` to content-hashed static assets
            // automatically; setting it manually is redundant and Next 16 warns that a custom
            // Cache-Control on /_next/static can break dev behaviour.
        ];
    },
};

module.exports = nextConfig;