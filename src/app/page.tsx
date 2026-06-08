"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Radio,
  Map as MapIcon,
  Crosshair,
  Search,
  X,
  ChevronRight,
  Users,
  GitCompareArrows,
} from "lucide-react";

import TacticalHUD from "@/components/TacticalHUD";
import dynamic from "next/dynamic";

const StrategicMap = dynamic(
  () => import("@/components/map/StrategicMap").then((m) => m.StrategicMap),
  { ssr: false }
);
import type { CountryBPData } from "@/components/map/ChoroplethLayer";
import type { AnalyticsLayerKey, CountryMapData } from "@/components/map";
import { LayerSelector } from "@/components/map/LayerSelector";
import CountryCard from "@/components/CountryCard";
import { CoalitionBuilder } from "@/components/CoalitionBuilder";
import CountryComparison from "@/components/CountryComparison";
import type { CountryCompareData } from "@/lib/comparison";
import { pickScoreFields } from "@/lib/country-detail-mapper";
import {
  BPDetailTab,
  EconomicsTab,
  MilitaryHardwareTab,
  CoalitionTab,
  ComparisonTab,
  AnalyticsTab,
  WhatIfTab,
  DoctrineTab,
  GeographyTab,
} from "@/components/strategic";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AppMode = "strategic" | "tactical";
type StrategicTab = "summary" | "bp" | "economics" | "military" | "coalition" | "comparison" | "analytics" | "whatif" | "doctrine" | "geography";

const STRATEGIC_TABS: { key: StrategicTab; label: string; icon: string }[] = [
  { key: "summary", label: "Сводка", icon: "◉" },
  { key: "bp", label: "БП Модель", icon: "◈" },
  { key: "economics", label: "Экономика", icon: "$" },
  { key: "military", label: "Вооружение", icon: "⚔" },
  { key: "coalition", label: "Коалиции", icon: "⊞" },
  { key: "comparison", label: "Сравнение", icon: "⟺" },
  { key: "analytics", label: "Аналитика", icon: "◈" },
  { key: "whatif", label: "Что-Если", icon: "?" },
  { key: "doctrine", label: "Доктрина", icon: "☆" },
  { key: "geography", label: "География", icon: "◙" },
];

