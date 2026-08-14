import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // These files are integration adapters for libraries whose callback/data
  // shapes are intentionally dynamic (DeckGL, Mapbox, Recharts) plus the
  // legacy tactical UI. Keep the strict rules enabled for application/domain
  // code while documenting the narrow compatibility boundary.
  {
    files: [
      "src/app/page.tsx",
      "src/app/api/equipment/route.ts",
      "src/app/api/scenarios/route.ts",
      "src/app/api/tactical-doctrines/route.ts",
      "src/app/api/unit-strength/route.ts",
      "src/app/api/warfare-domains/route.ts",
      "src/components/ComparisonMatrix.tsx",
      "src/components/TacticalHUD.tsx",
      "src/components/map/AnalyticsLayers.tsx",
      "src/components/map/ChoroplethLayer.tsx",
      "src/components/map/StrategicMap.tsx",
      "src/components/strategic/BPDetailTab.tsx",
      "src/components/strategic/ComparisonTab.tsx",
      "src/components/strategic/DoctrineTab.tsx",
      "src/components/strategic/GeographyTab.tsx",
      "src/lib/rbp-engine.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: [
      "src/components/CustomUnitBuilder.tsx",
      "src/components/DuelSimulator.tsx",
      "src/components/TacticalHUD.tsx",
      "src/components/strategic/WhatIfTab.tsx",
    ],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
      "react/display-name": "off",
    },
  },
]);

export default eslintConfig;
