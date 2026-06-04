export type Side = 'NATO' | 'RUS' | 'CHINA';
export type Category = 'aircraft' | 'air_defense' | 'ground';
export type Country = 'RU' | 'US' | 'DE' | 'CN' | 'GB' | 'FR' | 'IT' | 'PL';
export type IconType = 'Fighter' | 'Bomber' | 'AWACS' | 'UAV' | 'SAM' | 'MBT' | 'IFV' | 'SPG' | 'Support';

export type ModuleType = 'era' | 'aps' | 'stealth' | 'beast';

export interface UnitInfo {
    name: string;
    side: Side;
    country: Country;
    iconType: IconType;
    potential: number;
    category: Category;
    displayName: string;
    costMillionUSD?: number;
    stats?: ParametricStats;
    activeModules?: ModuleType[];
}

export interface GroundStats {
    type: 'ground';
    powerHP: number;
    weightTons: number;
    armorRHA: number;
    gunCaliber: number;
    penetration: number;
    techLevel: number;
}

export interface AirStats {
    type: 'aircraft';
    thrustKgf: number;
    weightEmpty: number;
    maxSpeedMach: number;
    rcs: number; // radar cross section in m2
    missileRangeKm: number;
    techLevel: number;
}

export interface AirDefenseStats {
    type: 'air_defense';
    radarRangeKm: number;
    interceptRangeKm: number;
    missileSpeedMach: number;
    targetChannels: number;
    deployTimeMin: number;
    techLevel: number;
}

export type ParametricStats = GroundStats | AirStats | AirDefenseStats;

export function calculateCustomPotential(stats?: ParametricStats, modules?: ModuleType[]): number {
    if (!stats) return 1.0;
    if (stats.type === 'ground') return calculateGroundPotential(stats, modules);
    if (stats.type === 'aircraft') return calculateAirPotential(stats, modules);
    if (stats.type === 'air_defense') return calculateADPotential(stats, modules);
    return 1.0;
}

export function calculateGroundPotential(stats: GroundStats, modules: ModuleType[] = []): number {
    const ptw = stats.powerHP / Math.max(1, stats.weightTons);
    // Baseline upgraded from 23 to 25 hp/t
    const mobilityFactor = Math.min(10, (ptw / 25) * 7);
    // Baseline upgraded from 800 to 900 RHA
    const armorFactor = Math.min(10, (stats.armorRHA / 900) * 8);
    // Baseline upgraded from 120mm/700mm to 130mm/850mm
    const firepowerFactor = Math.min(10, ((stats.gunCaliber / 130) * 7 * 0.4) + ((stats.penetration / 850) * 8 * 0.6));
    const techFactor = Math.max(1, Math.min(10, stats.techLevel));

    let basePotential = (firepowerFactor * 0.4 + armorFactor * 0.2 + mobilityFactor * 0.2 + techFactor * 0.2) / 2;
    if (modules.includes('aps')) basePotential *= 1.1; // APS gives overall survivability boost
    return Number(basePotential.toFixed(2));
}

export function calculateAirPotential(stats: AirStats, modules: ModuleType[] = []): number {
    const twr = stats.thrustKgf / (Math.max(1, stats.weightEmpty) * 1000);
    // Baseline upgraded from 1.2 to 1.3 TWR, speed from 2.0 to 2.2
    const mobility = Math.min(10, (twr / 1.3) * 5 + (stats.maxSpeedMach / 2.2) * 3);
    const rcsFactor = Math.max(1, Math.min(10, 5 - Math.log10(stats.rcs + 0.0001)));
    // Baseline upgraded from 150km to 200km range
    const firepower = Math.min(10, (stats.missileRangeKm / 200) * 7);
    const techFactor = Math.max(1, Math.min(10, stats.techLevel));
    return Number(((firepower * 0.3 + mobility * 0.3 + rcsFactor * 0.2 + techFactor * 0.2) / 2.5).toFixed(2));
}

