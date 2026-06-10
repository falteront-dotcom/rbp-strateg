"use client"

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Target, Shield, Zap, Radio, BrainCircuit, Swords, Info } from 'lucide-react';
import { ARSENAL, UnitInfo, ParametricStats, applyModulesToUnit, ModuleType, simulateEngagement, getRadarFactors } from '@/lib/unit-database';
import { getCombatCapabilities } from '@/lib/combat-engine';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { TRANSLATIONS } from '@/lib/i18n';
import DuelSimulator from './DuelSimulator';

interface ComparisonMatrixProps {
    isOpen: boolean;
    onClose: () => void;
}

function getUnitStats(unit: UnitInfo): ParametricStats {
    if (unit.stats) return unit.stats;

    // Fallbacks if stats are somehow missing (e.g. from an old JSON import)
    const scale = unit.potential / 1.5;

    if (unit.category === 'aircraft') {
        return { type: 'aircraft', thrustKgf: Math.round(15000 * scale), weightEmpty: 15, maxSpeedMach: 2.0, rcs: 1.0, missileRangeKm: Math.round(80 * scale), techLevel: Math.round(7 * scale) };
    }
    if (unit.category === 'air_defense') {
        return { type: 'air_defense', radarRangeKm: Math.round(150 * scale), interceptRangeKm: Math.round(100 * scale), missileSpeedMach: 4.0, targetChannels: 4, deployTimeMin: 15, techLevel: Math.round(7 * scale) };
    }

    return { type: 'ground', powerHP: Math.round(1500 * scale), weightTons: 50, armorRHA: Math.round(500 * scale), gunCaliber: 120, penetration: Math.round(500 * scale), techLevel: Math.round(6 * scale) };
}

