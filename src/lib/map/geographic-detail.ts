// ─────────────────────────────────────────────────────────────────────────────
// Geographic detail overlays for the strategic map.
// Public-reference, approximate points for country labels, major cities,
// population centers, ports, air hubs and logistics nodes. These layers make the
// no-Mapbox autonomous map useful as a real strategic geography surface.
// ─────────────────────────────────────────────────────────────────────────────

import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import { getPosition } from "@/lib/geo/country-centroids";
import type { StrategicMapCountry } from "@/lib/map/strategic-map-intelligence";

type Rgba = [number, number, number, number];

export interface CountryNamePoint {
  objectKind: "countryName";
  iso: string;
  name: string;
  nameRu: string;
  position: [number, number];
  populationM: number;
  bp: number;
  side: string;
  region: string;
}

export interface CityPoint {
  objectKind: "city";
  id: string;
  name: string;
  countryIso: string;
  position: [number, number];
  populationM: number;
  role: "capital" | "megacity" | "industrial" | "port" | "military" | "regional";
  importance: number;
  isCapital?: boolean;
}

export interface StrategicNodePoint {
  objectKind: "strategicNode";
  id: string;
  name: string;
  countryIso: string;
  position: [number, number];
  nodeType: "port" | "airHub" | "logistics" | "energy" | "industrial";
  throughputScore: number;
  description: string;
}

