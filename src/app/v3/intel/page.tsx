"use client";

// Доска предупреждения I&W: каталог индикаторов из src/lib/intel
// (iw-catalog), состояния выставляет аналитик, оценку считает
// POST /api/v3/iw/assess (скоринг iw-scoring: паттерн по категориям,
// ядерная категория — эскалационный множитель).
// Контракт состояний: Record<indicatorId, "inactive" | "active" | "confirmed">;
// по умолчанию все индикаторы неактивны.

import { useEffect, useMemo, useState } from "react";
import type { IWCategory, IWIndicator } from "@/lib/intel/iw-catalog";
import type {
  IWScoringResult,
  WarningLevel,
} from "@/lib/intel/iw-scoring";

type IndicatorState = "inactive" | "active" | "confirmed";

const STATE_OPTIONS: { value: IndicatorState; label: string }[] = [
  { value: "inactive", label: "Не наблюдается" },
  { value: "active", label: "Наблюдается" },
  { value: "confirmed", label: "Подтверждено" },
];

// Русские названия категорий — копия IW_CATEGORY_PROFILES каталога
// (fallback, если API не вернёт профили категорий).
const CATEGORY_RU: Record<IWCategory, string> = {
  mobilization: "Мобилизация и личный состав",
  logistics: "Логистика и развёртывание",
  medical: "Медицина и запасы крови",
  "ew-cyber": "РЭБ, связь и кибероперации",
  nuclear: "Ядерные и стратегические сигналы",
  "defense-industry": "ВПК и производство боеприпасов",
  finance: "Финансы и экономика войны",
  diplomacy: "Дипломатия и международные сигналы",
  information: "Информационная подготовка",
  space: "Космос и космическая ISR",
};

const LEVEL_RU: Record<WarningLevel, string> = {
  ROUTINE: "Фоновый уровень",
  ELEVATED: "Повышенное внимание",
  HIGH: "Высокий уровень предупреждения",
  CRITICAL: "Критический уровень предупреждения",
};

const LEVEL_STYLE: Record<WarningLevel, string> = {
  ROUTINE: "border-slate-600 bg-tactical-panel text-slate-200",
  ELEVATED: "border-yellow-600 bg-yellow-950/40 text-yellow-200",
  HIGH: "border-orange-600 bg-orange-950/40 text-orange-200",
  CRITICAL: "border-red-600 bg-red-950/50 text-red-200",
};

interface CategoryProfileLite {
  id: IWCategory;
  nameRu: string;
  descriptionRu?: string;
}

