"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
type UnitCategory = "infantry" | "armor" | "artillery" | "air_defense" | "aviation";

interface UnitSpec {
  id: string;
  name: string;
  category: UnitCategory;
  strength: number;
  range: number;
  mobility: number;
  armor: number;
  firepower: number;
  cost: number;
  description: string;
}

interface DeployedUnit extends UnitSpec {
  instanceId: string;
  side: "blue" | "red";
}

interface UnitDeploymentProps {
  onDeploy: (unit: DeployedUnit, row: number, col: number) => void;
  deployedUnits: DeployedUnit[];
  side: "blue" | "red";
  budget: number;
  onBudgetChange: (budget: number) => void;
}

// ─── Unit Database ─────────────────────────────────────────────────────────────
const UNIT_SPECS: UnitSpec[] = [
  // Infantry
  { id: "motor_rifle", name: "Мотострелковый взвод", category: "infantry", strength: 85, range: 2, mobility: 3, armor: 1, firepower: 40, cost: 10, description: "Основа пехоты, высокая живучесть в укрытиях" },
  { id: "mechanized", name: "Механизированная пехота", category: "infantry", strength: 75, range: 2, mobility: 4, armor: 2, firepower: 50, cost: 15, description: "Пехота на БМП, улучшенная мобильность" },
  { id: "spetsnaz", name: "Спецназ", category: "infantry", strength: 60, range: 3, mobility: 5, armor: 0, firepower: 70, cost: 25, description: "Разведка и диверсии, высокий урон" },
  { id: "paratrooper", name: "ВДВ", category: "infantry", strength: 70, range: 2, mobility: 5, armor: 1, firepower: 55, cost: 20, description: "Воздушно-десантные, высокая мобильность" },
  // Armor
  { id: "mbt", name: "Основной танк", category: "armor", strength: 95, range: 3, mobility: 4, armor: 5, firepower: 90, cost: 35, description: "Тяжёлая броня, мощное орудие" },
  { id: "ifv", name: "БМП", category: "armor", strength: 70, range: 2, mobility: 5, armor: 3, firepower: 60, cost: 20, description: "Боевая машина пехоты, баланс брони и скорости" },
  { id: "recon_veh", name: "БРДМ", category: "armor", strength: 40, range: 3, mobility: 6, armor: 1, firepower: 30, cost: 10, description: "Разведывательная машина, высокая скорость" },
  // Artillery
  { id: "spg", name: "САУ", category: "artillery", strength: 50, range: 6, mobility: 2, armor: 1, firepower: 95, cost: 30, description: "Самоходная артиллерия, огромный урон на дистанции" },
  { id: "mlrs", name: "РСЗО", category: "artillery", strength: 30, range: 8, mobility: 2, armor: 0, firepower: 100, cost: 40, description: "Залповый огонь, разрушение площадей" },
  { id: "mortar", name: "Миномёт", category: "artillery", strength: 35, range: 4, mobility: 3, armor: 0, firepower: 65, cost: 10, description: "Лёгкая артиллерия, мобильная" },
  // Air Defense
  { id: "sam_short", name: "ЗРК ближнего действия", category: "air_defense", strength: 45, range: 4, mobility: 3, armor: 1, firepower: 70, cost: 20, description: "ПВО войск, защита от низколетящих целей" },
  { id: "sam_long", name: "ЗРК дальнего действия", category: "air_defense", strength: 40, range: 8, mobility: 1, armor: 0, firepower: 85, cost: 35, description: "Зонтичное ПВО, стратегическая защита" },
  { id: "shorad", name: "ПЗРК", category: "air_defense", strength: 25, range: 3, mobility: 4, armor: 0, firepower: 50, cost: 5, description: "Переносной ЗРК, дешёвый и мобильный" },
  // Aviation
  { id: "attack_heli", name: "Ударный вертолёт", category: "aviation", strength: 55, range: 5, mobility: 8, armor: 1, firepower: 85, cost: 40, description: "Поддержка с воздуха, противотанковый" },
  { id: "fighter", name: "Истребитель", category: "aviation", strength: 40, range: 7, mobility: 9, armor: 0, firepower: 75, cost: 50, description: "Воздушное превосходство" },
  { id: "transport_heli", name: "Транспортный вертолёт", category: "aviation", strength: 30, range: 6, mobility: 7, armor: 0, firepower: 10, cost: 15, description: "Переброска войск, логистика" },
];

const CATEGORY_LABELS: Record<UnitCategory, { label: string; icon: string }> = {
  infantry: { label: "Пехота", icon: "⊹" },
  armor: { label: "Бронетехника", icon: "▣" },
  artillery: { label: "Артиллерия", icon: "⊙" },
  air_defense: { label: "ПВО", icon: "⊕" },
  aviation: { label: "Авиация", icon: "✈" },
};

