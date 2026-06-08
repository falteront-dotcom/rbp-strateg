// ─────────────────────────────────────────────────────────────────────────────
// NATO Symbol Renderer
// APP-6D / MIL-STD-2525C-inspired tactical symbology for tactical map
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
const SIDE_COLORS: Record<SymbolSide, { fill: string; stroke: string; text: string; halo: string }> = {
  blue:   { fill: "#4a9eff36", stroke: "#4a9eff", text: "#9dccff", halo: "#4a9eff" },
  red:    { fill: "#ff4a4a36", stroke: "#ff4a4a", text: "#ffb0b0", halo: "#ff4a4a" },
  neutral:{ fill: "#4aff4a36", stroke: "#4aff4a", text: "#a5ffa5", halo: "#4aff4a" },
  unknown:{ fill: "#ffff4a36", stroke: "#ffff4a", text: "#ffffb0", halo: "#ffff4a" },
};

// ─── Domain shapes per APP-6D ────────────────────────────────────────────────
// Air = rounded rectangle, Ground = rectangle, Sea = sea shape, Subsurface = inverted
function getDomainShape(domain: SymbolDomain, cx: number, cy: number, size: number): string {
  const half = size / 2;
  switch (domain) {
    case "air":
      return `M ${cx - half} ${cy - half * 0.68} Q ${cx} ${cy - half * 1.03} ${cx + half} ${cy - half * 0.68} L ${cx + half} ${cy + half * 0.68} Q ${cx} ${cy + half * 1.03} ${cx - half} ${cy + half * 0.68} Z`;
    case "ground":
      return `M ${cx - half} ${cy - half} L ${cx + half} ${cy - half} L ${cx + half} ${cy + half} L ${cx - half} ${cy + half} Z`;
    case "sea":
      return `M ${cx - half} ${cy - half * 0.62} Q ${cx} ${cy + half * 1.08} ${cx + half} ${cy - half * 0.62} L ${cx - half} ${cy - half * 0.62} Z`;
    case "subsurface":
      return `M ${cx - half} ${cy + half * 0.62} Q ${cx} ${cy - half * 1.08} ${cx + half} ${cy + half * 0.62} L ${cx - half} ${cy + half * 0.62} Z`;
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
  signal: "⌁",
  medical: "+",
  logistics: "⇄",
  naval: "⚓",
  submarine: "▼",
  missile: "➤",
  headquarters: "☆",
  special_forces: "♠",
};

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── Render symbol to SVG ─────────────────────────────────────────────────────
export function renderNATOSymbol(params: MILSymbolParams): string {
  const size = params.size ?? 40;
  const cx = size / 2;
  const cy = size / 2;
  const colors = SIDE_COLORS[params.side];
  const pad = Math.max(3, size * 0.08);
  const shapePath = getDomainShape(params.domain, cx, cy, size - pad * 2);
  const id = `mil-${params.side}-${params.domain}-${params.category}-${Math.round(size)}-${params.sidc.replace(/[^a-zA-Z0-9]/g, "")}`;

  const icon = BRANCH_ICONS[params.category === "equipment" ? "missile" : params.sidc.substring(6, 10)] ?? "?";
  const designation = params.uniqueDesignation ? escapeSvgText(params.uniqueDesignation) : "";
  const altitude = params.altitudeDepth ? escapeSvgText(params.altitudeDepth) : "";
  const additional = params.additionalInfo ? escapeSvgText(params.additionalInfo) : "";

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">`;

  svg += `<defs>`;
  svg += `<radialGradient id="${id}-core" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${cx} ${cy}) rotate(90) scale(${size * 0.52})"><stop stop-color="${colors.halo}" stop-opacity="0.25"/><stop offset="1" stop-color="${colors.halo}" stop-opacity="0"/></radialGradient>`;
  svg += `<linearGradient id="${id}-stroke" x1="${pad}" y1="${pad}" x2="${size - pad}" y2="${size - pad}" gradientUnits="userSpaceOnUse"><stop stop-color="${colors.stroke}" stop-opacity="1"/><stop offset="0.55" stop-color="${colors.text}" stop-opacity="0.65"/><stop offset="1" stop-color="${colors.stroke}" stop-opacity="1"/></linearGradient>`;
  svg += `<filter id="${id}-glow" x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svg += `</defs>`;

  // Halo + glass plate
  svg += `<circle cx="${cx}" cy="${cy}" r="${size * 0.48}" fill="url(#${id}-core)"/>`;
  svg += `<path d="${shapePath}" fill="${colors.fill}" stroke="url(#${id}-stroke)" stroke-width="${Math.max(1.4, size * 0.04)}" filter="url(#${id}-glow)"/>`;

  // Tactical corner brackets
  const bracket = Math.max(4, size * 0.15);
  const b0 = pad * 0.8;
  const b1 = size - b0;
  svg += `<path d="M ${b0} ${b0 + bracket} V ${b0} H ${b0 + bracket} M ${b1 - bracket} ${b0} H ${b1} V ${b0 + bracket} M ${b0} ${b1 - bracket} V ${b1} H ${b0 + bracket} M ${b1 - bracket} ${b1} H ${b1} V ${b1 - bracket}" stroke="${colors.stroke}" stroke-opacity="0.45" stroke-width="${Math.max(0.7, size * 0.02)}" stroke-linecap="round"/>`;

  // Inner crosshair / network detail
  svg += `<path d="M ${cx} ${pad * 1.8} V ${cy - size * 0.22} M ${cx} ${cy + size * 0.22} V ${size - pad * 1.8} M ${pad * 1.8} ${cy} H ${cx - size * 0.22} M ${cx + size * 0.22} ${cy} H ${size - pad * 1.8}" stroke="${colors.stroke}" stroke-opacity="0.28" stroke-width="${Math.max(0.65, size * 0.018)}"/>`;

  // Icon
  svg += `<text x="${cx}" y="${cy + size * 0.13}" text-anchor="middle" fill="${colors.text}" font-size="${size * 0.36}" font-weight="800" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" style="filter:drop-shadow(0 0 ${size * 0.08}px ${colors.halo})">${escapeSvgText(icon)}</text>`;

  // Unique designation (above)
  if (designation) {
    svg += `<text x="${cx}" y="${Math.max(size * 0.16, cy - size * 0.48)}" text-anchor="middle" fill="${colors.text}" font-size="${size * 0.18}" font-weight="800" letter-spacing="0.08em" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">${designation}</text>`;
  }

  // Altitude/depth (above right)
  if (altitude) {
    svg += `<text x="${cx + size * 0.36}" y="${cy - size * 0.32}" text-anchor="start" fill="${colors.text}" font-size="${size * 0.14}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">${altitude}</text>`;
  }

  // Additional info (below)
  if (additional) {
    svg += `<text x="${cx}" y="${cy + size * 0.48}" text-anchor="middle" fill="${colors.text}" font-size="${size * 0.14}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">${additional}</text>`;
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
