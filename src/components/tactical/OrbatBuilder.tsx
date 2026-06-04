"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
type FormationType = "division" | "brigade" | "battalion" | "company" | "platoon";
type EquipmentType = "tank" | "ifv" | "apc" | "artillery" | "mlrs" | "sam" | "truck" | "helicopter";

interface Formation {
  id: string;
  type: FormationType;
  name: string;
  nameRu: string;
  personnel: number;
  equipment: Record<EquipmentType, number>;
  children: Formation[];
  expanded: boolean;
}

interface OrbatBuilderProps {
  side: "blue" | "red";
  onExport: (orbat: Formation) => void;
}

// ─── Formation Templates ──────────────────────────────────────────────────────
const FORMATION_TEMPLATES: Record<FormationType, {
  nameRu: string;
  personnel: number;
  equipment: Record<EquipmentType, number>;
  subFormations: FormationType[];
}> = {
  division: {
    nameRu: "Дивизия",
    personnel: 12000,
    equipment: { tank: 94, ifv: 130, apc: 30, artillery: 72, mlrs: 18, sam: 12, truck: 500, helicopter: 0 },
    subFormations: ["brigade", "brigade", "brigade", "battalion"],
  },
  brigade: {
    nameRu: "Бригада",
    personnel: 3500,
    equipment: { tank: 31, ifv: 42, apc: 10, artillery: 18, mlrs: 6, sam: 4, truck: 150, helicopter: 0 },
    subFormations: ["battalion", "battalion", "battalion", "company"],
  },
  battalion: {
    nameRu: "Батальон",
    personnel: 800,
    equipment: { tank: 10, ifv: 14, apc: 4, artillery: 6, mlrs: 0, sam: 0, truck: 40, helicopter: 0 },
    subFormations: ["company", "company", "company"],
  },
  company: {
    nameRu: "Рота",
    personnel: 120,
    equipment: { tank: 3, ifv: 4, apc: 2, artillery: 0, mlrs: 0, sam: 0, truck: 8, helicopter: 0 },
    subFormations: ["platoon", "platoon", "platoon"],
  },
  platoon: {
    nameRu: "Взвод",
    personnel: 30,
    equipment: { tank: 1, ifv: 1, apc: 1, artillery: 0, mlrs: 0, sam: 0, truck: 2, helicopter: 0 },
    subFormations: [],
  },
};

const EQUIPMENT_LABELS: Record<EquipmentType, { name: string; icon: string }> = {
  tank: { name: "Танки", icon: "▣" },
  ifv: { name: "БМП", icon: "⊟" },
  apc: { name: "БТР", icon: "⊡" },
  artillery: { name: "Артиллерия", icon: "⊙" },
  mlrs: { name: "РСЗО", icon: "⊕" },
  sam: { name: "ПВО", icon: "⊗" },
  truck: { name: "Транспорт", icon: "▢" },
  helicopter: { name: "Вертолёты", icon: "✈" },
};

let nextId = 1;
function makeFormation(type: FormationType, customName?: string): Formation {
  const tmpl = FORMATION_TEMPLATES[type];
  const id = `f-${nextId++}`;
  return {
    id,
    type,
    name: customName || `${tmpl.nameRu}-${String(Math.floor(nextId / 5)).padStart(2, "0")}`,
    nameRu: tmpl.nameRu,
    personnel: tmpl.personnel,
    equipment: { ...tmpl.equipment },
    children: [],
    expanded: true,
  };
}

// ─── Recursive helpers ──────────────────────────────────────────────────────
function countTotals(f: Formation): { personnel: number; equipment: Record<EquipmentType, number> } {
  let personnel = f.personnel;
  const equipment: Record<EquipmentType, number> = { ...f.equipment };
  for (const child of f.children) {
    const childTotals = countTotals(child);
    personnel += childTotals.personnel;
    for (const eq of Object.keys(childTotals.equipment) as EquipmentType[]) {
      equipment[eq] = (equipment[eq] ?? 0) + childTotals.equipment[eq];
    }
  }
  return { personnel, equipment };
}

function toggleExpanded(f: Formation, targetId: string): Formation {
  if (f.id === targetId) return { ...f, expanded: !f.expanded };
  return { ...f, children: f.children.map((c) => toggleExpanded(c, targetId)) };
}

function addChild(parent: Formation, targetId: string, childType: FormationType): Formation {
  if (parent.id === targetId) {
    return { ...parent, children: [...parent.children, makeFormation(childType)] };
  }
  return { ...parent, children: parent.children.map((c) => addChild(c, targetId, childType)) };
}

