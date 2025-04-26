import { fileURLToPath } from "node:url";
import createJITI from "jiti";

const jiti = createJITI(fileURLToPath(import.meta.url));
jiti("./src/lib/env.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        //        crypto: false,
      };

      config.module.rules.push({
        test: /\.node$/,
        loader: "null-loader",
      });
    }

    return config;
  },
  headers: async () => {
    return [
      {
        source: "/(.*)",
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
          {
            key: "Surrogate-Control",
            value: "no-store",
          }, // Add the XMTP browser SDK required headers
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
  // This setting prevents Next.js from trying to statically generate dynamic routes
  staticPageGenerationTimeout: 1000,
};

export default nextConfig;
