import type { Metadata } from "next";
// MapLibre CSS is imported in StrategicMap.tsx — loaded only when the map component renders
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";

// Шрифты лежат в пакете, а не тянутся из Google Fonts во время сборки.
// next/font/google ходил в fonts.googleapis.com на каждом `next build`:
// при недоступности сети сборка падала целиком (и локально, и на Render),
// хотя код был исправен. Тот же IBM Plex, те же начертания и кириллица —
// теперь сборка не зависит от внешнего сервиса.
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";

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
        className="font-sans antialiased"
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
