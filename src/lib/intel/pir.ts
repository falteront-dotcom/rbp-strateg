// ─────────────────────────────────────────────────────────────────────────────
// Приоритетные разведывательные потребности (PIR) и план сбора
// Постановка задач по дисциплинам, трекинг покрытия и пробелов
// РБП-Стратег 3.0 · Волна 2 «Разведывательный инструментарий» (ROADMAP-3.0)
// ─────────────────────────────────────────────────────────────────────────────

// PIR (Priority Intelligence Requirements) — вопросы командования, на
// которые разведка обязана ответить к сроку. Дисциплины ниже — ТИПЫ ЗАДАЧ
// сбора в мирной аналитической системе: они описывают, какого рода
// наблюдение нужно (открытые источники, снимки, геоданные), а не реальные
// оперативные возможности. Для РБП-Стратег это план OSINT/данных:
// какие открытые потоки закрывают какой вопрос и где остаются пробелы.

export type IntelDiscipline =
  | "OSINT"
  | "IMINT"
  | "SIGINT"
  | "HUMINT"
  | "GEOINT"
  | "MASINT"
  | "FININT"
  | "TECHINT";

export interface DisciplineProfile {
  id: IntelDiscipline;
  nameRu: string;
  scopeRu: string;
  limitationRu: string;
}

export const DISCIPLINE_PROFILES: DisciplineProfile[] = [
  {
    id: "OSINT",
    nameRu: "Открытые источники",
    scopeRu: "Публикации, реестры, тендеры, соцсети, коммерческие данные",
    limitationRu: "Самая дешёвая и быстрая дисциплина; уязвима к вбросам и требует верификации.",
  },
  {
    id: "IMINT",
    nameRu: "Видовая разведка",
    scopeRu: "Спутниковые и авиационные снимки, коммерческая съёмка",
    limitationRu: "Даёт проверяемые факты о дислокации и строительстве; зависит от пролётов и погоды.",
  },
  {
    id: "SIGINT",
    nameRu: "Радиоэлектронная разведка",
    scopeRu: "Радиообмен, излучения, структура сетей связи",
    limitationRu: "Показывает намерения через паттерны связи; противник может молчать или имитировать.",
  },
  {
    id: "HUMINT",
    nameRu: "Агенттурная разведка",
    scopeRu: "Источники с доступом к решениям и планам",
    limitationRu: "Единственная дисциплина о намерениях из первых рук; самая медленная и рискованная.",
  },
  {
    id: "GEOINT",
    nameRu: "Геопространственная разведка",
    scopeRu: "Пространственный анализ: террейн, маршруты, узкие места",
    limitationRu: "Отвечает на вопросы «где возможно»; требует актуальных геоданных.",
  },
  {
    id: "MASINT",
    nameRu: "Измерительно-сигнатурная разведка",
    scopeRu: "Подписи техники, РЛС, акустика, спектры",
    limitationRu: "Идентифицирует типы систем и режимы работы по физическим подписям.",
  },
  {
    id: "FININT",
    nameRu: "Финансовая разведка",
    scopeRu: "Бюджеты, торговля, транзакции, страхование",
    limitationRu: "Деньги трудно скрыть полностью: финансы честно показывают приоритеты и темпы.",
  },
  {
    id: "TECHINT",
    nameRu: "Техническая разведка",
    scopeRu: "Анализ образцов техники, ПО, компонентов",
    limitationRu: "Даёт реальные ТТХ и цепочки поставок; зависит от доступа к образцам.",
  },
];

export type PIRPriority = 1 | 2 | 3;
export type PIRCategory = "intentions" | "mobilization" | "operations" | "nuclear" | "sustain";

export interface PIRTemplate {
  id: string;
  category: PIRCategory;
  categoryRu: string;
  titleRu: string;
  questionRu: string;
  priority: PIRPriority;
  disciplines: IntelDiscipline[];
  linkedIndicatorCategories: string[];
}

