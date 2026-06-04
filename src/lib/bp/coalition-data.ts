// ─────────────────────────────────────────────────────────────────────────────
// Coalition Member Database
// Complete member lists for all recognized military coalitions
// Based on 2024/2025 real-world alliance memberships
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

export interface CoalitionInfo {
  name: string;
  nameRu: string;
  founded: number;
  type: "military" | "economic" | "strategic" | "intelligence";
  members: string[];
  headquarters?: string;
  article?: string;     // NATO Art.5, CSTO Art.4, etc.
  description: string;
  color: string;
}

// ─── NATO — North Atlantic Treaty Organization ────────────────────────────────
export const NATO: CoalitionInfo = {
  name: "NATO",
  nameRu: "НАТО (Организация Североатлантического договора)",
  founded: 1949,
  type: "military",
  members: [
    "USA", "CAN", "GBR", "FRA", "DEU", "ITA", "BEL", "NLD", "LUX", "DNK", "NOR", "PRT", "ISL",
    "GRC", "TUR", "ESP", "CZE", "HUN", "POL", "BGR", "EST", "LVA", "LTU", "SVN", "SVK", "ROU",
    "ALB", "HRV", "MNE", "MKD", "FIN", "SWE", // 2023/2024 accession
  ],
  headquarters: "Brussels, Belgium",
  article: "Статья 5: Коллективная оборона — атака на одного = атака на всех",
  description: "Военный альянс 32 стран (2024). Крупнейший оборонный союз в истории. Коллективная оборона (Art.5), стандарты interoperability, общие системы ПВО и РЭБ.",
  color: "#3b82f6",
};

// ─── CSTO — Collective Security Treaty Organization ───────────────────────────
export const CSTO: CoalitionInfo = {
  name: "CSTO",
  nameRu: "ОДКБ (Организация Договора о коллективной безопасности)",
  founded: 2002,
  type: "military",
  members: ["RUS", "BLR", "ARM", "KAZ", "KGZ", "TJK"],
  headquarters: "Moscow, Russia",
  article: "Статья 4: Коллективная оборона — атака на одного = атака на всех",
  description: "Военный союз 6 стран под эгидой России. Коллективная оборона, совместные учения, поставки оружия. Ослаблен после выхода Узбекистана (2012) и отказа Казахстана от СВО.",
  color: "#ef4444",
};

// ─── BRICS ──────────────────────────────────────────────────────────────────────
export const BRICS: CoalitionInfo = {
  name: "BRICS",
  nameRu: "БРИКС (Бразилия, Россия, Индия, Китай, ЮАР + новые члены)",
  founded: 2006,
  type: "economic",
  members: ["CHN", "RUS", "IND", "BRA", "ZAF", "SAU", "EGY", "ETH", "IRN", "ARE"],
  headquarters: "Rotating",
  description: "Экономический блок 10 стран (2024). 45% мирового населения, 28% ВВП. Не военный союз, но стратегическое партнёрство. Новые члены с 2024: Саудовская Аравия, Египет, Эфиопия, Иран, ОАЭ.",
  color: "#f59e0b",
};

// ─── AUKUS ──────────────────────────────────────────────────────────────────────
export const AUKUS: CoalitionInfo = {
  name: "AUKUS",
  nameRu: "AUKUS (Австралия, Великобритания, США)",
  founded: 2021,
  type: "military",
  members: ["USA", "GBR", "AUS"],
  description: "Трёхсторонний оборонный пакт. Pillar 1: Атомные подлодки для Австралии (SSN-AUKUS). Pillar 2: Передовые технологии — гипервук, ИИ, РЭБ, кибер, квантовые.",
  color: "#06b6d4",
};

// ─── QUAD ──────────────────────────────────────────────────────────────────────
export const QUAD: CoalitionInfo = {
  name: "QUAD",
  nameRu: "КВАД (США, Япония, Австралия, Индия)",
  founded: 2007,
  type: "strategic",
  members: ["USA", "JPN", "AUS", "IND"],
  description: "Стратегический диалог Индо-Тихоокеанского региона. Не формальный альянс, но координация по Китаю, свободной навигации, и технологическому сотрудничеству.",
  color: "#8b5cf6",
};

// ─── Shanghai Cooperation Organisation ─────────────────────────────────────────
export const SCO: CoalitionInfo = {
  name: "SCO",
  nameRu: "ШОС (Шанхайская организация сотрудничества)",
  founded: 2001,
  type: "strategic",
  members: ["CHN", "RUS", "IND", "PAK", "KAZ", "KGZ", "TJK", "UZB", "IRN", "BLR"],
  headquarters: "Beijing, China",
  description: "Политико-экономический блок 10 стран. Контртеррор, разведка, экономика. Не военный альянс, но платформа координации Евразии.",
  color: "#dc2626",
};

// ─── Five Eyes ────────────────────────────────────────────────────────────────
export const FIVE_EYES: CoalitionInfo = {
  name: "Five Eyes",
  nameRu: "Пять глаз (разведывательный альянс)",
  founded: 1941,
  type: "intelligence",
  members: ["USA", "GBR", "CAN", "AUS", "NZL"],
  description: "Крупнейший разведывательный альянс. Сигнальная разведка (SIGINT), кибер, контртеррор. UKUSA Agreement 1946 — базовый договор. Расширен: 9 Eyes, 14 Eyes.",
  color: "#10b981",
};

// ─── All coalitions ────────────────────────────────────────────────────────────
export const ALL_COALITIONS: CoalitionInfo[] = [
  NATO,
  CSTO,
  BRICS,
  AUKUS,
  QUAD,
  SCO,
  FIVE_EYES,
];

// ─── Lookup functions ─────────────────────────────────────────────────────────
export function getCoalitionByName(name: string): CoalitionInfo | undefined {
  return ALL_COALITIONS.find((c) => c.name === name);
}

export function getCoalitionsForCountry(isoCode: string): CoalitionInfo[] {
  return ALL_COALITIONS.filter((c) => c.members.includes(isoCode));
}

export function isCountryInCoalition(isoCode: string, coalitionName: string): boolean {
  const coalition = getCoalitionByName(coalitionName);
  return coalition?.members.includes(isoCode) ?? false;
}

export function getCoalitionMemberCount(coalitionName: string): number {
  return getCoalitionByName(coalitionName)?.members.length ?? 0;
}
