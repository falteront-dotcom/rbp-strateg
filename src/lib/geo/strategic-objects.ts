/** Publicly documented geospatial object used by the strategic map. */
export type StrategicObjectType = 'capital' | 'city' | 'port' | 'airport' | 'military-base' | 'naval-base' | 'strategic-site';

export type ObjectConfidence = 'high' | 'medium' | 'low';

export interface StrategicObject {
  id: string;
  isoCode: string;
  name: string;
  nameRu: string;
  type: StrategicObjectType;
  longitude: number;
  latitude: number;
  source: string;
  sourceUrl?: string;
  sourceDate: string;
  confidence: ObjectConfidence;
  publiclyDocumented: true;
}

/**
 * Initial seed for the object layer. Only stable, publicly documented
 * capitals are bundled here; installations must be imported from a reviewed
 * source with provenance instead of being guessed or scraped blindly.
 */
export const STRATEGIC_OBJECTS: readonly StrategicObject[] = [
  { id: 'capital-usa-washington', isoCode: 'USA', name: 'Washington, D.C.', nameRu: 'Вашингтон', type: 'capital', longitude: -77.0365, latitude: 38.9072, source: 'Natural Earth / public reference', sourceDate: '2025-01-01', confidence: 'high', publiclyDocumented: true },
  { id: 'capital-rus-moscow', isoCode: 'RUS', name: 'Moscow', nameRu: 'Москва', type: 'capital', longitude: 37.6173, latitude: 55.7558, source: 'Natural Earth / public reference', sourceDate: '2025-01-01', confidence: 'high', publiclyDocumented: true },
  { id: 'capital-chn-beijing', isoCode: 'CHN', name: 'Beijing', nameRu: 'Пекин', type: 'capital', longitude: 116.4074, latitude: 39.9042, source: 'Natural Earth / public reference', sourceDate: '2025-01-01', confidence: 'high', publiclyDocumented: true },
  { id: 'capital-gbr-london', isoCode: 'GBR', name: 'London', nameRu: 'Лондон', type: 'capital', longitude: -0.1276, latitude: 51.5072, source: 'Natural Earth / public reference', sourceDate: '2025-01-01', confidence: 'high', publiclyDocumented: true },
  { id: 'capital-fra-paris', isoCode: 'FRA', name: 'Paris', nameRu: 'Париж', type: 'capital', longitude: 2.3522, latitude: 48.8566, source: 'Natural Earth / public reference', sourceDate: '2025-01-01', confidence: 'high', publiclyDocumented: true },
  { id: 'capital-deu-berlin', isoCode: 'DEU', name: 'Berlin', nameRu: 'Берлин', type: 'capital', longitude: 13.405, latitude: 52.52, source: 'Natural Earth / public reference', sourceDate: '2025-01-01', confidence: 'high', publiclyDocumented: true },
  { id: 'capital-ind-new-delhi', isoCode: 'IND', name: 'New Delhi', nameRu: 'Нью-Дели', type: 'capital', longitude: 77.209, latitude: 28.6139, source: 'Natural Earth / public reference', sourceDate: '2025-01-01', confidence: 'high', publiclyDocumented: true },
  { id: 'capital-jpn-tokyo', isoCode: 'JPN', name: 'Tokyo', nameRu: 'Токио', type: 'capital', longitude: 139.6917, latitude: 35.6895, source: 'Natural Earth / public reference', sourceDate: '2025-01-01', confidence: 'high', publiclyDocumented: true },
  { id: 'capital-kor-seoul', isoCode: 'KOR', name: 'Seoul', nameRu: 'Сеул', type: 'capital', longitude: 126.978, latitude: 37.5665, source: 'Natural Earth / public reference', sourceDate: '2025-01-01', confidence: 'high', publiclyDocumented: true },
];
