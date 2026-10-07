"use client";

/** Available analytics overlay layers */
export type AnalyticsLayerKey =
  | "bp"
  | "budget"
  | "fleet"
  | "aviation"
  | "tanks"
  | "nukes";

/** Layer metadata for the selector */
interface LayerOption {
  key: AnalyticsLayerKey;
  label: string;
  shortLabel: string;
  icon: string;
}

const LAYER_OPTIONS: LayerOption[] = [
  { key: "bp",       label: "Боевой потенциал", shortLabel: "БП",     icon: "◎" },
  { key: "budget",   label: "Оборонный бюджет", shortLabel: "БЮДЖ",   icon: "$" },
  { key: "fleet",    label: "Военно-морской флот", shortLabel: "ФЛОТ", icon: "⚓" },
  { key: "aviation", label: "Военная авиация", shortLabel: "АВИА",    icon: "✈" },
  { key: "tanks",    label: "Бронетехника", shortLabel: "ТАНКИ",      icon: "▣" },
  { key: "nukes",    label: "Ядерный арсенал", shortLabel: "ЯДЕР",     icon: "☢" },
];

interface LayerSelectorProps {
  /** Currently active analytics layer */
  activeLayer: AnalyticsLayerKey;
  /** Callback when a layer is selected */
  onLayerChange: (layer: AnalyticsLayerKey) => void;
  /** Optional class name */
  className?: string;
}

export function LayerSelector({
  activeLayer,
  onLayerChange,
  className,
}: LayerSelectorProps) {
  return (
    <div className={`w-full sm:w-auto ${className ?? ""}`}>
      <div className="mb-1 hidden px-1 font-mono text-[10px] text-tactical-primary/60 sm:block">
        Слой аналитики
      </div>

      <div className="grid grid-cols-6 gap-1 sm:flex sm:flex-row">
        {LAYER_OPTIONS.map((opt) => {
          const isActive = activeLayer === opt.key;

          return (
            <button
              key={opt.key}
              type="button"
              aria-label={opt.label}
              aria-pressed={isActive}
              onClick={() => onLayerChange(opt.key)}
              className={`
                relative min-w-0 border px-1 py-1.5 font-mono text-[10px]
                cursor-pointer select-none sm:px-2.5
                ${
                  isActive
                    ? "border-tactical-primary/60 text-tactical-primary bg-tactical-primary/10 layer-btn-glow-active"
                    : "border-white/8 text-white/35 bg-transparent hover:border-tactical-primary/25 hover:text-white/60 hover:bg-tactical-primary/5"
                }
              `}
              title={opt.label}
            >
              <span className="flex items-center justify-center gap-1">
                <span aria-hidden="true" className="text-[11px]">{opt.icon}</span>
                <span className="hidden sm:inline">{opt.shortLabel}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LayerSelector;
