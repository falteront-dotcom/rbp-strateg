import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "РБП-Стратег 3.0",
  description:
    "Модель боевого потенциала 3.0: рейтинг с интервалами неопределённости, предупреждения I&W, устойчивость в войне, системы вооружений",
};

const NAV: { href: string; label: string }[] = [
  { href: "/", label: "← Карта" },
  { href: "/v3", label: "РБП 3.0" },
  { href: "/v3/systems", label: "Системы" },
  { href: "/v3/intel", label: "Предупреждения I&W" },
  { href: "/v3/warfare", label: "Устойчивость и бой" },
];

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
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-slate-300 transition-colors hover:text-sky-300"
              >
                {item.label}
              </Link>
            ))}
          </nav>
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
