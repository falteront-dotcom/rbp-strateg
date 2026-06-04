/**
 * Terrain & Heightmap System (Simulation Grade)
 * Handles altitude, visibility, and mobility constraints.
 */

export interface BoundingBox {
  width: number;
  length: number;
  height: number;
}

export interface VisibilityParams {
  fovAngle: number;        // Degrees
  minDetectionProb: number; // 0-1
  baseTransparency: number; // 0-1
}

export class HeightMap {
  constructor(
    public data: number[][],
    public scale: number = 1.0
  ) {}

  get width(): number {
    return this.data.length;
  }

  get height(): number {
    return this.data[0]?.length || 0;
  }

  getHeight(x: number, y: number): number {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix >= 0 && ix < this.width && iy >= 0 && iy < this.height) {
      return this.data[ix][iy];
    }
    return 0.0;
  }

  getInterpolatedHeight(x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    if (x0 < 0 || x1 >= this.width || y0 < 0 || y1 >= this.height) {
      return this.getHeight(Math.round(x), Math.round(y));
    }

    const dx = x - x0;
    const dy = y - y0;
    const h00 = this.data[x0][y0];
    const h10 = this.data[x1][y0];
    const h01 = this.data[x0][y1];
    const h11 = this.data[x1][y1];

    return (h00 * (1 - dx) * (1 - dy) +
            h10 * dx * (1 - dy) +
            h01 * (1 - dx) * dy +
            h11 * dx * dy);
  }
}

export class VisibilityManager {
  private transparencyMap: Map<string, number> = new Map();

  constructor(
    private heightmap: HeightMap,
    private params: VisibilityParams = { fovAngle: 90, minDetectionProb: 0.1, baseTransparency: 1.0 }
  ) {}

  setCellTransparency(x: number, y: number, value: number) {
    this.transparencyMap.set(`${x},${y}`, Math.max(0, Math.min(1, value)));
  }

  isInFov(observerPos: [number, number], observerHeading: number, targetPos: [number, number]): boolean {
    const dx = targetPos[0] - observerPos[0];
    const dy = targetPos[1] - observerPos[1];
    let angleToTarget = (Math.atan2(dx, dy) * 180) / Math.PI;
    if (angleToTarget < 0) angleToTarget += 360;

    let diff = Math.abs(angleToTarget - observerHeading);
    if (diff > 180) diff = 360 - diff;
    return diff <= this.params.fovAngle / 2;
  }

  private checkSingleRay(start: [number, number, number], end: [number, number, number]): number {
    const [x0, y0, z0] = start;
    const [x1, y1, z1] = end;
    const distTotal = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
    if (distTotal === 0) return 1.0;

    const steps = Math.ceil(distTotal);
    let visibility = 1.0;

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const currX = Math.round(x0 + t * (x1 - x0));
      const currY = Math.round(y0 + t * (y1 - y0));

      if (currX >= 0 && currX < this.heightmap.width && currY >= 0 && currY < this.heightmap.height) {
        const rayH = z0 + t * (z1 - z0);
        if (this.heightmap.getHeight(currX, currY) > rayH) return 0.0;
        
        const cellTrans = this.transparencyMap.get(`${currX},${currY}`) ?? this.params.baseTransparency;
        visibility *= cellTrans;
        if (visibility < this.params.minDetectionProb) return 0.0;
      }
    }
    return visibility;
  }

  calculateVisibility(observerPos: [number, number, number], targetPos: [number, number, number], targetBox: BoundingBox): number {
    const samplePoints: [number, number, number][] = [
      [targetPos[0], targetPos[1], targetPos[2]], // Base
      [targetPos[0], targetPos[1], targetPos[2] + targetBox.height * 0.5], // Mid
      [targetPos[0], targetPos[1], targetPos[2] + targetBox.height], // Top
    ];

    let totalVis = 0;
    for (const pt of samplePoints) {
      totalVis += this._checkSingleRay(observerPos, pt);
    }
    return totalVis / samplePoints.length;
  }

  // Helper for internal ray casting
  private _checkSingleRay = this.checkSingleRay;
}

export interface VehicleSpecs {
  groundPressure: number; // kPa
  maxSlope: number;       // Degrees
  baseSpeed: number;      // km/h
}

export class MobilityManager {
  private terrainBearingCapacity: Record<string, number> = {
    'ROAD': 500.0,
    'FIELD': 150.0,
    'MUD': 30.0,
    'SWAMP': 10.0
  };

  constructor(private heightmap: HeightMap) {}

  calculateSlope(start: [number, number], end: [number, number]): number {
    const z0 = this.heightmap.getInterpolatedHeight(start[0], start[1]);
    const z1 = this.heightmap.getInterpolatedHeight(end[0], end[1]);
    const dist2d = Math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2);
    if (dist2d === 0) return 0.0;
    return (Math.atan((z1 - z0) / dist2d) * 180) / Math.PI;
  }

  getMobilityStatus(slope: number, vehicle: VehicleSpecs, terrainType: string): string {
    if (Math.abs(slope) > vehicle.maxSlope) return 'IMPASSABLE_SLOPE';
    const capacity = this.terrainBearingCapacity[terrainType] ?? 100.0;
    if (vehicle.groundPressure > capacity) return 'IMMOBILIZED_SUNK';
    if (Math.abs(slope) > 15) return 'DIFFICULT';
    return 'NORMAL';
  }

  getTraversalCost(start: [number, number], end: [number, number], vehicle: VehicleSpecs, terrainType: string): number {
    const dist2d = Math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2);
    const slope = this.calculateSlope(start, end);
    const status = this.getMobilityStatus(slope, vehicle, terrainType);
    if (status === 'IMPASSABLE_SLOPE' || status === 'IMMOBILIZED_SUNK') return Infinity;
    const slopeModifier = status === 'DIFFICULT' ? 2.0 : 1.0;
    return dist2d * slopeModifier;
  }
}
