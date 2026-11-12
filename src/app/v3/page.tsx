import Link from "next/link";
import { Flag } from "@/components/Flag";
import { getAlertsFeed, getBP3Ranking } from "@/lib/v3-facade";
import {
  ALERT_LEVEL_LABELS_RU,
  type Alert,
  type AlertLevel,
} from "@/lib/monitor/alerts";

export const metadata = {
  title: "РБП-Стратег 3.0 — рейтинг боевого потенциала",
};

/** Стили уровней алертов мониторинга. */
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
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/40",
    dot: "bg-sky-400",
  },
};

function fmt(n: number, digits = 1): string {
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Полоса интервала P10–P90 на шкале 0–100 с точкой медианы (итогового балла). */
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
      className="relative h-2.5 w-36 shrink-0 rounded bg-slate-800"
      title={`P10 ${fmt(p10)} — P90 ${fmt(p90)}, медиана ${fmt(total)}`}
      role="img"
      aria-label={`Интервал P10 ${fmt(p10)} — P90 ${fmt(p90)} на шкале 0–100, медиана ${fmt(total)}`}
    >
      {/* общая ось 0–100: без неё ширина интервала не читается */}
      <div className="absolute top-0 h-full w-px bg-slate-700" style={{ left: "25%" }} />
      <div className="absolute top-0 h-full w-px bg-slate-700" style={{ left: "50%" }} />
      <div className="absolute top-0 h-full w-px bg-slate-700" style={{ left: "75%" }} />
      <div
        className="absolute top-0 h-full rounded bg-sky-500/50"
        style={{ left: `${left}%`, width: `${width}%` }}
      />
      <div
        className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded bg-sky-300"
        style={{ left: `calc(${dot}% - 2px)` }}
      />
      <span className="absolute -bottom-3.5 left-0 text-[8px] leading-none text-slate-600">0</span>
      <span className="absolute -bottom-3.5 right-0 text-[8px] leading-none text-slate-600">100</span>
    </div>
  );
}

function AlertItem({ alert }: { alert: Alert }) {
  const style = LEVEL_STYLES[alert.level] ?? LEVEL_STYLES.watch;
  return (
    <li className="border-b border-slate-800 py-3 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
        <span
          className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${style.badge}`}
        >
          {ALERT_LEVEL_LABELS_RU[alert.level]}
        </span>
        <Link
          href={`/v3/country/${alert.iso3}`}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-100 hover:text-sky-300"
        >
          <Flag iso={alert.iso3} />
          {alert.nameRu}
        </Link>
        <span className="ml-auto text-xs text-slate-500">
          {alert.fromYear} → {alert.toYear}
        </span>
      </div>
      <p className="mt-1.5 text-sm font-medium text-slate-200">
        {alert.titleRu}
      </p>
      <p className="mt-0.5 text-sm text-slate-400">{alert.explanationRu}</p>
    </li>
  );
}

const SECTION_CARDS: { href: string; title: string; text: string }[] = [
  {
    href: "/v3/systems",
    title: "Системы вооружений",
    text: "База из 220 систем: характеристики, оценки по шести осям, дуэли систем и экспортный потенциал.",
  },
  {
    href: "/v3/intel",
    title: "Предупреждения I&W",
    text: "Каталог из 340 индикаторов и предупреждений: скоринг по странам, грейдинг источников, анализ конкурирующих гипотез.",
  },
  {
    href: "/v3/warfare",
    title: "Устойчивость и бой",
    text: "Выносливость экономик и запасов, мобилизационный потенциал, симулятор боя по Ланчестеру, проекция силы.",
  },
];

export default function V3DashboardPage() {
  const ranking = getBP3Ranking();
  const alerts = getAlertsFeed().slice(0, 15);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">РБП-Стратег 3.0</h1>
        <p className="mt-2 max-w-3xl text-slate-400">
          Десятикомпонентная модель боевого потенциала: к классическим
          компонентам добавлены БПЛА и боеприпасы/производство. Итог считается
          Монте-Карло — вместо одного числа показан интервал P10–P90, а дельта —
          изменение относительно модели 2.0.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {SECTION_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-sky-500/50 hover:bg-slate-800/60"
          >
            <h2 className="font-semibold text-slate-100">{card.title}</h2>
            <p className="mt-1 text-sm text-slate-400">{card.text}</p>
            <span className="mt-2 inline-block text-sm text-sky-400">
              Открыть →
            </span>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-xl font-semibold text-slate-100">
            Рейтинг боевого потенциала 3.0
          </h2>
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Страна</th>
                  <th className="px-3 py-2 font-medium">БП 3.0</th>
                  <th className="px-3 py-2 font-medium">Интервал P10–P90</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Δ к 2.0
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row, i) => (
                  <tr
                    key={row.iso}
                    className="border-b border-slate-800/60 last:border-b-0 hover:bg-slate-800/40"
                  >
                    <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/v3/country/${row.iso}`}
                        className="flex items-center gap-2 font-medium text-slate-100 hover:text-sky-300"
                      >
                        <Flag iso={row.iso} title={row.name} />
                        <span>{row.name}</span>
                      </Link>
                      {!row.hasUP && (
                        <span
                          className="ml-2 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-300"
                          title="Нет данных по компонентам БПЛА и боеприпасы/производство — оценка по восьми компонентам"
                        >
                          нет U/P
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-base font-semibold text-slate-50">
                      {fmt(row.total)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <IntervalBar
                          p10={row.p10}
                          p90={row.p90}
                          total={row.total}
                        />
                        <span className="font-mono text-xs text-slate-400">
                          {fmt(row.p10)}–{fmt(row.p90)}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono ${
                        row.deltaV2 > 0
                          ? "text-emerald-400"
                          : row.deltaV2 < 0
                            ? "text-red-400"
                            : "text-slate-500"
                      }`}
                    >
                      {row.deltaV2 > 0 ? "+" : ""}
                      {fmt(row.deltaV2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Пометка «нет U/P» — по стране нет надёжных открытых данных по БПЛА и
            производству боеприпасов; итог для неё посчитан по восьми
            компонентам и не полностью сопоставим с полным профилем.
          </p>
        </section>

        <aside>
          <h2 className="mb-3 text-xl font-semibold text-slate-100">
            Лента мониторинга
          </h2>
          <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-1">
            {alerts.length === 0 ? (
              <p className="py-4 text-sm text-slate-400">
                Сработавших правил мониторинга нет.
              </p>
            ) : (
              <ul>
                {alerts.map((alert, i) => (
                  <AlertItem
                    key={`${alert.ruleId}-${alert.iso3}-${i}`}
                    alert={alert}
                  />
                ))}
              </ul>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Алерты строятся по дельтам снапшотов 2023–2025 гг. и абсолютным
            порогам (выносливость, доля военных расходов и др.).
          </p>
        </aside>
      </div>
    </div>
  );
}
