// ─────────────────────────────────────────────────────────────────────────────
// App Constants
// Shared constants for РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

// ─── BP Model ─────────────────────────────────────────────────────────────────
export const BP_COMPONENTS = ["weapon", "manpower", "logistics", "c2", "economy", "doctrine", "readiness", "terrain"] as const;
export const BP_WEIGHTS = { weapon: 0.20, manpower: 0.15, logistics: 0.12, c2: 0.10, economy: 0.15, doctrine: 0.08, readiness: 0.10, terrain: 0.10 } as const;
export const BP_MAX = 100;
export const BP_TIERS: Record<string, [number, number]> = {
  hyperpower: [90, 100],
  superpower: [80, 90],
  great_power: [70, 80],
  regional_power: [55, 70],
  middle_power: [40, 55],
  minor_power: [25, 40],
  micro_state: [0, 25],
};

// ─── Map ───────────────────────────────────────────────────────────────────────
export const MAP_DEFAULT_CENTER = { latitude: 50, longitude: 30 } as const;
export const MAP_DEFAULT_ZOOM = 3;
export const MAP_MIN_ZOOM = 1;
export const MAP_MAX_ZOOM = 15;

// ─── Sides ─────────────────────────────────────────────────────────────────────
export const MILITARY_SIDES = ["west", "east", "non_aligned", "neutral"] as const;
export const SIDE_COLORS: Record<string, string> = {
  west: "#3b82f6",
  east: "#ef4444",
  non_aligned: "#f59e0b",
  neutral: "#6b7280",
};

// ─── Regions ──────────────────────────────────────────────────────────────────
export const REGIONS = ["Europe", "East Asia", "South Asia", "Middle East", "North America", "Africa", "South America", "Central Asia", "Oceania"] as const;
export const REGION_RU: Record<string, string> = {
  Europe: "Европа",
  "East Asia": "Восточная Азия",
  "South Asia": "Южная Азия",
  "Middle East": "Ближний Восток",
  "North America": "Северная Америка",
  Africa: "Африка",
  "South America": "Южная Америка",
  "Central Asia": "Центральная Азия",
  Oceania: "Океания",
};

// ─── Data Sources ─────────────────────────────────────────────────────────────
export const DATA_SOURCE_LABELS: Record<string, string> = {
  gfp: "GFP 2025",
  worldbank: "World Bank",
  fas: "FAS Nuclear",
  sipri: "SIPRI",
  iiss: "IISS MB",
  cia: "CIA Factbook",
  custom: "Ручная проверка",
};

// ─── UI Colors ─────────────────────────────────────────────────────────────────
export const HUD_COLORS = {
  cyan: "#06b6d4",
  teal: "#14b8a6",
  emerald: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
  slate: "#64748b",
  glass: "rgba(15, 23, 42, 0.85)",
  glassBorder: "rgba(6, 182, 212, 0.2)",
  glow: "rgba(6, 182, 212, 0.15)",
} as const;

// ─── Nuclear ──────────────────────────────────────────────────────────────────
export const NUCLEAR_STATES_ISO = ["USA", "RUS", "CHN", "GBR", "FRA", "IND", "PAK", "PRK", "ISR"] as const;
export const COMPLETE_TRIAD_STATES = ["USA", "RUS", "CHN"] as const;

// ─── Version ──────────────────────────────────────────────────────────────────
export const APP_VERSION = "2.0.0";
export const APP_NAME_RU = "РБП-Стратег";
export const APP_DESCRIPTION_RU = "Система анализа боевого потенциала государств";