function StrategicDetailPanel({
  country,
  allCountries,
  onClose,
  onCompare,
}: {
  country: CountryData;
  allCountries: CountryCompareData[];
  onClose: () => void;
  onCompare: (iso: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<StrategicTab>("summary");
  const compareData = country as unknown as CountryCompareData;

  return (
    <div className="flex flex-col h-full">
      {/* Header with close + name */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
            <X size={14} />
          </button>
          <span className="text-xs font-bold text-tactical-primary truncate">{country.nameRu || country.name}</span>
          <span className="text-[9px] text-slate-500 flex-shrink-0">{country.isoCode}</span>
        </div>
        <button onClick={() => onCompare(country.isoCode)} className="text-[9px] text-slate-400 hover:text-tactical-primary border border-white/10 rounded px-1.5 py-0.5 transition-colors flex-shrink-0">
          Сравнить
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-white/5 custom-scrollbar px-1">
        {STRATEGIC_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2 py-1.5 text-[9px] font-mono whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-tactical-primary text-tactical-primary"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {activeTab === "summary" && (
          <CountryCard country={country as any} onClose={() => {}} onCompare={(iso: string) => onCompare(iso)} />
        )}
        {activeTab === "bp" && (
          <BPDetailTab country={compareData as any} />
        )}
        {activeTab === "economics" && (
          <EconomicsTab country={compareData as any} />
        )}
        {activeTab === "military" && (
          <MilitaryHardwareTab country={compareData as any} />
        )}
        {activeTab === "coalition" && (
          <CoalitionTab country={compareData as any} allCountries={allCountries as any} />
        )}
        {activeTab === "comparison" && (
          <ComparisonTab
            countries={[compareData]}
            onRemoveCountry={(_iso: string) => {}}
            onAddCountry={(_iso: string) => {}}
          />
        )}
        {activeTab === "analytics" && (
          <AnalyticsTab countries={allCountries} selectedISO={country.isoCode} />
        )}
        {activeTab === "whatif" && (
          <WhatIfTab isOpen={true} onClose={() => {}} allCountries={allCountries} initialIsoCode={country.isoCode} />
        )}
        {activeTab === "doctrine" && (
          <DoctrineTab country={compareData as any} />
        )}
        {activeTab === "geography" && (
          <GeographyTab country={compareData as any} allCountries={allCountries} />
        )}
      </div>
    </div>
  );
}

/** Shape of the /api/countries response */
interface CountryData {
  isoCode: string;
  name: string;
  nameRu: string;
  side: string;
  coalition: string | null;
  region: string;

  areaKm2: number;
  coastlineKm: number;

  gdpPppBn: number;
  militaryBudgetBn: number;
  defensePctGdp: number;

  populationM: number;
  activePersonnel: number;
  reservePersonnel: number;

  totalTanks: number;
  totalAfv: number;
  totalArtillery: number;
  totalMlrs?: number;
  totalAircraft: number;
  totalHelicopters: number;
  totalNavy: number;
  aircraftCarriers?: number;
  submarines: number;
  nuclearWarheads: number;

  ports: number;
  airfields: number;
  oilProductionKbd: number;
  merchantFleet: number;

  fitForServiceM?: number;
  techLevel: number;
  moraleIndex: number;
  combatExperience: number;
  c2Capability: number;
  ewCapability: number;

  bpTotal: number;
  bpWeapon: number;
  bpManpower: number;
  bpLogistics: number;
  bpC2: number;
  bpEconomy: number;
  bpDoctrine: number;
  bpReadiness: number;
  bpTerrain: number;
  bpAdvanced?: number;
  bpAdvancedConfidence?: number;
  bpAdvancedSummary?: string;
  bpAdvancedDomains?: Array<{ key: string; name: string; score: number; weight: number; confidence: number }>;
  bpAdvancedModifiers?: Array<{ key: string; label: string; kind: string; value: number; explanation: string }>;
  bpAdvancedRisks?: Array<{ key: string; label: string; severity: string; explanation: string }>;
  bpAdvancedStrengths?: string[];
  bpAdvancedWeaknesses?: string[];
  bpRank: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Side badge color map
// ─────────────────────────────────────────────────────────────────────────────

const SIDE_COLORS: Record<string, string> = {
  NATO: "text-tactical-nato",
  RUS: "text-tactical-rus",
  CHINA: "text-tactical-china",
  NEUTRAL: "text-slate-400",
};

const ISO3_TO_ISO2: Record<string, string> = {
  USA: "US", RUS: "RU", CHN: "CN", IND: "IN", GBR: "GB", FRA: "FR", JPN: "JP", KOR: "KR",
  ITA: "IT", DEU: "DE", TUR: "TR", BRA: "BR", PAK: "PK", EGY: "EG", ISR: "IL", IDN: "ID",
  AUS: "AU", CAN: "CA", UKR: "UA", SAU: "SA", IRN: "IR", PRK: "KP", POL: "PL", ESP: "ES",
  NLD: "NL", THA: "TH", VNM: "VN", TWN: "TW", SGP: "SG", MYS: "MY", PHI: "PH", NZL: "NZ",
  NOR: "NO", SWE: "SE", FIN: "FI", GRC: "GR", CHE: "CH", AUT: "AT", BEL: "BE", CZE: "CZ",
  PRT: "PT", ROU: "RO", HUN: "HU", BGR: "BG", SRB: "RS", HRV: "HR", SVK: "SK", SVN: "SI",
  LTU: "LT", LVA: "LV", EST: "EE", BLR: "BY", ARM: "AM", KAZ: "KZ", KGZ: "KG", TJK: "TJ",
  ZAF: "ZA", ETH: "ET", ARE: "AE",
};

function isoToFlag(iso3: string): string {
  const iso2 = ISO3_TO_ISO2[iso3.toUpperCase()];
  if (!iso2) return "🏳️";
  const base = 0x1f1e6;
  return String.fromCodePoint(...iso2.split("").map((ch) => base + ch.charCodeAt(0) - 65));
}

const SIDE_DOT_COLORS: Record<string, string> = {
  NATO: "bg-tactical-nato",
  RUS: "bg-tactical-rus",
  CHINA: "bg-tactical-china",
  UKR: "bg-tactical-ukr",
  NEUTRAL: "bg-slate-400",
};

const SIDE_BAR_COLORS: Record<string, string> = {
  NATO: "side-bar-nato",
  RUS: "side-bar-rus",
  CHINA: "side-bar-china",
  UKR: "side-bar-ukr",
  NEUTRAL: "side-bar-neutral",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  // ─── State ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<AppMode>("strategic");
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [selectedISO, setSelectedISO] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [clock, setClock] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── New integration state ─────────────────────────────────────────────
  const [coalitionBuilderOpen, setCoalitionBuilderOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [compareInitialIsos, setCompareInitialIsos] = useState<string[]>([]);
  const [activeLayer, setActiveLayer] = useState<AnalyticsLayerKey>("bp");

  // ─── Clock tick — mount-only to avoid hydration mismatch ───────────────
  useEffect(() => {
    setClock(new Date()); // set on mount (client-only)
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Fetch countries from API ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchData(): Promise<void> {
      try {
        const res = await fetch("/api/countries");
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data: CountryData[] = await res.json();
        if (!cancelled) {
          setCountries(data);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        console.error("[page] Failed to fetch countries:", err);
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Adapt CountryData[] → CountryBPData[] for StrategicMap ────────────
  const mapBPData = useMemo<CountryBPData[]>(
    () =>
      countries.map((c) => ({
        iso: c.isoCode,
        name: c.nameRu,
        bpScore: c.bpTotal,
        bpRank: c.bpRank,
        region: c.region,
        alliance: c.coalition,
      })),
    [countries],
  );

  // ─── Adapt CountryData[] → CountryMapData[] for analytics layers ──────
  const countriesMapData = useMemo<CountryMapData[]>(
    () =>
      countries.map((c) => ({
        isoCode: c.isoCode,
        name: c.name,
        nameRu: c.nameRu,
        side: c.side,
        coalition: c.coalition,
        region: c.region,
        areaKm2: c.areaKm2,
        coastlineKm: c.coastlineKm,
        gdpPppBn: c.gdpPppBn,
        militaryBudgetBn: c.militaryBudgetBn,
        defensePctGdp: c.defensePctGdp,
        populationM: c.populationM,
        activePersonnel: c.activePersonnel,
        reservePersonnel: c.reservePersonnel,
        fitForServiceM: c.fitForServiceM ?? 0,
        totalTanks: c.totalTanks,
        totalAfv: c.totalAfv,
        totalArtillery: c.totalArtillery,
        totalMlrs: c.totalMlrs ?? 0,
        totalAircraft: c.totalAircraft,
        totalHelicopters: c.totalHelicopters,
        totalNavy: c.totalNavy,
        submarines: c.submarines,
        aircraftCarriers: c.aircraftCarriers ?? 0,
        nuclearWarheads: c.nuclearWarheads,
        ports: c.ports,
        airfields: c.airfields,
        oilProductionKbd: c.oilProductionKbd,
        merchantFleet: c.merchantFleet,
        techLevel: c.techLevel,
        moraleIndex: c.moraleIndex,
        combatExperience: c.combatExperience,
        c2Capability: c.c2Capability,
        ewCapability: c.ewCapability,
        bpTotal: c.bpTotal,
        bpWeapon: c.bpWeapon,
        bpManpower: c.bpManpower,
        bpLogistics: c.bpLogistics,
        bpC2: c.bpC2,
        bpEconomy: c.bpEconomy,
        bpDoctrine: c.bpDoctrine,
        bpReadiness: c.bpReadiness,
        bpTerrain: c.bpTerrain,
        bpAdvanced: c.bpAdvanced ?? c.bpTotal,
      })),
    [countries],
  );

  // ─── Adapt CountryData[] → CountryCompareData[] for CountryComparison ─
  const countriesCompareData = useMemo<CountryCompareData[]>(
    () =>
      countries.map((c) => ({
        isoCode: c.isoCode,
        name: c.name,
        nameRu: c.nameRu,
        side: c.side,
        coalition: c.coalition,
        areaKm2: c.areaKm2,
        coastlineKm: c.coastlineKm,
        gdpPppBn: c.gdpPppBn,
        militaryBudgetBn: c.militaryBudgetBn,
        defensePctGdp: c.defensePctGdp,
        populationM: c.populationM,
        activePersonnel: c.activePersonnel,
        reservePersonnel: c.reservePersonnel,
        totalTanks: c.totalTanks,
        totalAfv: c.totalAfv,
        totalArtillery: c.totalArtillery,
        totalMlrs: c.totalMlrs ?? 0,
        totalAircraft: c.totalAircraft,
        totalHelicopters: c.totalHelicopters,
        totalNavy: c.totalNavy,
        aircraftCarriers: c.aircraftCarriers ?? 0,
        submarines: c.submarines,
        nuclearWarheads: c.nuclearWarheads,
        ports: c.ports,
        airfields: c.airfields,
        oilProductionKbd: c.oilProductionKbd,
        merchantFleet: c.merchantFleet,
        fitForServiceM: c.fitForServiceM ?? Math.round(c.populationM * 0.3),
        techLevel: c.techLevel,
        moraleIndex: c.moraleIndex,
        combatExperience: c.combatExperience,
        c2Capability: c.c2Capability,
        ewCapability: c.ewCapability,
        bpTotal: c.bpTotal,
        bpWeapon: c.bpWeapon,
        bpManpower: c.bpManpower,
        bpLogistics: c.bpLogistics,
        bpC2: c.bpC2,
        bpEconomy: c.bpEconomy,
        bpDoctrine: c.bpDoctrine,
        bpReadiness: c.bpReadiness,
        bpTerrain: c.bpTerrain,
      })),
    [countries],
  );

  // ─── Selected country ──────────────────────────────────────────────────
  const selectedCountry = useMemo<CountryData | null>(() => {
    const raw = countries.find((c) => c.isoCode === selectedISO);
    if (!raw) return null;
    return { ...raw, ...pickScoreFields(raw as unknown as Record<string, unknown>) } as CountryData;
  }, [countries, selectedISO]);

  // ─── Filtered country list for sidebar ─────────────────────────────────
  const filteredCountries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.nameRu.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.isoCode.toLowerCase().includes(q),
    );
  }, [countries, searchQuery]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleCountryClick = useCallback((iso: string) => {
    setSelectedISO(iso);
  }, []);

  const handleModeToggle = useCallback(() => {
    setMode((prev) => (prev === "strategic" ? "tactical" : "strategic"));
  }, []);

  const handleCloseCountryCard = useCallback(() => {
    setSelectedISO(null);
  }, []);

  const handleCompare = useCallback((iso: string) => {
    setCompareInitialIsos([iso]);
    setComparisonOpen(true);
  }, []);

  const handleCloseComparison = useCallback(() => {
    setComparisonOpen(false);
  }, []);

  const handleOpenCoalitionBuilder = useCallback(() => {
    setCoalitionBuilderOpen(true);
  }, []);

  const handleCloseCoalitionBuilder = useCallback(() => {
    setCoalitionBuilderOpen(false);
  }, []);

  const handleLayerChange = useCallback((layer: AnalyticsLayerKey) => {
    setActiveLayer(layer);
  }, []);

  // ─── Tactical Mode ─────────────────────────────────────────────────────
  if (mode === "tactical") {
    return (
      <main className="min-h-screen bg-tactical-bg">
        {/* Mode toggle overlay for tactical */}
        <div className="absolute top-4 left-4 z-[60]">
          <button
            onClick={handleModeToggle}
            className="glass-panel rounded-md px-4 py-2 font-mono text-[10px] tracking-widest uppercase text-tactical-primary hover:text-white hover:bg-tactical-primary/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <MapIcon size={14} />
            Стратегический Режим
          </button>
        </div>
        <TacticalHUD />
      </main>
    );
  }

  // ─── Strategic Mode (DEFAULT) ───────────────────────────────────────────
  return (
    <main className="h-screen w-screen bg-tactical-bg flex flex-col overflow-hidden font-sans text-slate-100">
      {/* ═══ TOP BAR ═══ */}
      <header className="h-14 glass-panel z-50 flex items-center justify-between px-6 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-tactical-primary/10 rounded-sm">
              <Radio className="w-3.5 h-3.5 text-tactical-primary animate-flicker" />
            </div>
            <span className="font-black tracking-[0.2em] text-sm uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-tactical-primary via-tactical-secondary to-tactical-accent">
              РБП Центр
            </span>
          </div>
          <div className="h-5 w-px bg-white/10" />
          <span className="text-[9px] font-mono text-tactical-primary/60 tracking-widest uppercase">
            Стратегический Режим
          </span>
          <div className="live-badge">
            <span className="live-dot" />
            <span className="text-[8px] font-black tracking-[0.2em] text-red-400/90 uppercase">LIVE</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* ─── Layer Selector ─── */}
          <LayerSelector
            activeLayer={activeLayer}
            onLayerChange={handleLayerChange}
          />

          <div className="h-6 w-px bg-white/10" />

          {/* Mode Toggle */}
          <button
            onClick={handleModeToggle}
            className="glass-panel rounded-md px-3 py-1.5 font-mono text-[9px] tracking-widest uppercase text-tactical-accent/80 hover:text-tactical-accent hover:border-tactical-accent/30 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Crosshair size={12} />
            Тактический
          </button>

          <div className="h-6 w-px bg-white/10" />

          {/* Clock */}
          <div className="text-right font-mono">
            <div className="text-[9px] text-slate-500">
              {clock ? clock.toLocaleDateString("ru-RU") : "\u2014"}
            </div>
            <div className="text-sm font-black text-white tabular-nums tracking-tight">
              {clock ? clock.toLocaleTimeString("ru-RU", { hour12: false }) : "--:--:--"}
            </div>
          </div>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex min-h-0">
        {/* ─── LEFT SIDEBAR: Country List ─── */}
        <nav className="w-72 glass-panel border-r border-white/5 flex flex-col shrink-0 z-30">
          {/* Search */}
          <div className="p-3 border-b border-white/5">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tactical-secondary/40"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск страны..."
                className="w-full bg-slate-950/80 border border-white/10 text-[11px] p-2 pl-8 rounded-md outline-none focus:border-tactical-primary/50 transition-all text-slate-200 placeholder:text-slate-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-tactical-primary cursor-pointer"
                >
                  <X size={10} />
                </button>
              )}
            </div>
            <div className="mt-2 flex justify-between text-[8px] text-tactical-secondary/40 tracking-widest uppercase">
              <span>Стран: {filteredCountries.length}</span>
              <span>Рейтинг БП</span>
            </div>
          </div>

          {/* Country List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-[10px] font-mono text-tactical-primary/50 tracking-widest uppercase animate-pulse">
                  Загрузка данных...
                </span>
              </div>
            ) : (
              <div className="py-1">
                {filteredCountries.map((country) => {
                  const isSelected = country.isoCode === selectedISO;
                  return (
                    <button
                      key={country.isoCode}
                      onClick={() => handleCountryClick(country.isoCode)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all cursor-pointer
                        border-l-2 hover:bg-white/5
                        ${
                          isSelected
                            ? "bg-tactical-primary/10 border-tactical-primary"
                            : SIDE_BAR_COLORS[country.side] ?? "side-bar-neutral"
                        }
                      `}
                    >
                      {/* BP Rank */}
                      <span className="text-[9px] font-bold tabular-nums text-tactical-secondary/40 w-5 shrink-0">
                        {country.bpRank}
                      </span>

                      {/* Side dot */}
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          SIDE_DOT_COLORS[country.side] ?? SIDE_DOT_COLORS.NEUTRAL
                        }`}
                      />

                      {/* Country flag */}
                      <span className="text-base leading-none shrink-0" title={country.nameRu}>
                        {isoToFlag(country.isoCode)}
                      </span>

                      {/* Country name */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-slate-200 truncate">
                          {country.nameRu}
                        </div>
                        <div className="text-[8px] text-tactical-secondary/40 tracking-wider">
                          {country.isoCode} · {country.region}
                        </div>
                      </div>

                      {/* BP score */}
                      <div className="text-right shrink-0">
                        <span
                          className={`text-[11px] font-bold tabular-nums ${
                            SIDE_COLORS[country.side] ?? SIDE_COLORS.NEUTRAL
                          }`}
                        >
                          {country.bpTotal.toFixed(1)}
                        </span>
                      </div>

                      {/* Chevron if selected */}
                      {isSelected && (
                        <ChevronRight
                          size={10}
                          className="text-tactical-primary shrink-0"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar Footer: Coalition summary + action buttons */}
          <div className="p-3 border-t border-white/5 space-y-2">
            {/* Coalition summary grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {(["NATO", "RUS", "CHINA"] as const).map((side) => {
                const sideCountries = countries.filter(
                  (c) => c.side === side,
                );
                const avgBP =
                  sideCountries.length > 0
                    ? sideCountries.reduce((s, c) => s + c.bpTotal, 0) /
                      sideCountries.length
                    : 0;
                return (
                  <div
                    key={side}
                    className="flex flex-col items-center bg-white/5 rounded p-1.5 border border-white/5"
                  >
                    <span
                      className={`text-[9px] font-bold ${SIDE_COLORS[side]}`}
                    >
                      {side}
                    </span>
                    <span className="text-[10px] font-bold tabular-nums text-white/70">
                      {avgBP.toFixed(0)}
                    </span>
                    <span className="text-[7px] text-tactical-secondary/30">
                      {sideCountries.length} стран
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Action buttons row */}
            <div className="flex gap-1.5">
              <button
                onClick={handleOpenCoalitionBuilder}
                className="flex-1 py-2 bg-tactical-accent/5 hover:bg-tactical-accent/15 border border-tactical-accent/20 hover:border-tactical-accent/40 text-tactical-accent/70 hover:text-tactical-accent font-bold tracking-widest text-[9px] rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase"
              >
                <Users size={11} />
                Коалиции
              </button>
              <button
                onClick={() => {
                  if (selectedISO) {
                    setCompareInitialIsos([selectedISO]);
                  }
                  setComparisonOpen(true);
                }}
                className={`flex-1 py-2 border font-bold tracking-widest text-[9px] rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase ${
                  selectedISO
                    ? "bg-tactical-primary/5 hover:bg-tactical-primary/15 border-tactical-primary/20 hover:border-tactical-primary/40 text-tactical-primary/70 hover:text-tactical-primary"
                    : "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
                }`}
              >
                <GitCompareArrows size={11} />
                Сравнить{selectedISO ? "" : "*"}
              </button>
            </div>
          </div>
        </nav>

        {/* ─── CENTER: Strategic Map ─── */}
        <div className="flex-1 relative min-w-0">
          {/* Scanline overlay (CSS only) */}
          <div className="map-scanline-overlay" />

          <StrategicMap
            countryBPData={mapBPData}
            selectedISO={selectedISO}
            onCountryClick={handleCountryClick}
            activeLayer={activeLayer}
            countriesRaw={countriesMapData}
            className="absolute inset-0"
          />

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none bg-tactical-bg/80">
              <div className="glass-panel rounded-md px-6 py-3 font-mono text-xs text-tactical-primary tracking-widest uppercase">
                <span className="animate-pulse">Загрузка геоданных...</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT SIDEBAR: Country Detail Panel with Tabs ─── */}
        <aside className="w-96 glass-panel border-l border-white/5 shrink-0 z-30 overflow-y-auto custom-scrollbar country-panel-enter">
          {selectedCountry ? (
            <StrategicDetailPanel
              country={selectedCountry}
              allCountries={countriesCompareData}
              onClose={handleCloseCountryCard}
              onCompare={handleCompare}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="p-4 rounded-full bg-tactical-primary/5 border border-tactical-primary/10 mb-4">
                <MapIcon size={28} className="text-tactical-primary/30" />
              </div>
              <h3 className="text-[11px] font-bold text-tactical-secondary/50 tracking-widest uppercase">
                Выберите Страну
              </h3>
              <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
                Нажмите на страну на карте или выберите из списка слева для
                отображения детальной аналитики боевого потенциала
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Coalition Builder Modal */}
      <CoalitionBuilder
        isOpen={coalitionBuilderOpen}
        onClose={handleCloseCoalitionBuilder}
        countries={countries}
      />

      {/* Country Comparison Modal */}
      <CountryComparison
        isOpen={comparisonOpen}
        onClose={handleCloseComparison}
        allCountries={countriesCompareData}
        initialIsoCodes={compareInitialIsos}
      />
    </main>
  );
}
