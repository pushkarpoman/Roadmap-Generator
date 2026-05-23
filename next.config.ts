import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  webpack: (config, { dev }) => {
    if (dev) {
      // Use polling on Windows to ensure file changes are detected reliably.
      config.watchOptions = {
        ...(config.watchOptions || {}),
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules/**", "**/.git/**", "**/.next/**"],
      };
    }

    return config;
  },
};

export default nextConfig;
