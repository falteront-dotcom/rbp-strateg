// ─────────────────────────────────────────────────────────────────────────────
// NATO Symbol Renderer
// APP-6D / MIL-STD-2525C standard military symbology for tactical map
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

export type SymbolSide = "blue" | "red" | "neutral" | "unknown";
export type SymbolDomain = "air" | "ground" | "sea" | "subsurface" | "sof";
export type SymbolCategory = "unit" | "equipment" | "installation";

export interface MILSymbolParams {
  sidc: string;            // Standard Identifier Code (10-char)
  side: SymbolSide;
  domain: SymbolDomain;
  category: SymbolCategory;
  size?: number;
  altitudeDepth?: string;  // For air/subsurface
  staffComments?: string;
  additionalInfo?: string;
  uniqueDesignation?: string;
}

// ─── Side colors per MIL-STD-2525C ──────────────────────────────────────────
const SIDE_COLORS: Record<SymbolSide, { fill: string; stroke: string; text: string }> = {
  blue:   { fill: "#4a9eff40", stroke: "#4a9eff", text: "#4a9eff" },
  red:    { fill: "#ff4a4a40", stroke: "#ff4a4a", text: "#ff4a4a" },
  neutral:{ fill: "#4aff4a40", stroke: "#4aff4a", text: "#4aff4a" },
  unknown:{ fill: "#ffff4a40", stroke: "#ffff4a", text: "#ffff4a" },
};

// ─── Domain shapes per APP-6D ────────────────────────────────────────────────
// Air = rounded rectangle, Ground = rectangle, Sea = sea shape, Subsurface = inverted
function getDomainShape(domain: SymbolDomain, cx: number, cy: number, size: number): string {
  const half = size / 2;
  switch (domain) {
    case "air":
      return `M ${cx - half} ${cy - half * 0.7} L ${cx + half} ${cy - half * 0.7} L ${cx + half} ${cy + half * 0.7} L ${cx - half} ${cy + half * 0.7} Z`;
    case "ground":
      return `M ${cx - half} ${cy - half} L ${cx + half} ${cy - half} L ${cx + half} ${cy + half} L ${cx - half} ${cy + half} Z`;
    case "sea":
      return `M ${cx - half} ${cy - half * 0.6} Q ${cx} ${cy + half} ${cx + half} ${cy - half * 0.6} L ${cx - half} ${cy - half * 0.6} Z`;
    case "subsurface":
      return `M ${cx - half} ${cy + half * 0.6} Q ${cx} ${cy - half} ${cx + half} ${cy + half * 0.6} L ${cx - half} ${cy + half * 0.6} Z`;
    case "sof":
      return `M ${cx} ${cy - half} L ${cx + half} ${cy} L ${cx} ${cy + half} L ${cx - half} ${cy} Z`;
    default:
      return `M ${cx - half} ${cy - half} L ${cx + half} ${cy - half} L ${cx + half} ${cy + half} L ${cx - half} ${cy + half} Z`;
  }
}

// ─── Function icons per branch ───────────────────────────────────────────────
const BRANCH_ICONS: Record<string, string> = {
  infantry: "⊹",
  armor: "▣",
  artillery: "⊙",
  air_defense: "⊕",
  aviation: "✈",
  engineer: "⊞",
  recon: "◎",
  signal: "⊡",
  medical: "⊕",
  logistics: "▢",
  naval: "⚓",
  submarine: "▼",
  missile: "➤",
  headquarters: "☆",
  special_forces: "♠",
};

