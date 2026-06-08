import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
  reactStrictMode: false,
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
