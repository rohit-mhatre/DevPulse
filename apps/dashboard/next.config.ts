import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        recharts: {
          name: 'recharts',
          test: /[\\/]node_modules[\\/]recharts[\\/]/,
          priority: 10,
          reuseExistingChunk: true,
        },
        radix: {
          name: 'radix',
          test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
          priority: 10,
          reuseExistingChunk: true,
        },
        vendor: {
          name: 'vendors',
          test: /[\\/]node_modules[\\/]/,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    };
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
