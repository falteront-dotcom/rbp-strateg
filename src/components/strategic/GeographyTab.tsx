"use client";

import { useMemo } from "react";import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import type { CountryCompareData } from "@/lib/comparison";
import { calcTerrainRaw, normalizeTerrain } from "@/lib/bp/terrain-potential";

type TerrainPotentialInput = Parameters<typeof calcTerrainRaw>[0];

interface TerrainTooltipPayload {
  payload?: { militaryImpact?: string };
}

// ─── Props ──────────────────────────────────────────────────────────────────
interface GeographyTabProps {
  country: CountryCompareData;
  allCountries?: CountryCompareData[];
}

// ─── Terrain composition model ──────────────────────────────────────────────
// Real estimation based on area, coastline, lat/lng proxy, side
// Uses known geographic data for major countries

interface TerrainBreakdown {
  name: string;
  value: number;   // percentage
  color: string;
  description: string;
  militaryImpact: string;
}

function computeTerrainComposition(c: CountryCompareData): TerrainBreakdown[] {
  // Use real geographic knowledge per country/region
  const iso = c.isoCode;

  // Known terrain profiles for major countries
  const KNOWN_TERRAIN: Record<string, number[]> = {
    // [plains%, mountain%, forest%, desert%, water%]
    RUS: [35, 20, 30, 5, 10],
    USA: [40, 15, 20, 10, 15],
    CHN: [30, 25, 22, 15, 8],
    IND: [45, 20, 15, 10, 10],
    BRA: [20, 10, 55, 5, 10],
    CAN: [30, 20, 30, 2, 18],
    AUS: [25, 5, 10, 50, 10],
    KAZ: [50, 10, 5, 30, 5],
    SAU: [25, 5, 0, 65, 5],
    IRN: [25, 30, 5, 35, 5],
    EGY: [50, 2, 0, 45, 3],
    MNG: [40, 15, 5, 35, 5],
    DZA: [20, 15, 5, 55, 5],
    GBR: [40, 10, 25, 0, 25],
    FRA: [45, 15, 25, 0, 15],
    DEU: [45, 10, 30, 0, 15],
    JPN: [20, 30, 35, 0, 15],
    KOR: [25, 30, 35, 0, 10],
    TUR: [25, 35, 20, 10, 10],
    UKR: [55, 5, 20, 2, 18],
    PAK: [35, 25, 10, 25, 5],
    IDN: [15, 15, 55, 0, 15],
  };

  const terrain = KNOWN_TERRAIN[iso] ?? estimateTerrain(c);

  return [
    { name: "Равнины", value: terrain[0], color: "#84cc16", description: "Открытая местность, благоприятная для манёвра", militaryImpact: "Бронетехника эффективна, низкое укрытие" },
    { name: "Горы", value: terrain[1], color: "#22d3ee", description: "Пересечённая местность, ограничивающая движение", militaryImpact: "Оборонительное преимущество, ограниченная логистика" },
    { name: "Леса", value: terrain[2], color: "#059669", description: "Лесистая местность с высоким укрытием", militaryImpact: "Пехота эффективна, броня уязвима, ограниченная видимость" },
    { name: "Пустыни", value: terrain[3], color: "#f59e0b", description: "Аридная местность с минимальным укрытием", militaryImpact: "Высокая видимость, логистика критична, броня доминирует" },
    { name: "Вода", value: terrain[4], color: "#3b82f6", description: "Реки, озёра, побережья", militaryImpact: "Требует переправочных средств, ограничивает наступление" },
  ];
}

function estimateTerrain(c: CountryCompareData): number[] {
  // Heuristic estimation when no known profile
  const landlocked = c.coastlineKm === 0;
  const waterPct = landlocked ? 2 : Math.min(20, Math.max(3, (c.coastlineKm / c.areaKm2) * 4));
  const mountainPct = c.areaKm2 > 2000000 ? 22 : c.areaKm2 > 500000 ? 15 : 8;
  const forestPct = c.areaKm2 > 500000 ? 22 : 15;
  const desertPct = c.areaKm2 > 2000000 && !landlocked ? 12 : 5;
  const plainsPct = Math.max(20, 100 - waterPct - mountainPct - forestPct - desertPct);
  return [plainsPct, mountainPct, forestPct, desertPct, waterPct];
}

