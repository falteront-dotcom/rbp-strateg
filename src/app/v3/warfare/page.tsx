// Устойчивость в войне и симулятор боя (Волна 3, warfare3).
// Серверная часть: таблица выносливости топ-30 — профили запасов
// (data/top30-sustainability) прогоняются через assessCountryEndurance
// при стандартной интенсивности; клиентская часть (DuelClient) —
// симулятор Ланчестера через POST /api/v3/warfare/duel.

import { assessCountryEndurance } from "@/lib/warfare3/endurance";
import { TOP30_SUSTAINABILITY } from "@/lib/warfare3/data/top30-sustainability";
import DuelClient from "./DuelClient";

function formatHorizon(months: number): string {
  if (!Number.isFinite(months)) return "устойчива (приток ≥ расхода)";
  const days = Math.round(months * 30);
  return `${months.toFixed(1)} мес (~${days.toLocaleString("ru-RU")} дн)`;
}

export default function WarfarePage() {
  const reports = TOP30_SUSTAINABILITY.map((profile) =>
    assessCountryEndurance(profile),
  ).sort((a, b) => b.overallScore - a.overallScore);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-50">
          Устойчивость в войне
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Выносливость страны определяется самым узким местом: месяцы до
          исчерпания запасов по семи категориям с учётом производства и
          импорта. Все запасы помечены как оценочные — реальные стоки не
          публикует ни одна страна.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-50">
          Выносливость топ-30
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Страна</th>
                <th className="px-3 py-2 text-right font-medium">Балл</th>
                <th className="px-3 py-2 font-medium">Горизонт выносливости</th>
                <th className="px-3 py-2 font-medium">Бутылочное горлышко</th>
                <th className="px-3 py-2 font-medium">Второй ограничитель</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, index) => (
                <tr
                  key={report.iso3}
                  className="border-t border-slate-800 transition-colors hover:bg-slate-900"
                  title={report.verdictRu}
                >
                  <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                  <td className="px-3 py-2">
                    <span className="font-medium text-slate-100">
                      {report.nameRu}
                    </span>
                    <span className="ml-2 font-mono text-xs text-slate-500">
                      {report.iso3}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-sky-300">
                    {report.overallScore}
                  </td>
                  <td className="px-3 py-2 text-slate-200">
                    {formatHorizon(report.overallMonths)}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {report.bottleneck.labelRu}
                    <span className="block text-xs text-slate-500">
                      {formatHorizon(report.bottleneck.monthsToExhaustion)} ·
                      балл категории {report.bottleneck.score}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {report.secondBottleneck !== null ? (
                      <>
                        {report.secondBottleneck.labelRu}
                        <span className="block text-xs text-slate-500">
                          {formatHorizon(
                            report.secondBottleneck.monthsToExhaustion,
                          )}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          Балл 0–100: 60% — категория-горлышко, 40% — среднее по категориям.
          Горизонт страны равен горизонту горлышка. Наведите курсор на строку,
          чтобы увидеть текстовый вердикт по стране.
        </p>
      </section>

      <DuelClient />
    </div>
  );
}
