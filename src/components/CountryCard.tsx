"use client";

import { useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { X, GitCompareArrows, Shield, Users, Fuel, Radio, Landmark, BookOpen, AlertCircle, Mountain } from "lucide-react";

/** 8 BP components with Russian labels and icons */
const BP_COMPONENTS_META: ReadonlyArray<{
  key: string;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: "bpWeapon", label: "Оружие", icon: <Shield size={12} /> },
  { key: "bpManpower", label: "Личный Состав", icon: <Users size={12} /> },
  { key: "bpLogistics", label: "Логистика", icon: <Fuel size={12} /> },
  { key: "bpC2", label: "Управление", icon: <Radio size={12} /> },
  { key: "bpEconomy", label: "Экономика", icon: <Landmark size={12} /> },
  { key: "bpDoctrine", label: "Доктрина", icon: <BookOpen size={12} /> },
  { key: "bpReadiness", label: "Готовность", icon: <AlertCircle size={12} /> },
  { key: "bpTerrain", label: "География", icon: <Mountain size={12} /> },
];

/** Country data shape matching the API response */
interface CountryData {
  isoCode: string;
  name: string;
  nameRu: string;
  side: string;
  coalition: string | null;
  region: string;

  areaKm2: number;
  coastlineKm: number;

  gdpPppBn: number;
  militaryBudgetBn: number;
  defensePctGdp: number;

  populationM: number;
  activePersonnel: number;
  reservePersonnel: number;

  totalTanks: number;
  totalAfv: number;
  totalArtillery: number;
  totalAircraft: number;
  totalNavy: number;
  submarines: number;
  nuclearWarheads: number;

  ports: number;
  airfields: number;
  oilProductionKbd: number;

  techLevel: number;
  moraleIndex: number;
  combatExperience: number;
  c2Capability: number;
  ewCapability: number;

  bpTotal: number;
  bpWeapon: number;
  bpManpower: number;
  bpLogistics: number;
  bpC2: number;
  bpEconomy: number;
  bpDoctrine: number;
  bpReadiness: number;
  bpTerrain: number;
  bpRank: number;
}

interface CountryCardProps {
  country: CountryData;
  onClose: () => void;
  onCompare: (isoCode: string) => void;
}

/** Convert ISO-3166-1 alpha-3 code to flag emoji */
function isoToFlag(iso: string): string {
  const ISO3_TO_ISO2: Record<string, string> = {
    USA: "US", RUS: "RU", CHN: "CN", IND: "IN", GBR: "GB", FRA: "FR", JPN: "JP", KOR: "KR",
    ITA: "IT", DEU: "DE", TUR: "TR", BRA: "BR", PAK: "PK", EGY: "EG", ISR: "IL", IDN: "ID",
    AUS: "AU", CAN: "CA", UKR: "UA", SAU: "SA", IRN: "IR", PRK: "KP", POL: "PL", ESP: "ES",
    NLD: "NL", THA: "TH", VNM: "VN", TWN: "TW", SGP: "SG", MYS: "MY", PHI: "PH", NZL: "NZ",
    NOR: "NO", SWE: "SE", FIN: "FI", GRC: "GR", CHE: "CH", AUT: "AT", BEL: "BE", CZE: "CZ",
    PRT: "PT", ROU: "RO", HUN: "HU", BGR: "BG", SRB: "RS", HRV: "HR", SVK: "SK", SVN: "SI",
    LTU: "LT", LVA: "LV", EST: "EE", BLR: "BY", ARM: "AM", KAZ: "KZ", KGZ: "KG", TJK: "TJ",
    ZAF: "ZA", ETH: "ET", ARE: "AE",
  };
  const iso2 = ISO3_TO_ISO2[iso.toUpperCase()];
  if (!iso2) return "🏳️";
  const base = 0x1f1e6;
  return String.fromCodePoint(...iso2.split("").map((ch) => base + ch.charCodeAt(0) - 65));
}

/** Get BP tier color based on score */
function getBPTierColor(score: number): string {
  if (score >= 80) return "text-red-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-teal-400";
  if (score >= 20) return "text-cyan-400";
  return "text-slate-400";
}

/** Get BP tier label */
function getBPTierLabel(score: number): string {
  if (score >= 80) return "КРИТИЧЕСКИЙ";
  if (score >= 60) return "ВЫСОКИЙ";
  if (score >= 40) return "СРЕДНИЙ";
  if (score >= 20) return "НИЗКИЙ";
  return "МИНИМАЛЬНЫЙ";
}

