"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BattleEvent {
  turn: number;
  phase: "move" | "fire" | "result";
  description: string;
  attacker?: string;
  defender?: string;
  damage?: number;
  morale?: number;
}

interface BattleSimulationProps {
  events: BattleEvent[];
  currentTurn: number;
  onReset: () => void;
  onAdvance: () => void;
  isRunning: boolean;
  blueStrength: number;
  redStrength: number;
  blueMorale: number;
  redMorale: number;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function BattleSimulation({
  events,
  currentTurn,
  onReset,
  onAdvance,
  isRunning,
  blueStrength,
  redStrength,
  blueMorale,
  redMorale,
}: BattleSimulationProps) {
  const [showLog, setShowLog] = useState(true);

  const recentEvents = useMemo(
    () => events.filter((e) => e.turn === currentTurn).slice(-5),
    [events, currentTurn]
  );

  const totalEvents = useMemo(
    () => events.filter((e) => e.phase === "result").length,
    [events]
  );

  return (
    <div className="space-y-3 font-mono">
      {/* ─── Battle Status ─────────────────────────────────────────────── */}
      <div className="glass-panel rounded-lg p-3">
        <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-2">
          ◈ Ход боя — Тур {currentTurn}
        </h3>

        {/* Force bars */}
        <div className="space-y-2">
          {/* Blue force */}
          <div>
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <span className="text-cyan-400">Синие — Сила</span>
              <span className="text-cyan-400 font-bold">{blueStrength}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-cyan-500"
                animate={{ width: `${blueStrength}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Blue morale */}
          <div>
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <span className="text-cyan-300">Синие — Мораль</span>
              <span className="text-cyan-300 font-bold">{blueMorale}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-cyan-300/50"
                animate={{ width: `${blueMorale}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Red force */}
          <div>
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <span className="text-red-400">Красные — Сила</span>
              <span className="text-red-400 font-bold">{redStrength}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-red-500"
                animate={{ width: `${redStrength}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Red morale */}
          <div>
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <span className="text-red-300">Красные — Мораль</span>
              <span className="text-red-300 font-bold">{redMorale}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-red-300/50"
                animate={{ width: `${redMorale}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Controls ────────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={onAdvance}
          disabled={isRunning}
          className="flex-1 glass-panel rounded-md px-3 py-2 text-[10px] font-bold tracking-wider uppercase border border-tactical-primary/30 text-tactical-primary hover:bg-tactical-primary/10 transition-colors disabled:opacity-50"
        >
          {isRunning ? "⏳ Выполняется..." : "▶ Следующий тур"}
        </button>
        <button
          onClick={onReset}
          className="glass-panel rounded-md px-3 py-2 text-[10px] font-bold tracking-wider uppercase border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
        >
          ↺ Сброс
        </button>
        <button
          onClick={() => setShowLog(!showLog)}
          className="glass-panel rounded-md px-3 py-2 text-[10px] border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
        >
          {showLog ? "⊟" : "⊞"} Журнал
        </button>
      </div>

      {/* ─── Battle Log ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLog && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass-panel rounded-lg p-3 overflow-hidden"
          >
            <h4 className="text-[10px] font-bold text-tactical-primary tracking-widest uppercase mb-2">
              ◈ Журнал боя ({totalEvents} событий)
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {recentEvents.length > 0 ? (
                recentEvents.map((evt, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`text-[9px] flex items-start gap-2 py-1 px-2 rounded ${
                      evt.phase === "result"
                        ? "bg-tactical-primary/5 border-l-2 border-tactical-primary"
                        : evt.phase === "fire"
                        ? "bg-red-500/5 border-l-2 border-red-500/50"
                        : "bg-cyan-500/5 border-l-2 border-cyan-500/50"
                    }`}
                  >
                    <span className="text-slate-600 flex-shrink-0">Т{evt.turn}</span>
                    <span className="text-slate-300 flex-1">{evt.description}</span>
                    {evt.damage !== undefined && (
                      <span className="text-red-400 font-bold">-{evt.damage}</span>
                    )}
                    {evt.morale !== undefined && evt.morale < 0 && (
                      <span className="text-yellow-400">Мораль{evt.morale}</span>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="text-[9px] text-slate-500">
                  Нет событий. Нажмите &quot;Следующий тур&quot; для начала.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Victory Conditions ─────────────────────────────────────────── */}
      <div className="glass-panel rounded-md p-2">
        <h4 className="text-[9px] font-bold text-tactical-primary tracking-widest uppercase mb-1">
          Условия победы
        </h4>
        <div className="space-y-0.5 text-[9px] text-slate-400">
          <div className={blueStrength <= 10 ? "text-red-400" : ""}>
            • Синие побеждены: сила ≤ 10% {blueStrength <= 10 ? "✓" : ""}
          </div>
          <div className={redStrength <= 10 ? "text-cyan-400" : ""}>
            • Красные побеждены: сила ≤ 10% {redStrength <= 10 ? "✓" : ""}
          </div>
          <div className={blueMorale <= 20 || redMorale <= 20 ? "text-yellow-400" : ""}>
            • Мораль прорвана: ≤ 20% {blueMorale <= 20 ? "(Синие)" : redMorale <= 20 ? "(Красные)" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