export function calculateADPotential(stats: AirDefenseStats, modules: ModuleType[] = []): number {
    // Baseline upgraded ranges 400->500, 200->300
    const rangeFactor = Math.min(10, (stats.radarRangeKm / 500) * 4 + (stats.interceptRangeKm / 300) * 4);
    // Baseline upgraded speed 6->8, channels 6->10
    const killFactor = Math.min(10, (stats.missileSpeedMach / 8) * 5 + (stats.targetChannels / 10) * 4);
    // Baseline deployed time 15->10 mins
    const deployFactor = Math.max(1, Math.min(10, 10 / Math.max(0.1, stats.deployTimeMin) * 3));
    const techFactor = Math.max(1, Math.min(10, stats.techLevel));
    return Number(((rangeFactor * 0.3 + killFactor * 0.4 + deployFactor * 0.1 + techFactor * 0.2) / 2).toFixed(2));
}

export function applyModulesToUnit(unit: UnitInfo, modules: ModuleType[]): UnitInfo {
    if (!unit.stats) return { ...unit, activeModules: modules };

    // Deep clone stats so we don't mutate the original DB
    let newStats = JSON.parse(JSON.stringify(unit.stats)) as ParametricStats;

    if (newStats.type === 'ground') {
        if (modules.includes('era')) newStats.armorRHA *= 1.3;
    } else if (newStats.type === 'aircraft') {
        if (modules.includes('stealth')) {
            newStats.rcs *= 0.2;
            newStats.missileRangeKm *= 0.8;
        }
        if (modules.includes('beast')) {
            newStats.rcs *= 5.0;
            newStats.missileRangeKm *= 1.3;
        }
    }

    return {
        ...unit,
        stats: newStats,
        activeModules: modules,
        potential: calculateCustomPotential(newStats, modules)
    };
}

export function getRadarFactors(unit: UnitInfo): Record<string, number> {
    const stats = unit.stats;
    const modules = unit.activeModules || [];
    // Default fallback
    if (!stats) return { 'Огневая мощь': 5, 'Выживаемость': 5, 'Подвижность': 5, 'Сенсоры/Дальность': 5, 'Технологии': unit.potential };

    if (stats.type === 'ground') {
        const ptw = stats.powerHP / Math.max(1, stats.weightTons);
        const mobilityFactor = Math.min(10, (ptw / 25) * 10);
        const armorFactor = Math.min(10, (stats.armorRHA / 900) * 10);
        const firepowerFactor = Math.min(10, ((stats.gunCaliber / 130) * 5) + ((stats.penetration / 850) * 5));
        const range = Math.min(10, (stats.gunCaliber / 130) * 10);
        const techFactor = Math.max(1, Math.min(10, stats.techLevel));

        let surv = armorFactor;
        if (modules.includes('aps')) surv = Math.min(10, surv * 1.2);

        return {
            'Огневая мощь': Number(firepowerFactor.toFixed(1)),
            'Выживаемость': Number(surv.toFixed(1)),
            'Подвижность': Number(mobilityFactor.toFixed(1)),
            'Сенсоры/Дальность': Number(range.toFixed(1)),
            'Технологии': Number(techFactor.toFixed(1))
        };
    }

    if (stats.type === 'aircraft') {
        const twr = stats.thrustKgf / (Math.max(1, stats.weightEmpty) * 1000);
        const mobility = Math.min(10, (twr / 1.3) * 5 + (stats.maxSpeedMach / 2.2) * 5);
        let surv = Math.max(1, Math.min(10, 5 - Math.log10(stats.rcs + 0.0001)));
        if (modules.includes('stealth')) surv = Math.min(10, surv * 1.2);

        const firepower = Math.min(10, (stats.missileRangeKm / 200) * 10);
        const range = Math.min(10, (stats.missileRangeKm / 200) * 10);
        const techFactor = Math.max(1, Math.min(10, stats.techLevel));

        return {
            'Огневая мощь': Number(firepower.toFixed(1)),
            'Выживаемость': Number(surv.toFixed(1)),
            'Подвижность': Number(mobility.toFixed(1)),
            'Сенсоры/Дальность': Number(range.toFixed(1)),
            'Технологии': Number(techFactor.toFixed(1))
        };
    }

    if (stats.type === 'air_defense') {
        const firepower = Math.min(10, (stats.targetChannels / 10) * 10);
        const surv = Math.max(1, Math.min(10, 10 / Math.max(0.1, stats.deployTimeMin) * 3));
        const mobility = Math.min(10, (stats.missileSpeedMach / 8) * 10);
        const range = Math.min(10, (stats.radarRangeKm / 500) * 10);
        const techFactor = Math.max(1, Math.min(10, stats.techLevel));

        return {
            'Огневая мощь': Number(firepower.toFixed(1)),
            'Выживаемость': Number(surv.toFixed(1)),
            'Подвижность': Number(mobility.toFixed(1)),
            'Сенсоры/Дальность': Number(range.toFixed(1)),
            'Технологии': Number(techFactor.toFixed(1))
        };
    }

    return {};
}

