// ─────────────────────────────────────────────────────────────────────────────
// Проекция силы: затухание потенциала с дистанцией, базы, союзники,
// узкие места морских коммуникаций (Волна 3)
// Боевой потенциал страны — не то, что она может применить на чужом
// театре. Движок считает ДОСТАВЛЕННЫЙ потенциал: базовый БП, ослабленный
// дистанцией, усиленный базами и союзниками и пропущенный через
// пропускную способность маршрутов с их chokepoint'ами.
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────
//
// Метод.
//   Затухание по доменам: каждый домен войны теряет силу со своей
//   характерной дистанцией (экспоненциальная модель delivered = base x
//   exp(-d / range)):
//     сухопутные силы — range ~800 км (железнодорожно-автомобильное плечо);
//     тактическая авиация — ~1 200 км без дозаправки и передовых аэродромов;
//     авиация с дозаправкой — ~3 500 км;
//     флот — ~9 000 км (автономность корабельных групп);
//     ракетное оружие — ~15 000 км (но боезапас конечен, см. endurance).
//   Базы сокращают эффективную дистанцию: сила проецируется не из дома,
//   а от ближайшей способной базы. Союзники добавляют логистический
//   множитель (доступ к портам, аэродромам, тыловому обеспечению).
//   Chokepoint'ы маршрута дают пропускной коэффициент: открытый пролив —
//   1.0, оспариваемый — доля пропускной способности, закрытый — 0
//   (или объезд с добавкой дистанции). Доставленный потенциал умножается
//   на минимальный коэффициент маршрута: цепь сильна слабейшим звеном.
//
// Ограничения честности: модель — сравнительная эвристика уровня открытой
// аналитики (в духе оценок «delivered combat power» RAND/CSIS), а не
// оперативное планирование. Она отвечает на вопрос «кто и насколько
// ослабевает на этом театре», а не «кто выиграет сражение» — за сражение
// отвечает движок Ланчестера, куда доставленный потенциал подаётся
// как начальная численность и качество.

// ─────────────────────────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────────────────────────

/** Домен проецирования силы */
export type ProjectionDomain =
  | "land"
  | "airTactical"
  | "airRefuelled"
  | "naval"
  | "missile";

/** Передовая база, сокращающая эффективную дистанцию до театра */
export interface ForwardBase {
  /** Название базы */
  name: string;
  /** Страна/территория базирования */
  locationRu: string;
  /** Дистанция от базы до театра, км */
  distanceToTheaterKm: number;
  /**
   * Способность базы 0–1: инфраструктура, склады, защита.
   * База со способностью 0.5 сокращает дистанцию лишь частично:
   * эффективная дистанция = direct x (1 - capability) + base x capability.
   */
  capability: number;
}

/** Статус контроля над узким местом маршрута */
export type ChokepointControl = "open" | "contested" | "closed";

/** Узкое место морской/сухопутной коммуникации */
export interface Chokepoint {
  /** Идентификатор */
  id: string;
  /** Название на русском */
  nameRu: string;
  /** Название на английском */
  nameEn: string;
  /** Регион */
  regionRu: string;
  /** Тип узкого места */
  kind: "strait" | "canal" | "pass" | "gap" | "portApproach";
  /** Ширина в самом узком месте, км (null — не применимо) */
  widthKm: number | null;
  /** Доля мирового судоходства/региональной торговли, проходящая через точку, % */
  globalTradeSharePct: number | null;
  /** Что происходит при закрытии: последствия на русском */
  closureImpactRu: string;
  /** Альтернативный маршрут и его цена на русском */
  alternativeRu: string;
}

/** Участок маршрута через узкое место с заданным контролем */
export interface RouteChokepointLeg {
  /** Идентификатор chokepoint'а из каталога */
  chokepointId: string;
  /** Кто контролирует точку с точки зрения идущей стороны */
  control: ChokepointControl;
}

/** Вход расчёта проекции */
export interface ProjectionInput {
  /** Базовый боевой потенциал страны (например, БП 0–100 из модели проекта) */
  basePotential: number;
  /** Дистанция от собственной территории до театра напрямую, км */
  directDistanceKm: number;
  /** Домен проецирования */
  domain: ProjectionDomain;
  /** Доступные передовые базы */
  bases: ForwardBase[];
  /**
   * Логистическая поддержка союзников на театре 0–1:
   * 0 — союзников нет, 1 — полная инфраструктура союзника (порты,
   * аэродромы, склады, ПВО прикрытия маршрутов).
   */
  allySupport: number;
  /** Маршрут снабжения через узкие места */
  route: RouteChokepointLeg[];
  /** Добавка дистанции при объезде закрытых точек, км */
  detourDistanceKm: number;
}

