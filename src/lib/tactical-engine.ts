// ─────────────────────────────────────────────────────────────────────────────
// Tactical Simulation Engine
// Turn-based combat resolution for tactical mode
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────
export type UnitCategory = "infantry" | "armor" | "artillery" | "air_defense" | "aviation";
export type TerrainType = "plains" | "forest" | "mountain" | "urban" | "water" | "desert";
export type Side = "blue" | "red";

export interface TacticalUnit {
  id: string;
  name: string;
  category: UnitCategory;
  side: Side;
  strength: number;     // 0-100 current HP
  maxStrength: number;   // 0-100 max HP
  range: number;        // 0-8 tiles
  mobility: number;     // 0-9 tiles/turn
  armor: number;        // 0-5 defense
  firepower: number;    // 0-100 attack
  row: number;
  col: number;
  morale: number;       // 0-100
  hasMoved: boolean;
  hasFired: boolean;
}

export interface TerrainCell {
  type: TerrainType;
  elevation: number;    // 0-3
  cover: number;        // 0-5 defense bonus
  moveCost: number;     // 1-4 movement points
  visibility: number;   // 1-5 range
}

export interface BattleState {
  turn: number;
  phase: "planning" | "execution" | "afteraction";
  units: TacticalUnit[];
  terrain: TerrainCell[][];
  events: BattleEvent[];
  blueStrength: number;
  redStrength: number;
  blueMorale: number;
  redMorale: number;
  winner: Side | null;
}

export interface BattleEvent {
  turn: number;
  phase: "move" | "fire" | "result";
  description: string;
  attacker?: string;
  defender?: string;
  damage?: number;
  morale?: number;
}

export interface CombatResult {
  attackerId: string;
  defenderId: string;
  damage: number;
  moraleImpact: number;
  terrainModifier: number;
  armorReduction: number;
  description: string;
}

export interface TurnResult {
  events: BattleEvent[];
  updatedUnits: TacticalUnit[];
  blueStrength: number;
  redStrength: number;
  blueMorale: number;
  redMorale: number;
  winner: Side | null;
}

// ─── Terrain Effects Table ────────────────────────────────────────────────────
const TERRAIN_EFFECTS: Record<TerrainType, { coverBonus: number; moveCostMod: number; rangeMod: number; elevationBonus: number }> = {
  plains:   { coverBonus: 0,  moveCostMod: 1.0, rangeMod: 0, elevationBonus: 0 },
  forest:   { coverBonus: 3,  moveCostMod: 1.5, rangeMod: -2, elevationBonus: 0 },
  mountain: { coverBonus: 2,  moveCostMod: 2.0, rangeMod: 1, elevationBonus: 2 },
  urban:    { coverBonus: 4,  moveCostMod: 1.5, rangeMod: -1, elevationBonus: 1 },
  water:    { coverBonus: -1, moveCostMod: 3.0, rangeMod: 0, elevationBonus: -1 },
  desert:   { coverBonus: -1, moveCostMod: 1.2, rangeMod: 1, elevationBonus: 0 },
};

// ─── Unit Type Matchup Table ──────────────────────────────────────────────────
// Attacker advantage vs defender type (multiplier)
const MATCHUP_TABLE: Record<UnitCategory, Record<UnitCategory, number>> = {
  infantry:     { infantry: 1.0, armor: 0.3, artillery: 1.2, air_defense: 1.0, aviation: 0.1 },
  armor:        { infantry: 1.5, armor: 1.0, artillery: 1.3, air_defense: 0.8, aviation: 0.2 },
  artillery:    { infantry: 1.0, armor: 1.3, artillery: 0.5, air_defense: 1.0, aviation: 0.3 },
  air_defense:  { infantry: 0.5, armor: 0.5, artillery: 0.8, air_defense: 0.5, aviation: 2.0 },
  aviation:     { infantry: 1.5, armor: 1.3, artillery: 1.5, air_defense: 0.3, aviation: 1.0 },
};

// ─── Core Combat Calculation ──────────────────────────────────────────────────
export function calculateCombat(
  attacker: TacticalUnit,
  defender: TacticalUnit,
  terrain: TerrainCell
): CombatResult {
  // Base damage = attacker firepower * matchup multiplier
  const matchup = MATCHUP_TABLE[attacker.category]?.[defender.category] ?? 1.0;

  // Terrain modifier for defender
  const terrainEffects = TERRAIN_EFFECTS[terrain.type];
  const terrainModifier = terrainEffects.coverBonus;

  // Armor reduction
  const armorReduction = defender.armor * 8; // each armor point reduces damage by 8%

  // Elevation advantage
  const elevationBonus = terrainEffects.elevationBonus * 5; // +5% per elevation level

  // Morale factor
  const moraleFactor = (attacker.morale / 100) * 0.5 + 0.5; // 50-100% effectiveness

  // Calculate raw damage
  const rawDamage = attacker.firepower * matchup * moraleFactor;

  // Apply terrain and armor reductions
  const totalReduction = Math.max(0, terrainModifier + armorReduction - elevationBonus);
  const finalDamage = Math.max(1, rawDamage * (1 - totalReduction / 100));

  // Morale impact on defender
  const moraleImpact = -(finalDamage / defender.maxStrength) * 30; // damage = morale loss

  const description = `${attacker.name} атакует ${defender.name}: ` +
    `урон ${finalDamage.toFixed(1)} (местность: ${terrain.type}, ` +
    `броня: -${armorReduction}%, укрытие: +${terrainModifier})`;

  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    damage: Math.round(finalDamage * 10) / 10,
    moraleImpact: Math.round(moraleImpact),
    terrainModifier,
    armorReduction,
    description,
  };
}

