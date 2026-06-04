import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
  reactStrictMode: false,
};

export default nextConfig;
