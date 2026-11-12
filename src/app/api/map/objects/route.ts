import { NextResponse } from 'next/server';
import { STRATEGIC_OBJECTS, type StrategicObject, type StrategicObjectType, type ObjectConfidence } from '@/lib/geo/strategic-objects';
import { getLocalPopulatedPlaces } from '@/lib/geo/populated-places';

export const runtime = 'nodejs';

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse { elements?: OverpassElement[]; }

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; objects: StrategicObject[] }>();
const lastKnownGood = new Map<string, StrategicObject[]>();

function numberParam(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function classify(tags: Record<string, string>): StrategicObjectType | null {
  if (tags.place === 'city' || tags.place === 'town') return 'city';
  if (tags.military === 'naval_base' || tags.military === 'naval_station') return 'naval-base';
  if (tags.military === 'airfield' || tags['aerodrome:type'] === 'military' || tags.aeroway === 'aerodrome' || tags.aeroway === 'airport') return 'airport';
  if (tags.military === 'range' || tags.military === 'danger_area' || tags.military === 'training_area') return 'military-range';
  if (tags.military === 'missile_site' || tags.military === 'command' || tags.military === 'office' || tags.military || tags.landuse === 'military') return 'military-base';
  if (tags.harbour || tags.leisure === 'marina' || tags['seamark:type'] === 'harbour') return 'port';
  return null;
}

function confidence(type: StrategicObjectType, tags: Record<string, string>): ObjectConfidence {
  if (type === 'city' || (tags.name && tags.military)) return 'high';
  if (tags.name || tags['name:en'] || tags.operator) return 'medium';
  return 'low';
}

function mapElement(element: OverpassElement, index: number, fetchedAt: string): StrategicObject | null {
  const tags = element.tags ?? {};
  const type = classify(tags);
  const point = element.lat !== undefined && element.lon !== undefined ? { lat: element.lat, lon: element.lon } : element.center;
  if (!type || !point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return null;
  const name = tags['name:en'] ?? tags.name ?? `${type}-${element.id}`;
  const isoCode = (tags['ISO3166-1:alpha3'] ?? tags['addr:country'] ?? 'UNK').toUpperCase();
  return {
    id: `osm-${element.type}-${element.id}`,
    isoCode: isoCode.length === 3 ? isoCode : 'UNK',
    sourceCountryCode: isoCode.length === 2 ? isoCode : undefined,
    name,
    nameRu: tags['name:ru'] ?? name,
    type,
    longitude: point.lon,
    latitude: point.lat,
    source: 'OpenStreetMap / Overpass API',
    sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    sourceDate: fetchedAt,
    confidence: confidence(type, tags),
    operator: tags.operator,
    designation: tags.ref ?? tags.military_service,
    publiclyDocumented: true,
    military: Boolean(tags.military || tags.landuse === 'military' || tags['aerodrome:type'] === 'military' || tags.military_service),
  };
}

function buildQuery(south: number, west: number, north: number, east: number, includeTowns: boolean, militaryOnly: boolean): string {
  if (militaryOnly) {
    return `[out:json][timeout:25];(
      nwr[military](${south},${west},${north},${east});
      nwr[landuse=military](${south},${west},${north},${east});
      nwr[aerodrome:type=military](${south},${west},${north},${east});
      nwr[military_service](${south},${west},${north},${east});
    ); out center tags;`;
  }
  const places = includeTowns ? 'city|town' : 'city';
  return `[out:json][timeout:25];(
    nwr[place~"^(${places})$"](${south},${west},${north},${east});
    nwr[aeroway~"^(aerodrome|airport)$"](${south},${west},${north},${east});
    nwr[military~"^(base|airfield|naval_base|naval_station|barracks|range|danger_area|missile_site|command|office|training_area)$"](${south},${west},${north},${east});
    nwr[landuse=military](${south},${west},${north},${east});
    nwr[aerodrome:type=military](${south},${west},${north},${east});
    nwr[harbour](${south},${west},${north},${east});
    nwr[leisure=marina](${south},${west},${north},${east});
  ); out center tags;`;
}

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const south = numberParam(params.get('south'));
  const west = numberParam(params.get('west'));
  const north = numberParam(params.get('north'));
  const east = numberParam(params.get('east'));
  const zoom = numberParam(params.get('zoom')) ?? 3;
  const militaryOnly = params.get('military') === '1';
  if ([south, west, north, east].some((value) => value === null) || south! >= north! || west! >= east! || north! - south! > 60 || east! - west! > 100) {
    return NextResponse.json({ error: 'Valid bounded south/west/north/east parameters are required' }, { status: 400 });
  }
  const key = [south, west, north, east, Math.floor(zoom), militaryOnly ? 'military' : 'all'].map((value) => Number.isFinite(Number(value)) ? Number(value).toFixed(2) : String(value)).join(':');
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return NextResponse.json({ objects: cached.objects, cached: true });
  const fetchedAt = new Date().toISOString();
  const localObjects = [
    ...STRATEGIC_OBJECTS.filter((object) => object.latitude >= south! && object.latitude <= north! && object.longitude >= west! && object.longitude <= east!).filter((object) => !militaryOnly || ['military-base', 'naval-base', 'airport', 'military-range', 'strategic-site'].includes(object.type)),
    ...(militaryOnly ? [] : getLocalPopulatedPlaces(south!, west!, north!, east!, zoom >= 5, fetchedAt)),
  ];
  if (zoom < 3 || (zoom < 4 && !militaryOnly)) return NextResponse.json({ objects: localObjects, cached: true, sourceDate: new Date().toISOString() });

  const endpoint = process.env.OVERPASS_API_URL ?? 'https://overpass-api.de/api/interpreter';
  try {
    const query = buildQuery(south!, west!, north!, east!, zoom >= 5, militaryOnly);
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', accept: 'application/json', 'user-agent': 'rbp-strateg-local/1.0' }, body: `data=${encodeURIComponent(query)}`, signal: AbortSignal.timeout(30_000), cache: 'no-store' });
    if (!response.ok) return NextResponse.json({ objects: lastKnownGood.get(key) ?? localObjects, stale: true, error: `Overpass returned ${response.status}` });
    const payload = await response.json() as OverpassResponse;
    const remoteObjects = (payload.elements ?? []).map((element, index) => mapElement(element, index, fetchedAt)).filter((object): object is StrategicObject => object !== null).filter((object) => !militaryOnly || ['military-base', 'naval-base', 'airport', 'military-range'].includes(object.type));
    const merged = new Map(localObjects.map((object) => [object.id, object]));
    for (const object of remoteObjects) merged.set(object.id, object);
    const objects = [...merged.values()].slice(0, 5000);
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, objects });
    lastKnownGood.set(key, objects);
    return NextResponse.json({ objects, cached: false, sourceDate: fetchedAt, sources: ['Natural Earth', 'OpenStreetMap / Overpass API'] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Object source unavailable';
    return NextResponse.json({ objects: lastKnownGood.get(key) ?? localObjects, stale: true, error: message }, { status: 200 });
  }
}
