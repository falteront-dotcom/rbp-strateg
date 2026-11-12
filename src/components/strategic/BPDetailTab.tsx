"use client";

import { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { motion } from "framer-motion";
import { getBPTierHex, getBPTierKey } from "@/lib/bp/tiers";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CountryData {
  isoCode: string;
  nameRu: string;
  side: string;
  bpTotal: number;
  bpRank: number;
  weaponScore: number;
  manpowerScore: number;
  logisticsScore: number;
  c2Score: number;
  economyScore: number;
  doctrineScore: number;
  readinessScore: number;
  terrainScore: number;
  // Sub-factors for Weapons
  tanks?: number;
  aircraft?: number;
  helicopters?: number;
  navyShips?: number;
  submarines?: number;
  artillery?: number;
  mlrs?: number;
  samSystems?: number;
  nuclearWarheads?: number;
  // Sub-factors for Manpower
  activePersonnel?: number;
  reservePersonnel?: number;
  paramilitary?: number;
  // Sub-factors for Economy
  gdp?: number;
  militaryBudget?: number;
  defensePercentGDP?: number;
  // Sub-factors for Logistics
  airports?: number;
  majorPorts?: number;
  roadways?: number;
  railways?: number;
  merchantMarine?: number;
}

interface BPDetailTabProps {
  country: CountryData;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const COMPONENTS = [
  { key: "weaponScore", letter: "W", name: "Оружие", weight: 0.20, color: "#8aa89b" },
  { key: "manpowerScore", letter: "M", name: "Люди", weight: 0.15, color: "#8aa89b" },
  { key: "logisticsScore", letter: "L", name: "Логистика", weight: 0.12, color: "#8aa89b" },
  { key: "c2Score", letter: "C2", name: "Управление", weight: 0.10, color: "#8aa89b" },
  { key: "economyScore", letter: "E", name: "Экономика", weight: 0.15, color: "#8aa89b" },
  { key: "doctrineScore", letter: "D", name: "Доктрина", weight: 0.08, color: "#8aa89b" },
  { key: "readinessScore", letter: "R", name: "Боеготовность", weight: 0.10, color: "#8aa89b" },
  { key: "terrainScore", letter: "T", name: "География", weight: 0.10, color: "#8aa89b" },
] as const;

const TIER_MAP: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: "КРИТИЧЕСКИЙ", color: "text-red-400", bg: "bg-red-500/20 border-red-500/40" },
  HIGH: { label: "ВЫСОКИЙ", color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/40" },
  MODERATE: { label: "СРЕДНИЙ", color: "text-teal-400", bg: "bg-teal-500/20 border-teal-500/40" },
  LOW: { label: "НИЗКИЙ", color: "text-cyan-400", bg: "bg-cyan-500/20 border-cyan-500/40" },
  MINIMAL: { label: "МИНИМАЛЬНЫЙ", color: "text-slate-400", bg: "bg-slate-500/20 border-slate-500/40" },
};

const SIDE_COLORS: Record<string, string> = {
  // Цвет альянса — из токена продукта (tactical-nato), а не отдельный
  // приглушённый синий: на приподнятой поверхности старый давал 4.08:1
  // при требуемых 4.5:1, токен даёт 5.06:1 и совпадает с картой.
  NATO: "#5b9cf4",
  CSTO: "#ef4444",
  BRICS: "#f59e0b",
  AUKUS: "#4fb287",
  UKR: "#eab308",
  NEUTRAL: "#94a3a4",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Tier classification is delegated to the shared canonical tiers module.
function getTier(score: number): keyof typeof TIER_MAP {
  return getBPTierKey(score);
}

// Цвет БП — из канонической шкалы тиров (та же, что на карте и в легенде):
// 97.6 КРИТИЧЕСКИЙ обязан быть тем же цветом, что и конец шкалы легенды,
// а не зелёным «всё хорошо».
function scoreToColor(score: number): string {
  return getBPTierHex(score);
}

function scoreBarGradient(score: number): string {
  const pct = Math.min(100, Math.max(0, score));
  const color = getBPTierHex(score);
  return `linear-gradient(90deg, ${color} 0%, ${color} ${pct}%, #16241a ${pct}%)`;
}

function getWeaponSubFactors(c: CountryData): { label: string; value: number }[] {
  return [
    { label: "Танки", value: c.tanks ?? 0 },
    { label: "Авиация", value: c.aircraft ?? 0 },
    { label: "ВМФ", value: c.navyShips ?? 0 },
    { label: "Артиллерия", value: c.artillery ?? 0 },
    { label: "РСЗО", value: c.mlrs ?? 0 },
    { label: "ПВО", value: c.samSystems ?? 0 },
    { label: "ЯО", value: c.nuclearWarheads ?? 0 },
  ];
}

function getManpowerSubFactors(c: CountryData): { label: string; value: number }[] {
  return [
    { label: "Активный состав", value: c.activePersonnel ?? 0 },
    { label: "Резерв", value: c.reservePersonnel ?? 0 },
    { label: "Парамилитарные", value: c.paramilitary ?? 0 },
  ];
}

function getLogisticsSubFactors(c: CountryData): { label: string; value: number }[] {
  return [
    { label: "Аэропорты", value: c.airports ?? 0 },
    { label: "Порты", value: c.majorPorts ?? 0 },
    { label: "Автодороги (км)", value: c.roadways ?? 0 },
    { label: "Ж/Д (км)", value: c.railways ?? 0 },
    { label: "Торговый флот", value: c.merchantMarine ?? 0 },
  ];
}

function getEconomySubFactors(c: CountryData): { label: string; value: number; formatted: string }[] {
  return [
    { label: "ВВП (ППС)", value: c.gdp ?? 0, formatted: `$${((c.gdp ?? 0) / 1e9).toFixed(1)} млрд` },
    { label: "Военный бюджет", value: c.militaryBudget ?? 0, formatted: `$${((c.militaryBudget ?? 0) / 1e9).toFixed(1)} млрд` },
    { label: "Оборона % ВВП", value: c.defensePercentGDP ?? 0, formatted: `${(c.defensePercentGDP ?? 0).toFixed(1)}%` },
  ];
}

// ─── Component ───────────────────────────────────────────────────────────────
export function BPDetailTab({ country }: BPDetailTabProps) {
  const rawBp = country.bpTotal;
  const safeBp = typeof rawBp === "number" && isFinite(rawBp) ? rawBp : 0;
  const tier = getTier(safeBp);
  const tierInfo = TIER_MAP[tier];

  // Radar chart data
  const radarData = useMemo(
    () =>
      COMPONENTS.map((comp) => {
        const raw = country[comp.key] as number | null | undefined;
        return {
          component: comp.letter,
          fullName: comp.name,
          score: typeof raw === "number" && isFinite(raw) ? raw : 0,
          fullMark: 100,
        };
      }),
    [country]
  );

  // Weight pie chart data
  const weightData = useMemo(
    () =>
      COMPONENTS.map((comp) => ({
        name: `${comp.letter} · ${comp.name}`,
        value: comp.weight * 100,
        color: comp.color,
      })),
    []
  );

  // Strengths & Weaknesses
  const analysis = useMemo(() => {
    const scored = COMPONENTS.map((comp) => {
      const raw = country[comp.key] as number | null | undefined;
      return { ...comp, score: typeof raw === "number" && isFinite(raw) ? raw : 0 };
    });
    const sorted = [...scored].sort((a, b) => b.score - a.score);
    const strengths = sorted.slice(0, 3);
    const weaknesses = sorted.slice(-3).reverse();
    return { strengths, weaknesses };
  }, [country]);

  return (
    <div className="space-y-4 font-mono">
      {/* ─── Overall Score Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-lg p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-tactical-primary tracking-tighter">
              {safeBp.toFixed(1)}
            </span>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 tracking-wider uppercase">
                Боевой Потенциал
              </span>
              <span className="text-[10px] text-slate-500">
                Рейтинг: #{country.bpRank}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 text-[10px] font-bold tracking-widest border rounded ${tierInfo.bg} ${tierInfo.color}`}
            >
              {tierInfo.label}
            </span>
            <span
              className="px-2 py-0.5 text-[10px] font-bold tracking-widest rounded border"
              style={{
                borderColor: SIDE_COLORS[country.side] ?? "#647a7244",
                color: SIDE_COLORS[country.side] ?? "#94a3a4",
                backgroundColor: `${SIDE_COLORS[country.side] ?? "#647a72"}20`,
              }}
            >
              {country.side}
            </span>
          </div>
        </div>
        {/* BP Score bar */}
        <div className="h-2 rounded-full overflow-hidden" style={{ background: scoreBarGradient(safeBp) }} />
      </motion.div>

      {/* ─── 8 Component Cards Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        {COMPONENTS.map((comp, idx) => {
          const rawScore = country[comp.key] as number | null | undefined;
          const score = typeof rawScore === "number" && isFinite(rawScore) ? rawScore : 0;
          return (
            <motion.div
              key={comp.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel rounded-md p-3 space-y-2"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider" style={{ color: comp.color }}>
                  {comp.letter} · {comp.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                  {(comp.weight * 100).toFixed(0)}%
                </span>
              </div>

              {/* Score */}
              <div className="flex items-end gap-1">
                <span className="text-lg font-bold" style={{ color: scoreToColor(score) }}>
                  {score.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 pb-0.5">/100</span>
              </div>

              {/* Bar */}
              <div className="h-1.5 rounded-full overflow-hidden bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, score)}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.05 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: scoreToColor(score) }}
                />
              </div>

              {/* Sub-factors */}
              <SubFactorList component={comp.letter} country={country} />
            </motion.div>
          );
        })}
      </div>

      {/* ─── Radar Chart ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-panel rounded-lg p-4"
      >
        <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-3">
          ◈ Профиль БП
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="#1e293b" />
            <PolarAngleAxis
              dataKey="component"
              tick={{ fill: "#94a3a4", fontSize: 11, fontWeight: "bold" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "#47584c", fontSize: 10 }}
            />
            <Radar
              name={country.nameRu}
              dataKey="score"
              stroke="#6bb995"
              fill="#6bb995"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0e1710ee",
                border: "1px solid #4fb28740",
                borderRadius: 8,
                fontSize: 11,
                fontFamily: "monospace",
              }}
              formatter={((value: number) => [`${Number(value).toFixed(1)}`, "Оценка"]) as any}
              labelFormatter={(label: unknown) => {
                const lbl = String(label);
                const comp = COMPONENTS.find((c) => c.letter === lbl);
                return comp ? `${comp.letter} · ${comp.name}` : lbl;
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ─── Weight Distribution Pie ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="glass-panel rounded-lg p-4"
      >
        <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-3">
          ◈ Распределение весов
        </h3>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={180}>
            <PieChart>
              <Pie
                data={weightData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {weightData.map((entry, idx) => (
                  <Cell key={idx} fill={`hsl(210, 12%, ${40 + idx * 5}%)`} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0e1710ee",
                  border: "1px solid #4fb28740",
                  borderRadius: 8,
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
                formatter={((value: number) => [`${Number(value).toFixed(0)}%`, "Вес"]) as any}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1">
            {weightData.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[10px]">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-400 truncate flex-1">{entry.name}</span>
                <span className="text-slate-300">{entry.value.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ─── Strengths & Weaknesses ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="glass-panel rounded-lg p-4"
      >
        <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-3">
          ◈ Сильные и слабые стороны
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Strengths */}
          <div>
            <h4 className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase mb-2">
              ▲ Сильные стороны
            </h4>
            <div className="space-y-1.5">
              {analysis.strengths.map((comp) => (
                <div key={comp.key} className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">
                    {comp.letter} · {comp.name}
                  </span>
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: scoreToColor(comp.score) }}
                  >
                    {comp.score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Weaknesses */}
          <div>
            <h4 className="text-[10px] font-bold text-red-400 tracking-widest uppercase mb-2">
              ▼ Слабые стороны
            </h4>
            <div className="space-y-1.5">
              {analysis.weaknesses.map((comp) => (
                <div key={comp.key} className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">
                    {comp.letter} · {comp.name}
                  </span>
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: scoreToColor(comp.score) }}
                  >
                    {comp.score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analysis text */}
        <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-slate-400 leading-relaxed">
          <p>
            <span className="text-tactical-primary">{country.nameRu}</span> занимает{" "}
            <span className="text-white font-bold">#{country.bpRank}</span> место в мировом рейтинге БП.
            Наибольший вклад вносит компонент{" "}
            <span className="text-tactical-primary font-semibold">
              {analysis.strengths[0].letter} ({analysis.strengths[0].name})
            </span>
            , а наименее развит —{" "}
            <span className="text-tactical-primary font-semibold">
              {analysis.weaknesses[0].letter} ({analysis.weaknesses[0].name})
            </span>
            .
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── SubFactorList ────────────────────────────────────────────────────────────
function SubFactorList({ component, country }: { component: string; country: CountryData }) {
  let factors: { label: string; value: number; formatted?: string }[] = [];

  switch (component) {
    case "W":
      factors = getWeaponSubFactors(country).map((f) => ({
        label: f.label,
        value: f.value,
        formatted: f.value >= 1000 ? `${(f.value / 1000).toFixed(1)} тыс.` : f.value > 0 ? String(f.value) : "—",
      }));
      break;
    case "M":
      factors = getManpowerSubFactors(country).map((f) => ({
        label: f.label,
        value: f.value,
        formatted: f.value > 0 ? (f.value >= 1000000 ? `${(f.value / 1e6).toFixed(1)} млн` : f.value >= 1000 ? `${(f.value / 1e3).toFixed(0)} тыс.` : String(f.value)) : "—",
      }));
      break;
    case "L":
      factors = getLogisticsSubFactors(country).map((f) => ({
        label: f.label,
        value: f.value,
        formatted: f.value > 0 ? (f.value >= 10000 ? `${(f.value / 1000).toFixed(0)} тыс.` : String(f.value)) : "—",
      }));
      break;
    case "E":
      factors = getEconomySubFactors(country).map((f) => ({
        label: f.label,
        value: f.value,
        formatted: f.value > 0 ? f.formatted : "—",
      }));
      break;
    case "C2":
      factors = [
        { label: "C4ISR", value: country.c2Score * 0.3 },
        { label: "РЭБ", value: country.c2Score * 0.25 },
        { label: "Кибер", value: country.c2Score * 0.2 },
        { label: "Мораль", value: country.c2Score * 0.25 },
      ].map((f) => ({ ...f, formatted: f.value.toFixed(1) }));
      break;
    case "D":
      factors = [
        { label: "Позиция", value: country.doctrineScore * 0.3 },
        { label: "Альянс", value: country.doctrineScore * 0.3 },
        { label: "Опыт", value: country.doctrineScore * 0.25 },
        { label: "Модерн.", value: country.doctrineScore * 0.15 },
      ].map((f) => ({ ...f, formatted: f.value.toFixed(1) }));
      break;
    case "R":
      factors = [
        { label: "Актив/Резерв", value: country.readinessScore * 0.3 },
        { label: "Модернизация", value: country.readinessScore * 0.3 },
        { label: "Учения", value: country.readinessScore * 0.2 },
        { label: "Снабжение", value: country.readinessScore * 0.2 },
      ].map((f) => ({ ...f, formatted: f.value.toFixed(1) }));
      break;
    case "T":
      factors = [
        { label: "Площадь", value: country.terrainScore * 0.25 },
        { label: "Границы", value: country.terrainScore * 0.25 },
        { label: "Побережье", value: country.terrainScore * 0.25 },
        { label: "Глубина", value: country.terrainScore * 0.25 },
      ].map((f) => ({ ...f, formatted: f.value.toFixed(1) }));
      break;
  }

  if (factors.length === 0) return null;

  return (
    <div className="space-y-0.5 mt-1">
      {factors.slice(0, 4).map((f, idx) => (
        <div key={idx} className="flex items-center justify-between text-[10px]">
          <span className="text-slate-500">{f.label}</span>
          <span className="text-slate-400">{f.formatted ?? f.value}</span>
        </div>
      ))}
      {factors.length > 4 && (
        <span className="text-[10px] text-slate-600">+{factors.length - 4} ещё</span>
      )}
    </div>
  );
}
