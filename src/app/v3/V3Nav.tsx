"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: { href: string; label: string }[] = [
  { href: "/", label: "← Карта" },
  { href: "/v3", label: "РБП 3.0" },
  { href: "/v3/systems", label: "Системы" },
  { href: "/v3/intel", label: "Предупреждения I&W" },
  { href: "/v3/warfare", label: "Устойчивость и бой" },
];

/** Навигация v3 с подсветкой активного пункта: без неё текущий раздел
 *  неотличим от соседних (аудит UI 2026-11-12). */
export function V3Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : item.href === "/v3"
              ? pathname === "/v3"
              : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "font-semibold text-sky-300 underline decoration-sky-400/60 decoration-2 underline-offset-4"
                : "text-slate-300 transition-colors hover:text-sky-300"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
