/**
 * Расширенные профили 60 стран сверх топ-30 волн 1–3 («РБП-Стратег 3.0», волна 4).
 *
 * Каждая страна: оборонная промышленность, запасы и производство, БПЛА,
 * зависимость от импорта вооружений, ключевые уязвимости. Каждое поле и каждая
 * запись снабжены провенансом: источник, год данных, флаг estimated.
 *
 * Методологическая честность:
 * - существование компаний, платформ и контрактов — проверяемые открытые факты
 *   (estimated: false);
 * - запасы, боеготовность и темпы производства публикуются фрагментарно,
 *   поэтому соответствующие секции помечены estimated: true и опираются на
 *   IISS Military Balance, SIPRI и профильную прессу;
 * - уязвимости — аналитическая оценка проекта по открытым источникам,
 *   а не официальные данные стран.
 *
 * Состав: Европа — 17, Азия и Океания — 15, Ближний Восток — 8,
 * Африка — 10, Америки — 10. Страны топ-30 (волны bp3/warfare3) сюда не входят.
 */

/** Провенанс поля профиля: источник, год данных, флаг оценочности. */
export interface ProfileProvenance {
  /** Человекочитаемый источник (база, издание, релиз). */
  source: string;
  /** Год данных. */
  year: number;
  /** true — значение оценочное, а не подтверждённый факт. */
  estimated: boolean;
}

/** Компания или предприятие ВПК страны. */
export interface ProfileCompany {
  /** Название компании. */
  name: string;
  /** Специализация (рус.). */
  specializationRu: string;
  /** Провенанс записи. */
  provenance: ProfileProvenance;
}

/** Запись о запасах/производстве по категории вооружений. */
export interface ProfileStockEntry {
  /** Категория (артиллерия, ПВО, авиация и т.д.). */
  categoryRu: string;
  /** Содержание оценки (рус.). */
  noteRu: string;
  /** Провенанс записи. */
  provenance: ProfileProvenance;
}

/** Система БПЛА на вооружении или в разработке. */
export interface ProfileUavSystem {
  /** Название системы. */
  name: string;
  /** Роль (рус.). */
  roleRu: string;
  /** Происхождение: собственное производство или поставщик (рус.). */
  originRu: string;
  /** Провенанс записи. */
  provenance: ProfileProvenance;
}

/** Поставщик вооружений страны. */
export interface ProfileSupplier {
  /** Страна-поставщик. */
  supplier: string;
  /** Что поставляет (рус.). */
  noteRu: string;
  /** Провенанс записи. */
  provenance: ProfileProvenance;
}

/** Секция «оборонная промышленность». */
export interface DefenseIndustrySection {
  /** Сводная характеристика ВПК (рус.). */
  summaryRu: string;
  /** Оценка самообеспечения (рус.). */
  selfSufficiencyRu: string;
  /** Ключевые предприятия. */
  keyCompanies: readonly ProfileCompany[];
  /** Провенанс секции. */
  provenance: ProfileProvenance;
}

/** Секция «запасы и производство». */
export interface StockpilesSection {
  /** Сводка (рус.). */
  summaryRu: string;
  /** Записи по категориям. */
  entries: readonly ProfileStockEntry[];
  /** Провенанс секции. */
  provenance: ProfileProvenance;
}

/** Секция «БПЛА». */
export interface UavSection {
  /** Сводка (рус.). */
  summaryRu: string;
  /** Системы. */
  systems: readonly ProfileUavSystem[];
  /** Провенанс секции. */
  provenance: ProfileProvenance;
}

/** Секция «зависимость от импорта вооружений». */
export interface ImportDependenceSection {
  /** Сводка (рус.). */
  summaryRu: string;
  /** Заметка о долях поставщиков (рус.). */
  importShareNoteRu: string;
  /** Главные поставщики. */
  mainSuppliers: readonly ProfileSupplier[];
  /** Провенанс секции. */
  provenance: ProfileProvenance;
}

/** Секция «ключевые уязвимости». */
export interface VulnerabilitiesSection {
  /** Список уязвимостей (рус.). */
  itemsRu: readonly string[];
  /** Провенанс секции. */
  provenance: ProfileProvenance;
}

/** Полный расширенный профиль страны. */
export interface CountryProfile60 {
  /** Код ISO 3166-1 alpha-3. */
  iso3: string;
  /** Название на английском. */
  name: string;
  /** Название на русском. */
  nameRu: string;
  /** Регион и блоковая принадлежность (рус.). */
  region: string;
  /** Оборонная промышленность. */
  defenseIndustry: DefenseIndustrySection;
  /** Запасы и производство. */
  stockpilesAndProduction: StockpilesSection;
  /** БПЛА. */
  uav: UavSection;
  /** Зависимость от импорта. */
  importDependence: ImportDependenceSection;
  /** Ключевые уязвимости. */
  vulnerabilities: VulnerabilitiesSection;
  /** Итоговая оговорка профиля (рус.). */
  overallNoteRu: string;
}

