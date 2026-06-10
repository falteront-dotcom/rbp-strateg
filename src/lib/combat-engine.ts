import { UnitInfo, GroundStats, AirStats, AirDefenseStats } from './unit-database';

// ============================================================================
// Новые боевые параметры (добавлены в Phase 1)
// ============================================================================

export interface CombatCapabilities {
  // ... (keep existing fields)
  /// Detection
  detectionRangeKm: number;
  identificationTimeSec: number;
  
  // Shooting
  maxRangeKm: number;
  effectiveRangeKm: number;
  reactionTimeSec: number;
  aimingTimeSec: number;
  
  // Accuracy
  accuracyAtMax: number;
  accuracyAtEffective: number;
  
  // Penetration - Simulation Grade
  penetrationAt1km: number;       // Base penetration in mm RHA
  penetrationDropPerKm: number;   // Linear drop for simplicity in distance calc
  shellMassKg: number;            // Mass for De Marre/Lanz-Odermatt
  shellDiameterMm: number;        // Diameter for De Marre/Lanz-Odermatt
  shellType: 'AP' | 'APBC' | 'HEAT' | 'HE';
  
  // Protection
  kazInterceptProbability: number;
  eraCoverage: number;
  
  // Logistics
  ammoCapacity: number;
  fireRateRpm: number;
}

/**
 * Генерирует боевые способности юнита на основе его базовых характеристик
 */
export function getCombatCapabilities(unit: UnitInfo): CombatCapabilities {
    const stats = unit.stats;
    const modules = unit.activeModules || [];
    
    // Базовые значения по умолчанию
    const caps: CombatCapabilities = {
        detectionRangeKm: 10,
        identificationTimeSec: 5,
        maxRangeKm: 5,
        effectiveRangeKm: 3,
        reactionTimeSec: 2,
        aimingTimeSec: 3,
        accuracyAtMax: 0.2,
        accuracyAtEffective: 0.8,
        penetrationAt1km: 500,
        penetrationDropPerKm: 50,
        kazInterceptProbability: 0,
        eraCoverage: 0,
        ammoCapacity: 40,
        fireRateRpm: 4,
        shellMassKg: 5,
        shellDiameterMm: 120,
        shellType: 'AP'
    };

    if (!stats) return caps;

    if (stats.type === 'ground') {
        const g = stats as GroundStats;
        caps.maxRangeKm = g.gunCaliber / 10;
        caps.effectiveRangeKm = caps.maxRangeKm * 0.7;
        caps.penetrationAt1km = g.penetration;
        caps.penetrationDropPerKm = 40;
        caps.shellMassKg = 10; // Default for ground
        caps.shellDiameterMm = g.gunCaliber;
        caps.shellType = 'APBC';
        caps.detectionRangeKm = g.techLevel * 2;
        caps.identificationTimeSec = Math.max(1, 6 - g.techLevel);
        if (modules.includes('aps')) caps.kazInterceptProbability = 0.6;
        if (modules.includes('era')) caps.eraCoverage = 0.8;
    } else if (stats.type === 'aircraft') {
        const a = stats as AirStats;
        caps.maxRangeKm = a.missileRangeKm;
        caps.effectiveRangeKm = caps.maxRangeKm * 0.8;
        caps.penetrationAt1km = 600; // Missile penetration
        caps.penetrationDropPerKm = 10;
        caps.shellMassKg = 5;
        caps.shellDiameterMm = 120;
        caps.shellType = 'AP';
        caps.detectionRangeKm = a.rcs < 0.1 ? 100 : 50;
        caps.identificationTimeSec = Math.max(0.5, 3 - (a.techLevel / 3));
        caps.reactionTimeSec = 1;
        caps.aimingTimeSec = 2;
    } else if (stats.type === 'air_defense') {
        const ad = stats as AirDefenseStats;
        caps.maxRangeKm = ad.interceptRangeKm;
        caps.effectiveRangeKm = caps.maxRangeKm * 0.7;
        caps.detectionRangeKm = ad.radarRangeKm;
        caps.identificationTimeSec = 2;
        caps.reactionTimeSec = 1;
        caps.shellMassKg = 2;
        caps.shellDiameterMm = 80;
        caps.shellType = 'AP';
    }

    return caps;
}

