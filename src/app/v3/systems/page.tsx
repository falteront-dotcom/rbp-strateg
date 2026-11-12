"use client";

// Системы вооружений 3.0: поиск по базе data4 (220 систем), фильтр по
// классу и «дуэль» двух систем через API /api/v3/systems.
// Типы — из src/lib/data4 (только type-импорты: файл данных в клиентский
// бандл не тянем, русские названия классов и осей продублированы локально
// из WEAPON_CLASS_RU / ASSESSMENT_AXIS_RU тех же модулей).

import { useEffect, useMemo, useState } from "react";
import type {
  SystemAssessment,
  WeaponClassId,
  WeaponSystemProfile,
} from "@/lib/data4/equipment-systems";
import type { DuelResult } from "@/lib/data4/systems-analysis";

const CLASS_RU: Record<WeaponClassId, string> = {
  mbt: "Основные боевые танки",
  ifv: "БМП, БТР и боевые бронированные машины",
  artillery: "Артиллерия и РСЗО",
  fighter: "Истребительная и ударная авиация",
  heli: "Ударные и вооружённые вертолёты",
  uav: "Беспилотные летательные аппараты",
  submarine: "Подводные лодки",
  ship: "Надводные боевые корабли",
  airdef: "ЗРК и системы ПРО",
  missile: "Оперативно-тактические и крылатые ракеты",
};

type AssessmentAxis = keyof SystemAssessment;

const AXIS_RU: Record<AssessmentAxis, string> = {
  firepower: "Огневая мощь",
  protection: "Защищённость",
  mobility: "Подвижность",
  awareness: "Осведомлённость (сенсоры и СУО)",
  reliability: "Надёжность и зрелость",
  exportPotential: "Экспортный потенциал",
};

// Веса интегральной оценки — копия ASSESSMENT_WEIGHTS из systems-analysis.
const AXIS_WEIGHTS: Record<AssessmentAxis, number> = {
  firepower: 0.26,
  protection: 0.22,
  mobility: 0.14,
  awareness: 0.2,
  reliability: 0.13,
  exportPotential: 0.05,
};

const AXES = Object.keys(AXIS_RU) as AssessmentAxis[];

function overallScore(system: WeaponSystemProfile): number {
  let sum = 0;
  for (const axis of AXES) {
    sum += system.assessment[axis] * AXIS_WEIGHTS[axis];
  }
  return Math.round(sum * 100) / 100;
}

