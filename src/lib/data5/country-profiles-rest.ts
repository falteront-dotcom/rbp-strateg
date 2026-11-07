/**
 * Полные профили оставшихся стран реестра («РБП-Стратег 3.0», волна 7 — data5).
 *
 * Контекст покрытия реестра (196 ключей файла src/lib/geo/country-names-ru.ts,
 * включая технический алиас PHI для Филиппин наряду с основным кодом PHL):
 * - топ-30 волны bp3 (src/lib/bp3/data/top30-uav-munitions.ts) — 30 стран;
 * - топ-30 волны warfare3 (src/lib/warfare3/data/top30-sustainability.ts) —
 *   30 стран, пересечение с bp3 — 26, поэтому вместе они покрывают 34 страны;
 * - профили волны data3 (src/lib/data3/country-profiles-60.ts) — ещё 60 стран;
 * - настоящий файл — все остальные 102 ключа реестра, включая алиас PHI.
 * Итого объединение 34 + 60 + 102 = 196 ключей: реестр покрыт полностью.
 *
 * Состав профиля каждой страны:
 * - регион и подрегион;
 * - военный бюджет: оценка в млрд долл. США, год данных, доля ВВП, тренд;
 * - личный состав: активный состав, резерв, военизированные формирования;
 * - структура видов вооружённых сил (сухопутные войска, ВМС, ВВС, прочие);
 * - ключевые вооружения по родам войск с указанием происхождения;
 * - оборонная промышленность: наличие, самообеспечение, предприятия;
 * - зависимость от импорта вооружений и главные поставщики;
 * - союзы и коалиции;
 * - ключевые уязвимости (2–4) с оценкой тяжести;
 * - программы модернизации;
 * - провенанс каждой секции: источник, год данных, флаг estimated.
 *
 * Методологическая честность:
 * - бюджеты и численность — оценки по открытым источникам винтажа проекта
 *   (SIPRI Military Expenditure Database, IISS Military Balance,
 *   CIA World Factbook, официальные бюджеты), округлены и помечены
 *   estimated: true, если страна не публикует точных данных;
 * - для закрытых стран (Афганистан при талибах, Туркменистан, Сомали,
 *   Южный Судан, Палестина) точные числа не выдумываются: поле значения —
 *   null, а в заметке дан диапазон или качественная оценка
 *   с пониженным доверием;
 * - микрогосударства без армии (Андорра, Лихтенштейн, Монако, Сан-Марино,
 *   Исландия, Коста-Рика, Панама и др.) получают честный профиль
 *   «вооружённых сил нет» с описанием сил безопасности (полиция,
 *   береговая охрана, жандармерия), а не выдуманные числа;
 * - уязвимости — аналитическая оценка проекта по открытым источникам,
 *   а не официальные данные стран.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Типы и провенанс
// ─────────────────────────────────────────────────────────────────────────────

/** Провенанс секции или записи профиля: источник, год, флаг оценочности. */
export interface RestProvenance {
  /** Человекочитаемый источник (база, издание, релиз). */
  source: string;
  /** Год данных. */
  year: number;
  /** true — значение оценочное, а не подтверждённый факт. */
  estimated: boolean;
}

/**
 * Компактный конструктор провенанса для записей внутри массивов
 * (вооружения, предприятия, поставщики, программы, уязвимости).
 */
function pv(source: string, year: number, estimated: boolean): RestProvenance {
  return {
    source: source,
    year: year,
    estimated: estimated,
  };
}

/** Секция «военный бюджет». */
export interface RestBudgetSection {
  /** Оценка военного бюджета, млрд долл. США; null — данные закрыты. */
  amountUsdBn: number | null;
  /** Пояснение к сумме: диапазон, состав расходов, оговорки (рус.). */
  amountNoteRu: string;
  /** Год, к которому относится оценка. */
  year: number;
  /** Доля военных расходов в ВВП, %; null — не оценивается. */
  shareOfGdpPct: number | null;
  /** Тренд расходов за последние годы (рус.). */
  trendRu: string;
  /** Провенанс секции. */
  provenance: RestProvenance;
}

/** Секция «личный состав». */
export interface RestPersonnelSection {
  /** Активный состав, человек; null — достоверной оценки нет. */
  active: number | null;
  /** Резерв, человек; null — резерв не выделяется или неизвестен. */
  reserve: number | null;
  /** Военизированные формирования (полиция, жандармерия), человек. */
  paramilitary: number | null;
  /** Заметка о структуре и качестве личного состава (рус.). */
  noteRu: string;
  /** Провенанс секции. */
  provenance: RestProvenance;
}

/** Структура видов вооружённых сил (описательно, по одному полю на вид). */
export interface RestServices {
  /** Сухопутные войска (рус.). */
  armyRu: string;
  /** Военно-морские силы (рус.). */
  navyRu: string;
  /** Военно-воздушные силы (рус.). */
  airForceRu: string;
  /** Прочие структуры: ПВО, береговая охрана, жандармерия (рус.). */
  otherRu: string;
}

/** Запись о ключевом вооружении страны. */
export interface RestEquipmentEntry {
  /** Род войск / домен (рус.). */
  branchRu: string;
  /** Название системы или класса техники. */
  system: string;
  /** Роль системы (рус.). */
  roleRu: string;
  /** Количество и состояние: оценка, а не точный реестр (рус.). */
  quantityNoteRu: string;
  /** Происхождение: собственное производство или поставщик (рус.). */
  originRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Предприятие оборонной промышленности страны. */
export interface RestCompanyEntry {
  /** Название компании. */
  name: string;
  /** Специализация (рус.). */
  specializationRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Секция «оборонная промышленность». */
export interface RestIndustrySection {
  /** true — в стране есть собственное оборонное производство. */
  hasIndustry: boolean;
  /** Сводная характеристика ВПК (рус.). */
  summaryRu: string;
  /** Оценка самообеспечения вооружением (рус.). */
  selfSufficiencyRu: string;
  /** Ключевые предприятия (пустой массив — промышленности нет). */
  companies: readonly RestCompanyEntry[];
  /** Провенанс секции. */
  provenance: RestProvenance;
}

/** Поставщик вооружений страны. */
export interface RestSupplierEntry {
  /** Страна-поставщик. */
  supplier: string;
  /** Что поставляет (рус.). */
  noteRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Секция «зависимость от импорта вооружений». */
export interface RestImportSection {
  /** Уровень зависимости: низкая / средняя / высокая / полная (рус.). */
  levelRu: string;
  /** Заметка о долях поставщиков и характере зависимости (рус.). */
  shareNoteRu: string;
  /** Главные поставщики. */
  suppliers: readonly RestSupplierEntry[];
  /** Провенанс секции. */
  provenance: RestProvenance;
}

/** Ключевая уязвимость страны. */
export interface RestVulnerabilityEntry {
  /** Название уязвимости (рус.). */
  titleRu: string;
  /** Развёрнутое описание (рус.). */
  descriptionRu: string;
  /** Тяжесть: «высокая», «средняя» или «низкая». */
  severityRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Программа модернизации вооружённых сил. */
export interface RestProgramEntry {
  /** Название программы или закупки (рус.). */
  nameRu: string;
  /** Содержание и статус (рус.). */
  noteRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Секция «модернизация». */
export interface RestModernizationSection {
  /** Сводка о состоянии модернизации (рус.). */
  summaryRu: string;
  /** Ключевые программы. */
  programs: readonly RestProgramEntry[];
  /** Провенанс секции. */
  provenance: RestProvenance;
}

/** Полный профиль страны волны data5. */
export interface RestCountryProfile {
  /** Код ISO 3166-1 alpha-3 (для Филиппин также алиас PHI). */
  iso3: string;
  /** Название на английском. */
  name: string;
  /** Название на русском (по реестру проекта). */
  nameRu: string;
  /** Регион (рус.). */
  region: string;
  /** Подрегион / географическое уточнение (рус.). */
  subregionRu: string;
  /** Статус вооружённых сил: регулярные / силы безопасности / отсутствуют. */
  forcesStatusRu: string;
  /** true — страна имеет постоянную армию. */
  hasStandingArmy: boolean;
  /** Военный бюджет. */
  budget: RestBudgetSection;
  /** Личный состав. */
  personnel: RestPersonnelSection;
  /** Структура видов ВС. */
  services: RestServices;
  /** Ключевые вооружения по родам войск. */
  equipment: readonly RestEquipmentEntry[];
  /** Оборонная промышленность. */
  defenseIndustry: RestIndustrySection;
  /** Зависимость от импорта вооружений. */
  importDependence: RestImportSection;
  /** Союзы, коалиции и форматы безопасности. */
  alliances: readonly string[];
  /** Ключевые уязвимости (2–4). */
  vulnerabilities: readonly RestVulnerabilityEntry[];
  /** Модернизация. */
  modernization: RestModernizationSection;
  /** Заметка о силах безопасности (для стран без армии — основная). */
  securityNoteRu: string;
  /** Итоговая оговорка профиля (рус.). */
  overallNoteRu: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Профили: Азия и Ближний Восток (первая группа)
// ─────────────────────────────────────────────────────────────────────────────

export const REST_COUNTRY_PROFILES: readonly RestCountryProfile[] = [
  {
    iso3: "AFG",
    name: "Afghanistan",
    nameRu: "Афганистан",
    region: "Южная Азия",
    subregionRu: "Центральная / Южная Азия, страна без выхода к морю",
    forcesStatusRu: "Вооружённые формирования движения «Талибан», не признанные международно",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: null,
      amountNoteRu: "Бюджет закрыт: талибы не публикуют оборонные расходы; внешние оценки силового блока — порядка 1–2 млрд долл. при общих доходах бюджета около 2–3 млрд долл.",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Непрозрачна; приоритет — внутренняя безопасность и содержание аппарата движения",
      provenance: {
        source: "Оценки SIGAR и Всемирного банка по Афганистану, винтаж проекта",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 165000,
      reserve: null,
      paramilitary: null,
      noteRu: "Оценка численности силовых структур талибов IISS: около 165 тыс. включая армию, полицию и разведку; качество и лояльность неоднородны, часть — бывшие боевики без формальной подготовки",
      provenance: {
        source: "IISS Military Balance 2024, оценка по открытым данным",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутный компонент — основа сил: пехотные корпуса по провинциям, унаследованная техника АНА",
      navyRu: "Отсутствуют (страна без выхода к морю)",
      airForceRu: "Минимальный авиационный компонент: несколько вертолётов Ми-17 и MD-530 из наследия АНА, боеспособность низкая",
      otherRu: "Главное управление разведки (GDI), пограничные силы, подразделения «Бадри-313»",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника наследия АНА (HMMWV, M1117, БТР)",
        roleRu: "Мобильность и внутренняя безопасность",
        quantityNoteRu: "Тысячи единиц унаследованной американской техники, исправность падает без запчастей",
        originRu: "США (наследие поставок армии АНА до 2021 года)",
        provenance: pv("IISS Military Balance; SIGAR", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Стрелковое оружие M4/M16 и АК",
        roleRu: "Основное вооружение пехоты",
        quantityNoteRu: "Большие запасы захваченного американского и советского оружия",
        originRu: "США и СССР/Россия (трофейные и унаследованные запасы)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты Ми-17 и MD-530",
        roleRu: "Транспорт и ограниченная огневая поддержка",
        quantityNoteRu: "Единицы исправных бортов; часть техники выведена в соседние страны в 2021 году",
        originRu: "Россия и США (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Артиллерия",
        system: "Буксируемая артиллерия Д-30 и миномёты",
        roleRu: "Огневая поддержка",
        quantityNoteRu: "Десятки стволов советского образца, состояние неоднородно",
        originRu: "СССР (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет; ремонт техники — кустарными мастерскими и трофейными запчастями",
      selfSufficiencyRu: "Нулевая: полная зависимость от унаследованных запасов и контрабанды запчастей",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная (формальные поставки отсутствуют)",
      shareNoteRu: "Официальный импорт вооружений заблокирован непризнанием режима; снабжение — наследие запасов и серые каналы",
      suppliers: [
        {
          supplier: "США (наследие до 2021 года)",
          noteRu: "Техника и оружие бывшей Афганской национальной армии",
          provenance: pv("SIGAR; IISS", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; SIGAR",
        year: 2024,
        estimated: true,
      },
    },
    alliances: [],
    vulnerabilities: [
      {
        titleRu: "Непризнание и изоляция",
        descriptionRu: "Режим не признан ООН: нет доступа к формальному рынку вооружений, обучению и финансам, техника деградирует без обслуживания",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Внутренний вызов ИГИЛ-Хорасан",
        descriptionRu: "Террористическая активность «Вилаят Хорасан» и пограничные трения с Пакистаном (линия Дюранда) отвлекают силы и подрывают монополию на насилие",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; доклады ООН", 2024, true),
      },
      {
        titleRu: "Деградация унаследованного парка",
        descriptionRu: "Американская техника без запчастей и подрядчиков теряет исправность; восстановить её своими силами страна не может",
        severityRu: "средняя",
        provenance: pv("SIGAR; аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Модернизации в классическом смысле нет: усилия направлены на унификацию формы, структуры корпусов и переподготовку бывших боевиков",
      programs: [
        {
          nameRu: "Формирование регулярных корпусов",
          noteRu: "Талибы объявили создание армии численностью до 150–200 тыс. с территориальными корпусами; прогресс ограничен финансированием",
          provenance: pv("Заявления эмирата; IISS", 2024, true),
        },
      ],
      provenance: {
        source: "IISS Military Balance; открытые заявления",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция подчинена МВД талибов; граница с Пакистаном — зона регулярных инцидентов",
    overallNoteRu: "Профиль оценочный: режим не публикует данных, все цифры — внешние оценки с пониженным доверием",
  },
  {
    iso3: "BHR",
    name: "Bahrain",
    nameRu: "Бахрейн",
    region: "Ближний Восток",
    subregionRu: "Персидский залив, островное государство, штаб 5-го флота США",
    forcesStatusRu: "Регулярные вооружённые силы (Силы обороны Бахрейна)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 1.4,
      amountNoteRu: "Около 1,4 млрд долл. по SIPRI; расходы стабильны и сильно зависят от нефтяных доходов и поддержки Саудовской Аравии",
      year: 2024,
      shareOfGdpPct: 3.1,
      trendRu: "Стабильный уровень с пиками под закупки авиации и ПВО",
      provenance: {
        source: "SIPRI Military Expenditure Database",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 8200,
      reserve: null,
      paramilitary: 11300,
      noteRu: "Компактные профессиональные силы; значительную роль играют Национальная гвардия и силы МВД, костяк офицерства — суннитское меньшинство при шиитском большинстве населения",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: бронетанковая и механизированная бригады, артиллерия",
      navyRu: "ВМС: корветы и патрульные корабли, база в Мина-Салман рядом с объектом ВМС США",
      airForceRu: "ВВС: истребители F-16, перевооружение на F-16 Block 70",
      otherRu: "Национальная гвардия, береговая охрана МВД",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "F-16C/D Fighting Falcon / F-16 Block 70",
        roleRu: "Многоцелевой истребитель, основа ВВС",
        quantityNoteRu: "Около 20 F-16 прежних модификаций; заказаны 16 Block 70, поставки с 2024 года",
        originRu: "США (Lockheed Martin)",
        provenance: pv("IISS Military Balance; DSCA", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "M60A3 Patton",
        roleRu: "Основной боевой танк",
        quantityNoteRu: "Около 180 танков устаревшего типа",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "ПВО",
        system: "Patriot PAC-3 и Hawk",
        roleRu: "Противовоздушная и противоракетная оборона объектов и базы флота США",
        quantityNoteRu: "Батареи Patriot развёрнуты; Hawk выводится",
        originRu: "США (Raytheon/RTX)",
        provenance: pv("IISS Military Balance; DSCA", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Корвет типа Al-Manama (Lürssen) и фрегат RBNS Khalid bin Ali (бывш. USS Jack Williams)",
        roleRu: "Патрулирование и эскорт в заливе",
        quantityNoteRu: "2 корвета, 1 фрегат, патрульные катера",
        originRu: "Германия и США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты AH-1 Cobra и UH-60",
        roleRu: "Огневая поддержка и транспорт",
        quantityNoteRu: "Около двух десятков вертолётов разных типов",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Собственного ВПК нет, кроме обслуживания и лёгкого судоремонта",
      selfSufficiencyRu: "Минимальная: всё тяжёлое вооружение импортное",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "США — доминирующий поставщик (авиация, ПВО, боеприпасы); роль Великобритании — обучение и военно-морское присутствие",
      suppliers: [
        {
          supplier: "США",
          noteRu: "F-16 Block 70, Patriot, вертолёты, боеприпасы; статус основного союзника вне НАТО",
          provenance: pv("SIPRI Arms Transfers; DSCA", 2024, false),
        },
        {
          supplier: "Великобритания",
          noteRu: "Военно-морской объект HMS Jufair, обучение и лёгкое вооружение",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ССАГПЗ", "Основной союзник США вне НАТО"],
    vulnerabilities: [
      {
        titleRu: "Внутренний конфессиональный раскол",
        descriptionRu: "Шиитское большинство при суннитской правящей династии: протестный потенциал 2011 года не снят, армия комплектуется с оглядкой на лояльность, а не только на компетентность",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Зависимость от внешнего зонтика",
        descriptionRu: "Безопасность острова фактически гарантирована 5-м флотом США и саудовской поддержкой (мост короля Фахда); собственный потенциал сдерживания Ирана символичен",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Размер и глубина",
        descriptionRu: "Территория острова не даёт стратегической глубины: аэродромы и база флота поражаются первым ударом с материка",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Точечная модернизация вокруг американской техники: F-16 Block 70 и усиление ПВО/ПРО",
      programs: [
        {
          nameRu: "F-16 Block 70",
          noteRu: "16 новых истребителей и модернизация парка, поставки начаты в 2024 году",
          provenance: pv("DSCA; Lockheed Martin", 2024, false),
        },
        {
          nameRu: "Усиление ПВО",
          noteRu: "Интеграция Patriot в контур ПВО залива на фоне ракетно-дроновой угрозы со стороны Ирана и хуситов",
          provenance: pv("IISS; профильная пресса", 2024, true),
        },
      ],
      provenance: {
        source: "DSCA; IISS Military Balance",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Национальная гвардия и силы МВД суммарно сопоставимы с армией — баланс сил внутри режима важнее внешней угрозы",
    overallNoteRu: "Данные IISS/SIPRI по Бахрейну относительно полны; численность и бюджет — оценки округлённо",
  },
  {
    iso3: "BTN",
    name: "Bhutan",
    nameRu: "Бутан",
    region: "Южная Азия",
    subregionRu: "Гималаи, буфер между Индией и Китаем",
    forcesStatusRu: "Регулярные силы: Королевская армия Бутана и Королевская полиция",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.03,
      amountNoteRu: "Порядка десятков млн долл.; оборона фактически субсидируется Индией, точная строка бюджета не выделяется в международных базах",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Стабильно минимальный уровень",
      provenance: {
        source: "Оценка проекта по CIA World Factbook и открытым бюджетам",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 8000,
      reserve: null,
      paramilitary: 4500,
      noteRu: "Королевская армия — около 8 тыс. человек лёгкой пехоты; Королевские телохранители — элитное подразделение охраны монарха; военная подготовка — в Индии",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Королевская армия Бутана: лёгкая пехота без тяжёлой техники",
      navyRu: "Отсутствуют (страна без выхода к морю)",
      airForceRu: "Отсутствует; пара вертолётов армейской авиации, воздушное пространство прикрывает Индия",
      otherRu: "Королевская полиция Бутана, лесная охрана",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Стрелковое оружие INSAS и АК",
        roleRu: "Вооружение лёгкой пехоты",
        quantityNoteRu: "Только лёгкое оружие; тяжёлой техники нет",
        originRu: "Индия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Лёгкие бронемашины и внедорожники",
        roleRu: "Патрулирование горных районов",
        quantityNoteRu: "Небольшое количество индийских машин",
        originRu: "Индия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты (Ми-8 / индийские Dhruv — по открытым данным)",
        roleRu: "Транспорт в горах и спасательные операции",
        quantityNoteRu: "Единицы бортов",
        originRu: "Индия / Россия (исторически)",
        provenance: pv("Открытые источники; IISS", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая: вооружение и обучение полностью индийские",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Индия — единственный значимый поставщик и гарант; Индийская военная учебная группа (IMTRAT) постоянно дислоцирована в Бутане",
      suppliers: [
        {
          supplier: "Индия",
          noteRu: "Вооружение, обучение, IMTRAT, финансирование инфраструктуры двойного назначения",
          provenance: pv("IISS; открытые источники", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Договор о дружбе с Индией 2007 года (фактический оборонный зонтик Индии)"],
    vulnerabilities: [
      {
        titleRu: "Спорная граница с Китаем",
        descriptionRu: "Неурегулированные участки границы (Доклам и др.): кризис 2017 года показал, что Бутан — поле индо-китайского противостояния без собственных рычагов",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Полная зависимость от Индии",
        descriptionRu: "Без индийского зонтика страна не способна к самостоятельной обороне; любой пересмотр отношений с Дели — экзистенциальный риск",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ модернизации нет; акцент на пограничной инфраструктуре совместно с Индией",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Внутренняя безопасность — полиция; армия выполняет также церемониальные и спасательные функции",
    overallNoteRu: "Численность и структура — по IISS; бюджет международными базами не выделяется, дана оценка порядка величины",
  },
  {
    iso3: "BRN",
    name: "Brunei",
    nameRu: "Бруней",
    region: "Юго-Восточная Азия",
    subregionRu: "Северное побережье Борнео, нефтегазовый султанат",
    forcesStatusRu: "Регулярные вооружённые силы (Королевские ВС Брунея)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.6,
      amountNoteRu: "Около 0,55–0,65 млрд долл.; доля ВВП низкая для уровня угроз благодаря нефтяным доходам",
      year: 2024,
      shareOfGdpPct: 3.9,
      trendRu: "Стабилен; закупки точечные и растянутые по времени",
      provenance: {
        source: "SIPRI Military Expenditure Database",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 7200,
      reserve: 700,
      paramilitary: null,
      noteRu: "Малые профессиональные силы, включая батальон гуркхов резерва и британский гарнизон (батальон гуркхов армии Великобритании) по соглашению с Лондоном",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: три пехотных батальона, лёгкая бронетехника",
      navyRu: "ВМС: морские патрульные корабли типа Darussalam (OPV)",
      airForceRu: "ВВС: транспортные самолёты, вертолёты S-70 и учебные PC-7; боевой авиации нет",
      otherRu: "Гуркхское резервное подразделение, военная полиция",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "OPV типа Darussalam",
        roleRu: "Патрулирование морской зоны и защита нефтегазовых платформ",
        quantityNoteRu: "4 корабля немецкой постройки",
        originRu: "Германия (Lürssen)",
        provenance: pv("IISS Military Balance", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "FV101 Scorpion и БТР VAB",
        roleRu: "Лёгкая бронетехника разведки и пехоты",
        quantityNoteRu: "Около 20 Scorpion (устарели), десятки VAB",
        originRu: "Великобритания и Франция",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты S-70i Black Hawk",
        roleRu: "Транспорт и поддержка",
        quantityNoteRu: "12 машин поставлено в 2010-е годы",
        originRu: "США (Sikorsky)",
        provenance: pv("IISS Military Balance", 2024, false),
      },
      {
        branchRu: "Авиация",
        system: "C-295 / CN-235 транспортные",
        roleRu: "Военно-транспортная авиация",
        quantityNoteRu: "Единицы бортов; заказ C-295 для замены CN-235",
        originRu: "Индонезия / Airbus (Испания)",
        provenance: pv("IISS; Airbus", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Собственного ВПК нет; обслуживание техники — иностранными подрядчиками",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Поставки диверсифицированы (Германия, США, Великобритания, Франция), но объёмы малы и циклы замены длинные",
      suppliers: [
        {
          supplier: "Германия",
          noteRu: "Патрульные корабли Lürssen",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
        {
          supplier: "США",
          noteRu: "Вертолёты Black Hawk",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
        {
          supplier: "Великобритания",
          noteRu: "Гарнизон гуркхов, обучение, лёгкая бронетехника",
          provenance: pv("IISS; правительство Великобритании", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["FPDA (пятисторонние оборонные договорённости)", "АСЕАН"],
    vulnerabilities: [
      {
        titleRu: "Спорные воды Южно-Китайского моря",
        descriptionRu: "Претензии на риф Луиза и морскую зону пересекаются с китайской «линией девяти пунктиров»; ВМС не способны оспорить присутствие КНР",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Старение сухопутной техники",
        descriptionRu: "Бронетехника 1970–1980-х годов без объявленной программы замены; боеспособность армии символическая",
        severityRu: "средняя",
        provenance: pv("IISS; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Зависимость от нефтяных доходов",
        descriptionRu: "Бюджет ВС полностью зависит от углеводородных цен; падение добычи Брунея сокращает и оборонные возможности",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Медленная точечная модернизация морской и транспортной составляющих",
      programs: [
        {
          nameRu: "Обновление транспортной авиации",
          noteRu: "Замена CN-235 на C-295, рассмотрение дополнительных OPV",
          provenance: pv("IISS; профильная пресса", 2024, true),
        },
      ],
      provenance: {
        source: "IISS Military Balance",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Внутренняя стабильность обеспечивает полиция; армия — также инструмент престижа монархии",
    overallNoteRu: "Данные по Брунею в IISS/SIPRI полные для страны такого размера; количества техники округлены",
  },
  {
    iso3: "LAO",
    name: "Laos",
    nameRu: "Лаос",
    region: "Юго-Восточная Азия",
    subregionRu: "Индокитай, страна без выхода к морю между Китаем, Вьетнамом и Таиландом",
    forcesStatusRu: "Регулярные вооружённые силы (Народная армия Лаоса)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: null,
      amountNoteRu: "Лаос не публикует прозрачный оборонный бюджет; SIPRI ряд прерывист, внешние оценки — порядка 0,1–0,3 млрд долл.",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Непрозрачен; закупки эпизодические, часто в кредит или по бартеру с партнёрами",
      provenance: {
        source: "Оценка проекта по SIPRI и CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 29100,
      reserve: null,
      paramilitary: 100000,
      noteRu: "Около 29 тыс. военнослужащих; обширные местные силы самообороны и милиция (оценка IISS — до 100 тыс.) призывного и партийного характера",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска — основа: пехотные дивизии военных округов, немного танков Т-72Б1",
      navyRu: "Речной патрульный компонент на Меконге в составе сухопутных сил",
      airForceRu: "ВВС: вертолёты Ми-17, лёгкие штурмовики/УТС Як-130, транспортники",
      otherRu: "Силы местной самообороны, милиция",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Т-72Б1 «Белый орёл»",
        roleRu: "Основной боевой танк",
        quantityNoteRu: "Около 30 машин поставлено Россией в 2018–2019 годах взамен Т-54/55",
        originRu: "Россия",
        provenance: pv("IISS Military Balance; SIPRI", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника ZBL-09 и советские БТР/БРДМ",
        roleRu: "Мобильность пехоты",
        quantityNoteRu: "Десятки китайских колёсных БТР, поставленных в 2020-е",
        originRu: "Китай и СССР (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Як-130",
        roleRu: "Учебно-боевой самолёт, лёгкий штурмовик",
        quantityNoteRu: "4 машины поставлены Россией с 2019 года",
        originRu: "Россия",
        provenance: pv("SIPRI; IISS", 2024, false),
      },
      {
        branchRu: "ПВО",
        system: "ЗРК малой дальности и ЗА советского/китайского образца",
        roleRu: "Объектовая ПВО",
        quantityNoteRu: "Устаревшие комплексы, единой системы ПВО нет",
        originRu: "СССР и Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК отсутствует, кроме ремонтных мастерских",
      selfSufficiencyRu: "Нулевая по тяжёлой технике",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Россия и Китай — конкурирующие поставщики; Вьетнам — исторический партнёр по обучению",
      suppliers: [
        {
          supplier: "Россия",
          noteRu: "Танки Т-72Б1, Як-130, вертолёты, стрелковое оружие",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
        {
          supplier: "Китай",
          noteRu: "Колёсная бронетехника, РЛС, лёгкое вооружение, инфраструктурные кредиты",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["АСЕАН", "Договор о дружбе с Вьетнамом 1977 года"],
    vulnerabilities: [
      {
        titleRu: "Долговая зависимость от Китая",
        descriptionRu: "Внешний долг преимущественно китайский: Пекин получает рычаги влияния на оборонную и инфраструктурную политику Вьентьяна",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; Всемирный банк", 2024, true),
      },
      {
        titleRu: "Неразорвавшиеся боеприпасы (UXO)",
        descriptionRu: "Наследие бомбардировок 1964–1973 годов ограничивает использование территории и остаётся фактором внутренней нестабильности в провинциях",
        severityRu: "средняя",
        provenance: pv("ООН; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Устаревший парк и слабая ПВО",
        descriptionRu: "Основная масса техники — советское наследие 1970-х; воздушное пространство фактически не контролируется",
        severityRu: "средняя",
        provenance: pv("IISS; аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Ограниченные закупки у России и Китая без системной программы",
      programs: [
        {
          nameRu: "Перевооружение на Т-72Б1 и Як-130",
          noteRu: "Поставки завершены к 2021 году; продолжения не объявлено",
          provenance: pv("SIPRI; IISS", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Армия участвует в разминировании и ликвидации последствий UXO совместно с международными программами",
    overallNoteRu: "Бюджет Лаоса международными базами не публикуется — дана оценка порядка; численность по IISS",
  },
  {
    iso3: "MDV",
    name: "Maldives",
    nameRu: "Мальдивы",
    region: "Южная Азия",
    subregionRu: "Индийский океан, архипелаг атоллов на морских коммуникациях",
    forcesStatusRu: "Регулярные силы: Национальные силы обороны Мальдив (MNDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.08,
      amountNoteRu: "Порядка 70–90 млн долл.; основная статья — содержание береговой охраны и патрульных сил",
      year: 2024,
      shareOfGdpPct: 1.2,
      trendRu: "Лёгкий рост на фоне политической дискуссии о военном присутствии Индии",
      provenance: {
        source: "Оценка проекта по CIA World Factbook и бюджету Мальдив",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 2500,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 2,5 тыс. человек: морская пехота, береговая охрана, авиационное крыло формируется при поддержке партнёров",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутный компонент: морская пехота и силы быстрого реагирования",
      navyRu: "Береговая охрана — ядро MNDF: патрульные катера и корабли, подаренные Индией",
      airForceRu: "Авиационное крыло: вертолёты и самолёты Dornier, ранее эксплуатировавшиеся с индийскими экипажами",
      otherRu: "Пожарно-спасательная служба, инженерный компонент",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные корабли и катера (типы индийской и шри-ланкийской постройки)",
        roleRu: "Патрулирование исключительной экономической зоны",
        quantityNoteRu: "Около десятка вымпелов разного возраста",
        originRu: "Индия и Шри-Ланка (передача в дар)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты HAL Dhruv и самолёт Dornier Do-228",
        roleRu: "Поиск и спасание, медицинская эвакуация, наблюдение",
        quantityNoteRu: "2 вертолёта и 1 самолёт индийской передачи; вопрос экипажей — предмет спора Мале и Дели",
        originRu: "Индия",
        provenance: pv("IISS; открытая пресса", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Лёгкая бронетехника и стрелковое оружие",
        roleRu: "Безопасность столицы и объектов",
        quantityNoteRu: "Единицы бронемашин",
        originRu: "Разные поставщики",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая: техника в основном получена в дар",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Индия — исторический донор техники и обучения; Турция в 2024 году впервые поставила БПЛА, что стало заметным сдвигом",
      suppliers: [
        {
          supplier: "Индия",
          noteRu: "Патрульные корабли, авиация, обучение, гидроавиационная инфраструктура",
          provenance: pv("SIPRI; открытая пресса", 2024, false),
        },
        {
          supplier: "Турция",
          noteRu: "БПЛА Bayraktar TB2 — первая крупная закупка у неиндийского поставщика (2024)",
          provenance: pv("Открытая пресса; заявление MNDF", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; открытая пресса",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Коломбский процесс безопасности (неформальный формат Индийского океана)"],
    vulnerabilities: [
      {
        titleRu: "Поле индо-китайского соперничества",
        descriptionRu: "Курс «India Out» администрации Муиззу и сближение с Китаем превращают малые силы в объект конкуренции великих держав без собственной стратегической глубины",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Огромная морская зона при малых силах",
        descriptionRu: "ИЭЗ около 900 тыс. км² контролируется десятком катеров: браконьерство, контрабанда и инциденты в основном обнаруживаются постфактум",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Формирование беспилотного и авиационного компонента с нуля",
      programs: [
        {
          nameRu: "БПЛА Bayraktar TB2",
          noteRu: "Закупка у Турции (2024) для морского наблюдения — первый разведывательно-ударный актив страны",
          provenance: pv("Открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "Открытая пресса; заявления правительства Мальдив",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция — отдельная служба; MNDF также отвечает за реагирование на стихийные бедствия на атоллах",
    overallNoteRu: "Численность по IISS; бюджет — оценка порядка величины, официальные данные фрагментарны",
  },
  {
    iso3: "TLS",
    name: "Timor-Leste",
    nameRu: "Тимор-Лесте",
    region: "Юго-Восточная Азия",
    subregionRu: "Малые Зондские острова, граница с Индонезией",
    forcesStatusRu: "Регулярные силы: Силы обороны Тимор-Лесте (F-FDTL)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.04,
      amountNoteRu: "Порядка 35–45 млн долл.; оборона — малая статья бюджета, зависящего от нефтяного фонда",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Стабильный минимум; обсуждается расширение морского компонента",
      provenance: {
        source: "Оценка проекта по CIA World Factbook и бюджету Тимор-Лесте",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 2280,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 2,3 тыс. военнослужащих, сформированных из ветеранов сопротивления FALINTIL при поддержке Португалии и Австралии",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутный компонент: два лёгких пехотных батальона",
      navyRu: "Морской компонент: патрульные катера, включая австралийские Guardian-class",
      airForceRu: "Авиационного компонента фактически нет",
      otherRu: "Военная полиция и инженерные подразделения",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные катера Guardian-class",
        roleRu: "Патрулирование морской зоны и рыболовства",
        quantityNoteRu: "2 катера переданы Австралией в 2023–2024 годах",
        originRu: "Австралия (Austal)",
        provenance: pv("Правительство Австралии; IISS", 2024, false),
      },
      {
        branchRu: "Флот",
        system: "Патрульные катера китайской и южнокорейской постройки",
        roleRu: "Прибрежное патрулирование",
        quantityNoteRu: "Несколько единиц, полученных в дар в 2010-е",
        originRu: "Китай и Республика Корея",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Стрелковое оружие M16/F88 и лёгкая техника",
        roleRu: "Вооружение лёгкой пехоты",
        quantityNoteRu: "Только лёгкое вооружение",
        originRu: "Португалия, Австралия, США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Техника преимущественно дарится: Австралия — патрульные катера и обучение, Португалия — подготовка кадров, Китай — катера и инфраструктура",
      suppliers: [
        {
          supplier: "Австралия",
          noteRu: "Катера Guardian-class, обучение, совместные учения",
          provenance: pv("Правительство Австралии", 2024, false),
        },
        {
          supplier: "Португалия",
          noteRu: "Подготовка офицеров и военно-морских кадров",
          provenance: pv("IISS; открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["АСЕАН (вступление оформлено в 2025 году)", "Оборонное сотрудничество с Австралией и Португалией"],
    vulnerabilities: [
      {
        titleRu: "Истощение нефтяного фонда",
        descriptionRu: "Бюджет государства, включая армию, зависит от Petroleum Fund при падающей добыче Байу-Ундан: горизонт финансирования без реформ — годы, а не десятилетия",
        severityRu: "высокая",
        provenance: pv("Всемирный банк; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Слабость морского контроля",
        descriptionRu: "Незаконный промысел в Тиморском море превышает возможности пары катеров; спор о газовом месторождении Greater Sunrise с Австралией не закрыт окончательно",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Минимальная: акцент на морское патрулирование и подготовку кадров партнёрами",
      programs: [
        {
          nameRu: "Катера Guardian-class",
          noteRu: "Получены два катера; экипажи обучаются в Австралии",
          provenance: pv("Правительство Австралии", 2024, false),
        },
      ],
      provenance: {
        source: "Правительство Австралии; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция (PNTL) исторически конкурировала с армией за полномочия; кризис 2006 года — урок гражданского контроля",
    overallNoteRu: "Численность по IISS; бюджет — оценка порядка; состав техники — открытые передачи партнёров",
  },
  {
    iso3: "PHI",
    name: "Philippines (alias code)",
    nameRu: "Филиппины",
    region: "Юго-Восточная Азия",
    subregionRu: "Архипелаг в Южно-Китайском и Филиппинском морях",
    forcesStatusRu: "Алиасный профиль: основной код страны — PHL (волна data3)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: null,
      amountNoteRu: "Алиас PHI дублирует PHL в реестре проекта; бюджет и все показатели Филиппин ведутся в профиле PHL волны data3 и здесь не дублируются цифрами во избежание двойного счёта в агрегатах",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "См. профиль PHL",
      provenance: {
        source: "Реестр проекта country-names-ru.ts (алиас PHI = PHL)",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: null,
      reserve: null,
      paramilitary: null,
      noteRu: "См. профиль PHL в src/lib/data3/country-profiles-60.ts: алиас существует для совместимости карт и пайплайна, а не как отдельная страна",
      provenance: {
        source: "Реестр проекта; data3",
        year: 2024,
        estimated: false,
      },
    },
    services: {
      armyRu: "См. профиль PHL",
      navyRu: "См. профиль PHL",
      airForceRu: "См. профиль PHL",
      otherRu: "См. профиль PHL",
    },
    equipment: [],
    defenseIndustry: {
      hasIndustry: true,
      summaryRu: "См. профиль PHL: собственный ВПК Филиппин описан в волне data3",
      selfSufficiencyRu: "См. профиль PHL",
      companies: [],
      provenance: {
        source: "data3, профиль PHL",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "см. профиль PHL",
      shareNoteRu: "Алиас не участвует в подсчётах импорта: агрегаты data5 обязаны исключать PHI, чтобы не задвоить Филиппины",
      suppliers: [],
      provenance: {
        source: "Методологическая оговорка проекта",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["АСЕАН", "Договор о взаимной обороне с США 1951 года (через код PHL)"],
    vulnerabilities: [
      {
        titleRu: "Риск двойного счёта в данных",
        descriptionRu: "Наличие двух кодов одной страны (PHI и PHL) в реестре — технический долг: любой агрегат без явного исключения алиаса завысит региональные суммы Юго-Восточной Азии",
        severityRu: "средняя",
        provenance: pv("Аудит данных проекта", 2024, false),
      },
      {
        titleRu: "Расхождение карт и API",
        descriptionRu: "Разные слои проекта исторически использовали PHI и PHL как основной код, что приводило к потерянным записям при слиянии источников",
        severityRu: "низкая",
        provenance: pv("Аудит данных проекта", 2024, false),
      },
    ],
    modernization: {
      summaryRu: "См. профиль PHL (программа Horizon AFP Modernization)",
      programs: [],
      provenance: {
        source: "data3, профиль PHL",
        year: 2024,
        estimated: false,
      },
    },
    securityNoteRu: "Алиасный профиль создан исключительно для полноты покрытия реестра; операционные выводы — по PHL",
    overallNoteRu: "Единственный профиль файла без собственных чисел: это сознательное методологическое решение против двойного счёта",
  },
  {
    iso3: "KGZ",
    name: "Kyrgyzstan",
    nameRu: "Кыргызстан",
    region: "Центральная Азия",
    subregionRu: "Тянь-Шань, границы с Китаем, Казахстаном, Узбекистаном и Таджикистаном",
    forcesStatusRu: "Регулярные вооружённые силы",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.35,
      amountNoteRu: "Порядка 0,3–0,4 млрд долл. по оценкам SIPRI/национального бюджета; расходы выросли после пограничных столкновений с Таджикистаном 2021–2022 годов",
      year: 2024,
      shareOfGdpPct: 2.4,
      trendRu: "Рост с 2021 года: закупки БПЛА и артиллерии впервые за постсоветский период",
      provenance: {
        source: "SIPRI Military Expenditure Database; оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 10900,
      reserve: null,
      paramilitary: 9500,
      noteRu: "Около 11 тыс. военнослужащих, смешанное комплектование с призывом; пограничная служба ГКНБ — отдельный сильный компонент",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: мотострелковые бригады, артиллерия советского наследия",
      navyRu: "Отсутствуют (страна без выхода к морю)",
      airForceRu: "Силы воздушной обороны: вертолёты Ми-8/Ми-24, транспортники; истребительной авиации нет, небо прикрывает российская база Кант (ОДКБ)",
      otherRu: "Пограничная служба ГКНБ, внутренние войска, Национальная гвардия",
    },
    equipment: [
      {
        branchRu: "БПЛА",
        system: "Bayraktar TB2 и «Акынжы» (Akıncı), «Орлан-10»",
        roleRu: "Разведка и ударные задачи — качественный скачок после 2021 года",
        quantityNoteRu: "TB2 получены в 2021–2022 годах, Akıncı — в 2023 году; количества засекречены, счёт на единицы/десятки",
        originRu: "Турция и Россия",
        provenance: pv("Открытая пресса; заявления ГКНБ КР", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Т-72 и БМП-2 советского наследия",
        roleRu: "Бронетанковое ядро сухопутных войск",
        quantityNoteRu: "Около 150 танков и 300+ БМП, часть на хранении",
        originRu: "СССР (наследие), модернизация — Россия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Артиллерия",
        system: "РСЗО «Град», гаубицы Д-30 и М-30",
        roleRu: "Огневая поддержка",
        quantityNoteRu: "Десятки установок; в Баткенском конфликте применялась массово",
        originRu: "СССР (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "ПВО",
        system: "С-125 «Печора-2БМ» и ПЗРК",
        roleRu: "Объектовая ПВО",
        quantityNoteRu: "Модернизированные Беларусью комплексы единичны; единой системы ПВО нет",
        originRu: "СССР, модернизация — Беларусь",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты Ми-8 и Ми-24",
        roleRu: "Транспорт и огневая поддержка в горах",
        quantityNoteRu: "Около полутора десятков бортов, часть нелетнопригодна",
        originRu: "СССР / Россия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Значимого ВПК нет: завод «Дастан» (торпедное наследие СССР) простаивает, производство ограничено ремонтом",
      selfSufficiencyRu: "Минимальная: вооружение — наследие и новые закупки у Турции и России",
      companies: [
        {
          name: "ОАО «ТНК Дастан»",
          specializationRu: "Исторически — морские торпеды и приборы; сейчас преимущественно ремонтные работы",
          provenance: pv("Открытые источники", 2024, true),
        },
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Исторически доминировала Россия (военно-техническая помощь и база Кант), с 2021 года Турция стала поставщиком ударных БПЛА, Китай — транспорта и экипировки",
      suppliers: [
        {
          supplier: "Россия",
          noteRu: "Военно-техническая помощь, вертолёты, боеприпасы; база ОДКБ в Канте",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
        {
          supplier: "Турция",
          noteRu: "Bayraktar TB2 и Akıncı, бронеавтомобили",
          provenance: pv("Открытая пресса; ГКНБ КР", 2024, true),
        },
        {
          supplier: "Китай",
          noteRu: "Транспорт, экипировка, военно-технические гранты",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ОДКБ", "ШОС", "СНГ"],
    vulnerabilities: [
      {
        titleRu: "Граница с Таджикистаном",
        descriptionRu: "Столкновения 2021–2022 годов в Баткенской области с применением артиллерии и БПЛА показали уязвимость юга; делимитация завершена соглашением 2025 года, но доверие хрупко",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Зависимость от внешних гарантий",
        descriptionRu: "Воздушная безопасность завязана на российскую базу Кант; при этом Бишкек балансирует между Москвой, Пекином и Анкарой без собственной глубины",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Водная и энергетическая уязвимость юга",
        descriptionRu: "Споры о воде и пастбищах Ферганской долины регулярно перерастают в вооружённые инциденты с участием погранслужб и местных жителей",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Впервые за 30 лет — реальные закупки современных систем, сфокусированные на БПЛА и границе",
      programs: [
        {
          nameRu: "Беспилотная программа ГКНБ",
          noteRu: "TB2, Akıncı и «Орлан-10» для пограничной службы; создан центр применения БПЛА",
          provenance: pv("Заявления ГКНБ КР; открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "Открытая пресса; официальные заявления",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Пограничная служба в составе ГКНБ — фактически второй силовой центр страны",
    overallNoteRu: "Численность и парк — IISS; бюджет — оценка по SIPRI и национальным публикациям",
  },
  {
    iso3: "TJK",
    name: "Tajikistan",
    nameRu: "Таджикистан",
    region: "Центральная Азия",
    subregionRu: "Памир и Ферганская долина, самая длинная граница с Афганистаном в СНГ",
    forcesStatusRu: "Регулярные вооружённые силы",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.25,
      amountNoteRu: "Порядка 0,2–0,3 млрд долл.; значительная часть реальной поддержки — российская военная помощь и содержание 201-й базы",
      year: 2024,
      shareOfGdpPct: 1.9,
      trendRu: "Скромный рост; закупки в основном в форме российской помощи",
      provenance: {
        source: "Оценка проекта по SIPRI и открытым бюджетам",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 8800,
      reserve: null,
      paramilitary: 7500,
      noteRu: "Около 9 тыс. военнослужащих при призывной системе с низкой популярностью службы; пограничные войска — приоритетный компонент из-за афганской границы (1 357 км)",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: мотострелковые бригады, десантно-штурмовой батальон",
      navyRu: "Отсутствуют (страна без выхода к морю)",
      airForceRu: "ВВС и ПВО: вертолёты Ми-8/Ми-24, несколько штурмовиков Су-25 наследия; прикрытие — 201-я российская база",
      otherRu: "Пограничные войска ГКНБ, внутренние войска, Национальная гвардия",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Т-72 и БМП-2",
        roleRu: "Бронетанковое ядро",
        quantityNoteRu: "Десятки единиц советского наследия, часть поставлена Россией в 2010-е",
        originRu: "СССР / Россия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Артиллерия",
        system: "РСЗО «Град», гаубицы Д-30",
        roleRu: "Огневая поддержка",
        quantityNoteRu: "Десятки единиц; применялась в приграничных столкновениях с Кыргызстаном",
        originRu: "СССР (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты Ми-8/Ми-24 и штурмовики Су-25",
        roleRu: "Поддержка наземных сил в горах",
        quantityNoteRu: "Единицы летнопригодных бортов",
        originRu: "СССР / Россия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "БПЛА",
        system: "Иранские БПЛА (заявленные поставки Mohajer/Ababil)",
        roleRu: "Разведка границы",
        quantityNoteRu: "В 2022 году в Душанбе открыт завод по сборке иранских БПЛА Ababil-2 — заявления сторон, объёмы не подтверждены",
        originRu: "Иран",
        provenance: pv("Открытая пресса", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Собственного ВПК нет, кроме заявленной сборочной площадки иранских БПЛА и ремонтных мастерских",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Россия — главный донор (помощь, обучение, 201-я база — крупнейший сухопутный объект РФ за рубежом); Китай строит пограничную инфраструктуру, Иран — ниша БПЛА",
      suppliers: [
        {
          supplier: "Россия",
          noteRu: "Техника, боеприпасы, обучение, 201-я военная база",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
        {
          supplier: "Китай",
          noteRu: "Пограничные посты, транспорт, экипировка по грантам",
          provenance: pv("SIPRI; открытая пресса", 2024, true),
        },
        {
          supplier: "Иран",
          noteRu: "БПЛА и сборочное производство (по заявлениям 2022 года)",
          provenance: pv("Открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ОДКБ", "ШОС", "СНГ"],
    vulnerabilities: [
      {
        titleRu: "Афганская граница и наркотрафик",
        descriptionRu: "1 357 км горной границы с Афганистаном: наркотрафик, риск инфильтрации боевиков и зависимость от российской базы как фактического гаранта",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Горно-Бадахшанская автономия",
        descriptionRu: "ГБАО — хроническая зона напряжённости (события 2021–2022 годов в Хороге), требующая постоянного силового присутствия",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Слабость собственной армии",
        descriptionRu: "Призыв непопулярен, коррупция и дедовщина подрывают боеспособность; в кризисе ставка делается на ОДКБ, а не на свои силы",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; IISS", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Модернизация почти полностью равна российской военной помощи: поставки техники для 201-й базы и таджикских частей",
      programs: [
        {
          nameRu: "Российская программа помощи",
          noteRu: "Передача бронетехники, РЛС и боеприпасов; модернизация ПВО при участии РФ",
          provenance: pv("Минобороны РФ; открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "Открытая пресса; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "ГКНБ и пограничные войска — ключевой силовой инструмент режима наряду с армией",
    overallNoteRu: "Все количественные данные — оценки IISS; реальный оборонный контур включает российский вклад, не отражённый в бюджете",
  },
  {
    iso3: "TKM",
    name: "Turkmenistan",
    nameRu: "Туркменистан",
    region: "Центральная Азия",
    subregionRu: "Каракумы и Каспий, граница с Афганистаном и Ираном",
    forcesStatusRu: "Регулярные вооружённые силы закрытого нейтрального государства",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: null,
      amountNoteRu: "Данные закрыты: SIPRI ряд по Туркменистану прерывается, внешние оценки прошлых лет — 1,5–2 млрд долл. и выше на пике закупок; к цифрам доверие низкое",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Непрозрачна; в 2010-е страна была заметным покупателем китайской и турецкой техники за газовые доходы",
      provenance: {
        source: "Оценка проекта: SIPRI (исторические ряды), IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 36500,
      reserve: null,
      paramilitary: 20000,
      noteRu: "Оценка IISS — около 36,5 тыс. военнослужащих при призыве; реальная укомплектованность и подготовка считаются низкими, техника часто демонстрируется на парадах",
      provenance: {
        source: "IISS Military Balance 2024, оценка для закрытой страны",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: мотострелковые дивизии советского типа, танки Т-72 и Т-90С",
      navyRu: "ВМС на Каспии: ракетные катера турецкой и российской постройки, база Туркменбаши",
      airForceRu: "ВВС: Су-25, МиГ-29, вертолёты; закуплены итальянские M-346 и транспортные C-27J",
      otherRu: "Пограничная служба, внутренние войска, государственная служба безопасности президента",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Т-90С и Т-72",
        roleRu: "Основные боевые танки",
        quantityNoteRu: "Около 10 Т-90С и порядка 650 Т-72 по оценкам IISS — цифры для закрытой страны ориентировочные",
        originRu: "Россия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "ПВО",
        system: "Китайские ЗРК FD-2000 (HQ-9), KS-1A и РЛС",
        roleRu: "Основа современной ПВО страны",
        quantityNoteRu: "Несколько дивизионов, показаны на парадах 2016–2021 годов",
        originRu: "Китай",
        provenance: pv("IISS; SIPRI", 2024, true),
      },
      {
        branchRu: "БПЛА",
        system: "CH-3, WJ-600 и Bayraktar TB2 (по открытым данным)",
        roleRu: "Разведка и ударные задачи",
        quantityNoteRu: "Единицы–десятки аппаратов разных типов",
        originRu: "Китай и Турция",
        provenance: pv("IISS; открытая пресса", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Ракетные катера типа Edermen и корвет Deniz Han",
        roleRu: "Каспийское патрулирование и ракетный удар",
        quantityNoteRu: "Корвет Deniz Han (турецкий проект) введён в 2021 году",
        originRu: "Турция и Россия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "M-346FA и C-27J (Leonardo)",
        roleRu: "Лёгкие штурмовики/УТС и транспорт",
        quantityNoteRu: "Небольшие партии поставлены в 2021–2022 годах",
        originRu: "Италия",
        provenance: pv("Leonardo; IISS", 2024, false),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Собственного ВПК нет; в Туркменбаши действует судостроительно-ремонтный завод с турецким участием",
      selfSufficiencyRu: "Минимальная: вся современная техника импортная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Уникально диверсифицированный для региона портфель: Китай (ПВО, БПЛА), Турция (флот, БПЛА), Россия (танки), Италия (авиация), Беларусь (РСЗО)",
      suppliers: [
        {
          supplier: "Китай",
          noteRu: "ЗРК FD-2000/KS-1A, РЛС, БПЛА, РСЗО",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
        {
          supplier: "Турция",
          noteRu: "Корветы и катера, Bayraktar TB2, бронетехника",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
        {
          supplier: "Россия",
          noteRu: "Танки, вертолёты, катера",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Постоянный нейтралитет (признан ООН в 1995 году)", "СНГ (ассоциированный статус)"],
    vulnerabilities: [
      {
        titleRu: "Парадная армия при низкой подготовке",
        descriptionRu: "Закупки современной техники не сопровождаются прозрачной системой подготовки: аналитики IISS consistently отмечают разрыв между парком и способностью его применять",
        severityRu: "высокая",
        provenance: pv("IISS; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Зависимость от газовых доходов и одного покупателя",
        descriptionRu: "Экспорт газа почти полностью в Китай: падение спроса или цены напрямую бьёт по способности закупать и обслуживать импортную технику пяти разных школ",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Логистический зоопарк",
        descriptionRu: "Техника китайского, турецкого, российского, итальянского и белорусского производства требует пяти цепочек запчастей и обучения — неподъёмная ноша для закрытой армии",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Закупочный цикл 2010-х сформировал современный по номенклатуре, но разнородный парк; новых крупных программ не видно из-за закрытости",
      programs: [
        {
          nameRu: "Каспийская кораблестроительная программа",
          noteRu: "Завод в Туркменбаши с турецкой Dearsan: сборка катеров и корветов",
          provenance: pv("Открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "IISS Military Balance",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Внутренний контур — МВД и служба безопасности президента; армия также используется на сельхозработах, что подрывает подготовку",
    overallNoteRu: "Профиль страны с пониженным доверием к данным: Ашхабад не публикует статистику, оценки IISS/SIPRI ориентировочны",
  },
  {
    iso3: "ALB",
    name: "Albania",
    nameRu: "Албания",
    region: "Европа",
    subregionRu: "Западные Балканы, побережье Адриатики и Ионического моря",
    forcesStatusRu: "Регулярные вооружённые силы, член НАТО с 2009 года",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.52,
      amountNoteRu: "Около 0,5 млрд долл.; Албания приблизилась к 2% ВВП в рамках обязательств перед НАТО",
      year: 2024,
      shareOfGdpPct: 2.0,
      trendRu: "Рост после 2022 года: вертолёты, БПЛА и модернизация базы Кучова",
      provenance: {
        source: "SIPRI Military Expenditure Database; НАТО",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 8000,
      reserve: null,
      paramilitary: 500,
      noteRu: "Полностью профессиональная армия около 8 тыс. человек; упор на экспедиционные батальоны для миссий НАТО",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: лёгкая пехота, батальон специального назначения",
      navyRu: "ВМС: патрульные корабли типа Iliria (Damen Stan) и береговая охрана",
      airForceRu: "Воздушные силы: только вертолёты; истребительной авиации нет с 2005 года",
      otherRu: "Военная полиция, республиканская гвардия",
    },
    equipment: [
      {
        branchRu: "БПЛА",
        system: "Bayraktar TB2",
        roleRu: "Разведка и наблюдение",
        quantityNoteRu: "3 аппарата поставлены Турцией в 2023–2024 годах",
        originRu: "Турция",
        provenance: pv("Заявления МО Албании; открытая пресса", 2024, false),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты UH-60 Black Hawk и AS532 Cougar",
        roleRu: "Транспорт и поддержка",
        quantityNoteRu: "2 UH-60 переданы США, несколько Cougar европейского происхождения",
        originRu: "США и Airbus",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Патрульные корабли типа Iliria",
        roleRu: "Контроль морской зоны и поиск-спасание",
        quantityNoteRu: "4 корабля постройки Damen",
        originRu: "Нидерланды (Damen)",
        provenance: pv("IISS Military Balance", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронеавтомобили HMMWV и MaxxPro",
        roleRu: "Мобильность экспедиционных подразделений",
        quantityNoteRu: "Десятки машин американской передачи",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Советское наследие ВПК (заводы в Поличане и др.) в упадке; обсуждается возрождение производства боеприпасов",
      selfSufficiencyRu: "Низкая: вооружение в основном дарится или закупается у союзников",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "США и Турция — ключевые доноры; Италия — исторический партнёр по флоту и авиации",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Вертолёты, бронетехника, ПТРК Javelin (заказ), обучение",
          provenance: pv("SIPRI; DSCA", 2024, true),
        },
        {
          supplier: "Турция",
          noteRu: "БПЛА Bayraktar TB2, экипировка",
          provenance: pv("Открытая пресса", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["НАТО"],
    vulnerabilities: [
      {
        titleRu: "Отсутствие боевой авиации и ПВО",
        descriptionRu: "Воздушное пространство прикрывают Италия и Греция по соглашению НАТО; собственного истребительного компонента и ЗРК у страны нет",
        severityRu: "средняя",
        provenance: pv("НАТО; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Склады советского наследия",
        descriptionRu: "Огромные устаревшие арсеналы времён Ходжи — экологическая и криминальная угроза, утилизация идёт медленно при внешней помощи",
        severityRu: "средняя",
        provenance: pv("НАТО; аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Ставка на БПЛА, вертолёты и инфраструктуру НАТО (авиабаза Кучова открыта в 2024 году как тактический объект альянса)",
      programs: [
        {
          nameRu: "Авиабаза Кучова",
          noteRu: "Модернизирована при финансировании НАТО, открыта в марте 2024 года",
          provenance: pv("НАТО", 2024, false),
        },
        {
          nameRu: "Закупка ПТРК Javelin",
          noteRu: "Контракт с США на противотанковые комплексы для сухопутных войск",
          provenance: pv("DSCA; открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "НАТО; DSCA",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция и гвардия обеспечивают внутреннюю безопасность; армия востребована в ликвидации ЧС",
    overallNoteRu: "Данные IISS/SIPRI по Албании полны; количества техники округлены",
  },
  {
    iso3: "AND",
    name: "Andorra",
    nameRu: "Андорра",
    region: "Европа",
    subregionRu: "Пиренеи, микрогосударство между Испанией и Францией",
    forcesStatusRu: "Вооружённых сил нет",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет как статьи: оборона по договорам обеспечивается Испанией и Францией",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует",
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 240,
      noteRu: "Национальная полиция — около 240 сотрудников; церемониальный корпус Somatent — добровольное ополчение для ЧС, а не армия",
      provenance: {
        source: "CIA World Factbook; правительство Андорры",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует",
      navyRu: "Отсутствует (нет выхода к морю)",
      airForceRu: "Отсутствует",
      otherRu: "Национальная полиция, пожарная служба, корпус Somatent (церемониальный)",
    },
    equipment: [],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо: оборона делегирована соседям",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет; полиция вооружена европейским стрелковым оружием",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Договоры о добрососедстве с Испанией и Францией (1993), фактический зонтик соседей"],
    vulnerabilities: [
      {
        titleRu: "Полная зависимость от соседей",
        descriptionRu: "Безопасность княжества целиком определяется отношениями с Испанией и Францией; собственных инструментов принуждения нет и не планируется",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Транзитные риски Пиренеев",
        descriptionRu: "Контрабанда и трансграничная преступность на горных дорогах — основной реальный вызов для малой полиции",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо; развитие идёт только по линии полиции и спасательных служб",
      programs: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    securityNoteRu: "Честный профиль без армии: безопасность — полиция и договоры с соседями; выдуманных чисел в профиле нет сознательно",
    overallNoteRu: "Микрогосударство без вооружённых сил; нулевые значения — факт, а не пропуск данных",
  },
  {
    iso3: "BIH",
    name: "Bosnia and Herzegovina",
    nameRu: "Босния и Герцеговина",
    region: "Европа",
    subregionRu: "Западные Балканы, постконфликтное государство Дейтонской конструкции",
    forcesStatusRu: "Регулярные вооружённые силы (единые ВС БиГ с 2006 года)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.33,
      amountNoteRu: "Около 0,3 млрд долл. — один из самых низких уровней в Европе относительно задач; бюджет хронически недофинансирует модернизацию",
      year: 2024,
      shareOfGdpPct: 1.2,
      trendRu: "Стагнация; рост сдерживается политическими спорами энтитетов",
      provenance: {
        source: "SIPRI Military Expenditure Database",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 10500,
      reserve: 6000,
      paramilitary: null,
      noteRu: "Единая армия комплектуется по этническим квотам (бошняки, сербы, хорваты) с тремя пехотными полками «наследия» бывших армий",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные бригады, танковый батальон советского/американского наследия",
      navyRu: "Отсутствуют (выход к морю — 20 км у Неума, флота нет)",
      airForceRu: "Авиация: вертолёты UH-1H, Ми-8 и Gazelle; истребителей нет, ПВО — ПЗРК и ЗА",
      otherRu: "Бригада тактической поддержки, инженерные и сапёрные части (разминирование)",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "M-84 и AMX-30 / Т-55 (наследие)",
        roleRu: "Танковый парк смешанного происхождения времён войны 1992–1995 годов",
        quantityNoteRu: "Десятки машин, значительная часть неисправна или на хранении",
        originRu: "Югославия, Франция, СССР (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты UH-1H и Ми-8",
        roleRu: "Транспорт и поддержка",
        quantityNoteRu: "Около 15 бортов; США поставили 4 Huey II в 2021 году и одобрили продажу AW119Kx",
        originRu: "США и СССР (наследие)",
        provenance: pv("IISS; DSCA", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Артиллерия советского и американского наследия (M-109 нет; буксируемые гаубицы)",
        roleRu: "Огневая поддержка",
        quantityNoteRu: "Смешанный парк 105–155 мм, состояние неоднородное",
        originRu: "США, Югославия (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: true,
      summaryRu: "Заметное югославское наследие ВПК: производство боеприпасов и стрелкового оружия, ориентированное на экспорт",
      selfSufficiencyRu: "Частичная по боеприпасам и лёгкому оружию; тяжёлая техника не производится",
      companies: [
        {
          name: "Igman Konjic",
          specializationRu: "Боеприпасы стрелкового оружия, крупный экспортёр",
          provenance: pv("Открытые источники компании", 2024, false),
        },
        {
          name: "Ginex Gorazde",
          specializationRu: "Капсюли и инициирующие составы",
          provenance: pv("Открытые источники компании", 2024, false),
        },
        {
          name: "Pretis Vogosca",
          specializationRu: "Артиллерийские боеприпасы",
          provenance: pv("Открытые источники компании", 2024, false),
        },
        {
          name: "BNT Travnik",
          specializationRu: "Миномёты и артиллерийские системы",
          provenance: pv("Открытые источники компании", 2024, false),
        },
      ],
      provenance: {
        source: "Открытые источники; SIPRI",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "средняя",
      shareNoteRu: "Тяжёлая техника — наследие; новые закупки малы (вертолёты США), зато собственный боеприпасный экспорт превышает импорт",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Вертолёты Huey II и одобренные AW119Kx, обучение",
          provenance: pv("DSCA", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Партнёрство с НАТО (план действий по членству приостановлен политически)", "EUFOR Althea (присутствие ЕС)"],
    vulnerabilities: [
      {
        titleRu: "Этническая фрагментация командования",
        descriptionRu: "Армия едина формально, но Республика Сербская периодически ставит под вопрос её существование; в кризисе лояльность полков по этническому признаку не гарантирована",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Минная загрязнённость",
        descriptionRu: "Около 2% территории до сих пор заминировано после войны 1990-х: сапёрная задача — главная реальная миссия армии в мирное время",
        severityRu: "средняя",
        provenance: pv("BHMAC; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Устаревание парка без замены",
        descriptionRu: "Танки и артиллерия наследия не имеют программы замены; боеспособность держится на боеприпасах собственного производства",
        severityRu: "средняя",
        provenance: pv("IISS; аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Точечные вертолётные закупки у США на фоне хронического недофинансирования",
      programs: [
        {
          nameRu: "Вертолёты AW119Kx",
          noteRu: "Продажа одобрена США; замена части UH-1H",
          provenance: pv("DSCA", 2024, true),
        },
      ],
      provenance: {
        source: "DSCA; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Внутренняя безопасность разделена между полициями энтитетов и кантонов; государственного МВД как единого органа нет",
    overallNoteRu: "Численность и парк — IISS; ВПК — открытые данные компаний, объёмы экспорта боеприпасов выросли после 2022 года",
  },
  {
    iso3: "CYP",
    name: "Cyprus",
    nameRu: "Кипр",
    region: "Европа",
    subregionRu: "Восточное Средиземноморье, разделённый остров (север — ТРСК под контролем Турции)",
    forcesStatusRu: "Регулярные силы: Национальная гвардия Кипра",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.55,
      amountNoteRu: "Около 0,5–0,6 млрд долл.; после снятия эмбарго США (2022) и газовых споров в ИЭЗ расходы растут",
      year: 2024,
      shareOfGdpPct: 1.8,
      trendRu: "Умеренный рост: вертолёты H145M, ПВО и морское наблюдение",
      provenance: {
        source: "SIPRI Military Expenditure Database",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 12000,
      reserve: 50000,
      paramilitary: null,
      noteRu: "Призывная армия греков-киприотов: около 12 тыс. активных и большой резерв (до 50 тыс.) при мобилизационной модели против турецкого контингента на севере (около 35–40 тыс.)",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: бронетанковые и механизированные бригады, спецназ",
      navyRu: "ВМС: морские патрульные корабли (OPV израильской и итальянской постройки), база в Мари",
      airForceRu: "Авиация национальной гвардии: вертолёты Ми-35 (выведены/проданы), AW139, H145M; боевой авиации нет",
      otherRu: "Командование спецопераций, береговая полиция",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Т-80У и AMX-30B2, БМП-3",
        roleRu: "Бронетанковое ядро против турецких сил на севере",
        quantityNoteRu: "82 Т-80У, около 50 БМП-3 — российское наследие 1990-х, обслуживание осложнено санкциями",
        originRu: "Россия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "ПВО",
        system: "Тор-М2Э и Бук-М2 (ранее), Barak MX (закупка)",
        roleRu: "ПВО острова",
        quantityNoteRu: "Советско-российские системы замещаются израильским Barak MX — поставки сообщены прессой в 2024 году",
        originRu: "Россия → Израиль (смена поставщика)",
        provenance: pv("IISS; открытая пресса", 2024, true),
      },
      {
        branchRu: "Артиллерия",
        system: "РСЗО «Град», САУ Zuzana и Nora B-52 (заказ)",
        roleRu: "Огневая поддержка",
        quantityNoteRu: "Сербские Nora B-52 заказаны как замена советским системам",
        originRu: "Словакия и Сербия",
        provenance: pv("IISS; открытая пресса", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "OPV типа Commodore Georgiou (Sa'ar 62) и Fincantieri",
        roleRu: "Контроль ИЭЗ и газовых месторождений",
        quantityNoteRu: "2–3 современных патрульных корабля",
        originRu: "Израиль и Италия",
        provenance: pv("IISS Military Balance", 2024, false),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты H145M и AW139",
        roleRu: "Лёгкая ударная и поисково-спасательная функции",
        quantityNoteRu: "6 H145M заказаны у Airbus, AW139 эксплуатируются с 2010-х",
        originRu: "Airbus (Германия/Италия)",
        provenance: pv("Airbus; IISS", 2024, false),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Значимого ВПК нет; ниша — беспилотные и морские технологии малых компаний",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Историческая зависимость от России по тяжёлой технике сменяется Израилем, Францией и Сербией после 2022 года; эмбарго США снято в 2022 году",
      suppliers: [
        {
          supplier: "Израиль",
          noteRu: "ПВО Barak MX, патрульные корабли, БПЛА",
          provenance: pv("SIPRI; открытая пресса", 2024, true),
        },
        {
          supplier: "Франция",
          noteRu: "Вертолёты, противокорабельные ракеты Exocet, партнёрство по ИЭЗ",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Россия (наследие)",
          noteRu: "Танки, БМП и ЗРК 1990–2010-х; обслуживание затруднено санкциями",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ЕС", "Трёхсторонние форматы с Грецией, Израилем и Египтом"],
    vulnerabilities: [
      {
        titleRu: "Турецкий контингент на севере",
        descriptionRu: "35–40 тыс. турецких военнослужащих с тяжёлой техникой на острове превосходят Национальную гвардию по всем компонентам; сдерживание держится на политике, а не на паритете",
        severityRu: "высокая",
        provenance: pv("IISS; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Переходный логистический разрыв",
        descriptionRu: "Отказ от российского парка без завершённой замены: танки и ЗРК наследия теряют обслуживание быстрее, чем поступают западные системы",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Газовая ИЭЗ как фронт",
        descriptionRu: "Споры с Турцией о шельфе Афродиты и других блоков делают флот и наблюдение критическими при малых силах",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Полная смена поставщиков: от России — к Израилю, Франции и Сербии, с акцентом на ПВО и море",
      programs: [
        {
          nameRu: "ПВО Barak MX",
          noteRu: "Израильская система средней дальности как новая основа ПВО (по сообщениям прессы, 2024)",
          provenance: pv("Открытая пресса", 2024, true),
        },
        {
          nameRu: "Расширение базы Мари",
          noteRu: "Модернизация военно-морской базы Evangelos Florakis при поддержке Франции",
          provenance: pv("Открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "Открытая пресса; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "На острове также развёрнуты миротворцы ООН (UNFICYP) вдоль буферной зоны с 1964 года",
    overallNoteRu: "Соотношение сил — по IISS; переход поставщиков — ключевой сюжет профиля, подтверждён открытыми контрактами",
  },
  {
    iso3: "ISL",
    name: "Iceland",
    nameRu: "Исландия",
    region: "Европа",
    subregionRu: "Северная Атлантика, страна-член НАТО без армии",
    forcesStatusRu: "Вооружённых сил нет; есть береговая охрана и кризисное подразделение полиции",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0.05,
      amountNoteRu: "Оборонных расходов в классическом смысле нет; бюджет береговой охраны и взносы в НАТО — порядка десятков млн долл.; НАТО учитывает около 0,3% ВВП «оборонных» трат",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Рост вкладов в инфраструктуру НАТО (Кефлавик) на фоне арктической повестки",
      provenance: {
        source: "НАТО; CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 250,
      noteRu: "Береговая охрана — около 250 человек; полицейское подразделение «Викинг» (Víkingasveitin) — антитеррористический спецназ; армии нет с XIX века",
      provenance: {
        source: "IISS Military Balance 2024; CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует",
      navyRu: "Береговая охрана выполняет военно-морские функции: 4 патрульных корабля (включая Thor)",
      airForceRu: "Отсутствует; ПВО — исландская радиолокационная система в рамках НАТО, воздушная полиция — ротации союзников из Кефлавика",
      otherRu: "Кризисное реагирующее подразделение МИД (участие в миротворчестве без оружия)",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли типа Thor (Þór)",
        roleRu: "Контроль ИЭЗ, поиск и спасание в Северной Атлантике",
        quantityNoteRu: "4 OPV и патрульные катера, 3 вертолёта Super Puma",
        originRu: "Чили/Дания (постройка), Airbus (вертолёты)",
        provenance: pv("Береговая охрана Исландии; IISS", 2024, false),
      },
      {
        branchRu: "ПВО",
        system: "Радиолокационная система Iceland Air Defence System",
        roleRu: "Контроль воздушного пространства в интересах НАТО",
        quantityNoteRu: "4 РЛС дальнего обнаружения, данные интегрированы в NATINAMDS",
        originRu: "НАТО / США",
        provenance: pv("НАТО", 2024, false),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо: оборона коллективная (НАТО)",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Закупок вооружений нет; техника береговой охраны — гражданские патрульные стандарты",
      suppliers: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["НАТО (учредитель, без армии)", "Двустороннее оборонное соглашение с США 1951 года", "NORDEFCO (наблюдательные форматы)"],
    vulnerabilities: [
      {
        titleRu: "Стратегическое положение при нулевых силах",
        descriptionRu: "Исландия — узел GIUK-прохода и арктических маршрутов: её территория критична для НАТО, но защищается исключительно ротациями союзников и инфраструктурой Кефлавика",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта; НАТО", 2024, true),
      },
      {
        titleRu: "Подводная инфраструктура",
        descriptionRu: "Кабели связи и будущие энергомаршруты Северной Атлантики некому защищать собственными силами при растущем внимании к «гибридным» инцидентам",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Инвестиции союзников в Кефлавик (стоянки P-8, инфраструктура) вместо национальных программ",
      programs: [
        {
          nameRu: "Модернизация Кефлавика силами США/НАТО",
          noteRu: "Регулярные ротации патрульных P-8 Poseidon и истребителей воздушной полиции НАТО",
          provenance: pv("НАТО; ВВС США", 2024, false),
        },
      ],
      provenance: {
        source: "НАТО",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Честный профиль страны без армии: реальные «силы» — береговая охрана и полицейский спецназ",
    overallNoteRu: "Нулевые значения численности — факт устройства государства, а не пропуск данных",
  },
  {
    iso3: "IRL",
    name: "Ireland",
    nameRu: "Ирландия",
    region: "Европа",
    subregionRu: "Атлантическое побережье Европы, нейтралитет вне НАТО",
    forcesStatusRu: "Регулярные силы: Силы обороны Ирландии (Óglaigh na hÉireann)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 1.3,
      amountNoteRu: "Около 1,2–1,3 млрд долл. — около 0,25% ВВП, один из самых низких уровней в Европе; правительство обещает рост к уровню «Level of Ambition 2»",
      year: 2024,
      shareOfGdpPct: 0.25,
      trendRu: "Медленный рост после отчёта Комиссии по силам обороны 2022 года; упирается в кадровый кризис",
      provenance: {
        source: "SIPRI Military Expenditure Database; правительство Ирландии",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 7800,
      reserve: 1700,
      paramilitary: null,
      noteRu: "Штатная численность 9 739 не добирается годами: фактический актив — около 7,5–8 тыс., недобор особенно в ВМС, где корабли простаивают без экипажей",
      provenance: {
        source: "IISS Military Balance 2024; парламентские отчёты Ирландии",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: две пехотные бригады, бронекавалерия на Mowag Piranha",
      navyRu: "Военно-морская служба: морские патрульные корабли (классы Samuel Beckett, Roisin), база Холбоулин",
      airForceRu: "Воздушный корпус: транспортные и учебные самолёты, вертолёты; боевой авиации и ПВО нет — небо де-факто прикрывает Великобритания по негласным договорённостям",
      otherRu: "Армейские рейнджеры (спецназ), инженерный и медицинский компоненты",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "OPV типа Samuel Beckett и Roisin",
        roleRu: "Патрулирование ИЭЗ (около 880 тыс. км²) и рыболовный контроль",
        quantityNoteRu: "6 патрульных кораблей, часть выведена в резерв из-за нехватки экипажей; 2 прибрежных корабля Lake-class получены из Новой Зеландии",
        originRu: "Великобритания (Babcock) и Новая Зеландия",
        provenance: pv("IISS Military Balance; ВМС Ирландии", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Mowag Piranha III",
        roleRu: "Бронетранспортёры и разведывательные машины",
        quantityNoteRu: "Около 80 машин швейцарского производства",
        originRu: "Швейцария (Mowag/GDELS)",
        provenance: pv("IISS Military Balance", 2024, false),
      },
      {
        branchRu: "Авиация",
        system: "C295 и PC-12 / PC-9",
        roleRu: "Морское патрулирование (2 C295 MPA), транспорт и обучение",
        quantityNoteRu: "2 морских патрульных C295 поставлены в 2023 году",
        originRu: "Airbus (Испания) и Pilatus (Швейцария)",
        provenance: pv("Airbus; IISS", 2024, false),
      },
      {
        branchRu: "ПВО",
        system: "RBS 70 и радиолокаторы Giraffe (модернизация обсуждается)",
        roleRu: "ПВО ближнего радиуса, фактически — объектового уровня",
        quantityNoteRu: "Единичные батареи; национальной системы ПВО нет, закупка РЛС запланирована",
        originRu: "Швеция (Saab)",
        provenance: pv("IISS; правительство Ирландии", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Собственного ВПК нет, кроме нишевых компаний двойного назначения (связь, БАС-навигация)",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Малые разовые закупки у европейских производителей; США и Великобритания — обучение и совместимость",
      suppliers: [
        {
          supplier: "Швейцария",
          noteRu: "БТР Piranha, учебные PC-9/PC-12",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
        {
          supplier: "Испания (Airbus)",
          noteRu: "Морские патрульные C295",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ЕС (PESCO)", "Партнёрство НАТО (без членства, нейтралитет)"],
    vulnerabilities: [
      {
        titleRu: "Кадровый кризис и нефункционирующий флот",
        descriptionRu: "Хронический недобор при конкуренции гражданского рынка труда: ВМС не могут вывести все корабли в море, ИЭЗ и подводные кабели фактически не патрулируются на требуемом уровне",
        severityRu: "высокая",
        provenance: pv("Комиссия по силам обороны Ирландии 2022; IISS", 2024, true),
      },
      {
        titleRu: "Отсутствие ПВО и слепота неба",
        descriptionRu: "Нет ни истребителей, ни РЛС полного цикла: первичная радиолокационная картина зависит от Великобритании, что для нейтральной страны — политически чувствительная зависимость",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; Комиссия 2022", 2024, true),
      },
      {
        titleRu: "Трансатлантические кабели",
        descriptionRu: "Через ирландские воды проходит значительная доля трансатлантического трафика: инциденты с «исследовательскими» судами РФ у побережья фиксировались прессой, ответа своими силами нет",
        severityRu: "средняя",
        provenance: pv("Открытая пресса; аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "План Level of Ambition 2: рост бюджета, закупка РЛС ПВО, морских патрульных самолётов уже выполнена, обсуждаются сонары и вертолёты",
      programs: [
        {
          nameRu: "Радиолокационная программа ПВО",
          noteRu: "Закупка первичных РЛС объявлена приоритетом; тендерные процедуры идут с 2023 года",
          provenance: pv("Правительство Ирландии", 2024, true),
        },
        {
          nameRu: "Обновление флота",
          noteRu: "Прибрежные патрульные корабли Lake-class из Новой Зеландии введены в 2023–2024 годах",
          provenance: pv("ВМС Ирландии", 2024, false),
        },
      ],
      provenance: {
        source: "Правительство Ирландии; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция Garda — невооружённая в повседневной службе; армия поддерживает её в кризисах (aid to civil power)",
    overallNoteRu: "Профиль опирается на официальный отчёт Комиссии 2022 года — редкий случай, когда слабости задокументированы самой страной",
  },
  {
    iso3: "LIE",
    name: "Liechtenstein",
    nameRu: "Лихтенштейн",
    region: "Европа",
    subregionRu: "Альпы, микрогосударство между Швейцарией и Австрией",
    forcesStatusRu: "Вооружённых сил нет (армия упразднена в 1868 году)",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет; безопасность финансируется как полицейская функция",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует",
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 125,
      noteRu: "Национальная полиция — около 125 сотрудников плюс вспомогательный персонал; внешняя безопасность — в таможенном и валютном союзе со Швейцарией",
      provenance: {
        source: "CIA World Factbook; правительство Лихтенштейна",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует с 1868 года",
      navyRu: "Отсутствует (нет выхода к морю)",
      airForceRu: "Отсутствует",
      otherRu: "Национальная полиция с подразделением специальных задач",
    },
    equipment: [],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет (есть точное машиностроение двойного назначения, не военное)",
      selfSufficiencyRu: "Не применимо",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет; полицейское оружие — европейское стрелковое",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Таможенный и валютный союз со Швейцарией (фактическая интеграция безопасности)"],
    vulnerabilities: [
      {
        titleRu: "Полная внешняя зависимость",
        descriptionRu: "Княжество не имеет ни армии, ни договора о гарантиях: безопасность держится на географии и швейцарском окружении",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо",
      programs: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    securityNoteRu: "Честный профиль без армии: единственный силовой орган — полиция",
    overallNoteRu: "Нули — факт, а не пропуск: армия упразднена более 150 лет назад",
  },
  {
    iso3: "LUX",
    name: "Luxembourg",
    nameRu: "Люксембург",
    region: "Европа",
    subregionRu: "Западная Европа, член НАТО и ЕС",
    forcesStatusRu: "Регулярные вооружённые силы (армия Люксембурга)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.7,
      amountNoteRu: "Около 0,6–0,75 млрд долл.; Люксембург наращивает расходы к 2% ВВП с учётом космических и киберкомпонентов, учитываемых НАТО широко",
      year: 2024,
      shareOfGdpPct: 0.8,
      trendRu: "Выраженный рост после 2022 года: спутники, А400М, кибер",
      provenance: {
        source: "SIPRI Military Expenditure Database; НАТО",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 1000,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 1 тыс. военнослужащих — одна из самых маленьких армий НАТО; вклад страны — нишевые способности: спутниковая связь, транспорт, разминирование, медицина",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: две пехотные роты, центр военной подготовки",
      navyRu: "Отсутствуют (нет выхода к морю)",
      airForceRu: "Отдельных ВВС нет; один A400M эксплуатируется совместно с Бельгией, люксембургский вклад в AWACS НАТО (самолёты зарегистрированы в Люксембурге)",
      otherRu: "Космический компонент (спутник GovSat), киберподразделение, военный оркестр и спорт",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "A400M Atlas (совместно с Бельгией)",
        roleRu: "Стратегический транспорт в интересах обеих стран и НАТО",
        quantityNoteRu: "1 самолёт в биннациональном подразделении в Мельсбруке",
        originRu: "Airbus (международный консорциум)",
        provenance: pv("IISS; Airbus", 2024, false),
      },
      {
        branchRu: "Космос и связь",
        system: "Спутник GovSat-1 (SES)",
        roleRu: "Защищённая спутниковая связь для НАТО и союзников",
        quantityNoteRu: "1 аппарат на геостационарной орбите, строится второй (LuxEOSys для наблюдения)",
        originRu: "Люксембург (SES) / международный подряд",
        provenance: pv("Правительство Люксембурга; SES", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронеавтомобили Dingo 2 и HMMWV",
        roleRu: "Разведка и мобильность",
        quantityNoteRu: "Десятки машин",
        originRu: "Германия и США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "БПЛА",
        system: "Малые БПЛА разведки (типа Integrator — по программе НАТО)",
        roleRu: "Тактическая разведка для сухопутных подразделений",
        quantityNoteRu: "Единицы систем, закупаются в рамках кооперации Бенилюкса",
        originRu: "США / международная кооперация",
        provenance: pv("IISS; открытая пресса", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: true,
      summaryRu: "Нишевой «ВПК» — космические услуги: SES/GovSat как мировой провайдер спутниковой связи для правительств",
      selfSufficiencyRu: "Не применимо к классическому вооружению; по спутниковой связи — экспортно значим",
      companies: [
        {
          name: "SES / GovSat",
          specializationRu: "Правительственная спутниковая связь, люксембургская штаб-квартира",
          provenance: pv("SES; правительство Люксембурга", 2024, false),
        },
      ],
      provenance: {
        source: "Открытые источники",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Всё классическое вооружение импортное; закупки малы и кооперативны (Бельгия, Германия, программы НАТО)",
      suppliers: [
        {
          supplier: "Германия",
          noteRu: "Бронетехника, экипировка",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Airbus / международные консорциумы",
          noteRu: "А400М через кооперацию с Бельгией",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["НАТО", "ЕС", "Бенилюкс (оборонная кооперация)"],
    vulnerabilities: [
      {
        titleRu: "Символический наземный компонент",
        descriptionRu: "Тысячная армия не способна к самостоятельной территориальной обороне: функция страны в НАТО — нишевые услуги, а не боевые части",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Зависимость финансовой модели",
        descriptionRu: "Оборонные амбиции (космос, 2% ВВП) зависят от статуса финансового центра; регуляторные шоки бьют и по оборонному бюджету",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Рост к целям НАТО через космос, кибер и совместные платформы, а не через численность",
      programs: [
        {
          nameRu: "Спутник наблюдения LuxEOSys",
          noteRu: "Собственный разведывательный спутник оптического наблюдения, запуск планировался на середину 2020-х",
          provenance: pv("Правительство Люксембурга", 2024, true),
        },
      ],
      provenance: {
        source: "Правительство Люксембурга; НАТО",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция великого герцогства — основной повседневный силовой орган",
    overallNoteRu: "Пример «нишевой» модели членства в НАТО: вклад услугами вместо массы",
  },
  {
    iso3: "MNE",
    name: "Montenegro",
    nameRu: "Черногория",
    region: "Европа",
    subregionRu: "Западные Балканы, побережье Адриатики, член НАТО с 2017 года",
    forcesStatusRu: "Регулярные вооружённые силы",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.13,
      amountNoteRu: "Около 0,12–0,14 млрд долл., около 1,9% ВВП — высокий относительный уровень при малой абсолютной сумме",
      year: 2024,
      shareOfGdpPct: 1.9,
      trendRu: "Рост: вертолёты Bell, патрульные катера и радиолокаторы НАТО",
      provenance: {
        source: "SIPRI Military Expenditure Database; НАТО",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 2350,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 2,3 тыс. профессиональных военнослужащих; упор на горную пехоту и вклад в миссии альянса",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотный батальон, горные и специальные подразделения",
      navyRu: "ВМС: патрульные корабли югославского наследия (фрегаты типа Kotor на модернизации/выводе), база Бар",
      airForceRu: "Авиация: вертолёты Bell 412 и Bell 505; ПВО — радиолокационный пост НАТО на горе Бъеласица (объект в Марезе)",
      otherRu: "Военная полиция, почётная гвардия",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "Вертолёты Bell 412EP и Bell 505",
        roleRu: "Транспорт, патрулирование, спасание",
        quantityNoteRu: "2 Bell 412 и 2 Bell 505 поставлены в 2018–2020 годах",
        originRu: "США (Bell Textron)",
        provenance: pv("IISS Military Balance", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронеавтомобили JLTV (Oshkosh)",
        roleRu: "Мобильность пехоты — первая значимая закупка стандарта НАТО",
        quantityNoteRu: "Заказано около 87 машин, поставки с 2023 года",
        originRu: "США",
        provenance: pv("DSCA; открытая пресса", 2024, false),
      },
      {
        branchRu: "Флот",
        system: "Патрульные корабли и бывшие фрегаты типа Kotor",
        roleRu: "Контроль территориальных вод",
        quantityNoteRu: "Фрегаты выведены/на модернизации, основа — патрульные катера; обсуждается закупка OPV у Франции",
        originRu: "Югославия (наследие) / Франция (планы)",
        provenance: pv("IISS; открытая пресса", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: true,
      summaryRu: "Остатки югославского ВПК: завод Tara в Мойковце (стрелковое оружие и пиротехника)",
      selfSufficiencyRu: "Низкая: только лёгкое вооружение и боеприпасы",
      companies: [
        {
          name: "Tara Group (Мойковац)",
          specializationRu: "Стрелковое оружие, пиротехника, средства нелетального действия",
          provenance: pv("Открытые источники компании", 2024, true),
        },
      ],
      provenance: {
        source: "Открытые источники",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "США — главный поставщик новой техники; Израиль — модернизация вертолётов в прошлом, Словения/Сербия — региональные связи",
      suppliers: [
        {
          supplier: "США",
          noteRu: "JLTV, вертолёты Bell, обучение",
          provenance: pv("SIPRI; DSCA", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["НАТО"],
    vulnerabilities: [
      {
        titleRu: "Политическая поляризация вокруг НАТО",
        descriptionRu: "Про сербская часть общества и СПЦ оспаривают атлантический курс: оборонная политика — заложник коалиционных кризисов",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Масштаб сил",
        descriptionRu: "2,3 тыс. человек и отсутствие ПВО/бронетехники делают страну полностью зависимой от коллективной обороны даже при высоком % ВВП",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Переход на стандарты НАТО малыми партиями: JLTV, вертолёты, радары и планируемые OPV",
      programs: [
        {
          nameRu: "Патрульные корабли OPV",
          noteRu: "Переговоры с французской Kership о двух OPV для ВМС",
          provenance: pv("Открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "Открытая пресса; МО Черногории",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция и агентство национальной безопасности — повседневный контур; армия мала и профессиональна",
    overallNoteRu: "Данные IISS/SIPRI полны; закупки малы и хорошо документированы",
  },
  {
    iso3: "MKD",
    name: "North Macedonia",
    nameRu: "Северная Македония",
    region: "Европа",
    subregionRu: "Западные Балканы, страна без выхода к морю, член НАТО с 2020 года",
    forcesStatusRu: "Регулярные вооружённые силы (Армия Республики Северная Македония)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.35,
      amountNoteRu: "Около 0,33–0,37 млрд долл., выше 2% ВВП — формально один из лучших показателей альянса за счёт малой экономики",
      year: 2024,
      shareOfGdpPct: 2.2,
      trendRu: "Рост после вступления в НАТО: JLTV, Stryker, артиллерия и ПВО из Турции и США",
      provenance: {
        source: "SIPRI Military Expenditure Database; НАТО",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 8000,
      reserve: 4850,
      paramilitary: null,
      noteRu: "Около 8 тыс. активных при штате, который хронически не добирается; страна передала Украине танки Т-72 и Су-25 в 2022 году",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: механизированная бригада, батальон спецназа «Волки», рейнджеры",
      navyRu: "Отсутствуют (нет выхода к морю), речной компонент на Охридском озере",
      airForceRu: "Авиационная бригада: вертолёты Ми-8/Ми-24 (часть передана Украине), Bell 206; истребителей нет",
      otherRu: "Военная полиция, почётный батальон",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "БТР Stryker и бронеавтомобили JLTV",
        roleRu: "Новое ядро механизированной бригады по стандарту США",
        quantityNoteRu: "Заказаны 42 Stryker и партия JLTV, поставки с 2023–2024 годов",
        originRu: "США",
        provenance: pv("DSCA; IISS", 2024, false),
      },
      {
        branchRu: "Артиллерия",
        system: "Гаубицы BORAN 105 мм",
        roleRu: "Лёгкая буксируемая артиллерия турецкого производства",
        quantityNoteRu: "Партия поставлена Турцией в 2023 году — первая новая артиллерия за десятилетия",
        originRu: "Турция (MKE)",
        provenance: pv("Открытая пресса; MKE", 2024, false),
      },
      {
        branchRu: "ПВО",
        system: "ЗРК малой дальности (закупка у Турции/Франции обсуждается), ПЗРК",
        roleRu: "ПВО фактически отсутствует выше уровня ПЗРК",
        quantityNoteRu: "Программы Mistral/Hisar обсуждаются с 2022 года без завершённых поставок на 2024 год",
        originRu: "Планируемые поставщики — Франция / Турция",
        provenance: pv("Открытая пресса", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты Ми-8 и Bell 206",
        roleRu: "Транспорт и обучение",
        quantityNoteRu: "Около десятка бортов после передачи части парка Украине",
        originRu: "СССР / США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Значимого ВПК нет, кроме ремонтных мощностей и малых производителей экипировки",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "США и Турция — два столпа перевооружения; Болгария и Сербия — региональные связи наследия",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Stryker, JLTV, обучение, гранты FMF",
          provenance: pv("SIPRI; DSCA", 2024, false),
        },
        {
          supplier: "Турция",
          noteRu: "Артиллерия BORAN, экипировка, обучение",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["НАТО"],
    vulnerabilities: [
      {
        titleRu: "Отсутствие ПВО и авиации",
        descriptionRu: "Страна без выхода к морю и без истребителей: воздушная полиция выполняется союзниками (Греция, Италия по ротации), собственной системы ПВО нет",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта; НАТО", 2024, true),
      },
      {
        titleRu: "Отданный Украине парк",
        descriptionRu: "Передача Т-72 и Су-25 в 2022 году политически сильна, но оставила армию без танков и штурмовиков до завершения американских поставок",
        severityRu: "средняя",
        provenance: pv("IISS; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Межэтническая чувствительность",
        descriptionRu: "Албанское меньшинство (около четверти населения) и опыт конфликта 2001 года требуют аккуратного комплектования и командования",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Самая активная модернизация малых стран НАТО региона: американская бронетехника, турецкая артиллерия, в планах — ПВО",
      programs: [
        {
          nameRu: "Пакет Stryker/JLTV",
          noteRu: "Формирование механизированной бригады стандарта НАТО к 2028 году по плану модернизации",
          provenance: pv("МО Северной Македонии; DSCA", 2024, true),
        },
      ],
      provenance: {
        source: "МО Северной Македонии; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция МВД — основной внутренний контур; армия ориентирована на вклад в НАТО",
    overallNoteRu: "Данные полны; программы закупок хорошо задокументированы DSCA и производителями",
  },
  {
    iso3: "SVN",
    name: "Slovenia",
    nameRu: "Словения",
    region: "Европа",
    subregionRu: "Центральная Европа / северные Балканы, короткий выход к Адриатике",
    forcesStatusRu: "Регулярные вооружённые силы, член НАТО и ЕС",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.85,
      amountNoteRu: "Около 0,8–0,9 млрд долл., порядка 1,3% ВВП — ниже цели НАТО, рост обещан к 2030 году",
      year: 2024,
      shareOfGdpPct: 1.3,
      trendRu: "Медленный рост: Boxer/JLTV, C-27J Spartan, ПВО IRIS-T (обсуждение)",
      provenance: {
        source: "SIPRI Military Expenditure Database; НАТО",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 6200,
      reserve: 1500,
      paramilitary: null,
      noteRu: "Около 6,2 тыс. профессиональных военных при хроническом недоборе; две бригады — пехотная и моторизованная",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотная и моторизованная бригады, горный батальон",
      navyRu: "Морской дивизион: 2 патрульных корабля (Ankaran и Triglav — российский проект, модернизирован)",
      airForceRu: "Авиационная бригада: PC-9M Hudournik (вооружённые УТС), вертолёты Cougar и Bell, транспортный C-27J",
      otherRu: "Военная полиция, подразделение ПВО с Roland (выводится) и ПЗРК Igla",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "БТР Boxer и бронеавтомобили JLTV",
        roleRu: "Новое ядро моторизованной бригады",
        quantityNoteRu: "45 Boxer заказаны через OCCAR, 38 JLTV поставлены США",
        originRu: "Германия (консорциум) и США",
        provenance: pv("OCCAR; DSCA; IISS", 2024, false),
      },
      {
        branchRu: "Авиация",
        system: "PC-9M Hudournik",
        roleRu: "Вооружённый учебный самолёт, лёгкая поддержка",
        quantityNoteRu: "9 машин швейцарского Pilatus, модернизированы в Израиле",
        originRu: "Швейцария / Израиль (модернизация)",
        provenance: pv("IISS Military Balance", 2024, false),
      },
      {
        branchRu: "Авиация",
        system: "C-27J Spartan",
        roleRu: "Тактический транспорт — первый настоящий транспортник страны",
        quantityNoteRu: "2 самолёта поставлены Италией в 2023–2024 годах",
        originRu: "Италия (Leonardo)",
        provenance: pv("Leonardo; IISS", 2024, false),
      },
      {
        branchRu: "Флот",
        system: "Патрульный корабль Triglav (проект «Светляк»)",
        roleRu: "Контроль территориальных вод и поиск-спасание",
        quantityNoteRu: "1 корабль российской постройки (2010), модернизирован; второй вымпел — Ankaran словенской постройки",
        originRu: "Россия (наследие поставок) / Словения",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: true,
      summaryRu: "Нишевой ВПК: БПЛА и тренажёры (C-Astral), оптика и прицелы, боеприпасы малых калибров",
      selfSufficiencyRu: "Низкая по платформам, заметная по нишевым БПЛА и тренажёрам на экспорт",
      companies: [
        {
          name: "C-Astral",
          specializationRu: "Тактические БПЛА (Bramor и др.), экспорт в страны НАТО",
          provenance: pv("Открытые источники компании", 2024, false),
        },
        {
          name: "Arex",
          specializationRu: "Боеприпасы и учебные боеприпасы, полимерные магазины",
          provenance: pv("Открытые источники компании", 2024, true),
        },
      ],
      provenance: {
        source: "Открытые источники",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Германия, США и Италия — поставщики платформ; собственная ниша БПЛА частично компенсирует зависимость",
      suppliers: [
        {
          supplier: "Германия",
          noteRu: "БТР Boxer через OCCAR",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
        {
          supplier: "США",
          noteRu: "JLTV, вертолёты наследия, обучение",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
        {
          supplier: "Италия",
          noteRu: "C-27J Spartan",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["НАТО", "ЕС"],
    vulnerabilities: [
      {
        titleRu: "Недобор личного состава",
        descriptionRu: "Армия годами не добирает штат при высокой занятости населения: бригады укомплектованы не полностью, резерв формален",
        severityRu: "средняя",
        provenance: pv("IISS; парламентские отчёты Словении", 2024, true),
      },
      {
        titleRu: "Политические качели оборонной политики",
        descriptionRu: "Смена правительств пересматривает закупки (спор о Boxer, референдумные инициативы): длинные программы не защищены от электорального цикла",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Сфокусированная модернизация моторизованной бригады и транспорта; ПВО — следующий приоритет",
      programs: [
        {
          nameRu: "Программа Boxer",
          noteRu: "45 БТР через OCCAR — крупнейшая закупка в истории страны",
          provenance: pv("OCCAR", 2024, false),
        },
      ],
      provenance: {
        source: "OCCAR; МО Словении",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция — повседневный контур; армия активно задействована в ликвидации наводнений и ЧС",
    overallNoteRu: "Данные полны и прозрачны; страна — пример малой профессиональной армии нишевой специализации",
  },
  {
    iso3: "CHE",
    name: "Switzerland",
    nameRu: "Швейцария",
    region: "Европа",
    subregionRu: "Альпы, нейтралитет, милиционная система",
    forcesStatusRu: "Вооружённые силы милиционного типа с малым профессиональным ядром",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 6.3,
      amountNoteRu: "Около 6–6,5 млрд долл. (порядка 5,5–6 млрд франков); парламент одобрил рост к 1% ВВП к 2030-м годам",
      year: 2024,
      shareOfGdpPct: 0.7,
      trendRu: "Рост после 2022 года: F-35A, Patriot, Bodenluv 2020 (ПВО средней дальности)",
      provenance: {
        source: "SIPRI Military Expenditure Database; парламент Швейцарии",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 21350,
      reserve: 130000,
      paramilitary: null,
      noteRu: "Профессиональное ядро — около 21 тыс., милиционный состав по закону — около 100–147 тыс. с учётом обученного резерва; всеобщая воинская обязанность мужчин сохраняется",
      provenance: {
        source: "IISS Military Balance 2024; VBS/DDPS",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: 4 территориальные дивизии, танковые и механизированные бригады (Leopard 2)",
      navyRu: "Отсутствует как вид (нет выхода к морю); патрульные катера на озёрах в составе инженерных войск",
      airForceRu: "ВВС: F/A-18 Hornet, с конца 2020-х — F-35A; ПВО — Patriot и система средней дальности по программе Bodenluv",
      otherRu: "Спецназ (AAD 10, Grenadiers), военная полиция, служба защиты от ОМП",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "F/A-18C/D Hornet → F-35A Lightning II",
        roleRu: "Истребительная авиация и воздушная полиция",
        quantityNoteRu: "30 Hornet; заказаны 36 F-35A, поставки с 2027 года",
        originRu: "США",
        provenance: pv("DSCA; правительство Швейцарии", 2024, false),
      },
      {
        branchRu: "ПВО",
        system: "Patriot PAC-3+ и IRIS-T SLM (Bodenluv 2020)",
        roleRu: "ПВО большой и средней дальности — впервые с эпохи Bloodhound",
        quantityNoteRu: "5 батарей Patriot заказаны; IRIS-T SLM выбрана для средней дальности",
        originRu: "США и Германия (Diehl)",
        provenance: pv("Правительство Швейцарии; Diehl", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Leopard 2 (Pz 87) и БМП CV9030 (Spz 2000)",
        roleRu: "Бронетанковое ядро механизированных бригад",
        quantityNoteRu: "134 Leopard 2 на вооружении (часть парка продана обратно Германии в 2023 году), 186 CV90",
        originRu: "Германия и Швеция",
        provenance: pv("IISS Military Balance", 2024, false),
      },
      {
        branchRu: "Артиллерия",
        system: "САУ PzHb 88/95 (M109 KAWEST) и миномёты",
        roleRu: "Огневая поддержка",
        quantityNoteRu: "Около 130 модернизированных M109; обсуждается колёсная замена",
        originRu: "США / собственная модернизация RUAG",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "БПЛА",
        system: "Hermes 900 (ADS 15)",
        roleRu: "Разведка — замена Ranger",
        quantityNoteRu: "6 систем израильского производства, ввод в строй растянулся из-за доработок",
        originRu: "Израиль (Elbit)",
        provenance: pv("Правительство Швейцарии; IISS", 2024, false),
      },
    ],
    defenseIndustry: {
      hasIndustry: true,
      summaryRu: "Развитый нишевой ВПК при экспортном контроле нейтралитета: бронетехника, боеприпасы, тренажёры, авиационные компоненты",
      selfSufficiencyRu: "Средняя: боеприпасы, бронетехника и обслуживание — свои; истребители и ЗРК — импорт",
      companies: [
        {
          name: "RUAG",
          specializationRu: "Обслуживание авиации и наземных систем, боеприпасы (отделение Ammotec продано Beretta)",
          provenance: pv("RUAG; открытая пресса", 2024, false),
        },
        {
          name: "GDELS-Mowag",
          specializationRu: "Бронеавтомобили Piranha и Eagle",
          provenance: pv("GDELS", 2024, false),
        },
        {
          name: "Pilatus",
          specializationRu: "Учебные самолёты PC-7/PC-21, PC-24",
          provenance: pv("Pilatus", 2024, false),
        },
        {
          name: "Rheinmetall Air Defence (Цюрих, бывш. Oerlikon)",
          specializationRu: "Зенитная артиллерия и системы Skynex/Skyguard",
          provenance: pv("Rheinmetall", 2024, false),
        },
      ],
      provenance: {
        source: "Открытые источники компаний",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "средняя",
      shareNoteRu: "Крупнейшие программы (F-35, Patriot) — американские, что вызывает внутриполитические споры о суверенитете нейтральной страны",
      suppliers: [
        {
          supplier: "США",
          noteRu: "F-35A, Patriot, ранее F/A-18",
          provenance: pv("SIPRI; DSCA", 2024, false),
        },
        {
          supplier: "Германия",
          noteRu: "Leopard 2, IRIS-T SLM",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
        {
          supplier: "Израиль",
          noteRu: "БПЛА Hermes 900, модернизация систем",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Нейтралитет (без военных союзов)", "Партнёрство НАТО PfP"],
    vulnerabilities: [
      {
        titleRu: "Прямая демократия против длинных программ",
        descriptionRu: "Референдумы уже блокировали закупку Gripen (2014) и едва не заблокировали F-35: каждая крупная программа проходит народное голосование и годы споров",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Разрыв боеготовности мирного времени",
        descriptionRu: "Милиционная модель даёт массу при мобилизации, но в мирное время боеготово мало частей; воздушная полиция F/A-18 ограничена по часам и готовности",
        severityRu: "средняя",
        provenance: pv("IISS; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Экспортный контроль как уязвимость ВПК",
        descriptionRu: "Запрет реэкспорта швейцарских боеприпасов Украине (2022–2023) ударил по репутации поставщиков и заказам собственного ВПК",
        severityRu: "средняя",
        provenance: pv("Открытая пресса; аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Крупнейший закупочный цикл за десятилетия: F-35A, Patriot, ПВО средней дальности, новые БТР и артиллерия обсуждаются",
      programs: [
        {
          nameRu: "Air2030",
          noteRu: "F-35A (36) и Patriot (5 батарей) — контракт подписан в 2022 году вопреки инициативе противников",
          provenance: pv("Правительство Швейцарии", 2024, false),
        },
      ],
      provenance: {
        source: "Правительство Швейцарии; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Внутренний порядок — кантональные полиции; армия — резерв государства на случай войны и катастроф",
    overallNoteRu: "Данные максимально прозрачны (официальные отчёты VBS); численность дана в двух смыслах — ядро и милиция",
  },
  {
    iso3: "MDA",
    name: "Moldova",
    nameRu: "Молдова",
    region: "Восточная Европа",
    subregionRu: "Между Румынией и Украиной, нейтралитет по конституции, Приднестровье вне контроля Кишинёва",
    forcesStatusRu: "Регулярные силы: Национальная армия Молдовы",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.11,
      amountNoteRu: "Около 0,1 млрд долл., порядка 0,6% ВВП — один из самых низких уровней Европы; после 2022 года растёт при поддержке ЕС (EPF) и Румынии",
      year: 2024,
      shareOfGdpPct: 0.6,
      trendRu: "Рост с низкой базы: радары, БПЛА, инженерная техника по линии Европейского фонда мира",
      provenance: {
        source: "SIPRI Military Expenditure Database; ЕС (EPF)",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 5150,
      reserve: null,
      paramilitary: 2400,
      noteRu: "Около 5 тыс. военнослужащих смешанного комплектования; карабинеры МВД — второй контур; в Приднестровье — отдельный российский контингент (ОГРВ, около 1,5 тыс.) и приднестровские формирования вне контроля Кишинёва",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: три мотострелковые бригады, артиллерийский и инженерный компоненты наследия СССР",
      navyRu: "Отсутствуют (выход к Дунаю есть, флота нет)",
      airForceRu: "Авиации фактически нет: МиГ-29 проданы/утилизированы в 1990–2000-е, вертолётов единицы; небо не контролируется своими РЛС до поставок 2023–2024 годов",
      otherRu: "Карабинеры, пограничная полиция, батальон специального назначения Fulger",
    },
    equipment: [
      {
        branchRu: "ПВО",
        system: "Радар Ground Master 200 (Thales)",
        roleRu: "Первый современный радиолокационный контроль неба",
        quantityNoteRu: "1 комплекс поставлен Францией в 2023 году при финансировании ЕС; второй заказан",
        originRu: "Франция",
        provenance: pv("Правительство Молдовы; Thales", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "БТР Piranha III (передача Германии)",
        roleRu: "Мобильность пехоты",
        quantityNoteRu: "19 машин переданы Германией в 2023 году",
        originRu: "Германия (из запасов Бундесвера)",
        provenance: pv("Правительство Германии; открытая пресса", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Наследие СССР: БТР-80, РСЗО «Ураган», гаубицы",
        roleRu: "Основа парка",
        quantityNoteRu: "Десятки единиц, состояние низкое, боеприпасы ограничены",
        originRu: "СССР (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "БПЛА",
        system: "Малые БПЛА наблюдения (поставки по линии EPF и США)",
        roleRu: "Разведка и контроль границы",
        quantityNoteRu: "Единицы систем, программы разворачиваются с 2023 года",
        originRu: "ЕС / США (помощь)",
        provenance: pv("ЕС (EPF); открытая пресса", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет; советские ремонтные мощности деградировали",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "С 2022 года поставки — преимущественно безвозмездная помощь: ЕС (EPF — десятки млн евро), Румыния, Германия, США, Франция",
      suppliers: [
        {
          supplier: "ЕС (Европейский фонд мира)",
          noteRu: "Радары, БПЛА, инженерная и медицинская техника",
          provenance: pv("Совет ЕС", 2024, false),
        },
        {
          supplier: "Румыния",
          noteRu: "Обучение, экипировка, политическая поддержка евроинтеграции обороны",
          provenance: pv("Открытая пресса", 2024, true),
        },
        {
          supplier: "Германия",
          noteRu: "БТР Piranha из запасов",
          provenance: pv("Правительство Германии", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; Совет ЕС",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Нейтралитет по конституции", "Партнёрство НАТО PfP", "Кандидат в ЕС"],
    vulnerabilities: [
      {
        titleRu: "Приднестровье и российский контингент",
        descriptionRu: "ОГРВ России и склад боеприпасов в Колбасне (около 20 тыс. тонн) вне контроля Кишинёва: постоянный рычаг давления и риск инцидентов на фоне войны в соседней Украине",
        severityRu: "высокая",
        provenance: pv("IISS; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Отсутствие ПВО и авиации",
        descriptionRu: "До 2023 года страна не видела собственное небо: пролёты ракет над территорией в ходе войны в Украине фиксировались постфактум; GM200 — только первый шаг",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Энергетическая и гибридная уязвимость",
        descriptionRu: "Зависимость от приднестровской генерации и российского газа, кампании дезинформации и подкуп избирателей (по заявлениям властей) — главный фронт безопасности проходит вне армии",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; заявления властей Молдовы", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Впервые за 30 лет — системная внешняя помощь модернизации: радары, мобильность, БПЛА, кибер",
      programs: [
        {
          nameRu: "Пакеты EPF для Молдовы",
          noteRu: "Несколько траншей ЕС суммарно на десятки млн евро: нелетальная и оборонительная техника",
          provenance: pv("Совет ЕС", 2024, false),
        },
        {
          nameRu: "Стратегия национальной безопасности 2023 года",
          noteRu: "Россия впервые названа угрозой; цель — рост оборонных расходов и совместимость с ЕС/НАТО при сохранении нейтралитета",
          provenance: pv("Правительство Молдовы", 2024, false),
        },
      ],
      provenance: {
        source: "Совет ЕС; правительство Молдовы",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Карабинеры и полиция — повседневный контур; армия мала и долгое время финансировалась по остаточному принципу",
    overallNoteRu: "Численность и парк — IISS; программы помощи — официальные решения ЕС, суммы округлены",
  },
  {
    iso3: "MCO",
    name: "Monaco",
    nameRu: "Монако",
    region: "Европа",
    subregionRu: "Лазурный берег, микрогосударство под защитой Франции",
    forcesStatusRu: "Вооружённых сил нет; есть карабинеры князя и полиция",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет: оборона — функция Франции по договору 2002 года",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует",
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 550,
      noteRu: "Рота карабинеров князя — около 120 человек (церемониал и охрана), полиция — около 500 сотрудников при населении менее 40 тыс.",
      provenance: {
        source: "CIA World Factbook; правительство Монако",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует",
      navyRu: "Отсутствует; морской контроль — полиция моря и французские силы",
      airForceRu: "Отсутствует",
      otherRu: "Карабинеры князя, полиция, пожарная служба с военным статусом (Compagnie des Sapeurs-Pompiers)",
    },
    equipment: [],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Договор с Францией о защите (2002)"],
    vulnerabilities: [
      {
        titleRu: "Полная внешняя зависимость",
        descriptionRu: "Безопасность княжества — производная французской политики; собственных инструментов нет по замыслу",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо",
      programs: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    securityNoteRu: "Честный профиль без армии: карабинеры — охрана дворца и церемониал, полиция — одна из самых плотных в мире на душу населения",
    overallNoteRu: "Нулевые значения — факт государственного устройства",
  },
  {
    iso3: "SMR",
    name: "San Marino",
    nameRu: "Сан-Марино",
    region: "Европа",
    subregionRu: "Апеннины, микрогосударство внутри Италии",
    forcesStatusRu: "Церемониальные военные корпуса без боевых функций",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Оборонного бюджета нет; расходы на церемониальные корпуса символические",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует",
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 80,
      noteRu: "Гвардия Скалы и арбалетный корпус — добровольные церемониальные формирования суммарно в десятки человек; полиция и жандармерия — реальные силовые органы",
      provenance: {
        source: "CIA World Factbook; правительство Сан-Марино",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует как боевая сила; гвардия Скалы — церемониал",
      navyRu: "Отсутствует (нет выхода к морю)",
      airForceRu: "Отсутствует",
      otherRu: "Жандармерия, гражданская полиция, арбалетный корпус (историческая традиция)",
    },
    equipment: [],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Фактический зонтик Италии (окружение и соглашения о дружбе)"],
    vulnerabilities: [
      {
        titleRu: "Полная внешняя зависимость",
        descriptionRu: "Старейшая республика мира существует без армии за счёт географии внутри Италии; рисков военного характера не идентифицируется",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо",
      programs: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    securityNoteRu: "Честный профиль без армии: гвардия Скалы проводит смену караула у правительственного дворца",
    overallNoteRu: "Нули — факт; профиль включён ради полноты реестра",
  },
  {
    iso3: "ATG",
    name: "Antigua and Barbuda",
    nameRu: "Антигуа и Барбуда",
    region: "Центральная Америка и Карибы",
    subregionRu: "Малые Антильские острова, Восточные Карибы",
    forcesStatusRu: "Малые регулярные силы: Силы обороны Антигуа и Барбуды (ABDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.01,
      amountNoteRu: "Порядка 10 млн долл.; оборона — символическая статья бюджета туристической экономики",
      year: 2024,
      shareOfGdpPct: 0.6,
      trendRu: "Стабильный минимум",
      provenance: {
        source: "Оценка проекта по CIA World Factbook и IISS (Caribbean)",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 260,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 260 военнослужащих: пехотная рота, береговая охрана, кадетский корпус; реальная безопасность — полиция и региональная система RSS",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутный компонент: пехотная рота и инженерное подразделение",
      navyRu: "Береговая охрана: 3 патрульных катера",
      airForceRu: "Отсутствует",
      otherRu: "Кадетский корпус, служба поддержки",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные катера (типов Damen и американской передачи)",
        roleRu: "Контроль вод, борьба с наркотрафиком",
        quantityNoteRu: "3 катера, состояние зависит от американской помощи",
        originRu: "США / Нидерланды",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Стрелковое оружие и лёгкие автомобили",
        roleRu: "Церемониал, ЧС, поддержка полиции",
        quantityNoteRu: "Только лёгкое вооружение",
        originRu: "США и Великобритания",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "США — донор техники и обучения через программы безопасности Карибского бассейна (CBSI)",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Катера, обучение, оборудование связи",
          provenance: pv("Госдепартамент США (CBSI)", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Региональная система безопасности RSS (Восточные Карибы)", "КАРИКОМ"],
    vulnerabilities: [
      {
        titleRu: "Наркотрафик и ураганы",
        descriptionRu: "Главные угрозы — транзит наркотиков и сезон ураганов: силы обороны востребованы как спасатели, а не как армия",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Масштаб сил",
        descriptionRu: "260 человек не обеспечивают даже полный контроль собственных вод без региональной системы RSS",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; обновления — за счёт донорских передач",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция Антигуа и Барбуды — основной силовой орган; ABDF поддерживает её при ЧС",
    overallNoteRu: "Микросилы островного государства: профиль фиксирует реальный, а не номинальный масштаб",
  },
  {
    iso3: "BHS",
    name: "Bahamas",
    nameRu: "Багамские Острова",
    region: "Центральная Америка и Карибы",
    subregionRu: "Архипелаг у побережья Флориды, наркотранзит в США",
    forcesStatusRu: "Регулярные силы морского профиля: Королевские силы обороны Багам (RBDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.09,
      amountNoteRu: "Порядка 80–100 млн долл.; расходы определяются задачами морского патрулирования и миграции",
      year: 2024,
      shareOfGdpPct: 0.7,
      trendRu: "Стабильный уровень с вложениями в базы (проект Sandy Bottom)",
      provenance: {
        source: "Оценка проекта по IISS и бюджету Багам",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 1500,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 1,5 тыс. человек — фактически береговая охрана с морской пехотой: сухопутной армии как таковой нет",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутный компонент: рота морской пехоты для охраны объектов и поддержки полиции",
      navyRu: "Ядро сил: эскадра патрульных кораблей (классы Bahamas и легенда HMBS), база Корал-Харбор",
      airForceRu: "Авиационное крыло: лёгкие самолёты наблюдения и вертолёты в малом числе",
      otherRu: "Коммандос-эскадрилья (спецподразделение), отряд борьбы с наркотиками совместно с полицией и США (OPBAT)",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли Damen Stan Patrol",
        roleRu: "Контроль архипелага, перехват наркотрафика и мигрантов",
        quantityNoteRu: "9 кораблей и катеров поставлены Damen в рамках проекта Sandy Bottom (2014–2018)",
        originRu: "Нидерланды (Damen)",
        provenance: pv("Damen; IISS", 2024, false),
      },
      {
        branchRu: "Авиация",
        system: "Лёгкие самолёты наблюдения (King Air / Cessna Caravan — по открытым данным)",
        roleRu: "Воздушное патрулирование совместно с OPBAT США",
        quantityNoteRu: "Единицы бортов",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Нидерланды — поставщик флота, США — партнёр по операциям (OPBAT с вертолётами береговой охраны США)",
      suppliers: [
        {
          supplier: "Нидерланды (Damen)",
          noteRu: "Патрульные корабли проекта Sandy Bottom",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
        {
          supplier: "США",
          noteRu: "Совместные операции OPBAT, обучение, связь",
          provenance: pv("Южное командование США", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["КАРИКОМ", "Оперативное сотрудничество с США (OPBAT, CBSI)"],
    vulnerabilities: [
      {
        titleRu: "700 островов при одной эскадре",
        descriptionRu: "Архипелаг протяжённостью 900 км невозможно патрулировать девятью вымпелами: наркотрафик и миграция из Гаити остаются системными",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Ураганная уязвимость баз",
        descriptionRu: "Ураган Дориан (2019) показал: инфраструктура RBDF сама — объект спасательных операций, а не только их исполнитель",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Проект Sandy Bottom завершён; текущий фокус — базы на Инагуа и Раггед-Айленд и беспилотное наблюдение",
      programs: [
        {
          nameRu: "Южная база RBDF",
          noteRu: "Расширение присутствия на южных островах против миграционных и наркопотоков",
          provenance: pv("Правительство Багам", 2024, true),
        },
      ],
      provenance: {
        source: "Правительство Багам; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция Багам — отдельный крупный орган; RBDF юридически — единственные вооружённые силы",
    overallNoteRu: "Профиль морской микродержавы: «армия» здесь — береговая охрана по функциям",
  },
  {
    iso3: "BRB",
    name: "Barbados",
    nameRu: "Барбадос",
    region: "Центральная Америка и Карибы",
    subregionRu: "Восточные Карибы, самая восточная точка Антильской дуги",
    forcesStatusRu: "Малые регулярные силы: Силы обороны Барбадоса (BDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.04,
      amountNoteRu: "Порядка 35–45 млн долл.",
      year: 2024,
      shareOfGdpPct: 0.7,
      trendRu: "Стабильный минимум",
      provenance: {
        source: "Оценка проекта по IISS и CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 610,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 600 военнослужащих: пехотная рота, береговая охрана, кадеты; штаб-квартира — гарнизон Святого Анна (исторический объект ЮНЕСКО)",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутный компонент: пехота и инженерная поддержка",
      navyRu: "Береговая охрана: морские патрульные корабли типа Damon (западный класс OPV малых размеров)",
      airForceRu: "Отсутствует",
      otherRu: "Кадетский корпус, военная полиция",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли (Damen Stan Patrol 4207)",
        roleRu: "Контроль ИЭЗ и поиск-спасание",
        quantityNoteRu: "3 вымпела, включая HMBS Leonard C Banfield",
        originRu: "Нидерланды (Damen)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Стрелковое оружие и лёгкая техника",
        roleRu: "Поддержка полиции и ЧС",
        quantityNoteRu: "Только лёгкое вооружение",
        originRu: "США и Великобритания",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "США и Великобритания — обучение и экипировка; Нидерланды — патрульные корабли",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Обучение, экипировка, программы CBSI",
          provenance: pv("Госдепартамент США", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Региональная система безопасности RSS (штаб — Барбадос)", "КАРИКОМ"],
    vulnerabilities: [
      {
        titleRu: "Штаб RSS при микросилах",
        descriptionRu: "Барбадос — штаб-квартира региональной безопасности Восточных Карибов, но собственные силы символичны: региональная модель держится на взаимопомощи столь же малых государств",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Климатические и наркориски",
        descriptionRu: "Ураганы и наркотранзит — реальные задачи; военной угрозы государству не существует",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; поддержание существующего парка",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция Барбадоса — основной силовой орган; BDF призывается при ЧС и для церемониальных функций",
    overallNoteRu: "Микросилы со штабной региональной ролью — редкое сочетание, отмеченное в профиле",
  },
  {
    iso3: "BLZ",
    name: "Belize",
    nameRu: "Белиз",
    region: "Центральная Америка и Карибы",
    subregionRu: "Карибское побережье Центральной Америки, территориальный спор с Гватемалой",
    forcesStatusRu: "Малые регулярные силы: Силы обороны Белиза (BDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.03,
      amountNoteRu: "Порядка 25–35 млн долл.",
      year: 2024,
      shareOfGdpPct: 1.0,
      trendRu: "Стабильный минимум при британском и американском содействии",
      provenance: {
        source: "Оценка проекта по IISS и CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 1500,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 1,5 тыс. человек: два пехотных батальона, авиационное крыло, морское крыло; британский учебный центр BATSUB постоянно работает в стране",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: лёгкая пехота для джунглей, инженерная рота",
      navyRu: "Морское крыло: патрульные катера для побережья и островов",
      airForceRu: "Авиационное крыло: лёгкие самолёты и вертолёты в единичном числе",
      otherRu: "Добровольческая гвардия, спецподразделение",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные катера (американской и местной эксплуатации)",
        roleRu: "Борьба с наркотрафиком и контроль кайосов",
        quantityNoteRu: "Несколько катеров, часть передана береговой охране Белиза (отдельной службе)",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Лёгкие самолёты Cessna и вертолёты UH-1 (по открытым данным, часть неисправна)",
        roleRu: "Транспорт и наблюдение джунглей",
        quantityNoteRu: "Единицы бортов",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Великобритания — историческая гарантия (тренировочный центр BATSUB), США — техника и обучение",
      suppliers: [
        {
          supplier: "Великобритания",
          noteRu: "Обучение джунглевой войне, присутствие BATSUB",
          provenance: pv("Минобороны Великобритании", 2024, false),
        },
        {
          supplier: "США",
          noteRu: "Катера, связь, обучение",
          provenance: pv("Южное командование США", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["КАРИКОМ", "SICA (наблюдательные связи)"],
    vulnerabilities: [
      {
        titleRu: "Претензии Гватемалы",
        descriptionRu: "Гватемала исторически претендовала на половину территории Белиза; спор передан в Международный суд (референдумы 2018–2019), но военного паритета у Белиза нет и быть не может",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Наркотранзит по джунглям и морю",
        descriptionRu: "«Вторичные» маршруты кокаина через малонаселённый юг страны превышают возможности полутора тысяч военных и малой полиции",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; поддержание парка донорскими передачами",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Береговая охрана Белиза — отдельная гражданская служба, не входящая в BDF",
    overallNoteRu: "Профиль государства, чья безопасность исторически завязана на британское присутствие",
  },
  {
    iso3: "CRI",
    name: "Costa Rica",
    nameRu: "Коста-Рика",
    region: "Центральная Америка и Карибы",
    subregionRu: "Центральная Америка, страна без армии с 1948 года",
    forcesStatusRu: "Вооружённых сил нет (армия упразднена конституцией 1949 года)",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет; расходы на общественную безопасность (полиция, береговая охрана, воздушное наблюдение) — порядка 0,4–0,5 млрд долл., но это полицейский, а не оборонный бюджет",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Рост полицейских расходов на фоне рекордной волны наркопреступности 2023–2024 годов",
      provenance: {
        source: "CIA World Factbook; правительство Коста-Рики",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 14500,
      noteRu: "Государственная сила (Fuerza Pública) — около 14,5 тыс. полицейских; национальная береговая охрана и служба воздушного наблюдения — гражданские ведомства с лёгким вооружением",
      provenance: {
        source: "IISS Military Balance 2024; CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует с 1948 года",
      navyRu: "Национальная береговая охрана: морские патрульные корабли (включая переданные США катера Metal Shark и OPV из Израиля в прошлом)",
      airForceRu: "Служба воздушного наблюдения: лёгкие самолёты и вертолёты полицейского назначения",
      otherRu: "Пограничная полиция, подразделение специальных вмешательств (UEI)",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные корабли береговой охраны (типов Libertador и американской передачи)",
        roleRu: "Перехват наркотрафика в Тихом океане и Карибском море",
        quantityNoteRu: "Несколько вымпелов; оперативная работа ведётся совместно с США по договору о совместном патрулировании",
        originRu: "США и Израиль (исторические передачи)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Лёгкие самолёты и вертолёты воздушного наблюдения",
        roleRu: "Поддержка полиции",
        quantityNoteRu: "Единицы бортов гражданского типа",
        originRu: "США (передачи)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо: внешняя безопасность — межамериканский договор (Рио) и дипломатия",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо к армии",
      shareNoteRu: "Полицейская техника поступает из США по программам безопасности; тяжёлого вооружения нет принципиально",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Катера, вертолёты полицейского типа, обучение и совместное патрулирование",
          provenance: pv("Госдепартамент США (INL)", 2024, true),
        },
      ],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Межамериканский договор о взаимной помощи (Рио, 1947)"],
    vulnerabilities: [
      {
        titleRu: "Нарковойна без армии",
        descriptionRu: "Коста-Рика стала крупным перевалочным пунктом кокаина и европейского трафика: рекордные убийства 2023–2024 годов и дебаты о милитаризации полиции ставят модель «без армии» под вопрос впервые за десятилетия",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; открытая пресса", 2024, true),
      },
      {
        titleRu: "Спор с Никарагуа по реке Сан-Хуан",
        descriptionRu: "Пограничные инциденты (Исла-Калеро, 2010) решались через Международный суд — у страны нет иного инструмента, что и задумано моделью, но требует времени",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо к армии; усиляется полиция: новые катера, радары побережья и дискуссия о чрезвычайном положении в портах",
      programs: [
        {
          nameRu: "Усиление береговой охраны",
          noteRu: "Сканеры в портах и новые патрульные средства при поддержке США и ЕС",
          provenance: pv("Правительство Коста-Рики", 2024, true),
        },
      ],
      provenance: {
        source: "Правительство Коста-Рики",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Честный профиль страны без армии: «силы» — полиция и береговая охрана, а безопасность — право и альянсы",
    overallNoteRu: "Эталонный кейс демилитаризации; нулевые военные значения — конституционный факт",
  },
  {
    iso3: "DMA",
    name: "Dominica",
    nameRu: "Доминика",
    region: "Центральная Америка и Карибы",
    subregionRu: "Малые Антильские острова, самая гористая страна Карибов",
    forcesStatusRu: "Вооружённых сил нет (армия расформирована в 1981 году)",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет; безопасность — полицейские расходы",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует",
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 300,
      noteRu: "Полиция Содружества Доминики — несколько сотен сотрудников, включая подразделение специальных служб (SSU) и береговую охрану",
      provenance: {
        source: "CIA World Factbook; IISS (Caribbean)",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует с 1981 года",
      navyRu: "Береговая охрана в составе полиции: 1–2 патрульных катера",
      airForceRu: "Отсутствует",
      otherRu: "Подразделение специальных служб полиции (SSU)",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульный катер береговой охраны",
        roleRu: "Контроль вод и поиск-спасание",
        quantityNoteRu: "1–2 катера американской передачи",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет; полицейское снаряжение — донорское",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Региональная система безопасности RSS", "КАРИКОМ"],
    vulnerabilities: [
      {
        titleRu: "Ураганная разрушаемость",
        descriptionRu: "Ураган Мария (2017) нанёс ущерб в 226% ВВП: восстановление и безопасность полностью зависят от внешней помощи и RSS",
        severityRu: "средняя",
        provenance: pv("Всемирный банк; аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо",
      programs: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    securityNoteRu: "Честный профиль без армии: безопасность — полиция, SSU и региональная система RSS",
    overallNoteRu: "Нулевые военные значения — факт с 1981 года",
  },
  {
    iso3: "DOM",
    name: "Dominican Republic",
    nameRu: "Доминиканская Республика",
    region: "Центральная Америка и Карибы",
    subregionRu: "Остров Гаити (восточная часть), граница с Гаити",
    forcesStatusRu: "Регулярные вооружённые силы",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.9,
      amountNoteRu: "Около 0,85–0,95 млрд долл.; рост связан со строительством пограничной стены с Гаити и кризисом соседа",
      year: 2024,
      shareOfGdpPct: 0.7,
      trendRu: "Рост после 2021 года: пограничная инфраструктура, вертолёты, бронетехника",
      provenance: {
        source: "SIPRI Military Expenditure Database",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 56000,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 56 тыс. военнослужащих — крупнейшие силы Карибского бассейна; полиция (47 тыс.) формально подчинена МВД, фактически тесно связана с армией",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные бригады, кавалерия, пограничный корпус CESFRONT",
      navyRu: "ВМС: морские патрульные корабли (включая бывшие катера береговой охраны США), база в Санто-Доминго",
      airForceRu: "ВВС: лёгкие штурмовики A-29 Super Tucano, вертолёты; эскадрилья борьбы с наркотрафиком",
      otherRu: "Специализированный корпус безопасности аэропортов и туристической полиции (CESTUR/POLITUR)",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "A-29 Super Tucano",
        roleRu: "Лёгкий штурмовик против наркотрафика и для пограничного контроля",
        quantityNoteRu: "8 машин поставлены Бразилией в 2009–2010 годах",
        originRu: "Бразилия (Embraer)",
        provenance: pv("IISS Military Balance", 2024, false),
      },
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли (бывшие USCG) и Damen",
        roleRu: "Контроль морских границ и наркотрафика",
        quantityNoteRu: "Около десятка вымпелов разного класса",
        originRu: "США и Нидерланды",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Лёгкие танки и бронетехника наследия (AMX-13 — выведены; M41 и БТР)",
        roleRu: "Поддержка пехоты",
        quantityNoteRu: "Парк устарел и частично небоеспособен; заменяется бронеавтомобилями",
        originRu: "Франция и США (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты UH-1H и OH-58 (передачи США)",
        roleRu: "Транспорт и наблюдение границы",
        quantityNoteRu: "Десятки бортов разного состояния",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет, кроме ремонта и лёгкой сборки",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "США — главный партнёр (передачи техники, обучение), Бразилия — авиация, Испания — транспортные самолёты в прошлом",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Вертолёты, катера, обучение, программы безопасности",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Бразилия",
          noteRu: "A-29 Super Tucano",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Межамериканский договор (Рио)", "SICA (ассоциированный статус)"],
    vulnerabilities: [
      {
        titleRu: "Коллапс Гаити как пограничная угроза",
        descriptionRu: "Бандитский захват Порт-о-Пренса и миграционный поток сделали 391 км границы главным театром: стена, CESFRONT и депортации — постоянная нагрузка на армию",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; ООН", 2024, true),
      },
      {
        titleRu: "Наркотранзит и коррупция в силовых структурах",
        descriptionRu: "Страна — перевалочный узел венесуэльского и колумбийского трафика; исторические связи офицерства с трафиком подрывают доверие к институту",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта; INL США", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Пограничная программа: стена с датчиками, вертолёты, бронетехника для CESFRONT",
      programs: [
        {
          nameRu: "Пограничная стена с Гаити",
          noteRu: "Строительство ограждения с видеонаблюдением с 2022 года, протяжённость — более 160 км первой очереди",
          provenance: pv("Правительство Доминиканской Республики", 2024, true),
        },
      ],
      provenance: {
        source: "Правительство Доминиканской Республики; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Армия традиционно влиятельна политически; полиция проходит реформу с 2021 года",
    overallNoteRu: "Численность по IISS; пограничный сюжет — главный драйвер расходов после 2021 года",
  },
  {
    iso3: "SLV",
    name: "El Salvador",
    nameRu: "Сальвадор",
    region: "Центральная Америка и Карибы",
    subregionRu: "Тихоокеанское побережье Центральной Америки",
    forcesStatusRu: "Регулярные вооружённые силы, с 2022 года — ключевой инструмент чрезвычайного положения против банд",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.35,
      amountNoteRu: "Порядка 0,3–0,45 млрд долл. с учётом роста расходов на безопасность при режиме исключения (с 2022 года)",
      year: 2024,
      shareOfGdpPct: 1.1,
      trendRu: "Рост: армия увеличена и постоянно развёрнута внутри страны",
      provenance: {
        source: "Оценка проекта по SIPRI и бюджету Сальвадора",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 24700,
      reserve: 9900,
      paramilitary: null,
      noteRu: "Около 25 тыс. военнослужащих; правительство заявляло цель удвоения армии для войны с бандами (MS-13, Barrio 18), фактически развёрнуто массовое патрулирование и тюрьма CECOT",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные бригады, батальон немедленного реагирования",
      navyRu: "ВМС: патрульные катера тихоокеанского побережья",
      airForceRu: "ВВС: лёгкие штурмовики A-37 Dragonfly наследия, вертолёты, транспортные самолёты",
      otherRu: "Военная полиция, силы специального назначения",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "A-37 Dragonfly и вертолёты UH-1H / MD500",
        roleRu: "Поддержка наземных операций, транспорт",
        quantityNoteRu: "Парк наследия гражданской войны, боеспособность ограничена",
        originRu: "США (наследие поставок 1980-х)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронеавтомобили и бронетехника Cashuat / Mowag (наследие)",
        roleRu: "Патрулирование и операции против банд",
        quantityNoteRu: "Десятки единиц, включая местную сборку Cashuat времён войны",
        originRu: "США / собственная сборка наследия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Патрульные катера (передачи США)",
        roleRu: "Контроль побережья и наркотрафика",
        quantityNoteRu: "Несколько катеров",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет, кроме арсеналов и ремонтных мастерских INDUMIL-подобного типа местного масштаба",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "США — традиционный поставщик и партнёр обучения; Израиль и страны региона — нишевые поставки стрелкового оружия",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Техника наследия, обучение, программы безопасности",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Межамериканский договор (Рио)", "SICA"],
    vulnerabilities: [
      {
        titleRu: "Милитаризация внутренней политики",
        descriptionRu: "Режим исключения с 2022 года дал результат по убийствам, но армия стала политическим инструментом президента; риск институциональной деформации и зависимости безопасности от одного лидера",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; международные правозащитные отчёты", 2024, true),
      },
      {
        titleRu: "Устаревший парк без внешней угрозы",
        descriptionRu: "Техника времён гражданской войны (завершилась в 1992 году) не обновляется под внешние задачи — армия функционально является жандармерией",
        severityRu: "средняя",
        provenance: pv("IISS; аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Модернизация = расширение численности и инфраструктуры заключения (CECOT), а не техники",
      programs: [
        {
          nameRu: "План территориального контроля",
          noteRu: "Постоянное развёртывание армии и полиции в муниципалитетах, массовые задержания с 2022 года",
          provenance: pv("Правительство Сальвадора", 2024, true),
        },
      ],
      provenance: {
        source: "Правительство Сальвадора; открытая пресса",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция (PNC) работает в связке с армией; граница функций размыта режимом исключения",
    overallNoteRu: "Профиль страны, где армия переориентирована на внутреннюю войну с бандами",
  },
  {
    iso3: "GRD",
    name: "Grenada",
    nameRu: "Гренада",
    region: "Центральная Америка и Карибы",
    subregionRu: "Наветренные острова, Восточные Карибы",
    forcesStatusRu: "Вооружённых сил нет (армия расформирована после 1983 года)",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет; безопасность — полиция и береговая охрана",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует",
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 350,
      noteRu: "Королевская полиция Гренады — около 350–400 сотрудников, включая подразделение специальных служб и береговую охрану",
      provenance: {
        source: "CIA World Factbook; IISS (Caribbean)",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует с 1983 года",
      navyRu: "Береговая охрана в составе полиции: патрульные катера",
      airForceRu: "Отсутствует",
      otherRu: "Подразделение специальных служб полиции (SSU)",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные катера береговой охраны",
        roleRu: "Наркотрафик и поиск-спасание",
        quantityNoteRu: "Несколько катеров американской передачи",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Региональная система безопасности RSS", "КАРИКОМ"],
    vulnerabilities: [
      {
        titleRu: "Историческая травма 1983 года",
        descriptionRu: "Интервенция США после переворота — причина отказа от армии: безопасность делегирована RSS, собственные возможности минимальны даже против наркотрафика",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо",
      programs: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    securityNoteRu: "Честный профиль без армии с 1983 года",
    overallNoteRu: "Нулевые значения — институциональный выбор, а не пропуск данных",
  },
  {
    iso3: "GTM",
    name: "Guatemala",
    nameRu: "Гватемала",
    region: "Центральная Америка и Карибы",
    subregionRu: "Центральная Америка, самая населённая страна региона",
    forcesStatusRu: "Регулярные вооружённые силы",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.42,
      amountNoteRu: "Около 0,4 млрд долл., порядка 0,4% ВВП — низкий уровень при крупных задачах наркотрафика",
      year: 2024,
      shareOfGdpPct: 0.4,
      trendRu: "Стабильный минимум; закупки точечные (бронеавтомобили, катера)",
      provenance: {
        source: "SIPRI Military Expenditure Database",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 18000,
      reserve: 64000,
      paramilitary: null,
      noteRu: "Около 18 тыс. активных после сокращений мирных соглашений 1996 года; армия политически ослаблена, реальная безопасность — полиция и смешанные структуры",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные бригады, спецназ «Кайбилес»",
      navyRu: "ВМС: патрульные корабли и катера двух побережий, база Санто-Томас-де-Кастилья",
      airForceRu: "ВВС: вертолёты и лёгкие самолёты; парк A-37 выведен, обсуждается закупка лёгких штурмовиков",
      otherRu: "Военная полиция, военно-морская пехота",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Бронеавтомобили и БТР наследия (Mowag, Cadillac Gage)",
        roleRu: "Мобильность и поддержка полиции",
        quantityNoteRu: "Десятки единиц устаревшего парка",
        originRu: "США и Швейцария (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Патрульные корабли (типов американской и голландской передачи)",
        roleRu: "Контроль тихоокеанского и карибского побережий",
        quantityNoteRu: "Несколько вымпелов; тихоокеанский наркомаршрут остаётся главным вызовом",
        originRu: "США / Нидерланды",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты Bell 212/UH-1 и самолёты наблюдения",
        roleRu: "Транспорт и антинаркотические операции",
        quantityNoteRu: "Единицы–десятки бортов неоднородного состояния",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет, кроме армейских мастерских (Industria Militar исторически производила боеприпасы малыми сериями)",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "США — основной партнёр; Мексика и Колумбия — региональное антинаркотическое сотрудничество; Израиль — стрелковое оружие полиции и армии",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Техника, обучение, совместные программы против наркотрафика",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Межамериканский договор (Рио)", "SICA"],
    vulnerabilities: [
      {
        titleRu: "Наркогосударственные риски на периферии",
        descriptionRu: "Петен и тихоокеанское побережье — зоны слабого присутствия государства, где картели покупают землю и влияние; армия не имеет ресурсов постоянного контроля",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; INL США", 2024, true),
      },
      {
        titleRu: "Институциональная слабость после мирных соглашений",
        descriptionRu: "Армия сокращена и деморализована расследованиями эпохи конфликта; разведывательные структуры исторически связаны со скандалами",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Обсуждаемая закупка лёгкой авиации и катеров без системной программы",
      programs: [],
      provenance: {
        source: "Открытая пресса",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция (PNC) при поддержке армии патрулирует «красные зоны» столицы совместными силами",
    overallNoteRu: "Численность по IISS; главная функция армии — антинаркотическая и поддерживающая",
  },
  {
    iso3: "HTI",
    name: "Haiti",
    nameRu: "Гаити",
    region: "Центральная Америка и Карибы",
    subregionRu: "Остров Гаити (западная часть), государство в состоянии частичного коллапса",
    forcesStatusRu: "Формально воссозданные вооружённые силы (FAd'H) при фактическом контроле банд над столицей",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: null,
      amountNoteRu: "Достоверного оборонного бюджета нет: государство финансируется фрагментарно, армия и полиция получают крохи при гуманитарном кризисе",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Не оценивается: с 2021 года государство утратило монополию на насилие в Порт-о-Пренсе",
      provenance: {
        source: "Оценка проекта по докладам ООН и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 1500,
      reserve: null,
      paramilitary: null,
      noteRu: "Воссозданная в 2017 году армия — порядка 1–2 тыс. человек слабой подготовки; национальная полиция (около 12–15 тыс. номинально) перегружена и уступает бандам по вооружению; банды контролируют до 80–90% столицы (оценки ООН)",
      provenance: {
        source: "IISS Military Balance 2024; панель экспертов ООН",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутный компонент: несколько рот, инженерные и медицинские подразделения",
      navyRu: "Береговая охрана в составе полиции: несколько катеров",
      airForceRu: "Отсутствует",
      otherRu: "Полицейские спецподразделения (UTAG, SWAT) и бригада защиты — фронт борьбы с бандами",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Лёгкая бронетехника (бронеавтомобили канадской и американской передачи для полиции)",
        roleRu: "Операции против банд",
        quantityNoteRu: "Единицы–десятки машин, переданы Канадой и США в 2022–2024 годах",
        originRu: "Канада и США",
        provenance: pv("Правительство Канады; открытая пресса", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Стрелковое оружие смешанного происхождения",
        roleRu: "Вооружение армии и полиции",
        quantityNoteRu: "У банд, по оценкам ООН, вооружение не хуже государственного (винтовки AR из США через контрабанду)",
        originRu: "США и др. (легальные и контрабандные каналы)",
        provenance: pv("Панель экспертов ООН по Гаити", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Поставки ограничены эмбарго Совета Безопасности ООН на оружие негосударственным акторам и контролем над государственными закупками; помощь — США, Канада, Франция",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Бронетехника и снаряжение для полиции, поддержка миссии MSS",
          provenance: pv("Госдепартамент США", 2024, true),
        },
        {
          supplier: "Канада",
          noteRu: "Бронеавтомобили Roshel для национальной полиции",
          provenance: pv("Правительство Канады", 2024, false),
        },
      ],
      provenance: {
        source: "Доклады ООН; официальные заявления",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["КАРИКОМ", "Многонациональная миссия поддержки безопасности (MSS, лидер — Кения, мандат СБ ООН с 2023 года)"],
    vulnerabilities: [
      {
        titleRu: "Утрата монополии на насилие",
        descriptionRu: "Коалиции банд (Viv Ansanm) контролируют столицу, порт и дороги: государство не способно обеспечить базовую безопасность без внешней миссии",
        severityRu: "высокая",
        provenance: pv("ООН; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Оружейная контрабанда из США",
        descriptionRu: "Поток винтовок и боеприпасов из Флориды вооружает банды быстрее, чем партнёры успевают экипировать полицию",
        severityRu: "высокая",
        provenance: pv("Панель экспертов ООН", 2024, true),
      },
      {
        titleRu: "Институциональный вакуум",
        descriptionRu: "После убийства президента в 2021 году нет избранной власти: армия воссоздаётся без легитимного гражданского контроля",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "О модернизации речи нет: задача — восстановить базовую дееспособность полиции и армии при внешней поддержке",
      programs: [
        {
          nameRu: "Миссия MSS и пакет помощи полиции",
          noteRu: "Кенийский контингент развёрнут с июня 2024 года; численность и мандат ограничены, результаты смешанные",
          provenance: pv("Совет Безопасности ООН; открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "ООН; открытая пресса",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Профиль государства в кризисе: все числа условны и быстро устаревают",
    overallNoteRu: "Пониженное доверие к данным: официальная статистика Гаити фрагментарна, оценки — ООН и IISS",
  },
  {
    iso3: "HND",
    name: "Honduras",
    nameRu: "Гондурас",
    region: "Центральная Америка и Карибы",
    subregionRu: "Центральная Америка, транзитный коридор наркотиков",
    forcesStatusRu: "Регулярные вооружённые силы",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.42,
      amountNoteRu: "Около 0,4 млрд долл., порядка 0,9–1,2% ВВП с учётом полицейско-военных программ",
      year: 2024,
      shareOfGdpPct: 1.0,
      trendRu: "Стабильный уровень; армия постоянно задействована во внутренней безопасности",
      provenance: {
        source: "SIPRI Military Expenditure Database",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 15500,
      reserve: 80000,
      paramilitary: null,
      noteRu: "Около 15,5 тыс. активных; военная полиция общественного порядка (PMOP) — фактически отдельный род войск для улиц",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные бригады, спецназ",
      navyRu: "ВМС: морские патрульные корабли (включая израильские и колумбийские поставки), база Пуэрто-Кастилья",
      airForceRu: "ВВС: парк A-37 и F-5 наследия — F-5 частично боеспособны, вертолёты Bell",
      otherRu: "Военная полиция (PMOP), военно-морская пехота",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "F-5E/F Tiger II и A-37 Dragonfly",
        roleRu: "Единственные боевые самолёты страны",
        quantityNoteRu: "Около 10 F-5 поставлены в 1980-е, летнопригодность низкая; программы замены обсуждались без результата",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли (типа OPV из Израиля и Damen)",
        roleRu: "Контроль карибского побережья и Москитии",
        quantityNoteRu: "Несколько вымпелов; крупнейший — OPV General Cabañas израильской постройки",
        originRu: "Израиль и Нидерланды",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника Scorpion и бронеавтомобили",
        roleRu: "Разведка и поддержка",
        quantityNoteRu: "Десятки единиц британского и американского наследия",
        originRu: "Великобритания и США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет; военная промышленность (INDUMIL-подобные арсеналы) ограничена ремонтом и боеприпасами малых партий",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "США — основной партнёр (база Сото-Кано с американским присутствием), Израиль и Колумбия — морские и нишевые поставки, Тайвань — историческая помощь",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Техника наследия, обучение, совместная оперативная группа на базе Сото-Кано",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Израиль",
          noteRu: "Патрульный корабль, БПЛА наблюдения (по открытым данным)",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Межамериканский договор (Рио)", "SICA"],
    vulnerabilities: [
      {
        titleRu: "Наркотранзит и слабые институты",
        descriptionRu: "Грасиас-а-Дьос (Москития) — зона слабого государства и взлётных полос трафика; коррупционные скандалы достигали высшего командования",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; INL США", 2024, true),
      },
      {
        titleRu: "Политизация армии",
        descriptionRu: "Роль военных в кризисе 2009 года и тюремной системе (передача тюрем военным в 2023 году после бунта) расширяет функции армии за счёт боевой подготовки",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Точечные морские закупки и дискуссия о замене F-5 без финансирования",
      programs: [],
      provenance: {
        source: "Открытая пресса",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "PMOP и полиция делят улицы с армией; чрезвычайные меры против банд продлеваются регулярно",
    overallNoteRu: "Численность и парк — IISS; внутренняя роль армии — главный сюжет профиля",
  },
  {
    iso3: "NIC",
    name: "Nicaragua",
    nameRu: "Никарагуа",
    region: "Центральная Америка и Карибы",
    subregionRu: "Центральная Америка, крупнейшая страна региона по площади",
    forcesStatusRu: "Регулярные вооружённые силы, интегрированные в политическую систему правящей партии",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.1,
      amountNoteRu: "Порядка 0,09–0,12 млрд долл. по SIPRI; реальная ресурсная база шире за счёт российского сотрудничества и внебюджетных каналов",
      year: 2024,
      shareOfGdpPct: 0.6,
      trendRu: "Формально низкий, при заметной милитаризации после кризиса 2018 года",
      provenance: {
        source: "SIPRI Military Expenditure Database",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 12000,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 12 тыс. военнослужащих; армия — наследница Сандинистской народной армии, лояльность режиму — системный принцип кадровой политики",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные бригады, танковый батальон советского наследия",
      navyRu: "ВМС: патрульные корабли (включая голландские Damen и бывшие советские катера), два побережья",
      airForceRu: "ВВС: вертолёты Ми-17, лёгкие самолёты; боевой авиации нет",
      otherRu: "Силы специальных операций, военно-морская пехота",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Т-72Б1 и БМП-1 / БТР-80 (российские поставки 2016–2019)",
        roleRu: "Бронетанковое ядро — самое современное в Центральной Америке по совокупности",
        quantityNoteRu: "Около 50 Т-72Б1 поставлены Россией, что вызвало обеспокоенность соседей",
        originRu: "Россия",
        provenance: pv("IISS Military Balance; SIPRI", 2024, false),
      },
      {
        branchRu: "ПВО",
        system: "ЗРК и ЗА советского наследия, РЛС (китайские поставки обсуждались)",
        roleRu: "Объектовая ПВО",
        quantityNoteRu: "Устаревший парк без подтверждённой модернизации",
        originRu: "СССР (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли Damen Stan Patrol",
        roleRu: "Контроль побережий после решения МС ООН по морским границам с Колумбией",
        quantityNoteRu: "2 корабля поставлены в 2019 году, плюс катера",
        originRu: "Нидерланды (Damen)",
        provenance: pv("IISS Military Balance", 2024, false),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты Ми-17",
        roleRu: "Транспорт и поддержка",
        quantityNoteRu: "Около десятка бортов российского производства",
        originRu: "Россия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет, кроме арсеналов; в стране работает российский учебный центр и объект ГЛОНАСС",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Россия — стратегический поставщик (танки, вертолёты, центр подготовки, станция ГЛОНАСС); Венесуэла эпохи ALBA — финансовая поддержка в прошлом",
      suppliers: [
        {
          supplier: "Россия",
          noteRu: "Т-72Б1, БТР, вертолёты, обучение, военно-техническое присутствие",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ALBA", "Военно-техническое сотрудничество с Россией и Китаем (меморандумы)"],
    vulnerabilities: [
      {
        titleRu: "Санкции и изоляция после 2018 года",
        descriptionRu: "Подавление протестов 2018 года с участием силовых структур привело к санкциям США и ЕС: поставки и обучение ограничены, зависимость от России и Китая выросла",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Инструментализация армии режимом",
        descriptionRu: "Армия и полиция — столпы удержания власти династического режима Ортеги-Мурильо; в кризисе преемственности лояльность — главный неизвестный фактор",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Модернизация равна российским поставкам конца 2010-х; новых программ не анонсировано",
      programs: [],
      provenance: {
        source: "IISS Military Balance",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция — главный репрессивный инструмент с 2018 года, формально гражданская",
    overallNoteRu: "Бюджет по SIPRI занижает реальный контур из-за внебюджетной помощи России — оговорка существенна",
  },
  {
    iso3: "PAN",
    name: "Panama",
    nameRu: "Панама",
    region: "Центральная Америка и Карибы",
    subregionRu: "Перешеек и Панамский канал, страна без армии с 1994 года",
    forcesStatusRu: "Вооружённых сил нет (армия расформирована после вторжения США 1989 года)",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет; расходы на публичные силы безопасности (полиция, SENAN, SENAFRONT) — порядка 0,8–1 млрд долл., но юридически это не оборона",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Рост полицейских расходов на фоне миграционного кризиса в Дарьене",
      provenance: {
        source: "CIA World Factbook; правительство Панамы",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 27000,
      noteRu: "Государственные силы безопасности суммарно около 27 тыс.: национальная полиция (около 18 тыс.), аэронавальная служба SENAN, пограничная служба SENAFRONT, институциональная защита канала",
      provenance: {
        source: "IISS Military Balance 2024; CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует с 1994 года",
      navyRu: "SENAN выполняет функции флота и береговой охраны: морские патрульные корабли (включая бывшие итальянские OPV) и авиацию",
      airForceRu: "Авиационный компонент SENAN: транспортные самолёты и вертолёты полицейского назначения",
      otherRu: "SENAFRONT — пограничная служба для Дарьена и границы с Коста-Рикой, лёгкая пехота по функциям",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли SENAN (Fincantieri, бывшие итальянские)",
        roleRu: "Защита подходов к каналу и перехват наркотрафика",
        quantityNoteRu: "Несколько OPV и десятки катеров",
        originRu: "Италия и США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Пограничные силы",
        system: "Лёгкое вооружение и техника SENAFRONT",
        roleRu: "Контроль Дарьенского пробела против клана Гольфо и миграционных потоков",
        quantityNoteRu: "Пехотное вооружение полицейского стандарта усиленного типа",
        originRu: "США и др.",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо: безопасность канала гарантируется договорами Торрихоса-Картера и партнёрством с США",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо к армии",
      shareNoteRu: "Техника сил безопасности — США и Европа; китайское присутствие в портах канала — предмет политической дискуссии с США",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Обучение, катера, совместные программы безопасности канала",
          provenance: pv("Южное командование США", 2024, true),
        },
      ],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Договоры Торрихоса-Картера с США (нейтралитет канала)", "Межамериканский договор (Рио)"],
    vulnerabilities: [
      {
        titleRu: "Канал как объект чужой конкуренции",
        descriptionRu: "Портовые концессии китайских операторов у обоих входов канала и давление США по их пересмотру (2025) делают Панаму ареной соперничества без собственных военных рычагов",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; открытая пресса", 2024, true),
      },
      {
        titleRu: "Дарьенский коридор",
        descriptionRu: "Сотни тысяч мигрантов и структуры клана Гольфо в джунглях Дарьена превышают возможности SENAFRONT; контроль условен",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта; ООН", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Усиление SENAN/SENAFRONT техникой наблюдения и мобильности при поддержке США",
      programs: [
        {
          nameRu: "Программа безопасности Дарьена",
          noteRu: "Базы, сенсоры и совместные операции с Колумбией и США",
          provenance: pv("Правительство Панамы", 2024, true),
        },
      ],
      provenance: {
        source: "Правительство Панамы",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Честный профиль страны без армии: «силы» — полицейские службы с морским и пограничным компонентами",
    overallNoteRu: "Нулевые военные значения — конституционный факт с 1994 года",
  },
  {
    iso3: "JAM",
    name: "Jamaica",
    nameRu: "Ямайка",
    region: "Центральная Америка и Карибы",
    subregionRu: "Большие Антильские острова, Карибское море",
    forcesStatusRu: "Регулярные силы: Силы обороны Ямайки (JDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.22,
      amountNoteRu: "Порядка 0,2 млрд долл.",
      year: 2024,
      shareOfGdpPct: 1.1,
      trendRu: "Стабильный уровень с вложениями в морские патрульные корабли и вертолёты",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 5950,
      reserve: 980,
      paramilitary: null,
      noteRu: "Около 6 тыс. военнослужащих — одни из наиболее профессиональных в англоязычных Карибах; JDF регулярно поддерживает полицию в операциях против банд",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: два пехотных батальона, инженерный полк, спецподразделение",
      navyRu: "Береговая охрана JDF: морские патрульные корабли (Damen и бывшие голландские), база Порт-Ройал",
      airForceRu: "Авиационное крыло: вертолёты Bell и лёгкие самолёты наблюдения, включая переданные США King Air для морского патрулирования",
      otherRu: "Военная полиция, медицинский и сапёрный компоненты",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли Damen Stan Patrol и бывшие нидерландские OPV",
        roleRu: "Борьба с наркотрафиком («обмен оружия на наркотики» с Гаити) и контроль ИЭЗ",
        quantityNoteRu: "Несколько вымпелов, включая класс County",
        originRu: "Нидерланды (Damen)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты Bell 407/412 и самолёты King Air 350 MPA",
        roleRu: "Транспорт и морское наблюдение",
        quantityNoteRu: "Единицы–десятки бортов; King Air поставлены США для патрулирования",
        originRu: "США и Канада (Bell)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронеавтомобили Bushmaster (передача Австралии в прошлом) и лёгкая техника",
        roleRu: "Мобильность и операции против банд",
        quantityNoteRu: "Около десятка Bushmaster, остальной парк — лёгкие машины",
        originRu: "Австралия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "США, Канада и Великобритания — обучение и техника; Нидерланды — патрульные корабли",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Самолёты патрулирования, обучение, программы CBSI",
          provenance: pv("SIPRI; Госдепартамент США", 2024, true),
        },
        {
          supplier: "Нидерланды (Damen)",
          noteRu: "Патрульные корабли береговой охраны",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["КАРИКОМ", "Оперативное партнёрство с США и Великобританией"],
    vulnerabilities: [
      {
        titleRu: "Банды и поток оружия из США и Гаити",
        descriptionRu: "Уровень убийств — один из высших в мире: JDF постоянно отвлекается на внутренние операции (зоны специальных операций ZOSO), морская граница с Гаити — канал контрабанды оружия",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; ООН", 2024, true),
      },
      {
        titleRu: "Зарубежная миссия при малых силах",
        descriptionRu: "Ямайка предоставила контингент для миссии в Гаити (MSS) — престижно, но отвлекает лучшие кадры от собственных задач",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Морское патрулирование и наблюдение — приоритет: новые катера и авиация наблюдения",
      programs: [
        {
          nameRu: "Обновление береговой охраны",
          noteRu: "Дополнительные патрульные средства и радары побережья при поддержке США и Канады",
          provenance: pv("Правительство Ямайки", 2024, true),
        },
      ],
      provenance: {
        source: "Правительство Ямайки; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция (JCF) — крупнейший силовой орган; армия — её регулярный усилитель в кризисах",
    overallNoteRu: "Численность по IISS; роль JDF в регионе выше её размера за счёт подготовки",
  },
  {
    iso3: "KNA",
    name: "Saint Kitts and Nevis",
    nameRu: "Сент-Китс и Невис",
    region: "Центральная Америка и Карибы",
    subregionRu: "Малые Антильские острова, самое маленькое государство Америк",
    forcesStatusRu: "Микросилы: Силы обороны Сент-Китса и Невиса",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.01,
      amountNoteRu: "Порядка нескольких млн долл.; статистика не выделяется",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Стабильный минимум",
      provenance: {
        source: "Оценка проекта по CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 300,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 300 человек: пехотная рота и береговая охрана суммарно меньше батальона",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутный компонент: одна пехотная рота",
      navyRu: "Береговая охрана: 1–2 патрульных катера",
      airForceRu: "Отсутствует",
      otherRu: "Кадетский корпус",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные катера береговой охраны",
        roleRu: "Наркотрафик и поиск-спасание",
        quantityNoteRu: "Несколько катеров американской передачи по программам региональной безопасности",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "США — донор по линии RSS и CBSI",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Катера и обучение",
          provenance: pv("Госдепартамент США", 2024, true),
        },
      ],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Региональная система безопасности RSS", "КАРИКОМ"],
    vulnerabilities: [
      {
        titleRu: "Масштаб ниже порога самостоятельности",
        descriptionRu: "При населении около 50 тыс. человек силы обороны — полицейское усиление, а не армия; любая серьёзная угроза решается через RSS",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция — основной орган; силы обороны задействуются при ЧС",
    overallNoteRu: "Микропрофиль: числа ориентировочны из-за отсутствия публичной статистики",
  },
  {
    iso3: "LCA",
    name: "Saint Lucia",
    nameRu: "Сент-Люсия",
    region: "Центральная Америка и Карибы",
    subregionRu: "Наветренные острова, Восточные Карибы",
    forcesStatusRu: "Вооружённых сил нет; есть полиция с морским и специальным подразделениями",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует",
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 400,
      noteRu: "Королевская полиция Сент-Люсии — порядка 1 тыс. сотрудников суммарно со всеми службами; подразделение специальных служб (SSU) и морская полиция — военизированное ядро в несколько сотен человек",
      provenance: {
        source: "CIA World Factbook; IISS (Caribbean)",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует",
      navyRu: "Морская полиция: патрульные катера",
      airForceRu: "Отсутствует",
      otherRu: "Подразделение специальных служб (SSU)",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные катера морской полиции",
        roleRu: "Наркотрафик и рыболовный контроль",
        quantityNoteRu: "Несколько катеров американской передачи",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Региональная система безопасности RSS", "КАРИКОМ"],
    vulnerabilities: [
      {
        titleRu: "Наркотранзит и бандитизм",
        descriptionRu: "Рост убийств, связанных с трафиком, превышает возможности полиции; ответ — региональные операции RSS и помощь США",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо",
      programs: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    securityNoteRu: "Честный профиль без армии",
    overallNoteRu: "Нулевые военные значения — факт государственного устройства",
  },
  {
    iso3: "VCT",
    name: "Saint Vincent and the Grenadines",
    nameRu: "Сент-Винсент и Гренадины",
    region: "Центральная Америка и Карибы",
    subregionRu: "Наветренные острова, Восточные Карибы",
    forcesStatusRu: "Вооружённых сил нет; полиция с подразделением специальных служб",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует",
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 350,
      noteRu: "Полиция — около 700 сотрудников суммарно; SSU и береговая охрана — военизированное ядро в несколько сотен",
      provenance: {
        source: "CIA World Factbook; IISS (Caribbean)",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует",
      navyRu: "Береговая охрана в составе полиции: патрульные катера",
      airForceRu: "Отсутствует",
      otherRu: "Подразделение специальных служб (SSU)",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные катера береговой охраны",
        roleRu: "Контроль Гренадин — цепочки островов с интенсивным яхтенным и наркотрафиком",
        quantityNoteRu: "Несколько катеров",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Региональная система безопасности RSS", "КАРИКОМ"],
    vulnerabilities: [
      {
        titleRu: "Вулкан и наркотрафик",
        descriptionRu: "Извержение Ла-Суфриер (2021) показало зависимость от региональной помощи; гренадинский архипелаг слабо контролируется на предмет трафика",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо",
      programs: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    securityNoteRu: "Честный профиль без армии",
    overallNoteRu: "Нулевые значения — факт; безопасность коллективная через RSS",
  },
  {
    iso3: "TTO",
    name: "Trinidad and Tobago",
    nameRu: "Тринидад и Тобаго",
    region: "Центральная Америка и Карибы",
    subregionRu: "Южные Карибы у побережья Венесуэлы, нефтегазовая экономика",
    forcesStatusRu: "Регулярные силы: Силы обороны Тринидада и Тобаго (TTDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.28,
      amountNoteRu: "Порядка 0,25–0,3 млрд долл.",
      year: 2024,
      shareOfGdpPct: 1.1,
      trendRu: "Стабильный уровень с вложениями в морские патрульные корабли",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 5000,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 5 тыс. военнослужащих — крупнейшие силы англоязычных южных Карибов; береговая охрана — приоритет из-за венесуэльского трафика",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотный полк (два батальона), инженерный батальон, силы поддержки",
      navyRu: "Береговая охрана: морские патрульные корабли Damen и австралийские Cape-class (заказ), база Чагуарамас",
      airForceRu: "Воздушная гвардия: вертолёты и лёгкие самолёты наблюдения, включая переданные США",
      otherRu: "Резерв обороны, военно-медицинский компонент",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли Damen и Cape-class",
        roleRu: "Контроль пролива между Тринидадом и Венесуэлой, борьба с трафиком",
        quantityNoteRu: "Несколько вымпелов Damen; 2 корабля Cape-class заказаны у Austal",
        originRu: "Нидерланды и Австралия",
        provenance: pv("IISS; Austal", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты AW139 и лёгкие самолёты",
        roleRu: "Патрулирование и поддержка полиции",
        quantityNoteRu: "Единицы–десятки бортов",
        originRu: "Италия и США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "США — обучение и техника; Австралия и Нидерланды — патрульные корабли; Китай строил инфраструктуру, что вызывает внимание США",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Обучение, вертолёты, совместные учения UNITAS/Tradewinds",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Австралия (Austal)",
          noteRu: "Патрульные корабли Cape-class",
          provenance: pv("Austal; правительство Тринидада", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["КАРИКОМ", "Региональное сотрудничество с США (Tradewinds)"],
    vulnerabilities: [
      {
        titleRu: "Венесуэльский фактор в 11 км",
        descriptionRu: "Пролив Серпент-Маут отделяет Тринидад от Венесуэлы: оружие, наркотики и миграция идут через него, а газовое месторождение Dragon — предмет санкций и дипломатии одновременно",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Банды и уровень убийств",
        descriptionRu: "Чрезвычайное положение вводилось в конце 2024 года из-за волны бандитских убийств: армия привлечена к внутренней безопасности",
        severityRu: "средняя",
        provenance: pv("Открытая пресса; аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Морской акцент: Cape-class и обновление береговой охраны",
      programs: [
        {
          nameRu: "Корабли Cape-class",
          noteRu: "Два патрульных корабля австралийской постройки для замены устаревших вымпелов",
          provenance: pv("Austal", 2024, false),
        },
      ],
      provenance: {
        source: "Austal; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция (TTPS) — основной орган правопорядка; армия усиливает её в кризисах",
    overallNoteRu: "Численность по IISS; география пролива определяет весь профиль",
  },
  {
    iso3: "GUY",
    name: "Guyana",
    nameRu: "Гайана",
    region: "Южная Америка",
    subregionRu: "Северное побережье Южной Америки, спор Эссекибо с Венесуэлой",
    forcesStatusRu: "Регулярные силы: Силы обороны Гайаны (GDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.11,
      amountNoteRu: "Порядка 0,1 млрд долл. до нефтяного бума; после референдума Венесуэлы по Эссекибо (2023) правительство объявило резкий рост оборонных расходов",
      year: 2024,
      shareOfGdpPct: 0.7,
      trendRu: "Резкий рост с 2024 года на нефтяные доходы: авиация, катера, инфраструктура",
      provenance: {
        source: "Оценка проекта по IISS и заявлениям правительства Гайаны",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 3400,
      reserve: 1500,
      paramilitary: null,
      noteRu: "Около 3,4 тыс. военнослужащих при населении менее 1 млн; резерв — народная милиция",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные батальоны, спецподразделение",
      navyRu: "Береговая охрана: морские патрульные корабли (заказан OPV у Франции), речные катера",
      airForceRu: "Авиационный корпус: лёгкие самолёты и вертолёты, включая индийские Dhruv (линия кредита Индии)",
      otherRu: "Инженерный батальон, медицинская служба",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Морской патрульный корабль (заказ Ocea, Франция)",
        roleRu: "Защита морской нефтегазовой зоны",
        quantityNoteRu: "Контракт на OPV подписан в 2024 году; до этого — малые катера американской передачи",
        originRu: "Франция",
        provenance: pv("Правительство Гайаны; открытая пресса", 2024, false),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты HAL Dhruv и лёгкие самолёты",
        roleRu: "Транспорт в джунгли и наблюдение",
        quantityNoteRu: "2 Dhruv по индийской кредитной линии, несколько лёгких самолётов",
        originRu: "Индия",
        provenance: pv("Открытая пресса", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Лёгкая бронетехника и артиллерия наследия (EE-9 Cascavel и др.)",
        roleRu: "Поддержка пехоты",
        quantityNoteRu: "Парк мал и устарел",
        originRu: "Бразилия и Великобритания (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "США — гарант и партнёр (Южное командование, учения), Франция — корабли, Индия — авиация в кредит, Бразилия — региональное сотрудничество",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Обучение, совместные учения, политическая гарантия против Венесуэлы",
          provenance: pv("Южное командование США", 2024, false),
        },
        {
          supplier: "Франция",
          noteRu: "Патрульный корабль OPV",
          provenance: pv("Открытая пресса", 2024, false),
        },
        {
          supplier: "Индия",
          noteRu: "Вертолёты и самолёты по кредитной линии",
          provenance: pv("Открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; открытая пресса",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["КАРИКОМ", "Оборонное партнёрство с США и Великобританией (гарантии по Эссекибо)"],
    vulnerabilities: [
      {
        titleRu: "Претензия Венесуэлы на две трети территории",
        descriptionRu: "Эссекибо — 160 тыс. км² с нефтью и золотом: референдум Каракаса 2023 года и закон об аннексии создали постоянный кризис, в котором GDF слабее венесуэльской армии на порядок",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Нефтяная зависимость и «голландская болезнь» обороны",
        descriptionRu: "Рост расходов идёт с нулевой базы институтов: риск закупок без системы обслуживания и подготовки на нефтяные деньги",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Формирование современных сил с нуля на нефтяные доходы: OPV, авиация, базы и совместные учения с США",
      programs: [
        {
          nameRu: "Морская программа",
          noteRu: "OPV из Франции и расширение береговой охраны для защиты шельфа ExxonMobil",
          provenance: pv("Правительство Гайаны", 2024, true),
        },
      ],
      provenance: {
        source: "Правительство Гайаны; открытая пресса",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция Гайаны — отдельный орган; GDF исторически также строит инфраструктуру в глубине страны",
    overallNoteRu: "Профиль страны в точке перелома: нефтяной бум и территориальный кризис одновременно",
  },
  {
    iso3: "SUR",
    name: "Suriname",
    nameRu: "Суринам",
    region: "Южная Америка",
    subregionRu: "Северное побережье Южной Америки, бывшая нидерландская Гвиана",
    forcesStatusRu: "Малые регулярные силы: Национальная армия Суринама",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.03,
      amountNoteRu: "Порядка 25–35 млн долл.",
      year: 2024,
      shareOfGdpPct: 0.7,
      trendRu: "Стабильный минимум; ожидания роста связаны с морской нефтью (проект TotalEnergies с 2028 года)",
      provenance: {
        source: "Оценка проекта по IISS и CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 1840,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 1,8 тыс. военнослужащих; армия исторически политизирована (переворот 1980 года и правление Баутерсе), сегодня — под гражданским контролем",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотный батальон, военная полиция",
      navyRu: "Морское крыло: патрульные катера для побережья и рек",
      airForceRu: "Авиационное крыло: лёгкие самолёты и вертолёты (включая индийские Chetak/Dhruv)",
      otherRu: "Инженерные и медицинские подразделения",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "Вертолёты HAL Chetak (Индия)",
        roleRu: "Транспорт и наблюдение джунглей",
        quantityNoteRu: "3 вертолёта поставлены Индией в 2015 году",
        originRu: "Индия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Патрульные катера",
        roleRu: "Контроль рек и побережья, наркотрафик",
        quantityNoteRu: "Несколько катеров разного происхождения",
        originRu: "Нидерланды и США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Лёгкая бронетехника наследия (EE-9/EE-11 Бразилии)",
        roleRu: "Поддержка пехоты",
        quantityNoteRu: "Парк мал и частично неисправен",
        originRu: "Бразилия (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Нидерланды — исторические связи и обучение, Индия — вертолёты, США — программы сотрудничества",
      suppliers: [
        {
          supplier: "Индия",
          noteRu: "Вертолёты Chetak, кредитные линии",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Нидерланды",
          noteRu: "Обучение офицеров, катера",
          provenance: pv("Минобороны Нидерландов", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["КАРИКОМ", "UNASUR (исторически)"],
    vulnerabilities: [
      {
        titleRu: "Пограничные споры с Гайаной и Французской Гвианой",
        descriptionRu: "Район Тигри (спор с Гайаной) и река Марони (с Францией) — замороженные споры без военного решения при малых силах",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Наркотрафик и незаконная добыча золота",
        descriptionRu: "Джунгли внутренних районов слабо контролируются: незаконные шахты и маршруты кокаина — главные задачи армии и полиции",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; ожидания связаны с будущими нефтяными доходами конца 2020-х",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция Суринама — основной орган; армия поддерживает её в операциях в глубине страны",
    overallNoteRu: "Малый профиль малой страны; данные IISS фрагментарны и округлены",
  },
  {
    iso3: "BEN",
    name: "Benin",
    nameRu: "Бенин",
    region: "Западная Африка",
    subregionRu: "Гвинейский залив, север граничит с Буркина-Фасо и Нигером",
    forcesStatusRu: "Регулярные вооружённые силы",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.15,
      amountNoteRu: "Порядка 0,12–0,2 млрд долл.; рост после 2021 года из-за джихадистского давления на север",
      year: 2024,
      shareOfGdpPct: 0.9,
      trendRu: "Рост: операция «Мирамбо» на севере, закупки бронетехники и БПЛА",
      provenance: {
        source: "Оценка проекта по SIPRI и бюджету Бенина",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 7250,
      reserve: null,
      paramilitary: 4800,
      noteRu: "Около 7,3 тыс. военных; республиканская полиция после реформы 2018 года объединена с жандармерией",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные батальоны, северная группировка против джихадистов",
      navyRu: "ВМС: патрульные катера и корабли в Котону",
      airForceRu: "Авиация: лёгкие самолёты и вертолёты в малом числе",
      otherRu: "Национальная гвардия, республиканская полиция",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника советского/китайского наследия и французские бронеавтомобили",
        roleRu: "Мобильность северной группировки",
        quantityNoteRu: "Десятки единиц смешанного парка",
        originRu: "Франция, Китай, СССР (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "БПЛА",
        system: "Разведывательные БПЛА (закупки у Турции и Израиля — по открытым данным)",
        roleRu: "Контроль северных национальных парков (Пенджари, W), где закрепились джихадисты",
        quantityNoteRu: "Единицы систем, программы с 2022 года",
        originRu: "Турция / Израиль (по открытым данным)",
        provenance: pv("Открытая пресса", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Франция — исторический партнёр, Китай и Турция — новые поставщики, ЕС финансирует программы безопасности севера",
      suppliers: [
        {
          supplier: "Франция",
          noteRu: "Бронетехника, обучение, разведывательная поддержка",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Китай",
          noteRu: "Бронетехника и экипировка по грантам",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ЭКОВАС", "Аккрская инициатива (Гана, Кот-д'Ивуар, Того, Бенин)"],
    vulnerabilities: [
      {
        titleRu: "Джихадистский фронт на севере",
        descriptionRu: "Группировки JNIM и ИГ-Сахель закрепились в парках Пенджари и W: армия впервые ведёт постоянную контртеррористическую войну при малых ресурсах",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; ACLED", 2024, true),
      },
      {
        titleRu: "Граница с Нигером после переворота 2023 года",
        descriptionRu: "Разрыв Ниамея с ЭКОВАС и закрытие границы ударили по торговле и создали серую зону на севере",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Наращивание северной группировки: лагеря, бронетехника, БПЛА и набор рекрутов",
      programs: [
        {
          nameRu: "Операция «Мирамбо»",
          noteRu: "Постоянное развёртывание на севере с 2021 года, расширение штата армии",
          provenance: pv("Правительство Бенина", 2024, true),
        },
      ],
      provenance: {
        source: "Правительство Бенина; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Республиканская полиция объединяет бывшую полицию и жандармерию",
    overallNoteRu: "Профиль страны, чья армия за три года перешла от гарнизонной модели к контртеррористической",
  },
  {
    iso3: "BFA",
    name: "Burkina Faso",
    nameRu: "Буркина-Фасо",
    region: "Западная Африка",
    subregionRu: "Сахель, эпицентр джихадистского кризиса региона",
    forcesStatusRu: "Регулярные вооружённые силы при военном режиме (перевороты 2022 года)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.45,
      amountNoteRu: "Порядка 0,4–0,5 млрд долл., доля ВВП резко выросла (около 3% и выше по оценкам): война стала главной статьёй государства",
      year: 2024,
      shareOfGdpPct: 3.0,
      trendRu: "Резкий рост с 2022 года: набор, добровольцы VDP, закупки турецких БПЛА",
      provenance: {
        source: "Оценка проекта по SIPRI и открытым бюджетам",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 17500,
      reserve: null,
      paramilitary: 45000,
      noteRu: "Около 17,5 тыс. военных плюс десятки тысяч добровольцев защиты родины (VDP) — слабо обученное ополчение; оценки численности VDP расходятся (25–50 тыс.)",
      provenance: {
        source: "IISS Military Balance 2024; ООН",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные полки и батальоны быстрого вмешательства (BIR) как ударная сила",
      navyRu: "Отсутствуют (нет выхода к морю)",
      airForceRu: "Авиация: вертолёты, лёгкие штурмовики наследия; ударные БПЛА Bayraktar TB2 и Akıncı — качественный скачок",
      otherRu: "Жандармерия, национальная гвардия, добровольцы VDP",
    },
    equipment: [
      {
        branchRu: "БПЛА",
        system: "Bayraktar TB2 и Akıncı",
        roleRu: "Удары по джихадистам — центральный инструмент режима Траоре",
        quantityNoteRu: "Несколько систем поставлены Турцией в 2022–2024 годах, применяются интенсивно",
        originRu: "Турция",
        provenance: pv("Открытая пресса; заявления властей", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника французского и китайского происхождения, пикапы",
        roleRu: "Мобильность в саванне",
        quantityNoteRu: "Смешанный парк, потери в засадах высоки",
        originRu: "Франция, Китай, ЮАР (исторически)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты Ми-171 и Ми-24 (российские связи)",
        roleRu: "Транспорт и огневая поддержка",
        quantityNoteRu: "Единицы–десятки бортов; поставки и обслуживание при участии России после 2023 года",
        originRu: "Россия",
        provenance: pv("IISS; открытая пресса", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Смена покровителей: Франция и США вытеснены Россией (инструкторы «Африканского корпуса») и Турцией (БПЛА) после переворотов 2022 года",
      suppliers: [
        {
          supplier: "Турция",
          noteRu: "БПЛА TB2 и Akıncı, бронетехника",
          provenance: pv("Открытая пресса", 2024, true),
        },
        {
          supplier: "Россия",
          noteRu: "Инструкторы, вертолёты, боеприпасы, политическая поддержка",
          provenance: pv("Открытая пресса; IISS", 2024, true),
        },
        {
          supplier: "Китай",
          noteRu: "Бронетехника и экипировка",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; открытая пресса",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Альянс государств Сахеля (AES) с Мали и Нигером (с 2023 года)", "Выход из ЭКОВАС (объявлен в 2024 году)"],
    vulnerabilities: [
      {
        titleRu: "Потеря контроля над территорией",
        descriptionRu: "По оценкам аналитических центров, джихадисты (JNIM, ИГ-Сахель) контролируют или блокируют до 40% территории; города Джибо и др. годами в блокаде",
        severityRu: "высокая",
        provenance: pv("ACLED; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Модель VDP и насилие против гражданских",
        descriptionRu: "Массовое ополчение без подготовки вовлечено в этнические расправы (фульбе), что подпитывает рекрутирование джихадистов — стратегический замкнутый круг",
        severityRu: "высокая",
        provenance: pv("ООН; Human Rights Watch", 2024, true),
      },
      {
        titleRu: "Зависимость режима от войны",
        descriptionRu: "Хунта легитимируется войной, но конца ей не видно: переход к гражданской власти откладывается, экономика и гуманитарный доступ деградируют",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Милитаризация вместо модернизации: набор, VDP, турецкие БПЛА и российские инструкторы",
      programs: [
        {
          nameRu: "Батальоны быстрого вмешательства (BIR)",
          noteRu: "Создание ударных батальонов с 2023 года как ответа на засады джихадистов",
          provenance: pv("Заявления властей; открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "Открытая пресса; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Жандармерия и полиция действуют в едином военном контуре; свободная пресса о войне ограничена",
    overallNoteRu: "Пониженное доверие к данным: статистика войны закрыта, оценки — ООН, ACLED и IISS",
  },
  {
    iso3: "BDI",
    name: "Burundi",
    nameRu: "Бурунди",
    region: "Восточная Африка",
    subregionRu: "Великие озёра, границы с Руандой, ДРК и Танзанией",
    forcesStatusRu: "Регулярные вооружённые силы (FDNB)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.09,
      amountNoteRu: "Порядка 0,08–0,1 млрд долл.",
      year: 2024,
      shareOfGdpPct: 2.5,
      trendRu: "Стабильный уровень при одной из беднейших экономик мира",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 30000,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 30 тыс. военнослужащих — армия непропорционально велика для экономики и активно зарабатывает на миротворчестве (контингенты в Сомали и ЦАР)",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные батальоны, лёгкая бронетехника",
      navyRu: "Озёрный компонент на Танганьике в составе армии",
      airForceRu: "Авиация: несколько вертолётов, боевой авиации нет",
      otherRu: "Полиция и национальная служба разведки (SNR) — политически значимый орган",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника китайского и южноафриканского происхождения (WMA301, RG-31 — миротворческие)",
        roleRu: "Мобильность и миссии Африканского союза",
        quantityNoteRu: "Десятки единиц, лучшая техника закреплена за миротворческими контингентами",
        originRu: "Китай и ЮАР",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты Ми-8 и лёгкие самолёты",
        roleRu: "Транспорт",
        quantityNoteRu: "Единицы бортов",
        originRu: "СССР / Россия (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Китай — техника и обучение; миротворческая техника частично финансируется партнёрами АС и ООН",
      suppliers: [
        {
          supplier: "Китай",
          noteRu: "Бронетехника, транспорт, обучение",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Восточноафриканское сообщество (EAC)", "Африканский союз (миссии ATMIS/AUSSOM в Сомали)"],
    vulnerabilities: [
      {
        titleRu: "Конфронтация с Руандой",
        descriptionRu: "Взаимные обвинения в поддержке вооружённых групп (RED-Tabara против Кигали; бурундийские войска в ДРК против M23) довели отношения до закрытия границы в 2024 году",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Армия как экономический актор",
        descriptionRu: "Миротворческие выплаты — источник валюты и лояльности офицерства; сокращение миссий АС бьёт по внутренней стабильности",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; поддержание миротворческой техники",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Молодёжное крыло правящей партии Imbonerakure фактически выполняет парамилитарные функции — фактор внутреннего риска",
    overallNoteRu: "Численность по IISS; армия велика относительно экономики и политически центральна",
  },
  {
    iso3: "CPV",
    name: "Cabo Verde",
    nameRu: "Кабо-Верде",
    region: "Западная Африка",
    subregionRu: "Архипелаг в Атлантике у побережья Сенегала",
    forcesStatusRu: "Малые регулярные силы: Вооружённые силы Кабо-Верде",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.01,
      amountNoteRu: "Порядка 10–15 млн долл.",
      year: 2024,
      shareOfGdpPct: 0.6,
      trendRu: "Стабильный минимум",
      provenance: {
        source: "Оценка проекта по IISS и CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 1200,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 1,2 тыс. человек: береговая охрана — главный компонент, сухопутный — две роты",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутный компонент: две пехотные роты",
      navyRu: "Береговая охрана: морские патрульные корабли (Damen) и катера",
      airForceRu: "Авиационный компонент береговой охраны: самолёты Dornier 228 морского патрулирования",
      otherRu: "Военная полиция",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли типа Guardião (Damen Stan Patrol)",
        roleRu: "Контроль огромной ИЭЗ архипелага",
        quantityNoteRu: "1–2 корабля и катера",
        originRu: "Нидерланды (Damen)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Dornier 228",
        roleRu: "Морское патрулирование и поиск-спасание",
        quantityNoteRu: "2 самолёта",
        originRu: "Германия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Португалия — исторический партнёр, США — программы морской безопасности, Китай — инфраструктура",
      suppliers: [
        {
          supplier: "Португалия",
          noteRu: "Обучение, совместные учения, техника",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "США",
          noteRu: "Морская безопасность, радары побережья",
          provenance: pv("Африканское командование США", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ЭКОВАС", "Двустороннее сотрудничество с Португалией и США"],
    vulnerabilities: [
      {
        titleRu: "ИЭЗ больше возможностей контроля",
        descriptionRu: "734 тыс. км² морской зоны при одном-двух кораблях: наркотрафик из Южной Америки в Европу идёт транзитом через архипелаг",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; обсуждается усиление морского наблюдения при поддержке партнёров",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Национальная полиция — основной орган правопорядка островов",
    overallNoteRu: "Микропрофиль атлантического архипелага с морской спецификой",
  },
  {
    iso3: "CMR",
    name: "Cameroon",
    nameRu: "Камерун",
    region: "Центральная Африка",
    subregionRu: "Гвинейский залив, фронты на севере (Боко Харам) и западе (англоязычный кризис)",
    forcesStatusRu: "Регулярные вооружённые силы",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.45,
      amountNoteRu: "Порядка 0,4–0,5 млрд долл.",
      year: 2024,
      shareOfGdpPct: 1.0,
      trendRu: "Рост на фоне двух внутренних конфликтов и операций в бассейне озера Чад",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 40000,
      reserve: null,
      paramilitary: 9000,
      noteRu: "Около 40 тыс. военных (оценки IISS расходятся по компонентам); батальоны быстрого вмешательства (BIR) — элитная и лучше финансируемая сила, подчинённая президенту",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные бригады, бронетанковый компонент советского/китайского парка",
      navyRu: "ВМС: морские патрульные корабли и катера в Дуале, защита нефтяных платформ залива",
      airForceRu: "Авиация: вертолёты, лёгкие штурмовики Alpha Jet наследия в ограниченном состоянии",
      otherRu: "Жандармерия, президентская гвардия, BIR как параллельная структура",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника китайского производства (Type 07P, WMA301) и советское наследие",
        roleRu: "Мобильность и огневая поддержка",
        quantityNoteRu: "Десятки единиц; Китай — главный поставщик новой наземной техники",
        originRu: "Китай",
        provenance: pv("IISS Military Balance; SIPRI", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли (испанские и китайские поставки)",
        roleRu: "Защита нефтяной инфраструктуры и борьба с пиратством",
        quantityNoteRu: "Несколько вымпелов и катеров",
        originRu: "Испания и Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты Ми-171 и Bell, транспортные самолёты",
        roleRu: "Мобильность в северных и западных регионах",
        quantityNoteRu: "Около двух десятков бортов",
        originRu: "Россия и США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет, кроме мастерских и верфи в Дуале гражданского профиля",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Китай — техника, Франция — историческое обучение, Израиль — подготовка BIR в прошлом, США — антитеррористическая помощь по озеру Чад",
      suppliers: [
        {
          supplier: "Китай",
          noteRu: "Бронетехника, патрульные корабли, обучение",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Франция",
          noteRu: "Обучение и техника наследия",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Многонациональная объединённая оперативная группа (MNJTF) по озеру Чад", "CEMAC"],
    vulnerabilities: [
      {
        titleRu: "Два внутренних фронта",
        descriptionRu: "Север (Боко Харам/ИГ-ЗА) и англоязычный северо-запад и юго-запад (сепаратисты с 2017 года) растягивают армию; второй конфликт не имеет военного решения и тлеет годами",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; ООН", 2024, true),
      },
      {
        titleRu: "Преемственность власти",
        descriptionRu: "Президент Бия у власти с 1982 года: вопрос преемственности — системный риск для всей силовой вертикали, включая привилегированный BIR",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Точечные закупки китайской техники и усиление BIR без системной программы",
      programs: [],
      provenance: {
        source: "IISS Military Balance",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Жандармерия и полиция делят внутренний контур; BIR регулярно обвиняется правозащитниками в злоупотреблениях",
    overallNoteRu: "Численность по IISS с оговоркой о расхождении оценок по компонентам",
  },
  {
    iso3: "CAF",
    name: "Central African Republic",
    nameRu: "ЦАР",
    region: "Центральная Африка",
    subregionRu: "Сердце континента, государство с хроническим присутствием внешних сил",
    forcesStatusRu: "Регулярные силы (FACA) при решающей роли российских инструкторов и миротворцев ООН",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.05,
      amountNoteRu: "Порядка 40–60 млн долл.; значительная часть реальной безопасности финансируется извне (ООН, Россия, ЕС)",
      year: 2024,
      shareOfGdpPct: 1.8,
      trendRu: "Рост номинальный; боеспособность определяется внешней поддержкой",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 9000,
      reserve: null,
      paramilitary: null,
      noteRu: "Номинально около 9 тыс. в FACA после программ восстановления; реальная боеспособность низкая, лояльность фрагментирована; в стране — около 14 тыс. миротворцев MINUSCA и российские инструкторы («Африканский корпус»)",
      provenance: {
        source: "IISS Military Balance 2024; ООН",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: несколько батальонов, собранных при международной помощи",
      navyRu: "Отсутствуют (нет выхода к морю)",
      airForceRu: "Фактически отсутствует: единичные лёгкие самолёты и вертолёты",
      otherRu: "Жандармерия, президентская гвардия — наиболее боеспособный компонент",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника российских поставок (БТР, БРДМ-2) и китайские автомобили",
        roleRu: "Мобильность и охрана столицы",
        quantityNoteRu: "Десятки единиц, переданных Россией в 2018–2020 годах после смягчения эмбарго",
        originRu: "Россия и Китай",
        provenance: pv("IISS; панель экспертов ООН", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Стрелковое оружие и миномёты советского образца",
        roleRu: "Основное вооружение",
        quantityNoteRu: "Склады частично контролируются слабо; утечки вооружённым группам — хроническая проблема",
        originRu: "Разные (наследие и поставки)",
        provenance: pv("Панель экспертов ООН по ЦАР", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Россия — оружие и инструкторы в обмен на концессии (золото, алмазы); Китай и ЕС — инфраструктура и обучение; эмбарго ООН на поставки правительству смягчено в 2022–2024 годах",
      suppliers: [
        {
          supplier: "Россия",
          noteRu: "Техника, инструкторы «Африканского корпуса», охрана руководства",
          provenance: pv("Панель экспертов ООН; открытая пресса", 2024, true),
        },
        {
          supplier: "Китай",
          noteRu: "Автомобили и экипировка",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; ООН",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["CEMAC", "Присутствие MINUSCA (ООН) и российских инструкторов"],
    vulnerabilities: [
      {
        titleRu: "Государство не контролирует периферию",
        descriptionRu: "Вооружённые группы (3R, UPC и др.) удерживают районы добычи золота и алмазов; FACA без россиян и MINUSCA не удерживает даже ключевые дороги",
        severityRu: "высокая",
        provenance: pv("ООН; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Зависимость от внешних гарантов",
        descriptionRu: "Безопасность режима Туадера персонально связана с российским присутствием: уход любого из внешних акторов меняет баланс мгновенно",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; восстановление армии идёт через донорские батальоны и обучение",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Жандармерия и полиция слабы; реальный порядок в столице — президентская гвардия и партнёры",
    overallNoteRu: "Пониженное доверие к числам: номинальная численность FACA не равна боеспособной",
  },
  {
    iso3: "TCD",
    name: "Chad",
    nameRu: "Чад",
    region: "Центральная Африка",
    subregionRu: "Сахель и бассейн озера Чад, транзитная страна войны в Судане",
    forcesStatusRu: "Регулярные вооружённые силы — опора режима Деби",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.35,
      amountNoteRu: "Порядка 0,3–0,4 млрд долл.; нефтяные доходы исторически направляются на армию",
      year: 2024,
      shareOfGdpPct: 2.2,
      trendRu: "Рост на фоне войны в Судане и давления Боко Харам на озеро Чад",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 35000,
      reserve: null,
      paramilitary: 12500,
      noteRu: "Около 35 тыс. военных — одна из самых боеспособных армий Сахеля по боевому опыту; президентская гвардия (DGSSIE) — привилегированное ядро",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: мобильные пехотные группировки пустынного типа, бронетехника советского/французского парка",
      navyRu: "Отсутствуют (нет выхода к морю)",
      airForceRu: "Авиация: штурмовики Су-25, вертолёты Ми-171/Ми-24, транспортные самолёты",
      otherRu: "Президентская гвардия DGSSIE, жандармерия, национальная гвардия кочевников (GNNT)",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "Су-25 и вертолёты Ми-24 / Ми-171",
        roleRu: "Ударная и транспортная поддержка пустынных операций",
        quantityNoteRu: "Единицы–десятки бортов, обслуживание при участии украинских и др. подрядчиков исторически",
        originRu: "СССР / Россия / Украина (наследие и обслуживание)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника советского наследия и французские бронеавтомобили, РСЗО",
        roleRu: "Мобильность в пустыне",
        quantityNoteRu: "Сотни единиц смешанного состояния",
        originRu: "СССР, Франция, Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "БПЛА",
        system: "Турецкие БПЛА (по открытым данным 2023–2024 годов)",
        roleRu: "Разведка границ с Суданом и Ливией",
        quantityNoteRu: "Программы разворачиваются, объёмы не раскрыты",
        originRu: "Турция",
        provenance: pv("Открытая пресса", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет, кроме мастерских; военная техника полностью импортная",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Франция — исторический покровитель (база в Нджамене до пересмотра присутствия в 2024–2025 годах), Россия и Турция наращивают предложения, Китай — техника",
      suppliers: [
        {
          supplier: "Франция",
          noteRu: "Техника, обучение, многолетнее военное присутствие (пересматривается)",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Турция",
          noteRu: "БПЛА и бронетехника (по открытым данным)",
          provenance: pv("Открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Многонациональная группа по озеру Чад (MNJTF)", "CEMAC", "G5 Сахель (исторически)"],
    vulnerabilities: [
      {
        titleRu: "Война в Судане на границе",
        descriptionRu: "Сотни тысяч беженцев, перетоки оружия и риск втягивания через дарфурские связи клана Деби: восточная граница — главный риск эскалации",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; ООН", 2024, true),
      },
      {
        titleRu: "Кланность армии и преемственность",
        descriptionRu: "Армия построена вокруг загава и семьи Деби: передача власти Махамату Деби после гибели отца в бою (2021) показала и силу, и хрупкость модели",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Нефтяная зависимость бюджета",
        descriptionRu: "Доходы от нефти Добы финансируют армию напрямую: ценовые шоки мгновенно бьют по боеспособности",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Точечные закупки БПЛА и бронетехники; ставка на опыт и мобильность, а не на новые платформы",
      programs: [],
      provenance: {
        source: "IISS Military Balance",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "DGSSIE и жандармерия — параллельные контуры лояльности вокруг президента",
    overallNoteRu: "Численность по IISS; армия Чада — региональный военный актор, несмотря на бедность страны",
  },
  {
    iso3: "COM",
    name: "Comoros",
    nameRu: "Коморы",
    region: "Восточная Африка",
    subregionRu: "Архипелаг в Мозамбикском проливе между Мадагаскаром и Мозамбиком",
    forcesStatusRu: "Микросилы: Силы обороны Комор (армия и жандармерия)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.01,
      amountNoteRu: "Порядка 10 млн долл.; данные фрагментарны",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Стабильный минимум",
      provenance: {
        source: "Оценка проекта по IISS и CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 1000,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 1 тыс. человек суммарно в армии, жандармерии и береговой охране; история страны — десятки переворотов и наёмных интервенций XX века",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутный компонент: роты на трёх островах",
      navyRu: "Береговая охрана: несколько патрульных катеров",
      airForceRu: "Отсутствует",
      otherRu: "Жандармерия — основной силовой орган островов",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные катера",
        roleRu: "Контроль пролива и рыболовства",
        quantityNoteRu: "Несколько катеров разного происхождения",
        originRu: "Франция и др.",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Франция (Майотта рядом) и Африканский союз — гаранты: операция АС восстановила порядок на Анжуане в 2008 году",
      suppliers: [
        {
          supplier: "Франция",
          noteRu: "Обучение и военно-морское присутствие из Майотты",
          provenance: pv("Открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Африканский союз", "Лига арабских государств", "Франкофония"],
    vulnerabilities: [
      {
        titleRu: "Сепаратизм Анжуана и история переворотов",
        descriptionRu: "Около двадцати переворотов и попыток с 1975 года: институт армии слаб, стабильность зависит от внешних гарантов и политики Франции по Майотте",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Жандармерия и полиция островов — повседневный контур",
    overallNoteRu: "Микропрофиль: данные IISS минимальны, числа округлены",
  },
  {
    iso3: "COG",
    name: "Republic of the Congo",
    nameRu: "Республика Конго",
    region: "Центральная Африка",
    subregionRu: "Центральная Африка, нефтяное государство на реке Конго",
    forcesStatusRu: "Регулярные вооружённые силы",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.3,
      amountNoteRu: "Порядка 0,25–0,35 млрд долл., сильно зависит от нефтяных цен",
      year: 2024,
      shareOfGdpPct: 2.5,
      trendRu: "Волатилен вслед за нефтью; закупки эпизодические",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 10000,
      reserve: null,
      paramilitary: 2000,
      noteRu: "Около 10 тыс. военных; президентская гвардия — привилегированный компонент режима Сассу-Нгессо",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные и бронетанковые подразделения советского наследия",
      navyRu: "ВМС: патрульные корабли и катера в Пуэнт-Нуаре",
      airForceRu: "Авиация: истребители МиГ-21 наследия в ограниченном состоянии, вертолёты",
      otherRu: "Жандармерия, президентская гвардия",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Т-55/Т-72 и бронетехника советского наследия, РСЗО",
        roleRu: "Основа парка со времён гражданской войны 1990-х",
        quantityNoteRu: "Десятки единиц, состояние неоднородно",
        originRu: "СССР / Россия и Украина (наследие и поставки)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли китайской постройки",
        roleRu: "Защита нефтяных платформ и побережья",
        quantityNoteRu: "Несколько вымпелов поставлены в 2010-е",
        originRu: "Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Россия и Китай — техника, Франция — исторические связи и обучение",
      suppliers: [
        {
          supplier: "Россия",
          noteRu: "Военно-техническое сотрудничество, обучение, поставки наследия",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Китай",
          noteRu: "Патрульные корабли, бронетехника, инфраструктурные кредиты",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["CEMAC", "Африканский союз"],
    vulnerabilities: [
      {
        titleRu: "Нефтяная зависимость и долг Китаю",
        descriptionRu: "Бюджет и армия зависят от нефти и китайских кредитов под неё: ценовой шок равен оборонному кризису",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта; МВФ", 2024, true),
      },
      {
        titleRu: "Регион Пул и наследие милиции",
        descriptionRu: "Вооружённые выступления «ниндзя» в Пуле (2016–2017) показали хрупкость контроля над югом столицы",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ не видно; поддержание наследия",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Жандармерия и полиция — внутренний контур; армия политически нейтрализована президентской гвардией",
    overallNoteRu: "Численность и парк — оценки IISS для страны со средней прозрачностью",
  },
  {
    iso3: "COD",
    name: "DR Congo",
    nameRu: "ДР Конго",
    region: "Центральная Африка",
    subregionRu: "Вторая страна Африки по площади, война на востоке (Киву, Итури)",
    forcesStatusRu: "Регулярные вооружённые силы (FARDC) в состоянии постоянной войны на востоке",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.8,
      amountNoteRu: "Порядка 0,6–1 млрд долл. по оценкам; резко вырос после 2022 года из-за войны с M23, реальные потоки частично внебюджетны",
      year: 2024,
      shareOfGdpPct: 1.2,
      trendRu: "Рост: набор, закупки БПЛА и авиации, оплата иностранных подрядчиков",
      provenance: {
        source: "Оценка проекта по SIPRI, IISS и бюджету ДРК",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 134000,
      reserve: null,
      paramilitary: null,
      noteRu: "Номинально 130+ тыс. по IISS, боеспособное ядро значительно меньше: бригады востока усилены иностранными подрядчиками (Румыния и др.), контингентами САДК и бурундийскими войсками",
      provenance: {
        source: "IISS Military Balance 2024; ООН",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: десятки бригад неравного качества, республиканская гвардия — привилегированное ядро",
      navyRu: "Речной и озёрный компонент, морская сила символическая (выход к океану — 37 км)",
      airForceRu: "Авиация: штурмовики Су-25, вертолёты Ми-24/Ми-8, транспортные самолёты; БПЛА CH-4 китайского производства",
      otherRu: "Военная полиция, республиканская гвардия, местные милиции «Вазалендо» как союзный прокси-контур",
    },
    equipment: [
      {
        branchRu: "БПЛА",
        system: "CH-4 (Китай)",
        roleRu: "Разведка и удары по M23 и ADF",
        quantityNoteRu: "Несколько систем поставлены в 2023 году, применяются на востоке",
        originRu: "Китай",
        provenance: pv("Открытая пресса; IISS", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Су-25 и Ми-24",
        roleRu: "Авиационная поддержка в Киву",
        quantityNoteRu: "Единицы летнопригодных бортов; один Су-25 сбит/сбит по заявлениям сторон в 2023 году",
        originRu: "СССР / Украина / Грузия (наследие рынков)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Т-55/Т-72, БМП и артиллерия смешанного наследия, РСЗО",
        roleRu: "Основа наземного парка",
        quantityNoteRu: "Сотни единиц в неоднородном состоянии",
        originRu: "СССР, Китай, Украина (наследие и поставки)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет; горнодобывающий сектор (кобальт, медь) — экономический фундамент, но не оборонный",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Китай — БПЛА и техника, Израиль и ЮАР — ниши, частные подрядчики из Румынии и др. стран — обучение и авиационная поддержка; MONUSCO сворачивается по требованию Киншасы",
      suppliers: [
        {
          supplier: "Китай",
          noteRu: "БПЛА CH-4, бронетехника, обучение",
          provenance: pv("SIPRI; открытая пресса", 2024, true),
        },
        {
          supplier: "Частные военные компании (Румыния и др.)",
          noteRu: "Инструкторы и охрана объектов в Гома и Киншасе (по данным ООН и прессы)",
          provenance: pv("ООН; открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; ООН",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["САДК (миссия SAMIDRC)", "Восточноафриканское сообщество (EAC)", "Двусторонние контингенты Бурунди и Уганды"],
    vulnerabilities: [
      {
        titleRu: "Война с M23 и фактор Руанды",
        descriptionRu: "M23 при поддержке Руанды (по оценкам ООН) захватил Гому и Букаву в начале 2025 года: FARDC не удержал крупнейшие города востока, несмотря на численное превосходство",
        severityRu: "высокая",
        provenance: pv("ООН; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Армия как источник нестабильности",
        descriptionRu: "Невыплаты, продажа оружия и союзы с милициями делают части FARDC частью военной экономики востока, а не её решением",
        severityRu: "высокая",
        provenance: pv("ООН; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Масштаб территории против инфраструктуры",
        descriptionRu: "2,3 млн км² без дорожной сети: переброска сил между Киншасой и востоком возможна почти только по воздуху",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Закон о военном программировании 2023 года обещает рост армии и закупок, но война съедает ресурсы быстрее реформ",
      programs: [
        {
          nameRu: "Программа набора и перевооружения FARDC",
          noteRu: "Массовый набор молодёжи с 2022 года, закупки БПЛА и авиации; качество подготовки отстаёт",
          provenance: pv("Правительство ДРК; IISS", 2024, true),
        },
      ],
      provenance: {
        source: "Правительство ДРК; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция слаба на востоке; реальную безопасность городов обеспечивают армия, прокси-милиции и иностранные контингенты",
    overallNoteRu: "Пониженное доверие к номинальным цифрам: численность FARDC не отражает боеспособность",
  },
  {
    iso3: "CIV",
    name: "Côte d'Ivoire",
    nameRu: "Кот-д'Ивуар",
    region: "Западная Африка",
    subregionRu: "Гвинейский залив, экономический лидер франкоязычной Западной Африки",
    forcesStatusRu: "Регулярные вооружённые силы (FACI)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.65,
      amountNoteRu: "Порядка 0,6–0,7 млрд долл.; рост из-за северного джихадистского фронта и программы модернизации",
      year: 2024,
      shareOfGdpPct: 0.9,
      trendRu: "Устойчивый рост после 2020 года",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 27400,
      reserve: null,
      paramilitary: 8000,
      noteRu: "Около 27 тыс. военных после перестройки армии посткризисного периода; жандармерия — сильный второй контур",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные и бронетанковые подразделения, северная группировка",
      navyRu: "ВМС: морские патрульные корабли (французские и израильские поставки), база Абиджан",
      airForceRu: "Авиация: вертолёты, транспортные самолёты; закуплены лёгкие ударные возможности и БПЛА",
      otherRu: "Жандармерия, президентская гвардия, спецназ",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли (тип OPV из Франции и Израиля)",
        roleRu: "Безопасность залива и нефтяных объектов",
        quantityNoteRu: "Несколько вымпелов поставлены в 2010–2020-е",
        originRu: "Франция и Израиль",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника китайского и французского производства",
        roleRu: "Мобильность и северный фронт",
        quantityNoteRu: "Десятки новых китайских БТР и бронеавтомобилей",
        originRu: "Китай и Франция",
        provenance: pv("IISS; SIPRI", 2024, true),
      },
      {
        branchRu: "БПЛА",
        system: "Разведывательные БПЛА израильского и турецкого происхождения (по открытым данным)",
        roleRu: "Контроль северной границы с Буркина-Фасо и Мали",
        quantityNoteRu: "Программы с 2022 года, объёмы не раскрыты",
        originRu: "Израиль / Турция",
        provenance: pv("Открытая пресса", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет, кроме ремонтных мощностей и верфи в Абиджане",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Франция остаётся ключевым партнёром (база в Порт-Буэ передана стране в 2025 году по пересмотру присутствия), Китай и Израиль наращивают поставки",
      suppliers: [
        {
          supplier: "Франция",
          noteRu: "Техника, обучение, академия контртерроризма в Жаквиле",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Китай",
          noteRu: "Бронетехника и транспорт",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ЭКОВАС", "Аккрская инициатива", "Оборонное партнёрство с Францией"],
    vulnerabilities: [
      {
        titleRu: "Северный джихадистский фронт",
        descriptionRu: "Атаки в районе Кафоло (2020–2021) показали проникновение JNIM из Буркина-Фасо: север страны — беднейший и наименее контролируемый",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Политическая память армии",
        descriptionRu: "Армия — актор кризисов 2002–2011 годов: реформы лояльности завершены не полностью, вопрос преемственности Уаттары открыт",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Закон военного программирования: рост численности, северные базы, БПЛА и флот",
      programs: [
        {
          nameRu: "Северная оперативная зона",
          noteRu: "Постоянная группировка и инфраструктура на границе с Буркина-Фасо и Мали",
          provenance: pv("Правительство Кот-д'Ивуара", 2024, true),
        },
      ],
      provenance: {
        source: "Правительство Кот-д'Ивуара; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Жандармерия — главный внутренний инструмент; армия всё больше ориентирована на север",
    overallNoteRu: "Численность по IISS; динамика расходов — восходящая на фоне сахельского кризиса",
  },
  {
    iso3: "DJI",
    name: "Djibouti",
    nameRu: "Джибути",
    region: "Восточная Африка",
    subregionRu: "Баб-эль-Мандебский пролив — самая «арендуемая» военная география мира",
    forcesStatusRu: "Регулярные вооружённые силы при уникальной концентрации иностранных баз",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.07,
      amountNoteRu: "Порядка 60–80 млн долл. собственного бюджета; реальные доходы от аренды баз (США, Китай, Франция, Япония, Италия) сопоставимы с ним или выше",
      year: 2024,
      shareOfGdpPct: 1.9,
      trendRu: "Стабилен; стратегическая рента растёт с кризисом Красного моря",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 10000,
      reserve: null,
      paramilitary: 2500,
      noteRu: "Около 10 тыс. военных при населении около 1 млн — милитаризация выше среднего по региону; жандармерия и гвардия — параллельные контуры",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные батальоны, бронетанковый компонент советского/китайского парка",
      navyRu: "ВМС и береговая охрана: патрульные катера для порта и пролива",
      airForceRu: "Авиация: вертолёты и лёгкие самолёты; воздушное пространство фактически контролируют иностранные базы",
      otherRu: "Республиканская гвардия, жандармерия",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника китайского и советского наследия",
        roleRu: "Основа наземного парка",
        quantityNoteRu: "Десятки единиц",
        originRu: "Китай и СССР (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Патрульные катера (японские и др. передачи)",
        roleRu: "Портовый контроль",
        quantityNoteRu: "Несколько катеров; реальную морскую безопасность обеспечивают флоты арендаторов",
        originRu: "Япония и др.",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет; экономика баз — главный «оборонный» актив",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Китай и Франция — техника и обучение; уникальность не в поставках, а в аренде: Camp Lemonnier (США), база НОАК (первая зарубежная Китая), базы Франции, Японии, Италии",
      suppliers: [
        {
          supplier: "Китай",
          noteRu: "Техника, обучение, инфраструктурные инвестиции",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Франция",
          noteRu: "Исторический партнёр, крупнейший европейский контингент",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["IGAD", "Договоры о базах с США, Китаем, Францией, Японией, Италией и Испанией"],
    vulnerabilities: [
      {
        titleRu: "Соперничество арендаторов на своей земле",
        descriptionRu: "Базы США и Китая в нескольких километрах друг от друга: инциденты (лазерные ослепления пилотов, по заявлениям США) показывают, что Джибути — заложник конкуренции своих клиентов",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта; заявления Пентагона", 2024, true),
      },
      {
        titleRu: "Зависимость от ренты и Эфиопии",
        descriptionRu: "Экономика завязана на эфиопский транзит и арендные платежи; долг Китаю высок, а смена режима в Аддис-Абебе или мир в регионе снижают ренту",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта; МВФ", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; инвестиции идут в портовую и базовую инфраструктуру под арендаторов",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Жандармерия и полиция контролируют столицу; армия — второй эшелон режима Гелле",
    overallNoteRu: "Профиль государства-арендодателя: собственная армия вторична относительно иностранных баз",
  },
  {
    iso3: "ERI",
    name: "Eritrea",
    nameRu: "Эритрея",
    region: "Восточная Африка",
    subregionRu: "Красное море, одна из самых закрытых и милитаризованных стран мира",
    forcesStatusRu: "Регулярные силы при бессрочной национальной службе",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: null,
      amountNoteRu: "Данные закрыты десятилетиями: внешние оценки прошлых лет — 0,2–0,3 млрд долл. и выше в военные годы; к цифрам доверие низкое",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Непрозрачна; мобилизационные циклы связаны с войной в Тыграе и напряжённостью с Эфиопией",
      provenance: {
        source: "Оценка проекта: IISS, исторические ряды SIPRI",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 200000,
      reserve: null,
      paramilitary: null,
      noteRu: "Оценка IISS — порядка 175–200 тыс. при бессрочной службе: формально демобилизация не завершена с 2001 года, служба фактически бессрочна и является главным драйвером миграции из страны",
      provenance: {
        source: "IISS Military Balance 2024, оценка для закрытой страны",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: механизированные и пехотные дивизии советского типа, танки Т-55",
      navyRu: "ВМС: патрульные катера и бывшие ракетные катера в Массауа и Асэбе",
      airForceRu: "Авиация: МиГ-29 и Су-27 наследия в ограниченном состоянии, вертолёты",
      otherRu: "Система национальной службы (Варсай-Йикаало) как тотальный мобилизационный механизм",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Т-55 и БМП-1, артиллерия и РСЗО советского образца",
        roleRu: "Наследие войны за независимость и войны 1998–2000 годов",
        quantityNoteRu: "Сотни единиц в неоднородном состоянии; точные данные закрыты",
        originRu: "СССР / Россия и Болгария (рынки 1990-х)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Су-27 и МиГ-29",
        roleRu: "Истребительный компонент",
        quantityNoteRu: "Единицы бортов, летнопригодность сомнительна после десятилетий без полноценного обслуживания",
        originRu: "Россия и Украина (поставки 1990–2000-х)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет, кроме ремонтных мастерских; экономика милитаризована через систему национальной службы (дешёвый труд призывников)",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Исторически — Россия, Украина, Болгария и Китай; эмбарго ООН снято в 2018 году, новых прозрачных поставок не видно; в 2020-е обсуждается сближение с Россией (порт Массауа)",
      suppliers: [
        {
          supplier: "Россия (исторически)",
          noteRu: "Авиация и бронетехника 1990–2000-х; переговоры о военно-морском сотрудничестве",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Формально вне блоков; сближение с Россией и Китаем"],
    vulnerabilities: [
      {
        titleRu: "Бессрочная служба как системный кризис",
        descriptionRu: "Милитаризация вымывает молодёжь из страны (один из крупнейших потоков беженцев на душу населения) и блокирует экономику: армия — одновременно опора и главная слабость режима",
        severityRu: "высокая",
        provenance: pv("ООН; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Нереализованный мир с Эфиопией",
        descriptionRu: "Сближение 2018 года сменилось союзом в войне в Тыграе (2020–2022), а затем новым охлаждением: граница вновь милитаризуется без демаркации",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ не видно; парк стареет без замены",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Разграничения армии, службы и государства почти нет: национальная служба — универсальный механизм контроля",
    overallNoteRu: "Профиль закрытой страны с пониженным доверием: все числа — внешние оценки порядка величины",
  },
  {
    iso3: "SWZ",
    name: "Eswatini",
    nameRu: "Эсватини",
    region: "Южная Африка",
    subregionRu: "Южная Африка, абсолютная монархия внутри территории ЮАР и Мозамбика",
    forcesStatusRu: "Регулярные силы: Силы обороны Эсватини (Umbutfo)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.09,
      amountNoteRu: "Порядка 80–100 млн долл.",
      year: 2024,
      shareOfGdpPct: 1.8,
      trendRu: "Стабильный уровень; армия — инструмент монархии",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 4500,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 4,5 тыс. военнослужащих; армия присягает лично королю Мсвати III",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные батальоны, лёгкая бронетехника",
      navyRu: "Отсутствуют (нет выхода к морю)",
      airForceRu: "Авиационное крыло: вертолёты и лёгкие самолёты в единичном числе",
      otherRu: "Полиция и исправительная служба как параллельные силовые органы короны",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Бронеавтомобили RG-31 (ЮАР) и лёгкая техника",
        roleRu: "Внутренняя безопасность и церемониал",
        quantityNoteRu: "Десятки единиц",
        originRu: "ЮАР",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты и лёгкие самолёты",
        roleRu: "Транспорт королевской семьи и армии",
        quantityNoteRu: "Единицы бортов",
        originRu: "США и др.",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "ЮАР — фактический зонтик и поставщик; Тайвань — дипломатический партнёр с программами помощи",
      suppliers: [
        {
          supplier: "ЮАР",
          noteRu: "Бронетехника, обучение, фактическая внешняя гарантия",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["САДК", "Фактическая зависимость от ЮАР в вопросах безопасности"],
    vulnerabilities: [
      {
        titleRu: "Протестный потенциал против монархии",
        descriptionRu: "Волнения 2021 года подавлялись армией и полицией с жертвами: армия как личный инструмент короля — фактор риска при смене правления",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция и армия равнозначно задействованы во внутреннем порядке",
    overallNoteRu: "Малый профиль монархии без внешних угроз и с внутренним измерением армии",
  },
  {
    iso3: "GAB",
    name: "Gabon",
    nameRu: "Габон",
    region: "Центральная Африка",
    subregionRu: "Гвинейский залив, нефтяное государство, переворот 2023 года",
    forcesStatusRu: "Регулярные вооружённые силы при переходном военном режиме",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.28,
      amountNoteRu: "Порядка 0,25–0,3 млрд долл.",
      year: 2024,
      shareOfGdpPct: 1.5,
      trendRu: "Стабилен; республиканская гвардия традиционно получает приоритетное финансирование",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 5000,
      reserve: null,
      paramilitary: 2500,
      noteRu: "Около 5 тыс. военных; республиканская гвардия — сила, совершившая переворот 2023 года и ставшая ядром нового режима Олиги Нгемы",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные батальоны, бронетанковый компонент французского парка",
      navyRu: "ВМС: морские патрульные корабли и катера в Либревиле",
      airForceRu: "Авиация: истребители Mirage F1 наследия в ограниченном состоянии, вертолёты и транспортники",
      otherRu: "Республиканская гвардия, жандармерия",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "Mirage F1 (южноафриканская модернизация наследия)",
        roleRu: "Формальный истребительный компонент",
        quantityNoteRu: "Несколько бортов, боеспособность низкая",
        originRu: "Франция (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли (французские типы P400 и др.)",
        roleRu: "Защита нефтяных объектов залива",
        quantityNoteRu: "Несколько вымпелов",
        originRu: "Франция",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника французского и китайского происхождения",
        roleRu: "Мобильность и охрана столицы",
        quantityNoteRu: "Десятки единиц",
        originRu: "Франция и Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Франция — исторический поставщик и партнёр (база в Либревиле пересматривается в общем тренде региона), Китай — техника и инфраструктура",
      suppliers: [
        {
          supplier: "Франция",
          noteRu: "Техника, обучение, военное присутствие (сокращается)",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["CEMAC", "Оборонное соглашение с Францией"],
    vulnerabilities: [
      {
        titleRu: "Гвардия как режим",
        descriptionRu: "Переворот 2023 года совершил командир республиканской гвардии: армия не отделена от политики, а выборы переходного периода определят её будущее",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Нефтяное закат",
        descriptionRu: "Зрелые месторождения и долги снижают ресурсную базу и армии, и государства",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта; МВФ", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ не заявлено; приоритет переходного режима — внутренняя легитимация",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Жандармерия и полиция — внутренний контур; гвардия — политический центр тяжести",
    overallNoteRu: "Численность по IISS; профиль отражает постпереворотную конфигурацию",
  },
  {
    iso3: "GMB",
    name: "Gambia",
    nameRu: "Гамбия",
    region: "Западная Африка",
    subregionRu: "Узкая полоса вдоль реки Гамбия внутри Сенегала",
    forcesStatusRu: "Малые регулярные силы: Вооружённые силы Гамбии",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.02,
      amountNoteRu: "Порядка 15–25 млн долл.",
      year: 2024,
      shareOfGdpPct: 0.9,
      trendRu: "Стабильный минимум при внешней поддержке реформы сектора безопасности",
      provenance: {
        source: "Оценка проекта по IISS и CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 4100,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 4 тыс. военных после реформ постджаммевского периода; в стране с 2017 года развёрнута миссия ЭКОВАС (ECOMIG) как гарант перехода",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: два пехотных батальона",
      navyRu: "ВМС: несколько патрульных катеров",
      airForceRu: "Фактически отсутствует: единичные лёгкие самолёты",
      otherRu: "Национальная гвардия, государственная охрана",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Лёгкая бронетехника и пикапы турецких и др. передач",
        roleRu: "Мобильность и охрана объектов",
        quantityNoteRu: "Десятки единиц, включая турецкие бронеавтомобили, переданные в 2020-е",
        originRu: "Турция и др.",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Патрульные катера",
        roleRu: "Контроль реки и побережья",
        quantityNoteRu: "Несколько катеров",
        originRu: "Тайвань (исторические передачи) и др.",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Турция — обучение и техника с 2018 года, ЭКОВАС — гарант, Китай и США — нишевые программы",
      suppliers: [
        {
          supplier: "Турция",
          noteRu: "Бронеавтомобили, обучение жандармерии и армии",
          provenance: pv("Открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ЭКОВАС (миссия ECOMIG в стране)", "Содружество наций"],
    vulnerabilities: [
      {
        titleRu: "География анклава",
        descriptionRu: "Страна полностью окружена Сенегалом (кроме побережья): любая блокада со стороны Дакара парализует государство за дни",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Наследие армии Джамме",
        descriptionRu: "Реформа сектора безопасности после 2017 года не завершена: армия остаётся политически чувствительным институтом",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Реформа при поддержке ЭКОВАС, Турции и ЕС вместо закупок",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция и жандармерия — повседневный контур; ECOMIG остаётся внешним стабилизатором",
    overallNoteRu: "Микропрофиль с внешней гарантией стабильности",
  },
  {
    iso3: "GHA",
    name: "Ghana",
    nameRu: "Гана",
    region: "Западная Африка",
    subregionRu: "Гвинейский залив, южный якорь Аккрской инициативы",
    forcesStatusRu: "Регулярные вооружённые силы с сильной миротворческой традицией",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.45,
      amountNoteRu: "Порядка 0,4–0,5 млрд долл.; рост из-за северного джихадистского риска и защиты морской нефти",
      year: 2024,
      shareOfGdpPct: 0.6,
      trendRu: "Умеренный рост: северные базы, морские патрульные корабли, вертолёты",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 15500,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 15,5 тыс. военных; Гана — один из крупнейших контрибьюторов миротворцев ООН исторически, что формирует профессиональное ядро",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: две бригады, бронетанковый полк",
      navyRu: "ВМС: морские патрульные корабли и корветы малых классов, базы Секонди и Тема",
      airForceRu: "Авиация: вертолёты Ми-171, транспортные C-295, учебные K-8 китайского производства",
      otherRu: "Военная полиция, инженерные и медицинские службы",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "Вертолёты Ми-171Ш и самолёты C-295",
        roleRu: "Транспорт и поддержка миротворческих операций",
        quantityNoteRu: "Несколько вертолётов поставлены Россией в 2010-е, 2–3 C-295 — Испанией",
        originRu: "Россия и Airbus",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли (китайские и корейские передачи/поставки)",
        roleRu: "Защита нефтяных платформ и борьба с пиратством",
        quantityNoteRu: "Около десятка вымпелов разного возраста",
        originRu: "Китай, Республика Корея, Германия (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника южноафриканского и китайского происхождения",
        roleRu: "Мобильность и миротворческие контингенты",
        quantityNoteRu: "Десятки единиц",
        originRu: "ЮАР и Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: true,
      summaryRu: "Начальный ВПК: совместное предприятие с Турцией и локальные производители бронетехники и боеприпасов малого масштаба",
      selfSufficiencyRu: "Низкая: экипировка и лёгкая техника частично свои, платформы импортные",
      companies: [
        {
          name: "Kantanka / локальные производители (ниша)",
          specializationRu: "Бронеавтомобили и техника малых серий, преимущественно демонстрационные проекты",
          provenance: pv("Открытые источники", 2024, true),
        },
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Диверсифицированный портфель: Китай, Россия (вертолёты), Испания, США и Великобритания (обучение), Турция (растущая доля)",
      suppliers: [
        {
          supplier: "Китай",
          noteRu: "Корабли, учебные самолёты K-8, бронетехника",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "США",
          noteRu: "Обучение, миротворческая подготовка, техника по программам безопасности",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ЭКОВАС", "Аккрская инициатива (инициатор)", "Содружество наций"],
    vulnerabilities: [
      {
        titleRu: "Северная граница с Буркина-Фасо",
        descriptionRu: "Джихадистское давление смещается к побережью: северные регионы Ганы — тыл и логистика JNIM, армия впервые строится против этого сценария",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Вождистские конфликты (Бавку)",
        descriptionRu: "Локальные конфликты на северо-востоке требуют постоянного военного присутствия и отвлекают силы от северной границы",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Северные оперативные базы, усиление флота и авиации наблюдения",
      programs: [
        {
          nameRu: "Северная передовая инфраструктура",
          noteRu: "Базы и подразделения у границы с Буркина-Фасо в рамках Аккрской инициативы",
          provenance: pv("Правительство Ганы", 2024, true),
        },
      ],
      provenance: {
        source: "Правительство Ганы; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция и иммиграционная служба — внутренний контур; армия сохраняет высокую репутацию и аполитичность",
    overallNoteRu: "Численность по IISS; Гана — редкий для региона пример профессиональной аполитичной армии",
  },
  {
    iso3: "GIN",
    name: "Guinea",
    nameRu: "Гвинея",
    region: "Западная Африка",
    subregionRu: "Гвинейский залив и Фута-Джаллон, военное правление с 2021 года",
    forcesStatusRu: "Регулярные вооружённые силы при хунте CNRD",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.35,
      amountNoteRu: "Порядка 0,3–0,4 млрд долл.; данные при хунте стали менее прозрачны",
      year: 2024,
      shareOfGdpPct: 1.8,
      trendRu: "Рост влияния армии на бюджет после переворота 2021 года",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 9700,
      reserve: null,
      paramilitary: 2600,
      noteRu: "Около 9,7 тыс. военных по IISS; жандармерия и президентская гвардия (красные береты) — ключевые инструменты хунты Думбуя",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные батальоны, бронетанковый компонент советского наследия",
      navyRu: "ВМС: патрульные катера и корабли в Конакри",
      airForceRu: "Авиация: вертолёты и лёгкие самолёты в ограниченном состоянии",
      otherRu: "Жандармерия, президентская гвардия",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника советского и китайского наследия",
        roleRu: "Основа парка",
        quantityNoteRu: "Десятки единиц в неоднородном состоянии",
        originRu: "СССР и Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Патрульные корабли китайской постройки",
        roleRu: "Контроль побережья и рыболовства",
        quantityNoteRu: "Несколько вымпелов",
        originRu: "Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет; горнодобывающий сектор (бокситы, железо Симанду) — экономический, а не оборонный актив",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Китай — инфраструктура и техника, Франция — историческое обучение (ограничено после переворота), Турция проявляет интерес",
      suppliers: [
        {
          supplier: "Китай",
          noteRu: "Техника, обучение, портовые и горные проекты",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ЭКОВАС (членство заморожено после переворота)", "Мано-Ривер союз"],
    vulnerabilities: [
      {
        titleRu: "Хунта без графика перехода",
        descriptionRu: "Отложенные выборы и подавление оппозиции делают армию единственным арбитром политики — риск внутреннего раскола сил",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Этническая политика комплектования",
        descriptionRu: "Историческое доминирование отдельных групп в командовании — хронический фактор нестабильности гвинейской армии",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ не видно; приоритет хунты — контроль, а не модернизация",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Жандармерия и полиция разгоняют протесты; армия обеспечивает режим",
    overallNoteRu: "Численность по IISS; прозрачность данных снизилась после 2021 года",
  },
  {
    iso3: "GNB",
    name: "Guinea-Bissau",
    nameRu: "Гвинея-Бисау",
    region: "Западная Африка",
    subregionRu: "Побережье Гвинейского залива, архипелаг Бижагош",
    forcesStatusRu: "Малые регулярные силы при хронической политической роли армии",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.03,
      amountNoteRu: "Порядка 25–35 млн долл.",
      year: 2024,
      shareOfGdpPct: 1.5,
      trendRu: "Стабильный минимум при внешней поддержке реформ",
      provenance: {
        source: "Оценка проекта по IISS и CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 4450,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 4,4 тыс. военных — непропорционально много офицеров наследия освободительной войны; армия — постоянный автор переворотов",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные подразделения советского наследия",
      navyRu: "ВМС: несколько патрульных катеров для архипелага Бижагош",
      airForceRu: "Фактически отсутствует",
      otherRu: "Национальная гвардия, полиция общественного порядка",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника и артиллерия советского наследия",
        roleRu: "Основа парка",
        quantityNoteRu: "Десятки единиц в низком состоянии готовности",
        originRu: "СССР (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Патрульные катера",
        roleRu: "Контроль архипелага — ключевого узла наркотрафика",
        quantityNoteRu: "Несколько катеров разного происхождения",
        originRu: "Китай и др.",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Китай и Ангола — партнёры по технике и обучению; Португалия — исторические связи",
      suppliers: [
        {
          supplier: "Китай",
          noteRu: "Катера, транспорт, военная инфраструктура",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ЭКОВАС", "CPLP (сообщество португалоязычных стран)"],
    vulnerabilities: [
      {
        titleRu: "«Наркогосударство» как структурный риск",
        descriptionRu: "Архипелаг Бижагош — перевалочная база латиноамериканского кокаина в Европу; военные и политики исторически вовлечены в трафик, перевороты 2012 и попытка 2022 года связаны с этой экономикой",
        severityRu: "высокая",
        provenance: pv("ООН; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Армия больше государства",
        descriptionRu: "Раздутый офицерский корпус ветеранов не поддаётся реформам: любая попытка сокращения — риск переворота",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; реформы ЭКОВАС и ООН буксуют десятилетиями",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция и гвардия слабы; реальная власть в кризисах — армия",
    overallNoteRu: "Профиль государства, где армия — главный политический институт",
  },
  {
    iso3: "LBR",
    name: "Liberia",
    nameRu: "Либерия",
    region: "Западная Африка",
    subregionRu: "Побережье Западной Африки, постконфликтное государство",
    forcesStatusRu: "Малые регулярные силы (AFL), перестроенные США после гражданской войны",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.02,
      amountNoteRu: "Порядка 15–25 млн долл.",
      year: 2024,
      shareOfGdpPct: 0.6,
      trendRu: "Стабильный минимум; безопасность поддерживается партнёрством с США",
      provenance: {
        source: "Оценка проекта по IISS и CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 2100,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 2,1 тыс. военных — армия сознательно построена малой и аполитичной после расформирования прежней в 2003–2006 годах",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотная бригада (два батальона), инженерная рота",
      navyRu: "Береговая охрана: несколько патрульных катеров",
      airForceRu: "Отсутствует",
      otherRu: "Медицинский компонент (военный госпиталь) как вклад в гражданскую систему",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные катера береговой охраны",
        roleRu: "Борьба с незаконным промыслом — главной морской угрозой экономике",
        quantityNoteRu: "Несколько катеров американской и др. передачи",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Лёгкая техника и стрелковое оружие",
        roleRu: "Поддержка полиции и ЧС",
        quantityNoteRu: "Только лёгкое вооружение",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "США — архитектор и донор AFL (программа восстановления армии), Национальная гвардия Мичигана — партнёр по SPP",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Восстановление армии, обучение, техника",
          provenance: pv("Африканское командование США", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ЭКОВАС", "Мано-Ривер союз"],
    vulnerabilities: [
      {
        titleRu: "Сознательная слабость",
        descriptionRu: "Малая армия — урок гражданской войны, но страна беззащитна перед любыми внешними потрясениями и полностью зависит от партнёров",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Незаконный промысел и ресурсы",
        descriptionRu: "Пиратство рыбы и нелегальная добыча в лесах превышают контрольные возможности береговой охраны и полиции",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; развитие — инженерный и медицинский компоненты для гражданской пользы",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Национальная полиция — основной силовой орган; армия вне политики по построению",
    overallNoteRu: "Пример постконфликтного дизайна «малой безопасной армии»",
  },
  {
    iso3: "LSO",
    name: "Lesotho",
    nameRu: "Лесото",
    region: "Южная Африка",
    subregionRu: "Горное королевство-анклав внутри ЮАР",
    forcesStatusRu: "Малые регулярные силы: Силы обороны Лесото (LDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.05,
      amountNoteRu: "Порядка 45–60 млн долл.",
      year: 2024,
      shareOfGdpPct: 2.2,
      trendRu: "Стабильный уровень при высокой доле ВВП для страны без внешних угроз",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 2000,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 2 тыс. военных; армия — хронический источник политической нестабильности (мятежи 2014–2015 годов, убийство командующего в 2017 году)",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные роты, лёгкая бронетехника",
      navyRu: "Отсутствуют (нет выхода к морю)",
      airForceRu: "Авиационное крыло: вертолёты и лёгкие самолёты в единичном числе",
      otherRu: "Военная полиция, церемониальные подразделения",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Бронеавтомобили южноафриканского и советского наследия",
        roleRu: "Внутренняя безопасность",
        quantityNoteRu: "Десятки единиц",
        originRu: "ЮАР и СССР (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты и лёгкие транспортные самолёты",
        roleRu: "Связь с горными районами",
        quantityNoteRu: "Единицы бортов, часть неисправна",
        originRu: "США и др.",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "ЮАР — окружение, поставщик и гарант (интервенции САДК 1998 и миссия 2017 года)",
      suppliers: [
        {
          supplier: "ЮАР",
          noteRu: "Техника, обучение, стабилизационные миссии САДК",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["САДК"],
    vulnerabilities: [
      {
        titleRu: "Армия как источник кризисов",
        descriptionRu: "Фракции внутри LDF регулярно вмешиваются в политику: реформы САДК по деполитизации армии не завершены",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; САДК", 2024, true),
      },
      {
        titleRu: "Анклавная зависимость",
        descriptionRu: "Полное окружение ЮАР: вода (проект высокогорной воды) и работа мигрантов — рычаги Претории сильнее любой армии",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; обсуждается сокращение и профессионализация при поддержке САДК",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция (LMPS) формально отделена, но в кризисах уступает армии центр сцены",
    overallNoteRu: "Профиль армии, чья главная угроза — она сама",
  },
  {
    iso3: "MDG",
    name: "Madagascar",
    nameRu: "Мадагаскар",
    region: "Восточная Африка",
    subregionRu: "Остров в Индийском океане, четвёртый по площади в мире",
    forcesStatusRu: "Регулярные вооружённые силы",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.13,
      amountNoteRu: "Порядка 0,11–0,15 млрд долл.",
      year: 2024,
      shareOfGdpPct: 0.9,
      trendRu: "Стабильный минимум при огромной территории и населении 30 млн",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 13500,
      reserve: null,
      paramilitary: 8000,
      noteRu: "Около 13,5 тыс. военных и 8 тыс. жандармов; жандармерия — главная сила в сельской местности против банд дахало (угонщиков скота)",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные подразделения, лёгкая бронетехника советского/китайского наследия",
      navyRu: "ВМС: патрульные корабли и катера для длиннейшей береговой линии",
      airForceRu: "Авиация: вертолёты и лёгкие самолёты в малом числе",
      otherRu: "Национальная жандармерия — ключевой компонент сельской безопасности",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные корабли (французские и китайские поставки)",
        roleRu: "Борьба с незаконным промыслом и трафиком в Мозамбикском проливе",
        quantityNoteRu: "Несколько вымпелов на 5 000 км береговой линии",
        originRu: "Франция и Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника советского наследия и китайские бронеавтомобили",
        roleRu: "Мобильность и внутренние операции",
        quantityNoteRu: "Десятки единиц в низком состоянии",
        originRu: "СССР и Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Франция — исторический партнёр, Китай — техника и инфраструктура, Россия проявляла интерес в 2018 году (меморандум)",
      suppliers: [
        {
          supplier: "Франция",
          noteRu: "Обучение, корабли, военное сотрудничество",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Китай",
          noteRu: "Бронетехника и экипировка",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Африканский союз", "САДК"],
    vulnerabilities: [
      {
        titleRu: "Сельское безвластие и дахало",
        descriptionRu: "Банды угонщиков скота контролируют районы юга и запада: жандармерия ведёт постоянную малую войну при ничтожных ресурсах",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Политическая роль армии",
        descriptionRu: "Переворот 2009 года и нейтралитет армии в кризисах делают её арбитром политики по умолчанию",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Морская слепота",
        descriptionRu: "Незаконный вылов, трафик и контрабанда у берегов почти не контролируются при символическом флоте",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; точечные передачи техники партнёрами",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Жандармерия — фактическая главная сила страны вне столицы",
    overallNoteRu: "Численность по IISS; масштаб задач несоразмерен ресурсам",
  },
  {
    iso3: "MWI",
    name: "Malawi",
    nameRu: "Малави",
    region: "Южная Африка",
    subregionRu: "Озеро Ньяса, границы с Мозамбиком, Танзанией и Замбией",
    forcesStatusRu: "Малые регулярные силы: Силы обороны Малави (MDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.09,
      amountNoteRu: "Порядка 80–100 млн долл.",
      year: 2024,
      shareOfGdpPct: 0.7,
      trendRu: "Стабильный минимум; вклад в миссии ООН и САДК — источник дохода и опыта",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 10700,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 10,7 тыс. военных по IISS; армия аполитична по региональным меркам и востребована в миротворчестве (ДРК)",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные батальоны, полк парашютистов",
      navyRu: "Озёрный морской компонент на озере Малави: патрульные катера",
      airForceRu: "Авиационное крыло: вертолёты и лёгкие самолёты в единичном числе",
      otherRu: "Военная полиция, медицинские службы",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Бронеавтомобили южноафриканского и британского происхождения",
        roleRu: "Мобильность и миротворческие задачи",
        quantityNoteRu: "Десятки единиц",
        originRu: "ЮАР и Великобритания",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Патрульные катера озера Малави",
        roleRu: "Контроль спорной границы с Танзанией по озеру",
        quantityNoteRu: "Несколько катеров",
        originRu: "Разные поставщики",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Великобритания — историческое обучение (офицеры в Сандхерсте), ЮАР — техника, США — миротворческая подготовка",
      suppliers: [
        {
          supplier: "Великобритания",
          noteRu: "Обучение и советники исторически",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["САДК", "Содружество наций"],
    vulnerabilities: [
      {
        titleRu: "Спор по озеру Малави с Танзанией",
        descriptionRu: "Нефтяные лицензии на озере периодически обостряют границу; военного решения у Малави нет, ставка на посредничество САДК",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Бедность как ограничитель",
        descriptionRu: "Одна из беднейших стран мира: армия конкурирует за бюджет со здравоохранением и образованием при каждой засухе",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция Малави — основной внутренний орган; армия поддерживает её редко",
    overallNoteRu: "Тихий профиль малой профессиональной армии миротворческого профиля",
  },
  {
    iso3: "MLI",
    name: "Mali",
    nameRu: "Мали",
    region: "Западная Африка",
    subregionRu: "Сахель и Сахара, крупнейшая страна Западной Африки по площади",
    forcesStatusRu: "Регулярные вооружённые силы (FAMa) при хунте и российском военном присутствии",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.5,
      amountNoteRu: "Порядка 0,45–0,6 млрд долл. официально; реальные военные потоки выше за счёт контрактов с Россией и внебюджетных статей",
      year: 2024,
      shareOfGdpPct: 2.8,
      trendRu: "Рост с 2020 года: война стала центром государственного бюджета",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 20000,
      reserve: null,
      paramilitary: 8000,
      noteRu: "Около 20 тыс. военных номинально при массовых наборах хунты; боеспособность частей неравномерна, север и центр страны оспариваются джихадистами и туарегскими движениями",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные и механизированные батальоны, артиллерия советского наследия",
      navyRu: "Речной компонент на Нигере",
      airForceRu: "Авиация: штурмовики L-39 и Су-25 российских поставок, вертолёты Ми-171, БПЛА Bayraktar TB2",
      otherRu: "Жандармерия, национальная гвардия, республиканская гвардия",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "Су-25 и L-39 (российские поставки 2022–2023 годов)",
        roleRu: "Ударная поддержка против джихадистов и туарегов",
        quantityNoteRu: "Несколько бортов поставлены Россией после ухода Франции",
        originRu: "Россия",
        provenance: pv("Открытая пресса; IISS", 2024, true),
      },
      {
        branchRu: "БПЛА",
        system: "Bayraktar TB2",
        roleRu: "Разведка и удары в центре и на севере",
        quantityNoteRu: "Системы поставлены Турцией в 2023–2024 годах",
        originRu: "Турция",
        provenance: pv("Открытая пресса", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника китайского и российского производства, советское наследие",
        roleRu: "Мобильность и конвои",
        quantityNoteRu: "Сотни единиц смешанного парка; потери от СВУ хронически высоки",
        originRu: "Китай и Россия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Полная смена покровителей за 2021–2023 годы: Франция (Бархан) и ООН (MINUSMA) выведены, Россия («Африканский корпус») — инструкторы, авиация и техника, Турция — БПЛА, Китай — бронетехника",
      suppliers: [
        {
          supplier: "Россия",
          noteRu: "Авиация, вертолёты, инструкторы «Африканского корпуса», боеприпасы",
          provenance: pv("Открытая пресса; ООН", 2024, true),
        },
        {
          supplier: "Турция",
          noteRu: "БПЛА Bayraktar TB2",
          provenance: pv("Открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; открытая пресса",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Альянс государств Сахеля (AES) с Буркина-Фасо и Нигером", "Выход из ЭКОВАС (объявлен в 2024 году)"],
    vulnerabilities: [
      {
        titleRu: "Война на два фронта",
        descriptionRu: "Джихадисты JNIM расширяются к югу и блокируют дороги, а на севере после взятия Кидаля (2023) возобновлено противостояние с туарегским CSP: разгром колонны под Тинзауатеном (2024) показал пределы возможностей хунты и её партнёров",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; открытая пресса", 2024, true),
      },
      {
        titleRu: "Зависимость от российского контура",
        descriptionRu: "Авиация, инструкторы и часть логистики завязаны на Москву: любой пересмотр российского присутствия в Африке бьёт по боеспособности FAMa",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Гуманитарная и экономическая деградация",
        descriptionRu: "Блокады городов джихадистами и санкции соседей подрывают тыл армии: набор рекрутов идёт быстрее подготовки",
        severityRu: "средняя",
        provenance: pv("ООН; аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Милитаризация закупками у новых покровителей вместо системной реформы",
      programs: [
        {
          nameRu: "Массовый набор и перевооружение FAMa",
          noteRu: "Планы удвоения численности и закупки авиации/БПЛА с 2022 года",
          provenance: pv("Заявления хунты; IISS", 2024, true),
        },
      ],
      provenance: {
        source: "IISS Military Balance",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Жандармерия и полиция действуют в военном контуре; свобода прессы о войне ограничена хунтой",
    overallNoteRu: "Пониженное доверие к официальным данным: статистика войны закрыта, оценки — ООН, ACLED, IISS",
  },
  {
    iso3: "MRT",
    name: "Mauritania",
    nameRu: "Мавритания",
    region: "Западная Африка",
    subregionRu: "Сахара и атлантическое побережье, мост между Магрибом и Сахелем",
    forcesStatusRu: "Регулярные вооружённые силы — региональный образец успешной контртеррористической адаптации",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.24,
      amountNoteRu: "Порядка 0,22–0,26 млрд долл.",
      year: 2024,
      shareOfGdpPct: 2.3,
      trendRu: "Стабильно высокий для региона уровень с акцентом на мобильные группы и авиацию",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 15850,
      reserve: null,
      paramilitary: 5000,
      noteRu: "Около 16 тыс. военных; армия после атак 2005–2011 годов перестроена в мобильные группы специального вмешательства (GSI) с авиационной поддержкой",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: мобильные батальоны и верблюжий корпус (меаристы) для пустыни",
      navyRu: "ВМС: морские патрульные корабли (китайские поставки), база Нуакшот и Нуадибу",
      airForceRu: "Авиация: лёгкие штурмовики A-29 Super Tucano и EMB-312, вертолёты, БПЛА китайского производства",
      otherRu: "Жандармерия, национальная гвардия",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "A-29 Super Tucano и Tucano",
        roleRu: "Пограничное патрулирование и лёгкие удары — основа успеха против АКИМ",
        quantityNoteRu: "Несколько машин поставлены Бразилией в 2010-е",
        originRu: "Бразилия (Embraer)",
        provenance: pv("IISS Military Balance", 2024, false),
      },
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли китайской постройки",
        roleRu: "Контроль ИЭЗ и газовых месторождений GTA на границе с Сенегалом",
        quantityNoteRu: "Несколько вымпелов",
        originRu: "Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника французского и китайского происхождения, мобильные группы на пикапах",
        roleRu: "Пустынная мобильность",
        quantityNoteRu: "Смешанный парк, адаптированный к рейдовой тактике",
        originRu: "Франция и Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Диверсифицированный портфель: Бразилия (авиация), Китай (корабли, БПЛА), Франция и США (обучение), ОАЭ — финансовая и техническая поддержка",
      suppliers: [
        {
          supplier: "Бразилия",
          noteRu: "A-29 Super Tucano",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
        {
          supplier: "Китай",
          noteRu: "Патрульные корабли, БПЛА, бронетехника",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "США",
          noteRu: "Обучение и программы безопасности (Flintlock, TSCTP)",
          provenance: pv("Африканское командование США", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Лига арабских государств", "Партнёр НАТО по диалогу", "G5 Сахель (исторически, структура распалась)"],
    vulnerabilities: [
      {
        titleRu: "2 000 км пустынных границ",
        descriptionRu: "Границы с Мали и Алжиром невозможно закрыть физически: модель держится на мобильности и разведке, а не на контроле линии",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Социальная фрагментация",
        descriptionRu: "Разделение общества (бейданы, харатины, афромавританцы) и наследие событий 1989 года — внутренний фактор, ограничивающий комплектование и лояльность",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Продолжение успешной модели: авиация наблюдения, мобильные группы, морская безопасность под газовый проект GTA",
      programs: [
        {
          nameRu: "Морская безопасность GTA",
          noteRu: "Усиление ВМС к запуску газового месторождения Greater Tortue Ahmeyim с Сенегалом",
          provenance: pv("Открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "Открытая пресса; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Жандармерия и гвардия делят внутренний контур; армия сохраняет политический вес, но не правит с 2019 года",
    overallNoteRu: "Положительный кейс региона: последняя крупная атака джихадистов в стране — более десятилетия назад",
  },
  {
    iso3: "MUS",
    name: "Mauritius",
    nameRu: "Маврикий",
    region: "Восточная Африка",
    subregionRu: "Остров в Индийском океане, претензии на архипелаг Чагос",
    forcesStatusRu: "Вооружённых сил нет; есть полиция со специальными мобильными силами и береговой охраной",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет; расходы на полицию и национальную береговую охрану — полицейская статья",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует как военная категория",
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 2500,
      noteRu: "Специальные мобильные силы (SMF) — около 1,7 тыс. военизированной полиции; национальная береговая охрана — около 1 тыс. с патрульными кораблями и авиацией",
      provenance: {
        source: "IISS Military Balance 2024; CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует; SMF выполняет функции лёгкой пехоты при ЧС",
      navyRu: "Национальная береговая охрана: морские патрульные корабли индийской постройки (класс Barracuda и др.)",
      airForceRu: "Авиация береговой охраны и полиции: самолёты Dornier 228 и вертолёты (индийские поставки)",
      otherRu: "Полиция Маврикия — единый силовой орган",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли типа Barracuda (Индия)",
        roleRu: "Контроль ИЭЗ в 2,3 млн км² с внешними островами",
        quantityNoteRu: "1 крупный OPV и несколько катеров индийской постройки",
        originRu: "Индия (GRSE)",
        provenance: pv("IISS Military Balance", 2024, false),
      },
      {
        branchRu: "Авиация",
        system: "Dornier 228 и вертолёты Dhruv/Cheetah",
        roleRu: "Морское патрулирование и спасание",
        quantityNoteRu: "Несколько бортов индийских передач",
        originRu: "Индия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо; безопасность — партнёрство с Индией",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо к армии",
      shareNoteRu: "Индия — системный партнёр береговой охраны (корабли, авиация, советники); техника SMF — лёгкое вооружение разных поставщиков",
      suppliers: [
        {
          supplier: "Индия",
          noteRu: "Патрульные корабли, самолёты, вертолёты, обучение и гидрография",
          provenance: pv("Правительство Индии; IISS", 2024, false),
        },
      ],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Партнёрство с Индией по морской безопасности", "Африканский союз", "IORA"],
    vulnerabilities: [
      {
        titleRu: "Чагос и Диего-Гарсия",
        descriptionRu: "Соглашение с Великобританией о суверенитете над Чагосом (2024–2025) при сохранении базы США на Диего-Гарсии делает Маврикий стороной большой стратегической игры без собственных сил",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта; открытая пресса", 2024, true),
      },
      {
        titleRu: "Наркотрафик и огромная ИЭЗ",
        descriptionRu: "Героиновый трафик из Афганистана через океан и 2,3 млн км² зоны при одной береговой охране — контроль выборочный",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Усиление береговой охраны индийскими поставками и радарами побережья",
      programs: [
        {
          nameRu: "Радиолокационная сеть побережья",
          noteRu: "Система наблюдения за морским движением при поддержке Индии",
          provenance: pv("Правительство Индии", 2024, true),
        },
      ],
      provenance: {
        source: "Правительство Индии; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Честный профиль страны без армии: SMF и береговая охрана — полицейские структуры",
    overallNoteRu: "Нулевые военные значения — факт; морской контур при этом реален и описан полностью",
  },
  {
    iso3: "NAM",
    name: "Namibia",
    nameRu: "Намибия",
    region: "Южная Африка",
    subregionRu: "Юго-западная Африка, пустынные побережья и граница с Анголой",
    forcesStatusRu: "Регулярные силы: Силы обороны Намибии (NDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.28,
      amountNoteRu: "Порядка 0,25–0,3 млрд долл.",
      year: 2024,
      shareOfGdpPct: 2.2,
      trendRu: "Стабильный уровень при малой численности населения (3 млн)",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 9200,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 9,2 тыс. военных; армия выросла из PLAN (СВАПО) и южноафриканских сил, интегрированных после 1990 года",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные батальоны, бронетанковый компонент советского/китайского наследия",
      navyRu: "ВМС: морские патрульные корабли китайской и бразильской постройки, база Уолфиш-Бей",
      airForceRu: "Авиация: учебно-боевые K-8 и истребители F-7NM китайского производства, вертолёты",
      otherRu: "Военная полиция, медицинские службы",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "F-7NM и K-8 Karakorum (Китай)",
        roleRu: "Истребительный и учебно-боевой компоненты",
        quantityNoteRu: "Около десятка бортов каждого типа",
        originRu: "Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли (китайский тип и бразильский Grajaú)",
        roleRu: "Защита рыболовства — критической отрасли",
        quantityNoteRu: "Несколько вымпелов",
        originRu: "Китай и Бразилия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника советского наследия и китайские бронеавтомобили",
        roleRu: "Мобильность в пустыне",
        quantityNoteRu: "Десятки единиц",
        originRu: "СССР и Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: true,
      summaryRu: "Малый государственный ВПК: предприятие Windhoeker Maschinenfabrik (бронетехника Wolf) и August 26 Holding министерства обороны",
      selfSufficiencyRu: "Низкая: ниша бронетехники и ремонта",
      companies: [
        {
          name: "Windhoeker Maschinenfabrik",
          specializationRu: "Бронеавтомобили семейства Wolf, ремонт техники NDF",
          provenance: pv("Открытые источники", 2024, true),
        },
      ],
      provenance: {
        source: "Открытые источники",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Китай — главный поставщик платформ; Бразилия — корабли и обучение; Индия — вертолёты в прошлом",
      suppliers: [
        {
          supplier: "Китай",
          noteRu: "Истребители F-7, K-8, корабли, бронетехника",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Бразилия",
          noteRu: "Патрульный корабль и военно-морское обучение",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["САДК", "Африканский союз"],
    vulnerabilities: [
      {
        titleRu: "Зависимость от Китая по парку",
        descriptionRu: "Авиация и флот преимущественно китайские: обслуживание и запчасти — единый канал без альтернативы",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Северная граница и Каприви",
        descriptionRu: "Полоса Каприви/Замбези — зона сепаратистской памяти и трансграничной преступности, удалённая от центров страны",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ не заявлено; поддержание китайского парка",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция Намибии — основной внутренний орган; армия аполитична",
    overallNoteRu: "Численность по IISS; китайский вектор парка — отличительная черта профиля",
  },
  {
    iso3: "NER",
    name: "Niger",
    nameRu: "Нигер",
    region: "Западная Африка",
    subregionRu: "Сахель, тройной стык с Мали и Буркина-Фасо (Липтако-Гурма)",
    forcesStatusRu: "Регулярные вооружённые силы при хунте CNSP с 2023 года",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.35,
      amountNoteRu: "Порядка 0,3–0,4 млрд долл. официально; после переворота прозрачность упала, расходы на войну растут",
      year: 2024,
      shareOfGdpPct: 2.5,
      trendRu: "Рост при потере западной помощи и смене партнёров на Россию и Турцию",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 33000,
      reserve: null,
      paramilitary: 12000,
      noteRu: "Около 33 тыс. военных после массовых наборов; жандармерия и национальная гвардия — крупные контуры; уран и нефть — тыловая база бюджета",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные и механизированные батальоны, группировка в Тиллабери",
      navyRu: "Речной компонент на Нигере",
      airForceRu: "Авиация: вертолёты, лёгкие штурмовики; БПЛА Bayraktar TB2 турецких поставок",
      otherRu: "Жандармерия, национальная гвардия, президентская гвардия",
    },
    equipment: [
      {
        branchRu: "БПЛА",
        system: "Bayraktar TB2",
        roleRu: "Разведка и удары по джихадистам трёх границ",
        quantityNoteRu: "Системы поставлены Турцией с 2022 года",
        originRu: "Турция",
        provenance: pv("Открытая пресса", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника китайского, турецкого и французского происхождения",
        roleRu: "Мобильность в саванне и пустыне",
        quantityNoteRu: "Смешанный парк; часть западной техники получена до переворота",
        originRu: "Китай, Турция, Франция",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты Ми-171 и лёгкие самолёты наблюдения",
        roleRu: "Транспорт и поддержка",
        quantityNoteRu: "Около десятка бортов; американские C-130 и объекты базы 201 в Агадесе оставлены США в 2024 году",
        originRu: "Россия и США (наследие программ)",
        provenance: pv("IISS; открытая пресса", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "До 2023 года — США и Франция (базы, авиация, обучение); после переворота базы выведены, их место занимают Россия (инструкторы) и Турция (БПЛА), Китай — техника",
      suppliers: [
        {
          supplier: "Турция",
          noteRu: "БПЛА и бронетехника",
          provenance: pv("Открытая пресса", 2024, true),
        },
        {
          supplier: "Россия",
          noteRu: "Инструкторы и военно-техническое сотрудничество с 2024 года",
          provenance: pv("Открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; открытая пресса",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Альянс государств Сахеля (AES)", "Выход из ЭКОВАС (объявлен в 2024 году)"],
    vulnerabilities: [
      {
        titleRu: "Тройная граница Липтако-Гурма",
        descriptionRu: "Стык с Мали и Буркина-Фасо — самый смертоносный район Сахеля: ИГ-Сахель и JNIM действуют через границы быстрее, чем армии AES координируются",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; ACLED", 2024, true),
      },
      {
        titleRu: "Разрыв с Западом как потеря тыла",
        descriptionRu: "Вывод США и Франции лишил армию разведки, медэвакуации и логистики, на которых строилась модель 2013–2023 годов; замена Россией и Турцией частична",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Блокада Бенина и нефтяная труба",
        descriptionRu: "Закрытие границы с Бенином после переворота и споры вокруг нефтепровода в Котону ударили по бюджету войны",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Милитаризация хунты: набор, совместные силы AES и новые поставщики вместо прежней западной модели",
      programs: [
        {
          nameRu: "Совместные силы AES",
          noteRu: "Объединённые подразделения Нигера, Мали и Буркина-Фасо анонсированы в 2024 году",
          provenance: pv("Заявления AES", 2024, true),
        },
      ],
      provenance: {
        source: "Заявления AES; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Жандармерия и гвардия — равноправные армии контуры; пресса о войне ограничена",
    overallNoteRu: "Профиль страны в точке смены покровителей; данные после 2023 года оценочны",
  },
  {
    iso3: "RWA",
    name: "Rwanda",
    nameRu: "Руанда",
    region: "Восточная Африка",
    subregionRu: "Великие озёра, военная держава малого размера с экспедиционной моделью",
    forcesStatusRu: "Регулярные силы: Силы обороны Руанды (RDF) — одна из самых эффективных армий региона",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.18,
      amountNoteRu: "Порядка 0,16–0,2 млрд долл. официально; реальный военный контур шире за счёт внебюджетных и коммерческих структур, связанных с правящей партией",
      year: 2024,
      shareOfGdpPct: 1.3,
      trendRu: "Рост экспедиционных обязательств: Мозамбик, ЦАР, противостояние с ДРК",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 33000,
      reserve: 20000,
      paramilitary: null,
      noteRu: "Около 33 тыс. военных по IISS; резерв и местные силы обороны дополняют модель; RDF развёрнуты в Мозамбике (Кабу-Делгаду, с 2021 года) и ЦАР, а по оценкам ООН — и в ДРК в поддержку M23",
      provenance: {
        source: "IISS Military Balance 2024; группа экспертов ООН",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные дивизии высокой подготовки, спецназ",
      navyRu: "Озёрный компонент на Киву",
      airForceRu: "Авиация: вертолёты Ми-17 и лёгкие самолёты; ПВО — израильские системы SPYDER (по открытым данным)",
      otherRu: "Республиканская гвардия, резервные и местные силы обороны",
    },
    equipment: [
      {
        branchRu: "ПВО",
        system: "SPYDER (Израиль) и РЛС",
        roleRu: "ПВО страны — редкий для региона современный компонент",
        quantityNoteRu: "Поставки сообщены прессой в 2022–2023 годах; детали закрыты",
        originRu: "Израиль (Rafael)",
        provenance: pv("Открытая пресса", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника южноафриканского и израильского происхождения, САУ ATMOS (по открытым данным)",
        roleRu: "Мобильность и огневая поддержка экспедиционных операций",
        quantityNoteRu: "Парк компактный и современный по региональным меркам",
        originRu: "ЮАР и Израиль",
        provenance: pv("IISS; открытая пресса", 2024, true),
      },
      {
        branchRu: "БПЛА",
        system: "Разведывательные БПЛА израильского и др. происхождения",
        roleRu: "Разведка в Киву и Мозамбике",
        quantityNoteRu: "Объёмы закрыты; применение в операциях подтверждено косвенно",
        originRu: "Израиль и др.",
        provenance: pv("Открытая пресса", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: true,
      summaryRu: "Начальный ВПК: инженерные и ремонтные предприятия, сборка бронетехники и боеприпасов малых объёмов при израильском и южноафриканском участии",
      selfSufficiencyRu: "Низкая по платформам, растущая по обслуживанию и боеприпасам",
      companies: [
        {
          name: "Rwanda Engineering and Manufacturing (REMCO)",
          specializationRu: "Ремонт и сборка техники, металлообработка для RDF",
          provenance: pv("Открытые источники", 2024, true),
        },
      ],
      provenance: {
        source: "Аналитическая оценка проекта по открытым источникам",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "средняя",
      shareNoteRu: "Израиль и ЮАР — ключевые поставщики современных систем; Китай и Сербия — объёмы и боеприпасы",
      suppliers: [
        {
          supplier: "Израиль",
          noteRu: "ПВО SPYDER, БПЛА, обучение",
          provenance: pv("SIPRI; открытая пресса", 2024, true),
        },
        {
          supplier: "ЮАР",
          noteRu: "Бронетехника и артиллерия",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Восточноафриканское сообщество (EAC)", "Двусторонние военные миссии в Мозамбике и ЦАР", "Содружество наций"],
    vulnerabilities: [
      {
        titleRu: "Перенапряжение экспедиционной модели",
        descriptionRu: "Одновременные обязательства в ДРК (конфронтация), Мозамбике и ЦАР при населении 14 млн и малом бюджете: эскалация с ДРК в 2025 году показала риск большой войны, к которой экономика не готова",
        severityRu: "высокая",
        provenance: pv("ООН; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Зависимость от одного лидера и закрытости",
        descriptionRu: "Модель RDF — персональный проект президента Кагаме: преемственность не институционализирована, данные закрыты даже от парламента",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Точечная модернизация ПВО, артиллерии и БПЛА при сохранении лёгкой экспедиционной пехоты как ядра",
      programs: [
        {
          nameRu: "ПВО и артиллерийское обновление",
          noteRu: "SPYDER и ATMOS как приоритетные закупки 2020-х",
          provenance: pv("Открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "Открытая пресса; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция и местные силы обороны встроены в единую вертикаль безопасности; внутренняя оппозиция силовым структурам невозможна",
    overallNoteRu: "Профиль «малой военной державы»: эффективность RDF признана, но официальные числа занижают реальный контур",
  },
  {
    iso3: "SEN",
    name: "Senegal",
    nameRu: "Сенегал",
    region: "Западная Африка",
    subregionRu: "Самая западная точка Африки, якорь стабильности региона",
    forcesStatusRu: "Регулярные вооружённые силы с непереворотной традицией",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.55,
      amountNoteRu: "Порядка 0,5–0,6 млрд долл.; рост из-за морской нефти и газа (проекты GTA и Sangomar запущены в 2024 году)",
      year: 2024,
      shareOfGdpPct: 1.7,
      trendRu: "Рост: морские патрульные корабли, авиация и северная граница с Мали",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 13600,
      reserve: null,
      paramilitary: 8000,
      noteRu: "Около 13,6 тыс. военных; жандармерия — мощный второй контур; армия не правила страной ни разу — региональная аномалия",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные батальоны, бронетанковый компонент, группировка в Казамансе",
      navyRu: "ВМС: морские патрульные корабли (французские OPV Kership и др.), база Дакар",
      airForceRu: "Авиация: вертолёты, транспортные и учебные самолёты; лёгкие штурмовики обсуждались",
      otherRu: "Жандармерия, президентская охрана",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли OPV 58 S (Kership/Piriou)",
        roleRu: "Защита морских нефтяных и газовых месторождений",
        quantityNoteRu: "3 корабля заказаны Франции, поставки с 2023 года",
        originRu: "Франция",
        provenance: pv("Kership; IISS", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника французского и китайского происхождения",
        roleRu: "Мобильность и Казаманс",
        quantityNoteRu: "Десятки единиц смешанного парка",
        originRu: "Франция и Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты и транспортные самолёты (CASA и др.)",
        roleRu: "Транспорт и наблюдение",
        quantityNoteRu: "Около десятка бортов",
        originRu: "Испания и Франция",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет, кроме судоремонта в Дакаре",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Франция — главный поставщик и партнёр, США — обучение, Китай — объёмы техники и инфраструктуры",
      suppliers: [
        {
          supplier: "Франция",
          noteRu: "OPV, обучение, пересмотр формата присутствия с 2024 года",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
        {
          supplier: "США",
          noteRu: "Обучение, программы безопасности границ",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ЭКОВАС", "Оборонное партнёрство с Францией"],
    vulnerabilities: [
      {
        titleRu: "Казаманс — замороженный сепаратизм",
        descriptionRu: "Конфликт с MFDC тлеет с 1982 года: армия ведёт постоянную операцию низкой интенсивности на юге, отрезанном территорией Гамбии",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Восточная граница с Мали",
        descriptionRu: "Выход Мали из ЭКОВАС и война AES с джихадистами делают регион Тамбакунда новым направлением внимания армии",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Морской поворот: OPV и наблюдение под нефтяные проекты, авиация наблюдения",
      programs: [
        {
          nameRu: "Программа OPV",
          noteRu: "Три французских патрульных корабля для защиты GTA и Sangomar",
          provenance: pv("Kership", 2024, false),
        },
      ],
      provenance: {
        source: "Kership; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Жандармерия — главный внутренний инструмент; армия остаётся вне политики",
    overallNoteRu: "Численность по IISS; стабильность институтов — главный актив профиля",
  },
  {
    iso3: "SYC",
    name: "Seychelles",
    nameRu: "Сейшелы",
    region: "Восточная Африка",
    subregionRu: "Архипелаг в Индийском океане к северо-востоку от Мадагаскара",
    forcesStatusRu: "Малые регулярные силы: Силы обороны Сейшел (SPDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.03,
      amountNoteRu: "Порядка 25–35 млн долл.",
      year: 2024,
      shareOfGdpPct: 1.5,
      trendRu: "Стабильный уровень с акцентом на морскую безопасность",
      provenance: {
        source: "Оценка проекта по IISS и CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 650,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 650 военнослужащих, из них береговая охрана — крупнейший компонент; Индия предоставляет советников и технику",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутный компонент: пехотная рота и спецподразделение Tazar",
      navyRu: "Береговая охрана: морские патрульные корабли индийской постройки",
      airForceRu: "Авиационное крыло: самолёты Dornier 228 и вертолёты индийской передачи",
      otherRu: "Военная полиция",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Морские патрульные корабли (Индия: классы Wave Rider и др.)",
        roleRu: "Борьба с пиратством и наркотрафиком в ИЭЗ",
        quantityNoteRu: "Несколько вымпелов, переданных Индией в 2010–2020-е",
        originRu: "Индия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Dornier 228 и вертолёты Chetak/Dhruv",
        roleRu: "Морское наблюдение",
        quantityNoteRu: "Единицы бортов",
        originRu: "Индия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Индия — почти монопольный донор морской техники; США и ЕС — программы против пиратства и трафика",
      suppliers: [
        {
          supplier: "Индия",
          noteRu: "Корабли, авиация, советники, станция наблюдения",
          provenance: pv("Правительство Индии; IISS", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Партнёрство с Индией (SAGAR)", "Африканский союз", "IORA"],
    vulnerabilities: [
      {
        titleRu: "Героиновый маршрут и ИЭЗ",
        descriptionRu: "1,3 млн км² морской зоны и транзит афганского героина превышают возможности нескольких катеров",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Индийские поставки катеров и наблюдения вместо программ",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция Сейшел — основной орган; SPDF ориентированы на море",
    overallNoteRu: "Микропрофиль с индийским морским зонтиком",
  },
  {
    iso3: "SLE",
    name: "Sierra Leone",
    nameRu: "Сьерра-Леоне",
    region: "Западная Африка",
    subregionRu: "Побережье Западной Африки, постконфликтное государство",
    forcesStatusRu: "Малые регулярные силы (RSLAF), перестроенные при британской поддержке",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.04,
      amountNoteRu: "Порядка 35–45 млн долл.",
      year: 2024,
      shareOfGdpPct: 0.8,
      trendRu: "Стабильный минимум",
      provenance: {
        source: "Оценка проекта по IISS и CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 8500,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 8,5 тыс. военных после глубокой реформы при британской программе IMATT; армия деполитизирована по сравнению с эпохой войны 1991–2002 годов",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные батальоны, инженерный компонент",
      navyRu: "Морское крыло: несколько патрульных катеров (китайские поставки)",
      airForceRu: "Фактически отсутствует: единичные вертолёты",
      otherRu: "Военная полиция, медицинские службы (роль в кризисе Эболы)",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные корабли китайской постройки",
        roleRu: "Борьба с незаконным промыслом — ключевой потерей бюджета",
        quantityNoteRu: "Несколько вымпелов поставлены Китаем в 2010–2020-е",
        originRu: "Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Лёгкая бронетехника и транспорт китайских и др. передач",
        roleRu: "Мобильность и поддержка полиции",
        quantityNoteRu: "Десятки единиц",
        originRu: "Китай и Великобритания (программы)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Великобритания — архитектор реформы, Китай — техника, США — обучение",
      suppliers: [
        {
          supplier: "Великобритания",
          noteRu: "Советники, реформа сектора безопасности (наследница IMATT)",
          provenance: pv("Правительство Великобритании", 2024, true),
        },
        {
          supplier: "Китай",
          noteRu: "Патрульные корабли и техника",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ЭКОВАС", "Мано-Ривер союз", "Содружество наций"],
    vulnerabilities: [
      {
        titleRu: "Попытка переворота 2023 года",
        descriptionRu: "Атака на оружейные склады во Фритауне в ноябре 2023 года показала, что деполитизация армии неполна, а контроль складов слаб",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта; открытая пресса", 2024, true),
      },
      {
        titleRu: "Граница с Гвинеей (Йенга)",
        descriptionRu: "Спор о деревне Йенга с Гвинеей периодически militarизируется с 2001 года",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; фокус на морской безопасности и складах",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция — основной орган; армия выводится на улицы только в кризисах",
    overallNoteRu: "Постконфликтный профиль с британским следом реформ",
  },
  {
    iso3: "SOM",
    name: "Somalia",
    nameRu: "Сомали",
    region: "Восточная Африка",
    subregionRu: "Африканский Рог, самая длинная береговая линия континента",
    forcesStatusRu: "Регулярные силы в стадии восстановления (SNA) при войне с «Аш-Шабаб»",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: null,
      amountNoteRu: "Точного бюджета нет: расходы на безопасность оцениваются в 0,1–0,2 млрд долл. собственных средств при многократно большей внешней поддержке (зарплаты и логистика часто донорские)",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Непрозрачна; снятие оружейного эмбарго ООН в декабре 2023 года открыло легальные закупки",
      provenance: {
        source: "Оценка проекта по ООН, IISS и Всемирному банку",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 30000,
      reserve: null,
      paramilitary: null,
      noteRu: "Номинально около 30 тыс. в армии и силах безопасности после биометрической регистрации; боеспособное ядро — бригада «Данаб» (подготовлена США) и турецко-подготовленная «Горгор»; клановая структура комплектования остаётся системной проблемой",
      provenance: {
        source: "IISS Military Balance 2024; ООН",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные дивизии по регионам, бригада спецназа «Данаб», бригада «Горгор»",
      navyRu: "Береговая охрана формируется при поддержке Турции и ЕС; флота как силы нет",
      airForceRu: "ВВС восстанавливаются: турецкие БПЛА и учебно-транспортные планы; боевых самолётов нет с 1991 года",
      otherRu: "Полиция, агентство NISA (разведка), региональные силы штатов (Джубаленд, Пунтленд и др.) вне полного контроля Могадишо",
    },
    equipment: [
      {
        branchRu: "БПЛА",
        system: "Bayraktar TB2 и Akıncı (Турция)",
        roleRu: "Удары по «Аш-Шабаб» — ключевая новая способность",
        quantityNoteRu: "Поставки с 2022 года, применение подтверждено; объёмы закрыты",
        originRu: "Турция",
        provenance: pv("Открытая пресса", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронеавтомобили турецкого, китайского и американского происхождения (Kirpi, DongFeng, RG-33)",
        roleRu: "Мобильность и защита от СВУ",
        quantityNoteRu: "Сотни единиц разных программ помощи",
        originRu: "Турция, Китай, США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Наследие армии Сиада Барре: танки Т-55, артиллерия",
        roleRu: "Остаточный парк",
        quantityNoteRu: "Большая часть небоеспособна; тяжёлая техника в основном у региональных сил и кланов",
        originRu: "СССР (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая: даже зарплаты и топливо частично донорские",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Турция — системный покровитель (база TURKSOM в Могадишо, подготовка, БПЛА, соглашение о морской безопасности 2024 года); США — «Данаб» и авиаудары; ОАЭ и Катар — конкурирующая поддержка; миссия АС (ATMIS → AUSSOM) — главный наземный щит",
      suppliers: [
        {
          supplier: "Турция",
          noteRu: "Подготовка «Горгор», БПЛА, база TURKSOM, оборонное соглашение 2024 года",
          provenance: pv("Открытая пресса; правительства Турции и Сомали", 2024, false),
        },
        {
          supplier: "США",
          noteRu: "Подготовка «Данаб», авиаудары по «Аш-Шабаб», техника",
          provenance: pv("Африканское командование США", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; ООН",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Африканский союз (миссия AUSSOM)", "IGAD", "Восточноафриканское сообщество (с 2023 года)"],
    vulnerabilities: [
      {
        titleRu: "«Аш-Шабаб» как параллельное государство",
        descriptionRu: "Группировка контролирует сельский юг и центр, собирает налоги эффективнее правительства и удерживает наступательные возможности против Могадишо; вывод ATMIS обнажает пределы SNA",
        severityRu: "высокая",
        provenance: pv("ООН; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Клановая архитектура армии",
        descriptionRu: "Комплектование по кланам делает армию коалицией лояльностей: в политическом кризисе центр — регионы единство сил не гарантировано",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Сомалиленд и меморандум Эфиопии",
        descriptionRu: "Соглашение Эфиопии с Сомалилендом о морском доступе (2024) едва не привело к региональной войне; статус-кво хрупок даже после анкарского урегулирования",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Восстановление армии с нуля при внешней архитектуре: после снятия эмбарго — первые легальные закупки и турецкое морское соглашение",
      programs: [
        {
          nameRu: "Турецкое оборонно-экономическое соглашение 2024 года",
          noteRu: "Турция берёт на себя строительство и подготовку ВМС Сомали на 10 лет",
          provenance: pv("Правительства Турции и Сомали", 2024, false),
        },
      ],
      provenance: {
        source: "Открытая пресса; ООН",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция и NISA действуют в военном режиме столицы; региональные силы штатов автономны",
    overallNoteRu: "Пониженное доверие к числам: государство восстанавливается, статистика фрагментарна",
  },
  {
    iso3: "SSD",
    name: "South Sudan",
    nameRu: "Южный Судан",
    region: "Восточная Африка",
    subregionRu: "Верхний Нил, самое молодое государство мира (2011)",
    forcesStatusRu: "Формально единые силы (SSPDF) при неполной интеграции бывших противников",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: null,
      amountNoteRu: "Достоверных данных нет: безопасность поглощает крупнейшую долю бюджета нефтяного государства, но публикации фрагментарны и непрозрачны",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Не оценивается",
      provenance: {
        source: "Оценка проекта по ООН и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 185000,
      reserve: null,
      paramilitary: null,
      noteRu: "Оценка IISS — порядка 185 тыс. номинально (наследие огромной SPLA), реально — раздутая структура с «мёртвыми душами» и параллельными лояльностями; объединённые силы по мирному соглашению 2018 года сформированы частично",
      provenance: {
        source: "IISS Military Balance 2024, оценка",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: дивизии по регионам, президентская гвардия «Тигр»",
      navyRu: "Речной компонент на Ниле минимален",
      airForceRu: "Авиация: вертолёты Ми-17 и Ми-24, несколько учебно-боевых самолётов",
      otherRu: "Национальная служба безопасности (NSS) — влиятельный орган с военной составляющей",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Т-55/Т-72 и бронетехника советского образца, артиллерия",
        roleRu: "Наследие SPLA и закупок войны 2013–2018 годов",
        quantityNoteRu: "Десятки–сотни единиц в низком состоянии; эмбарго ООН на оружие действует с 2018 года",
        originRu: "СССР / Украина и др. рынки (исторически)",
        provenance: pv("IISS; панель экспертов ООН", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "Вертолёты Ми-17 / Ми-24",
        roleRu: "Мобильность в сезон дождей",
        quantityNoteRu: "Единицы–десятки бортов, обслуживание ограничено эмбарго",
        originRu: "Россия (исторически)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная (при оружейном эмбарго ООН)",
      shareNoteRu: "Формальные поставки запрещены эмбарго СБ ООН; исторически — Украина, Израиль и региональные каналы, что документировалось панелями экспертов",
      suppliers: [
        {
          supplier: "Исторические каналы (Украина и др.)",
          noteRu: "Поставки до и в обход эмбарго по данным панелей экспертов ООН",
          provenance: pv("Панель экспертов ООН по Южному Судану", 2024, true),
        },
      ],
      provenance: {
        source: "ООН; SIPRI",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["IGAD", "Восточноафриканское сообщество (EAC)"],
    vulnerabilities: [
      {
        titleRu: "Незавершённая интеграция армий",
        descriptionRu: "Мир 2018 года не создал единой армии: силы Киира и оппозиции Мачара сосуществуют, столкновения (2025, Насир) показывают риск возврата к войне",
        severityRu: "высокая",
        provenance: pv("ООН; аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Нефть как единственный тыл",
        descriptionRu: "Бюджет почти полностью нефтяной, а экспорт идёт через Судан, охваченный войной: остановка трубы в 2024 году обрушила доходы государства и армии",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; Всемирный банк", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; задача — хотя бы выплачивать жалование и интегрировать силы",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "NSS и полиция действуют параллельно армии; локальное насилие общин — повседневный фон",
    overallNoteRu: "Пониженное доверие ко всем числам: номинальная численность SSPDF не равна реальной силе",
  },
  {
    iso3: "TGO",
    name: "Togo",
    nameRu: "Того",
    region: "Западная Африка",
    subregionRu: "Узкая полоса Гвинейского залива между Ганой и Бенином",
    forcesStatusRu: "Регулярные вооружённые силы (FAT)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.19,
      amountNoteRu: "Порядка 0,17–0,21 млрд долл.; рост из-за северного фронта",
      year: 2024,
      shareOfGdpPct: 2.0,
      trendRu: "Рост после первых джихадистских атак на севере в 2021–2022 годах",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 10100,
      reserve: null,
      paramilitary: 2500,
      noteRu: "Около 10 тыс. военных; армия исторически — опора династии Гнассингбе и комплектуется с этническим перекосом (кабье)",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные полки, северная группировка в Саванах",
      navyRu: "ВМС: патрульные корабли и катера в Ломе",
      airForceRu: "Авиация: вертолёты и лёгкие самолёты, учебно-боевые Alpha Jet наследия в ограниченном состоянии",
      otherRu: "Жандармерия, президентская охрана",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника советского и французского наследия, новые китайские бронеавтомобили",
        roleRu: "Мобильность северного фронта",
        quantityNoteRu: "Десятки единиц",
        originRu: "СССР, Франция, Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "БПЛА",
        system: "Разведывательные БПЛА (закупки 2020-х, по открытым данным)",
        roleRu: "Контроль северной границы с Буркина-Фасо",
        quantityNoteRu: "Единицы систем",
        originRu: "Израиль / Турция (по открытым данным)",
        provenance: pv("Открытая пресса", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Франция — исторический партнёр, Китай и Турция — новые поставщики северного перевооружения",
      suppliers: [
        {
          supplier: "Франция",
          noteRu: "Обучение и техника наследия",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Китай",
          noteRu: "Бронеавтомобили и экипировка",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ЭКОВАС", "Аккрская инициатива"],
    vulnerabilities: [
      {
        titleRu: "Северный джихадистский фронт",
        descriptionRu: "Регион Саван граничит с Буркина-Фасо: атаки с 2021 года стали регулярными, армия впервые ведёт контртеррористическую войну",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; ACLED", 2024, true),
      },
      {
        titleRu: "Династическая армия",
        descriptionRu: "FAT — гарант семьи Гнассингбе с 1967 года: конституционная реформа 2024 года (переход к парламентской системе) сохраняет семейный контроль, армия — его страховка",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Северное усиление: базы, БПЛА и набор",
      programs: [
        {
          nameRu: "Операция «Кунданке» на севере",
          noteRu: "Постоянная группировка в Саванах с 2018 года, расширена после атак 2022 года",
          provenance: pv("Правительство Того", 2024, true),
        },
      ],
      provenance: {
        source: "Правительство Того; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Жандармерия и полиция — внутренний контур; армия политически центральна",
    overallNoteRu: "Численность по IISS; северный фронт — главный сюжет профиля",
  },
  {
    iso3: "UGA",
    name: "Uganda",
    nameRu: "Уганда",
    region: "Восточная Африка",
    subregionRu: "Великие озёра, региональная военная держава",
    forcesStatusRu: "Регулярные силы: Народные силы обороны Уганды (UPDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.95,
      amountNoteRu: "Порядка 0,9–1,1 млрд долл. — один из крупнейших в Восточной Африке",
      year: 2024,
      shareOfGdpPct: 1.9,
      trendRu: "Стабильно высокий уровень при постоянных экспедиционных операциях",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 45000,
      reserve: 10000,
      paramilitary: null,
      noteRu: "Около 45 тыс. военных; UPDF — основа миссии АС в Сомали исторически, контингенты в ДРК (операция «Шуджаа» против ADF) и Южном Судане",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: дивизии, бронетанковый и артиллерийский компоненты российского парка",
      navyRu: "Озёрный компонент на Виктории и Альберте",
      airForceRu: "Авиация: истребители Су-30МК2, вертолёты Ми-24/Ми-171, БПЛА",
      otherRu: "Президентская гвардия (SFC) — элитная параллельная структура под командованием сына президента",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "Су-30МК2",
        roleRu: "Истребительная авиация — редкость для региона",
        quantityNoteRu: "6 машин поставлены Россией в 2011–2012 годах",
        originRu: "Россия",
        provenance: pv("IISS Military Balance; SIPRI", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Т-72 и Т-55, БМП, РСЗО советского/российского парка",
        roleRu: "Бронетанковое ядро",
        quantityNoteRu: "Сотни единиц в смешанном состоянии",
        originRu: "Россия и СССР (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "БПЛА",
        system: "Разведывательные БПЛА израильского и др. происхождения",
        roleRu: "Разведка в ДРК и Сомали",
        quantityNoteRu: "Объёмы закрыты; локальная сборка БПЛА заявлялась властями",
        originRu: "Израиль и др.",
        provenance: pv("Открытая пресса", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: true,
      summaryRu: "Развивающийся государственный ВПК вокруг NEC (National Enterprise Corporation): бронетехника Nyoka, боеприпасы, заявленная сборка БПЛА",
      selfSufficiencyRu: "Низкая по платформам, заметная по боеприпасам и бронетехнике лёгкого класса",
      companies: [
        {
          name: "National Enterprise Corporation (NEC)",
          specializationRu: "Коммерческое крыло армии: бронетехника, боеприпасы, гражданские проекты",
          provenance: pv("Открытые источники", 2024, true),
        },
        {
          name: "Luwero Industries",
          specializationRu: "Боеприпасы и взрывчатые вещества",
          provenance: pv("Открытые источники", 2024, true),
        },
      ],
      provenance: {
        source: "Открытые источники",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "средняя",
      shareNoteRu: "Россия — платформы и авиация, Израиль — БПЛА и электроника, Китай — объёмы и кредиты",
      suppliers: [
        {
          supplier: "Россия",
          noteRu: "Су-30, танки, вертолёты, обслуживание",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
        {
          supplier: "Израиль",
          noteRu: "БПЛА и модернизация систем",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Восточноафриканское сообщество (EAC)", "Африканский союз (миссии в Сомали)"],
    vulnerabilities: [
      {
        titleRu: "ADF и восточная ДРК",
        descriptionRu: "Исламистская ADF, связанная с ИГ, убивает мирных жителей при развёрнутой операции «Шуджаа»: война без видимого конца на чужой территории",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта; ООН", 2024, true),
      },
      {
        titleRu: "Семейная преемственность в командовании",
        descriptionRu: "Сын президента Мухузи Кайнеругаба возглавляет UPDF: армия институционально связана с вопросом преемственности Мусевени",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Перенапряжение экспедиций",
        descriptionRu: "Сомали, ДРК и Южный Судан одновременно: ротация и логистика UPDF работают на пределе бюджета",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Ставка на собственный ВПК (NEC) и российское обслуживание авиации",
      programs: [
        {
          nameRu: "Развитие NEC и локальной бронетехники",
          noteRu: "Nyoka и совместные проекты с ЮАР по бронетехнике",
          provenance: pv("Открытые источники", 2024, true),
        },
      ],
      provenance: {
        source: "Открытые источники; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция и SFC делят внутренний контур; армия — главный внешнеполитический инструмент режима",
    overallNoteRu: "Численность по IISS; экспедиционная активность — определяющая черта профиля",
  },
  {
    iso3: "BWA",
    name: "Botswana",
    nameRu: "Ботсвана",
    region: "Южная Африка",
    subregionRu: "Калахари, алмазная экономика, стабильная демократия региона",
    forcesStatusRu: "Регулярные силы: Силы обороны Ботсваны (BDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.55,
      amountNoteRu: "Порядка 0,5–0,6 млрд долл. — высокий уровень для населения 2,6 млн; исторически одна из самых финансируемых армий региона на душу населения",
      year: 2024,
      shareOfGdpPct: 2.8,
      trendRu: "Рост: программа модернизации при алмазных доходах (политический цикл после смены власти в 2024 году пересматривает приоритеты)",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 9000,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 9 тыс. военных; армия профессиональна и аполитична, известна антибраконьерскими операциями",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные бригады, бронетанковый компонент",
      navyRu: "Отсутствуют (нет выхода к морю)",
      airForceRu: "Авиационное крыло: истребители F-5 (CF-5) канадского наследия, транспортные C-130 и вертолёты",
      otherRu: "Спецназ, военная полиция, антибраконьерские подразделения",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "CF-5 (F-5) Freedom Fighter",
        roleRu: "Истребительный компонент",
        quantityNoteRu: "Около 13 машин канадской постройки 1990-х, обсуждается замена (Gripen и др. варианты изучались)",
        originRu: "Канада",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника австрийского и др. происхождения (SK-105, бронеавтомобили)",
        roleRu: "Разведка и мобильность",
        quantityNoteRu: "Десятки единиц",
        originRu: "Австрия и др.",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "C-130 Hercules и вертолёты Bell 412",
        roleRu: "Транспорт в пустыне и антибраконьерские операции",
        quantityNoteRu: "Несколько бортов каждого типа",
        originRu: "США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет, кроме обслуживания",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "США и Европа — платформы; Израиль — электроника и БПЛА в нишах",
      suppliers: [
        {
          supplier: "США",
          noteRu: "Транспортная авиация, обучение",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
        {
          supplier: "Канада",
          noteRu: "Истребители CF-5 (историческая поставка)",
          provenance: pv("SIPRI Arms Transfers", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["САДК", "Африканский союз"],
    vulnerabilities: [
      {
        titleRu: "Алмазный закат и новая власть",
        descriptionRu: "Смена правящей партии впервые за 58 лет (2024) на фоне падения алмазных доходов ставит оборонные программы под пересмотр",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Старение истребительного парка",
        descriptionRu: "F-5 1990-х без объявленной замены: окно возможностей для закупки сужается вместе с доходами",
        severityRu: "средняя",
        provenance: pv("IISS; аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Изучалась замена истребителей и усиление наблюдения; решения отложены сменой власти",
      programs: [],
      provenance: {
        source: "Открытая пресса",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция Ботсваны — основной внутренний орган; армия уважаема и вне политики",
    overallNoteRu: "Численность по IISS; профиль стабильной армии без внешних врагов",
  },
  {
    iso3: "GNQ",
    name: "Equatorial Guinea",
    nameRu: "Экваториальная Гвинея",
    region: "Центральная Африка",
    subregionRu: "Гвинейский залив, нефтяное авторитарное государство",
    forcesStatusRu: "Регулярные вооружённые силы, встроенные в режим Обианга",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.15,
      amountNoteRu: "Порядка 0,1–0,2 млрд долл. по оценкам; данные непрозрачны, нефтяной пик страны пройден",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Снижение вслед за добычей нефти",
      provenance: {
        source: "Оценка проекта по IISS и историческим рядам SIPRI",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 1450,
      reserve: null,
      paramilitary: null,
      noteRu: "Малые силы при непропорционально закупленной в 2000–2010-е технике (украинские и израильские поставки); президентская охрана с иностранными инструкторами — реальное ядро",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: батальоны в Малабо и Бате",
      navyRu: "ВМС: несколько патрульных кораблей (украинский корвет и израильские катера)",
      airForceRu: "Авиация: учебно-боевые самолёты и вертолёты в единичном числе",
      otherRu: "Президентская гвардия с марокканскими и др. инструкторами исторически",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Корвет и патрульные корабли (Украина / Израиль)",
        roleRu: "Защита нефтяных платформ",
        quantityNoteRu: "Несколько вымпелов, поставленных в 2010-е",
        originRu: "Украина и Израиль",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника китайского и советского наследия",
        roleRu: "Охрана режима и объектов",
        quantityNoteRu: "Десятки единиц",
        originRu: "Китай и СССР (наследие)",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Украина и Израиль — платформы 2010-х, Китай — объёмы, Испания — исторические связи",
      suppliers: [
        {
          supplier: "Украина (исторически)",
          noteRu: "Корабли и техника до 2022 года",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["CEMAC", "Африканский союз"],
    vulnerabilities: [
      {
        titleRu: "Преемственность и нефтяной закат",
        descriptionRu: "Режим Обианга (с 1979 года) готовит преемника в лице сына — вице-президента: армия и гвардия — арбитры перехода при падающих доходах",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Пиратство залива",
        descriptionRu: "Нефтяные платформы в море защищены слабо при символическом флоте",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; парк эпохи нефтяного бума стареет",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция и гвардия слиты с режимом; независимых данных о силах почти нет",
    overallNoteRu: "Пониженное доверие к данным закрытого режима",
  },
  {
    iso3: "MLT",
    name: "Malta",
    nameRu: "Мальта",
    region: "Европа",
    subregionRu: "Центральное Средиземное море, нейтралитет, миграционный фронт ЕС",
    forcesStatusRu: "Малые регулярные силы: Вооружённые силы Мальты (AFM)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.09,
      amountNoteRu: "Порядка 80–100 млн долл., около 0,5% ВВП",
      year: 2024,
      shareOfGdpPct: 0.5,
      trendRu: "Стабильный уровень с вложениями ЕС в морское патрулирование",
      provenance: {
        source: "Оценка проекта по SIPRI и бюджету Мальты",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 1700,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 1,7 тыс. военнослужащих: полк, морская эскадра и авиационное крыло; задачи — миграция, поиск-спасание и контроль ИЭЗ",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутный компонент: пехотный полк и спецподразделение",
      navyRu: "Морская эскадра: морские патрульные корабли (ирландский P61 и итальянские катера)",
      airForceRu: "Авиационное крыло: самолёты морского патрулирования King Air и вертолёты AW139",
      otherRu: "Взрывотехническая и спасательная службы",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Морской патрульный корабль P61 (бывший ирландский OPV, модернизирован)",
        roleRu: "Флагман морской эскадры для операций в центральном Средиземноморье",
        quantityNoteRu: "1 крупный вымпел и несколько катеров",
        originRu: "Ирландия (передача) / Италия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Авиация",
        system: "King Air B200 MPA и вертолёты AW139",
        roleRu: "Морское патрулирование и спасание",
        quantityNoteRu: "Несколько бортов, часть профинансирована фондами ЕС",
        originRu: "США и Италия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Италия — системный партнёр (военная миссия помощи), ЕС — финансирование морской безопасности",
      suppliers: [
        {
          supplier: "Италия",
          noteRu: "Катера, обучение, многолетняя военная миссия на Мальте",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["ЕС", "Нейтралитет (без НАТО, PfP приостановлено исторически)"],
    vulnerabilities: [
      {
        titleRu: "Миграционный фронт без глубины",
        descriptionRu: "Зона поиска-спасания Мальты огромна (около 250 тыс. км²): AFM — первая линия миграционного давления из Ливии при микроразмере сил",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Обновление морского патрулирования на средства ЕС",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция Мальты — основной внутренний орган; AFM — море и ЧС",
    overallNoteRu: "Малый профиль нейтрального острова с морской специализацией",
  },
  {
    iso3: "STP",
    name: "São Tomé and Príncipe",
    nameRu: "Сан-Томе и Принсипи",
    region: "Западная Африка",
    subregionRu: "Острова Гвинейского залива у побережья Габона",
    forcesStatusRu: "Микросилы: Вооружённые силы Сан-Томе и Принсипи",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.01,
      amountNoteRu: "Менее 10 млн долл.; статистика не публикуется регулярно",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Стабильный минимум; интерес к морской безопасности растёт с нефтяными перспективами залива",
      provenance: {
        source: "Оценка проекта по IISS и CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 600,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 600 человек суммарно; береговая охрана — приоритет при поддержке Португалии и США",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутный компонент: роты на двух островах",
      navyRu: "Береговая охрана: несколько патрульных катеров",
      airForceRu: "Отсутствует",
      otherRu: "Президентская охрана",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные катера",
        roleRu: "Контроль ИЭЗ и борьба с пиратством",
        quantityNoteRu: "Несколько катеров португальских и американских передач",
        originRu: "Португалия и США",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Португалия — обучение и техника, США — морские программы залива, Ангола — региональные связи",
      suppliers: [
        {
          supplier: "Португалия",
          noteRu: "Обучение, катера, военное сотрудничество CPLP",
          provenance: pv("Открытая пресса", 2024, true),
        },
      ],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["CEEAC (Центральноафриканское экономическое сообщество)", "CPLP", "Африканский союз"],
    vulnerabilities: [
      {
        titleRu: "Пиратство Гвинейского залива",
        descriptionRu: "Острова лежат у нефтяных маршрутов залива: собственная береговая охрана символична, безопасность — региональные механизмы Yaoundé Architecture",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция — основной орган двух островов",
    overallNoteRu: "Микропрофиль: числа ориентировочны, публичной статистики почти нет",
  },
  {
    iso3: "ZMB",
    name: "Zambia",
    nameRu: "Замбия",
    region: "Южная Африка",
    subregionRu: "Медный пояс, страна без выхода к морю",
    forcesStatusRu: "Регулярные силы: Силы обороны Замбии (ZDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.32,
      amountNoteRu: "Порядка 0,3 млрд долл.",
      year: 2024,
      shareOfGdpPct: 1.2,
      trendRu: "Стабильный уровень; армия — крупный миротворческий контрибьютор (ЦАР)",
      provenance: {
        source: "Оценка проекта по SIPRI и IISS",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 15000,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 15 тыс. военных; ВВС Замбии исторически заметны в регионе (учебно-боевые самолёты китайского и югославского наследия)",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные бригады, бронетанковый компонент советского наследия",
      navyRu: "Отсутствуют (нет выхода к морю), речные катера",
      airForceRu: "ВВС: учебно-боевые L-15 и K-8 китайского производства, вертолёты, транспортники",
      otherRu: "Замбийская национальная служба (военизированная молодёжная структура)",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "L-15 и K-8 (Китай)",
        roleRu: "Учебно-боевые самолёты с лёгкими ударными возможностями",
        quantityNoteRu: "Несколько L-15 поставлены в 2016–2018 годах, K-8 — ранее",
        originRu: "Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Т-55 и бронетехника советского наследия, китайские бронеавтомобили",
        roleRu: "Основа парка",
        quantityNoteRu: "Десятки единиц",
        originRu: "СССР и Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет, кроме ремонтных мощностей; обсуждаются совместные проекты с Китаем",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Китай — доминирующий поставщик платформ и обучения; Индия — нишевые поставки",
      suppliers: [
        {
          supplier: "Китай",
          noteRu: "Авиация, бронетехника, обучение, инфраструктура",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["САДК", "Африканский союз"],
    vulnerabilities: [
      {
        titleRu: "Долговая зависимость от Китая",
        descriptionRu: "Реструктуризация долга после дефолта 2020 года ограничивает и оборонные закупки, и свободу манёвра между партнёрами",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта; МВФ", 2024, true),
      },
      {
        titleRu: "Северная граница с ДРК",
        descriptionRu: "Нестабильность Медного пояса соседа и контрабанда кобальта требуют пограничного присутствия, конкурирующего с миротворческими обязательствами",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ не заявлено; поддержание китайского парка",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция Замбии — внутренний контур; армия аполитична по региональным меркам",
    overallNoteRu: "Численность по IISS; китайский вектор — отличительная черта",
  },
  {
    iso3: "ZWE",
    name: "Zimbabwe",
    nameRu: "Зимбабве",
    region: "Южная Африка",
    subregionRu: "Южная Африка, страна под долгосрочными западными санкциями",
    forcesStatusRu: "Регулярные силы: Силы обороны Зимбабве (ZDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.35,
      amountNoteRu: "Порядка 0,3–0,4 млрд долл. по оценкам; данные непрозрачны, экономика хронически кризисна",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Непрозрачна; армия остаётся привилегированным институтом после переворота 2017 года",
      provenance: {
        source: "Оценка проекта по IISS и открытым бюджетам",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 29000,
      reserve: null,
      paramilitary: 21800,
      noteRu: "Около 29 тыс. военных и крупные военизированные структуры полиции; армия — автор переворота 2017 года и гарант нынешнего режима",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотные бригады, бронетанковый компонент китайского и советского парка",
      navyRu: "Отсутствуют (нет выхода к морю)",
      airForceRu: "Авиация: истребители F-7 китайского производства и учебно-боевые K-8, вертолёты",
      otherRu: "Президентская гвардия, военная разведка",
    },
    equipment: [
      {
        branchRu: "Авиация",
        system: "F-7MG и K-8 (Китай)",
        roleRu: "Истребительный и учебно-боевой компоненты",
        quantityNoteRu: "Около десятка бортов, состояние неоднородно",
        originRu: "Китай",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронетехника китайского производства (Type 85 и др.) и советское наследие",
        roleRu: "Основа парка",
        quantityNoteRu: "Сотни единиц номинально, боеспособность низкая",
        originRu: "Китай и СССР",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: true,
      summaryRu: "Zimbabwe Defence Industries — производство боеприпасов и взрывчатки, работающее вполсилы из-за санкций и кризиса",
      selfSufficiencyRu: "Частичная по боеприпасам малых калибров",
      companies: [
        {
          name: "Zimbabwe Defence Industries",
          specializationRu: "Боеприпасы, взрывчатые вещества, военная экипировка",
          provenance: pv("Открытые источники", 2024, true),
        },
      ],
      provenance: {
        source: "Открытые источники",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Китай — главный поставщик при западных санкциях; Россия — политическое сближение и нишевые поставки",
      suppliers: [
        {
          supplier: "Китай",
          noteRu: "Авиация, бронетехника, РЛС",
          provenance: pv("SIPRI Arms Transfers", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["САДК", "Африканский союз"],
    vulnerabilities: [
      {
        titleRu: "Армия как владелец режима",
        descriptionRu: "После 2017 года военные — совладельцы политической системы: любой кризис преемственности Мнангагвы проходит через казармы",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Экономический кризис как тыл",
        descriptionRu: "Гиперинфляционная история и валютные кризисы обесценивают жалование: лояльность покупается привилегиями, а не бюджетом",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ не видно; китайские поставки 2020-х точечны",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция и разведка (CIO) встроены в режимную вертикаль вместе с армией",
    overallNoteRu: "Пониженное доверие к данным: прозрачность бюджета минимальна",
  },
  {
    iso3: "XKX",
    name: "Kosovo",
    nameRu: "Косово",
    region: "Европа",
    subregionRu: "Западные Балканы, частично признанное государство под присутствием KFOR",
    forcesStatusRu: "Силы безопасности Косово (KSF) в процессе трансформации в армию",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.13,
      amountNoteRu: "Порядка 0,12–0,15 млрд долл.; рост опережающий в рамках десятилетнего плана создания армии (2019–2028)",
      year: 2024,
      shareOfGdpPct: 1.5,
      trendRu: "Быстрый рост: БПЛА Bayraktar, ПТРК Javelin, бронетехника",
      provenance: {
        source: "Оценка проекта по IISS и бюджету Косово",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 4000,
      reserve: 3000,
      paramilitary: null,
      noteRu: "Около 4 тыс. в KSF при плане роста до полноценной армии; в крае остаются около 4,5 тыс. военнослужащих KFOR (НАТО)",
      provenance: {
        source: "IISS Military Balance 2024; НАТО",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутный компонент: пехотные полки, инженерные и медицинские подразделения",
      navyRu: "Отсутствует (нет выхода к морю)",
      airForceRu: "Отсутствует; воздушное пространство контролирует KFOR",
      otherRu: "Полиция Косово — сильный параллельный контур с спецподразделениями на севере",
    },
    equipment: [
      {
        branchRu: "БПЛА",
        system: "Bayraktar TB2",
        roleRu: "Разведка — первый современный боевой актив KSF",
        quantityNoteRu: "5 аппаратов поставлены Турцией в 2023 году",
        originRu: "Турция",
        provenance: pv("Заявления правительства Косово", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "ПТРК Javelin и бронеавтомобили США",
        roleRu: "Противотанковая оборона и мобильность",
        quantityNoteRu: "Javelin одобрены США к продаже (запрос 2024 года), бронетехника передаётся партиями",
        originRu: "США",
        provenance: pv("DSCA", 2024, true),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронеавтомобили BMC Vuran (Турция)",
        roleRu: "Мобильность пехоты",
        quantityNoteRu: "Партии поставлены в 2021–2023 годах",
        originRu: "Турция",
        provenance: pv("Открытая пресса", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "ВПК нет; обсуждается производство боеприпасов при турецкой поддержке",
      selfSufficiencyRu: "Минимальная",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "высокая",
      shareNoteRu: "Турция и США — поставщики армии в становлении; Албания и Хорватия — региональные партнёры",
      suppliers: [
        {
          supplier: "Турция",
          noteRu: "БПЛА, бронетехника, обучение",
          provenance: pv("SIPRI; открытая пресса", 2024, false),
        },
        {
          supplier: "США",
          noteRu: "Javelin, бронетехника, подготовка через партнёрство с Национальной гвардией Айовы",
          provenance: pv("DSCA", 2024, true),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; DSCA",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Фактический зонтик НАТО (KFOR)", "Партнёрство с США и Турцией"],
    vulnerabilities: [
      {
        titleRu: "Непризнание и север",
        descriptionRu: "Сербия и половина мира не признают государственность; сербский север края — зона инцидентов (Баньска, 2023), где KSF юридически ограничены соглашениями с KFOR",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Армия в становлении",
        descriptionRu: "Тяжёлого вооружения нет и по плану не скоро будет: сдерживание Сербии полностью равно присутствию НАТО",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Десятилетний план трансформации KSF в армию по стандартам НАТО",
      programs: [
        {
          nameRu: "План перехода 2019–2028",
          noteRu: "Три фазы создания полноценных вооружённых сил; БПЛА и ПТРК — первые боевые закупки",
          provenance: pv("Правительство Косово", 2024, true),
        },
      ],
      provenance: {
        source: "Правительство Косово; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция Косово де-факто выполняет часть армейских функций на севере",
    overallNoteRu: "Профиль непризнанной большинством ООН территории из реестра проекта: данные IISS и НАТО",
  },
  {
    iso3: "PSE",
    name: "Palestine",
    nameRu: "Палестина",
    region: "Ближний Восток",
    subregionRu: "Западный берег и сектор Газа, государственность ограничена оккупацией и расколом",
    forcesStatusRu: "Силы безопасности Палестинской автономии (Западный берег); в Газе до войны 2023 года — структуры ХАМАС",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: null,
      amountNoteRu: "Единого оборонного бюджета не существует: безопасность ПА финансируется из бюджета автономии при донорской поддержке (США, ЕС), расходы ХАМАС в Газе были закрыты и финансировались извне; после октября 2023 года картина разрушена войной",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Не оценивается в условиях войны в Газе и фискального кризиса ПА",
      provenance: {
        source: "Оценка проекта по ООН, IISS и Всемирному банку",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 43000,
      reserve: null,
      paramilitary: null,
      noteRu: "Силы безопасности ПА на Западном берегу — порядка 30–45 тыс. по разным оценкам (полиция, национальные силы безопасности, президентская гвардия, разведка); вооружённое крыло ХАМАС до войны оценивалось в 20–30 тыс. бойцов, его состояние после кампании 2023–2025 годов деградировало, точных данных нет",
      provenance: {
        source: "IISS Military Balance 2024; оценки ООН и профильных центров",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Национальные силы безопасности ПА: батальоны, подготовленные при координации США (USSC) и обучении в Иордании",
      navyRu: "Морская полиция ПА символическая; побережье Газы контролируется Израилем",
      airForceRu: "Отсутствует; воздушное пространство контролируется Израилем",
      otherRu: "Президентская гвардия, общая разведка, военная полиция; в Газе до войны — бригады «Изз ад-Дин аль-Кассам» как параллельная армия",
    },
    equipment: [
      {
        branchRu: "Сухопутные войска",
        system: "Лёгкая бронетехника и стрелковое оружие сил ПА (по согласованию с Израилем по Осло)",
        roleRu: "Внутренний порядок на Западном берегу и координация безопасности с Израилем",
        quantityNoteRu: "Вооружение жёстко ограничено соглашениями Осло: тяжёлой техники нет",
        originRu: "Разные доноры через контролируемые каналы",
        provenance: pv("IISS Military Balance", 2024, true),
      },
      {
        branchRu: "Ракетные силы (Газа, до войны)",
        system: "Самодельные и импортные ракеты, туннельная инфраструктура ХАМАС",
        roleRu: "Асимметричный арсенал группировки до кампании 2023–2025 годов",
        quantityNoteRu: "Оценки арсенала до войны — тысячи ракет разной дальности; большая часть инфраструктуры уничтожена или деградировала по заявлениям Израиля, независимой верификации нет",
        originRu: "Локальное производство и контрабанда при иранской поддержке",
        provenance: pv("IISS; оценки профильных центров", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Легального ВПК нет; в Газе до войны существовало подпольное производство ракет и БПЛА при внешней технологической поддержке",
      selfSufficiencyRu: "Не применимо к государству; асимметричное производство группировок — отдельный феномен",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная и контролируемая",
      shareNoteRu: "Силы ПА вооружаются только с согласия Израиля и при донорском контроле (США, ЕС, Иордания, Египет); структуры Газы снабжались контрабандой и иранской поддержкой вне легальных каналов",
      suppliers: [
        {
          supplier: "США и ЕС (для сил ПА)",
          noteRu: "Обучение, нелетальное и ограниченное летальное снаряжение через координацию безопасности",
          provenance: pv("Госдепартамент США; ЕС", 2024, true),
        },
        {
          supplier: "Иран (для структур Газы, до войны)",
          noteRu: "Технологии ракет и БПЛА, финансирование — по оценкам Израиля и США",
          provenance: pv("Оценки профильных центров", 2024, true),
        },
      ],
      provenance: {
        source: "IISS; ООН",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Лига арабских государств", "Координация безопасности ПА с Израилем (по Осло)"],
    vulnerabilities: [
      {
        titleRu: "Раскол Западный берег — Газа",
        descriptionRu: "Две враждующие силовые системы с 2007 года: единого палестинского командования не существует, война 2023–2025 годов разрушила газанский контур полностью",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Отсутствие суверенного контроля",
        descriptionRu: "Перемещения, вооружение и даже зарплаты сил ПА зависят от Израиля и доноров: армия по построению не может быть инструментом внешней обороны",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Фискальный коллапс ПА",
        descriptionRu: "Удержание Израилем налоговых переводов и падение донорской помощи ведут к невыплатам силам безопасности — риск распада порядка на Западном берегу",
        severityRu: "высокая",
        provenance: pv("Всемирный банк; аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет; обсуждаются международные планы восстановления сил ПА для послевоенного устройства Газы",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Профиль территории без армии в классическом смысле: две силовые системы описаны раздельно и честно",
    overallNoteRu: "Пониженное доверие ко всем данным военного периода; профиль фиксирует институциональную структуру, а не точные числа",
  },
  {
    iso3: "FJI",
    name: "Fiji",
    nameRu: "Фиджи",
    region: "Океания",
    subregionRu: "Меланезия, крупнейшие вооружённые силы южной части Тихого океана",
    forcesStatusRu: "Регулярные силы: Вооружённые силы Республики Фиджи (RFMF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.09,
      amountNoteRu: "Порядка 80–100 млн долл.",
      year: 2024,
      shareOfGdpPct: 1.6,
      trendRu: "Стабильный уровень; миротворчество ООН — главный источник дохода и опыта армии",
      provenance: {
        source: "Оценка проекта по IISS и бюджету Фиджи",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 3500,
      reserve: 6000,
      paramilitary: null,
      noteRu: "Около 3,5 тыс. активных при большом резерве; фиджийцы — непропорционально крупный контрибьютор миротворцев (Синай, Голанские высоты, Ирак) и охранных контрактов",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: пехотный полк (батальоны), инженерный компонент",
      navyRu: "ВМС: морские патрульные корабли Guardian-class из Австралии",
      airForceRu: "Авиационного крыла нет с 1990-х; вертолёты единичны",
      otherRu: "Военная полиция, учебный центр",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные катера Guardian-class",
        roleRu: "Контроль ИЭЗ и рыболовства",
        quantityNoteRu: "2 катера переданы Австралией (второй — взамен севшего на риф в 2024 году)",
        originRu: "Австралия (Austal)",
        provenance: pv("Правительство Австралии", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Бронеавтомобили Bushmaster (передача Австралии)",
        roleRu: "Миротворческие операции и мобильность",
        quantityNoteRu: "Несколько машин переданы для миссий",
        originRu: "Австралия",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Австралия и Новая Зеландия — системные партнёры (Vuvale Partnership), Китай — инфраструктурные предложения, вызывающие конкуренцию",
      suppliers: [
        {
          supplier: "Австралия",
          noteRu: "Катера Guardian-class, обучение, совместные учения",
          provenance: pv("Правительство Австралии", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Тихоокеанское сообщество", "Оборонное партнёрство с Австралией и Новой Зеландией", "FRANZ (ЧС-сотрудничество)"],
    vulnerabilities: [
      {
        titleRu: "Армия как политический актор",
        descriptionRu: "Перевороты 1987, 2000 и 2006 годов — наследие RFMF; конституция 2013 года закрепила за армией роль гаранта, что остаётся структурным риском",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Поле конкуренции Австралия — Китай",
        descriptionRu: "Полицейское и инфраструктурное присутствие Китая растёт: Фиджи — объект соперничества, где армия получает предложения обеих сторон",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Обновление флота по австралийской программе Pacific Maritime Security",
      programs: [
        {
          nameRu: "Катера Guardian-class",
          noteRu: "Австралийская программа замены патрульного флота островных государств",
          provenance: pv("Правительство Австралии", 2024, false),
        },
      ],
      provenance: {
        source: "Правительство Австралии; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция Фиджи — отдельный орган; армия доминирует в политике безопасности исторически",
    overallNoteRu: "Численность по IISS; миротворческая специализация — суть профиля",
  },
  {
    iso3: "PNG",
    name: "Papua New Guinea",
    nameRu: "Папуа — Новая Гвинея",
    region: "Океания",
    subregionRu: "Меланезия, вторая страна мира по языковому разнообразию, граница с Индонезией",
    forcesStatusRu: "Регулярные силы: Силы обороны Папуа — Новой Гвинеи (PNGDF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.12,
      amountNoteRu: "Порядка 0,1–0,15 млрд долл.",
      year: 2024,
      shareOfGdpPct: 0.9,
      trendRu: "Рост на фоне оборонного соглашения с США (2023) и пакта с Австралией",
      provenance: {
        source: "Оценка проекта по IISS и бюджету ПНГ",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 4000,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 4 тыс. военных при населении 10+ млн — армия мала для территории и внутренних задач (племенные конфликты в highlands)",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутные войска: два пехотных батальона (RPIR), инженерный батальон",
      navyRu: "Морской компонент: патрульные катера Guardian-class, десантный корабль",
      airForceRu: "Авиационный компонент: лёгкие транспортные самолёты и вертолёты в малом числе",
      otherRu: "Военная полиция, учебные центры",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные катера Guardian-class",
        roleRu: "Контроль морских границ и рыболовства",
        quantityNoteRu: "4 катера переданы Австралией по программе морской безопасности",
        originRu: "Австралия (Austal)",
        provenance: pv("Правительство Австралии", 2024, false),
      },
      {
        branchRu: "Сухопутные войска",
        system: "Лёгкая техника и стрелковое оружие",
        roleRu: "Внутренние операции и церемониал",
        quantityNoteRu: "Только лёгкое вооружение",
        originRu: "Австралия и др.",
        provenance: pv("IISS Military Balance", 2024, true),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Австралия — системный партнёр (база Ломбрум на Манусе совместно развивается), США — соглашение о оборонном сотрудничестве 2023 года, Китай — конкурирующие предложения",
      suppliers: [
        {
          supplier: "Австралия",
          noteRu: "Катера, обучение, совместное развитие базы Ломбрум",
          provenance: pv("Правительство Австралии", 2024, false),
        },
        {
          supplier: "США",
          noteRu: "Соглашение DCA 2023 года: доступ к объектам и совместные учения",
          provenance: pv("Госдепартамент США", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database; официальные соглашения",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Оборонные соглашения с Австралией и США (2023)", "Тихоокеанский форум"],
    vulnerabilities: [
      {
        titleRu: "Племенное насилие в highlands",
        descriptionRu: "Вспышки межплеменных войн с десятками жертв (Энга, 2024) превышают возможности полиции и малой армии",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; ООН", 2024, true),
      },
      {
        titleRu: "Бугенвиль",
        descriptionRu: "Референдум 2019 года за независимость Бугенвиля (97,7%) ставит вопрос будущего государства; мирный процесс зависит от переговоров, а не от армии",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Объект конкуренции США — Китай",
        descriptionRu: "Соглашения с обеими державами за два года превратили ПНГ в арену соперничества при слабых институтах",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Планы расширения PNGDF при австралийской и американской поддержке",
      programs: [
        {
          nameRu: "Развитие базы Ломбрум",
          noteRu: "Совместный проект Австралии и ПНГ на острове Манус",
          provenance: pv("Правительство Австралии", 2024, false),
        },
      ],
      provenance: {
        source: "Правительство Австралии; IISS",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция (RPNGC) перегружена внутренним насилием; армия поддерживает её в кризисах",
    overallNoteRu: "Численность по IISS; геополитическая ценность страны растёт быстрее её армии",
  },
  {
    iso3: "KIR",
    name: "Kiribati",
    nameRu: "Кирибати",
    region: "Океания",
    subregionRu: "Микронезия, атоллы на экваторе с огромной ИЭЗ",
    forcesStatusRu: "Вооружённых сил нет; есть полиция с морским патрульным компонентом",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует",
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 200,
      noteRu: "Полиция Кирибати включает морское патрульное подразделение с одним катером Guardian-class (передан Австралией)",
      provenance: {
        source: "CIA World Factbook; правительство Австралии",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует",
      navyRu: "Морская полиция: патрульный катер Guardian-class",
      airForceRu: "Отсутствует",
      otherRu: "Полиция атоллов",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульный катер Guardian-class",
        roleRu: "Контроль ИЭЗ в 3,5 млн км² — крупнейшей на душу населения в мире",
        quantityNoteRu: "1 катер на всю зону, базирующийся в Бетио",
        originRu: "Австралия (Austal)",
        provenance: pv("Правительство Австралии", 2024, false),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет; морская техника — австралийские передачи",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Тихоокеанский форум", "Программы морской безопасности Австралии"],
    vulnerabilities: [
      {
        titleRu: "Климат как экзистенциальная угроза",
        descriptionRu: "Подъём океана ставит вопрос физического существования атоллов; безопасность страны — климатическая, а не военная категория",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; ООН", 2024, true),
      },
      {
        titleRu: "Переход между Тайванем и Китаем",
        descriptionRu: "Смена признания (Тайбэй → Пекин, 2019) и китайские полицейские советники делают Кирибати объектом тихоокеанской конкуренции",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо; морское наблюдение развивается партнёрами (форумное агентство FFA)",
      programs: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    securityNoteRu: "Честный профиль без армии: полиция и один патрульный катер на океанскую зону",
    overallNoteRu: "Нулевые военные значения — конституционный факт",
  },
  {
    iso3: "MHL",
    name: "Marshall Islands",
    nameRu: "Маршалловы Острова",
    region: "Океания",
    subregionRu: "Микронезия, свободная ассоциация с США, полигон Кваджалейн",
    forcesStatusRu: "Вооружённых сил нет; оборона — ответственность США по договору COFA",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет: оборона полностью делегирована США по Соглашению о свободной ассоциации",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует",
      provenance: {
        source: "CIA World Factbook; текст COFA",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 300,
      noteRu: "Национальная полиция и морское патрульное подразделение (катер Guardian-class); на атолле Кваджалейн — американский полигон ПРО (Ronald Reagan Ballistic Missile Defense Test Site)",
      provenance: {
        source: "CIA World Factbook; правительство США",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует",
      navyRu: "Морская полиция: патрульный катер Guardian-class",
      airForceRu: "Отсутствует",
      otherRu: "Полиция атоллов; американские силы на Кваджалейне не входят в структуры страны",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульный катер Guardian-class",
        roleRu: "Контроль ИЭЗ и рыболовства",
        quantityNoteRu: "1 катер австралийской передачи",
        originRu: "Австралия",
        provenance: pv("Правительство Австралии", 2024, false),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо: оборона — США по COFA",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Свободная ассоциация с США (COFA, обновлён в 2023–2024 годах)"],
    vulnerabilities: [
      {
        titleRu: "Стратегическая ценность без собственного голоса",
        descriptionRu: "Полигон Кваджалейн критичен для испытаний ПРО США: страна — площадка чужой стратегии, а ядерное наследие испытаний 1946–1958 годов остаётся главным вопросом безопасности населения",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо",
      programs: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    securityNoteRu: "Честный профиль без армии: оборона юридически — функция США",
    overallNoteRu: "Нулевые значения — договорный факт COFA",
  },
  {
    iso3: "FSM",
    name: "Micronesia",
    nameRu: "Микронезия",
    region: "Океания",
    subregionRu: "Каролинские острова, свободная ассоциация с США",
    forcesStatusRu: "Вооружённых сил нет; оборона — ответственность США по договору COFA",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует",
      provenance: {
        source: "CIA World Factbook; текст COFA",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 200,
      noteRu: "Национальная полиция и морские патрульные подразделения штатов с катерами Guardian-class (2 переданы Австралией)",
      provenance: {
        source: "CIA World Factbook; правительство Австралии",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует",
      navyRu: "Морское патрулирование полиции: катера Guardian-class",
      airForceRu: "Отсутствует",
      otherRu: "Полиции четырёх штатов федерации",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные катера Guardian-class",
        roleRu: "Контроль ИЭЗ, разбросанной на 2,6 млн км²",
        quantityNoteRu: "2 катера",
        originRu: "Австралия (Austal)",
        provenance: pv("Правительство Австралии", 2024, false),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо: оборона — США по COFA",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Свободная ассоциация с США (COFA, обновлён в 2023–2024 годах)"],
    vulnerabilities: [
      {
        titleRu: "Китайский фактор Чуука",
        descriptionRu: "Обсуждавшиеся китайские инфраструктурные проекты и сепаратистский референдум штата Чуук делают федерацию объектом тихоокеанской конкуренции без собственных сил",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо",
      programs: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    securityNoteRu: "Честный профиль без армии по договору COFA",
    overallNoteRu: "Нулевые значения — договорный факт",
  },
  {
    iso3: "PLW",
    name: "Palau",
    nameRu: "Палау",
    region: "Океания",
    subregionRu: "Западные Каролины у Филиппинского моря, свободная ассоциация с США",
    forcesStatusRu: "Вооружённых сил нет; есть бюро морской безопасности полиции",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет; морская безопасность финансируется как полицейская функция и донорскими программами",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Рост внимания и помощи из-за китайской активности в ИЭЗ",
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 150,
      noteRu: "Отдел морской безопасности — около сотни сотрудников с патрульными катерами; на территории строится американская РЛС загоризонтного типа (TACMOR)",
      provenance: {
        source: "CIA World Factbook; правительство США",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует",
      navyRu: "Морская безопасность полиции: катера Guardian-class и японские патрульные суда",
      airForceRu: "Отсутствует; наблюдение — американские активы и РЛС",
      otherRu: "Полиция Палау",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульный катер Guardian-class и суда японской передачи",
        roleRu: "Защита морского заповедника Палау (80% ИЭЗ — охраняемая зона)",
        quantityNoteRu: "Несколько вымпелов; фиксировались инциденты с китайскими исследовательскими судами",
        originRu: "Австралия и Япония (Nippon Foundation)",
        provenance: pv("Правительство Австралии; Nippon Foundation", 2024, false),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо: оборона — США по COFA",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет; техника морской безопасности — донорская",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Свободная ассоциация с США (COFA)", "Признание Тайваня (дипломатический фактор)"],
    vulnerabilities: [
      {
        titleRu: "Давление Китая из-за Тайваня",
        descriptionRu: "Палау — один из немногих оставшихся союзников Тайбэя: туристические бойкоты и морские инциденты Пекина — инструмент давления на страну без армии",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо; американский радарный проект TACMOR меняет стратегическую роль островов",
      programs: [
        {
          nameRu: "РЛС TACMOR (США)",
          noteRu: "Загоризонтная радиолокационная станция ВВС США для контроля Филиппинского моря",
          provenance: pv("ВВС США", 2024, true),
        },
      ],
      provenance: {
        source: "ВВС США",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Честный профиль без армии: морская полиция и американские сенсоры",
    overallNoteRu: "Нулевые значения — договорный факт COFA",
  },
  {
    iso3: "WSM",
    name: "Samoa",
    nameRu: "Самоа",
    region: "Океания",
    subregionRu: "Полинезия, центральная часть Тихого океана",
    forcesStatusRu: "Вооружённых сил нет; есть полиция с морским крылом",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует",
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 100,
      noteRu: "Полиция Самоа включает морское крыло с патрульным катером Guardian-class; внешняя безопасность — договор о дружбе с Новой Зеландией (1962)",
      provenance: {
        source: "CIA World Factbook; правительство Австралии",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует",
      navyRu: "Морское крыло полиции: катер Guardian-class Nafanua II/III",
      airForceRu: "Отсутствует",
      otherRu: "Полиция и служба тюрем",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульный катер Guardian-class",
        roleRu: "Контроль ИЭЗ и поиск-спасание",
        quantityNoteRu: "1 катер (Nafanua III после замены повреждённого Nafanua II)",
        originRu: "Австралия (Austal)",
        provenance: pv("Правительство Австралии", 2024, false),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Договор о дружбе с Новой Зеландией (1962)", "Тихоокеанский форум"],
    vulnerabilities: [
      {
        titleRu: "Наркотранзит и климат",
        descriptionRu: "Тихоокеанский наркомаршрут и циклоны — реальные риски страны, решаемые полицейским катером и региональной помощью",
        severityRu: "низкая",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо",
      programs: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    securityNoteRu: "Честный профиль без армии",
    overallNoteRu: "Нулевые значения — факт; безопасность коллективная и договорная",
  },
  {
    iso3: "SLB",
    name: "Solomon Islands",
    nameRu: "Соломоновы Острова",
    region: "Океания",
    subregionRu: "Меланезия, арена самого острого соперничества Австралия — Китай в Тихом океане",
    forcesStatusRu: "Вооружённых сил нет; есть полиция с морскими силами",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет; расходы на полицию растут при конкурирующей помощи Австралии и Китая",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует как военная категория",
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 400,
      noteRu: "Королевская полиция (RSIPF) — около 1,5 тыс. сотрудников суммарно; морские силы — катера Guardian-class; китайские полицейские инструкторы присутствуют по соглашению 2022 года",
      provenance: {
        source: "CIA World Factbook; IISS (Pacific)",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует с момента независимости",
      navyRu: "Морские силы полиции: 2 катера Guardian-class",
      airForceRu: "Отсутствует",
      otherRu: "Полиция быстрого реагирования, исправительная служба",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные катера Guardian-class",
        roleRu: "Контроль ИЭЗ и рыболовства",
        quantityNoteRu: "2 катера австралийской передачи",
        originRu: "Австралия (Austal)",
        provenance: pv("Правительство Австралии", 2024, false),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет; полицейское снаряжение поступает и из Австралии, и из Китая (включая учебные поставки)",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Соглашение о безопасности с Китаем (2022)", "Партнёрство с Австралией (исторический гарант, миссия RAMSI 2003–2017)"],
    vulnerabilities: [
      {
        titleRu: "Двойной зонтик как риск",
        descriptionRu: "Одновременные соглашения с Китаем и Австралией при слабых институтах: беспорядки 2021 года показали, что внешний гарант может понадобиться быстрее, чем партнёры договорятся",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
      {
        titleRu: "Межостровная фрагментация",
        descriptionRu: "Напряжённость Малаита — Гуадалканал (наследие «Tension» 1998–2003 годов) остаётся главным внутренним риском",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо; полицейская инфраструктура строится обоими партнёрами конкурентно",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Честный профиль без армии: безопасность — полиция и внешние соглашения",
    overallNoteRu: "Нулевые значения — факт; геополитический вес страны несоразмерен размеру",
  },
  {
    iso3: "TON",
    name: "Tonga",
    nameRu: "Тонга",
    region: "Океания",
    subregionRu: "Полинезия, единственная наследственная монархия Тихого океана",
    forcesStatusRu: "Малые регулярные силы: Вооружённые силы Его Величества (HMAF)",
    hasStandingArmy: true,
    budget: {
      amountUsdBn: 0.01,
      amountNoteRu: "Порядка 10 млн долл.",
      year: 2024,
      shareOfGdpPct: null,
      trendRu: "Стабильный минимум",
      provenance: {
        source: "Оценка проекта по IISS и CIA World Factbook",
        year: 2024,
        estimated: true,
      },
    },
    personnel: {
      active: 600,
      reserve: null,
      paramilitary: null,
      noteRu: "Около 600 военнослужащих: сухопутный компонент, морские силы и королевская гвардия; тонганцы служили в Ираке и Афганистане с партнёрами",
      provenance: {
        source: "IISS Military Balance 2024",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Сухопутный компонент: пехотная рота и инженерная поддержка",
      navyRu: "Морские силы: патрульные катера Guardian-class",
      airForceRu: "Отсутствует",
      otherRu: "Королевская гвардия, военная полиция",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульные катера Guardian-class",
        roleRu: "Контроль ИЭЗ и поиск-спасание",
        quantityNoteRu: "2 катера австралийской программы",
        originRu: "Австралия (Austal)",
        provenance: pv("Правительство Австралии", 2024, false),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Нулевая",
      companies: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    importDependence: {
      levelRu: "полная",
      shareNoteRu: "Австралия и Новая Зеландия — партнёры и доноры; Китай финансировал инфраструктуру",
      suppliers: [
        {
          supplier: "Австралия",
          noteRu: "Катера, обучение",
          provenance: pv("Правительство Австралии", 2024, false),
        },
      ],
      provenance: {
        source: "SIPRI Arms Transfers Database",
        year: 2024,
        estimated: true,
      },
    },
    alliances: ["Тихоокеанский форум", "Оборонное сотрудничество с Австралией и Новой Зеландией"],
    vulnerabilities: [
      {
        titleRu: "Стихийные бедствия как главная война",
        descriptionRu: "Извержение Хунга-Тонга (2022) отрезало страну от мира: HMAF востребованы как спасатели при полном отсутствии внешних военных угроз",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Программ нет",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Полиция Тонги — повседневный орган; HMAF подчинена монарху",
    overallNoteRu: "Микропрофиль монархии с церемониально-спасательной армией",
  },
  {
    iso3: "TUV",
    name: "Tuvalu",
    nameRu: "Тувалу",
    region: "Океания",
    subregionRu: "Полинезия, одна из самых малонаселённых и низких стран мира",
    forcesStatusRu: "Вооружённых сил нет; есть полиция с морским патрульным подразделением",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует",
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 100,
      noteRu: "Полиция Тувалу — около сотни сотрудников; морское крыло эксплуатирует катер Guardian-class Te Mataili II",
      provenance: {
        source: "CIA World Factbook; правительство Австралии",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует",
      navyRu: "Морское патрулирование полиции: 1 катер Guardian-class",
      airForceRu: "Отсутствует",
      otherRu: "Полиция атоллов",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульный катер Guardian-class",
        roleRu: "Контроль ИЭЗ в 900 тыс. км²",
        quantityNoteRu: "1 катер",
        originRu: "Австралия (Austal)",
        provenance: pv("Правительство Австралии", 2024, false),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Союз Фалепили с Австралией (2023): климатическая мобильность и безопасность", "Тихоокеанский форум"],
    vulnerabilities: [
      {
        titleRu: "Физическое исчезновение территории",
        descriptionRu: "Средняя высота атоллов — около 2 метров: союз Фалепили с Австралией впервые в истории увязал подъём океана с эвакуацией и сохранением государственности",
        severityRu: "высокая",
        provenance: pv("Аналитическая оценка проекта; текст союза Фалепили", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо",
      programs: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    securityNoteRu: "Честный профиль без армии: безопасность — климатический договор с Австралией",
    overallNoteRu: "Нулевые значения — факт; страна — символ климатической безопасности",
  },
  {
    iso3: "VUT",
    name: "Vanuatu",
    nameRu: "Вануату",
    region: "Океания",
    subregionRu: "Меланезия, архипелаг у Новой Каледонии",
    forcesStatusRu: "Вооружённых сил нет; есть военизированные Мобильные силы Вануату (VMF) в составе полиции",
    hasStandingArmy: false,
    budget: {
      amountUsdBn: 0,
      amountNoteRu: "Военного бюджета нет; VMF финансируются как полицейская структура",
      year: 2024,
      shareOfGdpPct: 0,
      trendRu: "Отсутствует",
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    personnel: {
      active: 0,
      reserve: 0,
      paramilitary: 300,
      noteRu: "VMF — около 300 человек лёгкой пехоты полицейского подчинения; морское крыло — катер Guardian-class",
      provenance: {
        source: "CIA World Factbook; IISS (Pacific)",
        year: 2024,
        estimated: true,
      },
    },
    services: {
      armyRu: "Отсутствует; VMF — ближайший аналог лёгкой пехоты",
      navyRu: "Морское крыло полиции: катер Guardian-class RVS Mataweli",
      airForceRu: "Отсутствует",
      otherRu: "Полиция Вануату",
    },
    equipment: [
      {
        branchRu: "Флот",
        system: "Патрульный катер Guardian-class",
        roleRu: "Контроль ИЭЗ и поддержка островов после циклонов",
        quantityNoteRu: "1 катер (второй ожидается по программе Австралии)",
        originRu: "Австралия (Austal)",
        provenance: pv("Правительство Австралии", 2024, false),
      },
    ],
    defenseIndustry: {
      hasIndustry: false,
      summaryRu: "Оборонной промышленности нет",
      selfSufficiencyRu: "Не применимо",
      companies: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    importDependence: {
      levelRu: "не применимо",
      shareNoteRu: "Импорта вооружений нет; снаряжение VMF — донорское (Австралия, Китай — включая переданные автомобили и форму)",
      suppliers: [],
      provenance: {
        source: "CIA World Factbook",
        year: 2024,
        estimated: false,
      },
    },
    alliances: ["Тихоокеанский форум", "FRANZ (Франция — Австралия — Новая Зеландия, помощь при ЧС)"],
    vulnerabilities: [
      {
        titleRu: "Циклоны категории 5 как регулярная война",
        descriptionRu: "Два циклона за неделю (2023) и землетрясение в Порт-Виле (2024) показывают: VMF — спасательная, а не военная структура по факту применения",
        severityRu: "средняя",
        provenance: pv("Аналитическая оценка проекта", 2024, true),
      },
    ],
    modernization: {
      summaryRu: "Не применимо; австралийская программа катеров — единственное обновление",
      programs: [],
      provenance: {
        source: "Аналитическая оценка проекта",
        year: 2024,
        estimated: true,
      },
    },
    securityNoteRu: "Честный профиль без армии: VMF юридически — полиция",
    overallNoteRu: "Нулевые значения — факт государственного устройства",
  },
];

/** Число профилей волны data5 (включая алиас PHI). */
export const REST_PROFILES_COUNT: number = REST_COUNTRY_PROFILES.length;

/** Поиск профиля волны data5 по коду ISO3. */
export function restProfileByIso3(iso3: string): RestCountryProfile | undefined {
  return REST_COUNTRY_PROFILES.find((profile) => profile.iso3 === iso3);
}

/** Все коды ISO3, покрытые волной data5. */
export const REST_ISO3_CODES: readonly string[] = REST_COUNTRY_PROFILES.map(
  (profile) => profile.iso3,
);

/** Коды без стоячей армии (честные профили сил безопасности). */
export const REST_NO_ARMY_CODES: readonly string[] = REST_COUNTRY_PROFILES.filter(
  (profile) => !profile.hasStandingArmy,
).map((profile) => profile.iso3);

/** Коды с закрытыми бюджетными данными (значение null сознательно). */
export const REST_OPAQUE_BUDGET_CODES: readonly string[] = REST_COUNTRY_PROFILES.filter(
  (profile) => profile.budget.amountUsdBn === null,
).map((profile) => profile.iso3);