// ─── Strategic depth calculation ─────────────────────────────────────────────
function computeStrategicDepth(c: CountryCompareData) {
  // Strategic depth = how far an invader must penetrate to reach vital centers
  // Approximated by sqrt(area/π) = effective radius
  const effectiveRadius = Math.sqrt(c.areaKm2 / Math.PI); // km

  // Score: based on effective radius
  // 0 km = 0, 200 km = 25, 500 km = 50, 1000 km = 75, 2000+ km = 100
  let score: number;
  if (effectiveRadius >= 2000) score = 95;
  else if (effectiveRadius >= 1000) score = 60 + (effectiveRadius - 1000) / 1000 * 35;
  else if (effectiveRadius >= 500) score = 40 + (effectiveRadius - 500) / 500 * 20;
  else if (effectiveRadius >= 200) score = 20 + (effectiveRadius - 200) / 300 * 20;
  else score = effectiveRadius / 200 * 20;

  score = Math.min(100, Math.max(0, score));

  const level = score >= 70 ? "Глубокая" : score >= 40 ? "Умеренная" : score >= 20 ? "Ограниченная" : "Минимальная";
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  // Natural barriers assessment
  const barriers: string[] = [];
  if (c.coastlineKm > 5000) barriers.push("Морские рубежи");
  if (c.areaKm2 > 1000000) barriers.push("Пространственная глубина");
  if (computeTerrainComposition(c).find(t => t.name === "Горы")!.value > 20) barriers.push("Горные хребты");
  if (computeTerrainComposition(c).find(t => t.name === "Леса")!.value > 25) barriers.push("Лесные массивы");

  return { score, level, color, effectiveRadius: Math.round(effectiveRadius), barriers };
}

// ─── Climate analysis ────────────────────────────────────────────────────────
function computeClimateAnalysis(c: CountryCompareData) {
  // Based on geographic knowledge per country
  const CLIMATE_MAP: Record<string, { zone: string; severity: number; impact: string }> = {
    RUS: { zone: "Континентальный / Субарктический", severity: 70, impact: "Зима ограничивает наступление 4-5 месяцев. Расстойка дорог весной. Мороз влияет на технику." },
    USA: { zone: "Разнообразный (умеренный – тропический)", severity: 25, impact: "Большинство территории благоприятны круглый год. Ураганы на побережье." },
    CHN: { zone: "Разнообразный (тропический – континентальный)", severity: 30, impact: "Юг — муссоны, Север — холод. Горы Тибета — экстремальные условия." },
    IND: { zone: "Тропический муссонный", severity: 45, impact: "Муссонные дожди парализуют движение 2-3 месяца. Жара истощает личный состав." },
    GBR: { zone: "Морской умеренный", severity: 10, impact: "Туманы и дожди ограничивают авиацию. Мягкий климат — минимальное влияние." },
    JPN: { zone: "Островной умеренный", severity: 25, impact: "Тайфуны, землетрясения. Горный рельеф ограничивает сухопутные операции." },
    TUR: { zone: "Средиземноморский / Континентальный", severity: 20, impact: "Лето — благоприятное. Зима в горах — ограничение. Босфор — стратегический пролив." },
    IRN: { zone: "Аридный / Континентальный", severity: 40, impact: "Пустыни на юге и западе. Засуха, пыльные бури. Горы Загрос — защита." },
    UKR: { zone: "Умеренный континентальный", severity: 15, impact: "Расстойка (бездорожье) весной и осенью — 'распутица'. Зима — умеренная." },
  };

  const known = CLIMATE_MAP[c.isoCode];
  if (known) return known;

  // Default estimation
  if (c.areaKm2 > 2000000) return { zone: "Континентальный", severity: 45, impact: "Экстремальные температуры ограничивают операции в отдельные сезоны." };
  if (c.coastlineKm > 5000) return { zone: "Морской / Умеренный", severity: 15, impact: "Мягкий климат, минимальное влияние на операции." };
  return { zone: "Умеренный", severity: 20, impact: "Стандартный умеренный климат, сезонные ограничения минимальны." };
}

// ─── Waterway access analysis ───────────────────────────────────────────────
function computeWaterwayAccess(c: CountryCompareData) {
  const landlocked = c.coastlineKm === 0;
  const coastlinePerArea = c.areaKm2 > 0 ? c.coastlineKm / c.areaKm2 : 0;

  // Navy potential from coastline
  let navyPotential: string;
  if (c.coastlineKm > 20000) navyPotential = "Океаническая держава";
  else if (c.coastlineKm > 5000) navyPotential = "Региональная морская сила";
  else if (c.coastlineKm > 500) navyPotential = "Прибрежная оборона";
  else if (!landlocked) navyPotential = "Ограниченный морской доступ";
  else navyPotential = "Сухопутная страна";

  // Strategic chokepoints
  const CHOKEPOINTS: Record<string, string[]> = {
    TUR: ["Босфор / Дарданеллы", "Контроль Черноморского прохода"],
    EGY: ["Суэцкий канал", "Контроль Красное море → Средиземноморье"],
    IRN: ["Ормузский пролив", "Контроль 20% мировой нефти"],
    PAN: ["Панамский канал", "Тихий ↔ Атлантический"],
    DJI: ["Баб-эль-Мандеб", "Суэц ↔ Индийский океан"],
    IDN: ["Малаккский пролив", "Контроль восточной логистики"],
  };

  const nearbyChokepoints = CHOKEPOINTS[c.isoCode] ?? [];

  return {
    landlocked,
    navyPotential,
    coastlineKm: c.coastlineKm,
    ports: c.ports,
    coastlinePerArea: Math.round(coastlinePerArea * 10000) / 10000,
    nearbyChokepoints,
  };
}

