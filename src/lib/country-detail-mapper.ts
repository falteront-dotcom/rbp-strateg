/**
 * Maps raw countries API response (with `bp_*` snake_case fields)
 * to the format expected by strategic detail tabs (with `*Score` camelCase).
 */

export interface CountryDetailFields {
  // Component scores (camelCase as expected by BPDetailTab and others)
  weaponScore: number;
  manpowerScore: number;
  logisticsScore: number;
  c2Score: number;
  economyScore: number;
  doctrineScore: number;
  readinessScore: number;
  terrainScore: number;
  bpTotal: number;
  bpRank: number;
}

/**
 * Normalize any value to a finite number, or 0.
 */
function toNum(v: unknown): number {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Build the score field mapping from any country object.
 * Reads `bpWeapon`/`weaponScore`/`bp_weapon`/etc. → `weaponScore`.
 */
export function pickScoreFields(c: Record<string, unknown> | null | undefined): CountryDetailFields {
  if (!c) {
    return {
      weaponScore: 0,
      manpowerScore: 0,
      logisticsScore: 0,
      c2Score: 0,
      economyScore: 0,
      doctrineScore: 0,
      readinessScore: 0,
      terrainScore: 0,
      bpTotal: 0,
      bpRank: 0,
    };
  }
  return {
    weaponScore: toNum(c.weaponScore ?? c.bpWeapon ?? c.bp_weapon),
    manpowerScore: toNum(c.manpowerScore ?? c.bpManpower ?? c.bp_manpower),
    logisticsScore: toNum(c.logisticsScore ?? c.bpLogistics ?? c.bp_logistics),
    c2Score: toNum(c.c2Score ?? c.bpC2 ?? c.bp_c2),
    economyScore: toNum(c.economyScore ?? c.bpEconomy ?? c.bp_economy),
    doctrineScore: toNum(c.doctrineScore ?? c.bpDoctrine ?? c.bp_doctrine),
    readinessScore: toNum(c.readinessScore ?? c.bpReadiness ?? c.bp_readiness),
    terrainScore: toNum(c.terrainScore ?? c.bpTerrain ?? c.bp_terrain),
    bpTotal: toNum(c.bpTotal ?? c.bp_total),
    bpRank: toNum(c.bpRank ?? c.bp_rank),
  };
}
