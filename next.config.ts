import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // @ts-expect-error - allowedDevOrigins is valid but missing from some type definitions
    allowedDevOrigins: [
      "localhost:3000",
      "localhost:3001",
      "10.16.227.242:3000",
      "10.16.227.242:3001"
    ],
  },
};

export default nextConfig;
