// ─────────────────────────────────────────────────────────────────────────────
// Warfare Domains Reference
// Classification and analysis of modern warfare domains
// Cross-referenced with BP model components
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

export type WarfareDomain =
  | "land"
  | "sea"
  | "air"
  | "space"
  | "cyber"
  | "electronic"
  | "information"
  | "nuclear";

export interface DomainProfile {
  domain: WarfareDomain;
  nameRu: string;
  description: string;
  keyCapabilities: string[];
  bpComponentLink: string;        // Which BP component this domain most affects
  importanceWeight: number;        // 0-1 relative importance in modern warfare
  technologyDependency: number;    // 0-10 how dependent on advanced tech
  costIndex: number;              // 1-10 relative cost to maintain capability
  leadingCountries: string[];     // ISO3 of top 3 countries in this domain
  recentDevelopments: string[];  // Key developments 2022-2025
}

export const WARFARE_DOMAINS: DomainProfile[] = [
  {
    domain: "land",
    nameRu: "Сухопутная война",
    description: "Классический домен: танки, артиллерия, пехота. Остался доминирующим в конфликтах высокой интенсивности (СВО — сухопутная война).",
    keyCapabilities: [
      "Бронетанковые войска — манёвр и прорыв",
      "Артиллерия — огневое подавление (расход 5K-10K снарядов/день в СВО)",
      "Мотострелковые — удержание и зачистка",
      "Инженерные войска — фортификация, переправы, минирование",
      "ПВО сухопутных войск — прикрытие от авиации и дронов",
    ],
    bpComponentLink: "weaponScore (60%) + manpowerScore (30%) + readinessScore (10%)",
    importanceWeight: 0.25,
    technologyDependency: 5,
    costIndex: 6,
    leadingCountries: ["USA", "RUS", "CHN"],
    recentDevelopments: [
      "Дроны-корректировщики → артиллерийская точность +300%",
      "ПТУР (Javelin/NLAW) vs танки — изменение тактики",
      "FPV-дроны — анти-броня за $500",
      "РЭБ на уровне подразделения — жизнь без связи",
    ],
  },
  {
    domain: "sea",
    nameRu: "Морская война",
    description: "Контроль морских коммуникаций, проекция силы, подлодки. Критичен для торговых держав и силовой проекции.",
    keyCapabilities: [
      "Авианосцы — мобильные аэродромы (USA: 11,其他国家: 0-2)",
      "Подводный флот — SSBN (ядерное сдерживание), SSN (разведка/атака)",
      "Противокорабельные ракеты — угроза крупным кораблям",
      "Морская блокада — контроль торговых путей",
      "Амфибийные операции — десант",
    ],
    bpComponentLink: "weaponScore (40%) + logisticsScore (40%) + economyScore (20%)",
    importanceWeight: 0.15,
    technologyDependency: 8,
    costIndex: 10,
    leadingCountries: ["USA", "CHN", "RUS"],
    recentDevelopments: [
      "Китайский флот — крупнейший по численности (370+ кораблей)",
      "Гиперзвуковые ПКР (Циркон) — угроза авианосцам",
      "USV/ASW дроны — новый класс морского оружия",
      "ВМС США: 30-летняя программа Columbie-class SSBN ($109Мрд)",
    ],
  },
  {
    domain: "air",
    nameRu: "Воздушная война",
    description: "Воздушное превосходство, стратегическая авиация, ударные БПЛА. Ключевой домен для США/NATO.",
    keyCapabilities: [
      "Истребители 5-го поколения — F-22, F-35, J-20, Су-57",
      "Стелс — снижение ЭПР до 0.001 м²",
      "Дальние ракеты воздух-воздух — AIM-120D (180км), Р-37М (400км)",
      "Ударные БПЛА — Bayraktar, Shahed, Lancet",
      "Стратегическая авиация — B-2, B-21, Ту-160",
    ],
    bpComponentLink: "weaponScore (50%) + c2Score (30%) + economyScore (20%)",
    importanceWeight: 0.20,
    technologyDependency: 9,
    costIndex: 9,
    leadingCountries: ["USA", "RUS", "CHN"],
    recentDevelopments: [
      "F-35 — 1000+ произведено, крупнейшая программа в истории",
      "СВО: авиация ограничена ПВО — изменения в доктрине",
      "БПЛА-камикадзе — $20K против $50M ПВО",
      "B-21 Raider — 6-е поколение стелс (2023 первый полёт)",
    ],
  },
  {
    domain: "space",
    nameRu: "Космическая война",
    description: "Спутниковая разведка, навигация (GPS/ГЛОНАСС), связь. Критичен для высокоточного оружия и C4ISR.",
    keyCapabilities: [
      "GPS/ГЛОНАСС — навигация для высокоточного оружия",
      "Спутниковая разведка — SAR, оптика, сигнальная",
      "Раннее предупреждение — обнаружение пусков МБР",
      "Anti-satellite (ASAT) — уничтожение спутников",
      "Связь — MilSatCom (AEHF, Благовещенск)",
    ],
    bpComponentLink: "c2Score (60%) + weaponScore (20%) + logisticsScore (20%)",
    importanceWeight: 0.10,
    technologyDependency: 10,
    costIndex: 8,
    leadingCountries: ["USA", "CHN", "RUS"],
    recentDevelopments: [
      "Starlink в Украине — устойчивая связь под РЭБ",
      "Китайская космическая станция — военные приложения",
      "Russia ASAT тест (2021) — 1500+ обломков на орбите",
      "US Space Force — первый новый вид ВС с 1947",
    ],
  },
  {
    domain: "cyber",
    nameRu: "Кибервойна",
    description: "Наступательные и оборонительные кибероперации. Атака на инфраструктуру, разведка, дезинформация.",
    keyCapabilities: [
      "Атака на КИИ — энергетика, транспорт, связь",
      "Шпионаж — кража технологий и секретов",
      "Дезинформация — тролль-фермы, боты, deepfake",
      "Защита — кибер-оборона, CERT, zero-trust",
      "Кибер-разведка — APT (Advanced Persistent Threat)",
    ],
    bpComponentLink: "c2Score (50%) + doctrineScore (30%) + economyScore (20%)",
    importanceWeight: 0.10,
    technologyDependency: 9,
    costIndex: 4,
    leadingCountries: ["USA", "CHN", "RUS"],
    recentDevelopments: [
      "СВО: кибер-атаки на Украину и ответные (Viasat, Delta)",
      "SolarWinds — крупнейшая цепочка поставок атака (2020)",
      "AI-powered фишинг — рост успешности атак",
      "NIST Cybersecurity Framework 2.0 (2024)",
    ],
  },
  {
    domain: "electronic",
    nameRu: "Радиоэлектронная борьба (РЭБ)",
    description: "Подавление и защита радиосвязи, радаров, навигации. Ключевой домен в СВО — 'РЭБ = жизнь'.",
    keyCapabilities: [
      "Подавление связи — заглушение тактических радиостанций",
      "Подавление навигации — GPS/ГЛОНАСС спуфинг",
      "Подавление дронов — РЭБ против БПЛА",
      "Радиоразведка — пеленгация и перехват",
      "Защита — частотная адаптация, FHSS, направленные антенны",
    ],
    bpComponentLink: "c2Score (70%) + weaponScore (20%) + readinessScore (10%)",
    importanceWeight: 0.08,
    technologyDependency: 8,
    costIndex: 5,
    leadingCountries: ["RUS", "USA", "ISR"],
    recentDevelopments: [
      "СВО: РЭБ — главный домен — дроны без РЭБ = мишени",
      "Красуха-4, Борисоглебск-2 — российские системы",
      "Портативные РЭБ — Repellent, Gunslinger",
      "ФПВ-дроны с АРЭБ — адаптация к РЭБ",
    ],
  },
  {
    domain: "information",
    nameRu: "Информационная война",
    description: "Управление восприятием, пропаганда, психологические операции. Связана с моральным фактором и общественным мнением.",
    keyCapabilities: [
      "Пропаганда — формирование нарратива",
      "Психологические операции (PSYOP) — деморализация",
      "OSINT — открытая разведка (Maxar, Sentinel)",
      "Дипломатическая война — коалиционное давление",
      "Медиа-контроль —Narrative dominance",
    ],
    bpComponentLink: "doctrineScore (40%) + c2Score/morale (40%) + economyScore (20%)",
    importanceWeight: 0.07,
    technologyDependency: 6,
    costIndex: 3,
    leadingCountries: ["USA", "RUS", "CHN"],
    recentDevelopments: [
      "СВО: информационная война —双方的 нарративы",
      "Deepfake — видео Залужного, Путин и т.д.",
      "Telegram как поле боя — 500K+ подписчиков у военных каналов",
      "OSINT: FlightRadar24, Maxar, Sentinel — прозрачность поля боя",
    ],
  },
  {
    domain: "nuclear",
    nameRu: "Ядерная война",
    description: "Стратегическое сдерживание. 9 ядерных держав, 12K+ боеголовок. Порог использования — высочайший.",
    keyCapabilities: [
      "МБР шахтного базирования — Minuteman III, Ярс, DF-41",
      "БРПЛ — Trident D5, Булава, JL-2",
      "Стратегическая авиация — B-2/B-21, Ту-160, H-6N",
      "Тактическое ядерное оружие — 1500-2000 единиц (оценка)",
      "Противоракетная оборона — THAAD, Aegis, С-500",
    ],
    bpComponentLink: "weaponScore (70%) + doctrineScore (20%) + economyScore (10%)",
    importanceWeight: 0.05,
    technologyDependency: 10,
    costIndex: 10,
    leadingCountries: ["USA", "RUS", "CHN"],
    recentDevelopments: [
      "РС-28 Сармат — сверхтяжёлая МБР, испытания продолжаются",
      "Китайское наращивание — 500+ боеголовок к 2030 (Pentagon)",
      "New START истёк 2026 — конец контроля над вооружениями",
      "Tactical nukes in Belarus — первое размещение с 1991",
    ],
  },
];

// ─── Query functions ──────────────────────────────────────────────────────────
export function getDomainProfile(domain: WarfareDomain): DomainProfile | undefined {
  return WARFARE_DOMAINS.find((d) => d.domain === domain);
}

export function getAllDomains(): DomainProfile[] {
  return WARFARE_DOMAINS;
}

export function getDomainsByBPComponent(component: string): DomainProfile[] {
  return WARFARE_DOMAINS.filter((d) =>
    d.bpComponentLink.toLowerCase().includes(component.toLowerCase())
  );
}

export function getCountryDomainStrength(isoCode: string): Array<{ domain: WarfareDomain; level: "leading" | "capable" | "developing" | "minimal" }> {
  return WARFARE_DOMAINS.map((d) => {
    let level: "leading" | "capable" | "developing" | "minimal";
    if (d.leadingCountries.includes(isoCode)) level = "leading";
    else if (d.technologyDependency <= 5) level = "capable";
    else if (d.technologyDependency <= 7) level = "developing";
    else level = "minimal";
    return { domain: d.domain, level };
  });
}
