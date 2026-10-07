/** Shared OKLCH colour helpers for the map visualisation. */

export interface OklchStop {
  lightness: number;
  chroma: number;
  hue: number;
}

export type RgbaColor = [number, number, number, number];
export type RgbColor = [number, number, number];

/** Convert an OKLCH colour (L 0..1, C, hue degrees) to clamped sRGB bytes. */
export function oklchToRgb(lightness: number, chroma: number, hue: number): RgbColor {
  const hueRad = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(hueRad);
  const b = chroma * Math.sin(hueRad);
  const l_ = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;

  const red = 4.0767416621 * l3 - 3.3079834258 * m3 + 0.2309640425 * s3;
  const green = -1.2681438942 * l3 + 2.6093399738 * m3 - 0.3411344295 * s3;
  const blue = -0.0041119484 * l3 - 0.7037628646 * m3 + 1.7070697198 * s3;

  return [red, green, blue].map((channel) =>
    Math.round(Math.max(0, Math.min(1, channel)) * 255),
  ) as RgbColor;
}

/** Format OKLCH directly for CSS, preserving the same palette as DeckGL. */
export function oklchToCss(lightness: number, chroma: number, hue: number, alpha?: number): string {
  const alphaPart = alpha == null ? "" : ` / ${Math.max(0, Math.min(1, alpha))}`;
  return `oklch(${lightness * 100}% ${chroma} ${hue}${alphaPart})`;
}

/** Interpolate through a palette of OKLCH stops. */
export function interpolateOklchStops(stops: readonly OklchStop[], value: number): OklchStop {
  if (stops.length === 0) return { lightness: 0, chroma: 0, hue: 0 };
  if (stops.length === 1) return stops[0];

  const t = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const scaled = t * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  const localT = scaled - index;
  const start = stops[index];
  const end = stops[index + 1];
  return {
    lightness: start.lightness + (end.lightness - start.lightness) * localT,
    chroma: start.chroma + (end.chroma - start.chroma) * localT,
    hue: start.hue + (end.hue - start.hue) * localT,
  };
}

/** Shared BP palette: muted severity ramp — deep green → sage → brass → brick.
 *  Chroma stays low: intensity reads as value, not as an acid rainbow. */
export const BP_COLOR_STOPS: readonly OklchStop[] = [
  { lightness: 0.38, chroma: 0.05, hue: 155 },
  { lightness: 0.58, chroma: 0.075, hue: 150 },
  { lightness: 0.71, chroma: 0.095, hue: 72 },
  { lightness: 0.6, chroma: 0.115, hue: 30 },
];

/** Степенная кривая: основная масса значений остаётся в зелёной семье,
 *  тёплые ступени достаются только мировым лидерам. */
function severityCurve(t: number): number {
  return Math.pow(Math.max(0, Math.min(1, t)), 1.9);
}

export function bpColorInterpolator(value: number): RgbaColor {
  const stop = interpolateOklchStops(BP_COLOR_STOPS, severityCurve(value));
  const [red, green, blue] = oklchToRgb(stop.lightness, stop.chroma, stop.hue);
  return [red, green, blue, 232];
}

export function bpColorCss(value: number): string {
  const stop = interpolateOklchStops(BP_COLOR_STOPS, severityCurve(value));
  return oklchToCss(stop.lightness, stop.chroma, stop.hue);
}
