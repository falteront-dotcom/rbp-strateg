'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from 'recharts';import { DollarSign, Users, Droplets, Shield, TrendingUp, AlertTriangle, Gauge, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Country } from '@/db/schema';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface EconomicsTabProps {
  country: Country;
  /** All countries for regional comparison & rank computation */
  allCountries?: Country[];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Format billions with $ and B suffix */
function fmtBn(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}T`;
  if (value >= 1) return `$${value.toFixed(1)}B`;
  return `$${(value * 1000).toFixed(0)}M`;
}

/** Format large population number */
function fmtPop(millions: number): string {
  if (millions >= 1000) return `${(millions / 1000).toFixed(2)}B`;
  if (millions >= 1) return `${millions.toFixed(1)}M`;
  return `${(millions * 1000).toFixed(0)}K`;
}

/** Format oil production (kbd → readable) */
function fmtOil(kbd: number): string {
  if (kbd >= 1000) return `${(kbd / 1000).toFixed(1)}M b/d`;
  return `${kbd.toLocaleString('en')}K b/d`;
}

/** Compute GDP world rank from allCountries array */
function gdpRank(country: Country, all?: Country[]): number | null {
  if (!all || all.length === 0) return null;
  const sorted = [...all].sort((a, b) => b.gdpPppBn - a.gdpPppBn);
  const idx = sorted.findIndex((c) => c.isoCode === country.isoCode);
  return idx >= 0 ? idx + 1 : null;
}

/** Color for defense % GDP threshold */
function defenseColor(pct: number): string {
  if (pct > 4) return '#ef4444'; // red
  if (pct >= 2) return '#eab308'; // yellow
  return '#22c55e'; // green
}

/** Fiscal sustainability rating */
type FiscalRating = 'Устойчивый' | 'Умеренный' | 'Высокий' | 'Критический';
function fiscalRating(pct: number): { label: FiscalRating; color: string; level: number } {
  if (pct < 2) return { label: 'Устойчивый', color: '#22c55e', level: 1 };
  if (pct < 3) return { label: 'Умеренный', color: '#eab308', level: 2 };
  if (pct < 5) return { label: 'Высокий', color: '#f97316', level: 3 };
  return { label: 'Критический', color: '#ef4444', level: 4 };
}

/** Generate mock 5-year defense spending trend */
function generateTrend(budget: number, pct: number): Array<{ year: number; budget: number; pct: number }> {
  const currentYear = new Date().getFullYear();
  const data: Array<{ year: number; budget: number; pct: number }> = [];
  // Deterministic pseudo-random offsets based on budget
  const seed = Math.round(budget * 100) % 100;
  const offsets = [-0.04, -0.02, 0, 0.02, 0.05];
  for (let i = 0; i < 5; i++) {
    const variation = offsets[i] + (Math.sin(seed + i * 7) * 0.01);
    data.push({
      year: currentYear - 4 + i,
      budget: Math.round(budget * (1 + variation) * 10) / 10,
      pct: Math.round(pct * (1 + variation * 0.5) * 100) / 100,
    });
  }
  return data;
}

/** Get top 5 countries by GDP in the same coalition */
function regionalPeers(country: Country, all?: Country[]): Country[] {
  if (!all || all.length === 0) return [];
  const coalition = country.coalition;
  const filtered = coalition
    ? all.filter((c) => c.coalition === coalition && c.isoCode !== country.isoCode)
    : all.filter((c) => c.side === country.side && c.isoCode !== country.isoCode);
  return filtered.sort((a, b) => b.gdpPppBn - a.gdpPppBn).slice(0, 5);
}

// Global average military budget per soldier (approx $70K)
const GLOBAL_AVG_BUDGET_PER_SOLDIER = 70000;

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

/** Single key-metric card */
function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'var(--color-tactical-primary)',
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="glass-panel rounded-lg p-4 flex flex-col gap-1.5 relative overflow-hidden group"
    >
      <div
        className="absolute top-0 left-0 w-0.5 h-full opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded" style={{ backgroundColor: `${accent}18` }}>
          <Icon size={14} style={{ color: accent }} />
        </div>
        <span className="text-[9px] font-bold tracking-[.2em] uppercase text-slate-500">
          {label}
        </span>
      </div>
      <p className="text-xl font-black font-mono tracking-tight" style={{ color: accent }}>
        {value}
      </p>
      {sub && (
        <p className="text-[9px] font-mono text-slate-500 tracking-wider">{sub}</p>
      )}
    </motion.div>
  );
}

interface TooltipEntry {
  color?: string;
  name?: string;
  value?: number | string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

/** Custom Recharts tooltip */
function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel rounded px-3 py-2 text-xs font-mono border border-white/10 shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('en') : p.value}
        </p>
      ))}
    </div>
  );
}

/** SVG Gauge Arc — military budget per soldier vs global average */
function EfficiencyGauge({ budget, personnel }: { budget: number; personnel: number }) {
  const svgId = React.useId().replace(/:/g, '');
  const perSoldier = personnel > 0 ? (budget * 1e9) / personnel : 0;
  const ratio = perSoldier / GLOBAL_AVG_BUDGET_PER_SOLDIER;
  // Clamp 0–2 for display
  const clamped = Math.min(ratio, 2);
  const pct = clamped / 2;

  // Arc parameters
  const radius = 58;
  const stroke = 8;
  const cx = 70;
  const cy = 70;
  const startAngle = 225;
  const endAngle = -45;
  const totalAngle = startAngle - endAngle;
  const fillAngle = startAngle - pct * totalAngle;

  const polarToCart = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) };
  };

  const arcPath = (a1: number, a2: number) => {
    const s = polarToCart(a1);
    const e = polarToCart(a2);
    const largeArc = Math.abs(a1 - a2) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 0 ${e.x} ${e.y}`;
  };

  const gaugeColor = ratio >= 1.5 ? '#22d3ee' : ratio >= 1 ? '#22c55e' : ratio >= 0.5 ? '#eab308' : '#ef4444';
  const label = ratio >= 1.5 ? 'Высокая' : ratio >= 1 ? 'Средняя' : ratio >= 0.5 ? 'Низкая' : 'Очень низкая';

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={cx * 2} height={cy + 16} viewBox={`0 0 ${cx * 2} ${cy + 16}`} aria-hidden="true">
        <defs>
          <linearGradient id={`${svgId}-efficiency`} x1="18" y1="28" x2="122" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor={gaugeColor} stopOpacity="0.35" />
            <stop offset="0.55" stopColor={gaugeColor} stopOpacity="1" />
            <stop offset="1" stopColor={gaugeColor} stopOpacity="0.65" />
          </linearGradient>
          <radialGradient id={`${svgId}-efficiency-core`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform={`translate(${cx} ${cy}) rotate(90) scale(64 36)`}>
            <stop stopColor={gaugeColor} stopOpacity="0.2" />
            <stop offset="1" stopColor={gaugeColor} stopOpacity="0" />
          </radialGradient>
          <filter id={`${svgId}-efficiency-glow`} x="-30%" y="-60%" width="160%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <ellipse cx={cx} cy={cy - 3} rx="64" ry="31" fill={`url(#${svgId}-efficiency-core)`} />
        {/* Background arc */}
        <path d={arcPath(startAngle, endAngle)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke + 2} strokeLinecap="round" />
        <path d={arcPath(startAngle, endAngle)} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="1" strokeLinecap="round" strokeDasharray="3 6" />
        {/* Filled arc */}
        {pct > 0 && (
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            d={arcPath(startAngle, fillAngle)}
            fill="none"
            stroke={`url(#${svgId}-efficiency)`}
            strokeWidth={stroke + 1}
            strokeLinecap="round"
            filter={`url(#${svgId}-efficiency-glow)`}
          />
        )}
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const angle = startAngle - tick * totalAngle;
          const rad = (angle * Math.PI) / 180;
          const x1 = cx + (radius - 4) * Math.cos(rad);
          const y1 = cy - (radius - 4) * Math.sin(rad);
          const x2 = cx + (radius + 5) * Math.cos(rad);
          const y2 = cy - (radius + 5) * Math.sin(rad);
          return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(148,163,184,0.34)" strokeWidth="1" />;
        })}
        {/* Center text */}
        <text x={cx} y={cy - 8} textAnchor="middle" fill={gaugeColor} fontSize="18" fontWeight="900" fontFamily="monospace" style={{ filter: `drop-shadow(0 0 6px ${gaugeColor}80)` }}>
          ${perSoldier >= 1000 ? `${(perSoldier / 1000).toFixed(0)}K` : perSoldier.toFixed(0)}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace" letterSpacing="0.12em">
          на военнослужащего
        </text>
      </svg>
      <div className="text-center">
        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: gaugeColor }}>
          {label} эффективность
        </p>
        <p className="text-[8px] font-mono text-slate-500 mt-1">
          Мировой средний: ${GLOBAL_AVG_BUDGET_PER_SOLDIER / 1000}K
        </p>
      </div>
    </div>
  );
}

