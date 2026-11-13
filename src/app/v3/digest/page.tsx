import type { Metadata } from "next";
import Link from "next/link";
import { Flag } from "@/components/Flag";
import { getAlertsFeed, getBP3Ranking } from "@/lib/v3-facade";
import {
  selectDigestData,
  type DigestInput,
} from "@/lib/digest/generator";
import {
  ALERT_LEVEL_LABELS_RU,
  type Alert,
  type AlertLevel,
} from "@/lib/monitor/alerts";

// Дайджест читает БД при каждом запросе — «свежий срез», а не снимок сборки.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Дайджест — РБП-Стратег 3.0",
};

const GITHUB_DIGESTS_URL =
  "https://github.com/falteront-dotcom/rbp-strateg/tree/master/docs/digests";

/** Стили уровней алертов (как на главной /v3). */
const LEVEL_STYLES: Record<AlertLevel, { badge: string; dot: string }> = {
  critical: {
    badge: "bg-red-500/15 text-red-300 border-red-500/40",
    dot: "bg-red-400",
  },
  warning: {
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    dot: "bg-amber-400",
  },
  watch: {
    badge:
      "bg-tactical-primary/15 text-tactical-accent border-tactical-accent/40",
    dot: "bg-tactical-primary",
  },
};

function fmt(n: number, digits = 1): string {
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Полоса интервала P10–P90 на шкале 0–100 с точкой медианы. */
function IntervalBar({
  p10,
  p90,
  total,
}: {
  p10: number;
  p90: number;
  total: number;
}) {
  const left = Math.max(0, Math.min(100, p10));
  const width = Math.max(0, Math.min(100, p90) - left);
  const dot = Math.max(0, Math.min(100, total));
  return (
    <div
      className="relative h-2.5 w-36 shrink-0 rounded bg-tactical-raised"
      role="img"
      aria-label={`Интервал P10 ${fmt(p10)} — P90 ${fmt(p90)} на шкале 0–100, медиана ${fmt(total)}`}
    >
      <div className="absolute top-0 h-full w-px bg-tactical-raised" style={{ left: "25%" }} />
      <div className="absolute top-0 h-full w-px bg-tactical-raised" style={{ left: "50%" }} />
      <div className="absolute top-0 h-full w-px bg-tactical-raised" style={{ left: "75%" }} />
      <div
        className="absolute top-0 h-full rounded bg-tactical-primary/50"
        style={{ left: `${left}%`, width: `${width}%` }}
      />
      <div
        className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded bg-tactical-accent"
        style={{ left: `calc(${dot}% - 2px)` }}
      />
    </div>
  );
}

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

function AlertItem({ alert }: { alert: Alert }) {
  const style = LEVEL_STYLES[alert.level] ?? LEVEL_STYLES.watch;
  return (
    <li className="border-b border-tactical-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
        <span
          className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${style.badge}`}
        >
          {ALERT_LEVEL_LABELS_RU[alert.level]}
        </span>
        <Link
          href={`/v3/country/${alert.iso3}`}
          className="flex min-h-8 items-center gap-1.5 font-medium text-slate-100 hover:text-tactical-accent"
        >
          <Flag iso={alert.iso3} />
          {alert.nameRu}
        </Link>
        <span className="ml-auto font-mono text-xs text-slate-500">
          {alert.fromYear} → {alert.toYear}
        </span>
      </div>
      <p className="mt-1.5 font-medium text-slate-200">{alert.titleRu}</p>
      <p className="mt-0.5 text-slate-400">{alert.explanationRu}</p>
      <p className="mt-1 text-xs text-slate-500">
        Проверить: {alert.followUpRu}
      </p>
    </li>
  );
}

/** Еженедельный дайджест: свежий срез рейтинга и мониторинга по текущей БД. */
export default function DigestPage() {
  const input: DigestInput = {
    dateIso: new Date().toISOString().slice(0, 10),
    ranking: getBP3Ranking(),
    alerts: getAlertsFeed(),
  };
  const d = selectDigestData(input);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-50">Дайджест</h1>
        <p className="mt-1 text-sm text-slate-400">
          Сгенерирован: {d.dateIso} · модель БП 3.0 · стран в рейтинге:{" "}
          {d.totalCountries}. Еженедельная сводка: рейтинг с интервалами
          неопределённости, статистически неотличимые пары, лента мониторинга.
        </p>
      </header>

      <Section title={`Топ-${d.top.length} рейтинга БП 3.0`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-tactical-line text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2 font-medium">#</th>
                <th className="px-2 py-2 font-medium">Страна</th>
                <th className="px-2 py-2 font-medium">БП 3.0</th>
                <th className="px-2 py-2 font-medium">Интервал P10–P90</th>
                <th className="px-2 py-2 font-medium">Ранг P10–P90</th>
                <th className="px-2 py-2 font-medium">P(выше соседа)</th>
              </tr>
            </thead>
            <tbody>
              {d.top.map((row, i) => (
                <tr
                  key={row.iso}
                  className="border-b border-tactical-line/60 last:border-b-0 hover:bg-tactical-raised/40"
                >
                  <td className="px-2 py-2 text-slate-500">{i + 1}</td>
                  <td className="px-2 py-2">
                    <Link
                      href={`/v3/country/${row.iso}`}
                      className="flex min-h-8 items-center gap-2 font-medium text-slate-100 hover:text-tactical-accent"
                    >
                      <Flag iso={row.iso} title={row.name} />
                      <span>{row.name}</span>
                    </Link>
                  </td>
                  <td className="px-2 py-2 font-mono font-semibold text-slate-50">
                    {fmt(row.total)}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <IntervalBar p10={row.p10} p90={row.p90} total={row.total} />
                      <span className="font-mono text-xs text-slate-400">
                        {fmt(row.p10)}–{fmt(row.p90)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 font-mono text-xs text-slate-400">
                    {row.rankStability.rankP10}–{row.rankStability.rankP90}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs text-slate-400">
                    {row.rankStability.pAboveNext === null
                      ? "—"
                      : `${fmt(row.rankStability.pAboveNext * 100)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          Интервалы учитывают весовую неопределённость: веса экспертные,
          тянутся из Dirichlet(κ=100) на каждой итерации Монте-Карло.
        </p>
      </Section>

      <Section title="Самые неопределённые соседние пары">
        {d.pairs.length === 0 ? (
          <p className="text-slate-400">
            Пары не определены: rank-stability не рассчитан.
          </p>
        ) : (
          <>
            <p className="text-slate-400">
              Соседи по рейтингу, чей порядок статистически неотличим —
              P(верхняя страна выше соседа) ближе всего к 50%.
            </p>
            <ul className="space-y-2">
              {d.pairs.map((p) => (
                <li
                  key={p.upper.iso}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-tactical-line/60 bg-tactical-raised/30 px-3 py-2"
                >
                  <span className="font-mono text-xs text-slate-500">
                    #{p.pos}
                  </span>
                  <Link
                    href={`/v3/country/${p.upper.iso}`}
                    className="flex min-h-8 items-center gap-1.5 font-medium text-slate-100 hover:text-tactical-accent"
                  >
                    <Flag iso={p.upper.iso} title={p.upper.name} />
                    {p.upper.name}
                  </Link>
                  <span className="font-mono text-xs text-slate-400">
                    {fmt(p.upper.total)}
                  </span>
                  <span className="text-slate-600">vs</span>
                  <Link
                    href={`/v3/country/${p.lower.iso}`}
                    className="flex min-h-8 items-center gap-1.5 font-medium text-slate-100 hover:text-tactical-accent"
                  >
                    <Flag iso={p.lower.iso} title={p.lower.name} />
                    {p.lower.name}
                  </Link>
                  <span className="font-mono text-xs text-slate-400">
                    {fmt(p.lower.total)}
                  </span>
                  <span className="ml-auto rounded border border-tactical-accent/40 bg-tactical-primary/15 px-1.5 py-0.5 font-mono text-xs text-tactical-accent">
                    P(выше соседа) {fmt(p.pAboveNext * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section title="Лента мониторинга">
        {d.alerts.length === 0 ? (
          <p className="text-slate-400">
            Алертов нет: на текущих рядах мониторинга не сработало ни одно
            правило.
          </p>
        ) : (
          <>
            <p className="text-slate-400">
              Сработавших алертов: {d.alertsTotal}. Каждый алерт — гипотеза
              для проверки, не свершившийся факт.
            </p>
            <ul>
              {d.alerts.map((alert) => (
                <AlertItem key={`${alert.ruleId}-${alert.iso3}-${alert.titleRu}`} alert={alert} />
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section title="Методология и ограничения">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Веса — экспертные (elicitation), не калиброваны по исходам
            конфликтов; происхождение и процедура пересмотра:{" "}
            <code className="rounded bg-tactical-raised px-1">
              docs/weights-elicitation.md
            </code>
            .
          </li>
          <li>
            Интервалы P10–P90 и устойчивость ранга — Монте-Карло (4000
            итераций), веса тянутся из Dirichlet(κ=100) на каждой итерации.
          </li>
          <li>
            Свежесть прод-данных ограничена коммитными сидами; живой pipeline
            проверяется еженедельным smoke-тестом (pipeline-refresh.yml).
          </li>
        </ul>
        <p>
          Полная методология:{" "}
          <Link
            href="/v3/methodology"
            className="inline-flex min-h-8 items-center text-tactical-accent hover:underline"
          >
            /v3/methodology
          </Link>
        </p>
      </Section>

      <footer className="rounded-lg border border-tactical-line bg-tactical-panel p-5 text-sm text-slate-400">
        <h2 className="mb-2 text-base font-semibold text-slate-100">
          История дайджестов
        </h2>
        <p>
          Еженедельные выпуски сохраняются в{" "}
          <code className="rounded bg-tactical-raised px-1">docs/digests/</code>{" "}
          репозитория:{" "}
          <a
            href={GITHUB_DIGESTS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-8 items-center text-tactical-accent hover:underline"
          >
            github.com/falteront-dotcom/rbp-strateg · docs/digests
          </a>
          . Новый выпуск:{" "}
          <code className="rounded bg-tactical-raised px-1">
            npx tsx src/scripts/generate-digest.ts
          </code>
          .
        </p>
      </footer>
    </div>
  );
}
