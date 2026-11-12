import type { Metadata } from "next";
import Link from "next/link";
import { V3Nav } from "./V3Nav";

export const metadata: Metadata = {
  title: "РБП-Стратег 3.0",
  description:
    "Модель боевого потенциала 3.0: рейтинг с интервалами неопределённости, предупреждения I&W, устойчивость в войне, системы вооружений",
};

export default function V3Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link
            href="/v3"
            className="text-base font-bold tracking-wide text-slate-50"
          >
            РБП-Стратег <span className="text-sky-400">3.0</span>
          </Link>
          <V3Nav />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <footer className="border-t border-slate-800 py-4">
        <div className="mx-auto max-w-7xl px-4 text-xs text-slate-500">
          Открытые источники, данные 2024–2025 гг. Оценочные значения помечены;
          запасы боеприпасов не публикует ни одна страна — соответствующие поля
          являются аналитическими оценками.
        </div>
      </footer>
    </div>
  );
}
