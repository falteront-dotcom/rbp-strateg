"use client";

import { Flag } from "@/components/Flag";
/**
 * IndustryTab — оборонно-промышленный комплекс и поставки вооружений.
 *
 * Данные (открытые источники, оценки):
 *  - defense-industry.generated.ts — компании ОПК мира
 *  - transfers.generated.ts        — крупные сделки 2014–2025
 *  - treaties.generated.ts         — договоры и союзы
 *  - exercises.generated.ts        — учения и миротворческие миссии
 *
 * Как и HistoryTab, вкладка живёт в панели страны: режим «Страна» показывает
 * участие выбранного государства, режим «Мир» — глобальную картину.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Factory,
  ArrowLeftRight,
  ScrollText,
  Dumbbell,
  HeartHandshake,
  Boxes,
} from "lucide-react";
import {
  DEFENSE_COMPANIES,
  type DefenseCompany,
} from "@/lib/data/defense-industry.generated";
import {
  ARMS_TRANSFERS,
  type ArmsTransfer,
  type TransferStatus,
} from "@/lib/data/transfers.generated";
import { TREATIES, type Treaty, type TreatyType } from "@/lib/data/treaties.generated";
import {
  MILITARY_EXERCISES,
  PEACEKEEPING_MISSIONS,
} from "@/lib/data/exercises.generated";
import { WEAPON_SPECS } from "@/lib/data/weapons.generated";

const TREATY_LABELS_RU: Record<TreatyType, string> = {
  defense: "Оборонный союз",
  nonprolif: "Нераспространение",
  arms_control: "Контроль вооружений",
  security: "Безопасность",
  neutrality: "Нейтралитет",
};

const TREATY_COLORS: Record<TreatyType, string> = {
  defense: "#6f9dbb",
  nonprolif: "#9aa85c",
  arms_control: "#9d8ba8",
  security: "#7fa895",
  neutrality: "#8fa1ac",
};

const STATUS_LABELS_RU: Record<TransferStatus, string> = {
  delivered: "поставлено",
  contracted: "контракт",
  cancelled: "отменено",
};

const STATUS_STYLES: Record<TransferStatus, string> = {
  delivered: "bg-emerald-500/15 text-emerald-400",
  contracted: "bg-tactical-primary/15 text-tactical-accent",
  cancelled: "bg-slate-600/30 text-slate-500",
};

function ScopeToggle({ all, onChange }: { all: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`inline-flex min-h-8 items-center rounded px-2 py-1 text-[10px] font-semibold transition-colors ${
          !all ? "bg-tactical-primary/20 text-tactical-primary" : "bg-slate-800/60 text-slate-400 hover:text-slate-300"
        }`}
      >
        Страна
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`inline-flex min-h-8 items-center rounded px-2 py-1 text-[10px] font-semibold transition-colors ${
          all ? "bg-tactical-primary/20 text-tactical-primary" : "bg-slate-800/60 text-slate-400 hover:text-slate-300"
        }`}
      >
        Мир
      </button>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  count,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="flex h-4 items-center text-tactical-primary">{icon}</span>
      <h3 className="text-xs font-bold tracking-widest text-tactical-primary uppercase">
        {title}
      </h3>
      {typeof count === "number" && (
        <span className="rounded bg-slate-800 px-1 font-mono text-[10px] text-slate-400">
          {count}
        </span>
      )}
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}

function CompanyRow({ c }: { c: DefenseCompany }) {
  return (
    <div className="rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-semibold text-slate-200" title={`${c.nameRu} · ${c.name}`}>
          {c.nameRu}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-tactical-primary">
          {c.revenueUsdBn === null ? "—" : `$${c.revenueUsdBn.toFixed(1)} млрд`}
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
        <span><Flag iso={c.iso} /> {c.iso}</span>
        <span className="truncate" title={c.hq}>{c.hq}</span>
        {c.founded !== null && <span className="shrink-0">осн. {c.founded}</span>}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {c.productsRu.map(p => (
          <span key={p} className="rounded bg-slate-800/80 px-1 py-px text-[10px] text-slate-400" title={p}>
            {p}
          </span>
        ))}
      </div>
      {c.noteRu && (
        <p className="mt-1 text-[10px] leading-snug text-slate-500">{c.noteRu}</p>
      )}
    </div>
  );
}

function TransferRow({ t }: { t: ArmsTransfer }) {
  return (
    <div className="flex items-center gap-2 rounded px-1.5 py-1 text-[10px] hover:bg-white/5">
      <span className="w-8 shrink-0 font-mono text-slate-500">{t.year}</span>
      <span className="flex w-14 shrink-0 items-center gap-1" title={`${t.fromIso} → ${t.toIso}`}>
        <span><Flag iso={t.fromIso} /></span>
        <ArrowLeftRight size={9} className="text-slate-600" />
        <span><Flag iso={t.toIso} /></span>
      </span>
      <span className="min-w-0 flex-1 truncate text-slate-300" title={t.itemRu}>{t.itemRu}</span>
      {t.qty !== null && (
        <span className="shrink-0 font-mono text-slate-400">×{t.qty.toLocaleString("ru-RU")}</span>
      )}
      <span className={`shrink-0 rounded px-1 text-[10px] ${STATUS_STYLES[t.status]}`}>
        {STATUS_LABELS_RU[t.status]}
      </span>
    </div>
  );
}

function TreatyRow({ t }: { t: Treaty }) {
  const color = TREATY_COLORS[t.type];
  return (
    <div className="rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-semibold text-slate-200" title={t.nameRu}>
          {t.nameRu}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-slate-500">{t.signedYear}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-2 text-[10px]">
        <span style={{ color }}>{TREATY_LABELS_RU[t.type]}</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">{t.membersIso.length} участников</span>
        <span className={`ml-auto shrink-0 rounded px-1 ${t.inForce ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-600/30 text-slate-500"}`}>
          {t.inForce ? "в силе" : "не действует"}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-0.5">
        {t.membersIso.slice(0, 10).map(iso => (
          <span key={iso} title={iso} className="text-[10px]"><Flag iso={iso} /></span>
        ))}
        {t.membersIso.length > 10 && (
          <span className="text-[10px] text-slate-500">+{t.membersIso.length - 10}</span>
        )}
      </div>
      {t.noteRu && (
        <p className="mt-1 text-[10px] leading-snug text-slate-500">{t.noteRu}</p>
      )}
    </div>
  );
}

export function IndustryTab({ isoCode }: { isoCode: string }) {
  const [scopeAll, setScopeAll] = useState(false);
  const [wCat, setWCat] = useState<"all" | "ground" | "air" | "naval" | "missile">("all");
  const [wSort, setWSort] = useState<"year" | "weight" | "name">("year");

  const weaponRows = useMemo(() => {
    const rows = wCat === "all" ? [...WEAPON_SPECS] : WEAPON_SPECS.filter(w => w.category === wCat);
    if (wSort === "year") rows.sort((a, b) => (b.yearInService ?? 0) - (a.yearInService ?? 0));
    else if (wSort === "weight") rows.sort((a, b) => (b.weightTons ?? 0) - (a.weightTons ?? 0));
    else rows.sort((a, b) => a.nameRu.localeCompare(b.nameRu, "ru"));
    return rows;
  }, [wCat, wSort]);

  const companies = useMemo(() => {
    if (!scopeAll) {
      return DEFENSE_COMPANIES.filter(c => c.iso === isoCode)
        .sort((a, b) => (b.revenueUsdBn ?? -1) - (a.revenueUsdBn ?? -1));
    }
    return [...DEFENSE_COMPANIES]
      .sort((a, b) => (b.revenueUsdBn ?? -1) - (a.revenueUsdBn ?? -1));
  }, [isoCode, scopeAll]);

  const countryRevenue = useMemo(
    () => companies.reduce((s, c) => s + (c.revenueUsdBn ?? 0), 0),
    [companies],
  );

  const transfers = useMemo(() => {
    const base = scopeAll
      ? ARMS_TRANSFERS
      : ARMS_TRANSFERS.filter(t => t.fromIso === isoCode || t.toIso === isoCode);
    return [...base].sort((a, b) => b.year - a.year);
  }, [isoCode, scopeAll]);

  const topExporters = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of ARMS_TRANSFERS) {
      map.set(t.fromIso, (map.get(t.fromIso) ?? 0) + 1);
    }
    const rows = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = rows[0]?.[1] ?? 1;
    return { rows, max };
  }, []);

  const treaties = useMemo(() => {
    if (!scopeAll) return TREATIES.filter(t => t.membersIso.includes(isoCode));
    return TREATIES;
  }, [isoCode, scopeAll]);

  const exercises = useMemo(() => {
    if (!scopeAll) {
      return MILITARY_EXERCISES.filter(
        e => e.hostIso === isoCode || e.participantsIso.includes(isoCode),
      ).sort((a, b) => b.year - a.year);
    }
    return [...MILITARY_EXERCISES].sort((a, b) => b.year - a.year);
  }, [isoCode, scopeAll]);

  const peacekeeping = useMemo(
    () => [...PEACEKEEPING_MISSIONS].sort((a, b) => (b.personnel ?? 0) - (a.personnel ?? 0)),
    [],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <ScopeToggle all={scopeAll} onChange={setScopeAll} />
        <span className="font-mono text-[10px] text-slate-500">
          {scopeAll ? "глобальный срез" : <><Flag iso={isoCode} /> {isoCode}</>}
        </span>
      </div>

      {/* ─── Компании ОПК ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
        <SectionHeader
          icon={<Factory size={13} />}
          title="ОПК · компании"
          count={companies.length}
        />
        {!scopeAll && companies.length > 0 && (
          <div className="mb-2 rounded bg-slate-900/40 px-2 py-1 text-[10px] text-slate-400">
            Оборонная выручка страны (сумма по базе):{" "}
            <span className="font-mono text-tactical-primary">
              ${countryRevenue.toFixed(1)} млрд
            </span>
          </div>
        )}
        {companies.length === 0 ? (
          <p className="text-[10px] text-slate-500">
            В базе нет компаний ОПК этой страны — переключите режим на «Мир».
          </p>
        ) : (
          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {companies.map(c => (
              <CompanyRow key={c.id} c={c} />
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Поставки вооружений ──────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
        <SectionHeader
          icon={<ArrowLeftRight size={13} />}
          title="Поставки вооружений · 2014–2025"
          count={transfers.length}
        />
        {scopeAll && (
          <div className="mb-2 space-y-1">
            {topExporters.rows.map(([iso, n]) => (
              <div key={iso} className="flex items-center gap-2 text-[10px]">
                <span className="w-10 shrink-0 text-slate-400"><Flag iso={iso} /> {iso}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-tactical-primary"
                    style={{ width: `${(n / topExporters.max) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-mono text-slate-400">{n}</span>
              </div>
            ))}
            <div className="pt-0.5 text-[10px] text-slate-600">Крупнейшие экспортёры по числу сделок в базе</div>
          </div>
        )}
        {transfers.length === 0 ? (
          <p className="text-[10px] text-slate-500">
            В базе нет крупных сделок с участием этой страны.
          </p>
        ) : (
          <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
            {transfers.map((t, i) => (
              <TransferRow key={`${t.fromIso}-${t.toIso}-${t.itemRu}-${i}`} t={t} />
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Договоры и союзы ─────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
        <SectionHeader
          icon={<ScrollText size={13} />}
          title="Договоры и союзы"
          count={treaties.length}
        />
        {treaties.length === 0 ? (
          <p className="text-[10px] text-slate-500">
            В базе нет договоров с участием этой страны.
          </p>
        ) : (
          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {treaties.map(t => (
              <TreatyRow key={t.id} t={t} />
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Учения ───────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
        <SectionHeader
          icon={<Dumbbell size={13} />}
          title="Военные учения"
          count={exercises.length}
        />
        {exercises.length === 0 ? (
          <p className="text-[10px] text-slate-500">
            В базе нет учений с участием этой страны.
          </p>
        ) : (
          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {exercises.map((e, i) => (
              <div
                key={`${e.nameEn}-${i}`}
                className="flex items-baseline gap-2 rounded px-1 py-0.5 text-[10px] hover:bg-white/5"
              >
                <span className="w-8 shrink-0 font-mono text-slate-500">{e.year}</span>
                <span className="min-w-0 flex-1 truncate text-slate-300" title={e.nameRu}>{e.nameRu}</span>
                <span className="shrink-0 text-slate-500" title={e.scaleRu}>{e.scaleRu}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Миротворчество ───────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
        <SectionHeader
          icon={<HeartHandshake size={13} />}
          title="Миротворческие миссии"
          count={peacekeeping.length}
        />
        <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
          {peacekeeping.map((m, i) => (
            <div
              key={`${m.nameRu}-${i}`}
              className="flex items-baseline gap-2 rounded px-1 py-0.5 text-[10px] hover:bg-white/5"
            >
              <span className="w-16 shrink-0 truncate text-slate-500" title={m.org}>{m.org}</span>
              <span className="min-w-0 flex-1 truncate text-slate-300" title={`${m.nameRu} · ${m.region}`}>{m.nameRu}</span>
              <span className="shrink-0 text-slate-500">{m.region}</span>
              <span className="w-10 shrink-0 text-right font-mono text-slate-400">
                {m.personnel === null ? "—" : m.personnel >= 1000 ? `${(m.personnel / 1000).toFixed(0)}к` : m.personnel}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── Образцы ВВТ: мировая база ─── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
        <SectionHeader icon={<Boxes size={13} />} title="База образцов ВВТ" count={weaponRows.length} />
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {(["all", "ground", "air", "naval", "missile"] as const).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setWCat(c)}
              className={`inline-flex min-h-8 items-center rounded px-1.5 py-1 text-[10px] transition-colors ${
                wCat === c ? "bg-tactical-primary/20 text-tactical-primary" : "bg-slate-800/60 text-slate-500 hover:text-slate-300"
              }`}
            >
              {c === "all" ? "Все" : c === "ground" ? "Сухопутные" : c === "air" ? "Авиация" : c === "naval" ? "Флот" : "Ракеты"}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-slate-700" aria-hidden />
          {(["year", "weight", "name"] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setWSort(s)}
              className={`inline-flex min-h-8 items-center rounded px-1.5 py-1 text-[10px] transition-colors ${
                wSort === s ? "bg-slate-700 text-slate-200" : "bg-slate-800/60 text-slate-500 hover:text-slate-300"
              }`}
            >
              {s === "year" ? "по году" : s === "weight" ? "по массе" : "по имени"}
            </button>
          ))}
        </div>
        <div className="max-h-72 overflow-y-auto pr-1">
          <table className="w-full text-[10px]">
            <thead className="sticky top-0 z-10 bg-[#0d2019] border-b border-white/15">
              <tr className="text-slate-500">
                <th className="w-8 px-1 py-1 text-left font-normal">#</th>
                <th className="px-1 py-1 text-left font-normal">Образец</th>
                <th className="w-14 px-1 py-1 text-right font-normal">Масса, т</th>
                <th className="w-14 px-1 py-1 text-right font-normal">Дальность</th>
                <th className="w-12 px-1 py-1 text-right font-normal">Год</th>
              </tr>
            </thead>
            <tbody>
              {weaponRows.slice(0, 120).map((w, i) => (
                <tr key={w.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-1 py-1 font-mono text-slate-600 tabular-nums">{String(i + 1).padStart(2, "0")}</td>
                  <td className="max-w-0 truncate px-1 py-1 text-slate-300" title={`${w.nameRu} · ${w.name}`}>
                    {w.nameRu}
                    <span className="ml-1 text-slate-600"><Flag iso={w.originIso} />{w.originIso}</span>
                  </td>
                  <td className="px-1 py-1 text-right font-mono text-slate-400 tabular-nums">{w.weightTons ?? "—"}</td>
                  <td className="px-1 py-1 text-right font-mono text-slate-400 tabular-nums">{w.rangeKm !== null ? `${w.rangeKm} км` : "—"}</td>
                  <td className="px-1 py-1 text-right font-mono text-slate-400 tabular-nums">{w.yearInService ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-[10px] text-slate-600">
          Единицы: масса — т, дальность — км. Оценки открытых источников (IISS/Jane’s); показаны первые 120 из {weaponRows.length}.
        </div>
      </motion.div>

      <p className="text-[10px] leading-relaxed text-slate-600">
        Источники — открытые публикации (SIPRI, годовые отчёты компаний); выручка —
        оборонные сегменты за последний известный год. Списки сделок и учений —
        подборка крупнейших, не исчерпывающая.
      </p>
    </div>
  );
}
