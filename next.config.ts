import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  async rewrites() {
    return [
      {
        source: "/((?!api/|_next/|public/|favicon\\.ico|favicon\\.svg|apple-touch-icon\\.png|.*\\..*).*)",
        destination: "/index.html",
      },
    ];
  },
};

export default nextConfig;
