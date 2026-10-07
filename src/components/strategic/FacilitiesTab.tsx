"use client";

import { useMemo } from "react";
import { Radar, Flame, ArrowUpRight, MapPin } from "lucide-react";
import { STRATEGIC_FACILITIES } from "@/lib/facilities/strategic-facilities.generated";
import { CONFLICT_ZONES } from "@/lib/facilities/conflict-zones.generated";
import {
  CONFLICT_TYPE_LABELS_RU,
  FACILITY_TYPE_LABELS_RU,
  type StrategicFacility,
} from "@/lib/facilities/types";

/**
 * "Объекты" tab of the country detail panel: strategic facilities hosted by
 * the country, facilities it operates abroad, and live conflict zones where
 * the country is a party. Data is the static generated layer (no API calls).
 */
export function FacilitiesTab({ isoCode, onLocate }: { isoCode: string; onLocate?: (lat: number, lng: number) => void }) {
  const aliases = useMemo(() => {
    const code = isoCode.trim().toUpperCase();
    return code === "PHI" ? ["PHI", "PHL"] : code === "PHL" ? ["PHL", "PHI"] : [code];
  }, [isoCode]);

  const hosted = useMemo(
    () => STRATEGIC_FACILITIES.filter((f) => aliases.includes(f.hostIso)),
    [aliases],
  );
  const operated = useMemo(
    () => STRATEGIC_FACILITIES.filter((f) => aliases.includes(f.operator) && !aliases.includes(f.hostIso)),
    [aliases],
  );
  const zones = useMemo(
    () => CONFLICT_ZONES.filter((z) => z.parties.some((p) => aliases.includes(p))),
    [aliases],
  );

  const hostedByType = useMemo(() => {
    const groups = new Map<string, StrategicFacility[]>();
    for (const f of hosted) {
      const list = groups.get(f.type) ?? [];
      list.push(f);
      groups.set(f.type, list);
    }
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [hosted]);

  if (hosted.length === 0 && operated.length === 0 && zones.length === 0) {
    return (
      <div className="py-10 text-center">
        <Radar size={22} className="mx-auto mb-3 text-[#5b7683]" />
        <p className="text-xs text-[#9db8c3]">Стратегических объектов в текущей выборке не обнаружено</p>
        <p className="mt-1 text-[10px] text-[#6f92a0]">Выборка покрывает важнейшие объекты; полный реестр — в работе</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {zones.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#d8a48a]">
            <Flame size={12} /> Зоны конфликтов и напряжённости ({zones.length})
          </h3>
          <ul className="space-y-1.5">
            {zones.map((z) => (
              <li key={z.id} className="border border-[#233b46] bg-[#0f232c] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[#e1edf1]">{z.nameRu}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[10px] text-[#d8a48a]">{z.intensity}/10</span>
                    {onLocate && (
                      <button type="button" aria-label={`Показать на карте: ${z.nameRu}`} title="Показать на карте" onClick={() => onLocate(z.lat, z.lng)} className="text-[#6f92a0] hover:text-[#8fd4e2]">
                        <MapPin size={13} />
                      </button>
                    )}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-[#7f9fac]">
                  <span>{CONFLICT_TYPE_LABELS_RU[z.type]} · с {z.since}</span>
                  {z.noteRu && <span className="truncate text-[#6f92a0]" title={z.noteRu}>{z.noteRu}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hosted.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#8fd4e2]">
            <Radar size={12} /> Объекты на территории ({hosted.length})
          </h3>
          <div className="space-y-3">
            {hostedByType.map(([type, list]) => (
              <div key={type}>
                <div className="mb-1 text-[10px] text-[#7f9fac]">
                  {FACILITY_TYPE_LABELS_RU[type as keyof typeof FACILITY_TYPE_LABELS_RU]} · {list.length}
                </div>
                <ul className="space-y-1">
                  {list.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 border border-[#233b46] bg-[#0f232c] px-3 py-1.5">
                      <span className="min-w-0 truncate text-xs text-[#d3e0e5]" title={f.nameRu}>{f.nameRu}</span>
                      <span className="flex shrink-0 items-center gap-2 font-mono text-[10px] text-[#7f9fac]">
                        {f.operator !== f.hostIso && <span className="text-[#c9a44a]" title="Оператор">{f.operator}</span>}
                        <span title="Значимость">{f.strategicValue}/10</span>
                        {onLocate && (
                          <button type="button" aria-label={`Показать на карте: ${f.nameRu}`} title="Показать на карте" onClick={() => onLocate(f.lat, f.lng)} className="text-[#6f92a0] hover:text-[#8fd4e2]">
                            <MapPin size={13} />
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {operated.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#c9a44a]">
            <ArrowUpRight size={12} /> Оперирует за рубежом ({operated.length})
          </h3>
          <ul className="space-y-1">
            {operated.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 border border-[#233b46] bg-[#0f232c] px-3 py-1.5">
                <span className="min-w-0 truncate text-xs text-[#d3e0e5]" title={f.nameRu}>{f.nameRu}</span>
                <span className="flex shrink-0 items-center gap-2 font-mono text-[10px] text-[#7f9fac]">
                  <span>{f.hostIso}</span>
                  {onLocate && (
                    <button type="button" aria-label={`Показать на карте: ${f.nameRu}`} title="Показать на карте" onClick={() => onLocate(f.lat, f.lng)} className="text-[#6f92a0] hover:text-[#8fd4e2]">
                      <MapPin size={13} />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default FacilitiesTab;
