import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    // Default all API traffic (including /analyze) to the ngrok tunnel unless overridden.
    const apiBase = process.env.API_BASE || "http://127.0.0.1:8000";
    return [
      { source: "/api/:path*", destination: `${apiBase}/api/:path*` },
      { source: "/analyze", destination: `${apiBase}/analyze` },
    ];
  },
};

export default nextConfig;
