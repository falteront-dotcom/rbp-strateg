"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Shield,
  Swords,
  Users,
  Clock,
  Zap,
  BookOpen,
  Radio,
  Globe,
  Target,
  Landmark,
  Radiation,
  ChevronRight,
  Activity,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirrors CountryData from CountryCard.tsx + API
// ─────────────────────────────────────────────────────────────────────────────

interface CountryData {
  isoCode: string;
  name: string;
  nameRu: string;
  side: string;
  coalition: string | null;

  areaKm2: number;
  coastlineKm: number;
  climateZone: string;

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
  totalHelicopters: number;
  totalNavy: number;
  submarines: number;
  nuclearWarheads: number;

  ports: number;
  airfields: number;
  oilProductionKbd: number;
  merchantFleet: number;

  techLevel: number;
  moraleIndex: number;
  combatExperience: number;
  c2Capability: number;
  ewCapability: number;

  bpTotal: number;
  bpDoctrine: number;
}

interface DoctrineTabProps {
  country: CountryData;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hardcoded combat experience data — major conflicts last 50 years
// ─────────────────────────────────────────────────────────────────────────────

interface ConflictRecord {
  name: string;
  year: number;
  type: "conventional" | "asymmetric" | "peacekeeping" | "civil" | "proxy";
}

const COMBAT_HISTORY: Record<string, ConflictRecord[]> = {
  USA: [
    { name: "Вьетнам", year: 1965, type: "conventional" },
    { name: "Гренада", year: 1983, type: "conventional" },
    { name: "Панама", year: 1989, type: "conventional" },
    { name: "Война в Заливе", year: 1991, type: "conventional" },
    { name: "Сомали", year: 1993, type: "asymmetric" },
    { name: "Косово", year: 1999, type: "conventional" },
    { name: "Афганистан", year: 2001, type: "asymmetric" },
    { name: "Ирак", year: 2003, type: "conventional" },
    { name: "Ливия", year: 2011, type: "conventional" },
    { name: "Сирия", year: 2014, type: "asymmetric" },
  ],
  RUS: [
    { name: "Афганистан", year: 1979, type: "asymmetric" },
    { name: "Чечня I", year: 1994, type: "asymmetric" },
    { name: "Чечня II", year: 1999, type: "asymmetric" },
    { name: "Грузия", year: 2008, type: "conventional" },
    { name: "Крым", year: 2014, type: "conventional" },
    { name: "Сирия", year: 2015, type: "asymmetric" },
    { name: "СВО", year: 2022, type: "conventional" },
  ],
  CHN: [
    { name: "Вьетнам", year: 1979, type: "conventional" },
  ],
  GBR: [
    { name: "Фолкленды", year: 1982, type: "conventional" },
    { name: "Война в Заливе", year: 1991, type: "conventional" },
    { name: "Косово", year: 1999, type: "conventional" },
    { name: "Афганистан", year: 2001, type: "asymmetric" },
    { name: "Ирак", year: 2003, type: "conventional" },
    { name: "Ливия", year: 2011, type: "conventional" },
  ],
  FRA: [
    { name: "Ливан", year: 1982, type: "peacekeeping" },
    { name: "Война в Заливе", year: 1991, type: "conventional" },
    { name: "Косово", year: 1999, type: "conventional" },
    { name: "Афганистан", year: 2001, type: "asymmetric" },
    { name: "Ливия", year: 2011, type: "conventional" },
    { name: "Мали", year: 2013, type: "asymmetric" },
  ],
  DEU: [
    { name: "Косово", year: 1999, type: "conventional" },
    { name: "Афганистан", year: 2001, type: "asymmetric" },
  ],
  IND: [
    { name: "Каргил", year: 1999, type: "conventional" },
  ],
  UKR: [
    { name: "Донбасс", year: 2014, type: "asymmetric" },
    { name: "Оборона", year: 2022, type: "conventional" },
  ],
  ISR: [
    { name: "Йом-Киппур", year: 1973, type: "conventional" },
    { name: "Ливан", year: 1982, type: "conventional" },
    { name: "Ливан II", year: 2006, type: "asymmetric" },
    { name: "Газа", year: 2008, type: "asymmetric" },
    { name: "Газа 2023", year: 2023, type: "asymmetric" },
  ],
  TUR: [
    { name: "Кипр", year: 1974, type: "conventional" },
    { name: "Курдский конфликт", year: 1984, type: "asymmetric" },
    { name: "Сирия", year: 2016, type: "asymmetric" },
  ],
  IRN: [
    { name: "Иран-Ирак", year: 1980, type: "conventional" },
  ],
  EGY: [
    { name: "Октябрьская", year: 1973, type: "conventional" },
    { name: "Война в Заливе", year: 1991, type: "conventional" },
  ],
  SYR: [
    { name: "Октябрьская", year: 1973, type: "conventional" },
    { name: "Гражданская", year: 2011, type: "civil" },
  ],
  IRQ: [
    { name: "Иран-Ирак", year: 1980, type: "conventional" },
    { name: "Война в Заливе", year: 1991, type: "conventional" },
    { name: "Иракская", year: 2003, type: "conventional" },
  ],
  PAK: [
    { name: "Каргил", year: 1999, type: "conventional" },
    { name: "Waziristan", year: 2004, type: "asymmetric" },
  ],
  SAU: [
    { name: "Война в Заливе", year: 1991, type: "conventional" },
    { name: "Йемен", year: 2015, type: "asymmetric" },
  ],
  JPN: [],
  KOR: [],
  AUS: [
    { name: "Вьетнам", year: 1965, type: "conventional" },
    { name: "Афганистан", year: 2001, type: "asymmetric" },
    { name: "Ирак", year: 2003, type: "conventional" },
  ],
  CAN: [
    { name: "Афганистан", year: 2001, type: "asymmetric" },
    { name: "Ливия", year: 2011, type: "conventional" },
  ],
  BRA: [
    { name: "Вторая мировая", year: 1944, type: "conventional" },
    { name: "Миротворцы Гаити", year: 2004, type: "peacekeeping" },
  ],
  ITA: [
    { name: "Афганистан", year: 2001, type: "asymmetric" },
    { name: "Ливия", year: 2011, type: "conventional" },
  ],
  POL: [
    { name: "Ирак", year: 2003, type: "conventional" },
    { name: "Афганистан", year: 2007, type: "asymmetric" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Alliance data
// ─────────────────────────────────────────────────────────────────────────────

interface AllianceInfo {
  name: string;
  nameRu: string;
  flag: string;
  benefits: string[];
}

const ALLIANCES: Record<string, AllianceInfo> = {
  NATO: {
    name: "NATO",
    nameRu: "НАТО",
    flag: "🟦",
    benefits: ["Совместное ЦУР (C2)", "Разделение логистики", "Статья 5", "Стандартизация вооружений"],
  },
  CSTO: {
    name: "CSTO",
    nameRu: "ОДКБ",
    flag: "🟥",
    benefits: ["Коллективная оборона", "Размещение баз", "Поставки оружия", "Совместные учения"],
  },
  AUKUS: {
    name: "AUKUS",
    nameRu: "AUKUS",
    flag: "🟢",
    benefits: ["Атомные подлодки", "Технологический обмен", "Кибер-РЭБ", "Гиперзвуковые системы"],
  },
  BRICS: {
    name: "BRICS",
    nameRu: "БРИКС",
    flag: "🟨",
    benefits: ["Экономический блок", "Альтернативные финансы", "Технологический обмен"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Nuclear doctrine mapping
// ─────────────────────────────────────────────────────────────────────────────

interface NuclearDoctrine {
  type: string;
  label: string;
  color: string;
}

function getNuclearDoctrine(country: CountryData): NuclearDoctrine {
  if (country.nuclearWarheads <= 0) {
    return { type: "none", label: "Неядерная", color: "text-slate-400" };
  }
  switch (country.side) {
    case "NATO":
      return { type: "flexible", label: "Гибкое реагирование", color: "text-tactical-nato" };
    case "RUS":
      return { type: "escalate", label: "Эскалация до победы", color: "text-tactical-rus" };
    case "CHINA":
      return { type: "nfu", label: "Не применять первыми", color: "text-tactical-china" };
    default:
      return { type: "ambiguous", label: "Неясная позиция", color: "text-tactical-accent" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Computed assessments
// ─────────────────────────────────────────────────────────────────────────────

type DefensePosture = "Offensive" | "Defensive" | "Mixed" | "Deterrent";

function getDefensePosture(c: CountryData): DefensePosture {
  const tankAircraftRatio = c.totalTanks / Math.max(c.totalAircraft, 1);
  const doctrineScore = c.combatExperience * 0.4 + c.techLevel * 0.3 + c.c2Capability * 0.3;
  if (c.nuclearWarheads > 500 && doctrineScore < 7) return "Deterrent";
  if (tankAircraftRatio > 3 && doctrineScore >= 6) return "Offensive";
  if (tankAircraftRatio < 1 && doctrineScore >= 5) return "Defensive";
  return "Mixed";
}

function getPostureMeta(p: DefensePosture): { label: string; color: string; icon: React.ReactNode } {
  switch (p) {
    case "Offensive":
      return { label: "Наступательная", color: "text-red-400", icon: <Swords size={14} /> };
    case "Defensive":
      return { label: "Оборонительная", color: "text-blue-400", icon: <Shield size={14} /> };
    case "Deterrent":
      return { label: "Сдерживание", color: "text-yellow-400", icon: <Radiation size={14} /> };
    case "Mixed":
      return { label: "Смешанная", color: "text-cyan-400", icon: <Target size={14} /> };
  }
}

type ExperienceLevel = "None" | "Limited" | "Moderate" | "Extensive" | "Heavy";

function getExperienceLevel(score: number): ExperienceLevel {
  if (score <= 1) return "None";
  if (score <= 3) return "Limited";
  if (score <= 5) return "Moderate";
  if (score <= 7) return "Extensive";
  return "Heavy";
}

function getExperienceLabel(level: ExperienceLevel): { ru: string; color: string } {
  switch (level) {
    case "None": return { ru: "Отсутствует", color: "text-slate-500" };
    case "Limited": return { ru: "Ограниченный", color: "text-slate-400" };
    case "Moderate": return { ru: "Умеренный", color: "text-cyan-400" };
    case "Extensive": return { ru: "Обширный", color: "text-yellow-400" };
    case "Heavy": return { ru: "Тяжёлый", color: "text-red-400" };
  }
}

type ModernizationLevel = "Legacy" | "Mixed" | "Modern" | "Cutting-edge";

function getModernizationLevel(c: CountryData): ModernizationLevel {
  const budgetPerSoldier = c.militaryBudgetBn * 1e9 / Math.max(c.activePersonnel, 1);
  const tech = c.techLevel;
  const score = (budgetPerSoldier / 100000) * 0.5 + tech * 0.5;
  if (score < 2) return "Legacy";
  if (score < 4) return "Mixed";
  if (score < 7) return "Modern";
  return "Cutting-edge";
}

function getModernizationLabel(level: ModernizationLevel): { ru: string; color: string } {
  switch (level) {
    case "Legacy": return { ru: "Устаревшая", color: "text-slate-500" };
    case "Mixed": return { ru: "Смешанная", color: "text-cyan-400" };
    case "Modern": return { ru: "Современная", color: "text-teal-400" };
    case "Cutting-edge": return { ru: "Передовая", color: "text-tactical-primary" };
  }
}

type PowerProjection = "regional" | "continental" | "global";

function getPowerProjection(c: CountryData): PowerProjection {
  const hasCarriers = c.totalNavy > 100 && c.submarines > 10;
  const globalReach = c.totalAircraft > 1000 && c.airfields > 200;
  const continentalReach = c.totalAircraft > 300 && c.totalNavy > 50;
  if (globalReach && hasCarriers) return "global";
  if (continentalReach) return "continental";
  return "regional";
}

function getProjectionLabel(proj: PowerProjection): { ru: string; color: string } {
  switch (proj) {
    case "regional": return { ru: "Региональная", color: "text-yellow-400" };
    case "continental": return { ru: "Континентальная", color: "text-teal-400" };
    case "global": return { ru: "Глобальная", color: "text-tactical-primary" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation variants
// ─────────────────────────────────────────────────────────────────────────────

const sectionVariants: Record<string, unknown> = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// DoctrineTab Component
// ─────────────────────────────────────────────────────────────────────────────

export function DoctrineTab({ country }: DoctrineTabProps) {
  const posture = useMemo(() => getDefensePosture(country), [country]);
  const postureMeta = useMemo(() => getPostureMeta(posture), [posture]);

  const conflicts = useMemo(
    () => COMBAT_HISTORY[country.isoCode] ?? [],
    [country.isoCode],
  );
  const expLevel = useMemo(
    () => getExperienceLevel(country.combatExperience),
    [country.combatExperience],
  );
  const expLabel = useMemo(() => getExperienceLabel(expLevel), [expLevel]);

  const modernLevel = useMemo(() => getModernizationLevel(country), [country]);
  const modernLabel = useMemo(() => getModernizationLabel(modernLevel), [modernLevel]);

  const nukeDoctrine = useMemo(() => getNuclearDoctrine(country), [country]);
  const projection = useMemo(() => getPowerProjection(country), [country]);
  const projLabel = useMemo(() => getProjectionLabel(projection), [projection]);

  const alliance = useMemo(() => {
    if (!country.coalition) return null;
    return ALLIANCES[country.coalition] ?? null;
  }, [country.coalition]);

  const iwCapability = useMemo(() => {
    const score = Math.round((country.ewCapability * 0.5 + country.c2Capability * 0.3 + country.techLevel * 0.2) * 10) / 10;
    return Math.min(score, 10);
  }, [country]);

  /** Doctrine Score breakdown for stacked bar */
  const breakdownData = useMemo(() => [
    { name: "Боевой опыт", value: country.combatExperience * 4, fill: "#f59e0b" },
    { name: "Модернизация", value: country.techLevel * 3, fill: "#22d3ee" },
    { name: "Технология", value: country.techLevel * 3, fill: "#a855f7" },
  ], [country]);

  const breakdownTotal = useMemo(
    () => breakdownData.reduce((s, d) => s + d.value, 0),
    [breakdownData],
  );

  return (
    <div className="flex flex-col gap-3 p-1 font-mono overflow-y-auto max-h-[calc(100vh-8rem)]">
      {/* ─── 1. Defense Posture ─── */}
      <motion.section
        custom={0} variants={sectionVariants as any} initial="hidden" animate="visible"
        className="glass-panel rounded-lg p-4 border border-white/5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-tactical-primary" />
          <span className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase">
            Оборонная позиция
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded border ${
            posture === "Offensive" ? "border-red-400/30 bg-red-400/10" :
            posture === "Defensive" ? "border-blue-400/30 bg-blue-400/10" :
            posture === "Deterrent" ? "border-yellow-400/30 bg-yellow-400/10" :
            "border-cyan-400/30 bg-cyan-400/10"
          }`}>
            <span className={postureMeta.color}>{postureMeta.icon}</span>
            <span className={`text-sm font-bold tracking-wider ${postureMeta.color}`}>
              {postureMeta.label}
            </span>
          </div>
          <div className="flex-1 text-right">
            <div className="text-[8px] text-tactical-secondary/40 tracking-wider uppercase">
              Танк/Авиа соотношение
            </div>
            <div className="text-xs font-bold text-white/70 tabular-nums">
              {(country.totalTanks / Math.max(country.totalAircraft, 1)).toFixed(2)}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── 2. Alliance Membership ─── */}
      <motion.section
        custom={1} variants={sectionVariants as any} initial="hidden" animate="visible"
        className="glass-panel rounded-lg p-4 border border-white/5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-tactical-primary" />
          <span className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase">
            Членство в альянсе
          </span>
        </div>
        {alliance ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{alliance.flag}</span>
              <span className="text-sm font-bold text-tactical-primary tracking-wider">
                {alliance.nameRu}
              </span>
              <span className="text-[9px] text-tactical-secondary/50 ml-auto">
                {alliance.name}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {alliance.benefits.map((b) => (
                <div
                  key={b}
                  className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded border border-white/5"
                >
                  <ChevronRight size={10} className="text-tactical-primary/60" />
                  <span className="text-[9px] text-white/70">{b}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500">
            <Globe size={14} />
            <span className="text-xs">Не состоит в военном альянсе</span>
          </div>
        )}
      </motion.section>

      {/* ─── 3. Combat Experience Timeline ─── */}
      <motion.section
        custom={2} variants={sectionVariants as any} initial="hidden" animate="visible"
        className="glass-panel rounded-lg p-4 border border-white/5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-tactical-primary" />
            <span className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase">
              Боевой опыт (50 лет)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold ${expLabel.color}`}>
              {expLabel.ru}
            </span>
            <span className="text-[9px] text-tactical-secondary/40 tabular-nums">
              {country.combatExperience}/10
            </span>
          </div>
        </div>

        {conflicts.length > 0 ? (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {conflicts.map((conf, idx) => {
              const typeColor: Record<string, string> = {
                conventional: "border-red-400/30 bg-red-400/5 text-red-300",
                asymmetric: "border-yellow-400/30 bg-yellow-400/5 text-yellow-300",
                peacekeeping: "border-blue-400/30 bg-blue-400/5 text-blue-300",
                civil: "border-purple-400/30 bg-purple-400/5 text-purple-300",
                proxy: "border-teal-400/30 bg-teal-400/5 text-teal-300",
              };
              return (
                <div
                  key={`${conf.name}-${idx}`}
                  className="flex items-center gap-2 px-2 py-1 rounded border border-white/5 bg-white/[0.02]"
                >
                  <span className="text-[9px] font-bold text-tactical-primary/60 tabular-nums w-8">
                    {conf.year}
                  </span>
                  <span className="text-[10px] text-white/80 flex-1">{conf.name}</span>
                  <span className={`text-[7px] px-1.5 py-0.5 rounded border ${typeColor[conf.type] ?? "border-white/10 text-white/40"}`}>
                    {conf.type === "conventional" ? "Конв." :
                     conf.type === "asymmetric" ? "Асимм." :
                     conf.type === "peacekeeping" ? "Миротв." :
                     conf.type === "civil" ? "Гражд." : "Прокси"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-slate-500 py-2">
            Нет данных о крупных конфликтах за последние 50 лет
          </div>
        )}

        {/* Impact on doctrine score */}
        <div className="mt-3 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[8px] text-tactical-secondary/40 tracking-wider uppercase">
              Влияние на доктрину
            </span>
            <span className="text-[9px] font-bold text-tactical-accent tabular-nums">
              +{(country.combatExperience * 4).toFixed(0)} баллов
            </span>
          </div>
        </div>
      </motion.section>

      {/* ─── 4. Military Modernization Index ─── */}
      <motion.section
        custom={3} variants={sectionVariants as any} initial="hidden" animate="visible"
        className="glass-panel rounded-lg p-4 border border-white/5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-tactical-primary" />
          <span className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase">
            Индекс модернизации
          </span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className={`text-sm font-bold tracking-wider ${modernLabel.color}`}>
            {modernLabel.ru}
          </span>
          <span className="text-[9px] text-tactical-secondary/40">
            ({modernLevel})
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded p-2 border border-white/5">
            <div className="text-[8px] text-tactical-secondary/40 tracking-wider uppercase">
              Бюджет/солдат
            </div>
            <div className="text-xs font-bold text-tactical-primary tabular-nums">
              ${((country.militaryBudgetBn * 1e9) / Math.max(country.activePersonnel, 1) / 1000).toFixed(0)}K
            </div>
          </div>
          <div className="bg-white/5 rounded p-2 border border-white/5">
            <div className="text-[8px] text-tactical-secondary/40 tracking-wider uppercase">
              Тех. уровень
            </div>
            <div className="text-xs font-bold text-tactical-primary tabular-nums">
              {country.techLevel}/10
            </div>
          </div>
        </div>
        {/* Modernization bar */}
        <div className="mt-3 h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min((country.techLevel / 10) * 100, 100)}%`,
              background: modernLevel === "Cutting-edge"
                ? "linear-gradient(90deg, #22d3ee, #a855f7)"
                : modernLevel === "Modern"
                ? "linear-gradient(90deg, #14b8a6, #22d3ee)"
                : modernLevel === "Mixed"
                ? "linear-gradient(90deg, #0ea5e9, #14b8a6)"
                : "linear-gradient(90deg, #475569, #0ea5e9)",
            }}
          />
        </div>
      </motion.section>

      {/* ─── 5. Strategic Culture Profile ─── */}
      <motion.section
        custom={4} variants={sectionVariants as any} initial="hidden" animate="visible"
        className="glass-panel rounded-lg p-4 border border-white/5"
      >
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={14} className="text-tactical-primary" />
          <span className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase">
            Стратегическая культура
          </span>
        </div>
        <div className="space-y-3">
          {/* Nuclear doctrine */}
          <div className="flex items-center justify-between bg-white/[0.03] px-3 py-2 rounded border border-white/5">
            <div className="flex items-center gap-2">
              <Radiation size={12} className="text-tactical-accent/70" />
              <span className="text-[9px] text-tactical-secondary/50 tracking-wider uppercase">
                Ядерная доктрина
              </span>
            </div>
            <span className={`text-[10px] font-bold ${nukeDoctrine.color}`}>
              {nukeDoctrine.label}
            </span>
          </div>

          {/* Power projection */}
          <div className="flex items-center justify-between bg-white/[0.03] px-3 py-2 rounded border border-white/5">
            <div className="flex items-center gap-2">
              <Globe size={12} className="text-tactical-accent/70" />
              <span className="text-[9px] text-tactical-secondary/50 tracking-wider uppercase">
                Проекция силы
              </span>
            </div>
            <span className={`text-[10px] font-bold ${projLabel.color}`}>
              {projLabel.ru}
            </span>
          </div>

          {/* Information warfare */}
          <div className="flex items-center justify-between bg-white/[0.03] px-3 py-2 rounded border border-white/5">
            <div className="flex items-center gap-2">
              <Radio size={12} className="text-tactical-accent/70" />
              <span className="text-[9px] text-tactical-secondary/50 tracking-wider uppercase">
                Информ. война
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-tactical-primary tabular-nums">
                {iwCapability.toFixed(1)}
              </span>
              <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-tactical-primary"
                  style={{ width: `${(iwCapability / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── 6. Doctrine Score Breakdown ─── */}
      <motion.section
        custom={5} variants={sectionVariants as any} initial="hidden" animate="visible"
        className="glass-panel rounded-lg p-4 border border-white/5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-tactical-primary" />
            <span className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase">
              Разбивка доктрины
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-tactical-secondary/40">Итого</span>
            <span className="text-sm font-black text-tactical-primary tabular-nums">
              {breakdownTotal.toFixed(0)}
            </span>
          </div>
        </div>

        <div className="h-28 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
            <BarChart data={breakdownData} layout="vertical" barCategoryGap={4}>
              <XAxis type="number" hide domain={[0, 40]} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{
                  fill: "oklch(75% 0.18 200 / 60%)",
                  fontSize: 8,
                  fontFamily: "var(--font-mono)",
                }}
                width={80}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(20, 30, 45, 0.9)",
                  border: "1px solid rgba(34, 211, 238, 0.2)",
                  fontSize: "9px",
                  fontFamily: "var(--font-mono)",
                }}
                itemStyle={{ color: "#22d3ee" }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} minPointSize={2}>
                {breakdownData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sub-factor legend */}
        <div className="flex items-center justify-center gap-4 mt-2">
          {breakdownData.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ background: d.fill }} />
              <span className="text-[8px] text-tactical-secondary/50">{d.name}</span>
            </div>
          ))}
        </div>

        {/* Overall BP Doctrine score */}
        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
          <span className="text-[8px] text-tactical-secondary/40 tracking-wider uppercase">
            БП Доктрина
          </span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-cyan-400 to-purple-400"
                style={{ width: `${Math.min(country.bpDoctrine, 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-tactical-primary tabular-nums">
              {country.bpDoctrine.toFixed(1)}
            </span>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

export default DoctrineTab;