export default function ComparisonMatrix({ isOpen, onClose }: ComparisonMatrixProps) {
    const t = TRANSLATIONS;
    const arsenalEntries = Object.entries(ARSENAL);

    const [unitAId, setUnitAId] = useState<string>(arsenalEntries[0]?.[0] || '');
    const [unitBId, setUnitBId] = useState<string>(arsenalEntries[1]?.[0] || '');
    const [modulesA, setModulesA] = useState<ModuleType[]>([]);
    const [modulesB, setModulesB] = useState<ModuleType[]>([]);
    const [isDuelOpen, setIsDuelOpen] = useState(false);

    // Reset modules when unit changes
    React.useEffect(() => setModulesA([]), [unitAId]);
    React.useEffect(() => setModulesB([]), [unitBId]);

    const baseUnitA = ARSENAL[unitAId];
    const baseUnitB = ARSENAL[unitBId];

    const unitA = useMemo(() => baseUnitA ? applyModulesToUnit(baseUnitA, modulesA) : null, [baseUnitA, modulesA]);
    const unitB = useMemo(() => baseUnitB ? applyModulesToUnit(baseUnitB, modulesB) : null, [baseUnitB, modulesB]);

    const statsA = useMemo(() => unitA ? getUnitStats(unitA) : null, [unitA]);
    const statsB = useMemo(() => unitB ? getUnitStats(unitB) : null, [unitB]);

    const simResults = useMemo(() => {
        if (!unitA || !unitB) return null;
        return simulateEngagement(unitA, unitB, 1000);
    }, [unitA, unitB]);

    const combatA = useMemo(() => unitA ? getCombatCapabilities(unitA) : null, [unitA]);
    const combatB = useMemo(() => unitB ? getCombatCapabilities(unitB) : null, [unitB]);

    const radarData = useMemo(() => {
        if (!unitA || !unitB) return [];
        const factorsA = getRadarFactors(unitA);
        const factorsB = getRadarFactors(unitB);

        const allKeys = new Set([...Object.keys(factorsA), ...Object.keys(factorsB)]);
        return Array.from(allKeys).map(key => ({
            subject: key,
            A: factorsA[key] || 0,
            B: factorsB[key] || 0,
            fullMark: 10
        }));
    }, [unitA, unitB]);

    const renderStats = (stats: ParametricStats | null, compareStats: ParametricStats | null, rightAlign: boolean = false) => {
        if (!stats) return null;

        if (stats.type === 'ground') {
            const cStats = compareStats?.type === 'ground' ? compareStats : null;
            const s = stats;
            return (
                <div className="space-y-3">
                    <StatRow label="Двигатель" valA={s.powerHP} valB={cStats?.powerHP} unit="HP" icon={<Zap size={14} className="text-blue-500" />} rightAlign={rightAlign} />
                    <StatRow label="Боевая Масса" valA={s.weightTons} valB={cStats?.weightTons} unit="T" icon={<Zap size={14} className="text-cyan-500" />} inverse rightAlign={rightAlign} />
                    <StatRow label="Эквивалент Брони" valA={s.armorRHA} valB={cStats?.armorRHA} unit="RHA" icon={<Shield size={14} className="text-emerald-500" />} rightAlign={rightAlign} />
                    <StatRow label="Калибр" valA={s.gunCaliber} valB={cStats?.gunCaliber} unit="мм" icon={<Target size={14} className="text-red-500" />} rightAlign={rightAlign} />
                    <StatRow label="Пробитие" valA={s.penetration} valB={cStats?.penetration} unit="мм" icon={<Target size={14} className="text-orange-500" />} rightAlign={rightAlign} />
                    <StatRow label="Сенсоры/СУО" valA={s.techLevel} valB={cStats?.techLevel} unit="LvL" icon={<Radio size={14} className="text-purple-500" />} rightAlign={rightAlign} />
                </div>
            );
        }

        if (stats.type === 'aircraft') {
            const cStats = compareStats?.type === 'aircraft' ? compareStats : null;
            const s = stats;
            return (
                <div className="space-y-3">
                    <StatRow label="Тяга Двигателей" valA={s.thrustKgf} valB={cStats?.thrustKgf} unit="кгс" icon={<Zap size={14} className="text-blue-500" />} rightAlign={rightAlign} />
                    <StatRow label="Масса (Пуст.)" valA={s.weightEmpty} valB={cStats?.weightEmpty} unit="T" icon={<Zap size={14} className="text-cyan-500" />} inverse rightAlign={rightAlign} />
                    <StatRow label="Макс. Скорость" valA={s.maxSpeedMach} valB={cStats?.maxSpeedMach} unit="Мах" icon={<Zap size={14} className="text-amber-500" />} rightAlign={rightAlign} />
                    <StatRow label="ЭПР (Стелс)" valA={s.rcs} valB={cStats?.rcs} unit="м²" icon={<Shield size={14} className="text-emerald-500" />} inverse rightAlign={rightAlign} />
                    <StatRow label="Дальн. Ракет" valA={s.missileRangeKm} valB={cStats?.missileRangeKm} unit="км" icon={<Target size={14} className="text-red-500" />} rightAlign={rightAlign} />
                    <StatRow label="РЭБ/АФАР" valA={s.techLevel} valB={cStats?.techLevel} unit="LvL" icon={<Radio size={14} className="text-purple-500" />} rightAlign={rightAlign} />
                </div>
            );
        }

        if (stats.type === 'air_defense') {
            const cStats = compareStats?.type === 'air_defense' ? compareStats : null;
            const s = stats;
            return (
                <div className="space-y-3">
                    <StatRow label="Дальн. Радара" valA={s.radarRangeKm} valB={cStats?.radarRangeKm} unit="км" icon={<Radio size={14} className="text-blue-500" />} rightAlign={rightAlign} />
                    <StatRow label="Перехват" valA={s.interceptRangeKm} valB={cStats?.interceptRangeKm} unit="км" icon={<Target size={14} className="text-red-500" />} rightAlign={rightAlign} />
                    <StatRow label="Скор. ЗУР" valA={s.missileSpeedMach} valB={cStats?.missileSpeedMach} unit="Мах" icon={<Zap size={14} className="text-amber-500" />} rightAlign={rightAlign} />
                    <StatRow label="Канальность" valA={s.targetChannels} valB={cStats?.targetChannels} unit="шт" icon={<Target size={14} className="text-cyan-500" />} rightAlign={rightAlign} />
                    <StatRow label="Развертывание" valA={s.deployTimeMin} valB={cStats?.deployTimeMin} unit="мин" icon={<Zap size={14} className="text-emerald-500" />} inverse rightAlign={rightAlign} />
                    <StatRow label="Помехозащита" valA={s.techLevel} valB={cStats?.techLevel} unit="LvL" icon={<BrainCircuit size={14} className="text-purple-500" />} rightAlign={rightAlign} />
                </div>
            );
        }

        return null;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-4xl bg-slate-950 border border-tactical-accent/20 rounded-2xl shadow-2xl overflow-hidden glass-panel flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0">
                                <div className="flex items-center gap-2 text-tactical-accent">
                                    <Activity size={18} />
                                    <h2 className="font-black tracking-widest uppercase text-sm">Матрица Сравнения Юнитов</h2>
                                </div>
                                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-start overflow-y-auto">

                                {/* UNIT A */}
                                <div className="space-y-4">
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                        <select
                                            value={unitAId}
                                            onChange={(e) => setUnitAId(e.target.value)}
                                            className="w-full bg-slate-900 border border-white/10 text-sm p-2 rounded outline-none text-white font-bold"
                                        >
                                            {arsenalEntries.map(([id, u]) => (
                                                <option key={id} value={id}>[{u.country}] {u.displayName}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* MODULES A */}
                                    {unitA && statsA && ['ground', 'aircraft'].includes(statsA.type) && (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            {statsA.type === 'ground' && (
                                                <>
                                                    <ModuleCheckbox id="eraA" label="ДЗ (Броня)" desc="+30% к RHA" active={modulesA.includes('era')} onChange={(c) => setModulesA(prev => c ? [...prev, 'era'] : prev.filter(m => m !== 'era'))} />
                                                    <ModuleCheckbox id="apsA" label="КАЗ (Выживаемость)" desc="Перехват угрозы" active={modulesA.includes('aps')} onChange={(c) => setModulesA(prev => c ? [...prev, 'aps'] : prev.filter(m => m !== 'aps'))} />
                                                </>
                                            )}
                                            {statsA.type === 'aircraft' && (
                                                <>
                                                    <ModuleCheckbox id="stealthA" label="Stealth" desc="ЭПР-80% Дальность-20%" active={modulesA.includes('stealth')} onChange={(c) => setModulesA(prev => c ? [...prev, 'stealth'] : prev.filter(m => m !== 'stealth'))} />
                                                    <ModuleCheckbox id="beastA" label="Beast" desc="Валькирия ЭПР+400%" active={modulesA.includes('beast')} onChange={(c) => setModulesA(prev => c ? [...prev, 'beast'] : prev.filter(m => m !== 'beast'))} />
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {unitA && statsA && (
                                        <div className="space-y-6">
                                            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1"><BrainCircuit size={12} /> Боев. Потенциал (ОБС)</span>
                                                    <span className="text-2xl font-black font-mono text-white leading-none">{unitA.potential.toFixed(2)}</span>
                                                </div>
                                                {unitA.costMillionUSD && (
                                                    <div className="flex justify-between items-end bg-slate-900/50 p-2 rounded-lg border border-white/5 mt-1">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-mono text-emerald-500/70 uppercase">Ориентир. Стоимость</span>
                                                            <span className="text-sm font-black font-mono text-emerald-400">${unitA.costMillionUSD}M</span>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[9px] font-mono text-slate-500 uppercase">Индекс Эффективности (ОБС/$1M)</span>
                                                            <span className="text-sm font-black font-mono text-white">{(unitA.potential / unitA.costMillionUSD).toFixed(3)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="pt-2">
                                                {renderStats(statsA, statsB, false)}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* VS Divider */}
                                <div className="flex justify-center items-center h-full pt-10">
                                    <div className="w-12 h-12 rounded-full border border-tactical-accent/30 bg-tactical-accent/10 flex items-center justify-center font-black text-tactical-accent text-sm italic shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                                        VS
                                    </div>
                                </div>

                                {/* UNIT B */}
                                <div className="space-y-4">
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                        <select
                                            value={unitBId}
                                            onChange={(e) => setUnitBId(e.target.value)}
                                            className="w-full bg-slate-900 border border-white/10 text-sm p-2 rounded outline-none text-white font-bold"
                                        >
                                            {arsenalEntries.map(([id, u]) => (
                                                <option key={id} value={id}>[{u.country}] {u.displayName}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* MODULES B */}
                                    {unitB && statsB && ['ground', 'aircraft'].includes(statsB.type) && (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            {statsB.type === 'ground' && (
                                                <>
                                                    <ModuleCheckbox id="eraB" label="ДЗ (Броня)" desc="+30% к RHA" active={modulesB.includes('era')} onChange={(c) => setModulesB(prev => c ? [...prev, 'era'] : prev.filter(m => m !== 'era'))} />
                                                    <ModuleCheckbox id="apsB" label="КАЗ (Выживаемость)" desc="Перехват угрозы" active={modulesB.includes('aps')} onChange={(c) => setModulesB(prev => c ? [...prev, 'aps'] : prev.filter(m => m !== 'aps'))} />
                                                </>
                                            )}
                                            {statsB.type === 'aircraft' && (
                                                <>
                                                    <ModuleCheckbox id="stealthB" label="Stealth" desc="ЭПР-80% Дальность-20%" active={modulesB.includes('stealth')} onChange={(c) => setModulesB(prev => c ? [...prev, 'stealth'] : prev.filter(m => m !== 'stealth'))} />
                                                    <ModuleCheckbox id="beastB" label="Beast" desc="Валькирия ЭПР+400%" active={modulesB.includes('beast')} onChange={(c) => setModulesB(prev => c ? [...prev, 'beast'] : prev.filter(m => m !== 'beast'))} />
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {unitB && statsB && (
                                        <div className="space-y-6">
                                            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1"><BrainCircuit size={12} /> Боев. Потенциал (ОБС)</span>
                                                    <span className="text-2xl font-black font-mono text-white leading-none">{unitB.potential.toFixed(2)}</span>
                                                </div>
                                                {unitB.costMillionUSD && (
                                                    <div className="flex justify-between items-end bg-slate-900/50 p-2 rounded-lg border border-white/5 mt-1">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-mono text-emerald-500/70 uppercase">Ориентир. Стоимость</span>
                                                            <span className="text-sm font-black font-mono text-emerald-400">${unitB.costMillionUSD}M</span>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[9px] font-mono text-slate-500 uppercase">Индекс Эффективности (ОБС/$1M)</span>
                                                            <span className="text-sm font-black font-mono text-white">{(unitB.potential / unitB.costMillionUSD).toFixed(3)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="pt-2">
                                                {renderStats(statsB, statsA, true)}
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* Radar Chart */}
                            {(unitA && unitB && radarData.length > 0) && (
                                <div className="px-6 pb-2 shrink-0">
                                    <div className="w-full h-64 bg-slate-900/40 rounded-xl border border-tactical-accent/20 p-2 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full" />
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                                                <Radar name={unitA.displayName} dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
                                                <Radar name={unitB.displayName} dataKey="B" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} strokeWidth={2} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Conclusion Footer (Monte Carlo Results) */}
                            {(unitA && unitB && simResults) && (
                                <div className="p-6 bg-slate-900 border-t border-tactical-accent/20 flex flex-col shrink-0 gap-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Swords size={16} className="text-tactical-accent" />
                                        <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Прогноз боестолкновения</span>
                                        <span className="text-[9px] font-mono text-slate-500 ml-auto">Монте-Карло, 1000 итераций</span>
                                    </div>

                                    <div className="flex h-12 w-full rounded-lg overflow-hidden border border-white/10">
                                        <div
                                            className="h-full bg-blue-500/80 flex items-center justify-center text-white font-black text-sm transition-all duration-500"
                                            style={{ width: `${simResults.winProbA}%` }}
                                        >
                                            {simResults.winProbA > 10 ? `${simResults.winProbA.toFixed(1)}%` : ''}
                                        </div>
                                        <div
                                            className="h-full bg-slate-600/80 flex items-center justify-center text-white/50 text-xs font-mono transition-all duration-500 border-x border-white/20"
                                            style={{ width: `${simResults.mutualDestruction}%` }}
                                            title="Взаимоуничтожение"
                                        >
                                            {simResults.mutualDestruction > 10 ? `${simResults.mutualDestruction.toFixed(1)}%` : ''}
                                        </div>
                                        <div
                                            className="h-full bg-red-500/80 flex items-center justify-center text-white font-black text-sm transition-all duration-500"
                                            style={{ width: `${simResults.winProbB}%` }}
                                        >
                                            {simResults.winProbB > 10 ? `${simResults.winProbB.toFixed(1)}%` : ''}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-black text-slate-400 mt-1 px-1">
                                        <div className="w-1/3 text-left text-blue-400 truncate">{unitA.displayName} Победит</div>
                                        <div className="w-1/3 text-center text-slate-500">Ничья (Мертвы)</div>
                                        <div className="w-1/3 text-right text-red-400 truncate">{unitB.displayName} Победит</div>
                                    </div>

                                    <div className="mt-6 flex justify-center">
                                        <button 
                                            onClick={() => setIsDuelOpen(true)}
                                            className="group relative px-6 py-3 bg-tactical-accent text-slate-950 font-black uppercase tracking-widest text-xs rounded-lg hover:bg-white transition-all duration-300 shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] flex items-center gap-2"
                                        >
                                            <Swords size={16} className="group-hover:rotate-12 transition-transform" />
                                            Симуляция Дуэли
                                            <div className="absolute -inset-1 bg-tactical-accent opacity-20 blur-lg group-hover:opacity-40 transition-opacity rounded-lg" />
                                        </button>
                                    </div>

                                    {/* Baseline Explanation */}
                                    <div className="mt-4 p-3 bg-tactical-primary/5 border border-tactical-primary/20 rounded-lg flex gap-3 text-slate-400 text-[10px] leading-relaxed relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-tactical-primary" />
                                        <div className="shrink-0 mt-0.5 relative z-10 flex">
                                            <Info size={14} className="text-tactical-primary relative" />
                                        </div>
                                        <div className="relative z-10 font-mono flex-1">
                                            <strong className="text-white">ОБНОВЛЕННЫЙ ЭТАЛОН ОБС: ПЛАТФОРМЫ NEXT-GEN.</strong>
                                            <br />
                                            Для нивелирования инфляции характеристик (stat inflation) алгоритм переведен на эталон 6-го поколения:
                                            <span className="text-tactical-primary block mt-1">Танки: Орудие 130мм, Броня 900мм RHA, 25 л.с./т.</span>
                                            <span className="text-tactical-primary block">Авиация: Мах 2.2+, Тяга 1.3+, Ракеты 200+ км.</span>
                                            <span className="text-tactical-primary block">ПВО: Дальность радара 500+ км, Мах 8.</span>
                                            Это изменение необходимо для корректной нормализации ТТХ новейших перспективных разработок (таких как AbramsX, AbramsX 130, KF51 Panther, NGAD) в единый сопоставимый индекс ОБС.
                                        </div>
                                        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-32 h-32 bg-tactical-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            )}

                            {unitA && unitB && combatA && combatB && (
                              <DuelSimulator 
                                isOpen={isDuelOpen} 
                                onClose={() => setIsDuelOpen(false)} 
                                unitA={unitA} 
                                unitB={unitB} 
                                combatA={combatA} 
                                combatB={combatB} 
                              />
                            )}
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function StatRow({ label, valA, valB, unit, icon, inverse = false, rightAlign = false }: { label: string, valA: number, valB?: number, unit: string, icon: React.ReactNode, inverse?: boolean, rightAlign?: boolean }) {

    let delta = 0;
    let isBetter = false;
    let isWorse = false;

    if (valB !== undefined) {
        delta = ((valA - valB) / valB) * 100;
        if (delta > 0) {
            isBetter = !inverse;
            isWorse = inverse;
        } else if (delta < 0) {
            isBetter = inverse;
            isWorse = !inverse;
        }
    }

    const deltaColor = isBetter ? "text-green-500" : isWorse ? "text-red-500" : "text-slate-500";
    const deltaSign = delta > 0 ? "+" : "";

    return (
        <div className={cn("flex flex-col gap-1 p-2 rounded border border-white/5", isBetter ? "bg-green-500/5 border-green-500/20" : isWorse ? "bg-red-500/5 border-red-500/20" : "bg-black/20")}>
            <div className={cn("flex items-center gap-1.5", rightAlign && "flex-row-reverse")}>
                {icon}
                <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">{label}</span>
                {valB !== undefined && Math.abs(delta) > 0.1 && (
                    <span className={cn("text-[9px] font-bold ml-auto font-mono", deltaColor, rightAlign && "mr-auto ml-0")}>
                        {deltaSign}{delta.toFixed(1)}%
                    </span>
                )}
            </div>
            <div className={cn("flex items-baseline gap-1.5", rightAlign && "justify-end")}>
                <span className="text-lg font-black font-mono text-white tabular-nums">{valA.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 font-mono">{unit}</span>
            </div>
        </div>
    );
}

function ModuleCheckbox({ id, label, desc, active, onChange }: { id: string, label: string, desc: string, active: boolean, onChange: (c: boolean) => void }) {
    return (
        <label className={cn(
            "flex flex-col p-2 rounded-lg border focus-within:ring-1 focus-within:ring-tactical-primary transition-all cursor-pointer relative overflow-hidden",
            active ? "bg-tactical-primary/10 border-tactical-primary/40" : "bg-slate-950/50 border-white/5 hover:border-white/10 hover:bg-white/5"
        )}>
            <div className="flex items-center gap-1.5">
                <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => onChange(e.target.checked)}
                    className="w-3 h-3 rounded-sm accent-tactical-primary bg-slate-900 border-white/20"
                />
                <span className={cn("text-[8px] uppercase font-black tracking-widest", active ? "text-tactical-primary" : "text-slate-300")}>{label}</span>
            </div>
            <span className="text-[7px] mt-1 ml-4 text-slate-500 font-mono pointer-events-none line-clamp-1">{desc}</span>
            {active && <div className="absolute top-0 right-0 w-6 h-6 bg-tactical-primary/20 rounded-bl-full blur-md" />}
        </label>
    );
}