// ============================================================================
// Simulation-Grade Ballistics Utilities
// ============================================================================

/**
 * Calculates effective armor thickness based on impact angle.
 * Formula: Teff = Tnom / cos(theta)
 */
function calculateEffectiveThickness(nominalThickness: number, angleDeg: number): number {
  const angleRad = (angleDeg * Math.PI) / 180;
  return nominalThickness / Math.cos(angleRad);
}

/**
 * Calculates normalized angle for APBC shells (cap effect).
 */
function calculateNormalizedAngle(angleDeg: number, shellType: string): number {
  const normalization = shellType === 'APBC' ? 5.0 : 0.0;
  return Math.max(0, angleDeg - normalization);
}

/**
 * Probabilistic ricochet check.
 */
function checkRicochet(angleDeg: number, shellType: string): boolean {
  const critAngle = shellType === 'APBC' ? 70.0 : 65.0;
  if (angleDeg < critAngle - 10) return false;
  if (angleDeg > critAngle + 10) return true;
  
  const prob = (angleDeg - (critAngle - 10)) / 20.0;
  return Math.random() < prob;
}


// ============================================================================
// Формулы баллистики
// ============================================================================

/**
 * Расчёт дальности обнаружения с учётом ЭПР и условий
 */
export function calculateDetectionRange(
  baseRangeKm: number,
  targetRCS: number,              // ЭПР цели (м²)
  weatherFactor: number = 1.0,    // Погода (1.0 = ясно, 0.5 = туман)
  ewFactor: number = 1.0          // РЭБ (1.0 = нет, 0.3 = сильное)
): number {
  // Упрощённая формула: чем больше ЭПР, тем дальше видно
  // RCS 1 м² = базовая дальность, каждое ×10 = ×2 дальность
  const rcsFactor = Math.sqrt(Math.max(0.001, targetRCS));
  return baseRangeKm * rcsFactor * weatherFactor * ewFactor;
}

/**
 * Время полёта снаряда/ракеты
 */
export function calculateFlightTime(
  distanceKm: number,
  projectileSpeedMps: number      // Скорость снаряда (м/с)
): number {
  // distance в метрах / скорость = время в секундах
  return (distanceKm * 1000) / projectileSpeedMps;
}

/**
 * Точность стрельбы на заданной дистанции (гауссова деградация)
 */
export function calculateAccuracy(
  distanceKm: number,
  effectiveRangeKm: number,
  maxRangeKm: number,
  accuracyAtEffective: number
): number {
  if (distanceKm > maxRangeKm) return 0;
  if (distanceKm <= effectiveRangeKm) {
    // Линейная интерполяция от 100% (0км) до accuracyAtEffective
    const t = distanceKm / effectiveRangeKm;
    return 1.0 - t * (1.0 - accuracyAtEffective);
  }
  // За effectiveRange — резкое падение
  const beyondEffective = distanceKm - effectiveRangeKm;
  const beyondRange = maxRangeKm - effectiveRangeKm;
  const t = beyondEffective / beyondRange;
  return accuracyAtEffective * (1.0 - t);
}

/**
 * Пробитие брони на заданной дистанции
 */
export function calculatePenetration(
  distanceKm: number,
  penetrationAt1km: number,
  penetrationDropPerKm: number
): number {
  return Math.max(0, penetrationAt1km - penetrationDropPerKm * (distanceKm - 1));
}

/**
 * Вероятность пробития (при попадании) - Simulation Grade
 */