const rawArsenal: Omit<UnitInfo, 'potential'>[] = [
    // RUSSIA - AIRCRAFT
    { name: "Su-57 Felon", side: "RUS", country: "RU", iconType: "Fighter", category: "aircraft", displayName: "Су-57", costMillionUSD: 40, stats: { type: 'aircraft', thrustKgf: 29000, weightEmpty: 18, maxSpeedMach: 2.0, rcs: 0.5, missileRangeKm: 200, techLevel: 8 } },
    { name: "Su-35S Flanker-E", side: "RUS", country: "RU", iconType: "Fighter", category: "aircraft", displayName: "Су-35С", costMillionUSD: 85, stats: { type: 'aircraft', thrustKgf: 29000, weightEmpty: 19, maxSpeedMach: 2.25, rcs: 2.0, missileRangeKm: 200, techLevel: 7 } },
    { name: "Su-34M Fullback", side: "RUS", country: "RU", iconType: "Bomber", category: "aircraft", displayName: "Су-34М 'Утёнок'", costMillionUSD: 36, stats: { type: 'aircraft', thrustKgf: 27000, weightEmpty: 22, maxSpeedMach: 1.8, rcs: 3.0, missileRangeKm: 150, techLevel: 6 } },
    { name: "Tu-160M Blackjack", side: "RUS", country: "RU", iconType: "Bomber", category: "aircraft", displayName: "Ту-160М 'Белый лебедь'", costMillionUSD: 250, stats: { type: 'aircraft', thrustKgf: 100000, weightEmpty: 110, maxSpeedMach: 2.05, rcs: 15.0, missileRangeKm: 3000, techLevel: 7 } },
    { name: "Ka-52 Alligator", side: "RUS", country: "RU", iconType: "Support", category: "aircraft", displayName: "Ка-52 'Аллигатор'", costMillionUSD: 16, stats: { type: 'aircraft', thrustKgf: 5000, weightEmpty: 7.7, maxSpeedMach: 0.3, rcs: 2.0, missileRangeKm: 15, techLevel: 7 } },
    { name: "A-100 Premier", side: "RUS", country: "RU", iconType: "AWACS", category: "aircraft", displayName: "А-100 'Премьер'", costMillionUSD: 300, stats: { type: 'aircraft', thrustKgf: 48000, weightEmpty: 90, maxSpeedMach: 0.8, rcs: 20.0, missileRangeKm: 0, techLevel: 9 } },
    { name: "Orion UAV", side: "RUS", country: "RU", iconType: "UAV", category: "aircraft", displayName: "Иноходец (Орион)", costMillionUSD: 3, stats: { type: 'aircraft', thrustKgf: 115, weightEmpty: 1.0, maxSpeedMach: 0.1, rcs: 1.0, missileRangeKm: 8, techLevel: 5 } },

    // RUSSIA - AIR DEFENSE
    { name: "S-500 Prometheus", side: "RUS", country: "RU", iconType: "SAM", category: "air_defense", displayName: "С-500 'Прометей'", costMillionUSD: 600, stats: { type: 'air_defense', radarRangeKm: 800, interceptRangeKm: 600, missileSpeedMach: 15, targetChannels: 10, deployTimeMin: 10, techLevel: 9 } },
    { name: "S-400 Triumf", side: "RUS", country: "RU", iconType: "SAM", category: "air_defense", displayName: "С-400 'Триумф'", costMillionUSD: 500, stats: { type: 'air_defense', radarRangeKm: 600, interceptRangeKm: 400, missileSpeedMach: 14, targetChannels: 36, deployTimeMin: 5, techLevel: 8 } },
    { name: "Buk-M3", side: "RUS", country: "RU", iconType: "SAM", category: "air_defense", displayName: "Бук-М3", costMillionUSD: 80, stats: { type: 'air_defense', radarRangeKm: 120, interceptRangeKm: 70, missileSpeedMach: 4.5, targetChannels: 36, deployTimeMin: 5, techLevel: 7 } },
    { name: "Pantsir-S1", side: "RUS", country: "RU", iconType: "SAM", category: "air_defense", displayName: "Панцирь-С1", costMillionUSD: 14, stats: { type: 'air_defense', radarRangeKm: 36, interceptRangeKm: 20, missileSpeedMach: 3.8, targetChannels: 4, deployTimeMin: 5, techLevel: 6 } },

    // RUSSIA - GROUND
    { name: "T-14 Armata", side: "RUS", country: "RU", iconType: "MBT", category: "ground", displayName: "Т-14 'Армата'", costMillionUSD: 3.7, stats: { type: 'ground', powerHP: 1500, weightTons: 55, armorRHA: 1000, gunCaliber: 125, penetration: 800, techLevel: 9 } },
    { name: "T-90M Proryv", side: "RUS", country: "RU", iconType: "MBT", category: "ground", displayName: "Т-90М 'Прорыв'", costMillionUSD: 4.5, stats: { type: 'ground', powerHP: 1130, weightTons: 48, armorRHA: 850, gunCaliber: 125, penetration: 750, techLevel: 8 } },
    { name: "T-80BVM", side: "RUS", country: "RU", iconType: "MBT", category: "ground", displayName: "Т-80БВМ", costMillionUSD: 3.0, stats: { type: 'ground', powerHP: 1250, weightTons: 46, armorRHA: 800, gunCaliber: 125, penetration: 650, techLevel: 7 } },
    { name: "BMP-3M", side: "RUS", country: "RU", iconType: "IFV", category: "ground", displayName: "БМП-3М", costMillionUSD: 2.1, stats: { type: 'ground', powerHP: 500, weightTons: 18.7, armorRHA: 50, gunCaliber: 100, penetration: 250, techLevel: 6 } },
    { name: "Kurganets-25", side: "RUS", country: "RU", iconType: "IFV", category: "ground", displayName: "Курганец-25", costMillionUSD: 4.0, stats: { type: 'ground', powerHP: 800, weightTons: 25, armorRHA: 100, gunCaliber: 30, penetration: 100, techLevel: 8 } },
    { name: "2S35 Koalitsiya-SV", side: "RUS", country: "RU", iconType: "SPG", category: "ground", displayName: "2С35 'Коалиция-СВ'", costMillionUSD: 6.0, stats: { type: 'ground', powerHP: 1000, weightTons: 48, armorRHA: 100, gunCaliber: 152, penetration: 200, techLevel: 8 } },
    { name: "TOS-1A Solntsepyok", side: "RUS", country: "RU", iconType: "SPG", category: "ground", displayName: "ТОС-1А 'Солнцепек'", costMillionUSD: 6.5, stats: { type: 'ground', powerHP: 840, weightTons: 45.3, armorRHA: 150, gunCaliber: 220, penetration: 100, techLevel: 5 } },
    { name: "BMPT Terminator", side: "RUS", country: "RU", iconType: "IFV", category: "ground", displayName: "БМПТ 'Терминатор'", costMillionUSD: 2.5, stats: { type: 'ground', powerHP: 1000, weightTons: 48, armorRHA: 800, gunCaliber: 30, penetration: 100, techLevel: 7 } },

    // NATO - AIRCRAFT
    { name: "F-35A Lightning II", side: "NATO", country: "US", iconType: "Fighter", category: "aircraft", displayName: "F-35A 'Лайтнинг II'", costMillionUSD: 82.5, stats: { type: 'aircraft', thrustKgf: 19500, weightEmpty: 13.2, maxSpeedMach: 1.6, rcs: 0.0015, missileRangeKm: 120, techLevel: 10 } },
    { name: "F-22 Raptor", side: "NATO", country: "US", iconType: "Fighter", category: "aircraft", displayName: "F-22 'Раптор'", costMillionUSD: 143, stats: { type: 'aircraft', thrustKgf: 31000, weightEmpty: 19.7, maxSpeedMach: 2.25, rcs: 0.0001, missileRangeKm: 160, techLevel: 9 } },
    { name: "F-15EX Eagle II", side: "NATO", country: "US", iconType: "Fighter", category: "aircraft", displayName: "F-15EX 'Игл II'", costMillionUSD: 87.7, stats: { type: 'aircraft', thrustKgf: 58000, weightEmpty: 14.5, maxSpeedMach: 2.5, rcs: 5.0, missileRangeKm: 160, techLevel: 9 } },
    { name: "B-21 Raider", side: "NATO", country: "US", iconType: "Bomber", category: "aircraft", displayName: "B-21 'Рейдер'", costMillionUSD: 700, stats: { type: 'aircraft', thrustKgf: 40000, weightEmpty: 45, maxSpeedMach: 0.8, rcs: 0.00001, missileRangeKm: 2000, techLevel: 10 } },
    { name: "AH-64E Apache", side: "NATO", country: "US", iconType: "Support", category: "aircraft", displayName: "AH-64E 'Апач'", costMillionUSD: 33, stats: { type: 'aircraft', thrustKgf: 4000, weightEmpty: 5.16, maxSpeedMach: 0.3, rcs: 2.0, missileRangeKm: 12, techLevel: 8 } },
    { name: "Eurofighter Typhoon", side: "NATO", country: "DE", iconType: "Fighter", category: "aircraft", displayName: "Еврофайтер 'Тайфун'", costMillionUSD: 125, stats: { type: 'aircraft', thrustKgf: 18000, weightEmpty: 11, maxSpeedMach: 2.0, rcs: 0.5, missileRangeKm: 150, techLevel: 8 } },
    { name: "E-3 Sentry", side: "NATO", country: "US", iconType: "AWACS", category: "aircraft", displayName: "E-3 'Сентри'", costMillionUSD: 270, stats: { type: 'aircraft', thrustKgf: 40000, weightEmpty: 80, maxSpeedMach: 0.8, rcs: 25.0, missileRangeKm: 0, techLevel: 8 } },
    { name: "MQ-9 Reaper", side: "NATO", country: "US", iconType: "UAV", category: "aircraft", displayName: "MQ-9 'Рипер'", costMillionUSD: 16, stats: { type: 'aircraft', thrustKgf: 900, weightEmpty: 2.2, maxSpeedMach: 0.4, rcs: 0.1, missileRangeKm: 10, techLevel: 7 } },

    // NATO - AIR DEFENSE
    { name: "MIM-104 Patriot", side: "NATO", country: "US", iconType: "SAM", category: "air_defense", displayName: "PAC-3 'Пэтриот'", costMillionUSD: 1090, stats: { type: 'air_defense', radarRangeKm: 150, interceptRangeKm: 100, missileSpeedMach: 5, targetChannels: 8, deployTimeMin: 30, techLevel: 8 } },
    { name: "SAMP/T", side: "NATO", country: "FR", iconType: "SAM", category: "air_defense", displayName: "SAMP/T Mamba", costMillionUSD: 500, stats: { type: 'air_defense', radarRangeKm: 120, interceptRangeKm: 120, missileSpeedMach: 4.5, targetChannels: 10, deployTimeMin: 15, techLevel: 8 } },
    { name: "NASAMS", side: "NATO", country: "US", iconType: "SAM", category: "air_defense", displayName: "NASAMS 3", costMillionUSD: 120, stats: { type: 'air_defense', radarRangeKm: 120, interceptRangeKm: 50, missileSpeedMach: 4, targetChannels: 72, deployTimeMin: 15, techLevel: 7 } },

    // NATO - GROUND
    { name: "AbramsX", side: "NATO", country: "US", iconType: "MBT", category: "ground", displayName: "M1 'AbramsX'", costMillionUSD: 15, stats: { type: 'ground', powerHP: 1500, weightTons: 49, armorRHA: 950, gunCaliber: 120, penetration: 820, techLevel: 10 } },
    { name: "M1A2 SEPv3 Abrams", side: "NATO", country: "US", iconType: "MBT", category: "ground", displayName: "M1A2 'Абрамс'", costMillionUSD: 10, stats: { type: 'ground', powerHP: 1500, weightTons: 66.8, armorRHA: 900, gunCaliber: 120, penetration: 800, techLevel: 8 } },
    { name: "Leopard 2A8", side: "NATO", country: "DE", iconType: "MBT", category: "ground", displayName: "Leopard 2A8", costMillionUSD: 30, stats: { type: 'ground', powerHP: 1500, weightTons: 65, armorRHA: 900, gunCaliber: 120, penetration: 800, techLevel: 9 } },
    { name: "Challenger 3", side: "NATO", country: "GB", iconType: "MBT", category: "ground", displayName: "Челленджер 3", costMillionUSD: 9, stats: { type: 'ground', powerHP: 1500, weightTons: 66, armorRHA: 950, gunCaliber: 120, penetration: 800, techLevel: 9 } },
    { name: "M2A4 Bradley", side: "NATO", country: "US", iconType: "IFV", category: "ground", displayName: "M2A4 'Брэдли'", costMillionUSD: 3.2, stats: { type: 'ground', powerHP: 675, weightTons: 36, armorRHA: 150, gunCaliber: 25, penetration: 150, techLevel: 8 } },
    { name: "CV90 MkIV", side: "NATO", country: "DE", iconType: "IFV", category: "ground", displayName: "CV90 MkIV", costMillionUSD: 5, stats: { type: 'ground', powerHP: 1000, weightTons: 38, armorRHA: 200, gunCaliber: 35, penetration: 180, techLevel: 8 } },
    { name: "PzH 2000", side: "NATO", country: "DE", iconType: "SPG", category: "ground", displayName: "PzH 2000", costMillionUSD: 17, stats: { type: 'ground', powerHP: 1000, weightTons: 55.8, armorRHA: 100, gunCaliber: 155, penetration: 250, techLevel: 8 } },
    { name: "M109A7 Paladin", side: "NATO", country: "US", iconType: "SPG", category: "ground", displayName: "M109A7 'Паладин'", costMillionUSD: 14.4, stats: { type: 'ground', powerHP: 675, weightTons: 35, armorRHA: 50, gunCaliber: 155, penetration: 200, techLevel: 7 } },

    // CHINA
    { name: "J-20 Mighty Dragon", side: "CHINA", country: "CN", iconType: "Fighter", category: "aircraft", displayName: "J-20 'Могучий Дракон'", costMillionUSD: 110, stats: { type: 'aircraft', thrustKgf: 29000, weightEmpty: 19.3, maxSpeedMach: 2.0, rcs: 0.05, missileRangeKm: 200, techLevel: 8 } },
    { name: "H-20 Stealth Bomber", side: "CHINA", country: "CN", iconType: "Bomber", category: "aircraft", displayName: "H-20 'Стелс-бомбардировщик'", costMillionUSD: 500, stats: { type: 'aircraft', thrustKgf: 40000, weightEmpty: 50, maxSpeedMach: 0.8, rcs: 0.001, missileRangeKm: 2000, techLevel: 9 } },
    { name: "KJ-2000", side: "CHINA", country: "CN", iconType: "AWACS", category: "aircraft", displayName: "KJ-2000 Mainring", costMillionUSD: 230, stats: { type: 'aircraft', thrustKgf: 48000, weightEmpty: 85, maxSpeedMach: 0.8, rcs: 20.0, missileRangeKm: 0, techLevel: 7 } },
    { name: "HQ-9B", side: "CHINA", country: "CN", iconType: "SAM", category: "air_defense", displayName: "HQ-9B ПВО", costMillionUSD: 200, stats: { type: 'air_defense', radarRangeKm: 300, interceptRangeKm: 250, missileSpeedMach: 6, targetChannels: 8, deployTimeMin: 15, techLevel: 8 } },
    { name: "HQ-22", side: "CHINA", country: "CN", iconType: "SAM", category: "air_defense", displayName: "HQ-22 ПВО", costMillionUSD: 100, stats: { type: 'air_defense', radarRangeKm: 250, interceptRangeKm: 170, missileSpeedMach: 5, targetChannels: 6, deployTimeMin: 15, techLevel: 7 } },
    { name: "Type 99A", side: "CHINA", country: "CN", iconType: "MBT", category: "ground", displayName: "Тип 99A Танк", costMillionUSD: 2.6, stats: { type: 'ground', powerHP: 1500, weightTons: 55, armorRHA: 850, gunCaliber: 125, penetration: 700, techLevel: 8 } },
    { name: "ZBD-04A", side: "CHINA", country: "CN", iconType: "IFV", category: "ground", displayName: "ZBD-04A БМП", costMillionUSD: 2.0, stats: { type: 'ground', powerHP: 600, weightTons: 24, armorRHA: 100, gunCaliber: 100, penetration: 250, techLevel: 7 } },
    { name: "PLZ-05", side: "CHINA", country: "CN", iconType: "SPG", category: "ground", displayName: "PLZ-05 САУ", costMillionUSD: 4.5, stats: { type: 'ground', powerHP: 800, weightTons: 35, armorRHA: 100, gunCaliber: 155, penetration: 200, techLevel: 7 } }
];