export const PIR_TEMPLATES: PIRTemplate[] = [
  {
    id: "PIR-INTE-01",
    category: "intentions",
    categoryRu: "Намерения и решения руководства",
    titleRu: "Принято ли политическое решение о применении силы и в какие сроки",
    questionRu: "Принято ли политическое решение о применении силы и в какие сроки?",
    priority: 1,
    disciplines: ["OSINT", "HUMINT"],
    linkedIndicatorCategories: ["diplomacy", "information"],
  },
  {
    id: "PIR-INTE-02",
    category: "intentions",
    categoryRu: "Намерения и решения руководства",
    titleRu: "Какие действия противника руководство считает поводом к войне",
    questionRu: "Какие действия противника руководство считает поводом к войне?",
    priority: 1,
    disciplines: ["OSINT", "HUMINT"],
    linkedIndicatorCategories: ["diplomacy", "information"],
  },
  {
    id: "PIR-INTE-03",
    category: "intentions",
    categoryRu: "Намерения и решения руководства",
    titleRu: "Каковы военные и политические цели возможной операции: территория, принуждение, демонстрация",
    questionRu: "Каковы военные и политические цели возможной операции: территория, принуждение, демонстрация?",
    priority: 1,
    disciplines: ["HUMINT", "OSINT"],
    linkedIndicatorCategories: ["diplomacy", "information"],
  },
  {
    id: "PIR-INTE-04",
    category: "intentions",
    categoryRu: "Намерения и решения руководства",
    titleRu: "К какой дате группировка должна достичь полной готовности по замыслу",
    questionRu: "К какой дате группировка должна достичь полной готовности по замыслу?",
    priority: 1,
    disciplines: ["SIGINT", "HUMINT"],
    linkedIndicatorCategories: ["diplomacy", "information"],
  },
  {
    id: "PIR-INTE-05",
    category: "intentions",
    categoryRu: "Намерения и решения руководства",
    titleRu: "Насколько элиты и общество готовы к длительной войне и потерям",
    questionRu: "Насколько элиты и общество готовы к длительной войне и потерям?",
    priority: 2,
    disciplines: ["OSINT", "HUMINT"],
    linkedIndicatorCategories: ["diplomacy", "information"],
  },
  {
    id: "PIR-INTE-06",
    category: "intentions",
    categoryRu: "Намерения и решения руководства",
    titleRu: "Какие обязательства взяли союзники и что они реально поставят",
    questionRu: "Какие обязательства взяли союзники и что они реально поставят?",
    priority: 2,
    disciplines: ["OSINT", "HUMINT"],
    linkedIndicatorCategories: ["diplomacy", "information"],
  },
  {
    id: "PIR-INTE-07",
    category: "intentions",
    categoryRu: "Намерения и решения руководства",
    titleRu: "Что предусмотрено при провале первого этапа операции",
    questionRu: "Что предусмотрено при провале первого этапа операции?",
    priority: 2,
    disciplines: ["HUMINT", "SIGINT"],
    linkedIndicatorCategories: ["diplomacy", "information"],
  },
  {
    id: "PIR-INTE-08",
    category: "intentions",
    categoryRu: "Намерения и решения руководства",
    titleRu: "Какие механизмы деэскалации и каналы связи сохранены",
    questionRu: "Какие механизмы деэскалации и каналы связи сохранены?",
    priority: 2,
    disciplines: ["OSINT", "SIGINT"],
    linkedIndicatorCategories: ["diplomacy", "information"],
  },
  {
    id: "PIR-INTE-09",
    category: "intentions",
    categoryRu: "Намерения и решения руководства",
    titleRu: "Какой информационный замысел оправдания подготовлен",
    questionRu: "Какой информационный замысел оправдания подготовлен?",
    priority: 2,
    disciplines: ["OSINT"],
    linkedIndicatorCategories: ["diplomacy", "information"],
  },
  {
    id: "PIR-INTE-10",
    category: "intentions",
    categoryRu: "Намерения и решения руководства",
    titleRu: "Как противник оценивает реакцию союзников и где его оценка ошибочна",
    questionRu: "Как противник оценивает реакцию союзников и где его оценка ошибочна?",
    priority: 3,
    disciplines: ["HUMINT", "SIGINT"],
    linkedIndicatorCategories: ["diplomacy", "information"],
  },
  {
    id: "PIR-MOBI-01",
    category: "mobilization",
    categoryRu: "Мобилизация и резервы",
    titleRu: "Сколько резервистов фактически призвано и в какие сроки",
    questionRu: "Сколько резервистов фактически призвано и в какие сроки?",
    priority: 1,
    disciplines: ["OSINT", "SIGINT"],
    linkedIndicatorCategories: ["mobilization", "medical"],
  },
  {
    id: "PIR-MOBI-02",
    category: "mobilization",
    categoryRu: "Мобилизация и резервы",
    titleRu: "Какова доля призванных с боевым опытом и свежими навыками",
    questionRu: "Какова доля призванных с боевым опытом и свежими навыками?",
    priority: 2,
    disciplines: ["HUMINT", "OSINT"],
    linkedIndicatorCategories: ["mobilization", "medical"],
  },
  {
    id: "PIR-MOBI-03",
    category: "mobilization",
    categoryRu: "Мобилизация и резервы",
    titleRu: "Какие части созданы с нуля и какова их реальная укомплектованность",
    questionRu: "Какие части созданы с нуля и какова их реальная укомплектованность?",
    priority: 1,
    disciplines: ["IMINT", "OSINT"],
    linkedIndicatorCategories: ["mobilization", "medical"],
  },
  {
    id: "PIR-MOBI-04",
    category: "mobilization",
    categoryRu: "Мобилизация и резервы",
    titleRu: "Что ограничивает мобилизацию: инструкторы, техника, экономика",
    questionRu: "Что ограничивает мобилизацию: инструкторы, техника, экономика?",
    priority: 2,
    disciplines: ["OSINT", "FININT"],
    linkedIndicatorCategories: ["mobilization", "medical"],
  },
  {
    id: "PIR-MOBI-05",
    category: "mobilization",
    categoryRu: "Мобилизация и резервы",
    titleRu: "Каковы объёмы набора через «добровольцев» и частные формирования",
    questionRu: "Каковы объёмы набора через «добровольцев» и частные формирования?",
    priority: 2,
    disciplines: ["OSINT", "FININT"],
    linkedIndicatorCategories: ["mobilization", "medical"],
  },
  {
    id: "PIR-MOBI-06",
    category: "mobilization",
    categoryRu: "Мобилизация и резервы",
    titleRu: "Какие гражданские специальности изымаются из экономики",
    questionRu: "Какие гражданские специальности изымаются из экономики?",
    priority: 3,
    disciplines: ["OSINT"],
    linkedIndicatorCategories: ["mobilization", "medical"],
  },
  {
    id: "PIR-MOBI-07",
    category: "mobilization",
    categoryRu: "Мобилизация и резервы",
    titleRu: "Сколько недель реально обучаются мобилизованные перед отправкой",
    questionRu: "Сколько недель реально обучаются мобилизованные перед отправкой?",
    priority: 2,
    disciplines: ["HUMINT", "OSINT"],
    linkedIndicatorCategories: ["mobilization", "medical"],
  },
  {
    id: "PIR-MOBI-08",
    category: "mobilization",
    categoryRu: "Мобилизация и резервы",
    titleRu: "Создаётся ли территориальная оборона и для каких задач",
    questionRu: "Создаётся ли территориальная оборона и для каких задач?",
    priority: 3,
    disciplines: ["OSINT", "GEOINT"],
    linkedIndicatorCategories: ["mobilization", "medical"],
  },
  {
    id: "PIR-MOBI-09",
    category: "mobilization",
    categoryRu: "Мобилизация и резервы",
    titleRu: "Какой уровень потерь система готова принять без срыва мобилизации",
    questionRu: "Какой уровень потерь система готова принять без срыва мобилизации?",
    priority: 3,
    disciplines: ["OSINT", "HUMINT"],
    linkedIndicatorCategories: ["mobilization", "medical"],
  },
  {
    id: "PIR-MOBI-10",
    category: "mobilization",
    categoryRu: "Мобилизация и резервы",
    titleRu: "Готовятся ли условия второй волны мобилизации",
    questionRu: "Готовятся ли условия второй волны мобилизации?",
    priority: 2,
    disciplines: ["OSINT"],
    linkedIndicatorCategories: ["mobilization", "medical"],
  },
  {
    id: "PIR-OPER-01",
    category: "operations",
    categoryRu: "Оперативный замысел и группировка",
    titleRu: "Какие соединения сосредоточены и какова их реальная боеспособность",
    questionRu: "Какие соединения сосредоточены и какова их реальная боеспособность?",
    priority: 1,
    disciplines: ["IMINT", "SIGINT"],
    linkedIndicatorCategories: ["logistics", "ew-cyber", "space"],
  },
  {
    id: "PIR-OPER-02",
    category: "operations",
    categoryRu: "Оперативный замысел и группировка",
    titleRu: "Где вероятен главный удар, а где отвлекающие действия",
    questionRu: "Где вероятен главный удар, а где отвлекающие действия?",
    priority: 1,
    disciplines: ["GEOINT", "SIGINT"],
    linkedIndicatorCategories: ["logistics", "ew-cyber", "space"],
  },
  {
    id: "PIR-OPER-03",
    category: "operations",
    categoryRu: "Оперативный замысел и группировка",
    titleRu: "На сколько суток интенсивных ударов хватит высокоточных боеприпасов",
    questionRu: "На сколько суток интенсивных ударов хватит высокоточных боеприпасов?",
    priority: 1,
    disciplines: ["IMINT", "FININT"],
    linkedIndicatorCategories: ["logistics", "ew-cyber", "space"],
  },
  {
    id: "PIR-OPER-04",
    category: "operations",
    categoryRu: "Оперативный замысел и группировка",
    titleRu: "Как противник планирует подавлять ПВО и чем",
    questionRu: "Как противник планирует подавлять ПВО и чем?",
    priority: 2,
    disciplines: ["SIGINT", "IMINT"],
    linkedIndicatorCategories: ["logistics", "ew-cyber", "space"],
  },
  {
    id: "PIR-OPER-05",
    category: "operations",
    categoryRu: "Оперативный замысел и группировка",
    titleRu: "Какие средства РЭБ и в какой последовательности будут применены",
    questionRu: "Какие средства РЭБ и в какой последовательности будут применены?",
    priority: 2,
    disciplines: ["SIGINT", "TECHINT"],
    linkedIndicatorCategories: ["logistics", "ew-cyber", "space"],
  },
  {
    id: "PIR-OPER-06",
    category: "operations",
    categoryRu: "Оперативный замысел и группировка",
    titleRu: "Какие объекты инфраструктуры выбраны для кибервоздействия",
    questionRu: "Какие объекты инфраструктуры выбраны для кибервоздействия?",
    priority: 1,
    disciplines: ["TECHINT", "SIGINT"],
    linkedIndicatorCategories: ["logistics", "ew-cyber", "space"],
  },
  {
    id: "PIR-OPER-07",
    category: "operations",
    categoryRu: "Оперативный замысел и группировка",
    titleRu: "Готовятся ли десантные операции и в каких районах",
    questionRu: "Готовятся ли десантные операции и в каких районах?",
    priority: 2,
    disciplines: ["IMINT", "GEOINT"],
    linkedIndicatorCategories: ["logistics", "ew-cyber", "space"],
  },
  {
    id: "PIR-OPER-08",
    category: "operations",
    categoryRu: "Оперативный замысел и группировка",
    titleRu: "Где и когда будет введён второй эшелон",
    questionRu: "Где и когда будет введён второй эшелон?",
    priority: 1,
    disciplines: ["IMINT", "SIGINT"],
    linkedIndicatorCategories: ["logistics", "ew-cyber", "space"],
  },
  {
    id: "PIR-OPER-09",
    category: "operations",
    categoryRu: "Оперативный замысел и группировка",
    titleRu: "Какой темп наступления заложен в план и что его ограничивает",
    questionRu: "Какой темп наступления заложен в план и что его ограничивает?",
    priority: 2,
    disciplines: ["GEOINT", "HUMINT"],
    linkedIndicatorCategories: ["logistics", "ew-cyber", "space"],
  },
  {
    id: "PIR-OPER-10",
    category: "operations",
    categoryRu: "Оперативный замысел и группировка",
    titleRu: "Какие наблюдаемые действия покажут отказ от операции",
    questionRu: "Какие наблюдаемые действия покажут отказ от операции?",
    priority: 2,
    disciplines: ["IMINT", "OSINT"],
    linkedIndicatorCategories: ["logistics", "ew-cyber", "space"],
  },
  {
    id: "PIR-NUCL-01",
    category: "nuclear",
    categoryRu: "Ядерное измерение",
    titleRu: "Изменена ли фактическая готовность стратегических сил",
    questionRu: "Изменена ли фактическая готовность стратегических сил?",
    priority: 1,
    disciplines: ["IMINT", "SIGINT"],
    linkedIndicatorCategories: ["nuclear", "diplomacy"],
  },
  {
    id: "PIR-NUCL-02",
    category: "nuclear",
    categoryRu: "Ядерное измерение",
    titleRu: "Перемещаются ли специальные боеприпасы к носителям",
    questionRu: "Перемещаются ли специальные боеприпасы к носителям?",
    priority: 1,
    disciplines: ["IMINT", "HUMINT"],
    linkedIndicatorCategories: ["nuclear", "diplomacy"],
  },
  {
    id: "PIR-NUCL-03",
    category: "nuclear",
    categoryRu: "Ядерное измерение",
    titleRu: "При каких условиях руководство допускает применение ядерного оружия",
    questionRu: "При каких условиях руководство допускает применение ядерного оружия?",
    priority: 1,
    disciplines: ["HUMINT", "OSINT"],
    linkedIndicatorCategories: ["nuclear", "diplomacy"],
  },
  {
    id: "PIR-NUCL-04",
    category: "nuclear",
    categoryRu: "Ядерное измерение",
    titleRu: "Какие ядерные сигналы демонстративны, а какие оперативны",
    questionRu: "Какие ядерные сигналы демонстративны, а какие оперативны?",
    priority: 2,
    disciplines: ["OSINT", "IMINT"],
    linkedIndicatorCategories: ["nuclear", "diplomacy"],
  },
  {
    id: "PIR-NUCL-05",
    category: "nuclear",
    categoryRu: "Ядерное измерение",
    titleRu: "Рассматривается ли ограниченный или демонстрационный ядерный удар",
    questionRu: "Рассматривается ли ограниченный или демонстрационный ядерный удар?",
    priority: 2,
    disciplines: ["HUMINT"],
    linkedIndicatorCategories: ["nuclear", "diplomacy"],
  },
  {
    id: "PIR-NUCL-06",
    category: "nuclear",
    categoryRu: "Ядерное измерение",
    titleRu: "Готовится ли руководство к ответному удару: укрытия, эвакуация, непрерывность управления",
    questionRu: "Готовится ли руководство к ответному удару: укрытия, эвакуация, непрерывность управления?",
    priority: 2,
    disciplines: ["IMINT", "OSINT"],
    linkedIndicatorCategories: ["nuclear", "diplomacy"],
  },
  {
    id: "PIR-NUCL-07",
    category: "nuclear",
    categoryRu: "Ядерное измерение",
    titleRu: "Есть ли изменения процедур контроля и санкционирования применения",
    questionRu: "Есть ли изменения процедур контроля и санкционирования применения?",
    priority: 2,
    disciplines: ["SIGINT", "HUMINT"],
    linkedIndicatorCategories: ["nuclear", "diplomacy"],
  },
  {
    id: "PIR-NUCL-08",
    category: "nuclear",
    categoryRu: "Ядерное измерение",
    titleRu: "Консультируется ли противник с союзниками по ядерным вопросам",
    questionRu: "Консультируется ли противник с союзниками по ядерным вопросам?",
    priority: 3,
    disciplines: ["OSINT", "SIGINT"],
    linkedIndicatorCategories: ["nuclear", "diplomacy"],
  },
  {
    id: "PIR-NUCL-09",
    category: "nuclear",
    categoryRu: "Ядерное измерение",
    titleRu: "Готовятся ли войска к действиям в условиях применения ОМП",
    questionRu: "Готовятся ли войска к действиям в условиях применения ОМП?",
    priority: 2,
    disciplines: ["IMINT", "OSINT"],
    linkedIndicatorCategories: ["nuclear", "diplomacy"],
  },
  {
    id: "PIR-NUCL-10",
    category: "nuclear",
    categoryRu: "Ядерное измерение",
    titleRu: "Готовится ли возобновление ядерных испытаний",
    questionRu: "Готовится ли возобновление ядерных испытаний?",
    priority: 3,
    disciplines: ["IMINT", "OSINT"],
    linkedIndicatorCategories: ["nuclear", "diplomacy"],
  },
  {
    id: "PIR-SUST-01",
    category: "sustain",
    categoryRu: "Устойчивость: ВПК, запасы, логистика",
    titleRu: "Каков реальный месячный выпуск снарядов крупных калибров",
    questionRu: "Каков реальный месячный выпуск снарядов крупных калибров?",
    priority: 1,
    disciplines: ["FININT", "IMINT"],
    linkedIndicatorCategories: ["defense-industry", "finance", "logistics"],
  },
  {
    id: "PIR-SUST-02",
    category: "sustain",
    categoryRu: "Устойчивость: ВПК, запасы, логистика",
    titleRu: "Какие компоненты критически зависят от импорта и через какие каналы идут",
    questionRu: "Какие компоненты критически зависят от импорта и через какие каналы идут?",
    priority: 1,
    disciplines: ["FININT", "OSINT"],
    linkedIndicatorCategories: ["defense-industry", "finance", "logistics"],
  },
  {
    id: "PIR-SUST-03",
    category: "sustain",
    categoryRu: "Устойчивость: ВПК, запасы, логистика",
    titleRu: "На сколько месяцев войны хватит запасов ключевых боеприпасов",
    questionRu: "На сколько месяцев войны хватит запасов ключевых боеприпасов?",
    priority: 1,
    disciplines: ["IMINT", "FININT"],
    linkedIndicatorCategories: ["defense-industry", "finance", "logistics"],
  },
  {
    id: "PIR-SUST-04",
    category: "sustain",
    categoryRu: "Устойчивость: ВПК, запасы, логистика",
    titleRu: "Какова пропускная способность ремонтных заводов бронетехники",
    questionRu: "Какова пропускная способность ремонтных заводов бронетехники?",
    priority: 2,
    disciplines: ["IMINT", "OSINT"],
    linkedIndicatorCategories: ["defense-industry", "finance", "logistics"],
  },
  {
    id: "PIR-SUST-05",
    category: "sustain",
    categoryRu: "Устойчивость: ВПК, запасы, логистика",
    titleRu: "Каковы объёмы и уязвимости производства ударных БПЛА",
    questionRu: "Каковы объёмы и уязвимости производства ударных БПЛА?",
    priority: 2,
    disciplines: ["IMINT", "OSINT"],
    linkedIndicatorCategories: ["defense-industry", "finance", "logistics"],
  },
  {
    id: "PIR-SUST-06",
    category: "sustain",
    categoryRu: "Устойчивость: ВПК, запасы, логистика",
    titleRu: "Что ограничивает расширение ВПК: станки, кадры, компоненты",
    questionRu: "Что ограничивает расширение ВПК: станки, кадры, компоненты?",
    priority: 2,
    disciplines: ["OSINT", "FININT"],
    linkedIndicatorCategories: ["defense-industry", "finance", "logistics"],
  },
  {
    id: "PIR-SUST-07",
    category: "sustain",
    categoryRu: "Устойчивость: ВПК, запасы, логистика",
    titleRu: "Какие маршруты снабжения критичны и где их узкие места",
    questionRu: "Какие маршруты снабжения критичны и где их узкие места?",
    priority: 2,
    disciplines: ["GEOINT", "IMINT"],
    linkedIndicatorCategories: ["defense-industry", "finance", "logistics"],
  },
  {
    id: "PIR-SUST-08",
    category: "sustain",
    categoryRu: "Устойчивость: ВПК, запасы, логистика",
    titleRu: "Хватит ли ГСМ для операции запланированного масштаба и длительности",
    questionRu: "Хватит ли ГСМ для операции запланированного масштаба и длительности?",
    priority: 2,
    disciplines: ["FININT", "IMINT"],
    linkedIndicatorCategories: ["defense-industry", "finance", "logistics"],
  },
  {
    id: "PIR-SUST-09",
    category: "sustain",
    categoryRu: "Устойчивость: ВПК, запасы, логистика",
    titleRu: "Какие схемы обхода санкций работают и каковы их издержки",
    questionRu: "Какие схемы обхода санкций работают и каковы их издержки?",
    priority: 3,
    disciplines: ["FININT", "OSINT"],
    linkedIndicatorCategories: ["defense-industry", "finance", "logistics"],
  },
  {
    id: "PIR-SUST-10",
    category: "sustain",
    categoryRu: "Устойчивость: ВПК, запасы, логистика",
    titleRu: "Как долго гражданская экономика выдержит военный режим без срыва снабжения армии",
    questionRu: "Как долго гражданская экономика выдержит военный режим без срыва снабжения армии?",
    priority: 3,
    disciplines: ["FININT", "OSINT"],
    linkedIndicatorCategories: ["defense-industry", "finance", "logistics"],
  },
];