export const COUNTRY_PROFILES_60: readonly CountryProfile60[] = [
  {
    iso3: "NLD",
    name: "Netherlands",
    nameRu: "Нидерланды",
    region: "Европа · НАТО",
    defenseIndustry: {
      summaryRu: "Компактный, но высокотехнологичный ВПК: морское кораблестроение, радары, бронетехника, боеприпасы. Нидерланды — нетто-экспортёр нишевых систем при почти полной зависимости по боевой авиации и ПРО.",
      selfSufficiencyRu: "Самообеспечение высокое по флоту и радарам, низкое по авиации, ракетам и тяжёлой бронетехнике.",
      keyCompanies: [
        {
          name: "Damen Naval",
          specializationRu: "фрегаты, патрульные корабли, десантные корабли",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Thales Nederland",
          specializationRu: "морские радары и системы управления огнём (SMART, APAR)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Rheinmetall Nederland / Ede",
          specializationRu: "бронетехника и обслуживание",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "KMW / DAF Special Vehicles",
          specializationRu: "военные грузовики и логистика",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы боеприпасов после 2022 года наращиваются ускоренно: долгосрочные контракты на 155-мм и танковые боеприпасы, восстановление складской инфраструктуры.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "закупки 155-мм у Rheinmetall и партнёров, целевые запасы НАТО пересмотрены вверх",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Ракеты ПВО",
          noteRu: "Patriot и NASAMS: перехватчики закупаются в США, собственное производство отсутствует",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "парк CV90 и Boxer, Leopard 2 возвращаются через совместный батальон с Германией и закупки",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиационные боеприпасы",
          noteRu: "запасы управляемых боеприпасов для F-35 ограничены, дозакупки у США",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Ставка на американские MQ-9 и малые тактические БПЛА собственной и европейской сборки; ударные FPV не производятся серийно.",
      systems: [
        {
          name: "MQ-9A Reaper",
          roleRu: "ISR и ударные задачи",
          originRu: "США, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "PD-100 / RQ-20 (типы)",
          roleRu: "тактическая разведка батальонного звена",
          originRu: "Норвегия/США, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Integrator / X-300",
          roleRu: "тактическая разведка",
          originRu: "Нидерланды/США, сборка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Один из крупнейших импортёров вооружений Европы относительно размера армии: авиация, ПРО и вертолёты — почти полностью США.",
      importShareNoteRu: "По SIPRI (TIV, 2020–2024) США дают подавляющую долю импорта; европейские поставщики — в основном флот и бронетехника.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "F-35, Apache, Chinook, Patriot, HIMARS (заявлено)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Германия",
          noteRu: "бронетехника, совместные программы, боеприпасы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Франция",
          noteRu: "корабли и электроника (Thales — транснационально)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Зависимость от США по истребителям, ПРО и высокоточным боеприпасам — уязвимость к экспортным решениям Вашингтона",
        "Малая глубина запасов боеприпасов при коротком сроке наращивания собственной промышленности",
        "Нехватка личного состава и конкуренция за кадры с гражданским сектором",
        "Открытая морская торговля: экономика критически зависит от портов и морских путей",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Нидерланды» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "BEL",
    name: "Belgium",
    nameRu: "Бельгия",
    region: "Европа · НАТО",
    defenseIndustry: {
      summaryRu: "ВПК нишевый: стрелковое оружие мирового уровня (FN Herstal), башни и лёгкая бронетехника, боеприпасы. Тяжёлой промышленности вооружений нет.",
      selfSufficiencyRu: "Самообеспечение по стрелковому оружию и лёгкой бронетехнике; авиация, ПВО и тяжёлая техника — импорт.",
      keyCompanies: [
        {
          name: "FN Herstal",
          specializationRu: "стрелковое оружие, пулемёты, боеприпасы малого калибра",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "John Cockerill Defense",
          specializationRu: "башни и лёгкие боевые машины",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Mecar",
          specializationRu: "боеприпасы среднего калибра",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Sabca",
          specializationRu: "авиационные компоненты и обслуживание F-16",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы скромные, армия мирного времени; после 2022 года объявлены закупки боеприпасов и восстановление складов.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "ограниченные запасы, закупки через европейские рамки",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Ракеты ПВО",
          noteRu: "собственной наземной ПВО средней дальности долго не было; закупаются NASAMS (через партнёров)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "переход на Griffon/Jaguar по французской программе CaMo",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "F-35 на замену F-16, боеприпасы — закупки в США",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые тактические БПЛА и закупка MQ-9B SkyGuardian совместно с Великобританией (заявлено).",
      systems: [
        {
          name: "RQ-11 / Puma (типы)",
          roleRu: "тактическая разведка",
          originRu: "США, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "MQ-9B SkyGuardian",
          roleRu: "морское патрулирование и ISR",
          originRu: "США, запланированная закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "RQ-20 / малые типы",
          roleRu: "разведка рот/батальонов",
          originRu: "США/ЕС, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Импорт доминирует: Франция (бронетехника CaMo), США (авиация), Германия и др.",
      importShareNoteRu: "По SIPRI крупнейшие поставщики 2020–2024 — Франция и США.",
      mainSuppliers: [
        {
          supplier: "Франция",
          noteRu: "программа CaMo: Griffon, Jaguar, Caesar (заявлено)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "США",
          noteRu: "F-35A, боеприпасы, вертолёты",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Испания/ЕС",
          noteRu: "компоненты и совместные программы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Почти полное отсутствие собственной ПВО средней/большой дальности",
        "Малые запасы и зависимость от французской логистики по бронетехнике CaMo",
        "Двуязычная политика осложняет оборонное планирование и закупки",
        "Стратегическая зависимость от порта Антверпен и транзита союзников",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Бельгия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "NOR",
    name: "Norway",
    nameRu: "Норвегия",
    region: "Европа · НАТО · Арктика",
    defenseIndustry: {
      summaryRu: "Сильный нишевый ВПК: противокорабельные ракеты NSM/JSM, ПВО NASAMS, боеприпасы Nammo, военно-морские системы Kongsberg. Один из самых самодостаточных малых ВПК Европы.",
      selfSufficiencyRu: "Высокое самообеспечение по ракетам береговой обороны, ПВО малой/средней дальности и боеприпасам; авиация и флот — кооперация и импорт.",
      keyCompanies: [
        {
          name: "Kongsberg Defence & Aerospace",
          specializationRu: "NSM/JSM, NASAMS, боевые модули",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Nammo Raufoss",
          specializationRu: "боеприпасы, ракетные двигатели",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Kongsberg Maritime / Horten",
          specializationRu: "морские системы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "AIM Norway (Kjeller)",
          specializationRu: "депо обслуживания F-35 Северной Европы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы боеприпасов наращиваются: Nammo расширяет мощности при господдержке; запасы ракет NSM — государственная тайна, оценки умеренные.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "расширение производства Nammo, закупки для K9 и артиллерии",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Ракеты",
          noteRu: "NSM собственного производства — ключевой запас береговой обороны",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "NASAMS собственный (Kongsberg) при американских ракетах AIM-120/Sidewinder",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "F-35 и P-8: боеприпасы и поддержка — США",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "P-8 Poseidon и спутники закрывают морскую разведку; тактические БПЛА — малые системы, MQ-9 не закупались (обсуждалось).",
      systems: [
        {
          name: "PD-100 Black Hornet",
          roleRu: "микроразведка отделений",
          originRu: "Норвегия (Teledyne FLIR), собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "RQ-20 Puma",
          roleRu: "тактическая разведка",
          originRu: "США, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Skylark / малые типы",
          roleRu: "разведка батальонов",
          originRu: "Израиль/ЕС, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Импорт сфокусирован: США (F-35, P-8), Южная Корея (САУ K9), Германия (подлодки Type 212CD совместно).",
      importShareNoteRu: "По SIPRI США — крупнейший поставщик; растёт доля Республики Корея.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "F-35, P-8, ракеты, системы ПВО",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Республика Корея",
          noteRu: "САУ K9, боеприпасы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Германия",
          noteRu: "подлодки 212CD (совместная программа)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Длинная береговая линия и Арктика при малой численности ВС — ставка на резервы и союзников",
        "Зависимость от американских ракет для собственных систем ПВО и береговой обороны",
        "Нефть и газ: морская инфраструктура уязвима для диверсий (уроки Nord Stream)",
        "Один главный ВПК-кластер: сбой Kongsberg/Nammo бьёт по нескольким программам сразу",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Норвегия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "DNK",
    name: "Denmark",
    nameRu: "Дания",
    region: "Европа · НАТО · Арктика",
    defenseIndustry: {
      summaryRu: "Малый ВПК: радары Terma и Weibel, беспилотные технологии, кораблестроение по иностранным проектам. После 2022 года — резкий рост расходов и попытки вернуть производство боеприпасов.",
      selfSufficiencyRu: "Низкое по большинству систем; ниши — радары, системы самообороны кораблей, БПЛА-компоненты.",
      keyCompanies: [
        {
          name: "Terma",
          specializationRu: "радары, системы самообороны авиации и кораблей",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Weibel Scientific",
          specializationRu: "доплеровские радары ПРО и космического слежения",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Fayard / Odense Maritime",
          specializationRu: "ремонт и строительство кораблей",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "UXV Technologies / MyDefence",
          specializationRu: "БПЛА и противодронные системы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы мирного времени малы; возобновляется производство боеприпасов на заводе в Элленге (северная Ютландия) при участии Nammo.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "собственное производство возобновляется; пока — закупки в ЕС",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Ракеты ПВО",
          noteRu: "закупка наземной ПВО (несколько систем) после 2024 года — срочная программа",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "фрегаты Iver Huitfeldt: модернизация ПВО после инцидентов в Красном море",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "F-35 на замену F-16, боеприпасы — США",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Дания инвестирует в морские и арктические БПЛА; Гренландия и Фареры — приоритет наблюдения.",
      systems: [
        {
          name: "MQ-9B SeaGuardian",
          roleRu: "морское патрулирование (запланировано)",
          originRu: "США, заявленная закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Puma / Raven (типы)",
          roleRu: "тактическая разведка",
          originRu: "США, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Собственные малые БПЛА",
          roleRu: "разведка и целеуказание",
          originRu: "Дания, разработка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Импорт почти полный: США (F-35), Израиль и ЕС (ПВО), Германия/Франция по отдельным системам.",
      importShareNoteRu: "По SIPRI США — доминирующий поставщик 2020–2024.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "F-35, P-8 (обсуждалось), ракеты",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Израиль",
          noteRu: "артиллерия ATMOS и РСЗО PULS",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Германия/Франция",
          noteRu: "системы ПВО (конкурсные закупки)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Гренландия и Арктика: огромные пространства при минимальном присутствии — зависимость от США",
        "Долгое недофинансирование: запасы и ПВО восстанавливаются с низкого старта",
        "Морские проливы (Датские проливы) — критическая точка для союзной логистики и российской активности",
        "Зависимость от иностранных радаров раннего предупреждения в Гренландии (США)",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Дания» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "CZE",
    name: "Czechia",
    nameRu: "Чехия",
    region: "Европа · НАТО",
    defenseIndustry: {
      summaryRu: "Один из самых живых ВПК Восточной Европы: CSG (боеприпасы, бронетехника), Aero Vodochody, Colt CZ, Sellier & Bellot. Крупный донор и производитель для Украины с 2022 года.",
      selfSufficiencyRu: "Среднее-высокое по боеприпасам, стрелковому оружию и лёгкой авиации; истребители и ПВО большой дальности — импорт.",
      keyCompanies: [
        {
          name: "Czechoslovak Group (CSG)",
          specializationRu: "боеприпасы крупного калибра, бронетехника, радары",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Aero Vodochody",
          specializationRu: "самолёты L-39NG, обслуживание",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Colt CZ Group",
          specializationRu: "стрелковое оружие",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Sellier & Bellot",
          specializationRu: "боеприпасы всех калибров",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Чехия — хаб «снарядной инициативы» для Украины: собственные запасы частично переданы, восполняются закупками и ростом производства CSG.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "производство и глобальные закупки 155-мм; инициатива поставок Украине с 2024 года",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Ракеты ПВО",
          noteRu: "SPYDER (Израиль) на замену советским системам, перехватчики — импорт",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "CV90 (Швеция) на замену BMP, Leopard 2A8 (Германия) в планах",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "F-35 (США) на замену Gripen, боеприпасы — импорт",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые и средние БПЛА развиваются частными фирмами (Primoco, CSG); армия закупает тактические системы.",
      systems: [
        {
          name: "Primoco One 150",
          roleRu: "разведка среднего радиуса",
          originRu: "Чехия, собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "RQ-20 / ScanEagle (типы)",
          roleRu: "тактическая разведка",
          originRu: "США, закупка/помощь",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "FPV (коммерческие)",
          roleRu: "ударные задачи малого радиуса",
          originRu: "коммерческие платформы, адаптация",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Диверсифицированный импорт: Швеция (CV90), Израиль (ПВО, радары), США (F-35, вертолёты), Германия (танки).",
      importShareNoteRu: "По SIPRI доля США растёт из-за программы F-35.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "F-35, вертолёты Venom/Viper, боеприпасы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Израиль",
          noteRu: "ПВО SPYDER, радары ELM-2084",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Швеция",
          noteRu: "БМП CV90",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Зависимость от импортных перехватчиков ПВО и авиационных ракет",
        "Экспортная ориентация ВПК: в кризис мощности CSG будут востребованы многими странами сразу",
        "Нехватка порохов и взрывчатки европейского производства — общее узкое место, включая Чехию",
        "Малая стратегическая глубина территории при размещении ключевых заводов в немногих кластерах",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Чехия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "SVK",
    name: "Slovakia",
    nameRu: "Словакия",
    region: "Европа · НАТО",
    defenseIndustry: {
      summaryRu: "ВПК советского наследия с сильными позициями в артиллерии: САУ Zuzana 2, боеприпасы MSM Group, модернизация бронетехники. Экспорт на Украину с 2022 года.",
      selfSufficiencyRu: "Среднее по артиллерии и боеприпасам; авиация и ПВО — импорт и союзническое прикрытие.",
      keyCompanies: [
        {
          name: "KONŠTRUKTA-Defence",
          specializationRu: "САУ Zuzana 2, артиллерийские системы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "ZTS Špeciál",
          specializationRu: "артиллерия, модернизация бронетехники",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "MSM Group",
          specializationRu: "боеприпасы крупного калибра",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "DMD Group",
          specializationRu: "оборонный холдинг, ремонт",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Значительная часть советских запасов передана Украине; восполнение — производством Zuzana и закупками CV90 и F-16.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "производство MSM растёт, часть объёмов — экспортные контракты",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Артиллерия",
          noteRu: "Zuzana 2 собственного производства — ядро парка",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "после передачи С-300 Украине прикрытие обеспечивают союзники; закупаются израильские системы (заявлено)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "F-16 Block 70 (США) на замену переданным МиГ-29",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Тактические БПЛА малого класса; собственной серийной ударной программы нет.",
      systems: [
        {
          name: "Малые разведывательные БПЛА",
          roleRu: "разведка батальонного звена",
          originRu: "ЕС/Израиль, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "FPV (коммерческие)",
          roleRu: "ударные задачи",
          originRu: "коммерческая адаптация, оценка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США (F-16, вертолёты), Швеция (CV90), Израиль (ПВО/радары) — главные поставщики перевооружения.",
      importShareNoteRu: "По SIPRI США — крупнейший поставщик последних лет.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "F-16 Block 70, Black Hawk",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Швеция",
          noteRu: "БМП CV9035",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Израиль",
          noteRu: "ПВО Barak MX (заявлено), радары",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Политическая волатильность оборонной политики: смена правительств меняет курс помощи и закупок",
        "Зависимость ПВО от союзников после передачи С-300",
        "ВПК ориентирован на экспорт: собственные запасы восполняются медленно",
        "Граница с Украиной: риски инцидентов и контрабанды оружия",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Словакия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "HUN",
    name: "Hungary",
    nameRu: "Венгрия",
    region: "Европа · НАТО",
    defenseIndustry: {
      summaryRu: "ВПК перестраивается вокруг немецкого капитала: Rheinmetall Lynx строится в Венгрии, боеприпасы и вертолётные компоненты — совместные предприятия. Курс на «национальный ВПК с немецкой технологией».",
      selfSufficiencyRu: "Среднее и растущее по бронетехнике и боеприпасам; авиация — аренда/закупка Gripen, ПВО — кооперация.",
      keyCompanies: [
        {
          name: "Rheinmetall Hungary (Zalaegerszeg)",
          specializationRu: "БМП Lynx, боеприпасы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Hirtenberger Defence Systems",
          specializationRu: "миномёты и боеприпасы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Airbus Helicopters Hungary (Gyula)",
          specializationRu: "компоненты вертолётов",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Rába",
          specializationRu: "военные грузовики (исторически), компоненты",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы невелики; программа Zrínyi-2026 наращивает парк и боеприпасы, объёмы не публикуются.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "новый завод Rheinmetall в Варпалоте — производство для Венгрии и экспорта",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Lynx собственного (совместного) производства, Leopard 2A7 (Германия)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "NASAMS (Норвегия/США), Mistral; перехватчики — импорт",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "Gripen (Швеция, лизинг/выкуп), боеприпасы — импорт",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Тактические БПЛА и барражирующие боеприпасы — закупки и совместные проекты с немецкими и израильскими фирмами (по прессе).",
      systems: [
        {
          name: "Hero (UVision, типы)",
          roleRu: "барражирующие боеприпасы",
          originRu: "Израиль/Германия, заявленные закупки",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "ЕС, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Германия — системообразующий поставщик; далее Швеция и Норвегия/США.",
      importShareNoteRu: "По SIPRI Германия даёт основную долю импорта 2020–2024.",
      mainSuppliers: [
        {
          supplier: "Германия",
          noteRu: "Leopard 2, PzH 2000, Lynx (СП), боеприпасы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Швеция",
          noteRu: "Gripen",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Норвегия/США",
          noteRu: "NASAMS",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Глубокая зависимость ВПК от одного иностранного партнёра (Rheinmetall) и немецких экспортных решений",
        "Энергозависимость от России осложняет общую стратегическую позицию в НАТО",
        "Малые запасы и медленные темпы перевооружения относительно заявленных амбиций",
        "Политические трения с союзниками могут ограничивать доступ к совместным программам",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Венгрия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "ROU",
    name: "Romania",
    nameRu: "Румыния",
    region: "Европа · НАТО · Чёрное море",
    defenseIndustry: {
      summaryRu: "ВПК среднего размера: ROMARM (боеприпасы, бронетехника), авиаремонт Aerostar, верфи Damen Galați и Constanța. Модернизация идёт преимущественно импортом.",
      selfSufficiencyRu: "Среднее по боеприпасам и лёгкой бронетехнике; авиация, ПВО и флот — импорт и кооперация.",
      keyCompanies: [
        {
          name: "ROMARM",
          specializationRu: "боеприпасы, бронетехника Piranha (сборка), стрелковое оружие",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Aerostar Bacău",
          specializationRu: "ремонт авиации, компоненты F-16",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Damen Shipyards Galați",
          specializationRu: "военное кораблестроение",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Uzina Mecanică Cugir",
          specializationRu: "стрелковое оружие и боеприпасы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Советские запасы частично переданы; закупки боеприпасов растут, объёмы закрыты.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "производство ROMARM и закупки; HIMARS — ракеты из США",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "Patriot (США) — первая система региона; передан один комплекс Украине (по решениям 2024 года)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Piranha V (сборка), программа новой БМП — конкурс",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "F-16 (б/у Португалии/Норвегии + новые), переход к F-35 заявлен",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Румыния закупает Bayraktar TB2 и Watchkeeper (через партнёров), развиваются собственные малые БПЛА.",
      systems: [
        {
          name: "Bayraktar TB2",
          roleRu: "ISR и ударные задачи",
          originRu: "Турция, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Watchkeeper WK450",
          roleRu: "разведка",
          originRu: "Великобритания/Израиль, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "тактическая разведка",
          originRu: "собственные/коммерческие",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США — главный поставщик (Patriot, HIMARS, F-16/F-35), далее ЕС и Республика Корея (САУ K9 — заявлено).",
      importShareNoteRu: "По SIPRI США доминируют в импорте 2020–2024.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "Patriot, HIMARS, F-16, F-35 (план)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Республика Корея",
          noteRu: "САУ K9, БМП Redback (контракты заявлены)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Германия/ЕС",
          noteRu: "подлодки (обсуждалось), корветы, боеприпасы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Чёрное море: минная угроза и близость войны напрямую бьют по портам и энергетике шельфа",
        "Зависимость от США по ПВО и РСЗО; очереди поставок длинные",
        "Приднестровье и Молдова: нестабильность на границе при ограниченных силах прикрытия",
        "ВПК не покрывает потребности перевооружения: графики программ систематически сдвигаются",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Румыния» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "BGR",
    name: "Bulgaria",
    nameRu: "Болгария",
    region: "Европа · НАТО · Чёрное море",
    defenseIndustry: {
      summaryRu: "ВПК боеприпасов советского калибра — один из крупнейших в Европе (Arsenal Kazanlak, VMZ Sopot). С 2022 года — критический поставщик для Украины; строится завод пороха с Rheinmetall.",
      selfSufficiencyRu: "Высокое по боеприпасам советских калибров и стрелковому оружию; современная техника — импорт.",
      keyCompanies: [
        {
          name: "Arsenal Kazanlak",
          specializationRu: "стрелковое оружие, боеприпасы, артиллерийские выстрелы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "VMZ Sopot",
          specializationRu: "ракеты и артиллерийские боеприпасы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "TEREM",
          specializationRu: "ремонт бронетехники и кораблей",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Dunarit",
          specializationRu: "боеприпасы и взрывчатые вещества",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Производственные мощности важнее запасов: Болгария продавала и передавала боеприпасы, собственные запасы восполняются медленно.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "крупное производство 152/155-мм и советских калибров, значительная доля — экспорт",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "советские системы (С-300 передан частично по решениям союзников), закупка IRIS-T (заявлено)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Stryker (США) на замену советскому парку",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "F-16 Block 70 (США) на замену МиГ-29, сроки сдвинуты",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые тактические БПЛА; собственной заметной программы ударных БПЛА нет.",
      systems: [
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "ЕС/коммерческие, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Phoenix / Dronamics (гражданские платформы)",
          roleRu: "логистические эксперименты двойного назначения",
          originRu: "Болгария, разработка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США (F-16, Stryker), Германия (партнёрство по пороху), Израиль по отдельным системам.",
      importShareNoteRu: "По SIPRI США — крупнейший поставщик последних лет.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "F-16 Block 70, Stryker, боеприпасы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Германия",
          noteRu: "пороховой завод (Rheinmetall, СП), ПВО IRIS-T (заявлено)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Франция/ЕС",
          noteRu: "корветы и морские программы (обсуждалось)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Зависимость порохового производства от импорта сырья; новый завод ещё не построен",
        "Экспортная загрузка ВПК ограничивает восполнение собственных запасов",
        "Чёрное море: дрейфующие мины и риски для судоходства и энергетики",
        "Устаревший парк советской техники при медленном перевооружении",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Болгария» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "HRV",
    name: "Croatia",
    nameRu: "Хорватия",
    region: "Европа · НАТО · Адриатика",
    defenseIndustry: {
      summaryRu: "Небольшой ВПК с яркими нишами: стрелковое оружие HS Produkt, бронетехника Đuro Đaković, кораблестроение. Перевооружение — Rafale и Leopard (заявлено).",
      selfSufficiencyRu: "Среднее по стрелковому оружию и лёгкой бронетехнике; авиация и танки — импорт.",
      keyCompanies: [
        {
          name: "HS Produkt",
          specializationRu: "пистолеты и винтовки VHS-2",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Đuro Đaković",
          specializationRu: "БМП и модернизация танков",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Šestan-Busch",
          specializationRu: "каски и защита",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Brodosplit / Viktor Lenac",
          specializationRu: "кораблестроение и ремонт",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы малы; советская техника передавалась Украине, восполнение — западными закупками.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "закупки в ЕС, собственное производство ограничено",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Patria AMV (сборка), Bradley (США, б/у), Leopard 2 (заявлено)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "Mistral и системы малой дальности; средняя дальность — пробел",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "Rafale (Франция, б/у) на замену МиГ-21",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Хорватия развивает собственные FPV и ударные БПЛА: заявлены национальные программы производства дронов с 2024 года.",
      systems: [
        {
          name: "FPV (национальная программа)",
          roleRu: "ударные задачи малого радиуса",
          originRu: "Хорватия, собственное производство (заявлено)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Bayraktar TB2",
          roleRu: "ISR и удар",
          originRu: "Турция, закупка (заявлено)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "ЕС/коммерческие",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Франция (Rafale), США (Bradley, Black Hawk), Германия (Leopard — заявлено), Турция (БПЛА).",
      importShareNoteRu: "По SIPRI Франция и США — крупнейшие поставщики.",
      mainSuppliers: [
        {
          supplier: "Франция",
          noteRu: "Rafale, Mistral",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "США",
          noteRu: "Bradley, UH-60, HIMARS (заявлено)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Германия",
          noteRu: "Leopard 2A8 (заявлено)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Отсутствие ПВО средней дальности при протяжённом побережье и туристической экономике",
        "Малые запасы и зависимость от очередей европейских поставок",
        "Демография: сокращение призывного ресурса и конкуренция за кадры",
        "Энергетика Адриатики (терминал JANAF) зависит от региональной стабильности Боснии и Сербии",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Хорватия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "SRB",
    name: "Serbia",
    nameRu: "Сербия",
    region: "Европа · Балканы · вне НАТО",
    defenseIndustry: {
      summaryRu: "Крупнейший ВПК Балкан: Yugoimport и заводы боеприпасов (Sloboda, Krušik, Prvi Partizan), бронетехника Lazar/Miloš, артиллерия Nora. Экспортёр в десятки стран, включая косвенные поставки в зоны конфликтов (по прессе).",
      selfSufficiencyRu: "Высокое по боеприпасам, артиллерии и лёгкой бронетехнике; авиация и ПВО — Россия/Китай/Франция.",
      keyCompanies: [
        {
          name: "Yugoimport SDPR",
          specializationRu: "государственный торговец и интегратор вооружений",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Zastava Arms",
          specializationRu: "стрелковое оружие",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Sloboda Čačak",
          specializationRu: "артиллерийские боеприпасы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Krušik Valjevo",
          specializationRu: "боеприпасы и ракеты",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Prvi Partizan",
          specializationRu: "патроны",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы и производство боеприпасов — системное преимущество Сербии в регионе; объёмы закрыты, экспортные потоки велики.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "несколько заводов полного цикла; экспорт растёт с 2022 года",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Артиллерия",
          noteRu: "САУ Nora B-52 собственного производства — экспортный хит",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "FK-3 (Китай), Mistral (Франция), советское наследие модернизируется",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "МиГ-29 (дар Беларуси/России исторически), Rafale (Франция, контракт 2024 года)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Собственные БПЛА Pegaz и разведывательные системы; закупались китайские CH-92A.",
      systems: [
        {
          name: "CH-92A",
          roleRu: "ISR и удар",
          originRu: "Китай, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Pegaz 011",
          roleRu: "разведка",
          originRu: "Сербия, собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Vrabac / Gavran",
          roleRu: "малые БПЛА и барражирующие боеприпасы",
          originRu: "Сербия, собственное (заявлено)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Многовекторный импорт: Россия и Китай (ПВО, БПЛА), Франция (Rafale, Mistral, радары), Беларусь.",
      importShareNoteRu: "По SIPRI Китай и Россия — ключевые поставщики тяжёлых систем; Франция выходит на первое место по стоимости (Rafale).",
      mainSuppliers: [
        {
          supplier: "Франция",
          noteRu: "Rafale, Mistral, радары Thales",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Китай",
          noteRu: "ПВО FK-3, БПЛА CH-92A",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Россия",
          noteRu: "МиГ-29, Панцирь-С1 (исторически)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Многовекторность = проблемы совместимости и зависимости сразу от трёх поставщиков с конфликтующими санкционными режимами",
        "Косово и Босния: очаги эскалации при ограниченной стратегической глубине",
        "Экспортная зависимость ВПК делает его чувствительным к давлению ЕС и США по конечным пользователям",
        "Энергетическая зависимость от России при декларируемом европейском курсе",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Сербия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "LTU",
    name: "Lithuania",
    nameRu: "Литва",
    region: "Европа · НАТО · Балтика",
    defenseIndustry: {
      summaryRu: "ВПК малый, но быстро растущий: оптика и приборы ночного видения, БПЛА (NT Service/UAV Factory), боеприпасы — строится завод Rheinmetall. Ставка на размещение производств союзников.",
      selfSufficiencyRu: "Низкое по тяжёлым системам; ниши — оптика, БПЛА, связь.",
      keyCompanies: [
        {
          name: "NT Service (UAV Factory)",
          specializationRu: "БПЛА EOS, вертикального взлёта",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Brolis Semiconductors",
          specializationRu: "лазеры и оптоэлектроника",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Elsis / Elsis TS",
          specializationRu: "связь и C2",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Rheinmetall Lithuania (строится)",
          specializationRu: "артиллерийские боеприпасы 155-мм (СП)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы малы; закупки боеприпасов и ПВО ускорены, немецкая бригада в Литве меняет требования к инфраструктуре.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "будущий завод Rheinmetall; пока — импорт",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "NASAMS (Норвегия/США), закупаются дополнительные системы",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Vilkas/Boxer, Leopard 2 (заявлено), САУ Caesar (Франция, заявлено)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "истребителей нет: воздушная полиция НАТО",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Собственные БПЛА EOS и закупки Switchblade и FPV; Литва — заметный поставщик дронов Украине.",
      systems: [
        {
          name: "EOS C VTOL",
          roleRu: "разведка",
          originRu: "Литва, собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Switchblade 300",
          roleRu: "барражирующий боеприпас",
          originRu: "США, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "FPV (национальные фирмы)",
          roleRu: "ударные задачи",
          originRu: "Литва, собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Германия (бронетехника, боеприпасы), США (HIMARS, противотанковые средства), Норвегия (NASAMS), Франция (САУ).",
      importShareNoteRu: "По SIPRI Германия и США — главные поставщики.",
      mainSuppliers: [
        {
          supplier: "Германия",
          noteRu: "Boxer/Vilkas, Leopard (заявлено), завод боеприпасов",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "США",
          noteRu: "HIMARS, Javelin, вертолёты (заявлено)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Франция",
          noteRu: "САУ Caesar Mk II (заявлено)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Сувалкский коридор: узкая полоса между Калининградской областью и Беларусью — главная оперативная уязвимость НАТО",
        "Полная зависимость по истребительной авиации и дальнобойным средствам",
        "Малые запасы при передовом положении на границе с Россией и Беларусью",
        "Энергосистема и порты (Клайпеда, терминал СПГ) — критические цели диверсий",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Литва» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "LVA",
    name: "Latvia",
    nameRu: "Латвия",
    region: "Европа · НАТО · Балтика",
    defenseIndustry: {
      summaryRu: "ВПК малый: БПЛА (Edge Autonomy — латвийское производство Penguin), бронемашины Patria 6x6 совместной программы CAVS, боеприпасы — планы с Rheinmetall.",
      selfSufficiencyRu: "Низкое; ниши — БПЛА, бронемашины (сборка), оптика.",
      keyCompanies: [
        {
          name: "Edge Autonomy (Riga)",
          specializationRu: "БПЛА Penguin C",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Patria Latvia",
          specializationRu: "сборка БТР 6x6 программы CAVS",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Rheinmetall Latvia (планы)",
          specializationRu: "боеприпасы (меморандумы)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Light Guide Optics / LGO",
          specializationRu: "оптика и приборы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы малы; закупки ПВО (IRIS-T заявлено), РСЗО HIMARS (совместно с соседями) и боеприпасов растут.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "импорт; собственное производство — планы",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "IRIS-T SLM (Германия, заявлено), RBS-70",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "РСЗО",
          noteRu: "HIMARS — совместная закупка стран Балтии (США)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Patria 6x6 совместной программы с Финляндией",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Penguin C экспортируется и применялся на Украине; армия закупает FPV и разведывательные системы.",
      systems: [
        {
          name: "Penguin C",
          roleRu: "разведка среднего радиуса",
          originRu: "Латвия, собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "FPV (национальная коалиция дронов)",
          roleRu: "ударные задачи",
          originRu: "Латвия — соорганизатор «коалиции дронов» для Украины",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "ЕС/США, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Германия (ПВО), США (HIMARS, вертолёты), Финляндия (бронемашины), Швеция (ПЗРК/противотанковые).",
      importShareNoteRu: "По SIPRI Германия и США лидируют.",
      mainSuppliers: [
        {
          supplier: "Германия",
          noteRu: "IRIS-T SLM (заявлено)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "США",
          noteRu: "HIMARS, UH-60 (заявлено)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Финляндия",
          noteRu: "Patria 6x6 (совместная программа)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Граница с Россией и Беларусью при малой глубине территории и отсутствии истребительной авиации",
        "Запасы и ПВО формируются с низкого старта; сроки поставок — годы",
        "Зависимость от присутствия боевой группы НАТО (Канада) как основы обороны",
        "Инфраструктура Rail Baltica и порты — цели гибридных действий",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Латвия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "EST",
    name: "Estonia",
    nameRu: "Эстония",
    region: "Европа · НАТО · Балтика",
    defenseIndustry: {
      summaryRu: "ВПК технологичный и малый: наземные роботы Milrem (THeMIS), БПЛА Threod, боеприпасы — государственное производство в планах. Эстония — идеолог «коалиции дронов» и цифровизации обороны.",
      selfSufficiencyRu: "Низкое по тяжёлым системам; уникальная ниша — наземные беспилотные платформы.",
      keyCompanies: [
        {
          name: "Milrem Robotics",
          specializationRu: "наземные роботы THeMIS (экспорт во многие страны)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Threod Systems",
          specializationRu: "БПЛА EOS и Stream",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Frankenburg Technologies",
          specializationRu: "дешёвые перехватчики БПЛА (стартап, заявлено)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "DefSecIntel / KrattWorks",
          specializationRu: "противодронные и разведывательные системы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы сознательно перераспределены в помощь Украине; восполнение — закупками HIMARS, САУ K9 и боеприпасов.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "закупки и европейские рамки; собственного крупного производства нет",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "РСЗО",
          noteRu: "HIMARS (США) — первые дальнобойные средства страны",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Артиллерия",
          noteRu: "САУ K9 (Республика Корея)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "Mistral, закупаются IRIS-T (заявлено) и ПЗРК Piorun (Польша)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Сильная дроновая экосистема для размера страны; THeMIS применялся на Украине, FPV закупаются массово.",
      systems: [
        {
          name: "THeMIS (Milrem)",
          roleRu: "наземная логистика и эвакуация (робот)",
          originRu: "Эстония, собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "EOS C VTOL (Threod)",
          roleRu: "разведка",
          originRu: "Эстония, собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "FPV",
          roleRu: "ударные задачи",
          originRu: "закупки и собственное производство",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США (HIMARS), Республика Корея (K9), Германия (ПВО), Польша (ПЗРК), Израиль (береговые ракеты Blue Spear — заявлено).",
      importShareNoteRu: "По SIPRI США — крупнейший поставщик.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "HIMARS, боеприпасы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Республика Корея",
          noteRu: "САУ K9 Thunder",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Израиль",
          noteRu: "противокорабельные ракеты Blue Spear (заявлено)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Отсутствие истребителей, танков (до недавних решений) и глубокой ПВО — оборона полностью союзническая по тяжёлым компонентам",
        "Малая территория: вся инфраструктура в радиусе действий российских средств поражения из Ленинградской области и Калининграда",
        "Запасы боеприпасов ограничены даже после наращивания закупок",
        "Зависимость от единственного сухопутного коридора через Латвию",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Эстония» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "PRT",
    name: "Portugal",
    nameRu: "Португалия",
    region: "Европа · НАТО · Атлантика",
    defenseIndustry: {
      summaryRu: "ВПК средний: авиастроение и обслуживание OGMA (партнёр Embraer, сборка KC-390), верфи, БПЛА Tekever — заметный экспортёр разведывательных дронов.",
      selfSufficiencyRu: "Среднее по морской патрульной тематике и БПЛА; боевая авиация и ПВО — импорт.",
      keyCompanies: [
        {
          name: "OGMA",
          specializationRu: "обслуживание авиации, участие в KC-390",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Tekever",
          specializationRu: "БПЛА морского патрулирования AR3/AR5 (экспорт, применение на Украине)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Arsenal do Alfeite",
          specializationRu: "ремонт кораблей и подлодок",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "West Sea (Viana do Castelo)",
          specializationRu: "кораблестроение",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы малы, армия экспедиционного профиля; модернизация — KC-390, вертолёты, патрульные корабли.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "закупки в ЕС, собственное производство минимально",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "F-16 MLU — старение парка; замена обсуждается (F-35 в дебатах)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "подлодки Type 209PN (Германия), патрульные корабли собственной постройки",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "системы малой дальности; средняя — пробел",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Tekever — европейский лидер ниши морских разведывательных БПЛА; ВМС применяют AR-дроны для патрулирования.",
      systems: [
        {
          name: "Tekever AR3/AR5",
          roleRu: "морская разведка",
          originRu: "Португалия, собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "UAVision / типы",
          roleRu: "тактическая разведка",
          originRu: "Португалия, собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "коммерческие/ЕС",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США (авиация и вертолёты), Германия (подлодки), Бразилия (KC-390 — кооперация), Нидерланды (б/у техника исторически).",
      importShareNoteRu: "По SIPRI США и Германия — главные поставщики.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "F-16 (исторически), вертолёты UH-60 (заявлено)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Германия",
          noteRu: "подлодки, бронетехника",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Бразилия",
          noteRu: "KC-390 (кооперация Embraer/OGMA)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Стареющий парк F-16 без утверждённой программы замены",
        "Азоры и Мадейра: удалённые территории при ограниченных силах прикрытия",
        "Малые запасы и зависимость от европейских цепочек боеприпасов",
        "Бюджетные ограничения исторически сдвигают все крупные программы",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Португалия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "AUT",
    name: "Austria",
    nameRu: "Австрия",
    region: "Европа · нейтралитет",
    defenseIndustry: {
      summaryRu: "ВПК качественный при нейтралитете: стрелковое оружие Steyr и Glock, БПЛА Schiebel Camcopter, авиация Diamond. Экспорт ограничен нейтральным статусом и внутренними дебатами.",
      selfSufficiencyRu: "Среднее по стрелковому оружию, лёгкой авиации и БПЛА; истребители и ПВО — импорт при политических ограничениях нейтралитета.",
      keyCompanies: [
        {
          name: "Steyr Arms",
          specializationRu: "винтовки AUG и снайперские системы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Glock",
          specializationRu: "пистолеты (мировой рынок)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Schiebel",
          specializationRu: "БПЛА вертолётного типа Camcopter S-100 (экспорт во многие страны)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Diamond Aircraft",
          specializationRu: "лёгкие самолёты, платформы разведки DA42/DA62",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы нейтральной армии мирного времени; после 2022 года объявлен рост бюджета (план ÖBH 2032+).",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "закупки у европейских производителей, собственное производство ограничено (Hirtenberger — миномёты)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "заявлены закупки IRIS-T и участие в Sky Shield (политически спорно при нейтралитете)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "Eurofighter Tranche 1 — старение, замена обсуждается",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Pandur (GDELS) собственной сборки",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Schiebel — мировой нишевый лидер морских БПЛА вертолётного типа; армия использует малые системы.",
      systems: [
        {
          name: "Camcopter S-100",
          roleRu: "морская и сухопутная разведка",
          originRu: "Австрия, собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "ЕС/коммерческие, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Германия/ЕС (Eurofighter, Pandur), Италия (вертолёты AW169 — заявлено), США ограниченно.",
      importShareNoteRu: "По SIPRI Германия — основной поставщик.",
      mainSuppliers: [
        {
          supplier: "Германия",
          noteRu: "Eurofighter (консорциум), компоненты",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Италия",
          noteRu: "вертолёты AW169M (заявлено)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Швейцария/ЕС",
          noteRu: "бронетехника Pandur (GDELS)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Нейтралитет ограничивает союзническую интеграцию ПВО (Sky Shield) и гарантии снабжения в кризис",
        "Стареющие Eurofighter и малый парк при отсутствии решения о замене",
        "Зависимость от немецких цепочек по бронетехнике и боеприпасам",
        "География: сухопутная страна без выхода к морю, логистика — через соседей",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Австрия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "BLR",
    name: "Belarus",
    nameRu: "Беларусь",
    region: "Европа · Союзное государство с Россией",
    defenseIndustry: {
      summaryRu: "ВПК советского наследия, тесно связанный с Россией: МЗКТ (шасси для российских ракетных комплексов), Пеленг (прицелы), 558-й авиаремонтный завод, БелОМО. С 2022 года — под санкциями, кооперация с РФ углубляется.",
      selfSufficiencyRu: "Среднее по шасси, оптике и ремонту; боевые платформы и двигатели — Россия.",
      keyCompanies: [
        {
          name: "МЗКТ (Volat)",
          specializationRu: "тяжёлые колёсные шасси, в т.ч. для российских стратегических систем",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Пеленг",
          specializationRu: "танковые и авиационные прицелы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "558 АРЗ (Барановичи)",
          specializationRu: "ремонт и модернизация Су-25/МиГ-29, вертолётов",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "БелОМО",
          specializationRu: "оптика и приборы ночного видения",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы советских систем значительны, но частично переданы/израсходованы в региональной динамике; объёмы закрыты, данные — оценки.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "советские запасы и производство; часть потоков — в Россию по открытым сообщениям",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "РСЗО",
          noteRu: "«Полонез» (собственная, с китайскими корнями) и «Град»",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "С-400 и «Тор» получены от России; собственные модернизации ЗРК «Бук»",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "Су-30СМ (Россия), МиГ-29 и Су-25 советского парка",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Собственные БПЛА «УБАК», «Ловчий» и др. — малые серии; массовое производство FPV развивается при российской поддержке (по открытым источникам).",
      systems: [
        {
          name: "УБАК-25 / типы",
          roleRu: "разведка и удар",
          originRu: "Беларусь, собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Орлан / типы",
          roleRu: "разведка",
          originRu: "Россия, поставки (оценка)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "FPV",
          roleRu: "ударные задачи",
          originRu: "собственное/совместное, оценка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Россия — почти монопольный поставщик современных систем; Китай — отдельные компоненты и РСЗО-технологии исторически.",
      importShareNoteRu: "По SIPRI Россия даёт подавляющую долю импорта.",
      mainSuppliers: [
        {
          supplier: "Россия",
          noteRu: "Су-30СМ, С-400, Тор, Искандер (заявлено о размещении)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Китай",
          noteRu: "технологии РСЗО «Полонез» (исторически)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Тотальная зависимость от России по платформам, боеприпасам и ПВО — суверенитет оборонных решений ограничен",
        "Санкции перекрыли западные компоненты для ВПК (оптика, электроника)",
        "Размещение российского ядерного оружия (по заявлениям сторон) делает территорию приоритетной целью",
        "ВПК завязан на российский спрос: потеря рынка РФ обрушит отрасль",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Беларусь» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "PHL",
    name: "Philippines",
    nameRu: "Филиппины",
    region: "Юго-Восточная Азия",
    defenseIndustry: {
      summaryRu: "ВПК малый: ремонт кораблей, патронный завод Government Arsenal, сборка бронетехники по лицензиям. Программа модернизации Horizon финансирует почти всё импортом.",
      selfSufficiencyRu: "Низкое: даже патронное производство не покрывает потребности; ниши — ремонт и малые катера.",
      keyCompanies: [
        {
          name: "Government Arsenal",
          specializationRu: "патроны и стрелковое оружие",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Propmech / Strategic Systems",
          specializationRu: "катера и морские системы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Navotas / Herma Shipyard",
          specializationRu: "ремонт кораблей",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Elbit Philippines (сборка)",
          specializationRu: "бронетехника Sabrah (совместно)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы малы при архипелажной географии; акцент модернизации — ВВС и флот против Китая в Южно-Китайском море.",
      entries: [
        {
          categoryRu: "Ракеты",
          noteRu: "BrahMos (Индия) — первые противокорабельные батареи; SPYDER (Израиль) для ПВО",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "FA-50 (Корея), программа многоцелевого истребителя — конкурс (F-16/Gripen)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "фрегаты Hyundai (Корея), корветы и патрульные корабли — поставки идут",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "запасы ограничены, зависимость от поставок США и Кореи",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "ScanEagle (США, помощь), Hermes 900 (Израиль) для морской разведки; собственные программы малы.",
      systems: [
        {
          name: "Hermes 900",
          roleRu: "морская разведка",
          originRu: "Израиль, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "ScanEagle",
          roleRu: "разведка",
          originRu: "США, военная помощь",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "тактическая разведка",
          originRu: "коммерческие/США",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Диверсифицированный импорт: Корея (авиация, флот), Израиль (ПВО, БПЛА), Индия (BrahMos), США (союзник по договору).",
      importShareNoteRu: "По SIPRI Республика Корея и США — крупнейшие поставщики последних лет.",
      mainSuppliers: [
        {
          supplier: "Республика Корея",
          noteRu: "FA-50, фрегаты и корветы Hyundai",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Израиль",
          noteRu: "SPYDER, Hermes 900, бронетехника",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "США",
          noteRu: "союзная помощь, боеприпасы, авиация (F-16 — заявлено)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Индия",
          noteRu: "противокорабельные ракеты BrahMos",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Архипелаг из тысяч островов при малом флоте и авиации: контроль Южно-Китайского моря ограничен",
        "Зависимость от иностранных ракет и боеприпасов: собственные запасы на короткую кампанию",
        "Тайфунный пояс: инфраструктура и авиабазы уязвимы для стихии и ударов по немногим ВПП",
        "Конкурирующие приоритеты: внутренняя безопасность (юг страны) оттягивает ресурсы с морского направления",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Филиппины» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "MYS",
    name: "Malaysia",
    nameRu: "Малайзия",
    region: "Юго-Восточная Азия",
    defenseIndustry: {
      summaryRu: "ВПК средний-низкий: бронетехника DefTech (AV8 по турецкой лицензии), кораблестроение Boustead/Lumut, авиаремонт. Программы систематически недофинансируются.",
      selfSufficiencyRu: "Среднее по лёгкой бронетехнике и патрульным кораблям; авиация, ПВО и подлодки — импорт.",
      keyCompanies: [
        {
          name: "DefTech (DRB-HICOM)",
          specializationRu: "бронемашины AV8 Gempita, AV4",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Boustead Naval Shipyard",
          specializationRu: "фрегаты LCS (программа с задержками)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "SME Aerospace",
          specializationRu: "компоненты авиации",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "AIROD",
          specializationRu: "обслуживание авиации",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы мирного времени; парк техники разношёрстный из-за многовекторных закупок прошлых десятилетий.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "Су-30МКМ (Россия) и F/A-18 (США) параллельно — двойная логистика; FA-50 (Корея) на замену Hawk",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "подлодки Scorpene (Франция), фрегаты LCS — долгострой",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "системы малой дальности; средняя дальность — пробел",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "запасы ограничены, производство патронов местное",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Anka (Турция) заказана для морского патрулирования; ScanEagle применялся на Борнео.",
      systems: [
        {
          name: "Anka-S",
          roleRu: "морское патрулирование",
          originRu: "Турция, закупка (заявлено)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "ScanEagle",
          roleRu: "разведка (исторически)",
          originRu: "США, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "тактическая разведка",
          originRu: "коммерческие",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Исторически многовекторный: Россия, США, Франция, Корея, Турция — с издержками несовместимости.",
      importShareNoteRu: "По SIPRI Корея и Турция растут; Россия выпала после 2022 года.",
      mainSuppliers: [
        {
          supplier: "Республика Корея",
          noteRu: "FA-50, боеприпасы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Турция",
          noteRu: "БПЛА Anka, бронетехника (лицензии)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Франция",
          noteRu: "подлодки Scorpene, вертолёты",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Двойной парк истребителей (российский и американский) — дорогая и уязвимая к санкциям логистика",
        "Долгострой фрегатов LCS: коррупционные скандалы сорвали обновление флота",
        "Две территории (полуостров и Борнео), разделённые спорным Южно-Китайским морем",
        "ПВО средней дальности отсутствует при росте региональной ракетной угрозы",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Малайзия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "SGP",
    name: "Singapore",
    nameRu: "Сингапур",
    region: "Юго-Восточная Азия · город-государство",
    defenseIndustry: {
      summaryRu: "Самый развитый ВПК ЮВА относительно размера: ST Engineering (бронетехника, артиллерия, боеприпасы, корабли), сильная электроника и БПЛА. Экспортёр нишевых систем.",
      selfSufficiencyRu: "Высокое по бронетехнике, артиллерии и боеприпасам; истребители и подлодки — импорт при локальной интеграции вооружений.",
      keyCompanies: [
        {
          name: "ST Engineering Land Systems",
          specializationRu: "БМП Bionix/Terrex, САУ Primus, РСЗО HIMARS-совместимые системы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "ST Engineering Marine",
          specializationRu: "фрегаты Formidable (по французскому проекту), патрульные корабли",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "ST Engineering Aerospace",
          specializationRu: "модернизация F-16, обслуживание",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "ST Engineering Advanced Systems",
          specializationRu: "БПЛА и электроника",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы при доктрине «ядовитого креветочного» сдерживания — существенны для размера, но закрыты; производство боеприпасов собственное.",
      entries: [
        {
          categoryRu: "Артиллерийские боеприпасы",
          noteRu: "собственное производство полного цикла",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "РСЗО",
          noteRu: "HIMARS (США) и собственные разработки",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "SPYDER (Израиль), Aster (фрегаты), SAMP/T обсуждался; интеграция многослойная",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "F-15SG и F-35B (США) — сильнейшие ВВС региона, боеприпасы — США/Израиль",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Hermes 450/900, Heron — израильские системы; собственные тактические БПЛА ST Engineering.",
      systems: [
        {
          name: "Hermes 900",
          roleRu: "разведка",
          originRu: "Израиль, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Heron 1",
          roleRu: "разведка",
          originRu: "Израиль, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Veloce / малые типы",
          roleRu: "тактическая разведка",
          originRu: "Сингапур, собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США — главный поставщик платформ; Израиль — ПВО, БПЛА, электроника; Франция — флот.",
      importShareNoteRu: "По SIPRI США дают основную долю стоимости импорта.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "F-15SG, F-35B, HIMARS, вертолёты",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Израиль",
          noteRu: "ПВО SPYDER, БПЛА, модернизация",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Франция",
          noteRu: "фрегаты, вертолёты",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Нулевая стратегическая глубина: вся страна — одна цель, ставка на упреждающее сдерживание и ПВО",
        "Зависимость от импорта продовольствия, воды (частично) и энергии — блокадная уязвимость",
        "Личный состав ограничен: призывная модель при демографическом спаде",
        "Учебные полигоны за рубежом (Австралия, США, Тайвань) — зависимость от принимающих стран",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Сингапур» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "BGD",
    name: "Bangladesh",
    nameRu: "Бангладеш",
    region: "Южная Азия",
    defenseIndustry: {
      summaryRu: "ВПК базовый: Bangladesh Ordnance Factories (боеприпасы по китайским/турецким технологиям), кораблестроение для ВМС и береговой охраны, ремонт авиации с Китаем.",
      selfSufficiencyRu: "Низкое-среднее по боеприпасам и лёгким кораблям; авиация, танки и ПВО — Китай и Турция.",
      keyCompanies: [
        {
          name: "Bangladesh Ordnance Factories",
          specializationRu: "боеприпасы, автоматы BD-08 (лицензия Type 81)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Khulna Shipyard",
          specializationRu: "патрульные корабли и десантные суда",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Bangabandhu Aeronautical Centre",
          specializationRu: "ремонт авиации (с Китаем)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Walton / частный сектор",
          specializationRu: "электроника двойного назначения",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы умеренные для региональной доктрины; закупки Forces Goal 2030 наращивают флот и ВВС.",
      entries: [
        {
          categoryRu: "Танки",
          noteRu: "VT-5 и модернизированные Type 59 (Китай)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Артиллерия",
          noteRu: "WS-22 (Китай), Boran (Турция — заявлено)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "китайские фрегаты и корветы (б/у и новые), подлодки Type 035G (Китай)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "J-10CE (Китай, контракт заявлен в прессе), F-7 и Як-130 наследия",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Bayraktar TB2 закуплены; собственные программы малы.",
      systems: [
        {
          name: "Bayraktar TB2",
          roleRu: "ISR и удар",
          originRu: "Турция, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "Китай/коммерческие",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Китай — доминирующий поставщик; Турция растёт (БПЛА, артиллерия), Россия — вертолёты исторически.",
      importShareNoteRu: "По SIPRI Китай даёт подавляющую долю импорта.",
      mainSuppliers: [
        {
          supplier: "Китай",
          noteRu: "авиация, флот, танки, РСЗО",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Турция",
          noteRu: "TB2, артиллерия, бронетехника",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Россия",
          noteRu: "вертолёты Ми-171, Як-130 (исторически)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Почти монопольная зависимость от Китая при его же споре с Индией — риск давления с двух сторон",
        "Дельта Ганга: наводнения и циклones ежегодно бьют по инфраструктуре и базам",
        "Мьянма на границе: кризис рохинджа и приграничные инциденты",
        "Малая глубина ПВО и отсутствие современных истребителей до поставок J-10",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Бангладеш» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "LKA",
    name: "Sri Lanka",
    nameRu: "Шри-Ланка",
    region: "Южная Азия · остров",
    defenseIndustry: {
      summaryRu: "ВПК минимальный: ремонт кораблей (Colombo Dockyard), патроны и лёгкое производство при армии, заточенной под завершившуюся гражданскую войну.",
      selfSufficiencyRu: "Низкое: почти вся техника импортная, финансирование обороны урезано экономическим кризисом 2022 года.",
      keyCompanies: [
        {
          name: "Colombo Dockyard",
          specializationRu: "ремонт и строительство патрульных кораблей",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Sri Lanka Electrical & Mechanical Engineers",
          specializationRu: "армейские мастерские и лёгкое производство",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "SLEME / заводы МО",
          specializationRu: "боеприпасы малого калибра",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы для противоповстанческой войны; тяжёлая техника устарела.",
      entries: [
        {
          categoryRu: "Бронетехника",
          noteRu: "китайские и украинские/советские машины наследия гражданской войны",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Артиллерия",
          noteRu: "китайские и пакистанские системы, РСЗО",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "патрульные корабли Индии и США (переданные катера), китайский фрегат (дар)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "Kfir (Израиль) частично восстановлены, МиГ-27 выведены",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые разведывательные БПЛА; ударных систем нет.",
      systems: [
        {
          name: "Малые БПЛА",
          roleRu: "разведка побережья",
          originRu: "коммерческие/Израиль",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Sky Lark (типы)",
          roleRu: "разведка",
          originRu: "Израиль (исторически)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Китай, Индия, Пакистан и США конкурируют поставками и дарами; экономически страна зависит от всех трёх центров.",
      importShareNoteRu: "По SIPRI Китай и Индия — главные источники техники.",
      mainSuppliers: [
        {
          supplier: "Китай",
          noteRu: "корабли, бронетехника, боеприпасы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Индия",
          noteRu: "патрульные корабли, обучение, кредиты",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Пакистан",
          noteRu: "артиллерия и боеприпасы (исторически)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "США",
          noteRu: "переданные катера береговой охраны",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Экономический кризис 2022 года подорвал боеспособность: топливо и запчасти в дефиците",
        "Островная зависимость от морских поставок при слабом флоте",
        "Геополитический перетягивание Индия—Китай ограничивает свободу закупок",
        "Армия велика для мирного времени, но техника и подготовка деградируют без финансирования",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Шри-Ланка» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "NPL",
    name: "Nepal",
    nameRu: "Непал",
    region: "Южная Азия · Гималаи",
    defenseIndustry: {
      summaryRu: "ВПК практически отсутствует: небольшие армейские мастерские и производство патронов в Сундarijal при санкционно-ограниченной истории закупок.",
      selfSufficiencyRu: "Минимальное: армия лёгкой пехоты снабжается дарами и малыми закупками Индии и Китая.",
      keyCompanies: [
        {
          name: "Nepal Army workshops (Sundarijal)",
          specializationRu: "патроны и ремонт стрелкового оружия",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Директорат военного производства",
          specializationRu: "лёгкое снаряжение",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы для внутренней безопасности и миротворчества ООН — основного источника валютных поступлений армии.",
      entries: [
        {
          categoryRu: "Стрелковое оружие",
          noteRu: "смесь индийских INSAS, американских M16 (дары) и китайских систем",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "транспортные вертолёты Ми-17 и лёгкие самолёты; боевых самолётов нет",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "лёгкие бронеавтомобили Китая и Индии",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "практически отсутствует",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые коммерческие БПЛА для разведки в горах; военных программ нет.",
      systems: [
        {
          name: "Малые коммерческие БПЛА",
          roleRu: "разведка и поисково-спасательные задачи",
          originRu: "коммерческие платформы",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Индия — исторический поставщик; Китай наращивает дары и обучение; США — точечная помощь.",
      importShareNoteRu: "Данные SIPRI скудны; объёмы малы и часто вне коммерческих контрактов.",
      mainSuppliers: [
        {
          supplier: "Индия",
          noteRu: "стрелковое оружие, вертолёты (исторически), обучение",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Китай",
          noteRu: "бронеавтомобили, дары и кредиты",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "США",
          noteRu: "транспорт и снаряжение по программам помощи",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Зажат между Индией и Китаем: любой конфликт гималайского узла бьёт по транзиту и снабжению",
        "Горная страна без ВВС и ПВО: контроль воздуха полностью зависит от соседей",
        "Зависимость от индийских портов и топлива — блокадный рычаг Дели",
        "Сейсмическая зона: армия — главный инструмент ликвидации катастроф, а не войны",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Непал» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "MMR",
    name: "Myanmar",
    nameRu: "Мьянма",
    region: "Юго-Восточная Азия · гражданская война",
    defenseIndustry: {
      summaryRu: "ВПК (KaPaSa) производит боеприпасы, бронетехнику и РСЗО по китайским, российским и северокорейским технологиям; с 2021 года — расширение при поддержке России и Китая, включая заводы, построенные при участии иностранных специалистов (по открытым расследованиям).",
      selfSufficiencyRu: "Среднее по боеприпасам и лёгкой технике; авиация и ПВО — Россия/Китай. Санкции усилили зависимость от этих двух поставщиков.",
      keyCompanies: [
        {
          name: "Defence Products Industries (KaPaSa)",
          specializationRu: "боеприпасы, бронетехника, артиллерия",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Myanmar Naval Dockyard",
          specializationRu: "ремонт и строительство патрульных кораблей",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Shwe Mann / частные подрядчики МО",
          specializationRu: "снабжение и логистика хунты",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Расход боеприпасов в гражданской войне высок; восполнение — собственным производством и поставками России, Китая, Беларуси, Пакистана (по открытым данным).",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "Су-30СМЭ и JF-17 (Китай/Пакистан), Як-130; удары по повстанцам — основная нагрузка",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Артиллерия",
          noteRu: "РСЗО и боеприпасы собственного и китайского производства",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "Печора-2М, китайские системы, ПЗРК",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "производство KaPaSa расширяется; импортные компоненты — из Китая и Индии (по расследованиям прессы)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Хунта массово применяет коммерческие и китайские БПЛА; повстанцы отвечают самодельными FPV — дроновая война с обеих сторон.",
      systems: [
        {
          name: "CH-3 / CH-4 (типы)",
          roleRu: "ISR и удар",
          originRu: "Китай, закупка (оценка)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Коммерческие FPV и квадрокоптеры",
          roleRu: "удар и разведка обеих сторон конфликта",
          originRu: "коммерческие платформы, массовая адаптация",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Собственные малые БПЛА",
          roleRu: "разведка",
          originRu: "Мьянма, собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Россия и Китай — системные поставщики несмотря на санкции Запада; Индия сохраняет ограниченные связи.",
      importShareNoteRu: "По SIPRI Россия и Китай дают почти весь импорт тяжёлых систем.",
      mainSuppliers: [
        {
          supplier: "Россия",
          noteRu: "Су-30СМЭ, вертолёты, ПВО",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Китай",
          noteRu: "JF-17 (с Пакистаном), БПЛА, бронетехника",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Беларусь/Пакистан",
          noteRu: "ремонт, боеприпасы (по открытым данным)",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Гражданская война: хунта теряет территории, логистика и склады уязвимы для повстанческих ударов",
        "Санкции по компонентам: электроника ВПК зависит от серых цепочек через соседей",
        "Этнические армии контролируют приграничные ресурсы — финансовая база режима сжимается",
        "Зависимость от России и Китая одновременно: оба используют Мьянму как рычаг в региональной игре",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Мьянма» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "KHM",
    name: "Cambodia",
    nameRu: "Камбоджа",
    region: "Юго-Восточная Азия",
    defenseIndustry: {
      summaryRu: "ВПК отсутствует как отрасль: патронное производство при китайской помощи и ремонтные мастерские. Армия снабжается Китаем (дары и кредиты) и советским наследием.",
      selfSufficiencyRu: "Минимальное.",
      keyCompanies: [
        {
          name: "Армейские ремонтные базы",
          specializationRu: "ремонт советской и китайской техники",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Патронное производство (китайская помощь)",
          specializationRu: "боеприпасы малого калибра (по открытым данным)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы советского и китайского наследия; обновление — китайские поставки, включая ПВО и РСЗО.",
      entries: [
        {
          categoryRu: "ПВО",
          noteRu: "KS-1C (Китай) — первые современные ЗРК страны",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "РСЗО",
          noteRu: "китайские системы и модернизированные «Грады»",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "китайские и советские машины",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "китайские патрульные катера; база Реам модернизируется при китайской помощи (по открытым данным)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые китайские и коммерческие БПЛА; программ ударных БПЛА нет.",
      systems: [
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "Китай/коммерческие, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Китай — почти монопольный современный поставщик; Вьетнам и Россия — историческое наследие.",
      importShareNoteRu: "По SIPRI Китай доминирует безусловно.",
      mainSuppliers: [
        {
          supplier: "Китай",
          noteRu: "ПВО, РСЗО, катера, инфраструктура базы Реам",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Вьетнам",
          noteRu: "обучение и наследие",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Россия",
          noteRu: "вертолёты (исторически)",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Зависимость от Китая при его споре с Вьетнамом и США ставит Пномпень в центр конкуренции за базу Реам",
        "Армия политизирована и ориентирована на внутреннюю стабильность, а не внешнюю оборону",
        "Граница с Таиландом: периодические вооружённые обострения (Преахвихеа и обострение 2025 года по открытым данным)",
        "Отсутствие современной авиации и флота при длинной береговой линии залива",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Камбоджа» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "NZL",
    name: "New Zealand",
    nameRu: "Новая Зеландия",
    region: "Океания",
    defenseIndustry: {
      summaryRu: "ВПК малый: Safe Air (обслуживание авиации), ракетный стартап Rocket Lab (гражданский с двойным потенциалом), кораблеремонт. Оборонная стратегия опирается на Австралию и Five Eyes.",
      selfSufficiencyRu: "Низкое: боевой авиации нет с 2001 года (Skyhawk выведены), всё ключевое — импорт из США, Австралии и Европы.",
      keyCompanies: [
        {
          name: "Safe Air (Air NZ)",
          specializationRu: "обслуживание военной авиации",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Rocket Lab",
          specializationRu: "космические запуски (гражданские, двойное назначение)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Babcock NZ (Devonport)",
          specializationRu: "ремонт кораблей ВМС",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Merlin / частный сектор",
          specializationRu: "электроника и связь",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы экспедиционного профиля малы; замена P-3 на P-8 и фрегатный вопрос — главные программы.",
      entries: [
        {
          categoryRu: "Морская авиация",
          noteRu: "P-8A Poseidon (США) — 4 машины на весь океанский район",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "2 фрегата ANZAC (модернизация в Канаде), патрульные корабли",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Сухопутные войска",
          noteRu: "LAV III (Канада), артиллерия L119, ПТРК Javelin",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "только ПЗРК и корабельные средства",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые тактические БПЛА; морских патрульных дронов нет — район ответственности огромен для 4 P-8.",
      systems: [
        {
          name: "RQ-20 / Skylark (типы)",
          roleRu: "тактическая разведка",
          originRu: "США/Израиль, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "коммерческие",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США — главный поставщик; Австралия — партнёр по ANZAC и обучению; Канада и ЕС — ниши.",
      importShareNoteRu: "По SIPRI США дают основную долю.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "P-8A, вертолёты MH-60 (заявлено), боеприпасы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Австралия",
          noteRu: "кооперация ANZAC, обучение",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Канада",
          noteRu: "LAV, модернизация фрегатов",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Нет боевой авиации и ПВО: оборона воздушного пространства фактически делегирована Австралии и США",
        "Огромная морская зона при 2 фрегатах и 4 патрульных самолётах",
        "Зависимость от морских путей снабжения из Азии и Австралии",
        "Кадровый кризис ВС: недобор и отток в австралийские силы",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Новая Зеландия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "KAZ",
    name: "Kazakhstan",
    nameRu: "Казахстан",
    region: "Центральная Азия",
    defenseIndustry: {
      summaryRu: "ВПК средний: Kazakhstan Engineering, заводы бронетехники и боеприпасов, БПЛА при турецкой кооперации, ремонт авиации. Курс на локализацию после 2022 года и диверсификацию от России.",
      selfSufficiencyRu: "Среднее по бронетехнике и боеприпасам; авиация и ПВО — Россия, растёт роль Турции и ЕС.",
      keyCompanies: [
        {
          name: "Kazakhstan Engineering",
          specializationRu: "холдинг ВПК: бронетехника, боеприпасы, электроника",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Semey Engineering / Kazakhstan Aselsan Engineering",
          specializationRu: "бронетехника, оптика (СП с Турцией)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Kazakhstan Aviation Industry",
          specializationRu: "ремонт и сборка авиации",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Eurocopter Kazakhstan Engineering",
          specializationRu: "сборка вертолётов EC145/H145",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы советского наследия велики, но стареют; новые закупки — Су-30СМ (Россия) и турецкие БПЛА.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "Су-30СМ (Россия), C295 (Испания), вертолёты Ми-171 и H145",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "С-300ПС (Россия, дар/поставки), «Бук», модернизация при российской поддержке",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Barys 8x8 (собственная разработка), Arlan (лицензия ЮАР)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "производство наращивается; новые заводы боеприпасов заявлены",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Anka (Турция) — сборка в Казахстане заявлена; Wing Loong (Китай) и «Скат» собственные проекты.",
      systems: [
        {
          name: "Anka",
          roleRu: "ISR и удар",
          originRu: "Турция, закупка и заявленная локализация",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Wing Loong I",
          roleRu: "разведка",
          originRu: "Китай, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Собственные малые БПЛА",
          roleRu: "разведка",
          originRu: "Казахстан, разработка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Россия — исторический лидер; Турция и ЕС наращивают долю; Китай — точечно.",
      importShareNoteRu: "По SIPRI Россия остаётся крупнейшим поставщиком, но тренд — диверсификация.",
      mainSuppliers: [
        {
          supplier: "Россия",
          noteRu: "Су-30СМ, ПВО, вертолёты",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Турция",
          noteRu: "БПЛА Anka, оптика, бронетехника",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Испания/ЕС",
          noteRu: "транспортные C295, вертолёты",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Самая длинная сухопутная граница с Россией при глубокой зависимости от российской техники и ОДКБ",
        "Каспий и нефтяная инфраструктура: зависимость от КТК и российских маршрутов экспорта нефти",
        "Северные области и водные споры с соседями по Центральной Азии",
        "ВПК зависит от российских компонентов в ключевых программах наследия",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Казахстан» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "UZB",
    name: "Uzbekistan",
    nameRu: "Узбекистан",
    region: "Центральная Азия",
    defenseIndustry: {
      summaryRu: "ВПК создаётся с нуля после 2017 года: Государственный комитет оборонной промышленности, технопарки, кооперация с Турцией, Беларусью и Россией по ремонту и боеприпасам.",
      selfSufficiencyRu: "Низкое, но растущее: боеприпасы, бронемашины и БПЛА — первые локализованные программы.",
      keyCompanies: [
        {
          name: "Госкомоборонпром / технопарк «Чирчик»",
          specializationRu: "интегратор программ ВПК",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "UzAuto / оборонные СП",
          specializationRu: "бронемашины (заявленные программы)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Предприятия боеприпасов (ферганский кластер)",
          specializationRu: "боеприпасы (по открытым данным)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Советское наследие обновляется закупками: вертолёты Airbus, транспортники, ПВО из Китая и Франции (по открытым данным).",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "Су-25 и МиГ-29 наследия, вертолёты H215 (Франция), обсуждалась покупка Rafale (по прессе, не подтверждено)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "китайские и французские системы (по открытым данным), советские комплексы",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "российские БТР-82А и собственные программы",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "локализация производства — приоритет госкомитета",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Собственный барражирующий боеприпас Lochin и разведывательные БПЛА — первые серийные программы страны.",
      systems: [
        {
          name: "Lochin",
          roleRu: "барражирующий боеприпас",
          originRu: "Узбекистан, собственное (заявлено)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "собственные и коммерческие",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Россия, Франция, Китай, Турция и Беларусь — конкурентные поставщики при политике равноудалённости.",
      importShareNoteRu: "По SIPRI Франция и Россия заметны; данные фрагментарны.",
      mainSuppliers: [
        {
          supplier: "Россия",
          noteRu: "бронетехника, вертолёты, боеприпасы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Франция",
          noteRu: "вертолёты H215, ПВО (по открытым данным)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Китай",
          noteRu: "ПВО и БПЛА-компоненты",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Турция",
          noteRu: "бронетехника и кооперация ВПК",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Нет выхода к морю вдвойне (double-landlocked): вся логистика — через соседей",
        "Афганская граница и водно-энергетические споры региона",
        "ВПК молод: зависимость от импортных компонентов и иностранных партнёров по всем программам",
        "Наследие советской техники требует российской поддержки, которую Ташкент стремится ограничить",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Узбекистан» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "AZE",
    name: "Azerbaijan",
    nameRu: "Азербайджан",
    region: "Кавказ",
    defenseIndustry: {
      summaryRu: "ВПК вырос на нефтяных доходах: Министерство оборонной промышленности, БПЛА при израильской и турецкой кооперации, боеприпасы. Победа 2020 года построена на импортных ударных системах при растущей локализации.",
      selfSufficiencyRu: "Среднее: боеприпасы и БПЛА частично локализованы; авиация, ПВО и бронетехника — Израиль, Турция, Россия, Беларусь.",
      keyCompanies: [
        {
          name: "Министерство оборонной промышленности (заводы AZAD, «Иглим» и др.)",
          specializationRu: "боеприпасы, БПЛА, бронетехника",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "AzDynamics / частные фирмы",
          specializationRu: "FPV и ударные БПЛА (рост после 2020 года)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Сумгаитский кластер",
          specializationRu: "боеприпасы и взрывчатые вещества",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "После войны 2020 года запасы восполнены закупками; акцент — высокоточные боеприпасы и БПЛА.",
      entries: [
        {
          categoryRu: "БПЛА-ударные",
          noteRu: "Bayraktar TB2 и Akinci (Турция), Harop (Израиль) — ядро ударного потенциала",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Артиллерия",
          noteRu: "РСЗО и САУ из Беларуси, России, Турции и Чехии (DANA)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "Barak-8 (Израиль), С-300ПМУ2 (Россия), «Печора» модернизации",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "МиГ-29 и Су-25 наследия; JF-17 (Пакистан/Китай) — контракт по открытым данным",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Азербайджан — эталон применения ударных БПЛА 2020 года; парк TB2/Akinci и Harop, собственные FPV развиваются.",
      systems: [
        {
          name: "Bayraktar TB2 / Akinci",
          roleRu: "ISR и удар",
          originRu: "Турция, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Harop",
          roleRu: "барражирующий боеприпас против ПВО и РЛС",
          originRu: "Израиль, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Orbiter / Aerostar",
          roleRu: "разведка",
          originRu: "Израиль, лицензионная сборка (AZAD)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Израиль и Турция — системные партнёры; Россия и Беларусь — наследие и артиллерия.",
      importShareNoteRu: "По SIPRI Израиль — крупнейший поставщик 2020–2024, Турция — второй.",
      mainSuppliers: [
        {
          supplier: "Израиль",
          noteRu: "Barak-8, Harop, БПЛА, артиллерия LORA (по открытым данным)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Турция",
          noteRu: "TB2/Akinci, РСЗО, бронетехника",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Россия",
          noteRu: "С-300ПМУ2, вертолёты (исторически)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Пакистан",
          noteRu: "JF-17 Block III (контракт)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Зависимость ударного потенциала от Турции и Израиля: экспортные решения Анкары и Иерусалима критичны",
        "Нефтяная зависимость бюджета: цена нефти определяет темп перевооружения",
        "Каспийская инфраструктура и трубопроводы (BTC) — протяжённые уязвимые цели",
        "Напряжённость с Ираном на южной границе при его ракетном превосходстве в регионе",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Азербайджан» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "GEO",
    name: "Georgia",
    nameRu: "Грузия",
    region: "Кавказ",
    defenseIndustry: {
      summaryRu: "ВПК малый: Delta (бронетехника Didgori, РСЗО, боеприпасы), авиазавод TAM (Су-25 наследие). После 2008 года ставка на совместимость с НАТО при скромном бюджете.",
      selfSufficiencyRu: "Низкое-среднее по лёгкой бронетехнике и боеприпасам; ПВО и авиация — символические.",
      keyCompanies: [
        {
          name: "STC Delta",
          specializationRu: "бронемашины Didgori, миномёты, РСЗО",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Tbilisi Aircraft Manufacturing",
          specializationRu: "ремонт Су-25 (наследие)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Delta-WB / СП",
          specializationRu: "боеприпасы и БПЛА (по открытым данным)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы малы; закупки — ПТРК Javelin, ПЗРК Stinger (США), французские радары и ПВО малой дальности.",
      entries: [
        {
          categoryRu: "Противотанковые средства",
          noteRu: "Javelin (США) — ядро противотанковой обороны",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "французские радары Ground Master, Mistral; советские комплексы наследия",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Didgori собственной сборки, турецкие Ejder и Cobra",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Артиллерия",
          noteRu: "советское наследие и чешские DANA (исторически)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые разведывательные БПЛА, включая польские Warmate (барражирующие) по открытым данным.",
      systems: [
        {
          name: "Warmate",
          roleRu: "барражирующий боеприпас",
          originRu: "Польша, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "Израиль/ЕС/коммерческие",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США — главный партнёр (помощь и продажи), Франция — ПВО/радары, Турция и Израиль — ниши.",
      importShareNoteRu: "По SIPRI США лидируют; объёмы невелики.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "Javelin, Stinger, обучение и помощь",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Франция",
          noteRu: "радары, ПВО малой дальности",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Турция",
          noteRu: "бронемашины, боеприпасы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Оккупированные территории (по позиции Тбилиси) и российские базы в Абхазии и Южной Осетии — в пределах досягаемости вся страна",
        "Нет истребительной авиации и ПВО средней дальности",
        "Зависимость от американской помощи и политической конъюнктуры Вашингтона",
        "Единственный глубоководный порт и транзит Азербайджана—Турция уязвимы для регионального кризиса",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Грузия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "ARM",
    name: "Armenia",
    nameRu: "Армения",
    region: "Кавказ",
    defenseIndustry: {
      summaryRu: "ВПК малый: боеприпасы, оптика, БПЛА и РЭБ стартапы; после 2020 года — болезненная перестройка и поворот от России к Индии, Франции и Ирану по закупкам.",
      selfSufficiencyRu: "Низкое: тяжёлые системы импортируются; ниши — БПЛА, РЭБ, боеприпасы малого калибра.",
      keyCompanies: [
        {
          name: "Заводы МО («Нейтрон», Чаренцаванский кластер)",
          specializationRu: "боеприпасы и вооружение",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "UAV Lab / Davaro и стартапы БПЛА",
          specializationRu: "разведывательные и ударные БПЛА",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "ProMAQ / оптика",
          specializationRu: "приборы и электроника",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Потери 2020 и 2023 годов не восполнены полностью; закупки в Индии (Pinaka, ATAGS — заявлено) и Франции (Caesar, радары) начались с 2023 года.",
      entries: [
        {
          categoryRu: "Артиллерия",
          noteRu: "Pinaka и ATAGS (Индия, контракты по прессе), советское наследие",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "советские системы и индийские Akash (заявлено в прессе); Россия не выполнила часть контрактов по заявлениям Еревана",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "БПЛА",
          noteRu: "собственные разведывательные системы, индийские и французские закупки",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "собственное производство малого калибра; крупный калибр — импорт",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Дроновые стартапы растут после уроков 2020 года; массовости пока нет, импорт из Индии и Франции.",
      systems: [
        {
          name: "Собственные разведывательные БПЛА",
          roleRu: "разведка и корректировка",
          originRu: "Армения, собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "FPV",
          roleRu: "ударные задачи",
          originRu: "собственное/коммерческое, рост",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Импортные системы (Индия/Франция)",
          roleRu: "разведка",
          originRu: "закупки с 2023 года",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Индия выходит на первое место по новым контрактам; Франция — второй новый партнёр; Россия сохраняет наследие, но поставки заморожены по заявлениям Армении.",
      importShareNoteRu: "По SIPRI Индия и Франция резко нарастили долю после 2022 года.",
      mainSuppliers: [
        {
          supplier: "Индия",
          noteRu: "Pinaka, ATAGS, радары, ПВО (по контрактам в прессе)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Франция",
          noteRu: "Caesar, радары GM200, бронетехника Bastion",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Россия",
          noteRu: "наследие: Су-30СМ, Искандер-Э (по открытым данным), поставки остановлены",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "География: окружена Азербайджаном и Турцией, единственный надёжный коридор — Иран и Грузия",
        "Гарантии ОДКБ не сработали в оценке Еревана — система союзов в перестройке",
        "Зависимость от новых поставщиков без устоявшейся логистики и обучения",
        "Сюникский коридор: давление по транзиту при военном дисбалансе с Азербайджаном",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Армения» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "MNG",
    name: "Mongolia",
    nameRu: "Монголия",
    region: "Восточная Азия · между Россией и Китаем",
    defenseIndustry: {
      summaryRu: "ВПК отсутствует: ремонтные мастерские советской техники. Оборонная политика — нейтралитет, миротворчество ООН и «третьи соседи» (США, Япония, Корея).",
      selfSufficiencyRu: "Минимальное: даже боеприпасы импортируются.",
      keyCompanies: [
        {
          name: "Армейские ремонтные предприятия",
          specializationRu: "ремонт советской бронетехники и автомобилей",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Советское наследие 1970–80-х годов в малых количествах; обновления — дары России и Китая, помощь США.",
      entries: [
        {
          categoryRu: "Бронетехника",
          noteRu: "Т-72 и БМП-1 (дары России), китайские бронеавтомобили",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "вертолёты Ми-171 (Россия), боевых самолётов нет",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "советские ПЗРК и зенитная артиллерия",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "малые запасы советского наследия",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые коммерческие БПЛА; военных программ нет.",
      systems: [
        {
          name: "Малые коммерческие БПЛА",
          roleRu: "разведка и пограничный контроль",
          originRu: "коммерческие платформы",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Россия и Китай — дары и символические поставки; США и союзники — обучение и снаряжение для миротворцев.",
      importShareNoteRu: "Коммерческий импорт вооружений минимален (SIPRI).",
      mainSuppliers: [
        {
          supplier: "Россия",
          noteRu: "танки и вертолёты (дары)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Китай",
          noteRu: "бронеавтомобили и снаряжение (дары)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "США",
          noteRu: "помощь миротворческим подразделениям",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Зажата между Россией и Китаем без выхода к морю: вся торговля и снабжение — через двух соседей",
        "Армия мала и технически устарела: сдерживание не предполагается доктриной",
        "Зависимость от российского топлива и китайского рынка сбыта сырья",
        "Степи и редкая инфраструктура: мобильность ограничена немногими дорогами и одной железнодорожной осью",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Монголия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "IRQ",
    name: "Iraq",
    nameRu: "Ирак",
    region: "Ближний Восток",
    defenseIndustry: {
      summaryRu: "ВПК разрушен войнами и санкциями; восстанавливается патронное и ремонтное производство при иранской и китайской помощи. Армия снабжается США (FMS), а ополчения — Ираном вне государственного контура.",
      selfSufficiencyRu: "Минимальное по современным системам; ниши — ремонт и боеприпасы малого калибра.",
      keyCompanies: [
        {
          name: "Al-Qadissiya / предприятия ВПК (восстанавливаются)",
          specializationRu: "боеприпасы и ремонт",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Государственные ремонтные базы Басры и Багдада",
          specializationRu: "ремонт американской и советской техники",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Двойной контур снабжения: армия — США и Европа, «Хашд аш-Шааби» — иранские каналы; государственные запасы боеприпасов ограничены.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "F-16IQ (США) с урезанным вооружением, Су-25 (Россия/Иран наследие), L-159 (Чехия)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "M1A1 Abrams (США), Т-90С (Россия), советское наследие",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "пробел после 2003 года: закупаются корейские и китайские системы (по открытым данным), Панцирь (Россия)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "зависимость от поставок США и иранских каналов для ополчений",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Иранские БПЛА у ополчений (Mohajer, Ababil — по открытым данным); армия использует ScanEagle и CH-4 (Китай).",
      systems: [
        {
          name: "CH-4",
          roleRu: "ISR и удар",
          originRu: "Китай, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "ScanEagle",
          roleRu: "разведка",
          originRu: "США, помощь",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Mohajer-6 / Ababil (ополчения)",
          roleRu: "ISR и удар",
          originRu: "Иран, поставки формированиям (оценка)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США — главный поставщик армии; Россия и Китай — дополнительные каналы; Иран — теневой контур ополчений.",
      importShareNoteRu: "По SIPRI США дают основную долю официального импорта.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "F-16, Abrams, артиллерия, обучение",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Россия",
          noteRu: "Т-90С, вертолёты Ми-28/Ми-35 (исторически)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Китай",
          noteRu: "БПЛА CH-4, бронетехника",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Иран",
          noteRu: "БПЛА и ракеты для ополчений (вне гос. контура)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Двойная система вооружённых сил: армия и ирански ориентированные ополчения с отдельными складами и логистикой",
        "ПВО страны фактически отсутствует против современных ВВС и БПЛА",
        "Зависимость от США по запчастям F-16 и Abrams при политической нестабильности отношений",
        "Нефтяная инфраструктура юга уязвима для ударов БПЛА ополчений и региональных игроков",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Ирак» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "SYR",
    name: "Syria",
    nameRu: "Сирия",
    region: "Ближний Восток · постконфликтный переход",
    defenseIndustry: {
      summaryRu: "ВПК советского образца (заводы боеприпасов и ракет при иранской помощи) разрушен войной и ударами; после смены власти в декабре 2024 года армия переформируется, арсеналы наследия частично уничтожены израильскими ударами 2024 года (по открытым данным).",
      selfSufficiencyRu: "Данные фрагментарны: производственные мощности деградировали, новая система снабжения формируется при турецком влиянии (оценка).",
      keyCompanies: [
        {
          name: "Заводы МО в Хаме и Алеппо (наследие)",
          specializationRu: "боеприпасы и ракеты — состояние после ударов неопределённо",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Ремонтные предприятия Дамаска",
          specializationRu: "ремонт советской техники",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Арсеналы наследия (танки, артиллерия, ПВО) частично выведены из строя ударами декабря 2024 года; точный остаток неизвестен — оценки расходятся.",
      entries: [
        {
          categoryRu: "ПВО",
          noteRu: "советские и российские системы наследия частично уничтожены (по заявлениям Израиля и открытым данным)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "советский парк в основном небоеспособен; будущее ВВС не определено",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "тысячи единиц наследия с высокой долей небоевых потерь",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Ракеты",
          noteRu: "программы наследия при иранской помощи свёрнуты с уходом прежнего режима (оценка)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "При прежнем режиме применялись иранские БПЛА; в переходный период дроновый потенциал фрагментарен, Турция — вероятный поставщик (оценка).",
      systems: [
        {
          name: "Иранские БПЛА (наследие)",
          roleRu: "ISR и удар",
          originRu: "Иран, поставки до 2024 года (оценка)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Коммерческие FPV",
          roleRu: "тактические задачи формирований",
          originRu: "коммерческая адаптация",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "До 2024 года — Россия и Иран; после смены власти каналы перестраиваются, данные SIPRI за переходный период неполны.",
      importShareNoteRu: "Исторически Россия — главный поставщик тяжёлых систем.",
      mainSuppliers: [
        {
          supplier: "Россия",
          noteRu: "ПВО, авиация, базы Хмеймим/Тартус (статус пересматривается)",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Иран",
          noteRu: "БПЛА и ракеты до 2024 года",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Турция",
          noteRu: "растущее влияние на новые вооружённые силы (оценка)",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Государственность в переходе: армия, склады и командование переформируются, контроль над арсеналами неполный",
        "Израильские удары по военным объектам продолжаются по открытым данным и после 2024 года",
        "Фрагментация вооружённых групп сохраняет риск утечки вооружений",
        "Экономика разрушена: финансирование обороны минимально при огромных потребностях восстановления",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Сирия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "JOR",
    name: "Jordan",
    nameRu: "Иордания",
    region: "Ближний Восток",
    defenseIndustry: {
      summaryRu: "ВПК нишевый, но реальный: Jadara (ПТРК и РПГ), KADDB/JODDB — бронетехника и модернизация, боеприпасы. Экспорт в регион и Африку.",
      selfSufficiencyRu: "Среднее по противотанковым средствам и лёгкой бронетехнике; авиация и ПВО — США.",
      keyCompanies: [
        {
          name: "Jadara Equipment & Defence Systems",
          specializationRu: "ПТРК Terminator, РПГ-32 «Нашшаб» (кооперация с Россией исторически)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Jordan Design and Development Bureau (JODDB)",
          specializationRu: "бронетехника, модернизация, боеприпасы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Jordan Advanced Machining",
          specializationRu: "компоненты и механообработка",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы поддерживаются американской помощью; парк — западный с восточными нишами (китайские РСЗО и БПЛА).",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "F-16 (США, включая новые Block 70 — контракт), вертолёты Black Hawk",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "Patriot (США, развёрнуты), ПЗРК и системы малой дальности",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "РСЗО",
          noteRu: "WM-120 (Китай) и HIMARS (США)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "модернизированные танки наследия и бронемашины собственной сборки",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "CH-4B (Китай) и ScanEagle (США); собственные малые БПЛА Jadara/JODDB.",
      systems: [
        {
          name: "CH-4B",
          roleRu: "ISR и удар",
          originRu: "Китай, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "ScanEagle",
          roleRu: "разведка",
          originRu: "США, помощь",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "Иордания, собственное",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США — системный донор и поставщик; Китай — РСЗО и БПЛА; Россия исторически — ПТРК-лицензии.",
      importShareNoteRu: "По SIPRI США дают подавляющую долю.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "F-16, Patriot, HIMARS, военная помощь",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Китай",
          noteRu: "РСЗО WM-120, БПЛА CH-4",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "ОАЭ/регион",
          noteRu: "кооперация и реэкспортные каналы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Водная и энергетическая зависимость: нефть и газ импортируются через уязвимые маршруты",
        "Длинные границы с Сирией и Ираком: контрабанда каптагона и оружия, проникновение групп",
        "Зависимость от американской помощи: бюджет обороны фактически субсидируется Вашингтоном",
        "Перехват иранских БПЛА и ракет в 2024 году показал вовлечённость в региональную войну при ограниченной собственной ПВО",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Иордания» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "OMN",
    name: "Oman",
    nameRu: "Оман",
    region: "Ближний Восток · Аравийский полуостров",
    defenseIndustry: {
      summaryRu: "ВПК почти отсутствует, кроме производства патронов при участии ОАЭ (по открытым данным) и ремонта. Ставка — на закупки у Великобритании и США и дипломатию нейтралитета.",
      selfSufficiencyRu: "Минимальное.",
      keyCompanies: [
        {
          name: "Oman Munition Production Company",
          specializationRu: "патроны (СП с эмиратским капиталом)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Ремонтные базы ВС",
          specializationRu: "ремонт британской и американской техники",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы мирного времени при небольшом, но профессиональном войске; парк преимущественно британский.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "Eurofighter Typhoon и F-16 (параллельно), Hawk",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "корветы и патрульные корабли британской и сингапурской постройки",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "NASAMS (США/Норвегия) заявлены, ПЗРК",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Challenger 2 (Великобритания), Piranha",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые разведывательные БПЛА; ударных систем не заявлялось.",
      systems: [
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "США/ЕС, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Великобритания — исторический поставщик; США — авиация и ПВО; Турция — бронетехника Pars (контракт).",
      importShareNoteRu: "По SIPRI Великобритания и США лидируют.",
      mainSuppliers: [
        {
          supplier: "Великобритания",
          noteRu: "Typhoon, Challenger 2, корветы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "США",
          noteRu: "F-16, NASAMS, боеприпасы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Турция",
          noteRu: "БМП Pars 8x8",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Ормузский пролив и порт Дукм: стратегическая ценность делает Оман объектом давления всех сторон",
        "Два парка истребителей малыми сериями — дорогая логистика",
        "Зависимость от иностранных боеприпасов и обслуживания по всем системам",
        "Йеменская граница: хуситские БПЛА и ракеты в радиусе досягаемости инфраструктуры Дофара",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Оман» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "QAT",
    name: "Qatar",
    nameRu: "Катар",
    region: "Ближний Восток · Аравийский полуостров",
    defenseIndustry: {
      summaryRu: "ВПК создаётся вокруг холдинга Barzan: СП с Rheinmetall, Leonardo и турецкими фирмами, боеприпасы и бронетехника. Масштаб пока мал относительно закупочного бума платформ.",
      selfSufficiencyRu: "Низкое: почти все платформы импортные; локализация — обслуживание и боеприпасы.",
      keyCompanies: [
        {
          name: "Barzan Holdings",
          specializationRu: "государственный оборонный холдинг, СП с западными фирмами",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Barood / Barzan Industrial",
          specializationRu: "боеприпасы (проекты)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Qatar Amiri Maintenance",
          specializationRu: "обслуживание авиации",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "После блокады 2017–2021 годов закупки утроились: три типа истребителей, танки Leopard, ПВО Patriot и NASAMS; запасы боеприпасов наращиваются.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "Rafale (Франция), Typhoon (Великобритания), F-15QA (США) — три парка параллельно",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "Patriot, NASAMS, радары раннего предупреждения (США)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Leopard 2A7 и PzH 2000 (Германия)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "итальянские корветы и вертолётный док Fincantieri",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Bayraktar TB2 закуплены; собственные программы — через Barzan и турецкую кооперацию.",
      systems: [
        {
          name: "Bayraktar TB2",
          roleRu: "ISR и удар",
          originRu: "Турция, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "кооперация Barzan",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США — крупнейший поставщик; Франция, Великобритания, Германия, Италия и Турция делят остальное.",
      importShareNoteRu: "По SIPRI США лидируют по стоимости (F-15QA и ПВО).",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "F-15QA, Patriot, NASAMS, C-17",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Франция",
          noteRu: "Rafale, вертолёты",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Великобритания",
          noteRu: "Typhoon (совместная эскадрилья с RAF)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Германия",
          noteRu: "Leopard 2A7, PzH 2000",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Три типа истребителей при крошечном личном составе: пилоты и техники — дефицит, логистика тройная",
        "Полуостров с одной сухопутной границей (Саудовская Аравия): блокадный сценарий 2017 года показал уязвимость снабжения",
        "База Аль-Удейд (США) — и защита, и цель: Катар втянут в любую американо-иранскую эскалацию",
        "Зависимость от иностранного обслуживания по всем платформам; Barzan локализация — в начальной фазе",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Катар» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "KWT",
    name: "Kuwait",
    nameRu: "Кувейт",
    region: "Ближний Восток · Аравийский полуостров",
    defenseIndustry: {
      summaryRu: "ВПК отсутствует, кроме ремонта: страна-покупатель с послевоенной (1991) моделью безопасности через США и закупки премиальных систем.",
      selfSufficiencyRu: "Минимальное.",
      keyCompanies: [
        {
          name: "Ремонтные предприятия МО",
          specializationRu: "ремонт американской техники подрядчиками США",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы обеспечиваются американскими контрактами поддержки; парк — F/A-18E/F и Typhoon (поставки), Abrams, Patriot.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "Super Hornet (США) и Typhoon (Италия/консорциум) — двойной парк",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "Patriot PAC-3 (США) — основа противоракетной обороны",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "M1A2 Abrams (США)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "контракты поддержки США; собственных запасов на длительную войну не заявлялось",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые разведывательные системы; ударных БПЛА нет.",
      systems: [
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "США/ЕС, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "RQ-20 / типы",
          roleRu: "тактическая разведка",
          originRu: "США",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США абсолютно доминируют; Италия — Typhoon.",
      importShareNoteRu: "По SIPRI США дают подавляющую долю импорта.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "Super Hornet, Abrams, Patriot, поддержка",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Италия",
          noteRu: "Eurofighter Typhoon",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Память 1990 года: безопасность полностью экстернализирована США — при смене приоритетов Вашингтона гарантий нет",
        "Нефтяная инфраструктура компактна и уязвима для ракет и БПЛА Ирана и его партнёров",
        "Малый личный состав при отсутствии ВПК: мобилизационный потенциал ограничен гражданами страны меньшинства населения",
        "Вода и продовольствие импортируются: блокадная уязвимость Персидского залива",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Кувейт» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "LBN",
    name: "Lebanon",
    nameRu: "Ливан",
    region: "Ближний Восток",
    defenseIndustry: {
      summaryRu: "Государственного ВПК нет: армия снабжается американской помощью лёгким вооружением; параллельно существует ракетно-дроновый арсенал «Хезболлы» иранского снабжения, частично деградировавший в войне 2024 года (по открытым данным и заявлениям сторон).",
      selfSufficiencyRu: "Минимальное: даже патроны для армии — импорт и помощь.",
      keyCompanies: [
        {
          name: "Армейские мастерские",
          specializationRu: "ремонт лёгкой техники",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Армия: лёгкое вооружение США и Европы. «Хезболла»: до войны 2024 года оценивалась в 130–150 тыс. ракет (израильские оценки); после ударов и соглашения о прекращении огня потенциал существенно снижен, точных данных нет.",
      entries: [
        {
          categoryRu: "Армия: авиация",
          noteRu: "лёгкие штурмовики A-29 Super Tucano (США/Бразилия), вертолёты",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Армия: бронетехника",
          noteRu: "M113 и лёгкие машины (помощь США)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Хезболла: ракеты",
          noteRu: "арсенал иранских и сирийских ракет и БПЛА, деградировал в 2024 году (оценки сторон расходятся)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "государственной ПВО нет",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "«Хезболла» применяла иранские БПЛА (Ababil, разведывательные и ударные); армия — малые коммерческие системы.",
      systems: [
        {
          name: "Ababil / Mirsad (Хезболла)",
          roleRu: "ISR и удар",
          originRu: "Иран, поставки (оценки)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА (армия)",
          roleRu: "разведка",
          originRu: "коммерческие/помощь США",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Официальный импорт — почти исключительно помощь США; негосударственный контур — Иран и Сирия исторически.",
      importShareNoteRu: "По SIPRI США — единственный значимый официальный поставщик.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "военная помощь армии: техника, боеприпасы, обучение",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Иран",
          noteRu: "вооружение «Хезболлы» (негосударственный контур)",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Двоевластие в безопасности: государство не контролирует главный военный арсенал страны",
        "Экономический коллапс с 2019 года: армия недофинансирована, зарплаты обесценены",
        "Израильская военная машина в разы превосходит оба ливанских контура, что показали события 2024 года",
        "Инфраструктура (порт Бейрута, аэропорт) уязвима и не восстановлена полностью",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Ливан» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "YEM",
    name: "Yemen",
    nameRu: "Йемен",
    region: "Ближний Восток · Красное море",
    defenseIndustry: {
      summaryRu: "Государственный ВПК разрушен войной. Движение хуситов создало при иранской помощи сборочное производство ракет и БПЛА (Qasef, Samad, «Ваид») из импортных компонентов — модель «импортозамещения под санкциями».",
      selfSufficiencyRu: "Парадоксальное: хуситский контур локализовал сборку ударных систем, но зависит от иранских компонентов, двигателей и систем наведения (по открытым расследованиям ООН и аналитиков).",
      keyCompanies: [
        {
          name: "Производственные ячейки «Ансар Аллах» (Сана, Саада)",
          specializationRu: "сборка БПЛА и ракет из импортных компонентов (по данным панельных отчётов ООН)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Заводы наследия (разрушены)",
          specializationRu: "боеприпасы республиканской армии",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Хуситы: запасы баллистических и крылатых ракет и дальних БПЛА позволили многомесячную кампанию против судоходства в Красном море (2023–2025); правительственные силы снабжаются Саудовской Аравией и ОАЭ.",
      entries: [
        {
          categoryRu: "Ракеты хуситов",
          noteRu: "противокорабельные баллистические и крылатые ракеты иранских технологий (оценки аналитиков)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "БПЛА хуситов",
          noteRu: "Samad-3 и аналоги: дальность до Израиля и кораблей в Красном море",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Правительственные силы",
          noteRu: "ПВО и техника саудовско-эмиратского снабжения, единого учёта нет",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "гуманитарная и военная логистика фрагментирована между сторонами",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Йемен — полигон дальних ударных БПЛА малой стоимости против дорогой ПВО: хуситские Samad стали региональным фактором.",
      systems: [
        {
          name: "Samad-3 / «Ваид-2»",
          roleRu: "дальний ударный БПЛА",
          originRu: "сборка в Йемене, иранские технологии (оценки)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Qasef-2K",
          roleRu: "барражирующий боеприпас",
          originRu: "сборка в Йемене, иранские корни",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Коммерческие квадрокоптеры",
          roleRu: "разведка всех сторон",
          originRu: "коммерческие платформы",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Официальный импорт расколот: Иран — хуситам, Саудовская Аравия и ОАЭ — правительству и союзным формированиям; западные поставки — через Эр-Рияд и Абу-Даби.",
      importShareNoteRu: "SIPRI фиксирует фрагментарно; основные потоки вне коммерческих контрактов.",
      mainSuppliers: [
        {
          supplier: "Иран",
          noteRu: "компоненты ракет и БПЛА для хуситов (по отчётам панели ООН)",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Саудовская Аравия / ОАЭ",
          noteRu: "техника и финансирование правительственных сил",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "США",
          noteRu: "поддержка саудовской ПВО против хуситских ударов",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Страна расколота: минимум три военных контура без единого снабжения и командования",
        "Хуситская модель зависит от контрабанды компонентов через Оман и море — перерезание каналов деградирует арсенал",
        "Гуманитарный кризис: продовольствие и топливо импортируются через порты, уязвимые для блокады и ударов",
        "Красноморская кампания втянула Йемен в прямое противостояние с США и Израилем при отсутствии ПВО против их авиации",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Йемен» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "NGA",
    name: "Nigeria",
    nameRu: "Нигерия",
    region: "Африка · Запад",
    defenseIndustry: {
      summaryRu: "ВПК формируется вокруг DICON: патроны, винтовки, бронемашины (Ezugwu MRAP), БПЛА при китайской и турецкой кооперации. Цель — снизить зависимость от квот и экспортных разрешений Запада.",
      selfSufficiencyRu: "Низкое-среднее по лёгкому вооружению и бронемашинам; авиация и ПВО — импорт.",
      keyCompanies: [
        {
          name: "Defence Industries Corporation of Nigeria (DICON)",
          specializationRu: "патроны, винтовки, боеприпасы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Proforce",
          specializationRu: "бронемашины MRAP для армии и экспорта в регион",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Innoson / частные фирмы",
          specializationRu: "автомобильная техника военного назначения",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы для контртеррористических операций на северо-востоке; расход боеприпасов высок, восполнение — собственным производством и закупками в Китае, Турции, Пакистане.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "A-29 Super Tucano (США/Бразилия), JF-17 (Пакистан/Китай), M-346 (Италия — контракт), вертолёты T129 ATAK (Турция)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "китайские VT-4 и ST1, собственные MRAP",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Артиллерия",
          noteRu: "китайские и сербские системы, РСЗО",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "системы малой дальности; средней — нет",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Wing Loong II и CH-4 (Китай), Bayraktar TB2 (Турция — по открытым данным) для борьбы с боевиками.",
      systems: [
        {
          name: "Wing Loong II / CH-4",
          roleRu: "ISR и удар",
          originRu: "Китай, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Bayraktar TB2",
          roleRu: "ISR и удар",
          originRu: "Турция, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Yabhon / малые типы",
          roleRu: "разведка",
          originRu: "ОАЭ/коммерческие",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Китай — крупнейший поставщик тяжёлой техники; США — точечно (A-29) с политическими условиями; Турция и Италия растут.",
      importShareNoteRu: "По SIPRI Китай лидирует в импорте 2020–2024.",
      mainSuppliers: [
        {
          supplier: "Китай",
          noteRu: "танки, бронетехника, БПЛА, артиллерия",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "США",
          noteRu: "A-29, обучение, ограничения по правам человека",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Турция",
          noteRu: "вертолёты ATAK, TB2",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Италия",
          noteRu: "учебно-боевые M-346 (контракт)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Три театра одновременно: джихадисты северо-востока, бандитизм северо-запада, сепаратизм и пиратство юга",
        "Зависимость от Китая по бронетехнике и БПЛА при западных ограничениях по другим каналам",
        "Нефтяная экономика дельты Нигера: трубопроводы — хроническая цель диверсий и краж",
        "Коррупция закупок исторически подрывала боеспособность (скандалы Dasuki и др.)",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Нигерия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "ETH",
    name: "Ethiopia",
    nameRu: "Эфиопия",
    region: "Африка · Восточная (Рог Африки)",
    defenseIndustry: {
      summaryRu: "ВПК советского образца (METEC, заводы боеприпасов) расширился в войну в Тыграе; с 2022 года — массовые закупки БПЛА у Турции, Ирана и ОАЭ-каналов и локализация дронов (по открытым данным).",
      selfSufficiencyRu: "Среднее по боеприпасам и лёгкой технике; ударные БПЛА и ПВО — импорт при растущей сборке.",
      keyCompanies: [
        {
          name: "Gafat Armament / Homicho Ammunition (METEC-наследие)",
          specializationRu: "боеприпасы и артиллерия",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Bishoftu Automotive",
          specializationRu: "бронетехника и автомобили",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Sky Win / дронные предприятия (по открытым данным)",
          specializationRu: "сборка БПЛА при иностранной кооперации",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Война 2020–2022 годов истощила запасы; восполнение — производством и поставками Турции, Ирана, Китая, России и ОАЭ.",
      entries: [
        {
          categoryRu: "БПЛА",
          noteRu: "TB2 (Турция), Mohajer-6 (Иран), Wing Loong (Китай) — дроны решили исход этапов войны в Тыграе",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Артиллерия",
          noteRu: "советское наследие и китайские РСЗО",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "советские и китайские системы, модернизации",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "Су-27 наследия, закупки ограничены финансами",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Эфиопия — один из крупнейших операторов ударных БПЛА Африки; заявлена собственная сборка и экспортные амбиции.",
      systems: [
        {
          name: "Bayraktar TB2 / Akinci",
          roleRu: "ISR и удар",
          originRu: "Турция, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Mohajer-6",
          roleRu: "ISR и удар",
          originRu: "Иран, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Wing Loong I",
          roleRu: "разведка и удар",
          originRu: "Китай, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Турция и Иран — военные поставщики военного времени; Китай и Россия — наследие и новые ниши.",
      importShareNoteRu: "По SIPRI Турция резко нарастила долю после 2021 года.",
      mainSuppliers: [
        {
          supplier: "Турция",
          noteRu: "TB2/Akinci, бронетехника",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Иран",
          noteRu: "Mohajer-6, боеприпасы (по открытым данным)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Китай",
          noteRu: "РСЗО, БПЛА, бронетехника",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Россия",
          noteRu: "авиация наследия, ремонт",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Нет выхода к морю: зависимость от порта Джибути и отношений с Эритреей и Сомали",
        "Многофронтовые внутренние конфликты (Тыграй, Амхара, Оромия) при истощённой армии",
        "Зависимость от иностранных БПЛА и их боеприпасов: прекращение поставок быстро деградирует главный козырь",
        "Нильский узел (плотина GERD): Египет и Судан — структурные оппоненты по воде",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Эфиопия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "AGO",
    name: "Angola",
    nameRu: "Ангола",
    region: "Африка · Южная",
    defenseIndustry: {
      summaryRu: "ВПК минимальный: ремонт советской техники при российских и белорусских подрядчиках, патронное производство заявлено. Нефтяные доходы тратятся на импорт платформ.",
      selfSufficiencyRu: "Минимальное.",
      keyCompanies: [
        {
          name: "Ремонтные предприятия ФАА",
          specializationRu: "ремонт советской и российской техники",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Планы патронного завода",
          specializationRu: "боеприпасы малого калибра (заявленные проекты)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Крупный по африканским меркам парк советского наследия обновляется российскими поставками (Су-30К из индийского возврата, вертолёты).",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "Су-30К и Су-27 наследия (Россия), МиГ-23 в остатке",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "модернизации советских систем при российской поддержке",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Т-72 и БМП наследия, российские поставки",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "патрульные корабли Испании и Китая",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые разведывательные БПЛА; интерес к турецким системам заявлялся в прессе.",
      systems: [
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "коммерческие/Китай",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Seeker / типы",
          roleRu: "разведка",
          originRu: "ЮАР (исторически)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Россия — доминирующий поставщик; Китай и Испания — флот и ниши.",
      importShareNoteRu: "По SIPRI Россия даёт основную долю.",
      mainSuppliers: [
        {
          supplier: "Россия",
          noteRu: "Су-30К, вертолёты, ПВО",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Китай",
          noteRu: "корабли, бронетехника",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Испания",
          noteRu: "патрульные корабли",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Нефтяная зависимость: цена нефти определяет весь оборонный бюджет",
        "Кабинда: сепаратистский анклав, отделённый территорией ДРК, — постоянная уязвимость",
        "Зависимость от российских подрядчиков по ремонту почти всего парка",
        "Старение советского наследия без собственной промышленной базы замены",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Ангола» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "MAR",
    name: "Morocco",
    nameRu: "Марокко",
    region: "Африка · Северная (Магриб)",
    defenseIndustry: {
      summaryRu: "ВПК создаётся ускоренно: закон 2020 года открыл отрасль, СП с Индией (Tata — бронемашины), Израилем (БПЛА, BlueBird) и планы пороховых и патронных заводов. Стратегия — локализация под гонку с Алжиром.",
      selfSufficiencyRu: "Низкое, но целенаправленно растущее: бронемашины, БПЛА и боеприпасы — первые локализованные линии.",
      keyCompanies: [
        {
          name: "Tata Advanced Systems Morocco",
          specializationRu: "бронемашины WhAP 8x8 (первый завод индийской ВПК за рубежом)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "СП с BlueBird Aero Systems (Израиль)",
          specializationRu: "БПЛА WanderB и ThunderB (локализация заявлена)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Государственные программы боеприпасов",
          specializationRu: "патроны и снаряды (проекты с иностранными партнёрами)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Масштабное перевооружение против Алжира: F-16 Block 70 и Apache (США), HIMARS, Barak MX и TB2/Akinci.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "F-16C/D и Viper (США), модернизация при поддержке США и Израиля",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "Barak MX (Израиль), Sky Dragon 50 (Китай), MICA (Франция) — многослойная система",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Ударные средства",
          noteRu: "HIMARS и ATACMS (одобрено США), РСЗО PULS (Израиль — по открытым данным)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Abrams (США), WhAP собственного СП, китайские VT-4 (по открытым данным)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Марокко — крупный оператор: TB2 и Akinci, Harop и Harpy (Израиль), WanderB собственной локализации; дроны применяются в Западной Сахаре.",
      systems: [
        {
          name: "Bayraktar TB2 / Akinci",
          roleRu: "ISR и удар",
          originRu: "Турция, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Harop / Harpy",
          roleRu: "подавление ПВО и удары",
          originRu: "Израиль, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "WanderB / ThunderB",
          roleRu: "разведка и барражирующие",
          originRu: "Израиль, локализация",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США — первый поставщик; Израиль — второй и растущий после нормализации 2020 года; Франция и Китай — ниши.",
      importShareNoteRu: "По SIPRI США дают основную долю; Израиль резко вырос.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "F-16 Viper, Apache, HIMARS, Abrams",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Израиль",
          noteRu: "ПВО Barak MX, БПЛА, РСЗО PULS",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Турция",
          noteRu: "TB2/Akinci",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Индия",
          noteRu: "бронемашины (СП)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Гонка вооружений с Алжиром: сосед тратит в разы больше при российских поставках — Марокко компенсирует качеством и союзниками",
        "Западная Сахара: фронт ПОЛИСАРИО с алжирской поддержкой, дроновая война малой интенсивности",
        "Зависимость от США и Израиля по ключевым системам: политические условия поставок",
        "ВПК молод: локализация пока сборочная, компоненты импортные",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Марокко» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "TUN",
    name: "Tunisia",
    nameRu: "Тунис",
    region: "Африка · Северная (Магриб)",
    defenseIndustry: {
      summaryRu: "ВПК почти отсутствует: ремонтные арсеналы и лёгкое производство. Армия мала и ориентирована на пограничную безопасность при американской помощи.",
      selfSufficiencyRu: "Минимальное.",
      keyCompanies: [
        {
          name: "Арсеналы и ремонтные базы МО",
          specializationRu: "ремонт американской и европейской техники",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы для пограничных операций против джихадистов; парк — американский и турецкий.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "F-5 наследия, вертолёты UH-60 (США), учебные T-6 (США)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "турецкие Ejder Yalcin и Kirpi, американские MRAP (помощь)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "только ПЗРК и зенитная артиллерия",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "зависимость от помощи США и закупок в ЕС",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Anka (Турция) — контракт по открытым данным; ScanEagle (США) для границы с Ливией.",
      systems: [
        {
          name: "Anka-S",
          roleRu: "разведка",
          originRu: "Турция, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "ScanEagle",
          roleRu: "пограничная разведка",
          originRu: "США, помощь",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США — главный донор; Турция — второй поставщик; Франция исторически.",
      importShareNoteRu: "По SIPRI объёмы малы, США лидируют.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "вертолёты, бронетехника, обучение и помощь",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Турция",
          noteRu: "бронемашины, БПЛА Anka",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Ливийская граница: джихадистские группы и контрабанда при открытой пустынной местности",
        "Экономический кризис ограничивает даже текущее содержание армии",
        "Отсутствие ПВО и современной авиации при региональном росте ракетных арсеналов",
        "Зависимость от американской помощи и её политических условий",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Тунис» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "LBY",
    name: "Libya",
    nameRu: "Ливия",
    region: "Африка · Северная · разделённая страна",
    defenseIndustry: {
      summaryRu: "ВПК разрушен с 2011 года. Два лагеря снабжаются извне: запад (Триполи) — Турция, восток (Хафтар) — ОАЭ, Египет и российские структуры. Производство — только ремонтные базы и сборка дронов формированиями (оценка).",
      selfSufficiencyRu: "Минимальное: все современные системы импортные, страна — полигон чужих БПЛА.",
      keyCompanies: [
        {
          name: "Ремонтные базы сторон",
          specializationRu: "ремонт советской и турецкой техники",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Мастерские формирований",
          specializationRu: "переделка коммерческих дронов и автомобилей",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Единого учёта нет: советские арсеналы наследия разошлись по формированиям; современные поставки фиксируются панелью ООН по эмбарго.",
      entries: [
        {
          categoryRu: "БПЛА востока",
          noteRu: "Wing Loong II (ОАЭ-канал) применялись ЛНА",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "БПЛА запада",
          noteRu: "Bayraktar TB2 (Турция) у сил Триполи",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "Панцирь-С1 (ОАЭ/Россия-канал) на востоке, турецкие системы на западе",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "эмиратские, египетские и иорданские поставки обеим сторонам (по отчётам ООН)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Ливия 2019–2020 годов — первая «война дронов» чужими руками: TB2 против Wing Loong и Панцирей.",
      systems: [
        {
          name: "Bayraktar TB2",
          roleRu: "ISR и удар (запад)",
          originRu: "Турция, поставки правительству",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Wing Loong II",
          roleRu: "ISR и удар (восток)",
          originRu: "Китай, поставки через ОАЭ (по данным панели ООН)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Коммерческие FPV",
          roleRu: "тактика формирований",
          originRu: "коммерческая адаптация",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Эмбарго ООН систематически нарушается всеми покровителями (доклады панели экспертов ООН).",
      importShareNoteRu: "SIPRI не покрывает большинство потоков; источники — отчёты ООН.",
      mainSuppliers: [
        {
          supplier: "Турция",
          noteRu: "TB2, бронетехника, советники (запад)",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "ОАЭ",
          noteRu: "Wing Loong, Панцирь, финансирование (восток)",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Россия",
          noteRu: "наёмные и военные структуры, авиация наследия (восток)",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Египет",
          noteRu: "бронетехника и логистика (восток)",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Раскол страны: два правительства, две армии, два контура снабжения",
        "Нефтяные терминалы — заложники любого обострения и главный рычаг давления сторон",
        "Эмбарго не работает: внешние покровители могут мгновенно изменить баланс поставками",
        "Южная пустыня открыта для джихадистов и контрабанды при отсутствии пограничного контроля",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Ливия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "SDN",
    name: "Sudan",
    nameRu: "Судан",
    region: "Африка · Северо-Восточная · гражданская война",
    defenseIndustry: {
      summaryRu: "ВПК (Military Industry Corporation) был крупнейшим в регионе к югу от Египта: патроны, бронетехника, РСЗО при иранской и китайской помощи. Война армии и RSF с 2023 года разрушила заводы Хартума (по открытым данным).",
      selfSufficiencyRu: "До войны — среднее по боеприпасам и лёгкой технике; сейчас производство частично утрачено, обе стороны зависят от внешних каналов.",
      keyCompanies: [
        {
          name: "Military Industry Corporation (MIC)",
          specializationRu: "боеприпасы, бронетехника, РСЗО (мощности повреждены войной)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Yarmouk Industrial Complex",
          specializationRu: "боеприпасы (пострадал в войне, по открытым данным)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Safat Aviation Complex",
          specializationRu: "сборка и ремонт авиации",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Война 2023–2026 годов ведётся арсеналами наследия и внешними поставками: ОАЭ обвиняется в снабжении RSF (по данным ООН и прессы), армия получает иранские БПЛА и египетскую поддержку.",
      entries: [
        {
          categoryRu: "БПЛА армии",
          noteRu: "Mohajer-6 и Ababil (Иран) применяются с 2023 года",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Артиллерия",
          noteRu: "советское и китайское наследие, РСЗО MIC",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "МиГ-29 и Су-25 наследия, потери от ПВО RSF",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "собственные заводы частично разрушены; импорт растёт",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Дроны стали решающим фактором войны: иранские системы у армии, коммерческие и поставленные извне — у RSF.",
      systems: [
        {
          name: "Mohajer-6 / Ababil-3",
          roleRu: "ISR и удар (армия)",
          originRu: "Иран, поставки",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Коммерческие ударные БПЛА (RSF)",
          roleRu: "удар и разведка",
          originRu: "каналы ОАЭ (по открытым обвинениям и расследованиям)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Исторически Китай, Россия, Иран, Беларусь; в войне — Иран армии, ОАЭ (по обвинениям) RSF, Египет — политическая и логистическая поддержка армии.",
      importShareNoteRu: "SIPRI по военному периоду неполна; источники — ООН и расследовательская пресса.",
      mainSuppliers: [
        {
          supplier: "Иран",
          noteRu: "БПЛА и боеприпасы армии",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Китай",
          noteRu: "артиллерия и техника (исторически)",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Россия",
          noteRu: "авиация наследия, оба лагеря контактируют с российскими структурами",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "ОАЭ",
          noteRu: "обвинения в снабжении RSF (Абу-Даби отрицает)",
          provenance: {
            source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; доклады панели экспертов ООН; расследовательская пресса",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Гражданская война разрушила ВПК и склады: восстановление займёт годы при любом исходе",
        "Красноморское побережье и Порт-Судан — объект конкуренции России, Ирана и монархий Залива",
        "Зависимость обеих сторон от внешних поставок делает войну управляемой извне",
        "Нильская и нефтяная инфраструктура повреждены, экспорт нефти Южного Судана парализован эпизодами войны",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Судан» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "KEN",
    name: "Kenya",
    nameRu: "Кения",
    region: "Африка · Восточная",
    defenseIndustry: {
      summaryRu: "ВПК зарождается: патронный завод в Элдорете, верфь Kenya Shipyards, бронемашины при турецкой и южноафриканской кооперации. Армия экспедиционная (Сомали) при американской поддержке.",
      selfSufficiencyRu: "Низкое: патроны — единственное массовое собственное производство.",
      keyCompanies: [
        {
          name: "National Ordnance Factory (Eldoret)",
          specializationRu: "патроны малого калибра",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Kenya Shipyards Limited",
          specializationRu: "строительство и ремонт патрульных кораблей",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "MOD workshops",
          specializationRu: "ремонт техники",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы для операций ATMIS в Сомали; закупки — вертолёты и MRAP у США, бронетехника у Турции и Китая.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "F-5 наследия, вертолёты MD530F и UH-1 (США), Ми-171",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "китайские и турецкие MRAP, южноафриканские машины",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Артиллерия",
          noteRu: "сербские САУ Nora (по открытым данным)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "только малый калибр и ПЗРК",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые разведывательные БПЛА США и коммерческие системы; ударных нет.",
      systems: [
        {
          name: "RQ-11 / ScanEagle (типы)",
          roleRu: "разведка",
          originRu: "США, помощь",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Коммерческие БПЛА",
          roleRu: "разведка в Сомали и на границе",
          originRu: "коммерческие платформы",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США — главный партнёр; Турция, Китай, Сербия — по нишам.",
      importShareNoteRu: "По SIPRI США и Китай заметнее прочих.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "вертолёты, MRAP, обучение",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Турция",
          noteRu: "бронемашины Hizir (контракт)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Китай",
          noteRu: "бронетехника и патрульные средства",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "«Аш-Шабаб» в Сомали и на границе: теракты и рейды при растянутой логистике ATMIS",
        "Отсутствие современной авиации и ПВО при региональных арсеналах Эфиопии и др.",
        "Зависимость от американской помощи и экспортных разрешений по ключевой технике",
        "Порт Момбаса и коридор LAPSSET — экономические артерии под террористической угрозой",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Кения» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "TZA",
    name: "Tanzania",
    nameRu: "Танзания",
    region: "Африка · Восточная",
    defenseIndustry: {
      summaryRu: "ВПК минимальный: патронное производство при китайской помощи и ремонтные базы. Армия советского-китайского наследия, модернизация минимальна.",
      selfSufficiencyRu: "Минимальное.",
      keyCompanies: [
        {
          name: "Mzinga Corporation (армейский холдинг)",
          specializationRu: "лёгкое производство и ремонт",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Патронное производство (китайская кооперация)",
          specializationRu: "боеприпасы малого калибра (по открытым данным)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Наследие 1970–80-х: китайские танки и истребители F-7, советская артиллерия; боеспособность ограничена возрастом техники.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "F-7 и K-8 (Китай)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Type 59 и БТР наследия (Китай)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Артиллерия",
          noteRu: "китайские и советские системы",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "китайские патрульные катера и десантные корабли",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые коммерческие БПЛА; военных программ нет.",
      systems: [
        {
          name: "Малые коммерческие БПЛА",
          roleRu: "разведка и охрана парков/границ",
          originRu: "коммерческие платформы",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Китай — почти монопольный поставщик наследия и обновлений; объёмы малы.",
      importShareNoteRu: "По SIPRI Китай доминирует при малых объёмах.",
      mainSuppliers: [
        {
          supplier: "Китай",
          noteRu: "авиация, бронетехника, катера",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Германия/ЕС",
          noteRu: "патрульные средства (исторически)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Северный Мозамбик: джихадистское insurgency в Кабу-Делгаду у границы и газовых проектов",
        "Техника музейного возраста при отсутствии бюджета модернизации",
        "Зависимость от Китая по запчастям всего парка",
        "Протяжённое побережье Индийского океана при символическом флоте",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Танзания» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "MOZ",
    name: "Mozambique",
    nameRu: "Мозамбик",
    region: "Африка · Южная",
    defenseIndustry: {
      summaryRu: "ВПК отсутствует: армия зависит от иностранной помощи (Руанда, САДК, ЕС) в войне с джихадистами Кабу-Делгаду; техника — советское наследие и дары.",
      selfSufficiencyRu: "Минимальное.",
      keyCompanies: [
        {
          name: "Армейские мастерские Мапуту",
          specializationRu: "ремонт лёгкой техники",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы для противоповстанческих операций; поставки — Китай, Россия (исторически), ЮАР и партнёры по миссии.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "МиГ-21 наследия (боеспособность сомнительна), вертолёты",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "советское наследие и южноафриканские MRAP (помощь)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "патрульные катера Франции и Испании",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "зависимость от доноров миссии в Кабу-Делгаду",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Разведывательные БПЛА партнёров по миссии (Руанда, ЕС) и коммерческие системы.",
      systems: [
        {
          name: "Коммерческие БПЛА",
          roleRu: "разведка в Кабу-Делгаду",
          originRu: "коммерческие платформы и помощь партнёров",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Китай и Россия — наследие; оперативная поддержка — Руанда и миссия САДК/ЕС.",
      importShareNoteRu: "Коммерческий импорт минимален (SIPRI).",
      mainSuppliers: [
        {
          supplier: "Китай",
          noteRu: "бронетехника и катера (исторически)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Руанда / САДК",
          noteRu: "войска и техника миссии в Кабу-Делгаду",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Франция",
          noteRu: "патрульные катера",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Газовые мегапроекты Кабу-Делгаду заморожены джихадистами: безопасность обеспечивают иностранные войска",
        "Армия не способна самостоятельно удерживать север страны",
        "Зависимость от доноров по боеприпасам и логистике миссий",
        "Циклоны и наводнения регулярно разрушают инфраструктуру юга и центра",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Мозамбик» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "ARG",
    name: "Argentina",
    nameRu: "Аргентина",
    region: "Южная Америка",
    defenseIndustry: {
      summaryRu: "ВПК исторически сильный, но хронически недофинансирован: FAdeA (авиация, Pampa), INVAP (радары и спутники), Fabricaciones Militares (боеприпасы), верфь Tandanor. С 2024 года — ставка на США и Данию (F-16) при жёст выше экономии.",
      selfSufficiencyRu: "Среднее по радарам, лёгкой авиации и боеприпасам; истребители и подлодки — импорт, флот деградировал.",
      keyCompanies: [
        {
          name: "FAdeA",
          specializationRu: "учебно-боевые IA-63 Pampa, обслуживание авиации",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "INVAP",
          specializationRu: "радары ПВО и спутники (экспорт технологий)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Fabricaciones Militares (FANAZUL и др.)",
          specializationRu: "боеприпасы, пороха",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Tandanor / Río Santiago",
          specializationRu: "ремонт кораблей и подлодок",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы малы после десятилетий недофинансирования; закупка 24 датских F-16 (США одобрили) — крупнейшая программа за десятилетия.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "F-16 (Дания, б/у) на замену выведенным Mirage; A-4AR в остатке",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "подлодки небоеспособны после гибели «Сан-Хуан» (2017); эсминцы MEKO стареют",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Артиллерия",
          noteRu: "собственные TAM и боеприпасы, запасы ограничены",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "RBS-70 NG (Швеция), радары INVAP собственной разработки",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Собственные разработки (Aukan, Vigía) малыми сериями; армия использует коммерческие и израильские малые системы.",
      systems: [
        {
          name: "Aukan / Vigía (FAdeA/INVAP)",
          roleRu: "разведка",
          originRu: "Аргентина, опытные серии",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "тактическая разведка",
          originRu: "Израиль/коммерческие",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Дания/США (F-16), Франция (патрульные корабли OPV), Израиль (модернизация TAM 2C), США (вертолёты и транспорт).",
      importShareNoteRu: "По SIPRI Франция и США лидируют в последние годы.",
      mainSuppliers: [
        {
          supplier: "Дания / США",
          noteRu: "F-16AM/BM и вооружение",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Франция",
          noteRu: "морские патрульные корабли L'Adroit-класса",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Израиль",
          noteRu: "модернизация танков TAM 2C, электроника",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Подводный флот фактически утрачен: в Южной Атлантике нет подводного компонента",
        "Фолклендский вопрос: британский гарнизон технологически превосходит возможности Аргентины на поколения",
        "Бюджетные кризисы циклично обнуляют программы перевооружения",
        "Зависимость от США по вооружению F-16 при исторической британской чувствительности к аргентинским закупкам в Европе",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Аргентина» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "CHL",
    name: "Chile",
    nameRu: "Чили",
    region: "Южная Америка",
    defenseIndustry: {
      summaryRu: "Самый организованный ВПК Южной Америки после Бразилии: FAMAE (бронетехника и боеприпасы при кооперации с Израилем), ENAER (авиация), ASMAR (военное кораблестроение), DTS (электроника).",
      selfSufficiencyRu: "Среднее: боеприпасы, лёгкая бронетехника, ремонт и модернизация собственные; платформы — США и Европа.",
      keyCompanies: [
        {
          name: "FAMAE",
          specializationRu: "боеприпасы, бронетехника, РСЗО (с IMI исторически)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "ENAER",
          specializationRu: "сборка и обслуживание авиации, Pillán",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "ASMAR",
          specializationRu: "фрегаты: ремонт и строительство, ледокол",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "DTS / SISDEF",
          specializationRu: "электроника и C2",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Системное преимущество региона: запасы и обслуживание финансируются стабильно (исторически — медный закон, затем реформа финансирования).",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "F-16 (США/Нидерланды) — сильнейшие ВВС региона наряду с Бразилией",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Leopard 2A4 (Германия), Marder",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "фрегаты британские и голландские (б/у), подлодки Scorpene (Франция)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "NASAMS (Норвегия/США), ПЗРК",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Hermes 900 (Израиль) у ВВС, малые системы у армии; собственные разработки ENAER малы.",
      systems: [
        {
          name: "Hermes 900",
          roleRu: "разведка",
          originRu: "Израиль, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "SpyLite / малые типы",
          roleRu: "тактическая разведка",
          originRu: "Израиль, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Mantarraya (ВМФ, исторически)",
          roleRu: "разведка",
          originRu: "Чили, опытные",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США и Германия — главные поставщики; Израиль — БПЛА и электроника; Франция — подлодки.",
      importShareNoteRu: "По SIPRI США лидируют по стоимости.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "F-16, боеприпасы, вертолёты",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Германия",
          noteRu: "Leopard 2, БМП Marder",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Израиль",
          noteRu: "БПЛА Hermes, модернизация",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Протяжённая узкая территория: логистика север—юг зависит от одной оси и морских путей",
        "Пустынный север: водоснабжение гарнизонов и медные рудники — критическая инфраструктура",
        "Зависимость от американских боеприпасов для F-16 и NASAMS",
        "Сейсмическая активность и цунами: флот и базы в зоне регулярных ударов стихии",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Чили» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "COL",
    name: "Colombia",
    nameRu: "Колумбия",
    region: "Южная Америка",
    defenseIndustry: {
      summaryRu: "ВПК противоповстанческого профиля: Indumil (винтовки Galil собственной сборки, боеприпасы, бомбы), COTECMAR (речные и морские патрульные корабли — экспорт в регион), CIAC (авиаремонт и БПЛА).",
      selfSufficiencyRu: "Среднее по лёгкому вооружению и речным кораблям; боевая авиация — Израиль/США, замена Kfir — открытый конкурс.",
      keyCompanies: [
        {
          name: "Indumil",
          specializationRu: "винтовки Galil ACE, боеприпасы, авиабомбы",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "COTECMAR",
          specializationRu: "патрульные корабли OPV и речные канонерки",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "CIAC",
          specializationRu: "ремонт авиации, БПЛА Atlante (с Испанией исторически)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы для операций против наркокартелей и ELN; расход управляемых бомб по лагерям повстанцев — регулярная практика ВВС.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "Kfir (Израиль) на исходе ресурса; конкурс замены (Rafale/Gripen/F-16) политически нестабилен",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Вертолёты",
          noteRu: "крупнейший парк региона: Black Hawk (США), Ми-17 (обслуживание под вопросом)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "подлодки Type 209 (Германия), фрегаты Almirante Padilla (модернизация)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "Indumil покрывает лёгкие калибры; авиабомбы и ракеты — импорт",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Hermes 450/900 (Израиль) и ScanEagle (США) — основа разведки в джунглях; повстанцы применяют коммерческие дроны со сбросами.",
      systems: [
        {
          name: "Hermes 450 / 900",
          roleRu: "разведка",
          originRu: "Израиль, закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "ScanEagle",
          roleRu: "разведка",
          originRu: "США, помощь и закупка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Коммерческие БПЛА (противник)",
          roleRu: "сбросы боеприпасов группировками",
          originRu: "коммерческая адаптация",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Израиль (Kfir, БПЛА), США (вертолёты, помощь), Германия (подлодки), Испания (корабли).",
      importShareNoteRu: "По SIPRI США и Израиль делят лидерство.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "вертолёты, боеприпасы, помощь Plan Colombia-наследие",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Израиль",
          noteRu: "Kfir и их поддержка, Hermes",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Германия",
          noteRu: "подлодки, модернизация фрегатов",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Kfir на исходе: без решения о замене ВВС потеряют боевую авиацию в этом десятилетии",
        "Война с наркоэкономикой: противник финансируется лучше отдельных родов войск",
        "Ми-17: обслуживание российского парка осложнено санкционной эпохой",
        "Джунгли и две океанские береговые линии при ограниченных средствах контроля",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Колумбия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "PER",
    name: "Peru",
    nameRu: "Перу",
    region: "Южная Америка",
    defenseIndustry: {
      summaryRu: "ВПК ремонтно-сборочный: SIMA (военно-морское строительство — LPD и патрульные корабли), SEMAN (авиаремонт), FAME (боеприпасы при корейской кооперации). Крупная сделка с Hyundai Rotem и STX меняет сухопутный парк.",
      selfSufficiencyRu: "Низкое-среднее: корабли и ремонт собственные; танки, авиация и ПВО — импорт, теперь с корейской локализацией.",
      keyCompanies: [
        {
          name: "SIMA Perú",
          specializationRu: "десантный корабль Pisco, патрульные суда, ремонт подлодок",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "SEMAN",
          specializationRu: "ремонт авиации, сборка KT-1P (с Кореей)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "FAME",
          specializationRu: "боеприпасы (СП с корейским капиталом заявлено)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Советско-российское наследие (Т-55, МиГ-29, Су-25) сочетается с корейским перевооружением: K2 и бронемашины Hyundai (контракт 2024 года по открытым данным).",
      entries: [
        {
          categoryRu: "Бронетехника",
          noteRu: "K2 Black Panther и K808 (Корея, контракт) на замену Т-55",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "МиГ-29 и Су-25 наследия; KT-1P собственной сборки; конкурс истребителей (F-16/Gripen/Rafale в прессе)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "подлодки Type 209 (Германия), LPD собственной постройки",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "советское наследие и ПЗРК; средней дальности нет",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые разведывательные системы и морское патрулирование; ударных БПЛА нет.",
      systems: [
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "Израиль/коммерческие",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Condor / опытные",
          roleRu: "разведка",
          originRu: "Перу, разработка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Республика Корея выходит в лидеры; Россия — наследие; Германия и Италия — флот и вертолёты.",
      importShareNoteRu: "По SIPRI Корея резко выросла после контракта 2024 года.",
      mainSuppliers: [
        {
          supplier: "Республика Корея",
          noteRu: "танки K2, БТР, самолёты KT-1",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Россия",
          noteRu: "вертолёты Ми-171, наследие авиации",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Германия",
          noteRu: "подлодки, модернизация",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Двойной парк (российский и корейский) — переходный период дорогой логистики",
        "МиГ-29/Су-25: запчасти российского контура в санкционную эпоху",
        "Наркотрафик в долине VRAEM: армия ведёт постоянную внутреннюю войну",
        "Тихоокеанское побережье и Анды: сейсмика и логистика высокогорья ограничивают манёвр",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Перу» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "VEN",
    name: "Venezuela",
    nameRu: "Венесуэла",
    region: "Южная Америка",
    defenseIndustry: {
      summaryRu: "ВПК деградировал с экономикой: CAVIM (боеприпасы) и авиаремонт при иранской помощи по БПЛА. Расцвет закупок 2000-х (Россия) сменился каннибализацией парка.",
      selfSufficiencyRu: "Низкое и падающее: даже обслуживание Су-30 зависит от России и Ирана.",
      keyCompanies: [
        {
          name: "CAVIM",
          specializationRu: "боеприпасы и стрелковое оружие",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "EANSA / авиаремонтные предприятия",
          specializationRu: "ремонт при иранской кооперации (БПЛА)",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "DIANCA",
          specializationRu: "ремонт кораблей",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Формально крупный российский арсенал 2006–2013 годов (Су-30МК2, Т-72, С-300ВМ, «Бук») при неизвестной боеготовности: оценки боеспособной доли парка низкие.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "Су-30МК2 (Россия) — боеготовность оценивается низко",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "С-300ВМ «Антей-2500», Бук-М2, Печора-2М (Россия) — состояние неясно",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Т-72Б1, БМП-3, РСЗО «Смерч» и «Град»",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "CAVIM и иранские каналы; запасы не аудируются публично",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Иранские Mohajer-6 собираются/применяются при иранской помощи (завод заявлен сторонами); дроны использовались против Колумбии риторически и для разведки фактически.",
      systems: [
        {
          name: "Mohajer-6",
          roleRu: "ISR и удар",
          originRu: "Иран, поставки и сборка (по заявлениям сторон)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Antonio José de Sucre (ANSU)",
          roleRu: "разведывательные БПЛА иранских корней",
          originRu: "Венесуэла/Иран, сборка",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "Китай/коммерческие",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Россия — исторический монополист тяжёлых систем; Иран — БПЛА и поддержка; Китай — радары и лёгкая техника.",
      importShareNoteRu: "По SIPRI Россия дала подавляющую долю поставок 2000–2010-х; новые контракты редки.",
      mainSuppliers: [
        {
          supplier: "Россия",
          noteRu: "Су-30, ПВО, танки (наследие)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Иран",
          noteRu: "БПЛА, ремонт, боеприпасы",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Китай",
          noteRu: "радары JYL-1, бронемашины, K-8",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Боеготовность парка неизвестна и вероятно низка: годы без запчастей и финансирования",
        "Зависимость от России и Ирана одновременно при санкциях США на обоих поставщиков",
        "Эссекибо: спор с Гайаной при её американской поддержке — риск конфликта без подготовленной армии",
        "Экономика не способна финансировать даже текущее содержание арсенала наследия",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Венесуэла» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "CUB",
    name: "Cuba",
    nameRu: "Куба",
    region: "Карибский бассейн",
    defenseIndustry: {
      summaryRu: "ВПК советского образца (UIM): ремонт и «франкенштейн»-модернизации советской техники (БТР с танковыми башнями, ЗРК на шасси Т-55), патронное производство. Инновации от бедности при тотальном эмбарго США.",
      selfSufficiencyRu: "Среднее по ремонту и импровизированным системам; новых платформ нет десятилетиями.",
      keyCompanies: [
        {
          name: "Unión de Industria Militar (UIM)",
          specializationRu: "ремонт и модернизация советской техники",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Завод «Юрий Гагарин» и др. предприятия UIM",
          specializationRu: "бронетехника и артиллерия наследия",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Огромный по островным меркам парк 1960–80-х годов с низкой боеготовностью; ставка доктрины — «война всего народа» и партизанское сопротивление.",
      entries: [
        {
          categoryRu: "Бронетехника",
          noteRu: "тысячи единиц Т-55/Т-62 и БТР наследия, доля боеготовых неизвестна",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "советские С-75/С-125 и «Куб» с локальными модернизациями",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Авиация",
          noteRu: "МиГ-21/23 в остатке, боеспособность символическая",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "советские запасы с истёкшими сроками значительной части",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые коммерческие и самодельные системы; военных программ БПЛА не известно.",
      systems: [
        {
          name: "Малые коммерческие БПЛА",
          roleRu: "разведка",
          originRu: "коммерческие платформы",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Эмбарго США и распад СССР обнулили импорт; точечные связи с Россией, Китаем и Беларусью (модернизации, визиты, заявления о сотрудничестве).",
      importShareNoteRu: "SIPRI фиксирует почти нулевой официальный импорт десятилетиями.",
      mainSuppliers: [
        {
          supplier: "Россия",
          noteRu: "модернизационные контакты и военное сотрудничество (по заявлениям)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Беларусь",
          noteRu: "ремонтная кооперация (по открытым данным)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Китай",
          noteRu: "электроника и автомобили двойного назначения",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Техника старше личного состава на два поколения: против современных ВВС и флота остров беззащитен в конвенциональной фазе",
        "Топливный кризис: даже учения ограничены горючим",
        "Эмбарго перекрывает легальные запчасти: каннибализация — основной источник ремонта",
        "Доктрина партизанской войны честна: государство не рассчитывает выиграть конвенциональную войну у США",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Куба» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "ECU",
    name: "Ecuador",
    nameRu: "Эквадор",
    region: "Южная Америка",
    defenseIndustry: {
      summaryRu: "ВПК минимальный: авиаремонт DIAF, патронное производство Santa Bárbara, верфь ASTINAVE (патрульные корабли). С 2024 года — «внутренний вооружённый конфликт» с картелями как главный приоритет.",
      selfSufficiencyRu: "Минимальное.",
      keyCompanies: [
        {
          name: "ASTINAVE",
          specializationRu: "патрульные корабли и ремонт флота",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "DIAF",
          specializationRu: "ремонт авиации",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Fábrica de Municiones Santa Bárbara",
          specializationRu: "патроны",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Запасы для внутренней войны с наркобандами; парк — смешанный западный и китайский, боевая авиация сократилась до Super Tucano и остатков.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "A-29 Super Tucano (Бразилия), вертолёты H145 (Германия) и Ми-171 наследия",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "китайские и корейские патрульные корабли, подлодки Type 209 (Германия, модернизация в Чили)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "бразильские и французские машины наследия, китайские поставки",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Боеприпасы",
          noteRu: "зависимость от импорта; скандал с передачей советской техники США для Украины (2024) показал состояние запасов",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые разведывательные БПЛА для борьбы с картелями; Hermes (Израиль) исторически у ВМС.",
      systems: [
        {
          name: "Hermes 450 (ВМФ)",
          roleRu: "морская разведка",
          originRu: "Израиль, закупка (исторически)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "коммерческие/США",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "США наращивают помощь в «войне с картелями»; Бразилия, Германия, Китай — платформы наследия.",
      importShareNoteRu: "По SIPRI объёмы малы; США лидируют в последние годы.",
      mainSuppliers: [
        {
          supplier: "США",
          noteRu: "помощь, вертолёты (заявлено), обучение",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Бразилия",
          noteRu: "Super Tucano",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Китай",
          noteRu: "радары (скандально известные YLC), бронетехника",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Картели контролируют порты и тюрьмы: армия ведёт внутреннюю войну без тяжёлого противника, но и без полного контроля территории",
        "Китайские радары ПВО оказались небоеспособны (контрактный скандал) — ПВО страны фактически слепа",
        "Зависимость от американской помощи при волатильной внутренней политике",
        "Галапагосы и морские пути наркотрафика при слабом флоте",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Эквадор» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "BOL",
    name: "Bolivia",
    nameRu: "Боливия",
    region: "Южная Америка · без выхода к морю",
    defenseIndustry: {
      summaryRu: "ВПК отсутствует, кроме патронного производства и ремонтных мастерских; закупки — политические: китайские и российские системы при сменяющихся курсах правительств.",
      selfSufficiencyRu: "Минимальное.",
      keyCompanies: [
        {
          name: "Fábrica Boliviana de Munición",
          specializationRu: "патроны",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Армейские мастерские",
          specializationRu: "ремонт лёгкой техники",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Лёгкий парк для внутренней безопасности и символического сдерживания Чили; боевой авиации фактически нет (K-8 — учебно-боевые).",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "K-8 (Китай), Pilatus и T-33 наследия",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "китайские бронеавтомобили и советские машины",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "только зенитная артиллерия и ПЗРК",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Радары",
          noteRu: "китайская система контроля воздуха (контракт с CEIEC)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Иранские и китайские малые системы заявлялись; иранское военное сотрудничество (2023) вызвало региональный резонанс.",
      systems: [
        {
          name: "Малые БПЛА",
          roleRu: "разведка границ и наркотрафика",
          originRu: "Китай/Иран (по заявлениям)",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Коммерческие БПЛА",
          roleRu: "мониторинг",
          originRu: "коммерческие платформы",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Китай — главный поставщик техники; Россия — вертолёты исторически; Иран — политический канал БПЛА.",
      importShareNoteRu: "По SIPRI Китай доминирует при малых объёмах.",
      mainSuppliers: [
        {
          supplier: "Китай",
          noteRu: "K-8, бронетехника, радары",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Россия",
          noteRu: "вертолёты Ми-171 (исторически)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Иран",
          noteRu: "соглашение об обороне 2023 года, БПЛА (по заявлениям)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Нет выхода к морю и боевой авиации: суверенитет неба делегирован географии и соседям",
        "Высокогорье и джунгли одновременно: логистика между гарнизонами крайне слаба",
        "Наркотрафик Чапаре: вооружённые силы вовлечены во внутренний конфликт интересов",
        "Политическая поляризация армии (кризис 2024 года с выступлением генерала Суньиги) — институциональная хрупкость",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Боливия» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "PRY",
    name: "Paraguay",
    nameRu: "Парагвай",
    region: "Южная Америка · без выхода к морю",
    defenseIndustry: {
      summaryRu: "ВПК отсутствует: DIMABEL производит патроны и взрывчатку гражданского профиля. Армия снабжается Бразилией, Тайванем и США малыми партиями.",
      selfSufficiencyRu: "Минимальное.",
      keyCompanies: [
        {
          name: "DIMABEL",
          specializationRu: "патроны и взрывчатые вещества",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Арсенал флота (Asunción)",
          specializationRu: "ремонт речных судов",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Символический парк: бразильские EE-9/EE-11 наследия, лёгкая авиация, речная флотилия по рекам Парана и Парагвай.",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "AT-27 Tucano (Бразилия), транспортных борта при поддержке Тайваня",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "EE-9 Cascavel и EE-11 (Бразилия, наследие)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "речные патрульные корабли бразильской и собственной постройки",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "отсутствует, кроме зенитной артиллерии",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые коммерческие БПЛА для границы Тройной границы (наркотрафик).",
      systems: [
        {
          name: "Малые коммерческие БПЛА",
          roleRu: "пограничный контроль",
          originRu: "коммерческие платформы",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Бразилия — естественный поставщик; Тайвань — дары и кредиты (дипломатический союзник); США — помощь.",
      importShareNoteRu: "Коммерческий импорт минимален (SIPRI).",
      mainSuppliers: [
        {
          supplier: "Бразилия",
          noteRu: "бронетехника, авиация, обучение",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Тайвань",
          noteRu: "транспортная авиация и помощь (дары)",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "США",
          noteRu: "снаряжение и обучение",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Тройная граница (Бразилия—Аргентина—Парагвай): наркотрафик, контрабанда и финансирование терроризма вне контроля армии",
        "Без выхода к морю: вся торговля — по рекам через соседей",
        "Армия не способна к конвенциональной обороне ни против одного соседа — ставка на дипломатию",
        "Гидроэнергетика Итайпу и Ясирета: зависимость и рычаг соседей одновременно",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Парагвай» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
  {
    iso3: "URY",
    name: "Uruguay",
    nameRu: "Уругвай",
    region: "Южная Америка",
    defenseIndustry: {
      summaryRu: "ВПК отсутствует, кроме ремонтных служб и малых верфей. Армия миротворческого профиля (контингенты ООН — источник валюты и опыта) при символическом тяжёлом парке.",
      selfSufficiencyRu: "Минимальное.",
      keyCompanies: [
        {
          name: "Servicio de Material y Armamento",
          specializationRu: "ремонт и хранение",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
        {
          name: "Tsakos / частные верфи",
          specializationRu: "ремонт патрульных кораблей",
          provenance: {
            source: "Открытые данные компаний и отраслевой прессы",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Top 100 / Arms Transfers; официальные сайты компаний и ведомств",
        year: 2025,
        estimated: false,
      },
    },
    stockpilesAndProduction: {
      summaryRu: "Парк наследия: чешские и советские машины, лёгкая авиация; закупки — патрульные корабли (Испания) и Super Tucano (Бразилия, заявлено).",
      entries: [
        {
          categoryRu: "Авиация",
          noteRu: "A-37 наследия, Super Tucano (контракт по открытым данным), транспортные C130 (США, дар)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Бронетехника",
          noteRu: "Т-55 (советский дар исторически), чешские БМП, бразильские машины",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "Флот",
          noteRu: "патрульные корабли Cardama (Испания, контракт со скандалами по срокам)",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
        {
          categoryRu: "ПВО",
          noteRu: "только зенитная артиллерия и ПЗРК",
          provenance: {
            source: "Открытые оценки (IISS / RUSI / профильная пресса)",
            year: 2025,
            estimated: true,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; отраслевые оценки и открытые данные",
        year: 2025,
        estimated: true,
      },
    },
    uav: {
      summaryRu: "Малые разведывательные БПЛА для миротворческих контингентов и границы.",
      systems: [
        {
          name: "Малые БПЛА",
          roleRu: "разведка",
          originRu: "коммерческие/Израиль",
          provenance: {
            source: "Открытые данные о поставках и операторах систем",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "IISS Military Balance 2025; релизы ведомств и производителей",
        year: 2025,
        estimated: true,
      },
    },
    importDependence: {
      summaryRu: "Бразилия, США и Испания — поставщики точечных программ; объёмы минимальны.",
      importShareNoteRu: "SIPRI фиксирует единичные сделки.",
      mainSuppliers: [
        {
          supplier: "Бразилия",
          noteRu: "Super Tucano, бронетехника",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "Испания",
          noteRu: "патрульные корабли",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
        {
          supplier: "США",
          noteRu: "транспортные самолёты (дары), обучение",
          provenance: {
            source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
            year: 2025,
            estimated: false,
          },
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database (TIV, поставки 2020–2024)",
        year: 2025,
        estimated: false,
      },
    },
    vulnerabilities: {
      itemsRu: [
        "Армия миротворческая, а не боевая: тяжёлых систем и запасов на войну нет",
        "Зависимость от Бразилии и Аргентины по всей логистике региона",
        "Морская зона (поисково-спасательная ответственность) велика при малом флоте",
        "Демография и бюджет: сокращение ВС обсуждается постоянно",
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2025,
        estimated: true,
      },
    },
    overallNoteRu: "Профиль «Уругвай» составлен по открытым источникам (SIPRI, IISS, официальные релизы, профильная пресса). Факты поставок и существования программ помечены estimated: false; запасы, боеготовность и производственные темпы — оценочные величины (estimated: true).",
  },
];

/** Профиль по коду iso3 или undefined. */
export function profile60ByIso3(iso3: string): CountryProfile60 | undefined {
  return COUNTRY_PROFILES_60.find((p) => p.iso3 === iso3);
}

/** Все коды iso3 расширенных профилей. */
export function profile60Iso3List(): readonly string[] {
  return COUNTRY_PROFILES_60.map((p) => p.iso3);
}

/** Профили, где секция запасов полностью оценочная (все записи estimated). */
export function profilesWithFullyEstimatedStocks(): readonly CountryProfile60[] {
  return COUNTRY_PROFILES_60.filter((p) =>
    p.stockpilesAndProduction.entries.every((e) => e.provenance.estimated),
  );
}

/** Суммарное число записей-предприятий ВПК по всем профилям. */
export function profile60CompanyCount(): number {
  return COUNTRY_PROFILES_60.reduce((acc, p) => acc + p.defenseIndustry.keyCompanies.length, 0);
}
