"use client";

// Клиентская часть страницы «Устойчивость и бой»: форма сценария
// Ланчестера (типы и пресеты — src/lib/warfare3/lanchester) и результат
// POST /api/v3/warfare/duel (LanchesterResult).

import { useState } from "react";
import {
  LANCHESTER_PRESETS,
  type LanchesterForce,
  type LanchesterLaw,
  type LanchesterResult,
  type LanchesterScenario,
  type LanchesterTerrain,
  type SuperiorityLevel,
} from "@/lib/warfare3/lanchester";

const LAW_RU: Record<LanchesterLaw, string> = {
  square: "Квадратичный (прицельный огонь)",
  linear: "Линейный (огонь по площадям / партизанский)",
};

const TERRAIN_RU: Record<LanchesterTerrain, string> = {
  plains: "Равнина",
  steppe: "Степь",
  forest: "Лес",
  mountains: "Горы",
  urban: "Городская застройка",
  desert: "Пустыня",
  swamp: "Болотистая местность",
  coastal: "Побережье",
};

const LEVEL_RU: Record<SuperiorityLevel, string> = {
  none: "Нет",
  contested: "Оспаривается",
  advantage: "Преимущество",
  dominance: "Господство",
};

const OUTCOME_RU: Record<LanchesterResult["outcome"], string> = {
  annihilation: "Уничтожение стороны",
  collapse: "Моральный распад стороны",
  exhaustion: "Боевое истощение стороны",
  stalemate: "Тупик — бой не дал решения",
  mutualCollapse: "Взаимный распад обеих сторон",
};

const DEFAULT_SCENARIO: LanchesterScenario =
  LANCHESTER_PRESETS[0]?.scenario ?? {
    forceA: {
      name: "Сторона A",
      initialStrength: 3000,
      quality: 0.02,
      moraleBreakFraction: 0.3,
      reinforcementsPerDay: 0,
    },
    forceB: {
      name: "Сторона B",
      initialStrength: 1000,
      quality: 0.02,
      moraleBreakFraction: 0.3,
      reinforcementsPerDay: 0,
    },
    law: "square",
    terrain: "plains",
    defender: "b",
    ewSuperiority: { side: null, level: "none" },
    airSuperiority: { side: null, level: "none" },
    maxDays: 365,
    stepDays: 0.25,
    exhaustionFraction: 0.1,
    linearScale: null,
  };

const inputCls =
  "w-full rounded border border-tactical-line bg-tactical-panel px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-tactical-accent";
const labelCls = "flex flex-col gap-1 text-xs text-slate-400";

function num(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ForceForm({
  title,
  force,
  onChange,
}: {
  title: string;
  force: LanchesterForce;
  onChange: (force: LanchesterForce) => void;
}) {
  const set = (patch: Partial<LanchesterForce>) =>
    onChange({ ...force, ...patch });
  return (
    <fieldset className="space-y-3 rounded-lg border border-tactical-line bg-tactical-panel/60 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-100">
        {title}
      </legend>
      <label className={labelCls}>
        Название
        <input
          className={inputCls}
          value={force.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          Численность (ед.)
          <input
            className={inputCls}
            type="number"
            min={1}
            value={force.initialStrength}
            onChange={(e) =>
              set({ initialStrength: num(e.target.value, force.initialStrength) })
            }
          />
        </label>
        <label className={labelCls}>
          Качество (летальность/сутки)
          <input
            className={inputCls}
            type="number"
            step={0.001}
            min={0.0001}
            value={force.quality}
            onChange={(e) => set({ quality: num(e.target.value, force.quality) })}
          />
        </label>
        <label className={labelCls}>
          Порог распада (доля остатка 0–1)
          <input
            className={inputCls}
            type="number"
            step={0.05}
            min={0}
            max={1}
            value={force.moraleBreakFraction}
            onChange={(e) =>
              set({ moraleBreakFraction: num(e.target.value, force.moraleBreakFraction) })
            }
          />
        </label>
        <label className={labelCls}>
          Подкрепления (ед./сутки)
          <input
            className={inputCls}
            type="number"
            min={0}
            value={force.reinforcementsPerDay}
            onChange={(e) =>
              set({ reinforcementsPerDay: num(e.target.value, force.reinforcementsPerDay) })
            }
          />
        </label>
      </div>
    </fieldset>
  );
}

function SuperioritySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LanchesterScenario["ewSuperiority"];
  onChange: (v: LanchesterScenario["ewSuperiority"]) => void;
}) {
  const combined =
    value.side === null || value.level === "none"
      ? "none"
      : `${value.side}:${value.level}`;
  return (
    <label className={labelCls}>
      {label}
      <select
        className={inputCls}
        value={combined}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "none") {
            onChange({ side: null, level: "none" });
          } else {
            const [side, level] = v.split(":") as [
              "a" | "b",
              SuperiorityLevel,
            ];
            onChange({ side, level });
          }
        }}
      >
        <option value="none">Паритет / не задано</option>
        {(["a", "b"] as const).map((side) =>
          (["contested", "advantage", "dominance"] as const).map((level) => (
            <option key={`${side}:${level}`} value={`${side}:${level}`}>
              Сторона {side.toUpperCase()}: {LEVEL_RU[level].toLowerCase()}
            </option>
          )),
        )}
      </select>
    </label>
  );
}

