// ─────────────────────────────────────────────────────────────────────────────
// Strategic military bases and aviation reach map overlays
// Public, approximate reference points for global strategic visualization.
// ─────────────────────────────────────────────────────────────────────────────

import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import { estimateAirOperationalReach } from "@/lib/bp/air-reach";
import { getPosition } from "@/lib/geo/country-centroids";

export type MilitaryBaseType = "air" | "naval" | "joint" | "land" | "missile" | "logistics";
export type MilitaryBaseAlliance = "NATO" | "US" | "RUS" | "CHN" | "CSTO" | "AUKUS" | "IND" | "ISR" | "GCC" | "OTHER";

export interface MilitaryBasePoint {
  objectKind: "militaryBase";
  id: string;
  name: string;
  nameRu: string;
  countryIso: string;
  operator: string;
  alliance: MilitaryBaseAlliance;
  type: MilitaryBaseType;
  position: [number, number];
  importance: number;
  airRadiusKm?: number;
  navalReachKm?: number;
  description: string;
}

export interface AirReachCountryInput {
  isoCode: string;
  name: string;
  nameRu: string;
  side?: string | null;
  coalition?: string | null;
  totalAircraft?: number | null;
  totalHelicopters?: number | null;
  airfields?: number | null;
  aircraftCarriers?: number | null;
  totalNavy?: number | null;
  ports?: number | null;
  militaryBudgetBn?: number | null;
  techLevel?: number | null;
  c2Capability?: number | null;
  ewCapability?: number | null;
  merchantFleet?: number | null;
  coastlineKm?: number | null;
  bpTotal?: number | null;
  bpAdvanced?: number | null;
}

export interface AirReachPoint {
  objectKind: "airReach";
  iso: string;
  name: string;
  position: [number, number];
  combatRadiusKm: number;
  expeditionaryRadiusKm: number;
  reachScore: number;
  side: string;
  coalition: string | null;
  bp: number;
  explanation: string;
}

