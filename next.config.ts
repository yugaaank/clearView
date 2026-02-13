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
  async rewrites() {
    const apiHost = process.env.API_HOST || "10.16.227.242";
    const apiPort = process.env.API_PORT || "8000";
    const target = `http://${apiHost}:${apiPort}`;
    return [
      { source: "/api/:path*", destination: `${target}/api/:path*` },
      { source: "/analyze", destination: `${target}/analyze` },
    ];
  },
};

export default nextConfig;
