export const TRANSLATIONS = {
    header: {
        title: "РБП КОМАНДНЫЙ ЦЕНТР",
        status: "ОПЕРАТИВНЫЙ СТАТУС",
        live_feed: "ПРЯМАЯ ТРАНСЛЯЦИЯ",
        coord_precision: "ТОЧНОСТЬ КООРДИНАТ",
    },
    deployment: {
        title: "ТАКТИЧЕСКОЕ РАЗВЕРТЫВАНИЕ",
        platform_type: "ТИП ПЛАТФОРМЫ",
        deploy_btn: "РАЗВЕРНУТЬ ЮНИТ",
        active_assets: "АКТИВНЫЕ СРЕДСТВА",
    },
    simulation: {
        sat_ready: "СПУТНИК ГОТОВ",
        threat_level: "УРОВЕНЬ УГРОЗЫ",
        scan: "СКАН",
        sat: "СПУТ",
        iff: "СВОЙ ЧУЖОЙ",
        on: "ВКЛ",
    },
    summary: {
        title: "СВОДКА СИСТЕМЫ",
        nato: "НАТО",
        rus: "РФ",
        china: "КНР",
    },
    environment: {
        title: "ОКРУЖАЮЩАЯ СРЕДА",
        atmospherics: "АТМОСФЕРНЫЕ УСЛОВИЯ",
        interference: "ПОМЕХИ РЭБ",
    },
    weather: {
        Clear: "Ясно",
        Rainy: "Дождь",
        Cloudy: "Облачно",
        Foggy: "Туман",
        Storm: "Шторм",
    },
    ew: {
        None: "Отсутствует",
        Low: "Низкий",
        High: "Высокий",
        Extreme: "Экстремальный",
    },
    countries: {
        RU: "РОССИЯ",
        US: "США",
        DE: "ГЕРМАНИЯ",
        CN: "КИТАЙ",
        GB: "ВЕЛИКОБРИТАНИЯ",
        FR: "ФРАНЦИЯ",
        IT: "ИТАЛИЯ",
        PL: "ПОЛЬША"
    },
    icons: {
        Fighter: "ИСТРЕБИТЕЛЬ",
        Bomber: "БОМБАРДИРОВЩИК",
        AWACS: "ДРЛО",
        UAV: "БПЛА",
        SAM: "ЗРК",
        MBT: "ОБТ",
        IFV: "БМП",
        SPG: "САУ",
        Support: "ПОДДЕРЖКА"
    }
};

export type TranslationKey = typeof TRANSLATIONS;
