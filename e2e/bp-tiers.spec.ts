import { test, expect } from '@playwright/test';
import {
  BPTIERS,
  BPTIER_BY_KEY,
  getBPTierKey,
  getBPTierInfo,
  getBPTierLabel,
  getBPTierLabelEn,
  getBPTierColor,
  getBPTierHex,
  type BPTierKey,
} from '../src/lib/bp/tiers';
import { getBPTier } from '../src/lib/bp/detailed-calculator';

// ─────────────────────────────────────────────────────────────────────────────
// Canonical BP tier classification — boundaries, labels, and the unified color
// mapping. Pure functions, no server/browser needed.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('canonical BP tiers (80 / 60 / 40 / 20)', () => {
  test('exposes exactly five tiers with the canonical descending thresholds', () => {
    expect(BPTIERS).toHaveLength(5);
    expect(BPTIERS.map((t) => t.threshold)).toEqual([80, 60, 40, 20, Number.NEGATIVE_INFINITY]);
    // Every key resolves back to itself via the lookup map.
    const keys: BPTierKey[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'MINIMAL'];
    for (const k of keys) {
      expect(BPTIER_BY_KEY[k].key).toBe(k);
    }
  });

  test('getBPTierKey resolves exact boundaries and mid-tiers', () => {
    expect(getBPTierKey(100)).toBe('CRITICAL');
    expect(getBPTierKey(80)).toBe('CRITICAL');
    expect(getBPTierKey(79.99)).toBe('HIGH');
    expect(getBPTierKey(60)).toBe('HIGH');
    expect(getBPTierKey(59.99)).toBe('MODERATE');
    expect(getBPTierKey(40)).toBe('MODERATE');
    expect(getBPTierKey(39.99)).toBe('LOW');
    expect(getBPTierKey(20)).toBe('LOW');
    expect(getBPTierKey(19.99)).toBe('MINIMAL');
    expect(getBPTierKey(0)).toBe('MINIMAL');
    expect(getBPTierKey(-5)).toBe('MINIMAL');
  });

  test('getBPTierLabel returns the canonical Russian labels at boundaries', () => {
    expect(getBPTierLabel(80)).toBe('КРИТИЧЕСКИЙ');
    expect(getBPTierLabel(79.99)).toBe('ВЫСОКИЙ');
    expect(getBPTierLabel(60)).toBe('ВЫСОКИЙ');
    expect(getBPTierLabel(59.99)).toBe('СРЕДНИЙ');
    expect(getBPTierLabel(40)).toBe('СРЕДНИЙ');
    expect(getBPTierLabel(39.99)).toBe('НИЗКИЙ');
    expect(getBPTierLabel(20)).toBe('НИЗКИЙ');
    expect(getBPTierLabel(0)).toBe('МИНИМАЛЬНЫЙ');
  });

  test('getBPTierLabelEn returns the canonical English labels', () => {
    expect(getBPTierLabelEn(80)).toBe('CRITICAL');
    expect(getBPTierLabelEn(60)).toBe('HIGH');
    expect(getBPTierLabelEn(40)).toBe('MODERATE');
    expect(getBPTierLabelEn(20)).toBe('LOW');
    expect(getBPTierLabelEn(0)).toBe('MINIMAL');
  });

  test('getBPTierColor returns the canonical tailwind text classes', () => {
    expect(getBPTierColor(80)).toBe('text-red-400');
    expect(getBPTierColor(60)).toBe('text-yellow-400');
    expect(getBPTierColor(40)).toBe('text-teal-400');
    expect(getBPTierColor(20)).toBe('text-cyan-400');
    expect(getBPTierColor(0)).toBe('text-slate-400');
  });

  test('getBPTierHex returns the canonical hex colors', () => {
    expect(getBPTierHex(80)).toBe('#ef4444');
    expect(getBPTierHex(60)).toBe('#f59e0b');
    expect(getBPTierHex(40)).toBe('#22d3ee');
    expect(getBPTierHex(20)).toBe('#3b82f6');
    expect(getBPTierHex(0)).toBe('#64748b');
  });

  test('getBPTierInfo is consistent with the scalar accessors', () => {
    const info = getBPTierInfo(97.5);
    expect(info.key).toBe('CRITICAL');
    expect(info.labelRu).toBe(getBPTierLabel(97.5));
    expect(info.labelEn).toBe(getBPTierLabelEn(97.5));
    expect(info.colorClass).toBe(getBPTierColor(97.5));
    expect(info.hex).toBe(getBPTierHex(97.5));
  });

  test('the detailed calculator now classifies via the canonical thresholds', () => {
    // detailed-calculator previously used divergent 85/70/50/30 boundaries;
    // it must now route through the shared tiers so 80 → CRITICAL / 70 →
    // HIGH (not CRITICAL), matching the rest of the app exactly.
    expect(getBPTier(80).tier).toBe('КРИТИЧЕСКИЙ');
    expect(getBPTier(79.99).tier).toBe('ВЫСОКИЙ');
    expect(getBPTier(70).tier).toBe('ВЫСОКИЙ');
    expect(getBPTier(60).tier).toBe('ВЫСОКИЙ');
    expect(getBPTier(59.99).tier).toBe('СРЕДНИЙ');
    expect(getBPTier(40).tier).toBe('СРЕДНИЙ');
    expect(getBPTier(39.99).tier).toBe('НИЗКИЙ');
    expect(getBPTier(20).tier).toBe('НИЗКИЙ');
    expect(getBPTier(0).tier).toBe('МИНИМАЛЬНЫЙ');
    // Shape contract is preserved (caller-visible return shape unchanged).
    expect(getBPTier(80)).toEqual({
      tier: 'КРИТИЧЕСКИЙ',
      color: '#ef4444',
      description: expect.any(String),
    });
  });
});