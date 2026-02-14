import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    // Force all API traffic through the ngrok tunnel.
    const apiBase = "https://unstated-grimily-babette.ngrok-free.dev";
    return [
      { source: "/api/:path*", destination: `${apiBase}/api/:path*` },
      { source: "/analyze", destination: `${apiBase}/analyze` },
    ];
  },
};

export default nextConfig;