/** Fiscal sustainability indicator block */
function FiscalIndicator({ pct }: { pct: number }) {
  const { label, color, level } = fiscalRating(pct);
  const barPct = Math.min(pct / 8, 1) * 100;

  return (
    <div className="glass-panel rounded-lg p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.04]" style={{ backgroundColor: color, filter: `blur(40px)` }} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={14} style={{ color }} />
          <span className="text-[10px] font-bold tracking-[.2em] uppercase text-slate-400">
            Фискальная устойчивость
          </span>
        </div>
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="text-xs font-black tracking-wider px-2.5 py-1 rounded"
          style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}40` }}
        >
          {label}
        </motion.span>
      </div>

      <div className="mb-2 text-[9px] font-mono uppercase tracking-widest text-slate-500">Уровень риска {level}/4</div>

      {/* Bar */}
      <div className="relative h-3 bg-white/5 rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${barPct}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}50` }}
        />
        {/* Threshold markers */}
        {[2, 3, 5].map((threshold) => (
          <div
            key={threshold}
            className="absolute top-0 h-full w-px bg-white/20"
            style={{ left: `${(threshold / 8) * 100}%` }}
          />
        ))}
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-[8px] font-mono text-slate-500">
        <span>0%</span>
        <span className="text-green-500">2%</span>
        <span className="text-yellow-500">3%</span>
        <span className="text-orange-500">5%</span>
        <span>8%+</span>
      </div>

      {/* Detail */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {([
          { range: '<2%', label: 'Устойчивый', clr: '#22c55e' },
          { range: '2–3%', label: 'Умеренный', clr: '#eab308' },
          { range: '3–5%', label: 'Высокий', clr: '#f97316' },
          { range: '>5%', label: 'Критический', clr: '#ef4444' },
        ] as const).map((tier) => (
          <div
            key={tier.range}
            className={cn(
              'p-2 rounded text-center border transition-all',
              tier.clr === color ? 'border-opacity-40' : 'border-white/5 opacity-40',
            )}
            style={{
              backgroundColor: tier.clr === color ? `${tier.clr}12` : 'transparent',
              borderColor: tier.clr === color ? `${tier.clr}40` : 'rgba(255,255,255,0.05)',
            }}
          >
            <p className="text-[9px] font-mono" style={{ color: tier.clr }}>{tier.range}</p>
            <p className="text-[8px] text-slate-500 mt-0.5">{tier.label}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[9px] font-mono text-slate-500">
        Оборонные расходы: <span className="font-bold" style={{ color }}>{pct.toFixed(1)}%</span> ВВП
      </p>
    </div>
  );
}

/** Regional comparison table */
function ComparisonTable({ country, peers }: { country: Country; peers: Country[] }) {
  if (peers.length === 0) {
    return (
      <div className="glass-panel rounded-lg p-6 text-center">
        <p className="text-slate-500 text-xs font-mono">Нет данных для сравнения</p>
      </div>
    );
  }

  const rows = [country, ...peers].map((c) => ({
    iso: c.isoCode,
    name: c.nameRu || c.name,
    gdp: c.gdpPppBn,
    budget: c.militaryBudgetBn,
    pct: c.defensePctGdp,
    pop: c.populationM,
    perSoldier: c.activePersonnel > 0 ? (c.militaryBudgetBn * 1e9) / c.activePersonnel : 0,
    isCurrent: c.isoCode === country.isoCode,
  }));

  const maxGdp = Math.max(...rows.map((r) => r.gdp), 1);

  return (
    <div className="glass-panel rounded-lg overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center gap-2">
        <TrendingUp size={14} className="text-tactical-primary" />
        <span className="text-[10px] font-bold tracking-[.2em] uppercase text-slate-400">
          Региональное сравнение
        </span>
        <span className="ml-auto text-[8px] font-mono text-slate-600">
          {country.coalition || country.side}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="border-b border-white/5 text-slate-500">
              <th className="text-left p-3 uppercase tracking-wider">Страна</th>
              <th className="text-right p-3 uppercase tracking-wider">ВВП (ППС)</th>
              <th className="text-right p-3 uppercase tracking-wider">Бюджет</th>
              <th className="text-right p-3 uppercase tracking-wider">% ВВП</th>
              <th className="text-right p-3 uppercase tracking-wider">$ / военносл.</th>
              <th className="p-3 uppercase tracking-wider w-24">ВВП шкала</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <motion.tr
                key={r.iso}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  'border-b border-white/5 transition-colors',
                  r.isCurrent ? 'bg-tactical-primary/[0.07]' : 'hover:bg-white/[0.03]',
                )}
              >
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {r.isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-tactical-primary animate-pulse" />
                    )}
                    <span className={r.isCurrent ? 'text-tactical-primary font-bold' : 'text-slate-300'}>
                      {r.name}
                    </span>
                  </div>
                </td>
                <td className="text-right p-3 text-slate-300">{fmtBn(r.gdp)}</td>
                <td className="text-right p-3 text-slate-300">{fmtBn(r.budget)}</td>
                <td className="text-right p-3">
                  <span style={{ color: defenseColor(r.pct) }} className="font-bold">
                    {r.pct.toFixed(1)}%
                  </span>
                </td>
                <td className="text-right p-3 text-slate-300">
                  ${r.perSoldier >= 1000 ? `${(r.perSoldier / 1000).toFixed(0)}K` : r.perSoldier.toFixed(0)}
                </td>
                <td className="p-3">
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(r.gdp / maxGdp) * 100}%`,
                        backgroundColor: r.isCurrent ? 'var(--color-tactical-primary)' : 'rgba(34,211,238,0.25)',
                      }}
                    />
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function EconomicsTab({ country, allCountries }: EconomicsTabProps) {
  // Derived values
  const gdpPerCapita = country.populationM > 0
    ? (country.gdpPppBn * 1e9) / (country.populationM * 1e6)
    : 0;

  const rank = useMemo(() => gdpRank(country, allCountries), [country, allCountries]);
  const peers = useMemo(() => regionalPeers(country, allCountries), [country, allCountries]);

  const trendData = useMemo(
    () => generateTrend(country.militaryBudgetBn, country.defensePctGdp),
    [country.militaryBudgetBn, country.defensePctGdp],
  );

  // Bar chart: military budget vs GDP
  const budgetVsGdpData = useMemo(() => {
    const militaryShare = country.gdpPppBn > 0
      ? (country.militaryBudgetBn / country.gdpPppBn) * 100
      : 0;
    return [
      { name: 'ВВП', value: country.gdpPppBn, fill: 'rgba(34,211,238,0.15)' },
      { name: `Оборонный ${militaryShare.toFixed(1)}%`, value: country.militaryBudgetBn, fill: 'var(--color-tactical-primary)' },
      { name: 'Гражданский', value: country.gdpPppBn - country.militaryBudgetBn, fill: 'rgba(34,211,238,0.08)' },
    ];
  }, [country.gdpPppBn, country.militaryBudgetBn]);

  // Budget change indicator
  const budgetChange = trendData.length >= 2
    ? ((trendData[trendData.length - 1].budget - trendData[trendData.length - 2].budget) /
        trendData[trendData.length - 2].budget) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* ─── SECTION: KEY METRICS ROW ─── */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-tactical-primary/40 to-transparent" />
          <span className="text-[9px] font-black tracking-[.3em] uppercase text-tactical-primary/60">
            Ключевые показатели
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-tactical-primary/40 to-transparent" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            icon={DollarSign}
            label="ВВП (ППС)"
            value={fmtBn(country.gdpPppBn)}
            sub={rank ? `Место в мире: #${rank}` : undefined}
            accent="var(--color-tactical-primary)"
            delay={0}
          />
          <MetricCard
            icon={Users}
            label="ВВП на душу"
            value={gdpPerCapita >= 1000 ? `$${(gdpPerCapita / 1000).toFixed(1)}K` : `$${gdpPerCapita.toFixed(0)}`}
            sub="ППС, текущ. цены"
            accent="#8b5cf6"
            delay={0.05}
          />
          <MetricCard
            icon={Shield}
            label="Оборонный бюджет"
            value={fmtBn(country.militaryBudgetBn)}
            sub={budgetChange !== 0 ? `${budgetChange > 0 ? '+' : ''}${budgetChange.toFixed(1)}% г/г` : undefined}
            accent="#0ea5e9"
            delay={0.1}
          />
          <MetricCard
            icon={AlertTriangle}
            label="% ВВП на оборону"
            value={`${country.defensePctGdp.toFixed(1)}%`}
            sub={country.defensePctGdp > 4 ? 'Выше порога НАТО' : country.defensePctGdp >= 2 ? 'В пределах нормы' : 'Ниже порога НАТО'}
            accent={defenseColor(country.defensePctGdp)}
            delay={0.15}
          />
          <MetricCard
            icon={Users}
            label="Население"
            value={fmtPop(country.populationM)}
            sub={`Активный состав: ${country.activePersonnel.toLocaleString('ru')}`}
            accent="#a78bfa"
            delay={0.2}
          />
          <MetricCard
            icon={Droplets}
            label="Добыча нефти"
            value={country.oilProductionKbd > 0 ? fmtOil(country.oilProductionKbd) : '—'}
            sub={country.oilProductionKbd > 0 ? 'баррелей / день' : 'Нет данных'}
            accent="#f59e0b"
            delay={0.25}
          />
        </div>
      </section>

      {/* ─── SECTION: CHARTS ROW ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Military Budget vs GDP */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="glass-panel rounded-lg p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-tactical-primary" />
              <span className="text-[10px] font-bold tracking-[.2em] uppercase text-slate-400">
                Оборонный бюджет vs ВВП
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-600">
              ППС, млрд $
            </span>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
              <BarChart data={budgetVsGdpData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 8, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => fmtBn(v)}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={60}>
                  {budgetVsGdpData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Proportion callout */}
          <div className="mt-3 flex items-center justify-between px-2 py-2 bg-white/[0.03] rounded border border-white/5">
            <span className="text-[9px] font-mono text-slate-500">Доля обороны в ВВП</span>
            <span className="text-sm font-black font-mono" style={{ color: defenseColor(country.defensePctGdp) }}>
              {country.defensePctGdp.toFixed(1)}%
            </span>
          </div>
        </motion.div>

        {/* Defense Spending Trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="glass-panel rounded-lg p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-tactical-primary" />
              <span className="text-[10px] font-bold tracking-[.2em] uppercase text-slate-400">
                Тренд оборонных расходов
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {budgetChange > 0 ? (
                <ArrowUpRight size={12} className="text-green-400" />
              ) : budgetChange < 0 ? (
                <ArrowDownRight size={12} className="text-red-400" />
              ) : (
                <Minus size={12} className="text-slate-500" />
              )}
              <span
                className={cn(
                  'text-[10px] font-bold font-mono',
                  budgetChange > 0 ? 'text-green-400' : budgetChange < 0 ? 'text-red-400' : 'text-slate-500',
                )}
              >
                {budgetChange > 0 ? '+' : ''}{budgetChange.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-tactical-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-tactical-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 8, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v}B`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="budget"
                  name="Бюджет ($B)"
                  stroke="var(--color-tactical-primary)"
                  strokeWidth={2}
                  fill="url(#budgetGradient)"
                  dot={{ fill: 'var(--color-tactical-primary)', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: 'var(--color-tactical-primary)', stroke: '#0e1520', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Year range */}
          <div className="mt-3 flex items-center justify-between px-2 py-2 bg-white/[0.03] rounded border border-white/5">
            <span className="text-[9px] font-mono text-slate-500">5-летний тренд</span>
            <span className="text-[9px] font-mono text-slate-400">
              {trendData[0]?.year} – {trendData[trendData.length - 1]?.year}
            </span>
          </div>
        </motion.div>
      </section>

      {/* ─── SECTION: GAUGE + FISCAL ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Economic Efficiency Gauge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="glass-panel rounded-lg p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Gauge size={14} className="text-tactical-primary" />
            <span className="text-[10px] font-bold tracking-[.2em] uppercase text-slate-400">
              Экономическая эффективность
            </span>
          </div>

          <div className="flex flex-col items-center">
            <EfficiencyGauge budget={country.militaryBudgetBn} personnel={country.activePersonnel} />

            {/* Comparison bar */}
            <div className="w-full mt-5 space-y-2">
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-slate-500">{country.nameRu || country.name}</span>
                <span className="text-tactical-primary font-bold">
                  ${((country.militaryBudgetBn * 1e9) / Math.max(country.activePersonnel, 1) / 1000).toFixed(0)}K
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(
                      ((country.militaryBudgetBn * 1e9) / Math.max(country.activePersonnel, 1)) /
                        (GLOBAL_AVG_BUDGET_PER_SOLDIER * 3) * 100,
                      100,
                    )}%`,
                  }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
                  className="h-full bg-tactical-primary rounded-full"
                />
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-slate-600">Мировой средний</span>
                <span className="text-slate-400">${GLOBAL_AVG_BUDGET_PER_SOLDIER / 1000}K</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-500/50 rounded-full"
                  style={{
                    width: `${Math.min(
                      (GLOBAL_AVG_BUDGET_PER_SOLDIER / (GLOBAL_AVG_BUDGET_PER_SOLDIER * 3)) * 100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Stat detail */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] rounded p-2.5 border border-white/5">
              <p className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Оборонный бюджет</p>
              <p className="text-xs font-black font-mono text-tactical-primary mt-0.5">
                {fmtBn(country.militaryBudgetBn)}
              </p>
            </div>
            <div className="bg-white/[0.03] rounded p-2.5 border border-white/5">
              <p className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Активный состав</p>
              <p className="text-xs font-black font-mono text-slate-300 mt-0.5">
                {country.activePersonnel.toLocaleString('ru')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Fiscal Sustainability */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <FiscalIndicator pct={country.defensePctGdp} />
        </motion.div>
      </section>

      {/* ─── SECTION: REGIONAL COMPARISON TABLE ─── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        <ComparisonTable country={country} peers={peers} />
      </motion.section>

      {/* ─── FOOTER: ADDITIONAL METADATA ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="glass-panel rounded-lg p-4 flex flex-wrap gap-x-8 gap-y-2"
      >
        <MetaItem label="Код ISO" value={country.isoCode} />
        <MetaItem label="Сторона" value={country.side} />
        <MetaItem label="Коалиция" value={country.coalition || '—'} />
        <MetaItem label="Площадь" value={`${(country.areaKm2 / 1000).toFixed(0)}K км²`} />
        <MetaItem label="Береговая линия" value={`${country.coastlineKm.toLocaleString('ru')} км`} />
        <MetaItem label="Порты" value={String(country.ports)} />
        <MetaItem label="Аэродромы" value={String(country.airfields)} />
        <MetaItem label="Торговый флот" value={String(country.merchantFleet)} />
        <MetaItem label="Тех. уровень" value={`${country.techLevel}/10`} />
        <MetaItem label="Обновлено" value={country.updatedAt} />
      </motion.div>
    </div>
  );
}

/** Small metadata label-value pair */
function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-slate-600 uppercase tracking-wider">{label}</span>
      <span className="text-[9px] font-mono text-slate-400">{value}</span>
    </div>
  );
}