// ─── Render symbol to SVG ─────────────────────────────────────────────────────
export function renderNATOSymbol(params: MILSymbolParams): string {
  const size = params.size ?? 40;
  const cx = size / 2;
  const cy = size / 2;
  const colors = SIDE_COLORS[params.side];
  const shapePath = getDomainShape(params.domain, cx, cy, size);

  const icon = BRANCH_ICONS[params.category === "equipment" ? "missile" : params.sidc.substring(6, 10)] ?? "?";

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;

  // Shape fill + stroke
  svg += `<path d="${shapePath}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="1.5" />`;

  // Icon
  svg += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="${colors.text}" font-size="${size * 0.35}" font-family="monospace">${icon}</text>`;

  // Unique designation (above)
  if (params.uniqueDesignation) {
    svg += `<text x="${cx}" y="${cy - size * 0.5}" text-anchor="middle" fill="${colors.text}" font-size="${size * 0.2}" font-family="monospace">${params.uniqueDesignation}</text>`;
  }

  // Altitude/depth (above right)
  if (params.altitudeDepth) {
    svg += `<text x="${cx + size * 0.5}" y="${cy - size * 0.3}" text-anchor="start" fill="${colors.text}" font-size="${size * 0.18}" font-family="monospace">${params.altitudeDepth}</text>`;
  }

  // Additional info (below)
  if (params.additionalInfo) {
    svg += `<text x="${cx}" y="${cy + size * 0.6}" text-anchor="middle" fill="${colors.text}" font-size="${size * 0.18}" font-family="monospace">${params.additionalInfo}</text>`;
  }

  svg += `</svg>`;
  return svg;
}

// ─── Predefined unit symbol codes ───────────────────────────────────────────
export const UNIT_SYMBOLS: Record<string, MILSymbolParams> = {
  motor_rifle:   { sidc: "SFGPU------", side: "blue", domain: "ground", category: "unit", uniqueDesignation: "МСП" },
  tank_battalion:{ sidc: "SFGPU------", side: "blue", domain: "ground", category: "unit", uniqueDesignation: "ТБ" },
  artillery_bn:  { sidc: "SFGPU------", side: "blue", domain: "ground", category: "unit", uniqueDesignation: "АРТ" },
  sam_battery:   { sidc: "SFGPU------", side: "blue", domain: "ground", category: "unit", uniqueDesignation: "ПВО" },
  attack_heli:   { sidc: "SFGAU------", side: "blue", domain: "air",    category: "unit", uniqueDesignation: "ВБ", altitudeDepth: "100-500m" },
  fighter:       { sidc: "SFGAU------", side: "blue", domain: "air",    category: "unit", uniqueDesignation: "ИСБ", altitudeDepth: "5-15km" },
  naval_surface: { sidc: "SFGSU------", side: "blue", domain: "sea",    category: "unit", uniqueDesignation: "НК" },
  submarine:     { sidc: "SFGSU------", side: "blue", domain: "subsurface", category: "unit", uniqueDesignation: "ПЛ", altitudeDepth: "50-300m" },
  spetsnaz:      { sidc: "SFGPU------", side: "blue", domain: "ground", category: "unit", uniqueDesignation: "СПН" },
};

// ─── Generate SIDC from unit type ─────────────────────────────────────────────
export function generateSIDC(
  side: SymbolSide,
  domain: SymbolDomain,
  category: SymbolCategory,
  branch: string,
): string {
  // Standard: S F G [P/A/S/U] [U/I/C/H] --- ------
  const sideCode = side === "blue" ? "F" : side === "red" ? "H" : side === "neutral" ? "N" : "U";
  const domainCode = domain === "air" ? "A" : domain === "sea" ? "S" : domain === "subsurface" ? "U" : "G";
  const catCode = category === "unit" ? "U" : category === "equipment" ? "E" : "I";
  const battleDim = domain === "ground" ? "P" : domain === "air" ? "A" : domain === "sea" ? "S" : "U";

  return `S${sideCode}${domainCode}${battleDim}${catCode}------`;
}

// ─── Get branch icon from SIDC ────────────────────────────────────────────────
export function getBranchFromSIDC(sidc: string): string {
  const branchCode = sidc.substring(4, 6);
  const iconMap: Record<string, string> = {
    PU: "infantry", GU: "armor", RU: "artillery", DU: "air_defense",
    AU: "aviation", EU: "engineer", SU: "signal",
    MU: "missile", LU: "logistics", NU: "naval", UU: "submarine",
    HQ: "headquarters", FU: "special_forces",
  };
  return iconMap[branchCode] ?? "infantry";
}
