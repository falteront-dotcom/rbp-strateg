import { test, expect } from '@playwright/test';
import { top20Countries } from '@/db/seed/top20-countries';
import { extendedCountries } from '@/db/seed/extended-countries';
import { additionalCountries } from '@/db/seed/additional-countries';
import { deriveCoalition, deriveSide, runPipeline } from '@/scripts/data-pipeline/merge-validate';

const SEEDED_COUNTRIES = [
  ...top20Countries,
  ...extendedCountries,
  ...additionalCountries,
];

const NATO_ALIGNED_ISOS = ['JPN', 'KOR', 'ISR', 'AUS', 'TWN', 'SGP', 'PHL', 'NZL'];
const SEEDED_NATO_ALIGNED_ISOS = NATO_ALIGNED_ISOS.filter((isoCode) =>
  SEEDED_COUNTRIES.some((country) => country.isoCode === isoCode),
);
const PRIMARY_BRICS_ISOS = ['CHN', 'IND', 'BRA', 'ZAF', 'SAU', 'IRN', 'ARE', 'EGY', 'ETH'];

test.describe('offline pipeline taxonomy', () => {
  test('classifies every seeded NATO-aligned country as NATO-side', () => {
    for (const isoCode of SEEDED_NATO_ALIGNED_ISOS) {
      expect(deriveSide(isoCode), isoCode).toBe('NATO');
    }
    for (const isoCode of NATO_ALIGNED_ISOS) {
      expect(deriveSide(isoCode), isoCode).not.toBe('NEUTRAL');
    }
  });

  test('classifies every primary seeded BRICS member with the BRICS coalition', () => {
    for (const isoCode of PRIMARY_BRICS_ISOS) {
      const seeded = SEEDED_COUNTRIES.find((country) => country.isoCode === isoCode);
      expect(seeded, `${isoCode} must exist in the committed fixture`).toBeDefined();
      expect(deriveCoalition(isoCode), isoCode).toBe('BRICS');
    }
  });

  test('uses explicit primary-coalition precedence for overlapping memberships', () => {
    expect(deriveCoalition('USA')).toBe('NATO');
    expect(deriveCoalition('RUS')).toBe('CSTO');
    expect(deriveCoalition('AUS')).toBe('AUKUS');
    expect(deriveCoalition('CHN')).toBe('BRICS');
  });

  test('preserves explicit strategic sides for Russia, China, and Ukraine', () => {
    expect(deriveSide('RUS')).toBe('RUS');
    expect(deriveSide('CHN')).toBe('CHINA');
    expect(deriveSide('UKR')).toBe('UKR');
  });

  test('does not silently classify seeded NATO-aligned countries as neutral', () => {
    const neutralDemotions = NATO_ALIGNED_ISOS.filter((isoCode) => deriveSide(isoCode) === 'NEUTRAL');
    expect(neutralDemotions).toEqual([]);
  });

  test('offline merge path persists corrected side and coalition values', async () => {
    const result = await runPipeline({ worldBankData: new Map() });
    const byIso = new Map(result.countries.map((country) => [country.isoCode, country]));

    expect(byIso.get('AUS')).toMatchObject({ side: 'NATO', coalition: 'AUKUS' });
    expect(byIso.get('JPN')).toMatchObject({ side: 'NATO' });
    expect(byIso.get('RUS')).toMatchObject({ side: 'RUS', coalition: 'CSTO' });
    expect(byIso.get('CHN')).toMatchObject({ side: 'CHINA', coalition: 'BRICS' });
    expect(byIso.get('UKR')).toMatchObject({ side: 'UKR' });
  });
});
