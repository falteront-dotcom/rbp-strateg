"use client"

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Swords, Target, Eye, Clock, Zap, Shield, AlertTriangle, Info, Brain } from 'lucide-react';
import { UnitInfo } from '@/lib/unit-database';
import { simulateEngagementAtDistance, CombatCapabilities, EngagementResult } from '@/lib/combat-engine';
import { cn } from '@/lib/utils';

interface DuelSimulatorProps {
    isOpen: boolean;
    onClose: () => void;
    unitA: UnitInfo;
    unitB: UnitInfo;
    combatA: CombatCapabilities;
    combatB: CombatCapabilities;
}

export default function DuelSimulator({ isOpen, onClose, unitA, unitB, combatA, combatB }: DuelSimulatorProps) {
    // Determine a representative engagement distance
    // We'll pick the average of their effective ranges or a fixed value for the demo
    const engagementDistance = useMemo(() => {
        return (combatA.effectiveRangeKm + combatB.effectiveRangeKm) / 2;
    }, [combatA, combatB]);

    const result = useMemo(() => {
        return simulateEngagementAtDistance(
            unitA,
            unitB,
            engagementDistance,
            combatA,
            combatB,
            1.0, // Weather Clear
            1.0  // EW None
        );
    }, [unitA, unitB, engagementDistance, combatA, combatB]);

    if (!result) return null;

    const timeline = useMemo(() => {
        const events = [];
        
        // 1. Detection
        const detA = result.detectionRangeA;
        const detB = result.detectionRangeB;
        
        events.push({
            time: 0,
            label: 'Начало сближения',
            desc: `Дистанция контакта: ${engagementDistance.toFixed(2)} км`,
            icon: <Info size={16} className="text-slate-400" />,
            type: 'info'
        });

        if (result.firstToDetect === 'A') {
            events.push({ time: 1, label: 'Обнаружение (A)', desc: `${unitA.displayName} первым зафиксировал цель`, icon: <Eye size={16} className="text-blue-400" />, type: 'A' });
            events.push({ time: 2, label: 'Обнаружение (B)', desc: `${unitB.displayName} обнаружил противника`, icon: <Eye size={16} className="text-red-400" />, type: 'B' });
        } else if (result.firstToDetect === 'B') {
            events.push({ time: 1, label: 'Обнаружение (B)', desc: `${unitB.displayName} первым зафиксировал цель`, icon: <Eye size={16} className="text-red-400" />, type: 'B' });
            events.push({ time: 2, label: 'Обнаружение (A)', desc: `${unitA.displayName} обнаружил противника`, icon: <Eye size={16} className="text-blue-400" />, type: 'A' });
        } else {
            events.push({ time: 1, label: 'Взаимное обнаружение', desc: 'Обе стороны зафиксировали друг друга одновременно', icon: <Eye size={16} className="text-white" />, type: 'both' });
        }

        // 2. Shot
        const shotTime = result.timeToFirstShotSec;
        events.push({
            time: 3,
            label: 'Первый выстрел',
            desc: `${result.firstShotBy === 'A' ? unitA.displayName : unitB.displayName} открыл огонь через ${shotTime.toFixed(1)}с`,
            icon: <Zap size={16} className={result.firstShotBy === 'A' ? "text-blue-400" : "text-red-400"} />,
            type: result.firstShotBy
        });

        // 3. Impact
        events.push({
            time: 4,
            label: 'Прилёт / Перехват',
            desc: `Попадание с вероятностью ${Math.max(result.hitProbabilityA, result.hitProbabilityB) * 100}%`,
            icon: <Target size={16} className="text-orange-400" />,
            type: 'impact'
        });

        return events;
    }, [result, unitA, unitB, engagementDistance]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[60] flex items-center justify-center p-6"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-3xl bg-slate-950 border border-tactical-accent/30 rounded-3xl shadow-2xl overflow-hidden glass-panel"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-tactical-accent/20 rounded-lg text-tactical-accent">
                                    <Swords size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tighter text-white uppercase">Симулятор Боестолкновения</h2>
                                    <p className="text-xs font-mono text-slate-500">Тактический анализ 1v1 на дистанции {engagementDistance.toFixed(2)} км</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Left: Timeline */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Clock size={14} /> Хронология событий
                                </h3>
                                <div className="relative space-y-8 pl-8">
                                    <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-tactical-accent/50 via-slate-700 to-transparent" />
                                    
                                    {timeline.map((event, i) => (
                                        <motion.div 
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.5 }}
                                            className="relative group"
                                        >
                                            <div className={cn(
                                                "absolute -left-8 top-1 w-4 h-4 rounded-full border-2 bg-slate-950 transition-all group-hover:scale-125",
                                                event.type === 'A' ? "border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : 
                                                event.type === 'B' ? "border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : 
                                                "border-slate-500"
                                            )} />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-white uppercase tracking-tight">{event.label}</span>
                                                <span className="text-xs text-slate-400 font-mono leading-relaxed">{event.desc}</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Final Analysis */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Brain size={14} /> Финальный Анализ ИИ
                                </h3>
                                
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6 relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-tactical-accent/10 blur-3xl rounded-full" />
                                    
                                    <div className="flex justify-between items-center">
                                        <div className="text-center flex-1">
                                            <div className="text-xs font-mono text-blue-400 uppercase mb-1">{unitA.displayName}</div>
                                            <div className="text-3xl font-black text-white font-mono">{(result.winProbabilityA * 100).toFixed(1)}%</div>
                                            <div className="text-[10px] text-slate-500 uppercase">Шанс победы</div>
                                        </div>
                                        <div className="px-4 text-slate-600 font-black text-xl italic">VS</div>
                                        <div className="text-center flex-1">
                                            <div className="text-xs font-mono text-red-400 uppercase mb-1">{unitB.displayName}</div>
                                            <div className="text-3xl font-black text-white font-mono">{(result.winProbabilityB * 100).toFixed(1)}%</div>
                                            <div className="text-[10px] text-slate-500 uppercase">Шанс победы</div>
                                        </div>
                                    </div>

                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${result.winProbabilityA * 100}%` }} />
                                        <div className="h-full bg-slate-600 transition-all duration-1000" style={{ width: `${result.mutualDestruction * 100}%` }} />
                                        <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${result.winProbabilityB * 100}%` }} />
                                    </div>

                                    <div className="space-y-3 pt-4">
                                        <AnalysisItem 
                                            label="Преимущество" 
                                            value={result.winProbabilityA > result.winProbabilityB ? unitA.displayName : unitB.displayName} 
                                            icon={<Shield size={14} />} 
                                        />
                                        <AnalysisItem 
                                            label="Критический фактор" 
                                            value={result.firstShotBy === 'A' ? 'Инициатива (A)' : result.firstShotBy === 'B' ? 'Инициатива (B)' : 'Синхронный огонь'} 
                                            icon={<Zap size={14} />} 
                                        />
                                        <AnalysisItem 
                                            label="Риск взаимного уничтожения" 
                                            value={`${(result.mutualDestruction * 100).toFixed(1)}%`} 
                                            icon={<AlertTriangle size={14} />} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function AnalysisItem({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-mono uppercase">
                {icon}
                {label}
            </div>
            <div className="text-xs font-black text-white font-mono uppercase">{value}</div>
        </div>
    );
}