// ─── Resolve Full Turn ───────────────────────────────────────────────────────
export function resolveTurn(state: BattleState): TurnResult {
  const events: BattleEvent[] = [];
  const updatedUnits = state.units.map((u) => ({ ...u, hasMoved: false, hasFired: false }));

  // Sort units by mobility (fastest first) for turn order
  const turnOrder = [...updatedUnits].sort((a, b) => b.mobility - a.mobility);

  for (const unit of turnOrder) {
    if (unit.strength <= 0) continue;

    // Find best target
    const enemies = updatedUnits.filter(
      (u) => u.side !== unit.side && u.strength > 0
    );
    if (enemies.length === 0) continue;

    // Simple AI: attack closest enemy or weakest
    const target = enemies.reduce((best, enemy) => {
      const dist = Math.abs(enemy.row - unit.row) + Math.abs(enemy.col - unit.col);
      const score = dist <= unit.range ? (100 - enemy.strength) : -1000;
      return score > best.score ? { enemy, score } : best;
    }, { enemy: enemies[0], score: -Infinity }).enemy;

    const dist = Math.abs(target.row - unit.row) + Math.abs(target.col - unit.col);
    if (dist <= unit.range && unit.firepower > 0) {
      const terrain = state.terrain[target.row]?.[target.col] ?? {
        type: "plains" as TerrainType,
        cover: 0,
        moveCost: 1,
        elevation: 0,
        visibility: 5,
      };

      const result = calculateCombat(unit, target, terrain);

      // Apply damage
      const targetIdx = updatedUnits.findIndex((u) => u.id === target.id);
      if (targetIdx >= 0) {
        updatedUnits[targetIdx].strength = Math.max(
          0,
          updatedUnits[targetIdx].strength - result.damage
        );
        updatedUnits[targetIdx].morale = Math.max(
          0,
          updatedUnits[targetIdx].morale + result.moraleImpact
        );
      }

      events.push({
        turn: state.turn,
        phase: "fire",
        description: result.description,
        attacker: unit.id,
        defender: target.id,
        damage: result.damage,
        morale: result.moraleImpact,
      });

      // Check if unit destroyed
      if (updatedUnits[targetIdx]?.strength <= 0) {
        events.push({
          turn: state.turn,
          phase: "result",
          description: `${target.name} уничтожен!`,
          attacker: unit.id,
          defender: target.id,
        });
      }
    }
  }

  // Calculate force totals
  const blueUnits = updatedUnits.filter((u) => u.side === "blue" && u.strength > 0);
  const redUnits = updatedUnits.filter((u) => u.side === "red" && u.strength > 0);

  const blueStrength = blueUnits.length > 0
    ? Math.round(blueUnits.reduce((s, u) => s + u.strength, 0) / blueUnits.length)
    : 0;
  const redStrength = redUnits.length > 0
    ? Math.round(redUnits.reduce((s, u) => s + u.strength, 0) / redUnits.length)
    : 0;
  const blueMorale = blueUnits.length > 0
    ? Math.round(blueUnits.reduce((s, u) => s + u.morale, 0) / blueUnits.length)
    : 0;
  const redMorale = redUnits.length > 0
    ? Math.round(redUnits.reduce((s, u) => s + u.morale, 0) / redUnits.length)
    : 0;

  // Determine winner
  let winner: Side | null = null;
  if (blueStrength <= 10 || blueMorale <= 20) winner = "red";
  if (redStrength <= 10 || redMorale <= 20) winner = "blue";
  if (blueStrength <= 10 && redStrength <= 10) winner = "blue"; // draw goes to defender

  return {
    events,
    updatedUnits,
    blueStrength,
    redStrength,
    blueMorale,
    redMorale,
    winner,
  };
}

// ─── Initialize Battle ───────────────────────────────────────────────────────
export function initBattle(
  units: TacticalUnit[],
  terrain: TerrainCell[][]
): BattleState {
  const blueUnits = units.filter((u) => u.side === "blue" && u.strength > 0);
  const redUnits = units.filter((u) => u.side === "red" && u.strength > 0);

  return {
    turn: 1,
    phase: "planning",
    units,
    terrain,
    events: [],
    blueStrength: blueUnits.length > 0
      ? Math.round(blueUnits.reduce((s, u) => s + u.strength, 0) / blueUnits.length)
      : 0,
    redStrength: redUnits.length > 0
      ? Math.round(redUnits.reduce((s, u) => s + u.strength, 0) / redUnits.length)
      : 0,
    blueMorale: blueUnits.length > 0
      ? Math.round(blueUnits.reduce((s, u) => s + u.morale, 0) / blueUnits.length)
      : 80,
    redMorale: redUnits.length > 0
      ? Math.round(redUnits.reduce((s, u) => s + u.morale, 0) / redUnits.length)
      : 80,
    winner: null,
  };
}
