// ─────────────────────────────────────────────────────────────────────────────
// Military Equipment Reference
// Detailed specifications for major weapons platforms
// Used by MilitaryHardwareTab for accurate display
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

export interface EquipmentSpec {
  name: string;
  nameRu: string;
  category: "mbt" | "ifv" | "artillery" | "mlrs" | "sam" | "fighter" | "bomber" | "attack_heli" | "transport" | "carrier" | "destroyer" | "frigate" | "corvette" | "submarine_ssk" | "submarine_ssn" | "submarine_ssbn" | "icbm" | "slbm" | "cruise_missile";
  country: string;       // ISO3 of primary operator/manufacturer
  generation: number;    // 1-5 (5 = most advanced)
  crew: number;
  weight_tons?: number;
  range_km?: number;
  speed_kmh?: number;
  caliber_mm?: number;
  warheads?: number;
  isActive: boolean;
  natoReportingName?: string;
  description: string;   // Russian
}

// ─── Main Battle Tanks ──────────────────────────────────────────────────────
export const TANK_SPECS: EquipmentSpec[] = [
  { name: "M1A2 Abrams", nameRu: "M1A2 Абрамс", category: "mbt", country: "USA", generation: 3, crew: 4, weight_tons: 66.8, range_km: 426, speed_kmh: 67, caliber_mm: 120, isActive: true, natoReportingName: undefined, description: "Основной танк США. 120-мм гладкоствольное орудие M256, композитная броня + DU, газотурбинный двигатель." },
  { name: "T-90M", nameRu: "Т-90М", category: "mbt", country: "RUS", generation: 3, crew: 3, weight_tons: 50, range_km: 550, speed_kmh: 60, caliber_mm: 125, isActive: true, description: "Модернизированный Т-90. 125-мм 2А46М-5, Динамическая защита \"Реликт\", автомат заряжания, тепловизор \"Ирбис\"." },
  { name: "Type 99A", nameRu: "Тип 99А", category: "mbt", country: "CHN", generation: 3, crew: 3, weight_tons: 58, range_km: 450, speed_kmh: 70, caliber_mm: 125, isActive: true, description: "Основной танк КНР. 125-мм гладкоствольное орудие, ДЗ FY-4, автомат заряжания, активная защита." },
  { name: "Leopard 2A7+", nameRu: "Леопард 2А7+", category: "mbt", country: "DEU", generation: 3, crew: 4, weight_tons: 67.5, range_km: 450, speed_kmh: 72, caliber_mm: 120, isActive: true, description: "Немецкий основной танк. 120-мм Rheinmetall L/55, модульная броня, цифровые системы." },
  { name: "Challenger 3", nameRu: "Челленджер 3", category: "mbt", country: "GBR", generation: 3, crew: 4, weight_tons: 75, range_km: 400, speed_kmh: 59, caliber_mm: 120, isActive: true, description: "Британский основной танк. Замена нарезного орудия на 120-мм гладкоствольное L/55." },
  { name: "Leclerc", nameRu: "Леклерк", category: "mbt", country: "FRA", generation: 3, crew: 3, weight_tons: 57.4, range_km: 450, speed_kmh: 72, caliber_mm: 120, isActive: true, description: "Французский основной танк. 120-мм F1, автомат заряжания (8 выстр/мин), модульная броня." },
  { name: "T-14 Armata", nameRu: "Т-14 Армата", category: "mbt", country: "RUS", generation: 4, crew: 3, weight_tons: 55, range_km: 500, speed_kmh: 80, caliber_mm: 125, isActive: true, description: "Танк 4-го поколения. Необитаемая башня, 125-мм 2А82-1М, изоляция экипажа в бронекапсуле, радар + Афганит." },
  { name: "Arjun Mk-1A", nameRu: "Арджун Mk-1A", category: "mbt", country: "IND", generation: 3, crew: 4, weight_tons: 68, range_km: 400, speed_kmh: 67, caliber_mm: 120, isActive: true, description: "Индийский основной танк. 120-мм нарезное орудие, композитная броня Kanchan." },
  { name: "Merkava Mk.4M", nameRu: "Меркава Mk.4M", category: "mbt", country: "ISR", generation: 3, crew: 4, weight_tons: 65, range_km: 400, speed_kmh: 64, caliber_mm: 120, isActive: true, description: "Израильский танк с передним расположением двигателя. 120-мм гладкоствольное, Троя + Железный кулак АЗ." },
  { name: "K2 Black Panther", nameRu: "K2 Чёрная пантера", category: "mbt", country: "KOR", generation: 4, crew: 3, weight_tons: 55, range_km: 430, speed_kmh: 70, caliber_mm: 120, isActive: true, description: "Южнокорейский танк 4-го поколения. 120-мм L/55, автомат заряжания, активная подвеска." },
];

