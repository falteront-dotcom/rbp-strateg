"use client";

import { Flag } from "@/components/Flag";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Area,
  AreaChart,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import type { CountryCompareData } from "@/lib/comparison";
import { getBPTierColor } from "@/lib/comparison";
import { HISTORICAL_CONFLICTS } from "@/lib/data/conflict-history.generated";
import { HISTORICAL_BATTLES } from "@/lib/data/battles.generated";
import { MILITARY_CAMPAIGNS } from "@/lib/data/campaigns.generated";
import { Sparkline } from "@/components/viz/Sparkline";
import { BUDGET_SERIES } from "@/lib/data/budgets.generated";

// ─── Props ──────────────────────────────────────────────────────────────────
interface AnalyticsTabProps {
  countries: CountryCompareData[];
  selectedISO: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDistribution(countries: CountryCompareData[]) {
  const bins = [
    { range: "0-20", min: 0, max: 20, count: 0 },
    { range: "20-40", min: 20, max: 40, count: 0 },
    { range: "40-60", min: 40, max: 60, count: 0 },
    { range: "60-80", min: 60, max: 80, count: 0 },
    { range: "80-100", min: 80, max: 100, count: 0 },
  ];
  for (const c of countries) {
    const bin = bins.find((b) => c.bpTotal >= b.min && c.bpTotal < b.max);
    if (bin) bin.count++;
  }
  return bins;
}

function getTrendData(country: CountryCompareData[]): { year: number; bp: number; forecast?: number; upper?: number; lower?: number }[] {
  if (country.length === 0) return [];
  const c = country[0];
  const baseBP = c.bpTotal;
  const years = [];
  // Mock 5-year historical
  for (let y = 2020; y <= 2024; y++) {
    const variation = (Math.sin(y * 0.7) * 3) + (y - 2020) * 0.5;
    years.push({ year: y, bp: Math.max(0, baseBP - 2 + variation) });
  }
  // Mock 3-year forecast
  for (let y = 2025; y <= 2027; y++) {
    const fbp = baseBP + (y - 2024) * 0.8;
    years.push({ year: y, bp: undefined as unknown as number, forecast: fbp, upper: fbp + 3, lower: fbp - 3 });
  }
  return years;
}

function getAnomalies(countries: CountryCompareData[]) {
  // Countries where BP significantly differs from what economy alone would predict
  return countries
    .map((c) => {
      const expectedBP = (c.bpEconomy / 100) * 60 + 20; // rough estimate
      const anomaly = c.bpTotal - expectedBP;
      return { ...c, expectedBP, anomaly, type: anomaly > 10 ? "over" : anomaly < -10 ? "under" : "normal" };
    })
    .filter((c) => c.type !== "normal")
    .sort((a, b) => Math.abs(b.anomaly) - Math.abs(a.anomaly))
    .slice(0, 10);
}

// ─── Component ───────────────────────────────────────────────────────────────
export function AnalyticsTab({ countries, selectedISO }: AnalyticsTabProps) {
  const [sortKey, setSortKey] = useState<"bpTotal" | "bpWeapon" | "bpEconomy">("bpTotal");

  const selected = useMemo(
    () => countries.find((c) => c.isoCode === selectedISO),
    [countries, selectedISO]
  );

  const rankedCountries = useMemo(
    () => [...countries].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number)).slice(0, 50),
    [countries, sortKey]
  );

  const distribution = useMemo(() => getDistribution(countries), [countries]);
  const trendData = useMemo(() => selected ? getTrendData([selected]) : [], [selected]);
  const anomalies = useMemo(() => getAnomalies(countries), [countries]);

  // Power concentration
  const concentration = useMemo(() => {
    const totalBP = countries.reduce((s, c) => s + c.bpTotal, 0);
    const sorted = [...countries].sort((a, b) => b.bpTotal - a.bpTotal);
    const top5 = sorted.slice(0, 5).reduce((s, c) => s + c.bpTotal, 0);
    const top10 = sorted.slice(0, 10).reduce((s, c) => s + c.bpTotal, 0);
    const top25 = sorted.slice(0, 25).reduce((s, c) => s + c.bpTotal, 0);
    return [
      { group: "Топ-5", pct: totalBP > 0 ? ((top5 / totalBP) * 100).toFixed(1) : "0" },
      { group: "Топ-10", pct: totalBP > 0 ? ((top10 / totalBP) * 100).toFixed(1) : "0" },
      { group: "Топ-25", pct: totalBP > 0 ? ((top25 / totalBP) * 100).toFixed(1) : "0" },
      { group: "Остальные", pct: totalBP > 0 ? (((totalBP - top25) / totalBP) * 100).toFixed(1) : "0" },
    ];
  }, [countries]);

  return (
    <div className="space-y-4 font-mono">
      {/* ─── Global Rankings ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase">
            ◈ Мировой рейтинг
          </h3>
          <div className="flex gap-1">
            {([["bpTotal", "БП"], ["bpWeapon", "Оружие"], ["bpEconomy", "Экономика"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortKey(key)}
                className={`inline-flex min-h-8 items-center px-2 py-0.5 text-[10px] rounded border ${
                  sortKey === key
                    ? "border-tactical-primary/50 text-tactical-primary bg-tactical-primary/10"
                    : "border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
          {rankedCountries.map((c, idx) => (
            <div
              key={c.isoCode}
              className={`flex items-center justify-between py-1 px-2 rounded text-[10px] ${
                c.isoCode === selectedISO ? "bg-tactical-primary/10 border border-tactical-primary/30" : ""
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="w-5 text-right text-slate-500">{idx + 1}</span>
                <span className="text-sm"><Flag iso={c.isoCode} /></span>
                <span className="text-slate-300 truncate">{c.nameRu}</span>
                <span className="text-[10px] text-slate-600">{c.side}</span>
              </div>
              <span className="font-bold" style={{ color: getBPTierColor(c[sortKey] as number) }}>
                {(c[sortKey] as number).toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── BP Distribution ──────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-lg p-4">
        <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-3">
          ◈ Распределение БП
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={distribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#213d32" />
            <XAxis dataKey="range" tick={{ fill: "#94a3a4", fontSize: 10 }} />
            <YAxis tick={{ fill: "#8eb8a6", fontSize: 10 }} tickFormatter={(v: number) => Math.round(v).toLocaleString("ru-RU")} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0e1710ee",
                border: "1px solid #4fb28740",
                borderRadius: 8,
                fontSize: 10,
                fontFamily: "monospace",
              }}
            />
            <Bar dataKey="count" fill="#4fb287" radius={[4, 4, 0, 0]}>
              {distribution.map((_, idx) => (
                <Cell key={idx} fill={["#9db3a8", "#6b8fa0", "#4fb287", "#f59e0b", "#ef4444"][idx]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ─── Trend + Forecast ────────────────────────────────────────────── */}
      {selected && trendData.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-4">
          <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-3">
            ◈ Тренд: {selected.nameRu}
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#213d32" />
              <XAxis dataKey="year" tick={{ fill: "#94a3a4", fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#8eb8a6", fontSize: 10 }} tickFormatter={(v: number) => Math.round(v).toLocaleString("ru-RU")} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0e1710ee",
                  border: "1px solid #4fb28740",
                  borderRadius: 8,
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
              />
              <Area type="monotone" dataKey="bp" stroke="#4fb287" fill="#4fb287" fillOpacity={0.15} strokeWidth={2} />
              <Line type="monotone" dataKey="forecast" stroke="#a78bfa" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="#a78bfa" fillOpacity={0.05} />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#a78bfa" fillOpacity={0.05} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-3 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-tactical-primary inline-block" /> Исторические</span>
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-purple-400 inline-block" style={{ borderStyle: "dashed" }} /> Прогноз</span>
          </div>
        </motion.div>
      )}

      {/* ─── Anomaly Detection ──────────────────────────────────────────── */}
      {anomalies.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
          <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-2">
            ◈ Аномалии (БП ≠ экономика)
          </h3>
          <div className="space-y-1">
            {anomalies.map((c) => (
              <div key={c.isoCode} className="flex items-center justify-between text-[10px] py-1 px-2 rounded hover:bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-sm"><Flag iso={c.isoCode} /></span>
                  <span className="text-slate-300">{c.nameRu}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">БП: {c.bpTotal.toFixed(1)}</span>
                  <span className="text-slate-500">Ожид: {c.expectedBP.toFixed(1)}</span>
                  <span className={c.type === "over" ? "text-emerald-400" : "text-red-400"}>
                    {c.anomaly > 0 ? "↑" : "↓"}{Math.abs(c.anomaly).toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Power Concentration ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
        <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-2">
          ◈ Концентрация мощи
        </h3>
        <div className="space-y-2">
          {concentration.map((c) => (
            <div key={c.group} className="flex items-center gap-2 text-[10px]">
              <span className="text-slate-400 w-16">{c.group}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-tactical-primary"
                  style={{ width: `${Math.min(100, parseFloat(c.pct))}%` }}
                />
              </div>
              <span className="text-slate-300 w-10 text-right">{c.pct}%</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── Blocs & Alliances ───────────────────────────────────── */}
      {(() => {
        const groups = new Map<string, { totalBP: number; members: number }>();
        let worldBP = 0;
        for (const c of countries) {
          worldBP += c.bpTotal;
          const key = c.coalition ?? c.side;
          const g = groups.get(key) ?? { totalBP: 0, members: 0 };
          g.totalBP += c.bpTotal;
          g.members += 1;
          groups.set(key, g);
        }
        const rows = [...groups.entries()].sort((a, b) => b[1].totalBP - a[1].totalBP).slice(0, 8);
        const maxBP = rows[0]?.[1].totalBP ?? 1;
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
            <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-2">
              ◈ Блоки и союзы
            </h3>
            <div className="space-y-1.5">
              {rows.map(([name, g]) => (
                <div key={name} className="flex items-center gap-2 text-[10px]">
                  <span className="w-20 truncate text-slate-400" title={name}>{name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-tactical-primary" style={{ width: `${(g.totalBP / maxBP) * 100}%` }} />
                  </div>
                  <span className="w-24 shrink-0 text-right font-mono text-slate-300">{g.totalBP.toFixed(0)} · {g.members} гос.</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[10px] text-slate-500">Суммарный БП по блокам · мировой итог {worldBP.toFixed(0)}</div>
          </motion.div>
        );
      })()}

      {/* ─── Nuclear Club ────────────────────────────────────────── */}
      {(() => {
        const holders = countries.filter(c => c.nuclearWarheads > 0).sort((a, b) => b.nuclearWarheads - a.nuclearWarheads);
        if (holders.length === 0) return null;
        const total = holders.reduce((s, c) => s + c.nuclearWarheads, 0);
        const max = holders[0].nuclearWarheads;
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
            <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-2">
              ◈ Ядерный клуб
            </h3>
            <div className="space-y-1.5">
              {holders.map(c => (
                <div key={c.isoCode} className="flex items-center gap-2 text-[10px]">
                  <span className="w-20 truncate text-slate-400">{c.nameRu}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-orange-500/80" style={{ width: `${(c.nuclearWarheads / max) * 100}%` }} />
                  </div>
                  <span className="w-24 shrink-0 text-right font-mono text-slate-300">{c.nuclearWarheads.toLocaleString("ru-RU")} · {((c.nuclearWarheads / total) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[10px] text-slate-500">Боеголовки (оценка FAS) · всего {total.toLocaleString("ru-RU")} в {holders.length} государствах</div>
          </motion.div>
        );
      })()}
      {/* ─── Military history (aggregated) ─── */}
      {(() => {
        const decades = new Map<number, number>();
        for (const b of HISTORICAL_BATTLES) {
          const dec = Math.floor(b.year / 10) * 10;
          decades.set(dec, (decades.get(dec) ?? 0) + 1);
        }
        const decRows = [...decades.entries()].sort((a, b) => a[0] - b[0]);
        const byCountry = new Map<string, number>();
        for (const b of HISTORICAL_BATTLES) {
          for (const iso of b.isoCodes) byCountry.set(iso, (byCountry.get(iso) ?? 0) + 1);
        }
        const top = [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
        const topMax = top[0]?.[1] ?? 1;
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
            <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-2">
              ◈ Военная история · агрегаты
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded bg-slate-900/40 px-1 py-1.5">
                <div className="font-mono text-sm font-bold text-slate-200 tabular-nums">{HISTORICAL_CONFLICTS.length}</div>
                <div className="text-[10px] text-slate-500">конфликтов 1945–2025</div>
              </div>
              <div className="rounded bg-slate-900/40 px-1 py-1.5">
                <div className="font-mono text-sm font-bold text-slate-200 tabular-nums">{HISTORICAL_BATTLES.length}</div>
                <div className="text-[10px] text-slate-500">сражений 1900–2025</div>
              </div>
              <div className="rounded bg-slate-900/40 px-1 py-1.5">
                <div className="font-mono text-sm font-bold text-slate-200 tabular-nums">{MILITARY_CAMPAIGNS.length}</div>
                <div className="text-[10px] text-slate-500">кампаний-операций</div>
              </div>
            </div>
            {decRows.length >= 2 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] text-slate-500">Сражений по десятилетиям:</span>
                <Sparkline values={decRows.map(d => d[1])} width={120} height={20} label="Динамика числа сражений по десятилетиям" />
                <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                  {decRows[0][0]}–{decRows[decRows.length - 1][0] + 9}
                </span>
              </div>
            )}
            {top.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-[10px] text-slate-500">Чаще всего в сражениях базы:</div>
                {top.map(([iso, n]) => (
                  <div key={iso} className="flex items-center gap-2 text-[10px]">
                    <span className="w-12 shrink-0 text-slate-400"><Flag iso={iso} /> {iso}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-tactical-primary" style={{ width: `${(n / topMax) * 100}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono text-slate-400 tabular-nums">{n}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 text-[10px] text-slate-600">Сводка по базе сражений/кампаний; оценки потерь — в карточках записей.</div>
          </motion.div>
        );
      })()}
      {/* ─── World budgets (trend from budget series) ─── */}
      {(() => {
        const latest = BUDGET_SERIES
          .map(s => {
            const pts = s.points.filter(p => p.usdBn !== null) as { year: number; usdBn: number }[];
            return pts.length >= 2 ? { iso: s.iso, pts, last: pts[pts.length - 1].usdBn } : null;
          })
          .filter((x): x is { iso: string; pts: { year: number; usdBn: number }[]; last: number } => x !== null)
          .sort((a, b) => b.last - a.last)
          .slice(0, 10);
        const maxLast = latest[0]?.last ?? 1;
        const total = latest.reduce((s, x) => s + x.last, 0);
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
            <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-2">
              ◈ Бюджеты мира · топ-10
            </h3>
            <div className="space-y-1">
              {latest.map((x, i) => (
                <div key={x.iso} className="flex items-center gap-2 text-[10px]">
                  <span className="w-6 shrink-0 font-mono text-slate-600 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="w-16 shrink-0 text-slate-400"><Flag iso={x.iso} /> {x.iso}</span>
                  <Sparkline values={x.pts.map(p => p.usdBn)} width={90} height={18} />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-tactical-primary" style={{ width: `${(x.last / maxLast) * 100}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right font-mono text-slate-300 tabular-nums">
                    {x.last >= 1e9 ? `$${(x.last / 1e9).toFixed(0)} млрд` : `$${(x.last / 1e6).toFixed(0)} млн`}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-white/15 pt-1 text-[10px]">
              <span className="text-slate-500">Σ топ-10 (последний год ряда)</span>
              <span className="font-mono text-slate-300 tabular-nums">${(total / 1e12).toFixed(2)} трлн</span>
            </div>
          </motion.div>
        );
      })()}
    </div>
  );
}
