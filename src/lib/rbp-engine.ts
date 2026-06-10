import { ARSENAL, MODIFIERS, Side, UnitInfo } from "./unit-database";
import { LogisticsManager, LogisticsState, Terrain, VehicleState } from "./logistics";
import { HeightMap, MobilityManager, VisibilityManager, VehicleSpecs, BoundingBox } from "./terrain";
import { C2Manager, CommandNode } from "./c2";
import { getCombatCapabilities, simulateEngagementAtDistance } from "./combat-engine";

export type UnitStateType = 'IDLE' | 'MOVING' | 'FORMATION' | 'ENGAGING';
export type FormationType = 'LINE' | 'WEDGE' | 'COLUMN' | 'DIAMOND' | 'NONE';

export interface ActiveUnit {
    id: string;
    unit: UnitInfo;
    quantity: number;
    lat: number;
    lon: number;
    vx: number;
    vy: number;
    targetId?: string;
    potential: number;
    waypoints: { x: number, y: number }[];
    unitState: UnitStateType;
    formationSlot?: { offsetX: number, offsetY: number };
    formationType?: FormationType;
    logistics: LogisticsManager;
    c2NodeId: string;
}

export class RBPEngine {
    private units: ActiveUnit[] = [];
    private weather: keyof typeof MODIFIERS.weather = 'Clear';
    private ew: keyof typeof MODIFIERS.ew = 'None';

    setWeather(weatherType: keyof typeof MODIFIERS.weather) {
        this.weather = weatherType;
        this.calculatePotentials();
    }

    setEW(ewLevel: keyof typeof MODIFIERS.ew) {
        this.ew = ewLevel;
        this.calculatePotentials();
    }

    addUnit(unitInfo: UnitInfo, lat: number, lon: number): string {
        const id = Math.random().toString(36).substr(2, 9);
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.02 + Math.random() * 0.03;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const logistics = new LogisticsManager({
            fuel: { capacity: 1000, current: 1000 },
            ammo: { "APBC": 40 },
            maintenance: { wear: 0, health: 100 },
            crew: { fatigue: 0, stress: 0 }
        });

        const newUnit: ActiveUnit = {
            id,
            unit: unitInfo,
            quantity: 1,
            lat,
            lon,
            vx,
            vy,
            potential: 0,
            waypoints: [],
            unitState: 'IDLE',
            logistics,
            c2NodeId: id
        };

        this.units.push(newUnit);
        this.calculatePotentials();
        return id;
    }

    removeUnit(id: string) {
        this.units = this.units.filter(u => u.id !== id);
    }

    setWaypoint(unitId: string, x: number, y: number) {
        const unit = this.units.find(u => u.id === unitId);
        if (unit) {
            unit.waypoints = [{ x, y }];
            unit.unitState = 'MOVING';
        }
    }

    assignFormation(unitIds: string[], centerX: number, centerY: number, forcedType?: FormationType) {
        const units = unitIds.map(id => this.units.find(u => u.id === id)).filter(Boolean) as ActiveUnit[];
        if (units.length === 0) return;

        const airCount = units.filter(u => u.unit.category === 'aircraft').length;
        const type: FormationType = forcedType ?? (airCount === units.length ? 'WEDGE' : units.length >= 4 ? 'DIAMOND' : 'LINE');
        const spacing = 6;
        const slots = this.calculateFormationSlots(type, units.length, spacing);

        units.forEach((unit, i) => {
            unit.unitState = 'FORMATION';
            unit.formationType = type;
            unit.formationSlot = slots[i] ?? { offsetX: 0, offsetY: 0 };
            unit.waypoints = [{ x: centerX + (unit.formationSlot?.offsetX ?? 0), y: centerY + (unit.formationSlot?.offsetY ?? 0) }];
        });
    }

    private calculateFormationSlots(type: FormationType, count: number, spacing: number): { offsetX: number, offsetY: number }[] {
        const slots: { offsetX: number, offsetY: number }[] = [];
        switch (type) {
            case 'LINE': {
                const half = (count - 1) / 2;
                for (let i = 0; i < count; i++) slots.push({ offsetX: (i - half) * spacing, offsetY: 0 });
                break;
            }
            case 'WEDGE': {
                for (let i = 0; i < count; i++) {
                    if (i === 0) slots.push({ offsetX: 0, offsetY: 0 });
                    else {
                        const side = i % 2 === 1 ? 1 : -1;
                        const row = Math.ceil(i / 2);
                        slots.push({ offsetX: side * row * spacing * 0.8, offsetY: row * spacing * 0.6 });
                    }
                }
                break;
            }
            case 'COLUMN': {
                const half = (count - 1) / 2;
                for (let i = 0; i < count; i++) slots.push({ offsetX: 0, offsetY: (i - half) * spacing });
                break;
            }
            case 'DIAMOND': {
                const positions = [{ offsetX: 0, offsetY: -spacing }, { offsetX: -spacing, offsetY: 0 }, { offsetX: spacing, offsetY: 0 }, { offsetX: 0, offsetY: spacing }];
                for (let i = 0; i < count; i++) {
                    if (i < positions.length) slots.push(positions[i]);
                    else {
                        const row = Math.floor(i / positions.length);
                        const base = positions[i % positions.length];
                        slots.push({ offsetX: base.offsetX * (1 + row * 0.5), offsetY: base.offsetY * (1 + row * 0.5) });
                    }
                }
                break;
            }
            default: {
                for (let i = 0; i < count; i++) slots.push({ offsetX: 0, offsetY: 0 });
            }
        }
        return slots;
    }

