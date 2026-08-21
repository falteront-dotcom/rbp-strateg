import fs from 'node:fs';
import path from 'node:path';
import type { StrategicObject } from './strategic-objects';

interface PlaceRecord {
  i: string;
  n: string;
  x: number;
  y: number;
  r: number;
  w: number;
  c: number;
}

let cachedPlaces: PlaceRecord[] | null = null;

function loadPlaces(): PlaceRecord[] {
  if (cachedPlaces) return cachedPlaces;
  const filename = path.join(process.cwd(), 'public', 'data', 'populated-places.json');
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filename, 'utf8'));
    cachedPlaces = Array.isArray(parsed) ? parsed.filter((value): value is PlaceRecord => {
      if (!value || typeof value !== 'object') return false;
      const row = value as Record<string, unknown>;
      return typeof row.i === 'string' && typeof row.n === 'string' && typeof row.x === 'number' && typeof row.y === 'number';
    }) : [];
  } catch {
    cachedPlaces = [];
  }
  return cachedPlaces;
}

export function getLocalPopulatedPlaces(
  south: number,
  west: number,
  north: number,
  east: number,
  detailed: boolean,
  sourceDate: string,
): StrategicObject[] {
  return loadPlaces()
    .filter((place) => place.y >= south && place.y <= north && place.x >= west && place.x <= east)
    .filter((place) => detailed || place.c === 1 || place.w === 1 || place.r <= 3)
    .slice(0, detailed ? 5000 : 1500)
    .map((place) => ({
      id: `natural-earth-place-${place.i}-${place.x}-${place.y}`,
      isoCode: place.i,
      name: place.n,
      nameRu: place.n,
      type: place.c === 1 ? 'capital' : 'city',
      longitude: place.x,
      latitude: place.y,
      source: 'Natural Earth Populated Places',
      sourceUrl: 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/',
      sourceDate,
      confidence: place.c === 1 ? 'high' : 'medium',
      publiclyDocumented: true,
    }));
}
