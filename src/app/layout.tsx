import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
// MapLibre CSS is imported in StrategicMap.tsx — loaded only when the map component renders
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
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
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