    calculatePotentials() {
        const weatherModifier = MODIFIERS.weather[this.weather];
        const ewModifier = MODIFIERS.ew[this.ew];
        this.units.forEach(u => {
            let pot = u.unit.potential * u.quantity;
            if (u.unit.category === 'aircraft') pot *= weatherModifier * ewModifier;
            else if (u.unit.category === 'air_defense') pot *= ewModifier;
            u.potential = pot;
        });
    }

    stepSimulation(dt: number = 16) {
        const dtFactor = dt / 16;
        this.units.forEach(u => {
            u.logistics.update(dt, 0.1 * dtFactor, Terrain.ROAD, VehicleState.MOVING, 1.0);
            const hasFuel = u.logistics.state.fuel.current > 0;
            if (!hasFuel) {
                u.vx = 0; u.vy = 0;
                u.unitState = 'IDLE';
            }

            if (hasFuel) {
                const enemy = this.units.find(target => target.unit.side !== u.unit.side);
                let sepX = 0, sepY = 0;
                const mySpeed = Math.sqrt(u.vx * u.vx + u.vy * u.vy);
                const sepMultiplier = Math.min(1, mySpeed * 5 + 0.1);
                this.units.forEach(other => {
                    if (other.id === u.id || other.unit.side !== u.unit.side) return;
                    const dx = other.lon - u.lon;
                    const dy = other.lat - u.lat;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 5 && dist > 0.1) {
                        sepX -= (dx / dist) * (5 - dist) * 0.005 * sepMultiplier;
                        sepY -= (dy / dist) * (5 - dist) * 0.005 * sepMultiplier;
                    }
                });
                u.vx += sepX * dtFactor;
                u.vy += sepY * dtFactor;

                if (u.waypoints.length > 0) {
                    const wp = u.waypoints[0];
                    const dx = wp.x - u.lon;
                    const dy = wp.y - u.lat;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const arrivalRadius = u.unitState === 'FORMATION' ? 1.0 : 1.5;
                    if (dist < arrivalRadius) {
                        u.waypoints.shift();
                        if (u.waypoints.length === 0) u.unitState = 'IDLE';
                    } else {
                        const force = (u.unit.category === 'aircraft' ? 0.003 : 0.002) * dtFactor;
                        u.vx += (dx / dist) * force;
                        u.vy += (dy / dist) * force;
                    }
                } else if (enemy) {
                    u.targetId = enemy.id;
                    const dx = enemy.lon - u.lon;
                    const dy = enemy.lat - u.lat;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 25) {
                        u.vx += (dx / dist) * 0.0015 * dtFactor;
                        u.vy += (dy / dist) * 0.0015 * dtFactor;
                    } else if (dist < 12.5) {
                        u.vx -= (dx / dist) * 0.0012 * dtFactor;
                        u.vy -= (dy / dist) * 0.0012 * dtFactor;
                    }
                } else {
                    u.targetId = undefined;
                    if (Math.sqrt(u.vx * u.vx + u.vy * u.vy) > 0.02) {
                        u.vx += (Math.random() - 0.5) * 0.0005 * dtFactor;
                        u.vy += (Math.random() - 0.5) * 0.0005 * dtFactor;
                    }
                }
            }

            const damping = Math.pow(0.96, dtFactor);
            u.vx *= damping; u.vy *= damping;
            const speed = Math.sqrt(u.vx * u.vx + u.vy * u.vy);
            const maxSpeed = (u.unit.category === 'aircraft' ? 0.12 : 0.06) * dtFactor;
            if (speed > maxSpeed) {
                u.vx = (u.vx / speed) * maxSpeed;
                u.vy = (u.vy / speed) * maxSpeed;
            }
            u.vx *= Math.pow(0.99, dtFactor);
            u.vy *= Math.pow(0.99, dtFactor);
            u.lon += u.vx * dtFactor;
            u.lat += u.vy * dtFactor;

            const margin = 5;
            if (u.lon < margin) u.vx += 0.001 * dtFactor;
            if (u.lon > 100 - margin) u.vx -= 0.001 * dtFactor;
            if (u.lat < margin) u.vy += 0.001 * dtFactor;
            if (u.lat > 100 - margin) u.vy -= 0.001 * dtFactor;
        });
    }

    getOverview() {
        const totals = { NATO: 0, RUS: 0, CHINA: 0 };
        this.units.forEach(u => {
            totals[u.unit.side] += u.potential;
        });
        return { units: this.units, ...totals };
    }
}
