"use client";

/**
 * HistoryTab — справочник вооружённых конфликтов 1945–2025.
 *
 * Данные: src/lib/data/conflict-history.generated.ts (открытые источники,
 * оценки потерь округлены). Вкладка живёт в панели страны: по умолчанию
 * показывает конфликты с участием выбранного государства, переключатель
 * «Все конфликты» разворачивает мировую картину.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { History, ChevronDown, Users2, Swords } from "lucide-react";
import {
  HISTORICAL_CONFLICTS,
  type ConflictType,
  type HistoricalConflict,
} from "@/lib/data/conflict-history.generated";
import { HISTORICAL_BATTLES } from "@/lib/data/battles.generated";
import { MILITARY_CAMPAIGNS } from "@/lib/data/campaigns.generated";

const TYPE_LABELS_RU: Record<ConflictType, string> = {
  world: "Мировая",
  interstate: "Межгосуд.",
  civil: "Гражд.",
  colonial: "Колониал.",
  border: "Погран.",
  insurgency: "Повстанч.",
  proxy: "Прокси",
};

const TYPE_COLORS: Record<ConflictType, string> = {
  world: "#ff5a3c",
  interstate: "#ff7a52",
  civil: "#ff8a3c",
  colonial: "#e0a13c",
  border: "#ffc84a",
  insurgency: "#c9a24b",
  proxy: "#9db4c0",
};

function fmt(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)} млн`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} тыс.`;
  return String(n);
}

function yearSpan(c: HistoricalConflict): string {
  return c.startYear === c.endYear ? `${c.startYear}` : `${c.startYear}–${c.endYear}`;
}

function ConflictCard({ c }: { c: HistoricalConflict }) {
  const [open, setOpen] = useState(false);
  const color = TYPE_COLORS[c.type];
  return (
    <div className="rounded border border-slate-700/60 bg-slate-900/40">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-start gap-2 px-2 py-1.5 text-left"
        aria-expanded={open}
      >
        <span
          className="mt-0.5 w-1 shrink-0 self-stretch rounded"
          style={{ background: color }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] text-slate-500">{yearSpan(c)}</span>
            <span className="truncate text-xs font-semibold text-slate-200" title={c.nameRu}>
              {c.nameRu}
            </span>
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
            <span style={{ color }}>{TYPE_LABELS_RU[c.type]}</span>
            <span className="truncate">{c.region}</span>
          </span>
        </span>
        <ChevronDown
          size={12}
          className={`mt-1 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-1.5 border-t border-slate-700/60 px-2.5 py-2">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Users2 size={11} className="shrink-0" />
            <span>Потери (оценка): <span className="font-mono text-slate-300">{fmt(c.fatalities)}</span></span>
          </div>
          <div className="space-y-1">
            {c.belligerents.map((b, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px]">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${i === 0 ? "bg-cyan-400" : "bg-orange-400"}`} />
                <span className="text-slate-400">{b}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] leading-relaxed text-slate-400">{c.summaryRu}</p>
          <p className="text-[10px] leading-relaxed text-slate-500">
            <span className="text-slate-400">Итог: </span>{c.outcomeRu}
          </p>
        </div>
      )}
    </div>
  );
}

export function HistoryTab({ isoCode }: { isoCode: string }) {
  const [scopeAll, setScopeAll] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ConflictType | "all">("all");

  const { involving, total } = useMemo(() => {
    const involving = HISTORICAL_CONFLICTS.filter(c => c.isoCodes.includes(isoCode));
    return { involving, total: HISTORICAL_CONFLICTS.length };
  }, [isoCode]);

  const list = useMemo(() => {
    const base = scopeAll ? HISTORICAL_CONFLICTS : involving;
    const filtered = typeFilter === "all" ? base : base.filter(c => c.type === typeFilter);
    return [...filtered].sort((a, b) => b.startYear - a.startYear);
  }, [scopeAll, typeFilter, involving]);

  const byDecade = useMemo(() => {
    const map = new Map<number, HistoricalConflict[]>();
    for (const c of list) {
      const dec = Math.floor(c.startYear / 10) * 10;
      const arr = map.get(dec) ?? [];
      arr.push(c);
      map.set(dec, arr);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [list]);

  const totalFatalities = useMemo(
    () => involving.reduce((s, c) => s + (c.fatalities ?? 0), 0),
    [involving],
  );

  const availableTypes = useMemo(() => {
    const base = scopeAll ? HISTORICAL_CONFLICTS : involving;
    return Object.keys(TYPE_LABELS_RU).filter(t => base.some(c => c.type === t)) as ConflictType[];
  }, [scopeAll, involving]);

  return (
    <div className="flex flex-col gap-3">
      {/* ─── Military campaigns (open sources) ─── */}
      {(() => {
        const campaigns = MILITARY_CAMPAIGNS.filter(c => c.isoCodes.includes(isoCode)).sort((a, b) => b.startYear - a.startYear);
        if (campaigns.length === 0) return null;
        return (
          <div className="glass-panel rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Users2 size={13} className="text-tactical-primary" />
              <h3 className="text-xs font-bold tracking-widest text-tactical-primary uppercase">
                Военные кампании · {campaigns.length}
              </h3>
            </div>
            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {campaigns.slice(0, 18).map((c, i) => (
                <div key={`${c.nameRu}-${i}`} className="rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-semibold text-slate-200" title={c.nameRu}>{c.nameRu}</span>
                    <span className="shrink-0 font-mono text-[10px] text-slate-500">
                      {c.startYear === c.endYear ? c.startYear : `${c.startYear}–${c.endYear}`}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">{c.theatreRu} · {c.regionRu}</div>
                  <p className="mt-1 text-[10px] leading-snug text-slate-400">{c.objectiveRu}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                    <span className="text-slate-400">Итог: </span>{c.outcomeRu}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ─── Key battles (open sources) ─── */}
      {(() => {
        const battles = HISTORICAL_BATTLES.filter(b => b.isoCodes.includes(isoCode)).sort((a, b) => b.year - a.year);
        if (battles.length === 0) return null;
        return (
          <div className="glass-panel rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Swords size={13} className="text-tactical-primary" />
              <h3 className="text-xs font-bold tracking-widest text-tactical-primary uppercase">
                Ключевые сражения · {battles.length}
              </h3>
            </div>
            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {battles.slice(0, 20).map((b, i) => (
                <div key={`${b.nameRu}-${i}`} className="rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-semibold text-slate-200" title={b.nameRu}>{b.nameRu}</span>
                    <span className="shrink-0 font-mono text-[10px] text-slate-500">{b.year}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">{b.locationRu} · {b.dateRu}</div>
                  <p className="mt-1 text-[10px] leading-snug text-slate-400">{b.combatantsRu}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                    <span className="text-slate-400">Итог: </span>{b.outcomeRu}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      {/* Заголовок-статистика */}
      <div className="glass-panel rounded-lg p-3">
        <div className="flex items-center gap-2">
          <History size={13} className="text-tactical-primary" />
          <h3 className="text-xs font-bold tracking-widest text-tactical-primary uppercase">
            История конфликтов · 1945–2025
          </h3>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded bg-slate-900/40 px-1 py-1.5">
            <div className="font-mono text-sm font-bold text-slate-200">{involving.length}</div>
            <div className="text-[10px] text-slate-500">с участием страны</div>
          </div>
          <div className="rounded bg-slate-900/40 px-1 py-1.5">
            <div className="font-mono text-sm font-bold text-slate-200">{fmt(totalFatalities)}</div>
            <div className="text-[10px] text-slate-500">сумм. потери (оценка)</div>
          </div>
          <div className="rounded bg-slate-900/40 px-1 py-1.5">
            <div className="font-mono text-sm font-bold text-slate-200">{total}</div>
            <div className="text-[10px] text-slate-500">всего в базе</div>
          </div>
        </div>
      </div>

      {/* Переключатель охвата + фильтр типов */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setScopeAll(false)}
          className={`rounded px-2 py-1 text-[10px] font-semibold transition-colors ${
            !scopeAll ? "bg-tactical-primary/20 text-tactical-primary" : "bg-slate-800/60 text-slate-400 hover:text-slate-300"
          }`}
        >
          Страна
        </button>
        <button
          type="button"
          onClick={() => setScopeAll(true)}
          className={`rounded px-2 py-1 text-[10px] font-semibold transition-colors ${
            scopeAll ? "bg-tactical-primary/20 text-tactical-primary" : "bg-slate-800/60 text-slate-400 hover:text-slate-300"
          }`}
        >
          Все конфликты
        </button>
        <span className="mx-0.5 h-4 w-px bg-slate-700" aria-hidden />
        <button
          type="button"
          onClick={() => setTypeFilter("all")}
          className={`rounded px-1.5 py-1 text-[10px] ${
            typeFilter === "all" ? "bg-slate-700 text-slate-200" : "bg-slate-800/60 text-slate-500 hover:text-slate-300"
          }`}
        >
          Все типы
        </button>
        {availableTypes.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(prev => (prev === t ? "all" : t))}
            className={`rounded px-1.5 py-1 text-[10px] transition-colors ${
              typeFilter === t ? "text-slate-900" : "bg-slate-800/60 text-slate-400 hover:text-slate-300"
            }`}
            style={typeFilter === t ? { background: TYPE_COLORS[t] } : undefined}
          >
            {TYPE_LABELS_RU[t]}
          </button>
        ))}
      </div>

      {/* Таймлайн по десятилетиям */}
      {byDecade.length === 0 ? (
        <div className="glass-panel rounded-lg p-4 text-center text-[10px] text-slate-500">
          {scopeAll
            ? "Нет конфликтов этого типа в базе."
            : "В базе нет конфликтов с участием этой страны — переключите на «Все конфликты»."}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-3"
        >
          {byDecade.map(([decade, rows]) => (
            <div key={decade}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-slate-500">{decade}-е</span>
                <span className="h-px flex-1 bg-slate-700/60" aria-hidden />
                <span className="text-[10px] text-slate-600">{rows.length}</span>
              </div>
              <div className="space-y-1.5">
                {rows.map(c => (
                  <ConflictCard key={c.id} c={c} />
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <p className="text-[10px] leading-relaxed text-slate-600">
        Справочник по открытым источникам; оценки людских потерь округлены и различаются
        между исследователями. Современные коды государств применяются к историческим
        участникам (СССР → RUS, Югославия → SRB и т.п.).
      </p>
    </div>
  );
}
