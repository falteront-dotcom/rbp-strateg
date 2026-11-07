import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag } from "@/components/Flag";
import { getBP3Detail } from "@/lib/v3-facade";
import type { CountrySnapshot } from "@/lib/monitor/snapshots";

function fmt(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "∞";
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  return Math.round(n).toLocaleString("ru-RU");
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <h2 className="mb-4 text-lg font-semibold text-slate-100">{title}</h2>
      {children}
    </section>
  );
}

/** Горизонтальный бар на шкале 0–100 от from до to с подписями значений. */
function RangeBar({
  from,
  to,
  marker,
  barClass = "bg-sky-500/60",
}: {
  from: number;
  to: number;
  marker?: number;
  barClass?: string;
}) {
  const left = Math.max(0, Math.min(100, Math.min(from, to)));
  const right = Math.max(0, Math.min(100, Math.max(from, to)));
  return (
    <div className="relative h-2.5 w-full rounded bg-slate-800">
      <div
        className={`absolute top-0 h-full rounded ${barClass}`}
        style={{ left: `${left}%`, width: `${Math.max(right - left, 0.5)}%` }}
      />
      {marker !== undefined && (
        <div
          className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded bg-slate-100"
          style={{
            left: `calc(${Math.max(0, Math.min(100, marker))}% - 2px)`,
          }}
        />
      )}
    </div>
  );
}

/** Сетка «подпись — значение» для скалярных полей произвольного объекта. */
function ScalarGrid({
  entries,
}: {
  entries: [string, string | number][];
}) {
  if (entries.length === 0) return null;
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-3 border-b border-slate-800/70 pb-1"
        >
          <dt className="text-sm text-slate-400">{label}</dt>
          <dd className="text-right font-mono text-sm font-medium text-slate-100">
            {typeof value === "number" ? fmt(value) : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Скаляры верхнего уровня объекта (без служебных полей). */
function topScalars(
  obj: Record<string, unknown>,
  labels: Record<string, string> = {},
  skip: string[] = [],
): [string, string | number][] {
  const out: [string, string | number][] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (skip.includes(key)) continue;
    if (typeof value === "number" || typeof value === "string") {
      if (typeof value === "string" && value.length > 120) continue;
      out.push([labels[key] ?? key, value]);
    } else if (typeof value === "boolean") {
      out.push([labels[key] ?? key, value ? "да" : "нет"]);
    }
  }
  return out;
}

const SUSTAINABILITY_LABELS: Record<string, string> = {
  overallScore: "Сводный балл выносливости",
  overallMonths: "Горизонт горлышка, мес.",
  sustainableCategories: "Устойчивых категорий",
  region: "Регион",
};

/**
 * Блок устойчивости: работает и с отчётом выносливости (категории-массив,
 * bottleneck, вердикт), и с исходным профилем запасов (категории-объект,
 * мобилизационная база, комментарий).
 */
function SustainabilityBlock({ data }: { data: unknown }) {
  if (!data || typeof data !== "object") return null;
  const s = data as Record<string, unknown>;
  const verdict =
    typeof s.verdictRu === "string"
      ? s.verdictRu
      : typeof s.commentRu === "string"
        ? s.commentRu
        : null;

  const scalars = topScalars(s, SUSTAINABILITY_LABELS, [
    "iso3",
    "nameRu",
    "nameEn",
    "verdictRu",
    "commentRu",
  ]);

  const categories = s.categories;
  const categoryRows: React.ReactNode[] = [];

  if (Array.isArray(categories)) {
    // Отчёт выносливости: CategoryEnduranceResult[]
    for (const raw of categories as Record<string, unknown>[]) {
      const label =
        typeof raw.labelRu === "string"
          ? raw.labelRu
          : String(raw.category ?? "");
      const score = typeof raw.score === "number" ? raw.score : null;
      const months =
        typeof raw.monthsToExhaustion === "number"
          ? raw.monthsToExhaustion
          : null;
      categoryRows.push(
        <div key={label} className="flex items-center gap-3">
          <span className="w-52 shrink-0 truncate text-sm text-slate-300">
            {label}
          </span>
          <div className="flex-1">
            <RangeBar
              from={0}
              to={score ?? 0}
              barClass={
                (score ?? 0) >= 60
                  ? "bg-emerald-500/60"
                  : (score ?? 0) >= 35
                    ? "bg-amber-500/60"
                    : "bg-red-500/60"
              }
            />
          </div>
          <span className="w-28 shrink-0 text-right font-mono text-xs text-slate-400">
            {score !== null ? `${fmt(score)} баллов` : "—"}
            {months !== null
              ? Number.isFinite(months)
                ? ` · ${fmt(months)} мес.`
                : " · устойчива"
              : ""}
          </span>
        </div>,
      );
    }
  } else if (categories && typeof categories === "object") {
    // Исходный профиль: Record<категория, данные запасов>
    for (const [catId, raw] of Object.entries(
      categories as Record<string, unknown>,
    )) {
      if (!raw || typeof raw !== "object") continue;
      const inner = topScalars(raw as Record<string, unknown>);
      categoryRows.push(
        <div
          key={catId}
          className="rounded border border-slate-800 bg-slate-950/50 p-3"
        >
          <p className="mb-2 text-sm font-medium text-slate-200">{catId}</p>
          <ScalarGrid entries={inner.slice(0, 6)} />
        </div>,
      );
    }
  }

  const bottleneck =
    s.bottleneck && typeof s.bottleneck === "object"
      ? (s.bottleneck as Record<string, unknown>)
      : null;
  const mobBase =
    s.mobilizationBase && typeof s.mobilizationBase === "object"
      ? (s.mobilizationBase as Record<string, unknown>)
      : null;

  return (
    <div className="space-y-4">
      {verdict && <p className="text-slate-300">{verdict}</p>}
      <ScalarGrid entries={scalars} />
      {bottleneck && typeof bottleneck.labelRu === "string" && (
        <p className="text-sm text-slate-300">
          Бутылочное горлышко:{" "}
          <span className="font-medium text-red-300">
            {bottleneck.labelRu}
          </span>
          {typeof bottleneck.monthsToExhaustion === "number" &&
            (Number.isFinite(bottleneck.monthsToExhaustion)
              ? ` — запаса хватит на ${fmt(bottleneck.monthsToExhaustion)} мес. интенсивной войны`
              : " — категория устойчива")}
        </p>
      )}
      {categoryRows.length > 0 && (
        <div className="space-y-2">{categoryRows}</div>
      )}
      {mobBase && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-200">
            Мобилизационная база
          </h3>
          <ScalarGrid entries={topScalars(mobBase)} />
        </div>
      )}
    </div>
  );
}