const BASES: MilitaryBasePoint[] = [
  // NATO / US global network
  { objectKind: "militaryBase", id: "usa-norfolk", name: "Naval Station Norfolk", nameRu: "Норфолк", countryIso: "USA", operator: "US Navy", alliance: "US", type: "naval", position: [-76.31, 36.95], importance: 98, navalReachKm: 5200, description: "Крупнейшая военно-морская база США и ключевой узел Атлантики." },
  { objectKind: "militaryBase", id: "usa-pentagon", name: "Pentagon / Joint Staff", nameRu: "Пентагон / Объединённый штаб", countryIso: "USA", operator: "US DoD", alliance: "US", type: "joint", position: [-77.06, 38.87], importance: 95, description: "Стратегический центр управления и планирования США." },
  { objectKind: "militaryBase", id: "usa-andrews", name: "Joint Base Andrews", nameRu: "Эндрюс", countryIso: "USA", operator: "USAF", alliance: "US", type: "air", position: [-76.87, 38.81], importance: 86, airRadiusKm: 2400, description: "Авиационный узел национального командования США." },
  { objectKind: "militaryBase", id: "usa-langley", name: "Joint Base Langley-Eustis", nameRu: "Лэнгли-Юстис", countryIso: "USA", operator: "USAF", alliance: "US", type: "air", position: [-76.36, 37.08], importance: 84, airRadiusKm: 2200, description: "Истребительная авиация и штабная инфраструктура ВВС США." },
  { objectKind: "militaryBase", id: "usa-whiteman", name: "Whiteman AFB", nameRu: "Уайтмен", countryIso: "USA", operator: "USAF", alliance: "US", type: "air", position: [-93.55, 38.73], importance: 94, airRadiusKm: 3400, description: "База стратегической авиации B-2/B-21 и дальнего удара." },
  { objectKind: "militaryBase", id: "usa-minot", name: "Minot AFB", nameRu: "Майнот", countryIso: "USA", operator: "USAF", alliance: "US", type: "missile", position: [-101.36, 48.42], importance: 93, airRadiusKm: 3200, description: "Стратегические бомбардировщики и компонент ядерной триады." },
  { objectKind: "militaryBase", id: "usa-san-diego", name: "Naval Base San Diego", nameRu: "Сан-Диего", countryIso: "USA", operator: "US Navy", alliance: "US", type: "naval", position: [-117.12, 32.68], importance: 93, navalReachKm: 6200, description: "Главный узел Тихоокеанского флота США." },
  { objectKind: "militaryBase", id: "usa-pearl", name: "Joint Base Pearl Harbor-Hickam", nameRu: "Пёрл-Харбор / Хикэм", countryIso: "USA", operator: "US Indo-Pacific Command", alliance: "US", type: "joint", position: [-157.95, 21.35], importance: 97, airRadiusKm: 2700, navalReachKm: 6500, description: "Ключевой центр США в центральной части Тихого океана." },
  { objectKind: "militaryBase", id: "usa-guam", name: "Andersen AFB / Naval Base Guam", nameRu: "Гуам: Андерсен / ВМБ", countryIso: "USA", operator: "US Indo-Pacific Command", alliance: "US", type: "joint", position: [144.80, 13.58], importance: 96, airRadiusKm: 3000, navalReachKm: 6200, description: "Передовой узел дальних бомбардировщиков и подлодок в западном Тихом океане." },
  { objectKind: "militaryBase", id: "greenland-thule", name: "Pituffik Space Base", nameRu: "Питуффик / Туле", countryIso: "DNK", operator: "US Space Force", alliance: "NATO", type: "missile", position: [-68.70, 76.53], importance: 88, description: "РЛС раннего предупреждения и арктический космический узел НАТО/США." },
  { objectKind: "militaryBase", id: "uk-fairford", name: "RAF Fairford", nameRu: "Фэрфорд", countryIso: "GBR", operator: "USAF / RAF", alliance: "NATO", type: "air", position: [-1.79, 51.68], importance: 88, airRadiusKm: 2500, description: "Европейская база развёртывания стратегической авиации США." },
  { objectKind: "militaryBase", id: "uk-lossiemouth", name: "RAF Lossiemouth", nameRu: "Лоссимут", countryIso: "GBR", operator: "RAF", alliance: "NATO", type: "air", position: [-3.34, 57.71], importance: 82, airRadiusKm: 2100, description: "Североатлантическая авиация, ПВО и морское патрулирование." },
  { objectKind: "militaryBase", id: "uk-faslane", name: "HMNB Clyde Faslane", nameRu: "Фаслейн", countryIso: "GBR", operator: "Royal Navy", alliance: "NATO", type: "naval", position: [-4.82, 56.07], importance: 92, navalReachKm: 5200, description: "База британских атомных подлодок и стратегического сдерживания." },
  { objectKind: "militaryBase", id: "deu-ramstein", name: "Ramstein Air Base", nameRu: "Рамштайн", countryIso: "DEU", operator: "USAF / NATO", alliance: "NATO", type: "air", position: [7.60, 49.44], importance: 96, airRadiusKm: 2600, description: "Главный авиационно-логистический хаб НАТО в Европе." },
  { objectKind: "militaryBase", id: "deu-grafenwoehr", name: "Grafenwöhr Training Area", nameRu: "Графенвёр", countryIso: "DEU", operator: "US Army / Bundeswehr", alliance: "NATO", type: "land", position: [11.90, 49.70], importance: 82, description: "Крупный полигон, подготовка бронетанковых и общевойсковых частей НАТО." },
  { objectKind: "militaryBase", id: "bel-shape", name: "SHAPE Mons", nameRu: "SHAPE Монс", countryIso: "BEL", operator: "NATO", alliance: "NATO", type: "joint", position: [3.96, 50.50], importance: 96, description: "Стратегическое командование союзных операций НАТО." },
  { objectKind: "militaryBase", id: "ita-aviano", name: "Aviano Air Base", nameRu: "Авиано", countryIso: "ITA", operator: "USAF / Italy", alliance: "NATO", type: "air", position: [12.60, 46.03], importance: 89, airRadiusKm: 2400, description: "Передовой авиационный узел НАТО на южном фланге Европы." },
  { objectKind: "militaryBase", id: "ita-sigonella", name: "NAS Sigonella", nameRu: "Сигонелла", countryIso: "ITA", operator: "US Navy / Italy", alliance: "NATO", type: "air", position: [14.92, 37.40], importance: 90, airRadiusKm: 2450, navalReachKm: 3600, description: "Средиземноморский узел БПЛА, морской авиации и логистики НАТО." },
  { objectKind: "militaryBase", id: "esp-rota", name: "Naval Station Rota", nameRu: "Рота", countryIso: "ESP", operator: "US Navy / Spain", alliance: "NATO", type: "naval", position: [-6.35, 36.65], importance: 91, navalReachKm: 4600, description: "Вход в Средиземное море, эсминцы ПРО и морская логистика." },
  { objectKind: "militaryBase", id: "tur-incirlik", name: "Incirlik Air Base", nameRu: "Инджирлик", countryIso: "TUR", operator: "Turkey / NATO", alliance: "NATO", type: "air", position: [35.43, 37.00], importance: 88, airRadiusKm: 2300, description: "Юго-восточный авиационный узел НАТО рядом с Ближним Востоком." },
  { objectKind: "militaryBase", id: "grc-souda", name: "Souda Bay", nameRu: "Суда-Бей", countryIso: "GRC", operator: "Greece / US Navy", alliance: "NATO", type: "naval", position: [24.15, 35.53], importance: 86, airRadiusKm: 2100, navalReachKm: 3800, description: "Критический пункт поддержки НАТО в восточном Средиземноморье." },
  { objectKind: "militaryBase", id: "pol-powidz", name: "Powidz Air Base", nameRu: "Повидз", countryIso: "POL", operator: "Poland / US Army", alliance: "NATO", type: "air", position: [17.85, 52.38], importance: 86, airRadiusKm: 2100, description: "Передовой логистико-авиационный узел НАТО на восточном фланге." },
  { objectKind: "militaryBase", id: "rou-mk", name: "Mihail Kogălniceanu AB", nameRu: "Михаил Когэлничану", countryIso: "ROU", operator: "Romania / US", alliance: "NATO", type: "air", position: [28.49, 44.36], importance: 86, airRadiusKm: 2100, description: "Черноморская база НАТО для авиации, логистики и ротационных сил." },
  { objectKind: "militaryBase", id: "nor-bodo", name: "Bodø / Evenes Air Region", nameRu: "Будё / Эвенес", countryIso: "NOR", operator: "Norway", alliance: "NATO", type: "air", position: [14.37, 67.27], importance: 82, airRadiusKm: 2200, description: "Арктический авиационный узел НАТО для северного фланга." },
  { objectKind: "militaryBase", id: "est-tapa", name: "Tapa Army Base", nameRu: "Тапа", countryIso: "EST", operator: "Estonia / NATO eFP", alliance: "NATO", type: "land", position: [25.95, 59.26], importance: 78, description: "Передовое присутствие НАТО в Балтийском регионе." },
  { objectKind: "militaryBase", id: "lva-adazi", name: "Ādaži Military Base", nameRu: "Адажи", countryIso: "LVA", operator: "Latvia / NATO eFP", alliance: "NATO", type: "land", position: [24.34, 57.10], importance: 78, description: "Многонациональная боевая группа НАТО в Латвии." },
  { objectKind: "militaryBase", id: "ltu-rukla", name: "Rukla / Pabradė", nameRu: "Рукла / Пабраде", countryIso: "LTU", operator: "Lithuania / NATO eFP", alliance: "NATO", type: "land", position: [24.00, 55.05], importance: 78, description: "Балтийский сухопутный узел усиления НАТО." },
  { objectKind: "militaryBase", id: "jpn-yokosuka", name: "Yokosuka Naval Base", nameRu: "Йокосука", countryIso: "JPN", operator: "US Navy / Japan", alliance: "US", type: "naval", position: [139.66, 35.29], importance: 95, navalReachKm: 5600, description: "Передовая база 7-го флота США и японской обороны." },
  { objectKind: "militaryBase", id: "jpn-kadena", name: "Kadena Air Base", nameRu: "Кадена", countryIso: "JPN", operator: "USAF / Japan", alliance: "US", type: "air", position: [127.77, 26.36], importance: 94, airRadiusKm: 2600, description: "Ключевой авиационный узел США в западной части Тихого океана." },
  { objectKind: "militaryBase", id: "kor-osan", name: "Osan Air Base", nameRu: "Осан", countryIso: "KOR", operator: "USAF / ROK", alliance: "US", type: "air", position: [127.03, 37.09], importance: 90, airRadiusKm: 2200, description: "Центр авиационного командования США/РК на Корейском полуострове." },
  { objectKind: "militaryBase", id: "kor-humphreys", name: "Camp Humphreys", nameRu: "Кэмп Хамфрис", countryIso: "KOR", operator: "US Army / ROK", alliance: "US", type: "joint", position: [127.03, 36.97], importance: 89, description: "Крупнейший зарубежный гарнизон США, сухопутная и штабная инфраструктура." },
  { objectKind: "militaryBase", id: "aus-darwin", name: "Darwin / RAAF Tindal", nameRu: "Дарвин / Тиндал", countryIso: "AUS", operator: "Australia / US Marines", alliance: "AUKUS", type: "joint", position: [130.88, -12.43], importance: 86, airRadiusKm: 2450, navalReachKm: 4200, description: "Северный узел AUKUS для Индо-Тихоокеанского региона." },
  { objectKind: "militaryBase", id: "bhr-nsa", name: "Naval Support Activity Bahrain", nameRu: "Бахрейн NSA", countryIso: "BHR", operator: "US Navy", alliance: "GCC", type: "naval", position: [50.58, 26.22], importance: 91, navalReachKm: 4100, description: "Штаб 5-го флота США и ключевой узел Персидского залива." },
  { objectKind: "militaryBase", id: "qat-udeid", name: "Al Udeid Air Base", nameRu: "Эль-Удейд", countryIso: "QAT", operator: "Qatar / US CENTCOM", alliance: "GCC", type: "air", position: [51.32, 25.12], importance: 93, airRadiusKm: 2700, description: "Крупный авиационный и командный центр США на Ближнем Востоке." },
  { objectKind: "militaryBase", id: "dji-lemonnier", name: "Camp Lemonnier", nameRu: "Кэмп Лемоннье", countryIso: "DJI", operator: "US AFRICOM", alliance: "US", type: "joint", position: [43.15, 11.55], importance: 85, airRadiusKm: 2300, navalReachKm: 3500, description: "Африканский передовой узел США у Баб-эль-Мандеба." },

  // Russia / CSTO network
  { objectKind: "militaryBase", id: "rus-severomorsk", name: "Severomorsk Naval Base", nameRu: "Североморск", countryIso: "RUS", operator: "Russian Navy", alliance: "RUS", type: "naval", position: [33.42, 69.07], importance: 96, navalReachKm: 5400, description: "Главная база Северного флота и арктического стратегического компонента." },
  { objectKind: "militaryBase", id: "rus-kaliningrad", name: "Kaliningrad Military District", nameRu: "Калининградский район", countryIso: "RUS", operator: "Russian Armed Forces", alliance: "RUS", type: "joint", position: [20.51, 54.71], importance: 92, airRadiusKm: 2100, navalReachKm: 3000, description: "Передовой A2/AD узел Балтики, авиация, флот и ракетные силы." },
  { objectKind: "militaryBase", id: "rus-engels", name: "Engels-2 Air Base", nameRu: "Энгельс-2", countryIso: "RUS", operator: "Russian Aerospace Forces", alliance: "RUS", type: "air", position: [46.22, 51.48], importance: 94, airRadiusKm: 3200, description: "База дальней авиации и стратегических бомбардировщиков." },
  { objectKind: "militaryBase", id: "rus-olenya", name: "Olenya Air Base", nameRu: "Оленья", countryIso: "RUS", operator: "Russian Aerospace Forces", alliance: "RUS", type: "air", position: [33.59, 68.15], importance: 86, airRadiusKm: 3000, description: "Северная база дальней авиации и арктического направления." },
  { objectKind: "militaryBase", id: "rus-saki", name: "Saki / Black Sea Air-Naval Node", nameRu: "Саки / Черноморский узел", countryIso: "RUS", operator: "Russian Armed Forces", alliance: "RUS", type: "joint", position: [33.60, 45.09], importance: 83, airRadiusKm: 2100, navalReachKm: 3200, description: "Черноморская авиационная и морская инфраструктура." },
  { objectKind: "militaryBase", id: "rus-vladivostok", name: "Vladivostok Naval Base", nameRu: "Владивосток", countryIso: "RUS", operator: "Russian Navy", alliance: "RUS", type: "naval", position: [131.89, 43.12], importance: 88, navalReachKm: 4700, description: "Главный узел Тихоокеанского флота России." },
  { objectKind: "militaryBase", id: "rus-petropavlovsk", name: "Vilyuchinsk Submarine Base", nameRu: "Вилючинск", countryIso: "RUS", operator: "Russian Navy", alliance: "RUS", type: "naval", position: [158.40, 52.92], importance: 93, navalReachKm: 5600, description: "Тихоокеанский узел атомных подлодок и стратегического сдерживания." },
  { objectKind: "militaryBase", id: "blr-lida", name: "Lida / Belarus Air Node", nameRu: "Лида", countryIso: "BLR", operator: "Belarus / Russia", alliance: "CSTO", type: "air", position: [25.30, 53.88], importance: 78, airRadiusKm: 1900, description: "Западный авиационный и учебный узел Союзного государства." },
  { objectKind: "militaryBase", id: "arm-gyumri", name: "102nd Military Base Gyumri", nameRu: "102-я база Гюмри", countryIso: "ARM", operator: "Russia / Armenia", alliance: "CSTO", type: "land", position: [43.84, 40.78], importance: 80, description: "Российская база на Южном Кавказе." },
  { objectKind: "militaryBase", id: "tjk-dushanbe", name: "201st Military Base", nameRu: "201-я база", countryIso: "TJK", operator: "Russia / Tajikistan", alliance: "CSTO", type: "land", position: [68.78, 38.56], importance: 80, description: "Ключевой сухопутный узел ОДКБ в Центральной Азии." },
  { objectKind: "militaryBase", id: "kgz-kant", name: "Kant Air Base", nameRu: "Кант", countryIso: "KGZ", operator: "Russia / Kyrgyzstan", alliance: "CSTO", type: "air", position: [74.85, 42.86], importance: 76, airRadiusKm: 1700, description: "Авиационная база ОДКБ в Киргизии." },
  { objectKind: "militaryBase", id: "syr-hmeimim", name: "Hmeimim Air Base", nameRu: "Хмеймим", countryIso: "SYR", operator: "Russia", alliance: "RUS", type: "air", position: [35.95, 35.40], importance: 86, airRadiusKm: 2200, description: "Российский экспедиционный авиационный узел в восточном Средиземноморье." },
  { objectKind: "militaryBase", id: "syr-tartus", name: "Tartus Naval Facility", nameRu: "Тартус", countryIso: "SYR", operator: "Russia", alliance: "RUS", type: "naval", position: [35.88, 34.90], importance: 84, navalReachKm: 3400, description: "Пункт материально-технического обеспечения ВМФ России в Средиземном море." },

  // China and regional networks
  { objectKind: "militaryBase", id: "chn-sanya", name: "Yulin / Sanya Naval Base", nameRu: "Юйлинь / Санья", countryIso: "CHN", operator: "PLAN", alliance: "CHN", type: "naval", position: [109.52, 18.22], importance: 95, navalReachKm: 5200, description: "Южнокитайский узел подлодок, авианосцев и дальнего флота КНР." },
  { objectKind: "militaryBase", id: "chn-qingdao", name: "Qingdao Naval Base", nameRu: "Циндао", countryIso: "CHN", operator: "PLAN", alliance: "CHN", type: "naval", position: [120.32, 36.07], importance: 90, navalReachKm: 4400, description: "Крупная база Северного флота ВМС НОАК." },
  { objectKind: "militaryBase", id: "chn-ningbo", name: "Ningbo-Zhoushan Naval Base", nameRu: "Нинбо-Чжоушань", countryIso: "CHN", operator: "PLAN", alliance: "CHN", type: "naval", position: [121.55, 29.86], importance: 90, navalReachKm: 4300, description: "Восточный морской узел КНР напротив Тайваня и Восточно-Китайского моря." },
  { objectKind: "militaryBase", id: "chn-hainan-air", name: "Hainan Air Complex", nameRu: "Хайнаньский авиаузел", countryIso: "CHN", operator: "PLAAF / PLANAF", alliance: "CHN", type: "air", position: [110.35, 19.10], importance: 88, airRadiusKm: 2400, description: "Авиационная проекция КНР в Южно-Китайское море." },
  { objectKind: "militaryBase", id: "chn-djibouti", name: "PLA Support Base Djibouti", nameRu: "База НОАК Джибути", countryIso: "DJI", operator: "PLA", alliance: "CHN", type: "joint", position: [43.08, 11.60], importance: 88, airRadiusKm: 2100, navalReachKm: 3900, description: "Первый зарубежный пункт обеспечения НОАК у Красного моря." },
  { objectKind: "militaryBase", id: "chn-hotan", name: "Hotan Air Base", nameRu: "Хотан", countryIso: "CHN", operator: "PLAAF", alliance: "CHN", type: "air", position: [79.86, 37.04], importance: 82, airRadiusKm: 2100, description: "Западный авиационный узел КНР на центральноазиатском направлении." },
  { objectKind: "militaryBase", id: "chn-lhasa", name: "Lhasa-Gonggar Air Base", nameRu: "Лхаса-Гонггар", countryIso: "CHN", operator: "PLAAF", alliance: "CHN", type: "air", position: [90.91, 29.30], importance: 81, airRadiusKm: 1900, description: "Высокогорный авиационный узел на тибетском направлении." },

  // Other major regional anchors
  { objectKind: "militaryBase", id: "ind-karwar", name: "INS Kadamba Karwar", nameRu: "Карвар / INS Kadamba", countryIso: "IND", operator: "Indian Navy", alliance: "IND", type: "naval", position: [74.12, 14.82], importance: 88, navalReachKm: 4200, description: "Крупный западный морской узел Индии." },
  { objectKind: "militaryBase", id: "ind-andaman", name: "Andaman & Nicobar Command", nameRu: "Андаманско-Никобарское командование", countryIso: "IND", operator: "Indian Armed Forces", alliance: "IND", type: "joint", position: [92.74, 11.67], importance: 87, airRadiusKm: 2200, navalReachKm: 4300, description: "Совместный узел Индии у Малаккского пролива." },
  { objectKind: "militaryBase", id: "ind-ambala", name: "Ambala Air Force Station", nameRu: "Амбала", countryIso: "IND", operator: "Indian Air Force", alliance: "IND", type: "air", position: [76.82, 30.38], importance: 80, airRadiusKm: 2000, description: "Северный авиационный узел ВВС Индии." },
  { objectKind: "militaryBase", id: "isr-nevatim", name: "Nevatim Airbase", nameRu: "Неватим", countryIso: "ISR", operator: "Israeli Air Force", alliance: "ISR", type: "air", position: [35.01, 31.21], importance: 90, airRadiusKm: 2400, description: "Ключевая база ВВС Израиля, включая F-35I и стратегическую авиацию." },
  { objectKind: "militaryBase", id: "isr-palmachim", name: "Palmachim Airbase", nameRu: "Пальмахим", countryIso: "ISR", operator: "Israeli Air Force", alliance: "ISR", type: "missile", position: [34.69, 31.90], importance: 86, airRadiusKm: 2100, description: "Авиация, БПЛА и ракетно-космическая инфраструктура Израиля." },
  { objectKind: "militaryBase", id: "pak-kamra", name: "PAF Base Minhas Kamra", nameRu: "Камра / Минхас", countryIso: "PAK", operator: "Pakistan Air Force", alliance: "OTHER", type: "air", position: [72.40, 33.87], importance: 78, airRadiusKm: 1900, description: "Важный авиационно-промышленный узел Пакистана." },
  { objectKind: "militaryBase", id: "pak-karachi", name: "Karachi Naval Dockyard", nameRu: "Карачи ВМБ", countryIso: "PAK", operator: "Pakistan Navy", alliance: "OTHER", type: "naval", position: [66.98, 24.81], importance: 80, navalReachKm: 3300, description: "Главный морской узел Пакистана." },
  { objectKind: "militaryBase", id: "irn-bandar", name: "Bandar Abbas Naval Base", nameRu: "Бендер-Аббас", countryIso: "IRN", operator: "Iran Navy / IRGCN", alliance: "OTHER", type: "naval", position: [56.27, 27.19], importance: 83, navalReachKm: 3200, description: "Ключевой иранский узел у Ормузского пролива." },
  { objectKind: "militaryBase", id: "egy-berenice", name: "Berenice Military Base", nameRu: "Береника", countryIso: "EGY", operator: "Egyptian Armed Forces", alliance: "OTHER", type: "joint", position: [35.51, 23.92], importance: 80, airRadiusKm: 1900, navalReachKm: 3300, description: "Египетский южный узел Красного моря." },
  { objectKind: "militaryBase", id: "fra-toulon", name: "Toulon Naval Base", nameRu: "Тулон", countryIso: "FRA", operator: "French Navy", alliance: "NATO", type: "naval", position: [5.93, 43.12], importance: 89, navalReachKm: 4300, description: "Главная средиземноморская база ВМС Франции." },
  { objectKind: "militaryBase", id: "fra-istres", name: "Istres-Le Tubé Air Base", nameRu: "Истр", countryIso: "FRA", operator: "French Air and Space Force", alliance: "NATO", type: "air", position: [4.92, 43.52], importance: 84, airRadiusKm: 2500, description: "Французская стратегическая авиация и испытательная инфраструктура." },
];

