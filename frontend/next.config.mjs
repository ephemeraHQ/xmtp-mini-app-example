import { fileURLToPath } from "node:url";
import createJITI from "jiti";

const jiti = createJITI(fileURLToPath(import.meta.url));

jiti("./src/lib/env.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: {
    appIsrStatus: false,
  },
  images: {
    remotePatterns: [
      {
        hostname: "**",
        protocol: "https",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't include the native Node.js modules on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };

      // Ignore native .node files on the client side
      config.module.rules.push({
        test: /\.node$/,
        loader: "null-loader",
      });

      // Prevent importing @xmtp/node-bindings on the client
      config.resolve.alias = {
        ...config.resolve.alias,
        "@xmtp/node-bindings": false,
      };
    }

    return config;
  },
  // Ensure Next.js treats XMTP as server-side only
  experimental: {
    serverComponentsExternalPackages: ["@xmtp/node-bindings"],
  },
  // Disable all caching
  onDemandEntries: {
    // Make Next.js not keep pages in memory
    maxInactiveAge: 0,
  },
  // Prevent static optimizations
  swcMinify: true,
  // Disable static generation

  // Disable caching of static assets
  staticPageGenerationTimeout: 0,
  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
