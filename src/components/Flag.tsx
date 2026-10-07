"use client";

/**
 * Flag — SVG-флаг государства (пакет flag-icons, локальные ассеты).
 *
 * На Windows флаги-эмодзи не отображаются (рендерятся как «US»), поэтому
 * идентичность страны показывается настоящим флагом. Пустой ISO даёт
 * нейтральную плашку — без декоративных подмен.
 */

import { isoToAlpha2 } from "@/lib/country-flags";

export function Flag({
  iso,
  title,
  className = "",
}: {
  /** ISO3-код государства. */
  iso: string;
  /** Всплывающая подпись; по умолчанию — ISO-код. */
  title?: string;
  /** Дополнительные классы (ширина/скругление). */
  className?: string;
}) {
  const cc = isoToAlpha2(iso);
  if (!cc) {
    return (
      <span
        title={title ?? iso}
        aria-label={title ?? iso}
        className={`inline-block h-3 w-4 shrink-0 rounded-[2px] border border-white/10 bg-white/10 ${className}`}
      />
    );
  }
  return (
    <span
      title={title ?? iso}
      aria-label={title ?? iso}
      role="img"
      className={`fi fi-${cc} inline-block h-3 w-4 shrink-0 rounded-[2px] border border-white/10 bg-cover bg-center ${className}`}
    />
  );
}
