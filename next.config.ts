import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  reactStrictMode: false,
  // Render free — 512 МБ RAM: typecheck-воркер next build упирается в потолок
  // (замер 2026-11-13: OOM при heap 400 МБ, фаза Running TypeScript).
  // На Render пропускаем typecheck при сборке — его отдельно гоняет CI
  // (npm run typecheck на каждый PR/push). Локальные сборки не затронуты.
  typescript: {
    ignoreBuildErrors: process.env.RENDER === "true",
  },
};

export default nextConfig;