function allianceColor(alliance: MilitaryBaseAlliance): [number, number, number, number] {
  switch (alliance) {
    case "NATO": return [59, 130, 246, 230];
    case "US": return [34, 211, 238, 230];
    case "RUS": return [239, 68, 68, 230];
    case "CSTO": return [248, 113, 113, 220];
    case "CHN": return [245, 158, 11, 230];
    case "AUKUS": return [56, 189, 248, 225];
    case "IND": return [34, 197, 94, 220];
    case "ISR": return [129, 140, 248, 220];
    case "GCC": return [45, 212, 191, 220];
    default: return [148, 163, 184, 210];
  }
}

function typeWeight(type: MilitaryBaseType): number {
  switch (type) {
    case "joint": return 1.22;
    case "naval": return 1.13;
    case "missile": return 1.12;
    case "air": return 1.08;
    case "logistics": return 0.96;
    case "land": return 0.92;
  }
}

export function getStrategicMilitaryBases(): MilitaryBasePoint[] {
  return BASES.map((base) => ({ ...base }));
}

export function createMilitaryBaseLayers(): Layer[] {
  const bases = getStrategicMilitaryBases();
  const haloLayer = new ScatterplotLayer<MilitaryBasePoint>({
    id: "strategic-military-base-halos",
    data: bases,
    pickable: true,
    opacity: 0.24,
    stroked: false,
    filled: true,
    getPosition: (d) => d.position,
    getRadius: (d) => (52000 + d.importance * 1450) * typeWeight(d.type),
    getFillColor: (d) => {
      const [r, g, b] = allianceColor(d.alliance);
      return [r, g, b, 62];
    },
    radiusUnits: "meters",
    radiusMinPixels: 5,
    radiusMaxPixels: 72,
  });

  const coreLayer = new ScatterplotLayer<MilitaryBasePoint>({
    id: "strategic-military-bases",
    data: bases,
    pickable: true,
    opacity: 0.94,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: (d) => d.position,
    getRadius: (d) => (14000 + d.importance * 420) * typeWeight(d.type),
    getFillColor: (d) => allianceColor(d.alliance),
    getLineColor: [226, 232, 240, 210],
    radiusUnits: "meters",
    radiusMinPixels: 4,
    radiusMaxPixels: 22,
  });

  const labels = bases
    .filter((base) => base.importance >= 88)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 34);

  const labelLayer = new TextLayer<MilitaryBasePoint>({
    id: "strategic-military-base-labels",
    data: labels,
    pickable: false,
    getPosition: (d) => d.position,
    getText: (d) => d.nameRu,
    getSize: (d) => 9 + (d.importance - 80) / 5,
    getColor: [226, 232, 240, 225],
    getTextAnchor: "middle",
    getAlignmentBaseline: "bottom",
    getPixelOffset: [0, -10],
    background: true,
    getBackgroundColor: [2, 6, 23, 170],
    backgroundPadding: [3, 2],
    fontFamily: "monospace",
  });

  return [haloLayer, coreLayer, labelLayer];
}