export default function SystemsPage() {
  const [systems, setSystems] = useState<WeaponSystemProfile[]>([]);
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);
  const [duel, setDuel] = useState<DuelResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [duelLoading, setDuelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Классы берём из фактически загруженных данных (полный список при
  // начальной загрузке без фильтра).
  const [knownClasses, setKnownClasses] = useState<WeaponClassId[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim() !== "") params.set("q", query.trim());
      if (classFilter !== "") params.set("class", classFilter);
      setLoading(true);
      fetch(`/api/v3/systems?${params.toString()}`)
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data: unknown) => {
          const list: WeaponSystemProfile[] = Array.isArray(data)
            ? (data as WeaponSystemProfile[])
            : ((data as { systems?: WeaponSystemProfile[] }).systems ?? []);
          setSystems(list);
          if (classFilter === "" && query.trim() === "") {
            setKnownClasses(
              Array.from(new Set(list.map((s) => s.classId))).sort(),
            );
          }
          setError(null);
        })
        .catch((e: Error) => setError(`Не удалось загрузить системы: ${e.message}`))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, classFilter]);

  function toggleSelected(id: string) {
    setDuel(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  async function runDuel() {
    if (selected.length !== 2) return;
    setDuelLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v3/systems?duel=${encodeURIComponent(selected.join(","))}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      const result: DuelResult | null =
        data !== null && typeof data === "object" && "scoreA" in data
          ? (data as DuelResult)
          : ((data as { duel?: DuelResult }).duel ?? null);
      if (result === null) throw new Error("пустой ответ дуэли");
      setDuel(result);
    } catch (e) {
      setError(`Не удалось рассчитать дуэль: ${(e as Error).message}`);
    } finally {
      setDuelLoading(false);
    }
  }

  const selectedNames = useMemo(
    () =>
      selected
        .map((id) => systems.find((s) => s.id === id)?.nameRu ?? id)
        .join(" vs "),
    [selected, systems],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Системы вооружений</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          База из 220 систем по 10 классам (открытые источники, винтаж
          2024–2025). Выберите две системы и нажмите «Дуэль» — интегральный
          счёт учитывает экспертную оценку, боевой опыт и распространённость.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-64 flex-1 flex-col gap-1 text-sm">
          <span className="text-slate-400">Поиск по названию</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Например: Т-14, Patriot, Bayraktar…"
            className="rounded border border-tactical-line bg-tactical-panel px-3 py-2 text-slate-100 outline-none placeholder:text-slate-500 focus:border-tactical-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-400">Класс</span>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded border border-tactical-line bg-tactical-panel px-3 py-2 text-slate-100 outline-none focus:border-tactical-accent"
          >
            <option value="">Все классы</option>
            {knownClasses.map((cls) => (
              <option key={cls} value={cls}>
                {CLASS_RU[cls]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={runDuel}
          disabled={selected.length !== 2 || duelLoading}
          className="rounded bg-tactical-primary px-4 py-2 text-sm font-semibold text-tactical-bg transition-colors hover:bg-tactical-primary/85 disabled:cursor-not-allowed disabled:bg-tactical-raised disabled:text-slate-400"
        >
          {duelLoading ? "Считаем…" : "Дуэль"}
        </button>
        {selected.length > 0 && (
          <span className="text-sm text-slate-300">
            Выбрано: {selectedNames || selected.join(", ")}
          </span>
        )}
      </div>

      {error !== null && (
        <div className="rounded border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {duel !== null && (
        <section className="rounded-lg border border-tactical-line bg-tactical-panel p-4">
          <h2 className="text-lg font-semibold text-slate-50">
            Дуэль: {duel.a.nameRu} — {duel.b.nameRu}
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {[
              { system: duel.a, score: duel.scoreA },
              { system: duel.b, score: duel.scoreB },
            ].map(({ system, score }) => {
              const isWinner =
                score === Math.max(duel.scoreA, duel.scoreB) &&
                duel.scoreA !== duel.scoreB;
              return (
                <div
                  key={system.id}
                  className={`rounded border p-3 ${
                    isWinner
                      ? "border-emerald-600 bg-emerald-950/30"
                      : "border-tactical-line bg-tactical-bg/40"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-slate-100">
                      {system.nameRu}
                      {isWinner && (
                        <span className="ml-2 text-xs font-bold text-emerald-400">
                          ПОБЕДИТЕЛЬ
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-xl text-tactical-accent">
                      {score.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {system.nameEn} · {system.developerRu} · дуэльный счёт 0–100
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5">
            {AXES.map((axis) => {
              const va = duel.a.assessment[axis];
              const vb = duel.b.assessment[axis];
              return (
                <div key={axis} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-xs">
                  <span className="text-slate-300">{AXIS_RU[axis]}</span>
                  <span className="w-40">
                    <span
                      className="block h-2 rounded bg-tactical-primary"
                      style={{ width: `${va * 10}%` }}
                    />
                  </span>
                  <span className="w-40">
                    <span
                      className="block h-2 rounded bg-amber-500"
                      style={{ width: `${vb * 10}%` }}
                    />
                  </span>
                  <span className="w-20 text-right font-mono text-slate-300">
                    {va.toFixed(1)} : {vb.toFixed(1)}
                  </span>
                </div>
              );
            })}
            <div className="flex justify-end gap-6 pt-1 text-[11px] text-slate-500">
              <span><span className="mr-1 inline-block h-2 w-3 rounded bg-tactical-primary" />{duel.a.nameRu}</span>
              <span><span className="mr-1 inline-block h-2 w-3 rounded bg-amber-500" />{duel.b.nameRu}</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-200">{duel.edgeRu}</p>
          <p className="mt-1 text-xs text-slate-500">
            Оси оценки — экспертные баллы 0–10 из базы систем; дуэльный счёт —
            эвристика для быстрых сопоставлений, а не модель боя.
          </p>
        </section>
      )}

      <p className="mb-1 text-xs text-slate-500 sm:hidden">Таблица шире экрана — прокрутите её вбок.</p>
      <div className="overflow-x-auto rounded-lg border border-tactical-line">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-tactical-panel text-slate-300">
            <tr>
              <th className="px-3 py-2 font-medium">Дуэль</th>
              <th className="px-3 py-2 font-medium">Название</th>
              <th className="px-3 py-2 font-medium">Класс</th>
              <th className="px-3 py-2 font-medium">Разработчик</th>
              <th className="px-3 py-2 font-medium">Статус</th>
              <th className="px-3 py-2 text-right font-medium">Общий балл</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  Загрузка…
                </td>
              </tr>
            )}
            {!loading && systems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  Ничего не найдено — измените запрос или фильтр.
                </td>
              </tr>
            )}
            {!loading &&
              systems.map((system) => {
                const checked = selected.includes(system.id);
                return (
                  <tr
                    key={system.id}
                    onClick={() => toggleSelected(system.id)}
                    className={`cursor-pointer border-t border-tactical-line transition-colors hover:bg-tactical-panel ${
                      checked ? "bg-tactical-primary/10" : ""
                    }`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelected(system.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 accent-tactical-primary"
                        aria-label={`Выбрать ${system.nameRu} для дуэли`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-slate-100">{system.nameRu}</span>
                      <span className="block text-xs text-slate-500">{system.nameEn}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-300">{system.classRu}</td>
                    <td className="px-3 py-2 text-slate-300">
                      {system.developerRu}
                      <span className="block text-xs text-slate-500">{system.manufacturerRu}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-300">{system.statusRu}</td>
                    <td className="px-3 py-2 text-right font-mono text-tactical-accent">
                      {overallScore(system).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Показано систем: {systems.length}. Общий балл — взвешенная интегральная
        оценка по шести осям (шкала 0–10), как в аналитическом слое базы.
      </p>
    </div>
  );
}
