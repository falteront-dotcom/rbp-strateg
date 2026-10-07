"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  Users, Package, HardHat, Swords, Shield, Truck, Crosshair, Target,
  Plane, Anchor, Ship, Radiation, BarChart3, Rocket, Waves, Radar as RadarIcon, Boxes, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EQUIPMENT_INDEX, type EquipmentCat } from "@/lib/data/equipment.generated";
import { MISSILE_SYSTEMS } from "@/lib/data/missiles.generated";
import { AIR_DEFENSE_NETWORKS } from "@/lib/data/airdefense.generated";
import { NAVY_FLEETS } from "@/lib/data/navy.generated";
import { WEAPON_SPECS } from "@/lib/data/weapons.generated";
import { ORDER_OF_BATTLE } from "@/lib/data/order-of-battle.generated";

const EQUIPMENT_GROUPS: readonly { label: string; cats: readonly EquipmentCat[] }[] = [
  { label: "Сухопутная техника", cats: ["tank", "ifv", "apc", "arty", "mlrs", "sam"] },
  { label: "Авиация", cats: ["fighter", "attack", "transport", "uav", "heli", "heli_attack"] },
  { label: "Флот", cats: ["carrier", "cruiser", "destroyer", "frigate", "corvette", "submarine", "patrol", "amphib"] },
  { label: "Стратегические ракетные силы", cats: ["icbm", "slbm"] },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CountryData {
  isoCode: string;
  name: string;
  nameRu: string;
  side: string;
  coalition: string | null;

  // Manpower
  activePersonnel: number;
  reservePersonnel: number;
  fitForServiceM: number;

  // Ground
  totalTanks: number;
  totalAfv: number;
  totalArtillery: number;
  totalMlrs: number;

  // Air
  totalAircraft: number;
  totalHelicopters: number;

  // Navy
  totalNavy: number;
  submarines: number;
  aircraftCarriers: number;

  // Nuclear
  nuclearWarheads: number;

  // Qualitative
  techLevel: number;
  moraleIndex: number;
  combatExperience: number;
  c2Capability: number;
  ewCapability: number;

  // BP scores
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

interface MilitaryHardwareTabProps {
  country: CountryData;
}

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const CYAN = "#6bb995";
const RED = "#c76a5a";
const AMBER = "#d8a03c";
const GREEN = "#82a882";
const BLUE_STEEL = "#8aa89b";
const PURPLE = "#a892a8";


/** Reference data for top-10 tank counts (2025 GFP). */
const TOP10_TANKS: ReadonlyArray<{ name: string; value: number }> = [
  { name: "Россия", value: 12500 },
  { name: "США", value: 4631 },
  { name: "Китай", value: 5800 },
  { name: "Индия", value: 4614 },
  { name: "Египет", value: 4295 },
  { name: "Пакистан", value: 2750 },
  { name: "Турция", value: 2260 },
  { name: "Иран", value: 2195 },
  { name: "Ю.Корея", value: 2681 },
  { name: "Украина", value: 1930 },
];

/** Estimated aircraft type breakdown ratios per side. */
const AIR_BREAKDOWN: Record<string, { fighters: number; attackers: number; transports: number; trainers: number; special: number }> = {
  NATO:   { fighters: 0.27, attackers: 0.18, transports: 0.25, trainers: 0.20, special: 0.10 },
  RUS:    { fighters: 0.30, attackers: 0.22, transports: 0.18, trainers: 0.22, special: 0.08 },
  CHINA:  { fighters: 0.32, attackers: 0.20, transports: 0.16, trainers: 0.24, special: 0.08 },
  default:{ fighters: 0.28, attackers: 0.20, transports: 0.20, trainers: 0.22, special: 0.10 },
};

/** Estimated helicopter attack ratio per side. */
const HELI_ATTACK_RATIO: Record<string, number> = {
  NATO: 0.22, RUS: 0.30, CHINA: 0.25, default: 0.20,
};

/** Estimated navy breakdown ratios per side. */
const NAVY_BREAKDOWN: Record<string, { carriers: number; destroyers: number; frigates: number; corvettes: number; subs: number; patrol: number }> = {
  NATO:   { carriers: 0.02, destroyers: 0.18, frigates: 0.25, corvettes: 0.12, subs: 0.14, patrol: 0.29 },
  RUS:    { carriers: 0.002, destroyers: 0.12, frigates: 0.20, corvettes: 0.25, subs: 0.10, patrol: 0.33 },
  CHINA:  { carriers: 0.004, destroyers: 0.16, frigates: 0.28, corvettes: 0.18, subs: 0.09, patrol: 0.28 },
  default:{ carriers: 0.01, destroyers: 0.15, frigates: 0.24, corvettes: 0.18, subs: 0.12, patrol: 0.30 },
};

/** Estimated submarine type split per side. */
const SUB_BREAKDOWN: Record<string, { ssbn: number; ssn: number; ssk: number }> = {
  NATO:   { ssbn: 0.30, ssn: 0.45, ssk: 0.25 },
  RUS:    { ssbn: 0.25, ssn: 0.30, ssk: 0.45 },
  CHINA:  { ssbn: 0.20, ssn: 0.30, ssk: 0.50 },
  default:{ ssbn: 0.25, ssn: 0.35, ssk: 0.40 },
};

/** Estimated nuclear delivery systems based on warhead count. */
function estimateDeliverySystems(warheads: number) {
  if (warheads <= 0) return { icbm: 0, slbm: 0, bombers: 0 };
  const icbm = Math.round(warheads * 0.45 / 1.2);
  const slbm = Math.round(warheads * 0.35 / 6);
  const bombers = Math.round(warheads * 0.20 / 4);
  return { icbm, slbm, bombers };
}

/** FAS / Nuclear Notebook source reference. */
const NUCLEAR_SOURCE = {
  label: "FAS Nuclear Notebook",
  url: "https://fas.org/publication/nuclear-notebook/",
};

/** Format number with thousands separator. */
function fmt(n: number): string {
  return n.toLocaleString("ru-RU");
}

/** Rank badge color. */
function rankColor(rank: number): string {
  if (rank <= 3) return AMBER;
  if (rank <= 10) return CYAN;
  return BLUE_STEEL;
}

// ---------------------------------------------------------------------------
// Animation presets
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Glass panel with HUD aesthetic. */
function GlassPanel({
  children,
  className,
  title,
  icon,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      className={cn(
        "relative overflow-hidden rounded-lg border border-[#6bb99522] bg-[#0a1628cc]",
        "p-4",
        className
      )}
    >
      {/* Corner brackets */}
      <div className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-[#6bb99555]" />
      <div className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t border-[#6bb99555]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b border-l border-[#6bb99555]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-[#6bb99555]" />

      {title && (
        <div className="mb-3 flex items-center gap-2 border-b border-[#6bb99522] pb-2 font-mono text-xs uppercase tracking-[0.2em] text-[#6bb995]">
          {icon && <span className="text-sm">{icon}</span>}
          <span>{title}</span>
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/** Stat row with icon, label, value, and optional rank badge. */
function StatRow({
  icon,
  label,
  value,
  rank,
  highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
  rank?: number;
  highlight?: boolean;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="flex items-center justify-between gap-3 py-1.5"
    >
      <div className="flex items-center gap-2">
        {icon && <span className="flex items-center text-[#5b7683]">{icon}</span>}
        <span className="font-mono text-xs uppercase tracking-wide text-[#8eb8a6]">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            highlight ? "font-bold text-[#6bb995]" : "text-white"
          )}
        >
          {fmt(value)}
        </span>
        {rank != null && (
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
            style={{
              backgroundColor: rankColor(rank) + "22",
              color: rankColor(rank),
              border: `1px solid ${rankColor(rank)}44`,
            }}
          >
            #{rank}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/** Big number display for nuclear warheads. */
function BigNumber({
  value,
  label,
  sublabel,
}: {
  value: number;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <motion.span
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="font-mono text-4xl font-black text-[#c76a5a]"
      >
        {fmt(value)}
      </motion.span>
      <span className="mt-1 font-mono text-xs uppercase tracking-[0.15em] text-[#c76a5a99]">
        {label}
      </span>
      {sublabel && (
        <span className="font-mono text-[10px] text-[#8eb8a6]">{sublabel}</span>
      )}
    </div>
  );
}

/** Nuclear triad completion indicator. */
function TriadIndicator({
  land,
  sea,
  air,
}: {
  land: boolean;
  sea: boolean;
  air: boolean;
}) {
  const legs = [
    { active: land, icon: <Rocket size={15} />, label: "ICBM" },
    { active: sea, icon: <Waves size={15} />, label: "SLBM" },
    { active: air, icon: <Plane size={15} />, label: "Бомбардировщики" },
  ];
  return (
    <div className="flex items-center justify-center gap-3">
      {legs.map((l) => (
        <div
          key={l.label}
          className={cn(
            "flex flex-col items-center rounded-md border px-3 py-2 font-mono",
            l.active
              ? "border-[#c76a5a44] bg-[#c76a5a11] text-[#c76a5a]"
              : "border-[#ffffff11] bg-[#ffffff05] text-[#ffffff44]"
          )}
        >
          <span className="flex h-4 items-center">{l.icon}</span>
          <span className="mt-0.5 text-[10px] uppercase tracking-wide">{l.label}</span>
          <span className="text-[10px]">{l.active ? "АКТИВНО" : "—"}</span>
        </div>
      ))}
    </div>
  );
}

/** Custom tooltip for charts. */
function HudTooltip({
  active,
  payload,
  label: lbl,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-[#6bb99544] bg-[#0a1628ee] px-3 py-2 font-mono text-xs">
      <p className="mb-1 text-[#6bb995]">{lbl}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function MilitaryHardwareTab({ country }: MilitaryHardwareTabProps) {
  const side = country.side ?? "default";

  // ---- Derived data ----

  const personnelData = useMemo(() => [
    { name: "Активный", value: country.activePersonnel, color: CYAN },
    { name: "Резерв", value: country.reservePersonnel, color: AMBER },
    { name: "Парамил.", value: Math.round(country.fitForServiceM * 1000 * 0.03), color: GREEN },
  ], [country]);

  const totalPersonnel = useMemo(
    () => personnelData.reduce((s, p) => s + p.value, 0),
    [personnelData]
  );

  const manpowerIndex = useMemo(() => {
    const max = 3_500_000;
    return Math.min(10, Math.round((totalPersonnel / max) * 10));
  }, [totalPersonnel]);

  const airBreakdown = useMemo(() => {
    const ratios = AIR_BREAKDOWN[side] ?? AIR_BREAKDOWN.default;
    const total = country.totalAircraft;
    return [
      { name: "Истребители", value: Math.round(total * ratios.fighters), color: RED },
      { name: "Штурмовики", value: Math.round(total * ratios.attackers), color: AMBER },
      { name: "Транспорт", value: Math.round(total * ratios.transports), color: CYAN },
      { name: "Учебные", value: Math.round(total * ratios.trainers), color: GREEN },
      { name: "Специальные", value: Math.round(total * ratios.special), color: PURPLE },
    ];
  }, [country.totalAircraft, side]);

  const attackHelis = useMemo(() => {
    const ratio = HELI_ATTACK_RATIO[side] ?? HELI_ATTACK_RATIO.default;
    return Math.round(country.totalHelicopters * ratio);
  }, [country.totalHelicopters, side]);

  const navyBreakdown = useMemo(() => {
    const ratios = NAVY_BREAKDOWN[side] ?? NAVY_BREAKDOWN.default;
    const total = country.totalNavy;
    return [
      { name: "Авианосцы", value: Math.max(country.aircraftCarriers, Math.round(total * ratios.carriers)), color: RED },
      { name: "Эсминцы", value: Math.round(total * ratios.destroyers), color: AMBER },
      { name: "Фрегаты", value: Math.round(total * ratios.frigates), color: CYAN },
      { name: "Корветы", value: Math.round(total * ratios.corvettes), color: GREEN },
      { name: "Подводные", value: country.submarines, color: PURPLE },
      { name: "Патрульные", value: Math.round(total * ratios.patrol), color: BLUE_STEEL },
    ];
  }, [country.totalNavy, country.submarines, country.aircraftCarriers, side]);

  const subBreakdown = useMemo(() => {
    const ratios = SUB_BREAKDOWN[side] ?? SUB_BREAKDOWN.default;
    const total = country.submarines;
    return [
      { name: "SSBN", value: Math.round(total * ratios.ssbn), color: RED },
      { name: "SSN", value: Math.round(total * ratios.ssn), color: CYAN },
      { name: "SSK", value: Math.round(total * ratios.ssk), color: GREEN },
    ];
  }, [country.submarines, side]);

  const nuclearDelivery = useMemo(
    () => estimateDeliverySystems(country.nuclearWarheads),
    [country.nuclearWarheads]
  );

  const radarData = useMemo(() => {
    const maxTanks = 12500;
    const maxAircraft = 5300;
    const maxNavy = 730;
    const maxNuclear = 6500;
    const maxPersonnel = 3_500_000;
    const maxSam = 500;
    const samEstimate = Math.round(country.totalArtillery * 0.06 + country.ewCapability * 20);

    return [
      { axis: "Сухопутные", value: Math.min(10, Math.round((country.totalTanks / maxTanks) * 10)) },
      { axis: "Авиация", value: Math.min(10, Math.round((country.totalAircraft / maxAircraft) * 10)) },
      { axis: "Флот", value: Math.min(10, Math.round((country.totalNavy / maxNavy) * 10)) },
      { axis: "Ядерные", value: country.nuclearWarheads > 0 ? Math.min(10, Math.round((country.nuclearWarheads / maxNuclear) * 10)) : 0 },
      { axis: "Личный состав", value: Math.min(10, Math.round((totalPersonnel / maxPersonnel) * 10)) },
      { axis: "ПВО", value: Math.min(10, Math.round((samEstimate / maxSam) * 10)) },
    ];
  }, [country, totalPersonnel]);

  const tankChartData = useMemo(() => {
    const countryNameRu = country.nameRu;
    return TOP10_TANKS.map((t) => ({
      ...t,
      isHighlighted: t.name === countryNameRu,
    })).sort((a, b) => b.value - a.value);
  }, [country.nameRu]);

  // Fleet tonnage estimates (thousands of tonnes) for comparison
  const fleetTonnage = useMemo(() => [
    { name: "США", value: 4500 },
    { name: "Китай", value: 1800 },
    { name: "Россия", value: 1200 },
    { name: "Великобрит.", value: 450 },
    { name: "Индия", value: 380 },
    { name: "Франция", value: 360 },
    { name: "Япония", value: 470 },
    { name: "Ю.Корея", value: 280 },
  ], []);

  const fleetTonnageHighlighted = useMemo(
    () => fleetTonnage.map((f) => ({ ...f, isHighlighted: f.name === country.nameRu })),
    [fleetTonnage, country.nameRu]
  );

  const showNuclear = country.nuclearWarheads > 0;

  // World ranks (estimated)
  const tankRank = useMemo(() => {
    const idx = TOP10_TANKS.findIndex((t) => t.name === country.nameRu);
    return idx >= 0 ? idx + 1 : undefined;
  }, [country.nameRu]);

  // ---- Render ----

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-1 font-mono">
      {/* ================================================================ */}
      {/* PERSONNEL SECTION                                                */}
      {/* ================================================================ */}
      <GlassPanel title="Личный состав" icon={<Users size={14} />}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Donut chart */}
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={personnelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  stroke="none"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {personnelData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                {/* Center label */}
                <text
                  x="50%"
                  y="46%"
                  textAnchor="middle"
                  fill={CYAN}
                  fontSize={18}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {fmt(totalPersonnel)}
                </text>
                <text
                  x="50%"
                  y="58%"
                  textAnchor="middle"
                  fill="#8eb8a6"
                  fontSize={10}
                  fontFamily="monospace"
                >
                  ВСЕГО ЧЕЛОВЕК
                </text>
                <Tooltip content={<HudTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="mt-1 flex gap-3">
              {personnelData.map((d) => (
                <div key={d.name} className="flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-[10px] text-[#8eb8a6]">{d.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Manpower index */}
          <div className="flex flex-col justify-center gap-3">
            <div className="text-center font-mono text-xs uppercase tracking-[0.15em] text-[#8eb8a6]">
              Индекс людских ресурсов
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-3xl font-black text-[#6bb995]">
                {manpowerIndex}
              </span>
              <span className="font-mono text-sm text-[#8eb8a6]">/ 10</span>
            </div>

            {/* Comparison bar */}
            <div className="mx-4">
              <div className="h-2 rounded-full bg-[#1a2a22]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${manpowerIndex * 10}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: CYAN,
                    boxShadow: "none",
                  }}
                />
              </div>
              <div className="mt-1 flex justify-between font-mono text-[10px] text-[#8eb8a6]">
                <span>0</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>

            {/* Breakdown */}
            <StatRow icon={<Users size={13} />} label="Активный" value={country.activePersonnel} />
            <StatRow icon={<Package size={13} />} label="Резерв" value={country.reservePersonnel} />
            <StatRow icon={<HardHat size={13} />} label="Пригодных" value={Math.round(country.fitForServiceM * 1000)} />
          </div>
        </div>
      </GlassPanel>

      {/* ================================================================ */}
      {/* GROUND FORCES SECTION                                            */}
      {/* ================================================================ */}
      <GlassPanel title="Сухопутные войска" icon={<Swords size={14} />}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Stats column */}
          <div className="flex flex-col gap-1">
            <StatRow
              icon={<Shield size={13} />}
              label="Танки"
              value={country.totalTanks}
              rank={tankRank}
              highlight
            />
            <StatRow
              icon={<Truck size={13} />}
              label="БМП/БТР"
              value={country.totalAfv}
            />
            <StatRow
              icon={<Crosshair size={13} />}
              label="Артиллерия"
              value={country.totalArtillery}
            />
            <StatRow
              icon={<Target size={13} />}
              label="РСЗО"
              value={country.totalMlrs}
              highlight
            />
            <StatRow
              icon={<RadarIcon size={13} />}
              label="ЗРК (оценка)"
              value={Math.round(country.totalArtillery * 0.06 + country.ewCapability * 20)}
            />

            {/* Quick tech indicator */}
            <div className="mt-2 flex items-center gap-2 border-t border-[#6bb99511] pt-2">
              <span className="font-mono text-[10px] uppercase text-[#8eb8a6]">
                Техноуровень:
              </span>
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-sm"
                    style={{
                      backgroundColor: i < country.techLevel ? CYAN : "#1a2a22",
                      boxShadow: "none",
                    }}
                  />
                ))}
              </div>
              <span className="font-mono text-xs text-[#6bb995]">{country.techLevel}/10</span>
            </div>
          </div>

          {/* Top-10 tanks bar chart */}
          <div>
            <div className="mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-[#8eb8a6]">
              Топ-10 стран по танкам
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={tankChartData}
                layout="vertical"
                margin={{ left: 55, right: 10, top: 5, bottom: 5 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#8eb8a6", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={{ stroke: "#6bb99522" }}
                  tickLine={false}
                  width={55}
                />
                <Tooltip content={<HudTooltip />} />
                <Bar
                  dataKey="value"
                  name="Танки"
                  radius={[0, 4, 4, 0]}
                  animationDuration={800}
                >
                  {tankChartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isHighlighted ? CYAN : "#1e3a2b"}
                      stroke={entry.isHighlighted ? CYAN : "none"}
                      strokeWidth={entry.isHighlighted ? 1 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </GlassPanel>

      {/* ================================================================ */}
      {/* AIR FORCES SECTION                                               */}
      {/* ================================================================ */}
      <GlassPanel title="Военно-воздушные силы" icon={<Plane size={14} />}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Stats column */}
          <div className="flex flex-col gap-1">
            <StatRow
              icon={<Plane size={13} />}
              label="Всего самолётов"
              value={country.totalAircraft}
              highlight
            />
            {airBreakdown.map((a) => (
              <StatRow key={a.name} label={a.name} value={a.value} />
            ))}

            <div className="my-2 border-t border-[#6bb99511]" />

            <StatRow
              label="Вертолёты"
              value={country.totalHelicopters}
              highlight
            />
            <StatRow
              label="Ударные вертолёты"
              value={attackHelis}
            />
          </div>

          {/* Aircraft type donut */}
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={airBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={78}
                  dataKey="value"
                  stroke="none"
                  animationBegin={100}
                  animationDuration={800}
                >
                  {airBreakdown.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <text
                  x="50%"
                  y="46%"
                  textAnchor="middle"
                  fill={CYAN}
                  fontSize={16}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {fmt(country.totalAircraft)}
                </text>
                <text
                  x="50%"
                  y="58%"
                  textAnchor="middle"
                  fill="#8eb8a6"
                  fontSize={10}
                  fontFamily="monospace"
                >
                  САМОЛЁТОВ
                </text>
                <Tooltip content={<HudTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
              {airBreakdown.map((d) => (
                <div key={d.name} className="flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-[10px] text-[#8eb8a6]">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ================================================================ */}
      {/* NAVAL FORCES SECTION                                             */}
      {/* ================================================================ */}
      <GlassPanel title="Военно-морские силы" icon={<Anchor size={14} />}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Navy breakdown */}
          <div className="flex flex-col gap-1">
            <StatRow
              icon={<Ship size={13} />}
              label="Всего кораблей"
              value={country.totalNavy}
              highlight
            />
            {navyBreakdown.map((n) => (
              <StatRow key={n.name} label={n.name} value={n.value} />
            ))}
          </div>

          {/* Submarine detail */}
          <div className="flex flex-col items-center">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#8eb8a6]">
              Подводный флот
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={subBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  dataKey="value"
                  stroke="none"
                  animationBegin={200}
                  animationDuration={800}
                >
                  {subBreakdown.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <text
                  x="50%"
                  y="46%"
                  textAnchor="middle"
                  fill={CYAN}
                  fontSize={14}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {country.submarines}
                </text>
                <text
                  x="50%"
                  y="58%"
                  textAnchor="middle"
                  fill="#8eb8a6"
                  fontSize={10}
                  fontFamily="monospace"
                >
                  ПОДЛОДОК
                </text>
                <Tooltip content={<HudTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Sub type labels */}
            <div className="flex gap-4">
              {subBreakdown.map((s) => (
                <div key={s.name} className="flex flex-col items-center">
                  <span className="font-mono text-sm font-bold" style={{ color: s.color }}>
                    {s.value}
                  </span>
                  <span className="font-mono text-[10px] text-[#8eb8a6]">{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fleet tonnage bar chart */}
          <div>
            <div className="mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-[#8eb8a6]">
              Тоннаж флота (тыс. т)
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={fleetTonnageHighlighted}
                layout="vertical"
                margin={{ left: 55, right: 10, top: 5, bottom: 5 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#8eb8a6", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={{ stroke: "#6bb99522" }}
                  tickLine={false}
                  width={55}
                />
                <Tooltip content={<HudTooltip />} />
                <Bar
                  dataKey="value"
                  name="Тыс. тонн"
                  radius={[0, 4, 4, 0]}
                  animationDuration={800}
                >
                  {fleetTonnageHighlighted.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isHighlighted ? CYAN : "#1e3a2b"}
                      stroke={entry.isHighlighted ? CYAN : "none"}
                      strokeWidth={entry.isHighlighted ? 1 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </GlassPanel>

      {/* ================================================================ */}
      {/* NUCLEAR ARSENAL SECTION                                          */}
      {/* ================================================================ */}
      {showNuclear && (
        <GlassPanel title="Ядерный арсенал" icon={<Radiation size={14} />}>
          <div className="grid grid-cols-1 gap-4">
            {/* Big number */}
            <div className="flex flex-col items-center justify-center gap-3">
              <BigNumber
                value={country.nuclearWarheads}
                label="Ядерных боеголовок"
                sublabel="оценка 2025"
              />

              {/* FAS source badge */}
              <a
                href={NUCLEAR_SOURCE.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 rounded border border-[#c76a5a33] bg-[#c76a5a11] px-2 py-1 font-mono text-[10px] uppercase text-[#c76a5a99] transition-colors hover:border-[#c76a5a66] hover:text-[#c76a5acc]"
              >
                {NUCLEAR_SOURCE.label}
              </a>
            </div>

            {/* Delivery systems */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#c76a5a99]">
                Средства доставки
              </div>
              <StatRow icon={<Rocket size={13} />} label="МБР" value={nuclearDelivery.icbm} highlight />
              <StatRow icon={<Waves size={13} />} label="БРПЛ" value={nuclearDelivery.slbm} highlight />
              <StatRow icon={<Plane size={13} />} label="Страт. бомб." value={nuclearDelivery.bombers} highlight />
            </div>

            {/* Triad indicator */}
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#c76a5a99]">
                Ядерная триада
              </div>
              <TriadIndicator
                land={nuclearDelivery.icbm > 0}
                sea={nuclearDelivery.slbm > 0}
                air={nuclearDelivery.bombers > 0}
              />
              <div className="mt-1 font-mono text-[10px] text-[#8eb8a6]">
                {nuclearDelivery.icbm > 0 && nuclearDelivery.slbm > 0 && nuclearDelivery.bombers > 0
                  ? "Полная триада"
                  : "Неполная триада"}
              </div>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* ================================================================ */}
      {/* OVERALL STRENGTH RADAR                                           */}
      {/* ================================================================ */}
      <GlassPanel title="Общая военная мощь" icon={<BarChart3 size={14} />}>
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius="70%"
              data={radarData}
            >
              <PolarGrid
                stroke="#6bb99522"
                gridType="polygon"
              />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: "#8eb8a6", fontSize: 10, fontFamily: "monospace" }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 10]}
                tick={false}
                axisLine={false}
              />
              <Radar
                name={country.nameRu}
                dataKey="value"
                stroke={CYAN}
                fill={CYAN}
                fillOpacity={0.15}
                strokeWidth={2}
                animationDuration={800}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0a1628ee",
                  border: "1px solid #6bb99544",
                  borderRadius: 4,
                  fontFamily: "monospace",
                  fontSize: 11,
                  boxShadow: "none",
                }}
                labelStyle={{ color: CYAN }}
                itemStyle={{ color: "#fff" }}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* Score summary */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {radarData.map((r) => (
              <div
                key={r.axis}
                className="flex flex-col items-center rounded border border-[#6bb99511] bg-[#6bb99505] px-2 py-1"
              >
                <span className="font-mono text-sm font-bold text-[#6bb995]">
                  {r.value}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wide text-[#8eb8a6]">
                  {r.axis}
                </span>
              </div>
            ))}
          </div>

          {/* BP Total */}
          <div className="mt-3 flex items-center gap-2">
            <span className="font-mono text-xs uppercase text-[#8eb8a6]">
              Боевой потенциал (РБП):
            </span>
            <span className="font-mono text-lg font-black text-[#6bb995]">
              {country.bpTotal?.toFixed(1) ?? "—"}
            </span>
            {country.bpRank && (
              <span
                className="rounded px-2 py-0.5 font-mono text-xs font-bold"
                style={{
                  backgroundColor: rankColor(country.bpRank) + "22",
                  color: rankColor(country.bpRank),
                  border: `1px solid ${rankColor(country.bpRank)}44`,
                }}
              >
                Место #{country.bpRank}
              </span>
            )}
          </div>
        </div>
      </GlassPanel>

      {/* ================================================================ */}
      {/* STRATEGIC SYSTEMS — missiles, air defense, warships (open est.)  */}
      {/* ================================================================ */}
      <GlassPanel title="Стратегические системы" icon={<RadarIcon size={14} />}>
        {(() => {
          const missiles = MISSILE_SYSTEMS.filter(m => m.iso === country.isoCode);
          const airDefense = AIR_DEFENSE_NETWORKS.find(n => n.iso === country.isoCode);
          const fleet = NAVY_FLEETS.find(f => f.iso === country.isoCode);
          if (missiles.length === 0 && !airDefense && !fleet) {
            return (
              <p className="text-[10px] text-slate-500">
                Модельные данные по ракетам, ПВО и флоту для этой страны ещё не собраны.
              </p>
            );
          }
          return (
            <div className="space-y-3">
              {missiles.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold text-tactical-secondary/70 tracking-wide uppercase">
                    Ракетные системы <span className="font-mono text-slate-500">{missiles.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {missiles.slice(0, 14).map((m, i) => (
                      <div key={`${m.name}-${i}`} className="flex items-baseline gap-2 text-[10px]">
                        <span className="min-w-0 flex-1 truncate text-slate-300" title={m.name}>{m.name}</span>
                        <span className="shrink-0 text-slate-500">{m.type}</span>
                        <span className="shrink-0 font-mono text-slate-400">
                          {m.count === null ? "—" : `×${m.count.toLocaleString("ru-RU")}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {airDefense && (
                <div>
                  <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold text-tactical-secondary/70 tracking-wide uppercase">
                    ПВО / ПРО <span className="font-mono text-slate-500">{airDefense.systems.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {airDefense.systems.slice(0, 12).map((s, i) => (
                      <div key={`${s.name}-${i}`} className="flex items-baseline gap-2 text-[10px]">
                        <span className="min-w-0 flex-1 truncate text-slate-300" title={s.name}>{s.name}</span>
                        <span className="shrink-0 text-slate-500">{s.tier}</span>
                        <span className="shrink-0 font-mono text-slate-400">
                          {s.count === null ? "—" : `×${s.count.toLocaleString("ru-RU")}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {fleet && (
                <div>
                  <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold text-tactical-secondary/70 tracking-wide uppercase">
                    Корабельный состав <span className="font-mono text-slate-500">{fleet.classes.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {fleet.classes.slice(0, 14).map((c, i) => (
                      <div key={`${c.name}-${i}`} className="flex items-baseline gap-2 text-[10px]">
                        <span className="min-w-0 flex-1 truncate text-slate-300" title={c.name}>{c.name}</span>
                        <span className="shrink-0 text-slate-500">{c.typeRu}</span>
                        <span className="shrink-0 font-mono text-slate-400">×{c.units}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-slate-600">Оценки открытых источников (IISS/GFP), округлены.</p>
            </div>
          );
        })()}
      </GlassPanel>

      {/* ================================================================ */}
      {/* ORDER OF BATTLE — operational formations (open sources)          */}
      {/* ================================================================ */}
      <GlassPanel title="Боевой порядок · формирования" icon={<Swords size={14} />}>
        {(() => {
          const formations = ORDER_OF_BATTLE.filter(f => f.iso === country.isoCode);
          if (formations.length === 0) {
            return (
              <p className="text-[10px] text-slate-500">
                Оргструктура вооружённых сил этой страны ещё не собрана.
              </p>
            );
          }
          return (
            <div className="space-y-1">
              {formations.slice(0, 20).map((f, i) => (
                <div key={`${f.nameRu}-${i}`} className="rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-semibold text-slate-200" title={f.nameRu}>{f.nameRu}</span>
                    <span className="shrink-0 text-[10px] text-slate-500">{f.typeRu}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400">
                    <span>{f.branchRu}</span>
                    <span className="text-slate-600">·</span>
                    <span>{f.locationRu}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">{f.strengthRu}</p>
                </div>
              ))}
            </div>
          );
        })()}
      </GlassPanel>

      {/* ================================================================ */}
      {/* WEAPON SPECS — detailed TTX of key systems (open sources)       */}
      {/* ================================================================ */}
      <GlassPanel title="Ключевые образцы ВВТ · ТТХ" icon={<Boxes size={14} />}>
        {(() => {
          const specs = WEAPON_SPECS.filter(w => w.originIso === country.isoCode);
          if (specs.length === 0) {
            return (
              <p className="text-[10px] text-slate-500">
                Детальные ТТХ образцов, разработанных в этой стране, ещё не собраны.
              </p>
            );
          }
          return (
            <div className="space-y-1.5">
              {specs.slice(0, 18).map(w => (
                <div key={w.id} className="rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-semibold text-slate-200" title={w.name}>{w.nameRu}</span>
                    <span className="shrink-0 font-mono text-[10px] text-slate-500">{w.category}</span>
                  </div>
                  <div className="mt-0.5 grid grid-cols-2 gap-x-2 text-[10px] text-slate-400">
                    {w.crew !== null && <span>Экипаж: <span className="text-slate-300">{w.crew}</span></span>}
                    {w.weightTons !== null && <span>Масса: <span className="text-slate-300">{w.weightTons} т</span></span>}
                    {w.rangeKm !== null && <span>Дальность: <span className="text-slate-300">{w.rangeKm} км</span></span>}
                    {w.speedKmh !== null && <span>Скорость: <span className="text-slate-300">{w.speedKmh} км/ч</span></span>}
                    {w.caliberMm !== null && <span>Калибр: <span className="text-slate-300">{w.caliberMm} мм</span></span>}
                    {w.yearInService !== null && <span>На службе: <span className="text-slate-300">с {w.yearInService}</span></span>}
                  </div>
                  {w.armamentRu && (
                    <p className="mt-1 text-[10px] leading-snug text-slate-500">{w.armamentRu}</p>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </GlassPanel>

      {/* ================================================================ */}
      {/* EQUIPMENT INVENTORY — model-level, open estimates (IISS/GFP)    */}
      {/* ================================================================ */}
      <GlassPanel title="Парк техники · модели" icon={<Boxes size={14} />}>
        {(() => {
          const equipment = EQUIPMENT_INDEX[country.isoCode];
          if (!equipment || equipment.entries.length === 0) {
            return (
              <p className="text-[10px] text-slate-500">
                Модельный состав вооружений этой страны не внесён в базу — суммарные
                численности см. в разделах выше.
              </p>
            );
          }
          return (
            <div className="space-y-2">
              {EQUIPMENT_GROUPS.map(group => {
                const entries = equipment.entries.filter(e => group.cats.includes(e.cat));
                if (entries.length === 0) return null;
                const units = entries.reduce((s, e) => s + e.count, 0);
                return (
                  <details
                    key={group.label}
                    className="group rounded border border-slate-700/60 bg-slate-900/40"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-1.5 [&::-webkit-details-marker]:hidden">
                      <ChevronDown size={11} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
                      <span className="min-w-0 truncate text-[11px] font-semibold text-slate-300">
                        {group.label}
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-500">
                        {entries.length} мод. · {units.toLocaleString("ru-RU")} ед.
                      </span>
                    </summary>
                    <div className="space-y-0.5 border-t border-slate-700/60 px-2 py-1.5">
                      {[...entries]
                        .sort((a, b) => b.count - a.count)
                        .map(e => (
                          <div key={`${e.cat}-${e.model}`} className="flex items-baseline gap-2 text-[10px]">
                            <span
                              className="min-w-0 flex-1 truncate text-slate-300"
                              title={`${e.model}${e.note ? ` · ${e.note}` : ""}`}
                            >
                              {e.model}
                            </span>
                            <span className="shrink-0 font-mono text-slate-400">
                              {e.count.toLocaleString("ru-RU")}
                            </span>
                          </div>
                        ))}
                    </div>
                  </details>
                );
              })}
              <p className="text-[10px] text-slate-600">
                Оценки открытых источников (IISS/GFP), округлены; находящееся в резерве
                помечено в примечаниях к модели.
              </p>
            </div>
          );
        })()}
      </GlassPanel>

      {/* Footer attribution */}
      <div className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#8eb8a666]">
        Данные: GFP 2025 · FAS Nuclear Notebook · Оценки РБП-Стратег
      </div>
    </div>
  );
}