export default function DuelClient() {
  const [scenario, setScenario] = useState<LanchesterScenario>(() =>
    structuredClone(DEFAULT_SCENARIO),
  );
  const [result, setResult] = useState<LanchesterResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<LanchesterScenario>) =>
    setScenario((prev) => ({ ...prev, ...p }));

  function applyPreset(id: string) {
    const preset = LANCHESTER_PRESETS.find((p) => p.id === id);
    if (preset) {
      setScenario(structuredClone(preset.scenario));
      setResult(null);
    }
  }

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/v3/warfare/duel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scenario),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      const duel: LanchesterResult =
        data !== null && typeof data === "object" && "verdictRu" in data
          ? (data as LanchesterResult)
          : ((data as { result: LanchesterResult }).result ??
            (data as { duel: LanchesterResult }).duel);
      setResult(duel);
    } catch (e) {
      setError(`Не удалось выполнить симуляцию: ${(e as Error).message}`);
    } finally {
      setRunning(false);
    }
  }

  const winnerName =
    result === null || result.winner === null
      ? null
      : result.winner === "a"
        ? scenario.forceA.name
        : scenario.forceB.name;

  // Показываем не более ~24 строк журнала: равномерная выборка по дням.
  const logSample =
    result === null
      ? []
      : result.dailyLog.filter(
          (_, i) =>
            i % Math.max(1, Math.floor(result.dailyLog.length / 24)) === 0 ||
            i === result.dailyLog.length - 1,
        );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-50">Симулятор боя</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Аттриционная модель Ланчестера с модификаторами местности,
          превосходства в РЭБ и в воздухе. Качество 0,02 означает: одна
          единица в сутки выводит из строя в среднем 0,02 единицы противника
          при прицельном огне.
        </p>
      </div>

      <label className={`${labelCls} max-w-xl`}>
        Пресет сценария
        <select
          className={inputCls}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value !== "") applyPreset(e.target.value);
          }}
        >
          <option value="" disabled>
            Выбрать пресет…
          </option>
          {LANCHESTER_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.nameRu}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 lg:grid-cols-2">
        <ForceForm
          title="Сторона A"
          force={scenario.forceA}
          onChange={(forceA) => patch({ forceA })}
        />
        <ForceForm
          title="Сторона B"
          force={scenario.forceB}
          onChange={(forceB) => patch({ forceB })}
        />
      </div>

      <div className="grid gap-3 rounded-lg border border-tactical-line bg-tactical-panel/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className={labelCls}>
          Закон боя
          <select
            className={inputCls}
            value={scenario.law}
            onChange={(e) => patch({ law: e.target.value as LanchesterLaw })}
          >
            {(Object.keys(LAW_RU) as LanchesterLaw[]).map((law) => (
              <option key={law} value={law}>
                {LAW_RU[law]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Местность
          <select
            className={inputCls}
            value={scenario.terrain}
            onChange={(e) =>
              patch({ terrain: e.target.value as LanchesterTerrain })
            }
          >
            {(Object.keys(TERRAIN_RU) as LanchesterTerrain[]).map((t) => (
              <option key={t} value={t}>
                {TERRAIN_RU[t]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Обороняется
          <select
            className={inputCls}
            value={scenario.defender ?? "none"}
            onChange={(e) =>
              patch({
                defender:
                  e.target.value === "none"
                    ? null
                    : (e.target.value as "a" | "b"),
              })
            }
          >
            <option value="none">Встречный бой</option>
            <option value="a">Сторона A</option>
            <option value="b">Сторона B</option>
          </select>
        </label>
        <label className={labelCls}>
          Макс. длительность (суток)
          <input
            className={inputCls}
            type="number"
            min={1}
            max={3650}
            value={scenario.maxDays}
            onChange={(e) => patch({ maxDays: num(e.target.value, scenario.maxDays) })}
          />
        </label>
        <SuperioritySelect
          label="Превосходство в РЭБ"
          value={scenario.ewSuperiority}
          onChange={(ewSuperiority) => patch({ ewSuperiority })}
        />
        <SuperioritySelect
          label="Превосходство в воздухе"
          value={scenario.airSuperiority}
          onChange={(airSuperiority) => patch({ airSuperiority })}
        />
      </div>

      <button
        type="button"
        onClick={run}
        disabled={running}
        className="rounded bg-tactical-primary px-4 py-2 text-sm font-semibold text-tactical-bg transition-colors hover:bg-tactical-primary/85 disabled:cursor-not-allowed disabled:bg-tactical-raised disabled:text-slate-400"
      >
        {running ? "Симуляция…" : "Запустить симуляцию"}
      </button>

      {error !== null && (
        <div className="rounded border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {result !== null && (
        <div className="space-y-4 rounded-lg border border-tactical-line bg-tactical-panel p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-50">
              {winnerName !== null
                ? `Победитель: ${winnerName}`
                : "Победителя нет"}
            </h3>
            <span className="text-sm text-slate-300">
              {OUTCOME_RU[result.outcome]} · {result.durationDays} суток
            </span>
          </div>
          <p className="text-sm text-slate-200">{result.verdictRu}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                name: scenario.forceA.name,
                initial: scenario.forceA.initialStrength,
                final: result.finalStrengthA,
                losses: result.totalLossesA,
              },
              {
                name: scenario.forceB.name,
                initial: scenario.forceB.initialStrength,
                final: result.finalStrengthB,
                losses: result.totalLossesB,
              },
            ].map((row) => (
              <div
                key={row.name}
                className="rounded border border-tactical-line bg-tactical-raised p-3 text-sm"
              >
                <div className="font-semibold text-slate-100">{row.name}</div>
                <div className="mt-1 text-slate-300">
                  Осталось:{" "}
                  <span className="font-mono text-tactical-primary">
                    {Math.round(row.final).toLocaleString("ru-RU")}
                  </span>{" "}
                  из {row.initial.toLocaleString("ru-RU")} · потери:{" "}
                  {Math.round(row.losses).toLocaleString("ru-RU")} (
                  {row.initial > 0
                    ? ((row.losses / row.initial) * 100).toFixed(1)
                    : "0"}
                  %)
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Обменное соотношение (потери B / потери A):{" "}
            {result.exchangeRatio.toFixed(2)} · эффективная летальность A:{" "}
            {result.effectiveAlpha.toFixed(4)}, B:{" "}
            {result.effectiveBeta.toFixed(4)}
            {result.winnerLossPct !== null &&
              ` · потери победителя: ${result.winnerLossPct.toFixed(1)}% начальной численности`}
          </p>
          {logSample.length > 1 && (
            <div className="max-h-64 overflow-y-auto rounded border border-tactical-line custom-scrollbar">
              <table className="w-full text-left font-mono text-xs">
                <thead className="sticky top-0 bg-tactical-raised text-slate-200">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Сутки</th>
                    <th className="px-2 py-1.5 text-right font-medium">Остаток A</th>
                    <th className="px-2 py-1.5 text-right font-medium">Остаток B</th>
                    <th className="px-2 py-1.5 text-right font-medium">Потери A (накопл.)</th>
                    <th className="px-2 py-1.5 text-right font-medium">Потери B (накопл.)</th>
                  </tr>
                </thead>
                <tbody>
                  {logSample.map((day) => (
                    <tr key={day.day} className="border-t border-tactical-line text-slate-300">
                      <td className="px-2 py-1">{day.day}</td>
                      <td className="px-2 py-1 text-right">{Math.round(day.strengthA).toLocaleString("ru-RU")}</td>
                      <td className="px-2 py-1 text-right">{Math.round(day.strengthB).toLocaleString("ru-RU")}</td>
                      <td className="px-2 py-1 text-right">{Math.round(day.cumulativeLossesA).toLocaleString("ru-RU")}</td>
                      <td className="px-2 py-1 text-right">{Math.round(day.cumulativeLossesB).toLocaleString("ru-RU")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
