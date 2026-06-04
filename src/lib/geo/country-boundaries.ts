"use client";

import type { Feature, FeatureCollection, Polygon, MultiPolygon, Position } from "geojson";

/** ISO 3166-1 alpha-3 country code */
export type ISO3 = string;

/** GeoJSON properties from Natural Earth 110m admin_0 dataset.
 *  Natural Earth uses UPPERCASE keys (ADM0_A3, NAME, POP_EST, etc).
 *  We type them lowercase for ergonomic access but normalize at runtime.
 */
export interface NaturalEarthProperties {
  featurecla: string;
  scalerank: number;
  LABELRANK: number;
  SOVEREIGNT: string;
  SOV_A3: string;
  ADM0_DIF: number;
  LEVEL: number;
  TYPE: string;
  TLC: string;
  ADMIN: string;
  ISO_A3: ISO3;
  ISO_A3_EH: ISO3;
  ISO_A2: string;
  ISO_A2_EH: string;
  ISO_N3: string;
  ISO_N3_EH: string;
  UN_A3: string;
  WB_A3: string;
  ADM0_A3: ISO3;
  ADM0_ISO: string;
  GEOU_DIF: number;
  GEOUNIT: string;
  GU_A3: string;
  SU_DIF: number;
  SUBUNIT: string;
  SU_A3: string;
  BRK_DIF: number;
  NAME: string;
  NAME_LONG: string;
  BRK_A3: string;
  BRK_NAME: string;
  BRK_GROUP: string;
  ABBREV: string;
  POSTAL: string;
  FORMAL_EN: string;
  FORMAL_FR: string;
  POP_EST: number;
  POP_RANK: number;
  GDP_MD_EST: number;
  POP_YEAR: number;
  LASTCENSUS: number;
  GDP_YEAR: number;
  ECONOMY: string;
  INCOME_GRP: string;
  CONTINENT: string;
  REGION_UN: string;
  SUBREGION: string;
  REGION_WB: string;
  [key: string]: string | number | unknown;
}

export type CountryFeature = Feature<Polygon | MultiPolygon, NaturalEarthProperties>;
export type CountryCollection = FeatureCollection<Polygon | MultiPolygon, NaturalEarthProperties>;

/** In-memory cache for GeoJSON data */
let cachedGeoJson: CountryCollection | null = null;
let loadPromise: Promise<CountryCollection> | null = null;

const GEOJSON_PATH = "/data/countries.geojson";

/** Load country boundaries GeoJSON with caching */
export async function loadCountryBoundaries(): Promise<CountryCollection> {
  if (cachedGeoJson) return cachedGeoJson;
  if (loadPromise) return loadPromise;

  loadPromise = fetch(GEOJSON_PATH)
    .then((res: Response) => {
      if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`);
      return res.json() as Promise<CountryCollection>;
    })
    .then((data: CountryCollection) => {
      cachedGeoJson = data;
      return data;
    });

  return loadPromise;
}

/** Clear the cached GeoJSON (useful for hot-reload / data refresh) */
export function clearBoundaryCache(): void {
  cachedGeoJson = null;
  loadPromise = null;
}

/** Build ISO→Feature lookup map from the collection */
export function buildISOLookup(
  collection: CountryCollection
): Map<ISO3, CountryFeature> {
  const map = new Map<ISO3, CountryFeature>();
  for (const feature of collection.features) {
    const iso = extractISO(feature);
    if (iso) map.set(iso, feature);
  }
  return map;
}

/** Extract the ISO-A3 code from a feature, trying multiple property names */
function extractISO(feature: CountryFeature): ISO3 | null {
  const props = feature.properties;
  // ISO_A3 is the most standard ISO 3166-1 alpha-3 code
  if (props.ISO_A3 && props.ISO_A3 !== "-99") return props.ISO_A3 as ISO3;
  if (props.ADM0_A3 && props.ADM0_A3 !== "-99") return props.ADM0_A3 as ISO3;
  if (props.GU_A3 && props.GU_A3 !== "-99") return props.GU_A3 as ISO3;
  return null;
}

/** Point-in-polygon check using ray casting algorithm */
function pointInPolygonRing(
  point: [number, number],
  ring: Position[]
): boolean {
  const [px, py] = point;
  let inside = false;
  const len = ring.length;
  for (let i = 0, j = len - 1; i < len; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Check if a point is inside a Polygon or MultiPolygon geometry */
function pointInGeometry(
  lon: number,
  lat: number,
  geometry: Polygon | MultiPolygon
): boolean {
  const pt: [number, number] = [lon, lat];
  if (geometry.type === "Polygon") {
    // Point must be inside the outer ring and outside all holes
    return pointInPolygonRing(pt, geometry.coordinates[0]);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) =>
      pointInPolygonRing(pt, polygon[0])
    );
  }
  return false;
}

/** Find the ISO-A3 code of the country at given lon/lat coordinates */
export function findISOFromCoords(
  collection: CountryCollection,
  lon: number,
  lat: number
): ISO3 | null {
  for (const feature of collection.features) {
    if (pointInGeometry(lon, lat, feature.geometry)) {
      return extractISO(feature);
    }
  }
  return null;
}

/** Merge country GeoJSON with BP data — enriches each feature with bpScore */
export function mergeWithBPData(
  collection: CountryCollection,
  bpData: ReadonlyArray<CountryBPRecord>
): CountryCollection {
  const bpMap = new Map<ISO3, CountryBPRecord>();
  for (const record of bpData) {
    bpMap.set(record.iso, record);
  }

  return {
    type: "FeatureCollection",
    features: collection.features.map((feature) => {
      const iso = extractISO(feature);
      const bp = iso ? bpMap.get(iso) : undefined;
      return {
        ...feature,
        properties: {
          ...feature.properties,
          bpScore: bp?.bpScore ?? 0,
          bpRank: bp?.bpRank ?? null,
        },
      };
    }),
  };
}

/** BP data record for a single country */
export interface CountryBPRecord {
  iso: ISO3;
  name: string;
  bpScore: number;
  bpRank: number | null;
}

/** Get the list of all unique ISO codes in the collection */
export function getAllISOCodes(collection: CountryCollection): ISO3[] {
  const codes: ISO3[] = [];
  for (const feature of collection.features) {
    const iso = extractISO(feature);
    if (iso) codes.push(iso);
  }
  return codes;
}