// ─── Border analysis ─────────────────────────────────────────────────────────
function computeBorderAnalysis(c: CountryCompareData) {
  // Estimate from geographic data and alliance membership
  const NATO_MEMBERS = new Set(["USA","GBR","FRA","DEU","ITA","ESP","POL","TUR","CAN","NOR","NLD","BEL","DEN","PRT","GRC","CZE","HUN","ROU","BGR","SVK","SVN","HRV","LTU","LVA","EST","FIN","SWE","LUX","ISL","ALB","MNE","MKD","SVN"]);
  const CSTO_MEMBERS = new Set(["RUS","BLR","ARM","KAZ","KGZ","TJK"]);

  // Approximate number of neighbors based on area
  const estimatedNeighbors = c.areaKm2 > 5000000 ? 12 : c.areaKm2 > 1000000 ? 8 : c.areaKm2 > 200000 ? 5 : 3;

  // Alliance classification
  const isNATO = NATO_MEMBERS.has(c.isoCode) || c.side === "NATO";
  const isCSTO = CSTO_MEMBERS.has(c.isoCode) || c.side === "RUS";

  // Estimate hostile vs friendly borders
  let hostilePct: number;
  if (c.isoCode === "RUS") hostilePct = 40; // NATO border
  else if (c.isoCode === "UKR") hostilePct = 60; // at war
  else if (isNATO) hostilePct = 10; // mostly friendly
  else if (isCSTO) hostilePct = 25; // NATO border
  else hostilePct = 20;

  const hostile = Math.round(estimatedNeighbors * hostilePct / 100);
  const friendly = estimatedNeighbors - hostile;

  return {
    total: estimatedNeighbors,
    hostile,
    friendly,
    fortified: c.isoCode === "RUS" || c.isoCode === "PRK" || c.isoCode === "ISR",
    assessment: hostile > friendly
      ? "Враждебное окружение — высокие оборонительные потребности"
      : hostile > 0
      ? "Смешанное окружение — умеренная оборонная нагрузка"
      : "Дружественное окружение — минимальная сухопутная угроза",
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
export function GeographyTab({ country, allCountries = [] }: GeographyTabProps) {
  const terrain = useMemo(() => computeTerrainComposition(country), [country]);
  const strategicDepth = useMemo(() => computeStrategicDepth(country), [country]);
  const climate = useMemo(() => computeClimateAnalysis(country), [country]);
  const waterway = useMemo(() => computeWaterwayAccess(country), [country]);
  const borders = useMemo(() => computeBorderAnalysis(country), [country]);

  // Real terrain score from BP model
  const terrainScore = useMemo(() => {
    if (allCountries.length > 0) {
      const rawResult = calcTerrainRaw(country as unknown as TerrainPotentialInput);
      const allRaws = allCountries.map(c => calcTerrainRaw(c as unknown as TerrainPotentialInput).raw);
      return Math.round(normalizeTerrain(rawResult.raw, allRaws));
    }
    return null;
  }, [country, allCountries]);

  return (
    <div className="space-y-4 font-mono">
      {/* ─── Terrain Score Overview ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase">
            ◈ Географический потенциал (T)
          </h3>
          {terrainScore !== null && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-tactical-primary">{terrainScore}</span>
              <span className="text-[9px] text-slate-500">/ 100</span>
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-400">
          Площадь: <span className="text-slate-300">{country.areaKm2.toLocaleString()} км²</span> ·
          Побережье: <span className="text-slate-300">{country.coastlineKm.toLocaleString()} км</span>
        </p>
      </motion.div>

      {/* ─── Terrain Composition ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-4">
        <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-3">
          ◈ Состав местности
        </h3>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="45%" height={160} minWidth={0} minHeight={1}>
            <PieChart>
              <Pie data={terrain} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                {terrain.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0e1520ee",
                  border: "1px solid #22d3ee40",
                  borderRadius: 8,
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
                formatter={(value: number | string | undefined, _name: string | undefined, props: TerrainTooltipPayload) => [`${value ?? 0}% — ${props.payload?.militaryImpact ?? ""}`]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1">
            {terrain.map((t, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[10px]">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-slate-400 flex-1">{t.name}</span>
                <span className="text-slate-300">{t.value}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 text-[9px] text-slate-500 border-t border-white/5 pt-2">
          {terrain.find(t => t.value === Math.max(...terrain.map(x => x.value)))?.militaryImpact}
        </div>
      </motion.div>

      {/* ─── Strategic Depth ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-lg p-4">
        <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-3">
          ◈ Стратегическая глубина
        </h3>
        <div className="flex items-center justify-between mb-1">
          <span className="text-lg font-bold" style={{ color: strategicDepth.color }}>
            {strategicDepth.level}
          </span>
          <div className="text-right">
            <span className="text-2xl font-bold text-tactical-primary">{Math.round(strategicDepth.score)}</span>
            <span className="text-[9px] text-slate-500"> / 100</span>
          </div>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${strategicDepth.score}%` }}
            transition={{ duration: 0.8 }}
            className="h-full rounded-full"
            style={{ backgroundColor: strategicDepth.color }}
          />
        </div>
        <div className="mt-2 space-y-1">
          <div className="text-[10px] text-slate-400">
            Эффективный радиус: <span className="text-slate-300">{strategicDepth.effectiveRadius.toLocaleString()} км</span>
            — расстояние, которое должен преодолеть агрессор
          </div>
          {strategicDepth.barriers.length > 0 && (
            <div className="text-[10px] text-slate-400">
              Естественные барьеры:{" "}
              {strategicDepth.barriers.map((b, i) => (
                <span key={i} className="text-emerald-400">{b}{i < strategicDepth.barriers.length - 1 ? ", " : ""}</span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── Climate & Waterway ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-md p-3">
          <h4 className="text-[10px] font-bold text-tactical-primary tracking-widest uppercase mb-2">
            Климат
          </h4>
          <span className="text-xs text-slate-300">{climate.zone}</span>
          <div className="mt-2">
            <div className="flex items-center justify-between text-[9px] mb-0.5">
              <span className="text-slate-500">Суровость</span>
              <span className="text-slate-300">{climate.severity}/100</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${climate.severity}%`,
                  backgroundColor: climate.severity > 50 ? "#ef4444" : climate.severity > 25 ? "#f59e0b" : "#22d3ee",
                }}
              />
            </div>
          </div>
          <div className="mt-2 text-[9px] text-slate-500 leading-relaxed">
            {climate.impact}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-md p-3">
          <h4 className="text-[10px] font-bold text-tactical-primary tracking-widest uppercase mb-2">
            Водные пути
          </h4>
          <div className="text-xs text-slate-300 font-semibold">{waterway.navyPotential}</div>
          <div className="mt-1 text-[9px] text-slate-400">
            {waterway.landlocked
              ? "⚠️ Нет выхода к морю — невозможно проектировать морскую силу"
              : `Побережье: ${waterway.coastlineKm.toLocaleString()} км · Портов: ${waterway.ports}`}
          </div>
          {waterway.nearbyChokepoints.length > 0 && (
            <div className="mt-2 text-[9px] text-amber-400">
              ⚡ Стратегические проливы:
              {waterway.nearbyChokepoints.map((cp, i) => (
                <div key={i} className="ml-2 text-amber-300">{cp}</div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ─── Border Analysis ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
        <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-2">
          ◈ Анализ границ
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center mb-2">
          <div className="glass-panel rounded-md p-2">
            <div className="text-lg font-bold text-slate-300">{borders.total}</div>
            <div className="text-[9px] text-slate-500">Соседей</div>
          </div>
          <div className="glass-panel rounded-md p-2">
            <div className="text-lg font-bold text-emerald-400">{borders.friendly}</div>
            <div className="text-[9px] text-slate-500">Дружественные</div>
          </div>
          <div className="glass-panel rounded-md p-2">
            <div className="text-lg font-bold text-red-400">{borders.hostile}</div>
            <div className="text-[9px] text-slate-500">Враждебные</div>
          </div>
        </div>
        <div className="text-[10px] text-slate-400">{borders.assessment}</div>
        {borders.fortified && (
          <div className="mt-1 text-[9px] text-amber-400">⚠️ Укреплённые границы — оборонительная ориентация</div>
        )}
      </motion.div>

      {/* ─── Infrastructure Score ──────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
        <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-2">
          ◈ Инфраструктура
        </h3>
        <div className="space-y-1.5">
          {[
            { label: "Аэропорты", value: country.airfields, max: 500, icon: "✈", desc: "Ключевой фактор мобильности ВВС и логистики" },
            { label: "Порты", value: country.ports, max: 50, icon: "⚓", desc: "Морская логистика и проекция силы" },
            { label: "Торговый флот", value: country.merchantFleet, max: 5000, icon: "🚢", desc: "Мобилизационный резерв морской логистики" },
          ].map((item) => (
            <div key={item.label} className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">{item.icon} {item.label}</span>
                <span className="text-slate-300 font-bold">{item.value.toLocaleString()}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }}
                  className="h-full rounded-full bg-tactical-primary/60"
                />
              </div>
              <div className="text-[8px] text-slate-600">{item.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