export function calculatePenetrationProbability(
  penetrationMm: number,
  armorRHA: number,
  eraCoverage: number = 0,        // Покрытие ДЗ
  eraEffectiveness: number = 0.3, // Эффективность ДЗ
  impactAngleDeg: number = 0,     // Угол встречи (0 = перпендикулярно)
  shellType: string = 'AP'        // Тип снаряда
): number {
  // 1. Check Ricochet
  if (checkRicochet(impactAngleDeg, shellType)) return 0;

  // 2. Normalization & Effective Thickness
  const normAngle = calculateNormalizedAngle(impactAngleDeg, shellType);
  const effectiveArmor = calculateEffectiveThickness(armorRHA, normAngle);
  
  // 3. Base probability
  let baseProb = Math.min(1.0, penetrationMm / Math.max(1, effectiveArmor));
  
  // 4. ERA mitigation
  if (eraCoverage > 0) {
    baseProb *= (1.0 - eraCoverage * eraEffectiveness);
  }
  
  return Math.max(0, baseProb);
}

// ============================================================================
// Полная модель боевого столкновения
// ============================================================================

export interface EngagementResult {
  distanceKm: number;
  
  // Фаза 1: Обнаружение
  detectionRangeA: number;
  detectionRangeB: number;
  firstToDetect: 'A' | 'B' | 'simultaneous';
  
  // Фаза 2: Первый выстрел
  firstShotBy: 'A' | 'B' | 'simultaneous';
  timeToFirstShotSec: number;
  
  // Фаза 3: Попадание и пробитие
  hitProbabilityA: number;        // Вероятность попадания A
  hitProbabilityB: number;
  penetrateProbabilityA: number;  // Вероятность пробития при попадании A
  penetrateProbabilityB: number;
  
  // Итоговая вероятность уничтожения за выстрел
  killProbabilityA: number;
  killProbabilityB: number;
  
  // Моделирование очереди выстрелов
  expectedShotsToKillA: number;   // Среднее число выстрелов до уничтожения A
  expectedShotsToKillB: number;
  
  // Результат
  winProbabilityA: number;        // Вероятность победы A
  winProbabilityB: number;
  mutualDestruction: number;
}

/**
 * Расчёт боевого столкновения на заданной дистанции
 */