// ─── Fighter Aircraft ─────────────────────────────────────────────────────────
export const FIGHTER_SPECS: EquipmentSpec[] = [
  { name: "F-35A Lightning II", nameRu: "F-35А Молния II", category: "fighter", country: "USA", generation: 5, crew: 1, range_km: 2200, speed_kmh: 1930, isActive: true, description: "Многоцелевой истребитель 5-го поколения. Стелс, F135 двигатель, датчики слияния, внутренние отсеки вооружения." },
  { name: "F-22A Raptor", nameRu: "F-22А Рэптор", category: "fighter", country: "USA", generation: 5, crew: 1, range_km: 2960, speed_kmh: 2410, isActive: true, description: "Истребитель завоевания превосходства 5-го поколения. Крейсерский сверхзвук, стелс, 2x F119." },
  { name: "Su-57 Felon", nameRu: "Су-57", category: "fighter", country: "RUS", generation: 5, crew: 1, range_km: 3500, speed_kmh: 2410, isActive: true, natoReportingName: "Felon", description: "Российский истребитель 5-го поколения. 2x Изделие 30, стелс-технологии, РЛС с АФАР, внутренние отсеки." },
  { name: "J-20 Mighty Dragon", nameRu: "J-20", category: "fighter", country: "CHN", generation: 5, crew: 1, range_km: 2000, speed_kmh: 2100, isActive: true, description: "Китайский истребитель 5-го поколения. Дельтавидное крыло + ПГО, стелс, WS-15 (разработка)." },
  { name: "Rafale", nameRu: "Рафаль", category: "fighter", country: "FRA", generation: 44, crew: 1, range_km: 3700, speed_kmh: 2130, isActive: true, description: "Французский многоцелевой истребитель 4+. Дельтавидное крыло + ПГО, 2x M88, спектра РЭБ." },
  { name: "Eurofighter Typhoon", nameRu: "Еврофайтер Тайфун", category: "fighter", country: "DEU", generation: 4, crew: 1, range_km: 2900, speed_kmh: 2490, isActive: true, description: "Европейский многоцелевой истребитель. Дельтавидное крыло + ПГО, 2x EJ200, сверхманёвренность." },
  { name: "Su-35S Flanker-E", nameRu: "Су-35С", category: "fighter", country: "RUS", generation: 4, crew: 1, range_km: 3600, speed_kmh: 2500, isActive: true, natoReportingName: "Flanker-E", description: "Российский истребитель 4++. 2x АЛ-41Ф1С, сверхманёвренность, РЛС Ирбис-Э, 12 точек подвески." },
  { name: "F-16V Viper", nameRu: "F-16V Вайпер", category: "fighter", country: "USA", generation: 4, crew: 1, range_km: 2600, speed_kmh: 2120, isActive: true, description: "Многоцелевой лёгкий истребитель. APG-83 АФАР, самый распространённый истребитель в мире." },
];