export type CollectionTaskStatus = "planned" | "active" | "completed" | "gap";

export interface CollectionTask {
  id: string;
  pirId: string;
  discipline: IntelDiscipline;
  taskRu: string;
  assetHintRu: string;
  cadenceRu: string;
  status: CollectionTaskStatus;
}

export interface PIRInstance {
  id: string;
  templateId: string;
  countryIso: string;
  deadline: string;
  ownerRu: string;
}

const ASSET_HINTS: Record<IntelDiscipline, string> = {
  OSINT: "Мониторинг официальных публикаций, тендерных площадок и региональных медиа по расписанию",
  IMINT: "Заказ коммерческой съёмки районов интереса с повторными пролётами для сличения",
  SIGINT: "Наблюдение публичных индикаторов связи: NOTAM, позывные в открытых базах, структура эфира",
  HUMINT: "Экспертные интервью и работа с открытыми инсайдерскими каналами с обязательной верификацией",
  GEOINT: "Пространственный анализ маршрутов, мостов, полигонов и районов сосредоточения по открытым геоданным",
  MASINT: "Сопоставление публичных подписей техники и режимов работы по открытым каталогам",
  FININT: "Анализ бюджетов, торговой статистики и страховых тарифов по открытым реестрам",
  TECHINT: "Анализ публично доступных образцов, документации и цепочек компонентов",
};

