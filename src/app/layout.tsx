import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
// MapLibre CSS is imported in StrategicMap.tsx — loaded only when the map component renders
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
        {/* bottom-12, не bottom-4: атрибуция карты (OSM/CARTO/MapLibre) занимает
            нижние 44px, и кнопка на bottom-4 накрывала её на 18px — лицензионная
            подпись обязана быть видна. Вид — из токенов продукта: матовая панель
            и золотой акцент вместо дефолтного sky + rounded-full + shadow. */}
        <a
          href="/v3"
          className="fixed right-4 bottom-12 z-50 inline-flex min-h-8 items-center rounded-md border border-tactical-accent/40 bg-tactical-panel px-3.5 py-2 text-sm font-semibold text-tactical-accent transition-colors hover:border-tactical-accent/70 hover:bg-tactical-raised"
        >
          РБП 3.0
        </a>
      </body>
    </html>
  );
}
