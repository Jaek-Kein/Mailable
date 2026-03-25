import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverBodySizeLimit: "10mb",
  },
};

export default nextConfig;