export default function IntelPage() {
  const [indicators, setIndicators] = useState<IWIndicator[]>([]);
  const [categories, setCategories] = useState<CategoryProfileLite[]>([]);
  const [states, setStates] = useState<Record<string, IndicatorState>>({});
  const [result, setResult] = useState<IWScoringResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v3/iw")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: unknown) => {
        const obj = (data ?? {}) as {
          indicators?: IWIndicator[];
          catalog?: IWIndicator[];
          categories?: CategoryProfileLite[];
        };
        const list: IWIndicator[] = Array.isArray(data)
          ? (data as IWIndicator[])
          : (obj.indicators ?? obj.catalog ?? []);
        setIndicators(list);
        setCategories(obj.categories ?? []);
        setError(null);
      })
      .catch((e: Error) => setError(`Не удалось загрузить каталог I&W: ${e.message}`))
      .finally(() => setLoading(false));
  }, []);

  const byCategory = useMemo(() => {
    const map = new Map<IWCategory, IWIndicator[]>();
    for (const ind of indicators) {
      const arr = map.get(ind.category) ?? [];
      arr.push(ind);
      map.set(ind.category, arr);
    }
    return map;
  }, [indicators]);

  const categoryOrder = useMemo<IWCategory[]>(() => {
    const ordered: IWCategory[] = [];
    for (const profile of categories) {
      if (byCategory.has(profile.id) && !ordered.includes(profile.id)) {
        ordered.push(profile.id);
      }
    }
    for (const cat of byCategory.keys()) {
      if (!ordered.includes(cat)) ordered.push(cat);
    }
    return ordered;
  }, [categories, byCategory]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const ind of indicators) map.set(ind.id, ind.nameRu);
    return map;
  }, [indicators]);

  const activeCount = useMemo(
    () => Object.values(states).filter((s) => s !== "inactive").length,
    [states],
  );

  function setState(id: string, value: IndicatorState) {
    setStates((prev) => ({ ...prev, [id]: value }));
  }

  function resetStates() {
    setStates({});
    setResult(null);
  }

  async function assess() {
    setAssessing(true);
    setError(null);
    try {
      // В запрос уходят только ненулевые состояния: отсутствие записи
      // эквивалентно "inactive".
      const payload: Record<string, IndicatorState> = {};
      for (const [id, value] of Object.entries(states)) {
        if (value !== "inactive") payload[id] = value;
      }
      const res = await fetch("/api/v3/iw/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ states: payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      const scoring: IWScoringResult =
        data !== null && typeof data === "object" && "totalScore" in data
          ? (data as IWScoringResult)
          : ((data as { result: IWScoringResult }).result ??
            (data as { assessment: IWScoringResult }).assessment);
      setResult(scoring);
    } catch (e) {
      setError(`Не удалось рассчитать оценку: ${(e as Error).message}`);
    } finally {
      setAssessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-50">
          Доска предупреждения I&amp;W
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Каталог индикаторов подготовки к войне: отметьте наблюдаемые
          признаки — скоринг оценивает паттерн по категориям, а не сумму
          одиночных сигналов. Одиночный индикатор предупреждением не является:
          у каждого есть мирное объяснение, которое проверяется первым.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={assess}
          disabled={assessing || loading}
          className="rounded bg-tactical-primary px-4 py-2 text-sm font-semibold text-tactical-bg transition-colors hover:bg-tactical-primary/85 disabled:cursor-not-allowed disabled:bg-tactical-raised disabled:text-slate-400"
        >
          {assessing ? "Считаем…" : "Рассчитать оценку"}
        </button>
        <button
          type="button"
          onClick={resetStates}
          className="rounded border border-tactical-line px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
        >
          Сбросить всё
        </button>
        <span className="text-sm text-slate-400">
          Активных индикаторов: {activeCount} из {indicators.length}
        </span>
      </div>

      {error !== null && (
        <div className="rounded border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {result !== null && (
        <section
          className={`rounded-lg border p-4 ${LEVEL_STYLE[result.level]}`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">
              {LEVEL_RU[result.level]}
            </h2>
            <span className="font-mono text-2xl">
              {result.totalScore.toFixed(1)}
              <span className="ml-1 text-sm opacity-70">/ 100</span>
            </span>
          </div>
          <p className="mt-2 text-sm">{result.assessmentRu}</p>

          <h3 className="mt-4 text-sm font-semibold">Вклад категорий</h3>
          <div className="mt-2 space-y-1.5">
            {[...result.categoryScores]
              .sort((a, b) => b.score - a.score)
              .map((cs) => (
                <div
                  key={cs.category}
                  className="grid grid-cols-[220px_1fr_90px] items-center gap-2 text-xs"
                >
                  <span>{CATEGORY_RU[cs.category] ?? cs.category}</span>
                  <span className="h-2 rounded bg-tactical-raised">
                    <span
                      className="block h-2 rounded bg-current opacity-70"
                      style={{ width: `${Math.min(100, cs.score)}%` }}
                    />
                  </span>
                  <span className="text-right font-mono">
                    {cs.score.toFixed(0)} · набл. {cs.observedCount}
                  </span>
                </div>
              ))}
          </div>

          {result.topContributors.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-semibold">
                Сильнейшие факторы
              </h3>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm">
                {result.topContributors.map((tc) => (
                  <li key={tc.indicatorId}>
                    {nameById.get(tc.indicatorId) ?? tc.indicatorId}
                    <span className="ml-2 font-mono text-xs opacity-80">
                      вклад {tc.contribution.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {result.blindCategories.length > 0 && (
            <p className="mt-3 text-xs opacity-80">
              Слепые зоны (нет наблюдений):{" "}
              {result.blindCategories
                .map((c) => CATEGORY_RU[c] ?? c)
                .join(", ")}
              . Отсутствие данных — не отсутствие подготовки.
            </p>
          )}
          {result.caveatsRu.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs opacity-90">
              {result.caveatsRu.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {loading && <p className="text-sm text-slate-400">Загрузка каталога…</p>}

      {!loading &&
        categoryOrder.map((cat) => {
          const items = byCategory.get(cat) ?? [];
          const profile = categories.find((c) => c.id === cat);
          const activeInCat = items.filter(
            (ind) => (states[ind.id] ?? "inactive") !== "inactive",
          ).length;
          return (
            <section
              key={cat}
              className="rounded-lg border border-tactical-line bg-tactical-panel/60"
            >
              <header className="border-b border-tactical-line px-4 py-3">
                <h2 className="font-semibold text-slate-100">
                  {profile?.nameRu ?? CATEGORY_RU[cat]}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {items.length} индикаторов
                    {activeInCat > 0 && ` · активных: ${activeInCat}`}
                  </span>
                </h2>
                {profile?.descriptionRu !== undefined && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {profile.descriptionRu}
                  </p>
                )}
              </header>
              <ul className="divide-y divide-slate-800">
                {items.map((ind) => {
                  const value = states[ind.id] ?? "inactive";
                  return (
                    <li
                      key={ind.id}
                      className={`flex flex-wrap items-center gap-3 px-4 py-2.5 ${
                        value !== "inactive" ? "bg-tactical-primary/10" : ""
                      }`}
                    >
                      <div className="min-w-56 flex-1">
                        <span className="text-sm text-slate-100">
                          {ind.nameRu}
                        </span>
                        <span className="ml-2 font-mono text-[11px] text-slate-500">
                          {ind.code} · вес {ind.weight}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {ind.descriptionRu}
                        </span>
                      </div>
                      <select
                        value={value}
                        onChange={(e) =>
                          setState(ind.id, e.target.value as IndicatorState)
                        }
                        className="rounded border border-tactical-line bg-tactical-panel px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-tactical-accent"
                        aria-label={`Состояние индикатора ${ind.nameRu}`}
                      >
                        {STATE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
    </div>
  );
}
