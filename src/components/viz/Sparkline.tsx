"use client";

/**
 * Sparkline — компактный инлайн-график тренда для числовых рядов
 * (идея density #4 из design-review: мини-график вместо крупного чарта).
 *
 * Технический стиль: сплошная линия currentColor, без заливок и анимаций,
 * фиксированный ритм 2px. Числа не рисуются — только форма тренда.
 */

export interface SparklineProps {
  /** Значения ряда (≥2 точки). */
  values: number[];
  /** Ширина SVG. */
  width?: number;
  /** Высота SVG. */
  height?: number;
  /** Толщина линии. */
  strokeWidth?: number;
  /** Подпись для screen-reader (описание тренда). */
  label?: string;
}

export function Sparkline({
  values,
  width = 120,
  height = 22,
  strokeWidth = 1.5,
  label,
}: SparklineProps) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const innerW = width - 2;
  const innerH = height - 4;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * innerW + 1;
      const y = height - 2 - ((v - min) / span) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      className="shrink-0 text-tactical-primary"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}