function n(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function sideColor(side: string): Rgba {
  switch (side) {
    case "NATO": return [59, 130, 246, 220];
    case "RUS": return [239, 68, 68, 220];
    case "CHINA": return [245, 158, 11, 220];
    case "UKR": return [234, 179, 8, 220];
    default: return [148, 163, 184, 190];
  }
}

function roleColor(role: CityPoint["role"]): Rgba {
  switch (role) {
    case "capital": return [34, 211, 238, 230];
    case "megacity": return [250, 204, 21, 230];
    case "industrial": return [168, 85, 247, 220];
    case "port": return [56, 189, 248, 225];
    case "military": return [248, 113, 113, 225];
    case "regional": return [148, 163, 184, 205];
  }
}

function nodeColor(type: StrategicNodePoint["nodeType"]): Rgba {
  switch (type) {
    case "port": return [14, 165, 233, 235];
    case "airHub": return [125, 211, 252, 230];
    case "logistics": return [192, 132, 252, 225];
    case "energy": return [251, 191, 36, 230];
    case "industrial": return [34, 197, 94, 225];
  }
}

export const MAJOR_CITIES: CityPoint[] = [
  { objectKind: "city", id: "tokyo", name: "Tokyo", countryIso: "JPN", position: [139.6917, 35.6895], populationM: 37.2, role: "megacity", importance: 100, isCapital: true },
  { objectKind: "city", id: "delhi", name: "Delhi", countryIso: "IND", position: [77.1025, 28.7041], populationM: 32.9, role: "capital", importance: 98, isCapital: true },
  { objectKind: "city", id: "shanghai", name: "Shanghai", countryIso: "CHN", position: [121.4737, 31.2304], populationM: 29.2, role: "port", importance: 97 },
  { objectKind: "city", id: "dhaka", name: "Dhaka", countryIso: "BGD", position: [90.4125, 23.8103], populationM: 23.2, role: "megacity", importance: 84, isCapital: true },
  { objectKind: "city", id: "sao-paulo", name: "Sao Paulo", countryIso: "BRA", position: [-46.6333, -23.5505], populationM: 22.6, role: "industrial", importance: 90 },
  { objectKind: "city", id: "mexico-city", name: "Mexico City", countryIso: "MEX", position: [-99.1332, 19.4326], populationM: 22.3, role: "capital", importance: 88, isCapital: true },
  { objectKind: "city", id: "cairo", name: "Cairo", countryIso: "EGY", position: [31.2357, 30.0444], populationM: 22.2, role: "capital", importance: 91, isCapital: true },
  { objectKind: "city", id: "beijing", name: "Beijing", countryIso: "CHN", position: [116.4074, 39.9042], populationM: 21.8, role: "capital", importance: 99, isCapital: true },
  { objectKind: "city", id: "mumbai", name: "Mumbai", countryIso: "IND", position: [72.8777, 19.0760], populationM: 21.3, role: "port", importance: 92 },
  { objectKind: "city", id: "osaka", name: "Osaka", countryIso: "JPN", position: [135.5023, 34.6937], populationM: 19.0, role: "industrial", importance: 86 },
  { objectKind: "city", id: "karachi", name: "Karachi", countryIso: "PAK", position: [67.0011, 24.8607], populationM: 17.2, role: "port", importance: 83 },
  { objectKind: "city", id: "chongqing", name: "Chongqing", countryIso: "CHN", position: [106.5516, 29.5630], populationM: 17.0, role: "industrial", importance: 82 },
  { objectKind: "city", id: "istanbul", name: "Istanbul", countryIso: "TUR", position: [28.9784, 41.0082], populationM: 15.8, role: "port", importance: 88 },
  { objectKind: "city", id: "buenos-aires", name: "Buenos Aires", countryIso: "ARG", position: [-58.3816, -34.6037], populationM: 15.5, role: "capital", importance: 80, isCapital: true },
  { objectKind: "city", id: "kolkata", name: "Kolkata", countryIso: "IND", position: [88.3639, 22.5726], populationM: 15.3, role: "port", importance: 80 },
  { objectKind: "city", id: "kinshasa", name: "Kinshasa", countryIso: "COD", position: [15.2663, -4.4419], populationM: 15.0, role: "capital", importance: 72, isCapital: true },
  { objectKind: "city", id: "manila", name: "Manila", countryIso: "PHI", position: [120.9842, 14.5995], populationM: 14.7, role: "capital", importance: 84, isCapital: true },
  { objectKind: "city", id: "lagos", name: "Lagos", countryIso: "NGA", position: [3.3792, 6.5244], populationM: 14.5, role: "port", importance: 78 },
  { objectKind: "city", id: "tianjin", name: "Tianjin", countryIso: "CHN", position: [117.2000, 39.1333], populationM: 14.0, role: "port", importance: 80 },
  { objectKind: "city", id: "guangzhou", name: "Guangzhou", countryIso: "CHN", position: [113.2644, 23.1291], populationM: 13.9, role: "industrial", importance: 86 },
  { objectKind: "city", id: "moscow", name: "Moscow", countryIso: "RUS", position: [37.6173, 55.7558], populationM: 12.7, role: "capital", importance: 98, isCapital: true },
  { objectKind: "city", id: "shenzhen", name: "Shenzhen", countryIso: "CHN", position: [114.0579, 22.5431], populationM: 12.6, role: "industrial", importance: 88 },
  { objectKind: "city", id: "lahore", name: "Lahore", countryIso: "PAK", position: [74.3587, 31.5204], populationM: 12.5, role: "regional", importance: 75 },
  { objectKind: "city", id: "bangalore", name: "Bengaluru", countryIso: "IND", position: [77.5946, 12.9716], populationM: 12.3, role: "industrial", importance: 84 },
  { objectKind: "city", id: "paris", name: "Paris", countryIso: "FRA", position: [2.3522, 48.8566], populationM: 11.2, role: "capital", importance: 92, isCapital: true },
  { objectKind: "city", id: "bogota", name: "Bogota", countryIso: "COL", position: [-74.0721, 4.7110], populationM: 11.2, role: "capital", importance: 72, isCapital: true },
  { objectKind: "city", id: "jakarta", name: "Jakarta", countryIso: "IDN", position: [106.8456, -6.2088], populationM: 11.0, role: "capital", importance: 87, isCapital: true },
  { objectKind: "city", id: "lima", name: "Lima", countryIso: "PER", position: [-77.0428, -12.0464], populationM: 10.8, role: "capital", importance: 70, isCapital: true },
  { objectKind: "city", id: "bangkok", name: "Bangkok", countryIso: "THA", position: [100.5018, 13.7563], populationM: 10.7, role: "capital", importance: 82, isCapital: true },
  { objectKind: "city", id: "seoul", name: "Seoul", countryIso: "KOR", position: [126.9780, 37.5665], populationM: 9.9, role: "capital", importance: 94, isCapital: true },
  { objectKind: "city", id: "london", name: "London", countryIso: "GBR", position: [-0.1278, 51.5074], populationM: 9.6, role: "capital", importance: 94, isCapital: true },
  { objectKind: "city", id: "tehran", name: "Tehran", countryIso: "IRN", position: [51.3890, 35.6892], populationM: 9.5, role: "capital", importance: 86, isCapital: true },
  { objectKind: "city", id: "chennai", name: "Chennai", countryIso: "IND", position: [80.2707, 13.0827], populationM: 9.3, role: "port", importance: 78 },
  { objectKind: "city", id: "ho-chi-minh", name: "Ho Chi Minh City", countryIso: "VNM", position: [106.6297, 10.8231], populationM: 9.1, role: "port", importance: 78 },
  { objectKind: "city", id: "riyadh", name: "Riyadh", countryIso: "SAU", position: [46.6753, 24.7136], populationM: 8.6, role: "capital", importance: 84, isCapital: true },
  { objectKind: "city", id: "baghdad", name: "Baghdad", countryIso: "IRQ", position: [44.3661, 33.3152], populationM: 8.1, role: "capital", importance: 75, isCapital: true },
  { objectKind: "city", id: "singapore", name: "Singapore", countryIso: "SGP", position: [103.8198, 1.3521], populationM: 5.9, role: "port", importance: 94, isCapital: true },
  { objectKind: "city", id: "washington", name: "Washington DC", countryIso: "USA", position: [-77.0369, 38.9072], populationM: 6.3, role: "capital", importance: 97, isCapital: true },
  { objectKind: "city", id: "new-york", name: "New York", countryIso: "USA", position: [-74.0060, 40.7128], populationM: 18.8, role: "megacity", importance: 96 },
  { objectKind: "city", id: "los-angeles", name: "Los Angeles", countryIso: "USA", position: [-118.2437, 34.0522], populationM: 12.5, role: "port", importance: 90 },
  { objectKind: "city", id: "chicago", name: "Chicago", countryIso: "USA", position: [-87.6298, 41.8781], populationM: 8.9, role: "regional", importance: 84 },
  { objectKind: "city", id: "houston", name: "Houston", countryIso: "USA", position: [-95.3698, 29.7604], populationM: 7.1, role: "industrial", importance: 83 },
  { objectKind: "city", id: "norfolk", name: "Norfolk", countryIso: "USA", position: [-76.2859, 36.8508], populationM: 1.8, role: "military", importance: 88 },
  { objectKind: "city", id: "san-diego", name: "San Diego", countryIso: "USA", position: [-117.1611, 32.7157], populationM: 3.3, role: "military", importance: 85 },
  { objectKind: "city", id: "berlin", name: "Berlin", countryIso: "DEU", position: [13.4050, 52.5200], populationM: 4.8, role: "capital", importance: 88, isCapital: true },
  { objectKind: "city", id: "hamburg", name: "Hamburg", countryIso: "DEU", position: [9.9937, 53.5511], populationM: 5.3, role: "port", importance: 82 },
  { objectKind: "city", id: "munich", name: "Munich", countryIso: "DEU", position: [11.5820, 48.1351], populationM: 6.0, role: "industrial", importance: 80 },
  { objectKind: "city", id: "warsaw", name: "Warsaw", countryIso: "POL", position: [21.0122, 52.2297], populationM: 3.1, role: "capital", importance: 83, isCapital: true },
  { objectKind: "city", id: "kyiv", name: "Kyiv", countryIso: "UKR", position: [30.5234, 50.4501], populationM: 3.0, role: "capital", importance: 88, isCapital: true },
  { objectKind: "city", id: "kharkiv", name: "Kharkiv", countryIso: "UKR", position: [36.2304, 49.9935], populationM: 1.4, role: "industrial", importance: 78 },
  { objectKind: "city", id: "odesa", name: "Odesa", countryIso: "UKR", position: [30.7233, 46.4825], populationM: 1.0, role: "port", importance: 80 },
  { objectKind: "city", id: "saint-petersburg", name: "Saint Petersburg", countryIso: "RUS", position: [30.3351, 59.9343], populationM: 5.6, role: "port", importance: 86 },
  { objectKind: "city", id: "kaliningrad", name: "Kaliningrad", countryIso: "RUS", position: [20.4522, 54.7104], populationM: 0.5, role: "military", importance: 84 },
  { objectKind: "city", id: "sevastopol", name: "Sevastopol", countryIso: "RUS", position: [33.5224, 44.6167], populationM: 0.5, role: "military", importance: 82 },
  { objectKind: "city", id: "vladivostok", name: "Vladivostok", countryIso: "RUS", position: [131.8855, 43.1155], populationM: 0.6, role: "port", importance: 80 },
  { objectKind: "city", id: "ankara", name: "Ankara", countryIso: "TUR", position: [32.8597, 39.9334], populationM: 5.7, role: "capital", importance: 82, isCapital: true },
  { objectKind: "city", id: "rome", name: "Rome", countryIso: "ITA", position: [12.4964, 41.9028], populationM: 4.3, role: "capital", importance: 83, isCapital: true },
  { objectKind: "city", id: "milan", name: "Milan", countryIso: "ITA", position: [9.1900, 45.4642], populationM: 6.2, role: "industrial", importance: 78 },
  { objectKind: "city", id: "madrid", name: "Madrid", countryIso: "ESP", position: [-3.7038, 40.4168], populationM: 6.8, role: "capital", importance: 82, isCapital: true },
  { objectKind: "city", id: "brussels", name: "Brussels", countryIso: "BEL", position: [4.3517, 50.8503], populationM: 2.1, role: "capital", importance: 86, isCapital: true },
  { objectKind: "city", id: "amsterdam", name: "Amsterdam", countryIso: "NLD", position: [4.9041, 52.3676], populationM: 2.5, role: "capital", importance: 82, isCapital: true },
  { objectKind: "city", id: "rotterdam", name: "Rotterdam", countryIso: "NLD", position: [4.4777, 51.9244], populationM: 1.2, role: "port", importance: 86 },
  { objectKind: "city", id: "oslo", name: "Oslo", countryIso: "NOR", position: [10.7522, 59.9139], populationM: 1.1, role: "capital", importance: 77, isCapital: true },
  { objectKind: "city", id: "stockholm", name: "Stockholm", countryIso: "SWE", position: [18.0686, 59.3293], populationM: 2.4, role: "capital", importance: 78, isCapital: true },
  { objectKind: "city", id: "helsinki", name: "Helsinki", countryIso: "FIN", position: [24.9384, 60.1699], populationM: 1.3, role: "capital", importance: 78, isCapital: true },
  { objectKind: "city", id: "taipei", name: "Taipei", countryIso: "TWN", position: [121.5654, 25.0330], populationM: 7.0, role: "capital", importance: 90, isCapital: true },
  { objectKind: "city", id: "kaohsiung", name: "Kaohsiung", countryIso: "TWN", position: [120.3014, 22.6273], populationM: 2.7, role: "port", importance: 80 },
  { objectKind: "city", id: "pyongyang", name: "Pyongyang", countryIso: "PRK", position: [125.7625, 39.0392], populationM: 3.0, role: "capital", importance: 82, isCapital: true },
  { objectKind: "city", id: "busan", name: "Busan", countryIso: "KOR", position: [129.0756, 35.1796], populationM: 3.5, role: "port", importance: 82 },
  { objectKind: "city", id: "yokohama", name: "Yokohama", countryIso: "JPN", position: [139.6380, 35.4437], populationM: 3.8, role: "port", importance: 82 },
  { objectKind: "city", id: "sydney", name: "Sydney", countryIso: "AUS", position: [151.2093, -33.8688], populationM: 5.3, role: "port", importance: 80 },
  { objectKind: "city", id: "canberra", name: "Canberra", countryIso: "AUS", position: [149.1287, -35.2809], populationM: 0.5, role: "capital", importance: 75, isCapital: true },
  { objectKind: "city", id: "darwin", name: "Darwin", countryIso: "AUS", position: [130.8456, -12.4634], populationM: 0.15, role: "military", importance: 78 },
  { objectKind: "city", id: "ottawa", name: "Ottawa", countryIso: "CAN", position: [-75.6972, 45.4215], populationM: 1.5, role: "capital", importance: 78, isCapital: true },
  { objectKind: "city", id: "toronto", name: "Toronto", countryIso: "CAN", position: [-79.3832, 43.6532], populationM: 6.3, role: "industrial", importance: 80 },
  { objectKind: "city", id: "vancouver", name: "Vancouver", countryIso: "CAN", position: [-123.1207, 49.2827], populationM: 2.6, role: "port", importance: 78 },
  { objectKind: "city", id: "jerusalem", name: "Jerusalem", countryIso: "ISR", position: [35.2137, 31.7683], populationM: 1.0, role: "capital", importance: 86, isCapital: true },
  { objectKind: "city", id: "tel-aviv", name: "Tel Aviv", countryIso: "ISR", position: [34.7818, 32.0853], populationM: 4.4, role: "industrial", importance: 84 },
  { objectKind: "city", id: "dubai", name: "Dubai", countryIso: "ARE", position: [55.2708, 25.2048], populationM: 3.6, role: "port", importance: 82 },
  { objectKind: "city", id: "doha", name: "Doha", countryIso: "QAT", position: [51.5310, 25.2854], populationM: 2.4, role: "capital", importance: 78, isCapital: true },
  { objectKind: "city", id: "jeddah", name: "Jeddah", countryIso: "SAU", position: [39.1925, 21.4858], populationM: 4.7, role: "port", importance: 76 },
  { objectKind: "city", id: "cape-town", name: "Cape Town", countryIso: "ZAF", position: [18.4241, -33.9249], populationM: 4.8, role: "port", importance: 74 },
  { objectKind: "city", id: "pretoria", name: "Pretoria", countryIso: "ZAF", position: [28.1871, -25.7461], populationM: 2.6, role: "capital", importance: 72, isCapital: true },
];

export const STRATEGIC_NODES: StrategicNodePoint[] = [
  { objectKind: "strategicNode", id: "port-shanghai", name: "Port of Shanghai", countryIso: "CHN", position: [121.8, 31.2], nodeType: "port", throughputScore: 100, description: "World-scale container and naval-adjacent logistics hub." },
  { objectKind: "strategicNode", id: "port-singapore", name: "Singapore Port", countryIso: "SGP", position: [103.8, 1.25], nodeType: "port", throughputScore: 98, description: "Critical Malacca gateway and Indo-Pacific transshipment hub." },
  { objectKind: "strategicNode", id: "port-rotterdam", name: "Rotterdam Port", countryIso: "NLD", position: [4.1, 51.95], nodeType: "port", throughputScore: 94, description: "Major European sea logistics and energy entry point." },
  { objectKind: "strategicNode", id: "port-los-angeles", name: "LA / Long Beach", countryIso: "USA", position: [-118.25, 33.75], nodeType: "port", throughputScore: 92, description: "US Pacific container gateway and sustainment hub." },
  { objectKind: "strategicNode", id: "port-norfolk", name: "Norfolk / Hampton Roads", countryIso: "USA", position: [-76.32, 36.95], nodeType: "port", throughputScore: 91, description: "US Atlantic naval and sealift concentration." },
  { objectKind: "strategicNode", id: "port-yokohama", name: "Yokohama / Tokyo Bay", countryIso: "JPN", position: [139.7, 35.45], nodeType: "port", throughputScore: 89, description: "Japanese industrial basin and US-allied naval access." },
  { objectKind: "strategicNode", id: "port-busan", name: "Busan Port", countryIso: "KOR", position: [129.05, 35.1], nodeType: "port", throughputScore: 88, description: "Korean peninsula logistics and reinforcement node." },
  { objectKind: "strategicNode", id: "port-hamburg", name: "Hamburg Port", countryIso: "DEU", position: [9.97, 53.54], nodeType: "port", throughputScore: 82, description: "North European industrial and military mobility node." },
  { objectKind: "strategicNode", id: "port-gdansk", name: "Gdansk Port", countryIso: "POL", position: [18.65, 54.35], nodeType: "port", throughputScore: 76, description: "Baltic sustainment node for NATO eastern flank." },
  { objectKind: "strategicNode", id: "port-odesa", name: "Odesa Port", countryIso: "UKR", position: [30.74, 46.49], nodeType: "port", throughputScore: 70, description: "Black Sea economic and military logistics node." },
  { objectKind: "strategicNode", id: "air-ramstein", name: "Ramstein Air Hub", countryIso: "DEU", position: [7.6, 49.44], nodeType: "airHub", throughputScore: 95, description: "Core US/NATO air mobility and command hub in Europe." },
  { objectKind: "strategicNode", id: "air-dover", name: "Dover Air Mobility", countryIso: "USA", position: [-75.47, 39.13], nodeType: "airHub", throughputScore: 88, description: "US strategic airlift gateway for Atlantic reinforcement." },
  { objectKind: "strategicNode", id: "air-guam", name: "Guam Air-Sea Hub", countryIso: "USA", position: [144.8, 13.48], nodeType: "airHub", throughputScore: 88, description: "Forward Indo-Pacific bomber, tanker and submarine support hub." },
  { objectKind: "strategicNode", id: "air-kadena", name: "Kadena / Okinawa", countryIso: "JPN", position: [127.77, 26.35], nodeType: "airHub", throughputScore: 86, description: "Forward airpower node inside the first island chain." },
  { objectKind: "strategicNode", id: "air-incirlik", name: "Incirlik Air Base", countryIso: "TUR", position: [35.43, 37.0], nodeType: "airHub", throughputScore: 76, description: "Eastern Mediterranean and Middle East air access point." },
  { objectKind: "strategicNode", id: "log-suwalki", name: "Suwalki Corridor", countryIso: "POL", position: [23.25, 54.1], nodeType: "logistics", throughputScore: 83, description: "NATO Baltic land corridor and high-risk mobility bottleneck." },
  { objectKind: "strategicNode", id: "log-fulda", name: "Central Europe Mobility", countryIso: "DEU", position: [9.67, 50.55], nodeType: "logistics", throughputScore: 82, description: "Road/rail concentration for European reinforcement flows." },
  { objectKind: "strategicNode", id: "log-pol-ukr", name: "Poland-Ukraine Gateway", countryIso: "POL", position: [23.95, 50.05], nodeType: "logistics", throughputScore: 80, description: "Cross-border rail and road sustainment into Ukraine." },
  { objectKind: "strategicNode", id: "energy-hormuz", name: "Hormuz Energy Gate", countryIso: "IRN", position: [56.35, 26.55], nodeType: "energy", throughputScore: 92, description: "Energy chokepoint and missile/drone denial environment." },
  { objectKind: "strategicNode", id: "energy-suez", name: "Suez Energy/Trade", countryIso: "EGY", position: [32.55, 30.0], nodeType: "energy", throughputScore: 91, description: "Strategic canal for Europe-Asia trade and energy flows." },
  { objectKind: "strategicNode", id: "ind-taiwan-hsinchu", name: "Hsinchu Semiconductor", countryIso: "TWN", position: [120.97, 24.8], nodeType: "industrial", throughputScore: 92, description: "High-end semiconductor manufacturing concentration." },
  { objectKind: "strategicNode", id: "ind-ru-urals", name: "Ural Defense Industry", countryIso: "RUS", position: [60.6, 56.8], nodeType: "industrial", throughputScore: 80, description: "Russian heavy industry and defense production basin." },
  { objectKind: "strategicNode", id: "ind-us-gulf", name: "US Gulf Energy Belt", countryIso: "USA", position: [-95.0, 29.5], nodeType: "energy", throughputScore: 88, description: "Energy, petrochemical and military-industrial support region." },
  { objectKind: "strategicNode", id: "ind-pearl-river", name: "Pearl River Delta", countryIso: "CHN", position: [113.6, 22.7], nodeType: "industrial", throughputScore: 94, description: "Chinese manufacturing, electronics and port complex." },
];

function visibleCities(zoom: number): CityPoint[] {
  const minImportance = zoom < 2.0 ? 92 : zoom < 2.8 ? 86 : zoom < 3.8 ? 80 : zoom < 5.0 ? 72 : 0;
  const maxCount = zoom < 2.0 ? 14 : zoom < 2.8 ? 24 : zoom < 3.8 ? 38 : zoom < 5.0 ? 64 : MAJOR_CITIES.length;
  return [...MAJOR_CITIES]
    .filter((city) => city.importance >= minImportance || (zoom >= 3.2 && city.isCapital))
    .sort((a, b) => b.importance - a.importance || b.populationM - a.populationM)
    .slice(0, maxCount);
}

function visibleNodes(zoom: number): StrategicNodePoint[] {
  const minThroughput = zoom < 1.8 ? 86 : zoom < 2.8 ? 76 : 0;
  return STRATEGIC_NODES.filter((node) => node.throughputScore >= minThroughput);
}

export function buildCountryNamePoints(countries: ReadonlyArray<StrategicMapCountry>): CountryNamePoint[] {
  return countries
    .map((country) => ({
      objectKind: "countryName" as const,
      iso: country.isoCode,
      name: country.name,
      nameRu: country.nameRu,
      position: getPosition(country.isoCode),
      populationM: n(country.populationM),
      bp: n(country.bpAdvanced ?? country.bpTotal),
      side: country.side ?? "NEUTRAL",
      region: country.region ?? "—",
    }))
    .sort((a, b) => b.bp - a.bp);
}

export function createCountryNameLayer(countries: ReadonlyArray<StrategicMapCountry>, zoom: number, pickable = true): Layer {
  const maxCount = zoom < 2.2 ? 10 : zoom < 3.2 ? 18 : zoom < 4.5 ? 32 : countries.length;
  const data = buildCountryNamePoints(countries).slice(0, maxCount);

  return new TextLayer<CountryNamePoint>({
    id: `geo-country-labels-${Math.round(zoom * 10)}`,
    data,
    pickable,
    getPosition: (d) => d.position,
    getText: (d) => (zoom < 3.8 ? d.iso : `${d.iso} ${d.name}`),
    getSize: (d) => 8 + clamp(d.bp) / 18 + Math.max(0, zoom - 2.5) * 1.1,
    getColor: (d) => {
      const color = sideColor(d.side);
      return [color[0], color[1], color[2], zoom < 3 ? 170 : color[3]];
    },
    getTextAnchor: "middle",
    getAlignmentBaseline: "center",
    background: true,
    getBackgroundColor: [2, 6, 23, 190],
    backgroundPadding: [4, 2],
    fontFamily: "monospace",
  });
}

export function createMajorCityLayers(zoom: number): Layer[] {
  const data = visibleCities(zoom);
  const cityPoints = new ScatterplotLayer<CityPoint>({
    id: `geo-city-points-${Math.round(zoom * 10)}`,
    data,
    pickable: true,
    radiusUnits: "meters",
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: (d) => d.position,
    getRadius: (d) => 18000 + Math.sqrt(Math.max(d.populationM, 0.1)) * 18500,
    getFillColor: (d) => roleColor(d.role),
    getLineColor: [226, 232, 240, 210],
    radiusMinPixels: 3,
    radiusMaxPixels: 20,
  });

  const cityLabels = new TextLayer<CityPoint>({
    id: `geo-city-labels-${Math.round(zoom * 10)}`,
    data: zoom < 2.5 ? data.slice(0, 12) : zoom < 3.8 ? data.slice(0, 24) : data,
    pickable: false,
    getPosition: (d) => d.position,
    getText: (d) => (zoom < 3.8 ? d.name : `${d.name} ${d.populationM >= 10 ? d.populationM.toFixed(0) : d.populationM.toFixed(1)}M`),
    getSize: (d) => 7 + Math.min(4, Math.sqrt(d.populationM)) + Math.max(0, zoom - 3) * 0.75,
    getColor: [226, 232, 240, zoom < 3.2 ? 180 : 220],
    getPixelOffset: [0, -13],
    getTextAnchor: "middle",
    getAlignmentBaseline: "bottom",
    background: true,
    getBackgroundColor: [2, 6, 23, 170],
    backgroundPadding: [3, 2],
    fontFamily: "monospace",
  });

  return [cityPoints, cityLabels];
}

export function createStrategicNodeLayers(zoom: number): Layer[] {
  const data = visibleNodes(zoom);
  const nodePoints = new ScatterplotLayer<StrategicNodePoint>({
    id: `geo-node-points-${Math.round(zoom * 10)}`,
    data,
    pickable: true,
    radiusUnits: "meters",
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: (d) => d.position,
    getRadius: (d) => 22000 + d.throughputScore * 900,
    getFillColor: (d) => nodeColor(d.nodeType),
    getLineColor: [226, 232, 240, 220],
    radiusMinPixels: 4,
    radiusMaxPixels: 18,
  });

  const nodeLabels = new TextLayer<StrategicNodePoint>({
    id: `geo-node-labels-${Math.round(zoom * 10)}`,
    data: zoom < 2.0 ? data.slice(0, 14) : data,
    pickable: false,
    getPosition: (d) => d.position,
    getText: (d) => `${d.nodeType.toUpperCase()} ${d.name}`,
    getSize: 9,
    getColor: [226, 232, 240, 220],
    getPixelOffset: [0, 14],
    getTextAnchor: "middle",
    getAlignmentBaseline: "top",
    background: true,
    getBackgroundColor: [2, 6, 23, 165],
    backgroundPadding: [3, 2],
    fontFamily: "monospace",
  });

  return [nodePoints, nodeLabels];
}

export function createGeographicDetailLayers(countries: ReadonlyArray<StrategicMapCountry>, zoom: number): Layer[] {
  return [
    createCountryNameLayer(countries, zoom),
    ...createMajorCityLayers(zoom),
    ...createStrategicNodeLayers(zoom),
  ];
}
