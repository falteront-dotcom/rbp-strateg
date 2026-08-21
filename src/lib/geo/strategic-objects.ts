/** Publicly documented geospatial object used by the strategic map. */
export type StrategicObjectType = 'capital' | 'city' | 'port' | 'airport' | 'military-base' | 'naval-base' | 'strategic-site' | 'military-range';

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
  /** Optional public metadata from the source, never operational detail. */
  operator?: string;
  designation?: string;
  sourceCountryCode?: string;
  military?: boolean;
  publiclyDocumented: true;
}

/**
 * Curated open-source seed. Coordinates identify public installations at
 * map level only; this is not an operational or complete military registry.
 */
const CURATED_MILITARY_OBJECTS: readonly StrategicObject[] = [
  { id: 'military-usa-norfolk', isoCode: 'USA', name: 'Naval Station Norfolk', nameRu: 'Военно-морская база Норфолк', type: 'naval-base', longitude: -76.313, latitude: 36.945, source: 'Wikipedia / public reference', sourceUrl: 'https://en.wikipedia.org/wiki/Naval_Station_Norfolk', sourceDate: '2026-08-17', confidence: 'high', operator: 'United States Navy', publiclyDocumented: true, military: true },
  { id: 'military-deu-ramstein', isoCode: 'DEU', name: 'Ramstein Air Base', nameRu: 'Авиабаза Рамштайн', type: 'airport', longitude: 7.6, latitude: 49.43694, source: 'Wikipedia / public reference', sourceUrl: 'https://en.wikipedia.org/wiki/Ramstein_Air_Base', sourceDate: '2026-08-17', confidence: 'high', operator: 'United States Air Force', publiclyDocumented: true, military: true },
  { id: 'military-jpn-yokosuka', isoCode: 'JPN', name: 'United States Fleet Activities Yokosuka', nameRu: 'Военно-морская база Йокосука', type: 'naval-base', longitude: 139.653932, latitude: 35.286081, source: 'Wikipedia / public reference', sourceUrl: 'https://en.wikipedia.org/wiki/United_States_Fleet_Activities_Yokosuka', sourceDate: '2026-08-17', confidence: 'high', operator: 'United States Navy / Japan Maritime Self-Defense Force', publiclyDocumented: true, military: true },
  { id: 'military-qatar-al-udeid', isoCode: 'QAT', name: 'Al Udeid Air Base', nameRu: 'Авиабаза Эль-Удейд', type: 'airport', longitude: 51.31472, latitude: 25.11722, source: 'Wikipedia / public reference', sourceUrl: 'https://en.wikipedia.org/wiki/Al_Udeid_Air_Base', sourceDate: '2026-08-17', confidence: 'high', operator: 'Qatar Emiri Air Force / United States Air Force', publiclyDocumented: true, military: true },
  { id: 'military-tur-incirlik', isoCode: 'TUR', name: 'Incirlik Air Base', nameRu: 'Авиабаза Инджирлик', type: 'airport', longitude: 35.42583, latitude: 37.00194, source: 'Wikipedia / public reference', sourceDate: '2026-08-17', confidence: 'high', operator: 'Turkish Air Force / United States Air Force', publiclyDocumented: true, military: true },
  { id: 'military-gbr-diego-garcia', isoCode: 'GBR', name: 'Naval Support Facility Diego Garcia', nameRu: 'Военный объект Диего-Гарсия', type: 'naval-base', longitude: 72.41111, latitude: -7.31333, source: 'Wikipedia / public reference', sourceUrl: 'https://en.wikipedia.org/wiki/Diego_Garcia', sourceDate: '2026-08-17', confidence: 'medium', operator: 'United States Navy / United Kingdom', publiclyDocumented: true, military: true },
  { id: 'military-gbr-akrotiri', isoCode: 'GBR', name: 'RAF Akrotiri', nameRu: 'Авиабаза Акротири', type: 'airport', longitude: 32.98778, latitude: 34.59028, source: 'Wikipedia / public reference', sourceUrl: 'https://en.wikipedia.org/wiki/RAF_Akrotiri', sourceDate: '2026-08-17', confidence: 'high', operator: 'Royal Air Force', publiclyDocumented: true, military: true },
  { id: 'military-usa-andersen', isoCode: 'USA', name: 'Andersen Air Force Base', nameRu: 'Авиабаза Андерсен', type: 'airport', longitude: 144.7667, latitude: 13.45, source: 'Wikipedia / public reference', sourceUrl: 'https://en.wikipedia.org/wiki/Andersen_Air_Force_Base', sourceDate: '2026-08-21', confidence: 'high', operator: 'United States Air Force', publiclyDocumented: true, military: true },
  { id: 'military-usa-fort-liberty', isoCode: 'USA', name: 'Fort Liberty', nameRu: 'Форт Либерти', type: 'military-base', longitude: -79.07333, latitude: 35.13917, source: 'Wikipedia / public reference', sourceUrl: 'https://en.wikipedia.org/wiki/Fort_Liberty', sourceDate: '2026-08-21', confidence: 'high', operator: 'United States Army', publiclyDocumented: true, military: true },
  { id: 'military-usa-fort-cavazos', isoCode: 'USA', name: 'Fort Cavazos', nameRu: 'Форт Кавасос', type: 'military-base', longitude: -98.4916, latitude: 31.0756, source: 'Wikipedia / public reference', sourceUrl: 'https://en.wikipedia.org/wiki/Fort_Hood', sourceDate: '2026-08-21', confidence: 'high', operator: 'United States Army', publiclyDocumented: true, military: true },
  { id: 'military-kor-camp-humphreys', isoCode: 'KOR', name: 'Camp Humphreys', nameRu: 'Кэмп-Хамфрис', type: 'military-base', longitude: 127.03361, latitude: 36.960667, source: 'Wikipedia / public reference', sourceUrl: 'https://en.wikipedia.org/wiki/Camp_Humphreys', sourceDate: '2026-08-21', confidence: 'high', operator: 'United States Army / Republic of Korea', publiclyDocumented: true, military: true },
];

/** Stable capitals plus reviewed, publicly documented strategic installations. */
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
  ...CURATED_MILITARY_OBJECTS,
];