function removeFormation(root: Formation, targetId: string): Formation {
  return {
    ...root,
    children: root.children
      .filter((c) => c.id !== targetId)
      .map((c) => removeFormation(c, targetId)),
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
export function OrbatBuilder({ side, onExport }: OrbatBuilderProps) {
  const [orbat, setOrbat] = useState<Formation>(() => makeFormation("division"));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const totals = useMemo(() => countTotals(orbat), [orbat]);

  const handleToggle = useCallback(
    (id: string) => setOrbat((prev) => toggleExpanded(prev, id)),
    []
  );

  const handleAdd = useCallback(
    (parentId: string, type: FormationType) =>
      setOrbat((prev) => addChild(prev, parentId, type)),
    []
  );

  const handleRemove = useCallback(
    (id: string) => setOrbat((prev) => removeFormation(prev, id)),
    []
  );

  const handleExport = useCallback(() => onExport(orbat), [orbat, onExport]);

  const sideColor = side === "blue" ? "#22d3ee" : "#ef4444";

  return (
    <div className="space-y-3 font-mono">
      {/* Header */}
      <div className="glass-panel rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: sideColor }}>
            ◈ ОргШтатная структура — {side === "blue" ? "Синие" : "Красные"}
          </h3>
          <button
            onClick={handleExport}
            className="text-[9px] border border-white/10 rounded px-2 py-0.5 text-slate-400 hover:text-tactical-primary transition-colors"
          >
            ↗ Экспорт JSON
          </button>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-1 text-[9px]">
          <div className="glass-panel rounded-md p-1.5 text-center">
            <div className="text-sm font-bold" style={{ color: sideColor }}>{totals.personnel.toLocaleString()}</div>
            <div className="text-slate-500">Личный состав</div>
          </div>
          <div className="glass-panel rounded-md p-1.5 text-center">
            <div className="text-sm font-bold" style={{ color: sideColor }}>
              {Object.values(totals.equipment).reduce((a, b) => a + b, 0).toLocaleString()}
            </div>
            <div className="text-slate-500">Единиц техники</div>
          </div>
        </div>
      </div>

      {/* Equipment breakdown */}
      <div className="glass-panel rounded-md p-2">
        <h4 className="text-[9px] font-bold text-tactical-primary tracking-widest uppercase mb-1">
          Техника
        </h4>
        <div className="grid grid-cols-4 gap-1">
          {(Object.entries(EQUIPMENT_LABELS) as [EquipmentType, { name: string; icon: string }][]).map(
            ([eq, { name, icon }]) => (
              <div key={eq} className="text-center">
                <div className="text-[10px] font-bold text-slate-300">
                  {icon} {totals.equipment[eq] ?? 0}
                </div>
                <div className="text-[7px] text-slate-500">{name}</div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Formation tree */}
      <div className="glass-panel rounded-md p-2 max-h-64 overflow-y-auto">
        <h4 className="text-[9px] font-bold text-tactical-primary tracking-widest uppercase mb-1">
          Дерево формаций
        </h4>
        <FormationNode
          formation={orbat}
          depth={0}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onToggle={handleToggle}
          onAdd={handleAdd}
          onRemove={handleRemove}
          sideColor={sideColor}
        />
      </div>
    </div>
  );
}

// ─── Recursive Tree Node ────────────────────────────────────────────────────
function FormationNode({
  formation,
  depth,
  selectedId,
  onSelect,
  onToggle,
  onAdd,
  onRemove,
  sideColor,
}: {
  formation: Formation;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onAdd: (parentId: string, type: FormationType) => void;
  onRemove: (id: string) => void;
  sideColor: string;
}) {
  const isSelected = selectedId === formation.id;
  const tmpl = FORMATION_TEMPLATES[formation.type];

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <motion.div
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        className={`py-1 px-2 rounded-md cursor-pointer border text-[9px] ${
          isSelected ? "border-tactical-primary/30 bg-tactical-primary/5" : "border-transparent hover:bg-white/3"
        }`}
        onClick={() => onSelect(formation.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {formation.children.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggle(formation.id); }}
                className="text-slate-500 hover:text-slate-300 w-3"
              >
                {formation.expanded ? "▾" : "▸"}
              </button>
            )}
            <span className="font-bold" style={{ color: sideColor }}>
              {formation.nameRu}
            </span>
            <span className="text-slate-500">{formation.name}</span>
            <span className="text-slate-600">({formation.personnel} чел.)</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Add child */}
            {tmpl.subFormations.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(formation.id, tmpl.subFormations[0]);
                }}
                className="text-slate-500 hover:text-tactical-primary text-[8px] border border-white/5 rounded px-1"
                title="Добавить подразделение"
              >
                +
              </button>
            )}
            {/* Remove */}
            {depth > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(formation.id); }}
                className="text-slate-500 hover:text-red-400 text-[8px]"
                title="Удалить"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {formation.expanded &&
          formation.children.map((child) => (
            <FormationNode
              key={child.id}
              formation={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggle={onToggle}
              onAdd={onAdd}
              onRemove={onRemove}
              sideColor={sideColor}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}
