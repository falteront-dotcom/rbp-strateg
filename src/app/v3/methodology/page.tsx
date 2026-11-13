import type { Metadata } from "next";
import { V3Nav } from "../V3Nav";
import {
  BP3_COMPONENT_LABELS_RU,
  DEFAULT_WEIGHTS_BP3,
  DEFAULT_WEIGHT_CONCENTRATION,
} from "@/lib/bp3";
import { BP3_COMPONENTS } from "@/lib/bp3/types";

export const metadata: Metadata = {
  title: "Методология — РБП-Стратег 3.0",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-tactical-line bg-tactical-panel p-5">
      <h2 className="mb-3 text-lg font-semibold text-slate-100">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-300">
        {children}
      </div>
    </section>
  );
}

/** Страница методологии: статический контент, БД не читает. */
export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <V3Nav />
      <header>
        <h1 className="text-2xl font-bold text-slate-50">
          Методология БП 3.0
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Как считается боевой потенциал, что означают интервалы и ранги,
          и чего модель честно не умеет.
        </p>
      </header>

      <Section title="Модель: 10 компонентов">
        <p>
          БП 3.0 = взвешенная сумма десяти компонентов на шкале 0–100.
          Восемь унаследованы от модели 2.0 (военная наука: Энциклопедия РВСН,
          SIPRI, Creveld), два добавлены по урокам войны 2022–2026 гг. —
          БПЛА (U) и боеприпасы/производство (P).
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tactical-line text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-3 font-medium">Компонент</th>
              <th className="py-2 font-medium">Вес</th>
            </tr>
          </thead>
          <tbody>
            {BP3_COMPONENTS.map((c) => (
              <tr key={c} className="border-b border-tactical-line/50 last:border-b-0">
                <td className="py-1.5 pr-3 text-slate-200">
                  {BP3_COMPONENT_LABELS_RU[c]}
                </td>
                <td className="py-1.5 font-mono text-slate-300">
                  {DEFAULT_WEIGHTS_BP3[c].toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Веса — <strong className="text-slate-100">экспертные</strong> (expert
          elicitation), не калиброванные по исходам конфликтов. Происхождение
          каждого веса и процедура пересмотра (BWM/Дельфи, Bradley–Terry по
          COW MID только при подлинных исходах) — в{" "}
          <code className="rounded bg-tactical-raised px-1">docs/weights-elicitation.md</code>.
        </p>
      </Section>

      <Section title="Неопределённость: Монте-Карло с весами Dirichlet">
        <p>
          Значительная часть входов — оценки с разбросом в разы (производство
          FPV, запасы снарядов). Точечный балл в таких условиях — иллюзия
          точности, поэтому итог публикуется как распределение: медиана и
          интервал P10–P90 по 4000 итерациям Монте-Карло.
        </p>
        <p>
          Каждый компонент тянется из усечённого нормального распределения вокруг
          точечного балла с сигмой по грейду провенанса. Веса тоже не константы:
          они тянутся из Dirichlet(α = вес × {DEFAULT_WEIGHT_CONCENTRATION}) на
          каждой итерации — сумма всегда 1, среднее равно экспертным весам.
          Так интервалы покрывают главный эпистемический риск («почему оружие
          0.16, а не 0.20?»), а не только разброс входных данных.
        </p>
        <p>
          Расчёт воспроизводим: сидированный RNG (mulberry32), сид страны
          зависит от её ISO-кода — добавление страны в когорту не меняет чужие
          распределения.
        </p>
      </Section>

      <Section title="Ранг — не точка">
        <p>
          Колонка «Ранг P10–P90» в рейтинге — интервал места страны по итерациям
          Монте-Карло; наведение показывает P(страна выше следующего соседа).
          Замер ноября 2026: P(USA выше CHN) ≈ 0.65 — лидеры статистически
          неразличимы, и точечный ранг это скрывал.
        </p>
        <p>
          Leave-one-component-out диагностика: удаление любого одного компонента
          меняет порядок стран слабо (Spearman ρ ≥ 0.99) — рейтинг
          переопределён коррелированными компонентами. Отчёты диагностики —
          в <code className="rounded bg-tactical-raised px-1">docs/diagnostics/</code>.
        </p>
      </Section>

      <Section title="Данные и провенанс">
        <p>
          Источники: SIPRI (военные расходы), GFP 2025 (коммитный снапшот
          рангов и параметров), World Bank (экономика), IISS Military Balance.
          Каждый вход несёт источник, год и грейд надёжности (A — официальная
          отчётность, ниже — признанные базы, оценки, экспертные шкалы).
        </p>
        <p>
          Для стран вне топ-30 по данным U/P используется честная нулевая
          базовая линия: парки и производство — 0, зависимость от импорта —
          100%. Такие строки помечены «нет U/P» и не полностью сопоставимы
          с полным профилем.
        </p>
      </Section>

      <Section title="Валидация — диагностика, не калибровка">
        <p>
          10 качественных бенчмарков (сильные/слабые стороны, ядерная триада,
          проекция) плюс количественная сверка рангов со снапшотом GFP 2025
          (~132 страны). Spearman ρ ≈ 0.876, пересечение топ-20 — 17/20
          (отчёт в docs/diagnostics/). Страна без референса получает честный
          «no-reference», а не фиктивный «пройдено».
        </p>
        <p>
          Подгонка весов к GFP циркулярна: GFP — сам композит из 60+ факторов
          с закрытыми весами, часть входов модели уже вшита в данные, GFP
          исключает ядерное оружие и покрывает не все страны модели.
          Конфликтные исходы (COW MID) не идентифицируют 8+ весов: порядок
          10–15 войн, selection bias, грубость исхода.
        </p>
      </Section>

      <Section title="Ограничения (честно)">
        <ul className="list-disc space-y-1 pl-5">
          <li>Веса не калиброваны по исходам — это экспертная модель.</li>
          <li>
            Свежесть прод-данных = коммитные сиды (Render free, эфемерная БД);
            живой pipeline из источников проверяется еженедельно в CI.
          </li>
          <li>
            Часть входов (мораль, опыт, техуровень) — экспертные шкалы 0–10;
            их разброс учтён сигмами, но не устранён.
          </li>
          <li>
            Модель оценивает потенциал, не исход конкретной войны: коалиции,
            resolve, ядерный зонтик и конкретный ТВД вне формулы.
          </li>
        </ul>
      </Section>

      <p className="text-xs text-slate-500">
        Досье страны с провенансом и интервалами: кнопка «Досье (md)» на
        карточке /v3/country/ISO или /api/v3/dossier?iso=ISO.
      </p>
    </main>
  );
}
