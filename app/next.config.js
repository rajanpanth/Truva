/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }
    // Suppress optional pino-pretty peer dep warning from @walletconnect
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /^pino-pretty$/,
      })
    );
    return config;
  },
};

module.exports = nextConfig;