export const ARSENAL: Record<string, UnitInfo> = {};
rawArsenal.forEach(u => {
    ARSENAL[u.name] = { ...u, activeModules: [], potential: calculateCustomPotential(u.stats, []) };
});

export const MODIFIERS = {
    weather: {
        "Clear": 1.0,
        "Rainy": 0.8,
        "Cloudy": 0.9,
        "Foggy": 0.7,
        "Storm": 0.5
    },
    ew: {
        "None": 1.0,
        "Low": 0.9,
        "High": 0.6,
        "Extreme": 0.3
    }
};

/**
 * Advanced Mathematical Model (Monte Carlo Simulation)
 * Returns the probability of Unit A defeating Unit B in a 1-on-1 engagement
 * Runs 1000 simulated iterations injecting RNG into hit, detection, and penetration logic.
 */
export function simulateEngagement(unitA: UnitInfo, unitB: UnitInfo, iterations: number = 1000): {
    winProbA: number;
    winProbB: number;
    mutualDestruction: number;
} {
    let winsA = 0;
    let winsB = 0;
    let mutualDestruction = 0;

    for (let i = 0; i < iterations; i++) {
        // Simple stochastic model using their normalized potentials as base P(hit) factors
        const pHitA = Math.min(0.95, Math.max(0.1, (unitA.potential / 10) * (0.8 + Math.random() * 0.4)));
        const pHitB = Math.min(0.95, Math.max(0.1, (unitB.potential / 10) * (0.8 + Math.random() * 0.4)));

        // Factor in KAZ/APS
        let aSurvivesAPS = unitA.activeModules?.includes('aps') ? (Math.random() < 0.6) : false; // 60% intercept chance
        let bSurvivesAPS = unitB.activeModules?.includes('aps') ? (Math.random() < 0.6) : false;

        const aHitLanded = Math.random() < pHitA && !bSurvivesAPS;
        const bHitLanded = Math.random() < pHitB && !aSurvivesAPS;

        if (aHitLanded && !bHitLanded) {
            winsA++;
        } else if (bHitLanded && !aHitLanded) {
            winsB++;
        } else if (aHitLanded && bHitLanded) {
            mutualDestruction++;
        } else {
            // Missed both, standard RNG decides by potential diff
            if (Math.random() < (unitA.potential / (unitA.potential + unitB.potential))) {
                winsA++;
            } else {
                winsB++;
            }
        }
    }

    return {
        winProbA: (winsA / iterations) * 100,
        winProbB: (winsB / iterations) * 100,
        mutualDestruction: (mutualDestruction / iterations) * 100
    };
}