export function simulateEngagementAtDistance(
  unitA: UnitInfo,
  unitB: UnitInfo,
  distanceKm: number,
  combatA: CombatCapabilities,
  combatB: CombatCapabilities,
  weatherFactor: number = 1.0,
  ewFactor: number = 1.0,
  iterations: number = 1000
): EngagementResult {
  const simulationConfidence = Math.max(0.2, Math.min(1, iterations / 1000));
  // Обнаружение
  const rcsA = unitA.stats?.type === 'aircraft' ? (unitA.stats as AirStats).rcs : 
               unitA.stats?.type === 'ground' ? 10 : 5; // Наземные ≈ 10 м²
  const rcsB = unitB.stats?.type === 'aircraft' ? (unitB.stats as AirStats).rcs : 
               unitB.stats?.type === 'ground' ? 10 : 5;
  
  const detA = calculateDetectionRange(combatA.detectionRangeKm, rcsB, weatherFactor, ewFactor);
  const detB = calculateDetectionRange(combatB.detectionRangeKm, rcsA, weatherFactor, ewFactor);
  
  const canADetect = distanceKm <= detA;
  const canBDetect = distanceKm <= detB;
  
  // Время до первого выстрела
  const timeToShotA = canADetect ? combatA.identificationTimeSec + combatA.reactionTimeSec + combatA.aimingTimeSec : Infinity;
  const timeToShotB = canBDetect ? combatB.identificationTimeSec + combatB.reactionTimeSec + combatB.aimingTimeSec : Infinity;
  
  const firstShotBy = timeToShotA < timeToShotB ? 'A' : timeToShotB < timeToShotA ? 'B' : 
                      canADetect && canBDetect ? 'simultaneous' : canADetect ? 'A' : canBDetect ? 'B' : 'simultaneous';
  const timeToFirstShot = Math.min(timeToShotA, timeToShotB);
  
  // Точность на дистанции
  const accA = calculateAccuracy(distanceKm, combatA.effectiveRangeKm, combatA.maxRangeKm, combatA.accuracyAtEffective);
  const accB = calculateAccuracy(distanceKm, combatB.effectiveRangeKm, combatB.maxRangeKm, combatB.accuracyAtEffective);
  
  // Пробитие на дистанции
  const penA = calculatePenetration(distanceKm, combatA.penetrationAt1km, combatA.penetrationDropPerKm);
  const penB = calculatePenetration(distanceKm, combatB.penetrationAt1km, combatB.penetrationDropPerKm);
  
  const armorA = unitA.stats?.type === 'ground' ? (unitA.stats as GroundStats).armorRHA : 0;
  const armorB = unitB.stats?.type === 'ground' ? (unitB.stats as GroundStats).armorRHA : 0;
  
  // Вероятность пробития (с учётом ДЗ)
  const modulesA = unitA.activeModules || [];
  const modulesB = unitB.activeModules || [];
  const hasEraA = modulesA.includes('era');
  const hasEraB = modulesB.includes('era');
  const eraA = hasEraA ? 0.8 : 0; // 80% корпуса покрыто ДЗ
  const eraB = hasEraB ? 0.8 : 0;
  
  const probPenA = calculatePenetrationProbability(penA, armorB, eraB);
  const probPenB = calculatePenetrationProbability(penB, armorA, eraA);

  // Kill probability per shot
  const killProbA = accA * probPenA;
  const killProbB = accB * probPenB;

  // Expected shots to kill
  const expectedToKillB = killProbA > 0 ? 1 / killProbA : Infinity;
  const expectedToKillA = killProbB > 0 ? 1 / killProbB : Infinity;

  // Win probabilities based on initiative and kill prob
  let winProbA = 0;
  let winProbB = 0;
  let mutual = 0;

  if (firstShotBy === 'A') {
    winProbA = killProbA;
    winProbB = (1 - killProbA) * killProbB;
    mutual = killProbA * killProbB * 0.1; // Low chance of simultaneous hit if A has initiative
  } else if (firstShotBy === 'B') {
    winProbB = killProbB;
    winProbA = (1 - killProbB) * killProbA;
    mutual = killProbB * killProbA * 0.1;
  } else {
    winProbA = killProbA * (1 - killProbB);
    winProbB = killProbB * (1 - killProbA);
    mutual = killProbA * killProbB;
  }

  // Normalize probabilities to sum to 1
  const total = winProbA + winProbB + mutual;
  if (total > 0) {
    winProbA /= total;
    winProbB /= total;
    mutual /= total;
  } else {
    winProbA = 0.5;
    winProbB = 0.5;
  }

  if (simulationConfidence < 1) {
    const uncertainty = 1 - simulationConfidence;
    winProbA = winProbA * simulationConfidence + 0.5 * uncertainty;
    winProbB = winProbB * simulationConfidence + 0.5 * uncertainty;
    mutual *= simulationConfidence;
  }

  return {
    distanceKm,
    detectionRangeA: detA,
    detectionRangeB: detB,
    firstToDetect: canADetect && !canBDetect ? 'A' : !canADetect && canBDetect ? 'B' : 'simultaneous',
    firstShotBy,
    timeToFirstShotSec: timeToFirstShot,
    hitProbabilityA: accA,
    hitProbabilityB: accB,
    penetrateProbabilityA: probPenA,
    penetrateProbabilityB: probPenB,
    killProbabilityA: killProbA,
    killProbabilityB: killProbB,
    expectedShotsToKillA: expectedToKillA,
    expectedShotsToKillB: expectedToKillB,
    winProbabilityA: winProbA,
    winProbabilityB: winProbB,
    mutualDestruction: mutual,
  };
}