/** Степень достижимости театра */
export type ReachGrade =
  | "full"
  | "strong"
  | "limited"
  | "marginal"
  | "unreachable";

/** Итог расчёта проекции */
export interface ProjectionResult {
  /** Доставленный потенциал на театре (та же шкала, что basePotential) */
  deliveredPotential: number;
  /** Доля базового потенциала, дошедшая до театра, % */
  deliveredPct: number;
  /** Эффективная дистанция после учёта баз и объездов, км */
  effectiveDistanceKm: number;
  /** Коэффициент затухания дистанции 0–1 */
  distanceFactor: number;
  /** Множитель союзнической поддержки */
  allyFactor: number;
  /** Пропускной коэффициент маршрута 0–1 (слабейшее звено) */
  routeFactor: number;
  /** Узкое место, ограничившее маршрут (null — маршрут не ограничен) */
  bottleneckChokepoint: Chokepoint | null;
  /** Степень достижимости */
  reachGrade: ReachGrade;
  /** Предупреждения и пояснения на русском */
  warningsRu: string[];
  /** Вердикт на русском */
  verdictRu: string;
}

/** Готовый театральный сценарий для UI и аналитики */
export interface TheaterPreset {
  /** Идентификатор */
  id: string;
  /** Название на русском */
  nameRu: string;
  /** Описание театра */
  descriptionRu: string;
  /** Проекции сторон на этом театре */
  sides: Array<{
    /** Название стороны */
    nameRu: string;
    /** Вход проекции */
    input: ProjectionInput;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Затухание по доменам
// ─────────────────────────────────────────────────────────────────────────────

/** Характерная дистанция затухания по доменам, км */
export const DOMAIN_DECAY_RANGE_KM: Record<ProjectionDomain, number> = {
  land: 800,
  airTactical: 1_200,
  airRefuelled: 3_500,
  naval: 9_000,
  missile: 15_000,
};

/** Названия доменов на русском */
export const PROJECTION_DOMAIN_LABELS_RU: Record<ProjectionDomain, string> = {
  land: "Сухопутные силы",
  airTactical: "Тактическая авиация без дозаправки",
  airRefuelled: "Авиация с дозаправкой в воздухе",
  naval: "Флот и морская авиация",
  missile: "Ракетное оружие большой дальности",
};

/**
 * Коэффициент затухания потенциала на дистанции для домена.
 * Экспонента: на характерной дистанции остаётся ~37% потенциала,
 * на двойной — ~14%, на тройной — ~5%.
 */
export function distanceDecayFactor(
  distanceKm: number,
  domain: ProjectionDomain,
): number {
  const range: number = DOMAIN_DECAY_RANGE_KM[domain];
  if (distanceKm <= 0) {
    return 1;
  }
  return Math.exp(-distanceKm / range);
}

/**
 * Эффективная дистанция с учётом баз.
 * Каждая база предлагает «сокращённый» путь: blend прямой дистанции
 * и дистанции от базы по способности базы. Итог — минимум по всем
 * вариантам (дом напрямую и каждая база) плюс объезд закрытых точек.
 */
export function effectiveDistanceKm(input: ProjectionInput): number {
  let best: number = input.directDistanceKm;
  for (const base of input.bases) {
    const capability: number = Math.max(0, Math.min(1, base.capability));
    const blended: number =
      input.directDistanceKm * (1 - capability) +
      base.distanceToTheaterKm * capability;
    if (blended < best) {
      best = blended;
    }
  }
  return best + Math.max(0, input.detourDistanceKm);
}

/**
 * Множитель союзнической поддержки: полная инфраструктура союзника
 * добавляет до +35% к доставленному потенциалу (тыл, порты, аэродромы,
 * совместное ПВО), отсутствие союзников — нейтральный 1.0.
 */
export function allySupportFactor(allySupport: number): number {
  const clamped: number = Math.max(0, Math.min(1, allySupport));
  return 1 + clamped * 0.35;
}

// ─────────────────────────────────────────────────────────────────────────────
// Каталог узких мест (chokepoints)
// ─────────────────────────────────────────────────────────────────────────────

/** Мировые узкие места морских коммуникаций и ключевых проходов */
export const CHOKEPOINTS: Chokepoint[] = [
  {
    id: "malacca",
    nameRu: "Малаккский пролив",
    nameEn: "Strait of Malacca",
    regionRu: "Юго-Восточная Азия",
    kind: "strait",
    widthKm: 2.8,
    globalTradeSharePct: 25,
    closureImpactRu:
      "Закрытие отрезает Китай, Японию и Корею от ближневосточной нефти: до 80% китайского нефтяного импорта идёт этим проливом («малаккская дилемма» Пекина).",
    alternativeRu:
      "Проливы Сунда и Ломбок: +1 000–1 600 км и +2–3 суток хода, Ломбок глубоководен и пригоден для крупных танкеров.",
  },
  {
    id: "hormuz",
    nameRu: "Ормузский пролив",
    nameEn: "Strait of Hormuz",
    regionRu: "Персидский залив",
    kind: "strait",
    widthKm: 33,
    globalTradeSharePct: 20,
    closureImpactRu:
      "Через пролив проходит около пятой части мировой нефти и треть СПГ Катара; минирование и ракетные угрозы останавливают страхование и судоходство быстрее, чем физическая блокада.",
    alternativeRu:
      "Нефтепроводы Саудовской Аравии к Красному морю и ОАЭ к Фуджейре покрывают лишь часть объёмов; полноценного объезда нет.",
  },
  {
    id: "suez",
    nameRu: "Суэцкий канал",
    nameEn: "Suez Canal",
    regionRu: "Красное море — Средиземное море",
    kind: "canal",
    widthKm: 0.3,
    globalTradeSharePct: 12,
    closureImpactRu:
      "Связка Азия—Европа: атаки на судоходство в Красном море в 2023–2025 гг. уже показали, что торговля уходит вокруг Африки без формального закрытия канала.",
    alternativeRu: "Мыс Доброй Надежды: +5 500 км и +10–14 суток на рейсе Азия—Европа.",
  },
  {
    id: "bab_el_mandeb",
    nameRu: "Баб-эль-Мандебский пролив",
    nameEn: "Bab el-Mandeb",
    regionRu: "Красное море",
    kind: "strait",
    widthKm: 26,
    globalTradeSharePct: 10,
    closureImpactRu:
      "Южные ворота Суэца: угроза со стороны берега (ПКР и БПЛА хуситов) закрыла пролив для значительной части торгового флота в 2024 году без единой мины.",
    alternativeRu: "Мыс Доброй Надежды, как и для Суэца; для военных кораблей — эскортирование и подавление береговых батарей.",
  },
  {
    id: "bosphorus",
    nameRu: "Босфор и Дарданеллы",
    nameEn: "Turkish Straits",
    regionRu: "Чёрное море",
    kind: "strait",
    widthKm: 0.7,
    globalTradeSharePct: null,
    closureImpactRu:
      "Конвенция Монтрё даёт Турции право закрывать проливы для военных кораблей воюющих сторон: Чёрное море превращается в замкнутый театр, где флот нельзя ни ввести, ни вывести.",
    alternativeRu: "Объезда для военных кораблей нет юридически; коммерческое судоходство ограничивается, но не блокируется полностью.",
  },
  {
    id: "taiwan_strait",
    nameRu: "Тайваньский пролив",
    nameEn: "Taiwan Strait",
    regionRu: "Восточная Азия",
    kind: "strait",
    widthKm: 130,
    globalTradeSharePct: null,
    closureImpactRu:
      "Театр возможного конфликта сам по себе: пролив — главный маршрут снабжения Тайваня и одновременно рубеж развёртывания НОАК; блокада острова начинается с контроля пролива.",
    alternativeRu: "Восточное побережье Тайваня (Тихий океан): маршруты снабжения длиннее и требуют прорыва морского и воздушного контроля.",
  },
  {
    id: "giuk",
    nameRu: "Рубеж GIUK (Гренландия—Исландия—Великобритания)",
    nameEn: "GIUK Gap",
    regionRu: "Северная Атлантика",
    kind: "gap",
    widthKm: null,
    globalTradeSharePct: null,
    closureImpactRu:
      "Ворота российских АПЛ Северного флота в Атлантику и одновременно рубеж противолодочной обороны НАТО: контроль рубежа решает, дойдут ли подкрепления США до Европы.",
    alternativeRu: "Объезда нет: арктические маршруты подо льдом доступны только АПЛ и не решают задачу надводной логистики.",
  },
  {
    id: "danish_straits",
    nameRu: "Датские проливы",
    nameEn: "Danish Straits",
    regionRu: "Балтика",
    kind: "strait",
    widthKm: 4,
    globalTradeSharePct: null,
    closureImpactRu:
      "Единственный выход Балтийского флота и балтийской торговли России в океан; после вступления Финляндии и Швеции в НАТО Балтика — «озеро НАТО» с российской проблемой Калининградского эксклава.",
    alternativeRu: "Объезда нет: Калининград снабжается морем через проливы или воздухом.",
  },
  {
    id: "panama",
    nameRu: "Панамский канал",
    nameEn: "Panama Canal",
    regionRu: "Центральная Америка",
    kind: "canal",
    widthKm: 0.05,
    globalTradeSharePct: 5,
    closureImpactRu:
      "Переброска флота США между Атлантикой и Тихим океаном: закрытие или засуха (ограничения осадки 2023–2024) растягивает перегруппировку на недели.",
    alternativeRu: "Магелланов пролив и мыс Горн: +8 000 км; авианосцы не проходят шлюзы и традиционно огибают Южную Америку.",
  },
  {
    id: "korea_strait",
    nameRu: "Корейский пролив",
    nameEn: "Korea Strait",
    regionRu: "Восточная Азия",
    kind: "strait",
    widthKm: 200,
    globalTradeSharePct: null,
    closureImpactRu:
      "Связка Японии и Кореи с Жёлтым морем; в корейском сценарии пролив — маршрут подкреплений Японии и эвакуации, контролируемый авиацией обеих сторон.",
    alternativeRu: "Цугару и открытое Японское море: маршруты длиннее и проходят ближе к российским и северокорейским берегам.",
  },
  {
    id: "luzon",
    nameRu: "Лусонский пролив",
    nameEn: "Luzon Strait",
    regionRu: "Первая островная цепь",
    kind: "strait",
    widthKm: 250,
    globalTradeSharePct: null,
    closureImpactRu:
      "Главные ворота китайских АПЛ из Южно-Китайского моря в Тихий океан для патрулирования у Гуама и второй островной цепи; контролируется противолодочными силами США, Японии и Тайваня.",
    alternativeRu: "Проливы между островами Филиппин мелководны и наблюдаемы; глубоководного скрытного объезда нет.",
  },
  {
    id: "miyako",
    nameRu: "Пролив Мияко",
    nameEn: "Miyako Strait",
    regionRu: "Первая островная цепь",
    kind: "strait",
    widthKm: 250,
    globalTradeSharePct: null,
    closureImpactRu:
      "Основной выход надводных групп ВМС НОАК в Тихий океан; японские батареи ПКР на Мияко и Исигаки превращают пролив в огневой рубеж.",
    alternativeRu: "Проливы Осуми и Токара у главных островов Японии — ещё ближе к японским берегам и базам.",
  },
  {
    id: "gibraltar",
    nameRu: "Гибралтарский пролив",
    nameEn: "Strait of Gibraltar",
    regionRu: "Средиземное море",
    kind: "strait",
    widthKm: 14,
    globalTradeSharePct: null,
    closureImpactRu:
      "Западные ворота Средиземного моря; контроль пролива определяет подкрепление средиземноморских группировок НАТО и снабжение через Суэц.",
    alternativeRu: "Объезда в Средиземное море нет, кроме Суэца с востока.",
  },
  {
    id: "kerch",
    nameRu: "Керченский пролив",
    nameEn: "Kerch Strait",
    regionRu: "Азовское море",
    kind: "strait",
    widthKm: 4,
    globalTradeSharePct: null,
    closureImpactRu:
      "Ворота Азовского моря и узел снабжения через Крымский мост: удары по мосту и проливу — центральный сюжет логистической войны 2022–2025 гг.",
    alternativeRu: "Сухопутный коридор вдоль Азовского побережья — длиннее и уязвим на всём протяжении.",
  },
  {
    id: "kaliningrad_corridor",
    nameRu: "Сувалкский коридор",
    nameEn: "Suwałki Gap",
    regionRu: "Восточная Европа",
    kind: "gap",
    widthKm: 65,
    globalTradeSharePct: null,
    closureImpactRu:
      "Единственная сухопутная связка стран Балтии с остальной НАТО между Калининградом и Беларусью; её перекрытие изолирует балтийский театр быстрее любой морской блокады.",
    alternativeRu: "Морское и воздушное снабжение Балтии через Балтийское море под угрозой ракетных ударов.",
  },
];

/** Найти узкое место по идентификатору */
export function getChokepoint(id: string): Chokepoint | undefined {
  return CHOKEPOINTS.find(
    (chokepoint: Chokepoint): boolean => chokepoint.id === id,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Пропускная способность маршрута
// ─────────────────────────────────────────────────────────────────────────────

/** Пропускной коэффициент одного узкого места по статусу контроля */
export function chokepointThroughput(control: ChokepointControl): number {
  if (control === "open") {
    return 1.0;
  }
  if (control === "contested") {
    return 0.45;
  }
  return 0.0;
}

/**
 * Пропускной коэффициент маршрута и его слабейшее звено.
 * Маршрут — последовательная цепь: итог равен минимуму по участкам,
 * а не произведению (пропускная способность цепи — это её узкое место).
 * Пустой маршрут — коэффициент 1.
 */
export function routeThroughput(route: RouteChokepointLeg[]): {
  factor: number;
  bottleneck: Chokepoint | null;
} {
  let factor: number = 1;
  let bottleneck: Chokepoint | null = null;
  for (const leg of route) {
    const legFactor: number = chokepointThroughput(leg.control);
    if (legFactor < factor) {
      factor = legFactor;
      bottleneck = getChokepoint(leg.chokepointId) ?? null;
    }
  }
  return { factor, bottleneck };
}

// ─────────────────────────────────────────────────────────────────────────────
// Главный расчёт проекции
// ─────────────────────────────────────────────────────────────────────────────

/** Степень достижимости по доле доставленного потенциала */
export function reachGradeForDeliveredPct(deliveredPct: number): ReachGrade {
  if (deliveredPct >= 70) {
    return "full";
  }
  if (deliveredPct >= 45) {
    return "strong";
  }
  if (deliveredPct >= 25) {
    return "limited";
  }
  if (deliveredPct >= 8) {
    return "marginal";
  }
  return "unreachable";
}

/** Названия степеней достижимости на русском */
export const REACH_GRADE_LABELS_RU: Record<ReachGrade, string> = {
  full: "Полная достижимость (театр как домашний)",
  strong: "Сильная проекция (устойчивая группировка)",
  limited: "Ограниченная проекция (рейды и временное присутствие)",
  marginal: "Маргинальная проекция (символическое присутствие)",
  unreachable: "Театр практически недостижим",
};

/**
 * Доставленный потенциал на театре.
 * delivered = base x distanceDecay(effectiveDistance) x allyFactor x routeFactor.
 * Закрытое узкое место (routeFactor 0) обнуляет проекцию полностью:
 * снабжать группировку нечем независимо от её боевой силы.
 */
export function projectForce(input: ProjectionInput): ProjectionResult {
  const distance: number = effectiveDistanceKm(input);
  const distanceFactor: number = distanceDecayFactor(distance, input.domain);
  const allyFactor: number = allySupportFactor(input.allySupport);
  const route: { factor: number; bottleneck: Chokepoint | null } =
    routeThroughput(input.route);

  const delivered: number =
    input.basePotential * distanceFactor * allyFactor * route.factor;
  const deliveredPct: number =
    input.basePotential > 0 ? (delivered / input.basePotential) * 100 : 0;
  const grade: ReachGrade = reachGradeForDeliveredPct(deliveredPct);

  const warningsRu: string[] = [];
  if (route.factor === 0 && route.bottleneck !== null) {
    warningsRu.push(
      `Маршрут перекрыт: «${route.bottleneck.nameRu}» закрыт. ${route.bottleneck.closureImpactRu}`,
    );
  } else if (route.bottleneck !== null && route.factor < 1) {
    warningsRu.push(
      `Слабейшее звено маршрута — «${route.bottleneck.nameRu}»: пропускная способность снижена до ${Math.round(route.factor * 100)}%.`,
    );
  }
  if (input.bases.length === 0 && input.directDistanceKm > 1500) {
    warningsRu.push(
      "Передовых баз нет: проекция опирается только на домашнюю территорию, затухание максимально.",
    );
  }
  if (input.allySupport < 0.2 && input.directDistanceKm > 3000) {
    warningsRu.push(
      "Союзнической инфраструктуры на театре почти нет: тыл придётся везти с собой, темп операции ограничен снабжением.",
    );
  }
  if (input.domain === "land" && distance > 1500) {
    warningsRu.push(
      "Сухопутная проекция дальше ~1 500 км исторически требует захвата и восстановления железнодорожной сети театра; модель затухания это учитывает лишь в среднем.",
    );
  }

  const verdictRu: string =
    `Доставленный потенциал: ${delivered.toFixed(1)} из ${input.basePotential.toFixed(1)} ` +
    `(${deliveredPct.toFixed(0)}%) на эффективной дистанции ${Math.round(distance)} км. ` +
    `${REACH_GRADE_LABELS_RU[grade]}.`;

  return {
    deliveredPotential: delivered,
    deliveredPct,
    effectiveDistanceKm: distance,
    distanceFactor,
    allyFactor,
    routeFactor: route.factor,
    bottleneckChokepoint: route.bottleneck,
    reachGrade: grade,
    warningsRu,
    verdictRu,
  };
}

/**
 * Сравнение проекций двух сторон на одном театре.
 * Возвращает обе проекции и отношение доставленных потенциалов —
 * вход для движка Ланчестера (начальные «численности» театра).
 */
export function compareProjection(
  nameA: string,
  inputA: ProjectionInput,
  nameB: string,
  inputB: ProjectionInput,
): {
  a: ProjectionResult;
  b: ProjectionResult;
  deliveredRatio: number;
  explanationRu: string;
} {
  const a: ProjectionResult = projectForce(inputA);
  const b: ProjectionResult = projectForce(inputB);
  const ratio: number =
    b.deliveredPotential > 0
      ? a.deliveredPotential / b.deliveredPotential
      : Number.POSITIVE_INFINITY;
  const leader: string = ratio >= 1 ? nameA : nameB;
  const explanationRu: string =
    `На театре сильнее позиция стороны ${leader}: отношение доставленных ` +
    `потенциалов ${Math.max(ratio, 1 / ratio).toFixed(2)}:1. Базовые потенциалы ` +
    `стран здесь вторичны — решают дистанция, базы и маршруты снабжения.`;
  return { a, b, deliveredRatio: ratio, explanationRu };
}

// ─────────────────────────────────────────────────────────────────────────────
// Пресеты театров
// ─────────────────────────────────────────────────────────────────────────────

/** Каталог театральных пресетов с проекциями ключевых сторон */
export const THEATER_PRESETS: TheaterPreset[] = [
  {
    id: "taiwan_strait",
    nameRu: "Тайваньский пролив",
    descriptionRu:
      "Классический асимметричный театр: НОАК воюет у дома, США проецируют силу через Тихий океан на первую островную цепь.",
    sides: [
      {
        nameRu: "Китай (НОАК)",
        input: {
          basePotential: 78,
          directDistanceKm: 300,
          domain: "land",
          bases: [],
          allySupport: 0,
          route: [],
          detourDistanceKm: 0,
        },
      },
      {
        nameRu: "США",
        input: {
          basePotential: 92,
          directDistanceKm: 11_000,
          domain: "naval",
          bases: [
            {
              name: "Йокосука и Окинава (Япония)",
              locationRu: "Япония",
              distanceToTheaterKm: 750,
              capability: 0.9,
            },
            {
              name: "Гуам",
              locationRu: "Гуам (США)",
              distanceToTheaterKm: 2_700,
              capability: 0.8,
            },
          ],
          allySupport: 0.8,
          route: [
            { chokepointId: "miyako", control: "contested" },
            { chokepointId: "luzon", control: "contested" },
          ],
          detourDistanceKm: 0,
        },
      },
    ],
  },
  {
    id: "baltic",
    nameRu: "Балтийский театр",
    descriptionRu:
      "Россия воюет из Калининграда и Ленинградской области; НАТО подкрепляет Балтию через Сувалкский коридор и Датские проливы.",
    sides: [
      {
        nameRu: "Россия (Западный округ)",
        input: {
          basePotential: 70,
          directDistanceKm: 400,
          domain: "land",
          bases: [],
          allySupport: 0.3,
          route: [],
          detourDistanceKm: 0,
        },
      },
      {
        nameRu: "НАТО (подкрепление Балтии)",
        input: {
          basePotential: 92,
          directDistanceKm: 1_200,
          domain: "land",
          bases: [
            {
              name: "Рамштайн и базы в Германии",
              locationRu: "Германия",
              distanceToTheaterKm: 900,
              capability: 0.85,
            },
          ],
          allySupport: 1.0,
          route: [
            { chokepointId: "kaliningrad_corridor", control: "contested" },
          ],
          detourDistanceKm: 0,
        },
      },
    ],
  },
  {
    id: "south_china_sea",
    nameRu: "Южно-Китайское море",
    descriptionRu:
      "Китай опирается на береговую инфраструктуру и искусственные острова; США и союзники зависят от Малакки и баз в Японии и на Филиппинах.",
    sides: [
      {
        nameRu: "Китай (Южный флот)",
        input: {
          basePotential: 78,
          directDistanceKm: 900,
          domain: "naval",
          bases: [
            {
              name: "Искусственные острова Спратли",
              locationRu: "Южно-Китайское море",
              distanceToTheaterKm: 400,
              capability: 0.5,
            },
          ],
          allySupport: 0,
          route: [{ chokepointId: "malacca", control: "open" }],
          detourDistanceKm: 0,
        },
      },
      {
        nameRu: "США и союзники",
        input: {
          basePotential: 92,
          directDistanceKm: 13_000,
          domain: "naval",
          bases: [
            {
              name: "Сингапур (Чанги, логистическая точка)",
              locationRu: "Сингапур",
              distanceToTheaterKm: 1_400,
              capability: 0.55,
            },
            {
              name: "Базы EDCA (Филиппины)",
              locationRu: "Филиппины",
              distanceToTheaterKm: 900,
              capability: 0.6,
            },
          ],
          allySupport: 0.7,
          route: [{ chokepointId: "malacca", control: "contested" }],
          detourDistanceKm: 0,
        },
      },
    ],
  },
  {
    id: "persian_gulf",
    nameRu: "Персидский залив и Ормуз",
    descriptionRu:
      "Иран у дома с береговыми ПКР и минами; США держат 5-й флот в Бахрейне, но вся нефтяная логистика региона висит на Ормузе.",
    sides: [
      {
        nameRu: "Иран",
        input: {
          basePotential: 45,
          directDistanceKm: 200,
          domain: "missile",
          bases: [],
          allySupport: 0,
          route: [],
          detourDistanceKm: 0,
        },
      },
      {
        nameRu: "США (5-й флот)",
        input: {
          basePotential: 92,
          directDistanceKm: 11_500,
          domain: "naval",
          bases: [
            {
              name: "Манама (Бахрейн)",
              locationRu: "Бахрейн",
              distanceToTheaterKm: 100,
              capability: 0.85,
            },
          ],
          allySupport: 0.6,
          route: [{ chokepointId: "hormuz", control: "contested" }],
          detourDistanceKm: 0,
        },
      },
    ],
  },
  {
    id: "black_sea",
    nameRu: "Чёрное море при закрытых проливах",
    descriptionRu:
      "Конвенция Монтрё в действии: Турция закрывает проливы воюющим сторонам, внешний флот НАТО не может войти — театр заперт для тех, кто уже внутри.",
    sides: [
      {
        nameRu: "Россия (Черноморский флот и юг)",
        input: {
          basePotential: 70,
          directDistanceKm: 500,
          domain: "land",
          bases: [],
          allySupport: 0,
          route: [],
          detourDistanceKm: 0,
        },
      },
      {
        nameRu: "НАТО (внешнее подкрепление)",
        input: {
          basePotential: 92,
          directDistanceKm: 1_800,
          domain: "naval",
          bases: [
            {
              name: "Констанца (Румыния)",
              locationRu: "Румыния",
              distanceToTheaterKm: 400,
              capability: 0.5,
            },
          ],
          allySupport: 0.7,
          route: [{ chokepointId: "bosphorus", control: "closed" }],
          detourDistanceKm: 0,
        },
      },
    ],
  },
];

/** Найти пресет театра по идентификатору */
export function getTheaterPreset(id: string): TheaterPreset | undefined {
  return THEATER_PRESETS.find(
    (preset: TheaterPreset): boolean => preset.id === id,
  );
}

/**
 * Полный разбор театрального пресета: проекции всех сторон пресета.
 * Удобная точка входа для UI и отчётов.
 */
export function assessTheaterPreset(preset: TheaterPreset): Array<{
  nameRu: string;
  result: ProjectionResult;
}> {
  return preset.sides.map(
    (side: { nameRu: string; input: ProjectionInput }): {
      nameRu: string;
      result: ProjectionResult;
    } => ({
      nameRu: side.nameRu,
      result: projectForce(side.input),
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Снабжение театра: сколько тонн в сутки съедает доставленная сила
// ─────────────────────────────────────────────────────────────────────────────
//
// Доставленный потенциал без снабжения живёт ровно столько, сколько
// привезённые с собой запасы. Этот блок связывает проекцию с логистикой:
// по размеру группировки оценивается суточная потребность в тоннах,
// по маршруту — пропускная способность снабжения, итог — месяцы,
// которые группировка может действовать на театре автономно и с подвозом.

/** Суточная потребность группировки в снабжении по типам сил */
export interface TheaterSupplyDemand {
  /** Численность группировки, человек */
  personnel: number;
  /** Тяжёлая техника в эквиваленте батальонных групп (для расхода ГСМ и боеприпасов) */
  heavyBattalionEquivalents: number;
  /** Интенсивность боёв 0–1 (0 — присутствие без боёв, 1 — высокая интенсивность) */
  combatIntensity: number;
}

/** Оценка суточного тоннажа снабжения */
export interface TheaterSupplyEstimate {
  /** Продовольствие и вода, тонн/сутки */
  foodWaterTonnesPerDay: number;
  /** ГСМ, тонн/сутки */
  fuelTonnesPerDay: number;
  /** Боеприпасы, тонн/сутки */
  ammoTonnesPerDay: number;
  /** Прочее (запчасти, медицина, инженерное имущество), тонн/сутки */
  otherTonnesPerDay: number;
  /** Итого, тонн/сутки */
  totalTonnesPerDay: number;
}

/**
 * Нормативы снабжения (открытые оценки уровня полевых уставов и RAND):
 *   человек в сутки — ~0.02 т продовольствия и воды с упаковкой и доставкой;
 *   тяжёлая батальонная группа в бою — ~120 т/сутки ГСМ и ~80 т/сутки
 *   боеприпасов при высокой интенсивности; в присутствии — в разы меньше.
 */
export function estimateTheaterSupplyDemand(
  demand: TheaterSupplyDemand,
): TheaterSupplyEstimate {
  const intensity: number = Math.max(0, Math.min(1, demand.combatIntensity));
  const foodWater: number = demand.personnel * 0.02;
  const fuel: number =
    demand.heavyBattalionEquivalents * (20 + 100 * intensity);
  const ammo: number = demand.heavyBattalionEquivalents * 85 * intensity;
  const other: number = demand.personnel * 0.005 + fuel * 0.1;
  return {
    foodWaterTonnesPerDay: foodWater,
    fuelTonnesPerDay: fuel,
    ammoTonnesPerDay: ammo,
    otherTonnesPerDay: other,
    totalTonnesPerDay: foodWater + fuel + ammo + other,
  };
}

/**
 * Месяцы автономного снабжения группировки на театре:
 * привезённый запас (тонн) делится на суточный расход с учётом подвоза
 * по маршруту (routeFactor масштабирует возможный подвоз).
 * Если подвоз покрывает расход — автономность бесконечна (устойчивое
 * присутствие), возвращается Infinity.
 */
export function theaterSupplyEnduranceMonths(
  stockTonnes: number,
  demand: TheaterSupplyDemand,
  dailyDeliveryTonnes: number,
  routeFactor: number,
): number {
  const estimate: TheaterSupplyEstimate = estimateTheaterSupplyDemand(demand);
  const deliveredPerDay: number =
    dailyDeliveryTonnes * Math.max(0, Math.min(1, routeFactor));
  const netDrainPerDay: number = estimate.totalTonnesPerDay - deliveredPerDay;
  if (netDrainPerDay <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  if (stockTonnes <= 0) {
    return 0;
  }
  return stockTonnes / netDrainPerDay / 30;
}