/** Format large numbers with K/M/B suffixes */
function formatLargeNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function CountryCard({ country, onClose, onCompare }: CountryCardProps) {
  /** Build radar chart data from BP components */
  const radarData = useMemo(
    () =>
      BP_COMPONENTS_META.map((meta) => ({
        component: meta.label,
        value: country[meta.key as keyof CountryData] as number,
        fullMark: 100,
      })),
    [country],
  );

  /** Key metrics for the grid */
  const keyMetrics = useMemo(
    () => [
      { label: "Население", value: `${formatLargeNumber(country.populationM)}M`, accent: false },
      { label: "ВВП (ППС)", value: `$${formatLargeNumber(country.gdpPppBn)}B`, accent: false },
      { label: "Воен. Бюджет", value: `$${formatLargeNumber(country.militaryBudgetBn)}B`, accent: true },
      { label: "Актив. Состав", value: formatLargeNumber(country.activePersonnel), accent: false },
      { label: "Танки", value: formatLargeNumber(country.totalTanks), accent: false },
      { label: "Авиация", value: formatLargeNumber(country.totalAircraft), accent: false },
      { label: "Флот", value: formatLargeNumber(country.totalNavy), accent: false },
      { label: "Ядерные БГ", value: formatLargeNumber(country.nuclearWarheads), accent: country.nuclearWarheads > 0 },
    ],
    [country],
  );

  const handleClose = useCallback(() => onClose(), [onClose]);
  const handleCompare = useCallback(
    () => onCompare(country.isoCode),
    [onCompare, country.isoCode],
  );

  const tierColor = getBPTierColor(country.bpTotal);
  const tierLabel = getBPTierLabel(country.bpTotal);

  /** Side badge color */
  const sideColor: Record<string, string> = {
    NATO: "text-tactical-nato border-tactical-nato/40 bg-tactical-nato/10",
    RUS: "text-tactical-rus border-tactical-rus/40 bg-tactical-rus/10",
    CHINA: "text-tactical-china border-tactical-china/40 bg-tactical-china/10",
    UKR: "text-tactical-ukr border-tactical-ukr/40 bg-tactical-ukr/10",
    NEUTRAL: "text-slate-400 border-slate-400/40 bg-slate-400/10",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 60 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="h-full flex flex-col font-mono"
      >
        {/* ─── Header ─── */}
        <div className="glass-panel rounded-t-lg p-4 border-b border-white/5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl leading-none">{isoToFlag(country.isoCode)}</span>
              <div>
                <h2 className="text-base font-bold text-tactical-primary tracking-wider uppercase leading-tight">
                  {country.nameRu}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded border ${sideColor[country.side] ?? sideColor.NEUTRAL}`}
                  >
                    {country.side}
                  </span>
                  {country.coalition && (
                    <span className="text-[9px] text-tactical-secondary/70 tracking-wider">
                      {country.coalition}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 text-white/40 hover:text-tactical-primary transition-colors cursor-pointer"
              aria-label="Close country card"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ─── BP Score ─── */}
        <div className="glass-panel p-4 border-b border-white/5">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase mb-1">
                Боевой Потенциал
              </div>
              <div className="flex items-baseline gap-3">
                <span
                  className={`text-4xl font-black tabular-nums tracking-tight ${tierColor}`}
                  style={{
                    textShadow: `0 0 20px currentColor`,
                  }}
                >
                  {country.bpTotal.toFixed(1)}
                </span>
                <span className={`text-[10px] font-bold tracking-widest ${tierColor}`}>
                  {tierLabel}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase">
                Ранг
              </div>
              <div className="text-xl font-black text-tactical-primary tabular-nums">
                #{country.bpRank}
              </div>
            </div>
          </div>

          {/* BP progress bar */}
          <div className="mt-3 h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 via-yellow-400 to-red-400 transition-all duration-700"
              style={{ width: `${Math.min(country.bpTotal, 100)}%` }}
            />
          </div>
        </div>

        {/* ─── Radar Chart ─── */}
        <div className="glass-panel p-4 border-b border-white/5">
          <div className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase mb-2">
            Профиль Компонентов
          </div>
          <div className="flex h-56 w-full items-center justify-center overflow-hidden">
            <RadarChart width={330} height={224} data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid
                stroke="oklch(100% 0 0 / 8%)"
                strokeDasharray="2 4"
              />
              <PolarAngleAxis
                dataKey="component"
                tick={{
                  fill: "oklch(75% 0.18 200 / 70%)",
                  fontSize: 8,
                  fontFamily: "var(--font-mono)",
                }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                name="БП"
                dataKey="value"
                stroke="oklch(75% 0.18 200)"
                fill="oklch(75% 0.18 200 / 20%)"
                strokeWidth={1.5}
                dot={{
                  r: 2,
                  fill: "oklch(75% 0.18 200)",
                }}
              />
            </RadarChart>
          </div>
        </div>

        {/* ─── Component Scores Mini Grid ─── */}
        <div className="glass-panel p-3 border-b border-white/5">
          <div className="grid grid-cols-4 gap-1.5">
            {BP_COMPONENTS_META.map((meta) => {
              const val = country[meta.key as keyof CountryData] as number;
              return (
                <div
                  key={meta.key}
                  className="bg-white/5 rounded p-1.5 flex flex-col items-center border border-white/5"
                >
                  <span className="text-tactical-primary/50 mb-0.5">{meta.icon}</span>
                  <span
                    className={`text-[10px] font-bold tabular-nums ${getBPTierColor(val)}`}
                  >
                    {val.toFixed(1)}
                  </span>
                  <span className="text-[7px] text-tactical-secondary/40 tracking-wider uppercase truncate w-full text-center">
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Key Metrics Grid ─── */}
        <div className="glass-panel p-3 border-b border-white/5">
          <div className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase mb-2">
            Ключевые Показатели
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {keyMetrics.map((metric) => (
              <div
                key={metric.label}
                className="flex justify-between items-center bg-white/5 px-2 py-1.5 rounded border border-white/5"
              >
                <span className="text-[8px] text-tactical-secondary/50 tracking-wider uppercase">
                  {metric.label}
                </span>
                <span
                  className={`text-[10px] font-bold tabular-nums ${
                    metric.accent ? "text-tactical-accent" : "text-white/80"
                  }`}
                >
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Qualitative Scores ─── */}
        <div className="glass-panel p-3 border-b border-white/5">
          <div className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase mb-2">
            Качественные Оценки
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { label: "Тех.", value: country.techLevel },
              { label: "Мораль", value: country.moraleIndex },
              { label: "Опыт", value: country.combatExperience },
              { label: "ЦУР", value: country.c2Capability },
              { label: "РЭБ", value: country.ewCapability },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center bg-white/5 px-1 py-1.5 rounded border border-white/5"
              >
                <span className="text-[10px] font-bold text-tactical-primary tabular-nums">
                  {item.value}/10
                </span>
                <span className="text-[6px] text-tactical-secondary/40 tracking-wider uppercase">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Data Quality ─── */}
        <div className="px-4 pb-2">
          <div className="text-[9px] tracking-[0.2em] text-tactical-primary/40 uppercase font-mono mb-1.5">
            Источники данных
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {(() => {
                const hasWB = (country.gdpPppBn > 0) || (country.militaryBudgetBn > 0);
                const hasGFP = (country.totalTanks > 0) || (country.totalAircraft > 0) || (country.totalNavy > 0);
                const hasFAS = (country.nuclearWarheads > 0);
                const score = (hasWB ? 2 : 0) + (hasGFP ? 2 : 0) + (hasFAS ? 1 : 0);
                return (
                  <>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${hasWB ? 'border-blue-400/30 bg-blue-400/10 text-blue-400' : 'border-white/5 bg-white/5 text-white/20'}`} title="World Bank API">WB</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${hasGFP ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400' : 'border-white/5 bg-white/5 text-white/20'}`} title="Global Firepower">GFP</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${hasFAS ? 'border-red-400/30 bg-red-400/10 text-red-400' : 'border-white/5 bg-white/5 text-white/20'}`} title="FAS Nuclear Notebook">FAS</span>
                    <span className="text-[9px] font-mono text-white/30 ml-1">
                      {'★'.repeat(score)}{'☆'.repeat(5 - score)}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ─── Actions ─── */}
        <div className="mt-auto p-4 flex gap-2">
          <button
            onClick={handleCompare}
            className="flex-1 py-2.5 bg-tactical-accent/10 hover:bg-tactical-accent/20 border border-tactical-accent/30 text-tactical-accent font-bold tracking-widest text-[10px] rounded-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer uppercase"
          >
            <GitCompareArrows size={14} />
            Сравнить
          </button>
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-bold tracking-widest text-[10px] rounded-md transition-all duration-200 cursor-pointer uppercase"
          >
            Закрыть
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CountryCard;
