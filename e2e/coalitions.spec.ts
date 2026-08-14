import { test, expect } from '@playwright/test';
import {
  PREDEFINED_COALITIONS,
  aggregateCoalitionBP,
  compareCoalitions,
  type CoalitionMember,
  type CoalitionBP,
  type CoalitionBPComponent,
} from '../src/lib/coalitions';

// ─────────────────────────────────────────────────────────────────────────────
// Coalition aggregation invariants (canonical runtime registry).
// Pure functions, no server/browser needed.
//
// Semantics under test (documented in coalitions.ts):
//   - totalBP      = SUM of member bpTotal  (coalition aggregate strength)
//   - componentX   = AVERAGE of member component values (average member profile)
//   - members      = sorted by bpTotal descending; unknown ISOs silently skipped
// ─────────────────────────────────────────────────────────────────────────────

function makeMember(
  iso: string,
  bpTotal: number,
  components: Partial<Record<CoalitionBPComponent, number>> = {},
): CoalitionMember {
  const base: Record<CoalitionBPComponent, number> = {
    bpWeapon: 50,
    bpManpower: 50,
    bpLogistics: 50,
    bpC2: 50,
    bpEconomy: 50,
    bpDoctrine: 50,
    bpReadiness: 50,
    bpTerrain: 50,
  };
  return {
    isoCode: iso,
    nameRu: iso,
    side: 'NEUTRAL',
    bpTotal,
    ...base,
    ...components,
  } as CoalitionMember;
}

test.describe('coalition aggregation semantics', () => {
  test('totalBP is the SUM and component scores are the AVERAGE', () => {
    const members = [
      makeMember('USA', 100, { bpWeapon: 80, bpEconomy: 90 }),
      makeMember('GBR', 90, { bpWeapon: 70, bpEconomy: 80 }),
      makeMember('CAN', 70, { bpWeapon: 60, bpEconomy: 70 }),
    ];

    const result = aggregateCoalitionBP('TEST', ['USA', 'GBR', 'CAN'], members);

    expect(result.name).toBe('TEST');
    expect(result.memberCount).toBe(3);
    // totalBP = SUM of member bpTotal
    expect(result.totalBP).toBe(260);
    // componentScores = AVERAGE of member components (rounded to 2dp)
    expect(result.componentScores.bpWeapon).toBe(70); // (80+70+60)/3
    expect(result.componentScores.bpEconomy).toBe(80); // (90+80+70)/3
    // Members are sorted by bpTotal descending.
    expect(result.members.map((m) => m.isoCode)).toEqual(['USA', 'GBR', 'CAN']);
  });

  test('unknown ISO codes are silently skipped', () => {
    const members = [
      makeMember('USA', 100),
      makeMember('GBR', 90),
      makeMember('ZZZ', 9999), // not requested
    ];
    const result = aggregateCoalitionBP('TEST', ['USA', 'XXX', 'CAN', 'GBR'], members);
    expect(result.memberCount).toBe(2);
    expect(result.members.map((m) => m.isoCode)).toEqual(['USA', 'GBR']);
    expect(result.totalBP).toBe(190);
  });

  test('an empty coalition yields zeros without throwing', () => {
    const result = aggregateCoalitionBP('NONE', ['ZZZ'], [makeMember('USA', 100)]);
    expect(result.memberCount).toBe(0);
    expect(result.totalBP).toBe(0);
    expect(result.members).toEqual([]);
    for (const comp of [
      'bpWeapon',
      'bpManpower',
      'bpLogistics',
      'bpC2',
      'bpEconomy',
      'bpDoctrine',
      'bpReadiness',
      'bpTerrain',
    ] as CoalitionBPComponent[]) {
      expect(result.componentScores[comp]).toBe(0);
    }
  });

  test('PREDEFINED_COALITIONS NATO has the 26 seeded members including USA', () => {
    const nato = PREDEFINED_COALITIONS.get('NATO');
    expect(nato).toBeDefined();
    expect(nato!.length).toBe(26);
    expect(nato!).toContain('USA');
    // Deterministic membership invariant — the same 26 codes the e2e fixture
    // expects (app.spec EXPECTED_NATO_MEMBERS = 26).
    expect(nato!.length).toBe(
      new Set(nato!).size,
    ); // no duplicates
  });
});

test.describe('coalition comparison', () => {
  function bp(name: string, total: number, weapon: number): CoalitionBP {
    return {
      name,
      isoCodes: [],
      memberCount: 1,
      totalBP: total,
      componentScores: {
        bpWeapon: weapon,
        bpManpower: 50,
        bpLogistics: 50,
        bpC2: 50,
        bpEconomy: 50,
        bpDoctrine: 50,
        bpReadiness: 50,
        bpTerrain: 50,
      },
      members: [],
    };
  }

  test('overall advantage follows totalBP', () => {
    const a = bp('A', 260, 70);
    const b = bp('B', 200, 60);
    const cmp = compareCoalitions(a, b);
    expect(cmp.totalDelta).toBe(60);
    expect(cmp.overallAdvantage).toBe('A');
  });

  test('equal totals tie', () => {
    const cmp = compareCoalitions(bp('A', 200, 50), bp('B', 200, 50));
    expect(cmp.totalDelta).toBe(0);
    expect(cmp.overallAdvantage).toBe('tie');
  });

  test('per-component advantage reflects |delta| >= 0.5', () => {
    const cmp = compareCoalitions(bp('A', 1, 80), bp('B', 1, 60));
    const weapon = cmp.componentDeltas.find((d) => d.component === 'bpWeapon');
    expect(weapon).toBeDefined();
    expect(weapon!.delta).toBe(20);
    expect(weapon!.advantage).toBe('A');
    // A near-zero delta ties.
    const cmp2 = compareCoalitions(bp('A', 1, 50.2), bp('B', 1, 50));
    const weapon2 = cmp2.componentDeltas.find((d) => d.component === 'bpWeapon');
    expect(weapon2!.delta).toBeCloseTo(0.2, 5);
    expect(weapon2!.advantage).toBe('tie');
  });
});