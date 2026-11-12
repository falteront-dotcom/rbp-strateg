"use client";

/**
 * ActiveCompareWindow — активное сравнение двух государств в отдельном окне.
 *
 * Строки-факторы выстроены в плюс/минус-матрицу: значение A, дельта, значение B.
 * Группы факторов сворачиваемые (группировки войск, техника, экономика,
 * география и ТВД, опыт и союзы). Все данные — из того же, что видит
 * пользователь в панели: модели знаний + показатели страны; дистанции
 * считаются по большим кругам из центроидов реестра.
 */

import { useMemo, useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { useDialog } from "@/lib/use-dialog";
import type { CountryCompareData } from "@/lib/comparison";
import { getBPTierLabel } from "@/lib/bp/tiers";
import { Flag } from "@/components/Flag";
import { ORDER_OF_BATTLE } from "@/lib/data/order-of-battle.generated";
import { FORCE_STRUCTURES } from "@/lib/data/personnel.generated";
import { MISSILE_SYSTEMS } from "@/lib/data/missiles.generated";
import { AIR_DEFENSE_NETWORKS } from "@/lib/data/airdefense.generated";
import { WEAPON_SPECS } from "@/lib/data/weapons.generated";
import { TREATIES } from "@/lib/data/treaties.generated";
import { HISTORICAL_CONFLICTS } from "@/lib/data/conflict-history.generated";
import { HISTORICAL_BATTLES } from "@/lib/data/battles.generated";
import { MILITARY_CAMPAIGNS } from "@/lib/data/campaigns.generated";
import { MILITARY_INFRA } from "@/lib/data/infrastructure.generated";
import { CHOKEPOINTS } from "@/lib/data/chokepoints.generated";
import { WORLD_BANK_INDEX } from "@/lib/data/world-bank.generated";
import { getCentroid } from "@/lib/geo/country-centroids";

// ─── Геодезия ───────────────────────────────────────────────────────────────

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function centroidOf(iso: string): { lat: number; lng: number } | null {
  const c = getCentroid(iso);
  return c ? { lat: c.lat, lng: c.lng } : null;
}

// ─── Сводки по моделям знаний ───────────────────────────────────────────────

interface IsoSummary {
  formations: number;
  formationsGround: number;
  formationsAir: number;
  formationsNaval: number;
  branches: number;
  missileSystems: number;
  airDefense: number;
  weaponsOwn: number;
  treaties: number;
  conflicts: number;
  battles: number;
  campaigns: number;
  infra: number;
  nearestChokeKm: number | null;
  infraWithCoords: number;
}

function summarize(iso: string): IsoSummary {
  const formations = ORDER_OF_BATTLE.filter(f => f.iso === iso);
  const countBranch = (re: RegExp) => formations.filter(f => re.test(f.branchRu + " " + f.typeRu)).length;
  const struct = FORCE_STRUCTURES.find(s => s.iso === iso);
  const chokeDistances: number[] = [];
  const c0 = centroidOf(iso);
  if (c0) {
    for (const ck of CHOKEPOINTS) {
      if (ck.lat !== null && ck.lng !== null) {
        chokeDistances.push(distanceKm(c0.lat, c0.lng, ck.lat, ck.lng));
      }
    }
  }
  return {
    formations: formations.length,
    formationsGround: countBranch(/сухопут|армия|пехот|танк|брон|артилл|десант/i),
    formationsAir: countBranch(/авиа|ввс|воздуш|крыло|авиаполк/i),
    formationsNaval: countBranch(/флот|вмс|морск|эскадр|флотил/i),
    branches: struct ? struct.branches.length : 0,
    missileSystems: MISSILE_SYSTEMS.filter(m => m.iso === iso).length,
    airDefense: (AIR_DEFENSE_NETWORKS.find(n => n.iso === iso)?.systems.length ?? 0),
    weaponsOwn: WEAPON_SPECS.filter(w => w.originIso === iso).length,
    treaties: TREATIES.filter(t => t.membersIso.includes(iso)).length,
    conflicts: HISTORICAL_CONFLICTS.filter(c => c.isoCodes.includes(iso)).length,
    battles: HISTORICAL_BATTLES.filter(b => b.isoCodes.includes(iso)).length,
    campaigns: MILITARY_CAMPAIGNS.filter(c => c.isoCodes.includes(iso)).length,
    infra: MILITARY_INFRA.filter(i => i.iso === iso).length,
    nearestChokeKm: chokeDistances.length ? Math.round(Math.min(...chokeDistances)) : null,
    infraWithCoords: MILITARY_INFRA.filter(i => i.iso === iso && i.lat !== null).length,
  };
}

// ─── Матрица факторов ───────────────────────────────────────────────────────

type Better = "high" | "low" | "none";

interface Factor {
  key: string;
  label: string;
  a: number | null;
  b: number | null;
  unit?: string;
  better: Better;
  /** Пояснение (ТВД, источники). */
  note?: string;
}

interface FactorGroup {
  id: string;
  title: string;
  factors: Factor[];
}

function fmtNum(v: number | null, digits = 0): string {
  if (v === null) return "—";
  return v.toLocaleString("ru-RU", { maximumFractionDigits: digits });
}

function fmtDelta(a: number | null, b: number | null, digits = 0): string {
  if (a === null || b === null) return "—";
  const d = a - b;
  if (Math.abs(d) < 1e-9) return "=";
  const abs = Math.abs(d);
  let s: string;
  if (abs >= 1e6) s = `${(abs / 1e6).toFixed(1).replace(".", ",")} млн`;
  else if (abs >= 10000) s = `${Math.round(abs / 1000).toLocaleString("ru-RU")} тыс.`;
  else s = abs.toLocaleString("ru-RU", { maximumFractionDigits: digits });
  return d > 0 ? `+${s}` : `−${s}`;
}

/** Кто лидирует по фактору: 1 — сторона A, −1 — B, 0 — паритет. */
function leader(f: Factor): number {
  if (f.a === null || f.b === null || f.better === "none") return 0;
  if (Math.abs(f.a - f.b) < 1e-9) return 0;
  const aBetter = f.better === "high" ? f.a > f.b : f.a < f.b;
  return aBetter ? 1 : -1;
}

export function ActiveCompareWindow({
  a,
  allCountries,
  onClose,
}: {
  a: CountryCompareData;
  allCountries: CountryCompareData[];
  onClose: () => void;
}) {
  const opponents = useMemo(
    () => allCountries.filter(c => c.isoCode !== a.isoCode).sort((x, y) => y.bpTotal - x.bpTotal),
    [allCountries, a.isoCode],
  );
  // Окно открыто, пока компонент смонтирован: закрытие размонтирует его.
  const dialogRef = useDialog(true, onClose);
  const [bIso, setBIso] = useState<string>(opponents[0]?.isoCode ?? "CHN");
  const b = opponents.find(c => c.isoCode === bIso) ?? opponents[0];
  const [open, setOpen] = useState<Record<string, boolean>>({ troops: true, equipment: true });

  const groups = useMemo<FactorGroup[]>(() => {
    if (!b) return [];
    const sa = summarize(a.isoCode);
    const sb = summarize(b.isoCode);
    const wbA = WORLD_BANK_INDEX[a.isoCode];
    const wbB = WORLD_BANK_INDEX[b.isoCode];
    const cA = centroidOf(a.isoCode);
    const cB = centroidOf(b.isoCode);
    const between = cA && cB ? Math.round(distanceKm(cA.lat, cA.lng, cB.lat, cB.lng)) : null;

    return [
      {
        id: "troops",
        title: "Группировки войск и структура",
        factors: [
          { key: "formations", label: "Формирований (боевой порядок)", a: sa.formations, b: sb.formations, better: "high" },
          { key: "fg", label: "— сухопутные соединения", a: sa.formationsGround, b: sb.formationsGround, better: "high" },
          { key: "fa", label: "— авиационные соединения", a: sa.formationsAir, b: sb.formationsAir, better: "high" },
          { key: "fn", label: "— морские соединения", a: sa.formationsNaval, b: sb.formationsNaval, better: "high" },
          { key: "branches", label: "Ветвей ВС (структура)", a: sa.branches, b: sb.branches, better: "high" },
          { key: "active", label: "Активный состав", a: a.activePersonnel, b: b.activePersonnel, unit: "чел.", better: "high" },
          { key: "reserve", label: "Резерв", a: a.reservePersonnel, b: b.reservePersonnel, unit: "чел.", better: "high" },
          { key: "fit", label: "Пригодны к службе", a: Math.round(a.fitForServiceM * 1_000_000), b: Math.round(b.fitForServiceM * 1_000_000), unit: "чел.", better: "high" },
        ],
      },
      {
        id: "equipment",
        title: "Вооружения и техника",
        factors: [
          { key: "tanks", label: "Танки", a: a.totalTanks, b: b.totalTanks, unit: "ед.", better: "high" },
          { key: "afv", label: "БТР / БМП", a: a.totalAfv, b: b.totalAfv, unit: "ед.", better: "high" },
          { key: "arty", label: "Артиллерия", a: a.totalArtillery, b: b.totalArtillery, unit: "ед.", better: "high" },
          { key: "mlrs", label: "РСЗО", a: a.totalMlrs, b: b.totalMlrs, unit: "ед.", better: "high" },
          { key: "air", label: "Самолёты", a: a.totalAircraft, b: b.totalAircraft, unit: "ед.", better: "high" },
          { key: "heli", label: "Вертолёты", a: a.totalHelicopters, b: b.totalHelicopters, unit: "ед.", better: "high" },
          { key: "navy", label: "Корабли", a: a.totalNavy, b: b.totalNavy, unit: "ед.", better: "high" },
          { key: "sub", label: "Подлодки", a: a.submarines, b: b.submarines, unit: "ед.", better: "high" },
          { key: "nukes", label: "Ядерные боеголовки", a: a.nuclearWarheads, b: b.nuclearWarheads, unit: "ед.", better: "high" },
          { key: "ad", label: "Систем ПВО/ПРО", a: sa.airDefense, b: sb.airDefense, unit: "ед.", better: "high" },
          { key: "missiles", label: "Ракетных систем", a: sa.missileSystems, b: sb.missileSystems, unit: "ед.", better: "high" },
          { key: "ttX", label: "Образцов ВТТХ своего ВПК", a: sa.weaponsOwn, b: sb.weaponsOwn, unit: "шт.", better: "high", note: "продукция национального ВПК" },
        ],
      },
      {
        id: "economy",
        title: "Экономика и мобилизационный потенциал",
        factors: [
          { key: "gdp", label: "ВВП (ППС)", a: a.gdpPppBn, b: b.gdpPppBn, unit: "млрд $", better: "high" },
          { key: "budget", label: "Военный бюджет", a: a.militaryBudgetBn, b: b.militaryBudgetBn, unit: "млрд $", better: "high" },
          { key: "pct", label: "Оборона, % ВВП", a: a.defensePctGdp, b: b.defensePctGdp, unit: "%", better: "high" },
          { key: "pop", label: "Население", a: Math.round(a.populationM * 1e6), b: Math.round(b.populationM * 1e6), unit: "чел.", better: "high" },
          { key: "wbSpend", label: "Расходы World Bank, % ВВП", a: wbA?.milSpendPctGdp ?? null, b: wbB?.milSpendPctGdp ?? null, unit: "%", better: "high", note: "реальные показатели MS.MIL.*" },
          { key: "wbPers", label: "Численность ВС World Bank", a: wbA?.armedForcesPersonnel ?? null, b: wbB?.armedForcesPersonnel ?? null, unit: "чел.", better: "high" },
        ],
      },
      {
        id: "geo",
        title: "География, ТВД и удалённость",
        factors: [
          { key: "area", label: "Площадь", a: a.areaKm2, b: b.areaKm2, unit: "км²", better: "high" },
          { key: "coast", label: "Побережье", a: a.coastlineKm, b: b.coastlineKm, unit: "км", better: "high" },
          { key: "dist", label: "Удалённость стран друг от друга", a: between, b: between, unit: "км", better: "none", note: "по большому кругу, центроиды" },
          { key: "choke", label: "До ближайшего узкого места", a: sa.nearestChokeKm, b: sb.nearestChokeKm, unit: "км", better: "low", note: "проливы, перешейки, коридоры" },
          { key: "infra", label: "Объектов инфраструктуры", a: sa.infra, b: sb.infra, unit: "шт.", better: "high" },
          { key: "bp", label: "Гео-компонент БП", a: (a as unknown as { bpTerrain?: number }).bpTerrain ?? null, b: (b as unknown as { bpTerrain?: number }).bpTerrain ?? null, unit: "/100", better: "high" },
        ] as Factor[],
      },
      {
        id: "experience",
        title: "Опыт, конфликты и союзы",
        factors: [
          { key: "bp", label: "Боевой потенциал (БП)", a: a.bpTotal, b: b.bpTotal, unit: "", better: "high" },
          { key: "conf", label: "Конфликтов с участием", a: sa.conflicts, b: sb.conflicts, unit: "шт.", better: "high" },
          { key: "battles", label: "Сражений в базе", a: sa.battles, b: sb.battles, unit: "шт.", better: "high" },
          { key: "camp", label: "Кампаний / операций", a: sa.campaigns, b: sb.campaigns, unit: "шт.", better: "high" },
          { key: "treaties", label: "Договоров и союзов", a: sa.treaties, b: sb.treaties, unit: "шт.", better: "high" },
        ],
      },
    ];
  }, [a, b]);

  if (!b) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="active-compare-title"
        data-testid="active-compare-window"
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-tactical-line bg-tactical-panel"
      >
        {/* Шапка окна */}
        <div className="flex items-center gap-2 border-b border-[#294138] px-4 py-3">
          <h2 id="active-compare-title" className="text-xs font-bold tracking-[.25em] text-tactical-primary uppercase">Δ Активное сравнение</h2>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-slate-500">Сторона B:</span>
            <select
              value={bIso}
              onChange={e => setBIso(e.target.value)}
              aria-label="Выбор страны для сравнения"
              className="h-7 rounded border border-[#355146] bg-[#102621] px-1.5 text-[10px] text-slate-200"
            >
              {opponents.map(c => (
                <option key={c.isoCode} value={c.isoCode}>{c.nameRu}</option>
              ))}
            </select>
            <button type="button" onClick={onClose} aria-label="Закрыть активное сравнение" className="grid h-8 w-8 shrink-0 place-items-center rounded text-slate-400 hover:bg-white/5 hover:text-white">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Заголовки сторон */}
        <div className="grid grid-cols-[1fr_84px_84px_72px] items-center gap-2 border-b border-[#294138] px-4 py-2 text-[10px] text-slate-500">
          <span>Фактор</span>
          <span className="flex items-center gap-1 truncate"><Flag iso={a.isoCode} />{a.isoCode}</span>
          <span className="flex items-center gap-1 truncate"><Flag iso={b.isoCode} />{b.isoCode}</span>
          <span className="text-right">Δ A−B</span>
        </div>

        {/* Группы факторов */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {groups.map(g => (
            <div key={g.id} className="mb-1.5 rounded border border-[#223d38]">
              <button
                type="button"
                onClick={() => setOpen(s => ({ ...s, [g.id]: !s[g.id] }))}
                aria-expanded={open[g.id] ?? false}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left"
              >
                <ChevronDown size={11} className={`shrink-0 text-slate-500 transition-transform ${open[g.id] ? "rotate-180" : ""}`} />
                <span className="text-[11px] font-semibold text-slate-200">{g.title}</span>
                <span className="ml-auto font-mono text-[10px] text-slate-500">{g.factors.length} факторов</span>
              </button>
              {(open[g.id] ?? false) && (
                <div className="border-t border-[#223d38] px-2 py-1">
                  {g.factors.map(f => {
                    const lead = leader(f);
                    return (
                      <div key={g.id + f.key} className="flex items-center gap-2 border-b border-white/5 py-1 text-[10px] last:border-0">
                        <span className="min-w-0 flex-1 truncate text-slate-400" title={f.note}>{f.label}</span>
                        <span className="w-20 shrink-0 text-right font-mono tabular-nums text-slate-200">
                          {fmtNum(f.a)}
                        </span>
                        <span
                          className={`w-16 shrink-0 rounded px-1 py-0.5 text-center font-mono tabular-nums ${
                            lead === 1
                              ? "bg-[#82a882]/15 text-[#82a882]"
                              : lead === -1
                              ? "bg-[#d8a03c]/15 text-[#d8a03c]"
                              : "bg-white/5 text-slate-500"
                          }`}
                          title={f.note}
                        >
                          {fmtDelta(f.a, f.b)}
                        </span>
                        <span className="w-20 shrink-0 text-right font-mono tabular-nums text-slate-200">
                          {fmtNum(f.b)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Итог */}
        <div className="flex items-center justify-between border-t border-[#294138] px-4 py-2 text-[10px] text-slate-500">
          <span>
            Сторона A: {getBPTierLabel(a.bpTotal)} · Сторона B: {getBPTierLabel(b.bpTotal)}
          </span>
          <span className="font-mono tabular-nums">
            ΔБП {fmtDelta(a.bpTotal, b.bpTotal, 1)} · {a.nameRu} ↔ {b.nameRu}
          </span>
        </div>
      </div>
    </div>
  );
}