export function buildAirReachPoints(countries: ReadonlyArray<AirReachCountryInput>): AirReachPoint[] {
  return countries
    .filter((country) => (country.totalAircraft ?? 0) > 0)
    .map((country) => {
      const reach = estimateAirOperationalReach(country);
      return {
        objectKind: "airReach" as const,
        iso: country.isoCode,
        name: country.nameRu || country.name,
        position: getPosition(country.isoCode),
        combatRadiusKm: reach.combatRadiusKm,
        expeditionaryRadiusKm: reach.expeditionaryRadiusKm,
        reachScore: reach.reachScore,
        side: country.side ?? "NEUTRAL",
        coalition: country.coalition ?? null,
        bp: country.bpAdvanced ?? country.bpTotal ?? 0,
        explanation: reach.explanation,
      };
    })
    .sort((a, b) => b.reachScore - a.reachScore);
}

function sideColor(side: string): [number, number, number, number] {
  switch (side) {
    case "NATO": return [59, 130, 246, 210];
    case "RUS": return [239, 68, 68, 210];
    case "CHINA": return [245, 158, 11, 210];
    case "UKR": return [234, 179, 8, 210];
    default: return [148, 163, 184, 185];
  }
}

export function createAirReachLayers(countries: ReadonlyArray<AirReachCountryInput>): Layer[] {
  const points = buildAirReachPoints(countries).slice(0, 42);

  const expeditionaryLayer = new ScatterplotLayer<AirReachPoint>({
    id: "strategic-air-expeditionary-ranges",
    data: points,
    pickable: true,
    opacity: 0.18,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: (d) => d.position,
    getRadius: (d) => d.expeditionaryRadiusKm * 1000,
    getFillColor: (d) => {
      const [r, g, b] = sideColor(d.side);
      return [r, g, b, 32];
    },
    getLineColor: (d) => {
      const [r, g, b] = sideColor(d.side);
      return [r, g, b, 90];
    },
    radiusUnits: "meters",
    radiusMinPixels: 10,
    radiusMaxPixels: 260,
  });

  const combatLayer = new ScatterplotLayer<AirReachPoint>({
    id: "strategic-air-combat-ranges",
    data: points,
    pickable: true,
    opacity: 0.34,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: (d) => d.position,
    getRadius: (d) => d.combatRadiusKm * 1000,
    getFillColor: (d) => {
      const [r, g, b] = sideColor(d.side);
      return [r, g, b, 46];
    },
    getLineColor: (d) => {
      const [r, g, b] = sideColor(d.side);
      return [r, g, b, 150];
    },
    radiusUnits: "meters",
    radiusMinPixels: 7,
    radiusMaxPixels: 190,
  });

  const centerLayer = new ScatterplotLayer<AirReachPoint>({
    id: "strategic-air-reach-centers",
    data: points,
    pickable: true,
    opacity: 0.9,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: (d) => d.position,
    getRadius: (d) => 18000 + d.reachScore * 650,
    getFillColor: (d) => sideColor(d.side),
    getLineColor: [226, 232, 240, 210],
    radiusUnits: "meters",
    radiusMinPixels: 4,
    radiusMaxPixels: 24,
  });

  return [expeditionaryLayer, combatLayer, centerLayer];
}
