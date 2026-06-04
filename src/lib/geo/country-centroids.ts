/**
 * Country centroids — capital city coordinates for all 51 RBP countries.
 *
 * Used by analytics deck.gl layers (ScatterplotLayer) to place
 * proportional symbols at each country's center.
 *
 * Coordinates are [longitude, latitude] of the capital city.
 * Strict TypeScript — no `any`.
 */

export interface Centroid {
  lng: number;
  lat: number;
}

/** ISO-A3 → Capital centroid lookup */
export const COUNTRY_CENTROIDS: Record<string, Centroid> = {
  // ─── Top 20 ──────────────────────────────────────────────
  USA: { lng: -77.0369, lat: 38.9072 },   // Washington, D.C.
  RUS: { lng: 37.6173, lat: 55.7558 },    // Moscow
  CHN: { lng: 116.4074, lat: 39.9042 },   // Beijing
  DEU: { lng: 13.4050, lat: 52.5200 },    // Berlin
  FRA: { lng: 2.3522, lat: 48.8566 },     // Paris
  GBR: { lng: -0.1278, lat: 51.5074 },    // London
  IND: { lng: 77.1025, lat: 28.7041 },    // New Delhi
  JPN: { lng: 139.6917, lat: 35.6895 },   // Tokyo
  KOR: { lng: 126.9780, lat: 37.5665 },   // Seoul
  BRA: { lng: -47.8822, lat: -15.7975 },  // Brasília
  AUS: { lng: 149.1287, lat: -35.2809 },  // Canberra
  CAN: { lng: -75.6972, lat: 45.4215 },   // Ottawa
  TUR: { lng: 32.8597, lat: 39.9334 },    // Ankara
  ISR: { lng: 35.2137, lat: 31.7683 },    // Jerusalem
  SAU: { lng: 46.6753, lat: 24.7136 },    // Riyadh
  IDN: { lng: 106.8456, lat: -6.2088 },   // Jakarta
  EGY: { lng: 31.2357, lat: 30.0444 },    // Cairo
  PAK: { lng: 73.0479, lat: 33.6844 },    // Islamabad
  UKR: { lng: 30.5234, lat: 50.4501 },    // Kyiv
  ITA: { lng: 12.4964, lat: 41.9028 },    // Rome

  // ─── Extended 31 ─────────────────────────────────────────
  AUT: { lng: 16.3738, lat: 48.2082 },    // Vienna
  BEL: { lng: 4.3517, lat: 50.8503 },     // Brussels
  BGR: { lng: 23.3219, lat: 42.6977 },    // Sofia
  CHE: { lng: 7.4474, lat: 46.9480 },     // Bern
  CZE: { lng: 14.4378, lat: 50.0755 },    // Prague
  ESP: { lng: -3.7038, lat: 40.4168 },    // Madrid
  EST: { lng: 24.7536, lat: 59.4370 },    // Tallinn
  FIN: { lng: 24.9384, lat: 60.1695 },    // Helsinki
  GRC: { lng: 23.7275, lat: 37.9838 },    // Athens
  HRV: { lng: 15.9800, lat: 45.8150 },    // Zagreb
  HUN: { lng: 19.0402, lat: 47.4979 },    // Budapest
  IRN: { lng: 51.3890, lat: 35.6892 },    // Tehran
  LTU: { lng: 23.8813, lat: 54.6872 },    // Vilnius
  LVA: { lng: 24.1052, lat: 56.9496 },    // Riga
  MYS: { lng: 101.6869, lat: 3.1390 },    // Kuala Lumpur
  NLD: { lng: 4.9041, lat: 52.3676 },     // Amsterdam
  NOR: { lng: 10.7522, lat: 59.9139 },    // Oslo
  NZL: { lng: 174.7633, lat: -41.2865 },  // Wellington
  PHI: { lng: 121.0582, lat: 14.5547 },   // Manila
  POL: { lng: 21.0122, lat: 52.2297 },    // Warsaw
  PRK: { lng: 125.7625, lat: 39.0392 },   // Pyongyang
  PRT: { lng: -9.1393, lat: 38.7223 },    // Lisbon
  ROU: { lng: 26.1025, lat: 44.4268 },    // Bucharest
  SGP: { lng: 103.8198, lat: 1.3521 },    // Singapore
  SRB: { lng: 20.4651, lat: 44.7866 },    // Belgrade
  SVK: { lng: 17.1077, lat: 48.1486 },    // Bratislava
  SVN: { lng: 14.5058, lat: 46.0569 },    // Ljubljana
  SWE: { lng: 18.0686, lat: 59.3293 },    // Stockholm
  THA: { lng: 100.5018, lat: 13.7563 },   // Bangkok
  TWN: { lng: 121.5654, lat: 25.0330 },   // Taipei
  VNM: { lng: 105.8342, lat: 21.0278 },   // Hanoi

  // ─── Additional 8 (CSTO / BRICS) ────────────────────────
  BLR: { lng: 27.5615, lat: 53.9045 },    // Minsk
  ARM: { lng: 44.5136, lat: 40.1872 },    // Yerevan
  KAZ: { lng: 71.4273, lat: 51.1280 },    // Astana
  KGZ: { lng: 74.5829, lat: 42.8746 },    // Bishkek
  TJK: { lng: 68.7740, lat: 38.5598 },    // Dushanbe
  ZAF: { lng: 28.1871, lat: -25.7460 },   // Pretoria
  ETH: { lng: 38.7468, lat: 9.0250 },     // Addis Ababa
  ARE: { lng: 54.3667, lat: 24.4667 },    // Abu Dhabi
};

/** Get centroid for a country ISO code — returns null if not found */
export function getCentroid(iso: string): Centroid | null {
  return COUNTRY_CENTROIDS[iso] ?? null;
}

/** Get centroid position as [lng, lat] array for deck.gl — defaults to [0, 0] */
export function getPosition(iso: string): [number, number] {
  const c = COUNTRY_CENTROIDS[iso];
  if (c) return [c.lng, c.lat];
  return [0, 0];
}

/** Total number of countries in the centroid registry */
export const CENTROID_COUNT = Object.keys(COUNTRY_CENTROIDS).length;