// ─── Submarines ──────────────────────────────────────────────────────────────
export const SUBMARINE_SPECS: EquipmentSpec[] = [
  { name: "Ohio-class SSBN", nameRu: "Огайо (ПЛАРБ)", category: "submarine_ssbn", country: "USA", generation: 3, crew: 155, range_km: 0, speed_kmh: 0, isActive: true, description: "ПЛАРБ ВМС США. 24 БРПЛ Трайдент II D5, 8-12 ракет с РГЧ ИН (до 192 боеголовок)." },
  { name: "Borei-A class", nameRu: "Борей-А (ПЛАРБ)", category: "submarine_ssbn", country: "RUS", generation: 3, crew: 107, range_km: 0, speed_kmh: 0, isActive: true, description: "Российская ПЛАРБ 4-го поколения. 16 БРПЛ Булава, сниженная шумность, залповый огонь." },
  { name: "Virginia-class SSN", nameRu: "Вирджиния (ПЛАТ)", category: "submarine_ssn", country: "USA", generation: 4, crew: 132, range_km: 0, speed_kmh: 0, isActive: true, description: "Многоцелевая ПЛА ВМС США. 12 КР Томагавк, трубки VPM, антенны TB-29A." },
  { name: "Yasen-M class", nameRu: "Ясень-М (ПЛАТ)", category: "submarine_ssn", country: "RUS", generation: 4, crew: 90, range_km: 0, speed_kmh: 0, isActive: true, description: "Российская многоцелевая ПЛА. КР Калибр/Оникс, торпеды 533мм, сниженная шумность." },
  { name: "Type 094 Jin-class", nameRu: "Тип 094 Цзинь (ПЛАРБ)", category: "submarine_ssbn", country: "CHN", generation: 3, crew: 120, range_km: 0, speed_kmh: 0, isActive: true, description: "Китайская ПЛАРБ. 12 БРПЛ Цзюлан-2, увеличенная дальность." },
  { name: "Kilo-class (Project 636.3)", nameRu: "Варшавянка (ДЭПЛ)", category: "submarine_ssk", country: "RUS", generation: 3, crew: 52, range_km: 0, speed_kmh: 0, isActive: true, description: "Российская ДЭПЛ. Торпеды + КР Калибр, повышенная скрытность, экспортный успех." },
];

// ─── ICBMs ──────────────────────────────────────────────────────────────────
export const ICBM_SPECS: EquipmentSpec[] = [
  { name: "LGM-30G Minuteman III", nameRu: "Минитмен-III", category: "icbm", country: "USA", generation: 3, crew: 0, range_km: 13000, speed_kmh: 24000, warheads: 1, isActive: true, description: "МБР шахтного базирования США. 1 РГЧ ИН (W87), точность 120м, 400 единиц." },
  { name: "R-36M2 Voevoda", nameRu: "Р-36М2 Воевода (Сатана)", category: "icbm", country: "RUS", generation: 3, crew: 0, range_km: 16000, speed_kmh: 25000, warheads: 10, isActive: true, natoReportingName: "Satan", description: "Тяжёлая МБР шахтного базирования. 10 РГЧ ИН, самый мощный боевой блок в мире." },
  { name: "RS-24 Yars", nameRu: "РС-24 Ярс", category: "icbm", country: "RUS", generation: 4, crew: 0, range_km: 12000, speed_kmh: 24000, warheads: 4, isActive: true, description: "МБР мобильного/шахтного базирования. 4 РГЧ ИН, преодоление ПРО, Тополь-М эволюция." },
  { name: "DF-41", nameRu: "ДФ-41", category: "icbm", country: "CHN", generation: 4, crew: 0, range_km: 15000, speed_kmh: 25000, warheads: 10, isActive: true, description: "Китайская МБР мобильного базирования. До 10 РГЧ ИН, дальность 15000км." },
  { name: "RS-28 Sarmat", nameRu: "РС-28 Сармат", category: "icbm", country: "RUS", generation: 5, crew: 0, range_km: 18000, speed_kmh: 25000, warheads: 15, isActive: true, natoReportingName: "Satan II", description: "Сверхтяжёлая МБР жидкостная. 15 РГЧ ИН, орбитальная траектория, преодоление любой ПРО." },
  { name: "Trident II D5", nameRu: "Трайдент II D5", category: "slbm", country: "USA", generation: 4, crew: 0, range_km: 11300, speed_kmh: 24000, warheads: 8, isActive: true, description: "БРПЛ ВМС США. 8 РГЧ ИН (W76/W88), высочайшая надёжность (176/182 успешных пусков)." },
];

// ─── Lookup functions ─────────────────────────────────────────────────────────
export function getEquipmentByCountry(isoCode: string): EquipmentSpec[] {
  return [
    ...TANK_SPECS,
    ...FIGHTER_SPECS,
    ...SUBMARINE_SPECS,
    ...ICBM_SPECS,
  ].filter((e) => e.country === isoCode);
}

export function getEquipmentByCategory(category: EquipmentSpec["category"]): EquipmentSpec[] {
  return [
    ...TANK_SPECS,
    ...FIGHTER_SPECS,
    ...SUBMARINE_SPECS,
    ...ICBM_SPECS,
  ].filter((e) => e.category === category);
}

export function getAllEquipment(): EquipmentSpec[] {
  return [...TANK_SPECS, ...FIGHTER_SPECS, ...SUBMARINE_SPECS, ...ICBM_SPECS];
}
