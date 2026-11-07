import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
// mapbox-gl CSS is imported in StrategicMap.tsx — loaded only when the map component renders
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans-face",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono-face",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "РБП Командный Центр",
  description: "Система стратегического мониторинга и тактической симуляции боевого потенциала",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${plexSans.variable} ${plexMono.variable} font-sans antialiased`}
      >
        {children}
        <a
          href="/v3"
          className="fixed right-4 bottom-4 z-50 rounded-full border border-sky-700 bg-slate-900/95 px-3.5 py-2 text-sm font-semibold text-sky-300 shadow-lg shadow-black/40 backdrop-blur transition-colors hover:bg-slate-800 hover:text-sky-200"
        >
          РБП 3.0
        </a>
      </body>
    </html>
  );
}
