/**
 * Download Natural Earth 110m admin_0 countries GeoJSON
 * and save to public/data/countries.geojson
 *
 * Usage: npx tsx src/scripts/download-geojson.ts
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const NATURAL_EARTH_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

const OUTPUT_DIR = join(process.cwd(), "public", "data");
const OUTPUT_FILE = join(OUTPUT_DIR, "countries.geojson");

interface DownloadResult {
  success: boolean;
  path: string;
  size: number;
  featureCount: number;
}

async function downloadGeoJson(): Promise<DownloadResult> {
  console.log("[download-geojson] Fetching Natural Earth 110m admin_0...");

  const response = await fetch(NATURAL_EARTH_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch GeoJSON: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (data.type !== "FeatureCollection") {
    throw new Error(
      `Invalid GeoJSON: expected FeatureCollection, got ${data.type}`
    );
  }

  const featureCount: number = data.features?.length ?? 0;
  console.log(
    `[download-geojson] Downloaded ${featureCount} country features`
  );

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write with pretty formatting for debugging
  const jsonStr = JSON.stringify(data, null, 2);
  writeFileSync(OUTPUT_FILE, jsonStr, "utf-8");

  const size = Buffer.byteLength(jsonStr, "utf-8");
  console.log(
    `[download-geojson] Saved to ${OUTPUT_FILE} (${(size / 1024).toFixed(1)} KB)`
  );

  // Validate: check that we have expected properties
  if (featureCount > 0) {
    const firstFeature = data.features[0];
    const props = firstFeature?.properties ?? {};
    const hasISO = "adm0_a3" in props || "ISO_A3" in props;
    const hasName = "name" in props || "NAME" in props;
    console.log(
      `[download-geojson] Validation: hasISO=${hasISO}, hasName=${hasName}`
    );
    console.log(
      `[download-geojson] Sample properties: ${Object.keys(props).slice(0, 10).join(", ")}`
    );

    if (!hasISO) {
      console.warn(
        "[download-geojson] WARNING: No ISO_A3 or adm0_a3 property found. " +
          "Country identification may not work correctly."
      );
    }
  }

  return {
    success: true,
    path: OUTPUT_FILE,
    size,
    featureCount,
  };
}

downloadGeoJson().catch((err: unknown) => {
  console.error("[download-geojson] Fatal error:", err);
  process.exit(1);
});