/** Динамика по снапшотам мониторинга 2023–2025. */
function SeriesBlock({ series }: { series: unknown }) {
  const snapshots: CountrySnapshot[] = Array.isArray(series)
    ? (series as CountrySnapshot[])
    : series && typeof series === "object"
      ? ((series as { snapshots?: CountrySnapshot[] }).snapshots ?? [])
      : [];
  if (snapshots.length === 0) return null;
  const rows = [...snapshots].sort((a, b) => a.year - b.year);
  const maxBp = Math.max(...rows.map((r) => r.bpTotal), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        {rows.map((r) => (
          <div key={r.year} className="flex w-20 flex-col items-center gap-1">
            <span className="font-mono text-xs text-slate-300">
              {fmt(r.bpTotal)}
            </span>
            <div
              className="w-10 rounded-t bg-sky-500/60"
              style={{ height: `${Math.max(6, (r.bpTotal / maxBp) * 72)}px` }}
              title={`БП ${r.year}: ${fmt(r.bpTotal)}`}
            />
            <span className="text-xs text-slate-500">{r.year}</span>
          </div>
        ))}
        <span className="pb-5 text-xs text-slate-500">
          Итоговый БП по годам
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-3 font-medium">Год</th>
              <th className="py-2 pr-3 font-medium">Бюджет, млрд $</th>
              <th className="py-2 pr-3 font-medium">Доля ВВП, %</th>
              <th className="py-2 pr-3 font-medium">Личный состав</th>
              <th className="py-2 pr-3 font-medium">Резерв</th>
              <th className="py-2 font-medium">Выносливость, мес.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.year}
                className="border-b border-slate-800/60 last:border-b-0"
              >
                <td className="py-2 pr-3 font-medium text-slate-100">
                  {r.year}
                </td>
                <td className="py-2 pr-3 font-mono text-slate-300">
                  {fmt(r.budgetBnUsd.value)}
                  {r.budgetBnUsd.estimated ? "*" : ""}
                </td>
                <td className="py-2 pr-3 font-mono text-slate-300">
                  {fmt(r.defenseShareGdpPct.value, 2)}
                  {r.defenseShareGdpPct.estimated ? "*" : ""}
                </td>
                <td className="py-2 pr-3 font-mono text-slate-300">
                  {fmtInt(r.activePersonnel.value)}
                </td>
                <td className="py-2 pr-3 font-mono text-slate-300">
                  {fmtInt(r.reservePersonnel.value)}
                </td>
                <td className="py-2 font-mono text-slate-300">
                  {fmt(r.enduranceMonths.value)}
                  {r.enduranceMonths.estimated ? "*" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        * — оценочное значение, а не опубликованная статистика.
      </p>
      {rows.some((r) => r.noteRu) && (
        <ul className="space-y-1 text-sm text-slate-400">
          {rows
            .filter((r) => r.noteRu)
            .map((r) => (
              <li key={r.year}>
                <span className="text-slate-500">{r.year}:</span> {r.noteRu}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ iso: string }>;
}): Promise<Metadata> {
  const { iso } = await params;
  const detail = getBP3Detail(iso.toUpperCase());
  return {
    title: detail
      ? `${detail.row.name} — БП 3.0 | РБП-Стратег`
      : "Страна не найдена | РБП-Стратег 3.0",
  };
}

export default async function V3CountryPage({
  params,
}: {
  params: Promise<{ iso: string }>;
}) {
  const { iso: rawIso } = await params;
  const iso = rawIso.toUpperCase();
  const detailRaw = getBP3Detail(iso);
  if (!detailRaw) notFound();
  const detail = detailRaw as NonNullable<typeof detailRaw>;
  const { row, tornado } = detail;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/v3"
          className="text-sm text-slate-400 hover:text-sky-300"
        >
          ← Рейтинг БП 3.0
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Flag iso={row.iso} title={row.name} className="h-5 w-7" />
          <h1 className="text-3xl font-bold text-slate-50">{row.name}</h1>
          <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-sm text-slate-300">
            {row.iso}
          </span>
          {!row.hasUP && (
            <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
              нет данных U/P — оценка по 8 компонентам
            </span>
          )}
        </div>
      </div>

      <Section title="Боевой потенциал 3.0">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="font-mono text-5xl font-bold text-slate-50">
              {fmt(row.total)}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              медиана Монте-Карло · Δ к модели 2.0:{" "}
              <span
                className={
                  row.deltaV2 > 0
                    ? "text-emerald-400"
                    : row.deltaV2 < 0
                      ? "text-red-400"
                      : "text-slate-400"
                }
              >
                {row.deltaV2 > 0 ? "+" : ""}
                {fmt(row.deltaV2)}
              </span>
            </div>
          </div>
          <div className="min-w-64 flex-1">
            <RangeBar from={row.p10} to={row.p90} marker={row.total} />
            <div className="mt-1.5 flex justify-between text-xs text-slate-400">
              <span>
                P10: <span className="font-mono">{fmt(row.p10)}</span>
              </span>
              <span>интервал неопределённости 80%</span>
              <span>
                P90: <span className="font-mono">{fmt(row.p90)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-x-8 gap-y-3 md:grid-cols-2">
          {row.components.map((c) => (
            <div key={c.key} className="flex items-center gap-3">
              <span className="w-44 shrink-0 truncate text-sm text-slate-300">
                {c.label}
              </span>
              <div className="flex-1">
                <RangeBar from={0} to={c.score} />
              </div>
              <span className="w-20 shrink-0 text-right font-mono text-sm text-slate-200">
                {fmt(c.score)}
              </span>
              <span className="w-14 shrink-0 text-right text-xs text-slate-500">
                вес {fmt(c.weight * 100, 0)}%
              </span>
            </div>
          ))}
        </div>
      </Section>

      {tornado.length > 0 && (
        <Section title="Чувствительность итога к компонентам (торнадо)">
          <div className="space-y-2.5">
            {tornado.slice(0, 8).map((t) => (
              <div key={t.label} className="flex items-center gap-3">
                <span className="w-44 shrink-0 truncate text-sm text-slate-300">
                  {t.label}
                </span>
                <div className="flex-1">
                  <RangeBar
                    from={t.low}
                    to={t.high}
                    marker={row.total}
                    barClass="bg-violet-500/60"
                  />
                </div>
                <span className="w-32 shrink-0 text-right font-mono text-xs text-slate-400">
                  {fmt(t.low)} – {fmt(t.high)} · ±{fmt(t.swing)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Диапазон итога при отклонении компонента в пределах его
            неопределённости; белая отметка — текущий итог. Чем шире полоса, тем
            сильнее компонент двигает оценку.
          </p>
        </Section>
      )}

      {detail.sustainability != null && (
        <Section title="Устойчивость в войне">
          <SustainabilityBlock data={detail.sustainability} />
        </Section>
      )}

      {detail.series != null && (
        <Section title="Динамика 2023–2025">
          <SeriesBlock series={detail.series} />
        </Section>
      )}

      {detail.briefText && (
        <Section title="Разведсводка">
          <pre className="overflow-x-auto rounded border border-slate-800 bg-slate-950 p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap text-slate-200">
            {detail.briefText}
          </pre>
          <a
            href={`/api/v3/brief?iso=${row.iso}`}
            className="mt-3 inline-block text-sm text-sky-400 hover:text-sky-300"
          >
            Открыть сводку через API (/api/v3/brief?iso={row.iso}) →
          </a>
        </Section>
      )}

      {detail.profile != null && (
        <Section title="Профиль страны">
          <ScalarGrid
            entries={topScalars(
              detail.profile as Record<string, unknown>,
              {},
              ["iso3", "iso", "nameRu", "nameEn", "name"],
            )}
          />
        </Section>
      )}
    </div>
  );
}