const CADENCE: Record<PIRPriority, string> = {
  1: "Ежедневно, сводка к 06:00",
  2: "Дважды в неделю",
  3: "Еженедельно",
};

/** Строит план сбора по шаблону PIR: задача на каждую дисциплину шаблона. */
export function buildCollectionPlan(pir: PIRInstance): CollectionTask[] {
  const template = PIR_TEMPLATES.find((t) => t.id === pir.templateId);
  if (!template) {
    return [];
  }
  return template.disciplines.map((discipline, idx) => ({
    id: `${pir.id}-T${idx + 1}`,
    pirId: pir.id,
    discipline,
    taskRu: `Закрыть вопрос «${template.questionRu}» средствами дисциплины ${discipline} по стране ${pir.countryIso} к сроку ${pir.deadline}.`,
    assetHintRu: ASSET_HINTS[discipline],
    cadenceRu: CADENCE[template.priority],
    status: "planned" as CollectionTaskStatus,
  }));
}

export interface CoverageReport {
  pirId: string;
  plannedTasks: number;
  activeOrCompleted: number;
  gapTasks: number;
  coveragePct: number;
  gapDisciplines: IntelDiscipline[];
}

/** Оценка покрытия одного PIR по статусам задач сбора. */
export function assessCoverage(pirId: string, tasks: CollectionTask[]): CoverageReport {
  const own = tasks.filter((t) => t.pirId === pirId);
  const done = own.filter((t) => t.status === "active" || t.status === "completed").length;
  const gaps = own.filter((t) => t.status === "gap");
  return {
    pirId,
    plannedTasks: own.length,
    activeOrCompleted: done,
    gapTasks: gaps.length,
    coveragePct: own.length > 0 ? Math.round((done / own.length) * 100) : 0,
    gapDisciplines: gaps.map((t) => t.discipline),
  };
}

