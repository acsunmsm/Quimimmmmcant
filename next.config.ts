import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/Quimimmmmcant',
  assetPrefix: '/Quimimmmmcant',
  trailingSlash: true,
  devIndicators: false,
  webpack(config) {
    // Keep module and loader identities consistent when node_modules is a Windows junction.
    config.resolve.symlinks = false;
    config.resolveLoader.symlinks = false;
    return config;
  },
  images: {
    unoptimized: true,
    remotePatterns: [{protocol:'https',hostname:'images.unsplash.com'},{protocol:'https',hostname:'picsum.photos'},{protocol:'https',hostname:'placehold.co'}],
  },
};
export default nextConfig;
