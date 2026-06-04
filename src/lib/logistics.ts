export enum Terrain {
    ROAD = 1.0,
    FIELD = 1.5,
    FOREST = 2.0,
    SWAMP = 5.0
}

export enum VehicleState {
    IDLE,
    MOVING,
    ENGAGING
}

export interface LogisticsState {
  fuel: {
    capacity: number;
    current: number;
  };
  ammo: Record<string, number>;
  maintenance: {
    wear: number;
    health: number;
  };
  crew: {
    fatigue: number;
    stress: number;
  };
}

export class LogisticsManager {
  constructor(public state: LogisticsState) {}

  update(dt: number, distance: number, terrain: Terrain, state: VehicleState, stressFactor: number = 1.0, isResting: boolean = false) {
    // 1. Fuel
    const baseRate = 1.0;
    const consumptionRate = baseRate * (state as number) * (terrain as number);
    const fuelConsumed = state === VehicleState.MOVING ? distance * consumptionRate : 0.00016 * dt;
    console.log(`Consuming fuel: ${fuelConsumed}`);
    this.state.fuel.current = Math.max(0, this.state.fuel.current - fuelConsumed);

    // 2. Maintenance
    const roughness = terrain;
    this.state.maintenance.wear += distance * 0.01 * roughness;

    // 3. Crew
    if (isResting) {
      this.state.crew.fatigue = Math.max(0, this.state.crew.fatigue - 0.00005 * dt);
      this.state.crew.stress = Math.max(0, this.state.crew.stress - 0.01 * dt);
    } else {
      this.state.crew.fatigue = Math.min(1, this.state.crew.fatigue + 0.00001 * dt * stressFactor);
    }
  }

  getReactionModifier(): number {
    return 1.0 + (this.state.crew.fatigue * 0.5) + (this.state.crew.stress * 0.3);
  }

  getAccuracyModifier(): number {
    return 1.0 + (this.state.crew.fatigue * 0.3) + (this.state.crew.stress * 0.2);
  }
}
