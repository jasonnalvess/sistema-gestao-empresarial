import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.117.134.117", "100.117.134.177", "192.168.0.120"],

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:5101/:path*",
      },
    ];
  },
};

export default nextConfig;