export interface CollectionGapSummary {
  totalPirs: number;
  fullyCovered: number;
  reports: CoverageReport[];
  criticalGapsRu: string[];
}

/** Сводка пробелов по набору PIR: где план сбора не закрывает вопросы приоритета 1. */
export function summarizeGaps(pirs: PIRInstance[], tasks: CollectionTask[]): CollectionGapSummary {
  const reports = pirs.map((p) => assessCoverage(p.id, tasks));
  const criticalGapsRu: string[] = [];
  for (const pir of pirs) {
    const template = PIR_TEMPLATES.find((t) => t.id === pir.templateId);
    const report = reports.find((r) => r.pirId === pir.id);
    if (template && report && template.priority === 1 && report.coveragePct < 100) {
      criticalGapsRu.push(
        `PIR приоритета 1 «${template.titleRu}» покрыт на ${report.coveragePct}%: пробелы по дисциплинам ${report.gapDisciplines.join(", ") || "задачи не активированы"}.`,
      );
    }
  }
  return {
    totalPirs: pirs.length,
    fullyCovered: reports.filter((r) => r.coveragePct === 100).length,
    reports,
    criticalGapsRu,
  };
}

/** Шаблоны PIR по категории. */
export function pirTemplatesByCategory(category: PIRCategory): PIRTemplate[] {
  return PIR_TEMPLATES.filter((t) => t.category === category);
}