// ─── Component ───────────────────────────────────────────────────────────────
export function UnitDeployment({
  onDeploy,
  deployedUnits,
  side,
  budget,
  onBudgetChange,
}: UnitDeploymentProps) {
  const [selectedCategory, setSelectedCategory] = useState<UnitCategory | "all">("all");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  const spentBudget = useMemo(
    () => deployedUnits.reduce((s, u) => s + u.cost, 0),
    [deployedUnits]
  );

  const remainingBudget = budget - spentBudget;

  const filteredUnits = useMemo(
    () =>
      selectedCategory === "all"
        ? UNIT_SPECS
        : UNIT_SPECS.filter((u) => u.category === selectedCategory),
    [selectedCategory]
  );

  const selectedUnit = useMemo(
    () => UNIT_SPECS.find((u) => u.id === selectedUnitId) ?? null,
    [selectedUnitId]
  );

  const forceComposition = useMemo(() => {
    const comp: Record<UnitCategory, number> = { infantry: 0, armor: 0, artillery: 0, air_defense: 0, aviation: 0 };
    for (const u of deployedUnits) {
      comp[u.category]++;
    }
    return comp;
  }, [deployedUnits]);

  return (
    <div className="space-y-3 font-mono">
      {/* Budget indicator */}
      <div className="glass-panel rounded-md p-2">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-slate-400">Бюджет развёртывания</span>
          <span className={remainingBudget < 20 ? "text-red-400" : "text-tactical-primary"}>
            {remainingBudget} / {budget} очков
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-tactical-primary transition-all"
            style={{ width: `${Math.max(0, (remainingBudget / budget) * 100)}%` }}
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-2 py-0.5 text-[9px] rounded border ${
            selectedCategory === "all"
              ? "border-tactical-primary/50 text-tactical-primary bg-tactical-primary/10"
              : "border-white/10 text-slate-400"
          }`}
        >
          Все
        </button>
        {(Object.entries(CATEGORY_LABELS) as [UnitCategory, { label: string; icon: string }][]).map(
          ([cat, { label, icon }]) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 text-[9px] rounded border ${
                selectedCategory === cat
                  ? "border-tactical-primary/50 text-tactical-primary bg-tactical-primary/10"
                  : "border-white/10 text-slate-400"
              }`}
            >
              {icon} {label}
            </button>
          )
        )}
      </div>

      {/* Unit list */}
      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
        {filteredUnits.map((unit) => {
          const canAfford = unit.cost <= remainingBudget;
          const isSelected = selectedUnitId === unit.id;
          const isExpanded = expandedUnit === unit.id;

          return (
            <motion.div
              key={unit.id}
              layout
              className={`glass-panel rounded-md p-2 cursor-pointer border ${
                isSelected
                  ? "border-tactical-primary/50 bg-tactical-primary/5"
                  : canAfford
                  ? "border-white/5 hover:border-white/20"
                  : "border-white/5 opacity-50"
              }`}
              onClick={() => {
                if (canAfford) {
                  setSelectedUnitId(isSelected ? null : unit.id);
                  setExpandedUnit(isExpanded ? null : unit.id);
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{CATEGORY_LABELS[unit.category].icon}</span>
                  <span className="text-[10px] text-slate-300 font-semibold">{unit.name}</span>
                </div>
                <span className="text-[9px] text-slate-500">{unit.cost} очков</span>
              </div>

              {/* Stats bar (compact) */}
              <div className="flex gap-2 mt-1 text-[8px] text-slate-500">
                <span>⚔{unit.firepower}</span>
                <span>🛡{unit.armor}</span>
                <span>👣{unit.mobility}</span>
                <span>🎯{unit.range}</span>
                <span>♥{unit.strength}</span>
              </div>

              {/* Expanded description */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-2 pt-2 border-t border-white/5 text-[9px] text-slate-400 leading-relaxed"
                  >
                    {unit.description}
                    {isSelected && (
                      <div className="mt-1 text-tactical-primary">
                        ✓ Выбран — кликните на карту для размещения
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Force Composition Summary */}
      {deployedUnits.length > 0 && (
        <div className="glass-panel rounded-md p-2">
          <h4 className="text-[9px] font-bold text-tactical-primary tracking-widest uppercase mb-1">
            Состав группировки
          </h4>
          <div className="grid grid-cols-5 gap-1 text-center">
            {(Object.entries(CATEGORY_LABELS) as [UnitCategory, { label: string }][]).map(
              ([cat, { label }]) => (
                <div key={cat}>
                  <div className="text-sm font-bold text-slate-300">{forceComposition[cat]}</div>
                  <div className="text-[7px] text-slate-500">{label}</div>
                </div>
              )
            )}
          </div>
          <div className="mt-1 text-[9px] text-slate-400">
            Всего: {deployedUnits.length} подразделений · Общая сила:{" "}
            {deployedUnits.reduce((s, u) => s + u.strength, 0)}
          </div>
        </div>
      )}
    </div>
  );
}
