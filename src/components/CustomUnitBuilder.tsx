"use client"

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, BrainCircuit, Shield, Zap, Radio, Target, Download, Upload } from 'lucide-react';
import { ARSENAL, Category, Country, IconType, Side, calculateCustomPotential, ParametricStats, ModuleType } from '@/lib/unit-database';
import { cn } from '@/lib/utils';
import { TRANSLATIONS } from '@/lib/i18n';

interface CustomUnitBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    onUnitAdded: (unitId: string) => void;
}

export default function CustomUnitBuilder({ isOpen, onClose, onUnitAdded }: CustomUnitBuilderProps) {
    const t = TRANSLATIONS;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState('');
    const [country, setCountry] = useState<Country>('US');
    const [side, setSide] = useState<Side>('NATO');
    const [category, setCategory] = useState<Category>('ground');
    const [iconType, setIconType] = useState<IconType>('MBT');

    const defaultGroundStats: ParametricStats = { type: 'ground', powerHP: 1500, weightTons: 65, armorRHA: 800, gunCaliber: 120, penetration: 700, techLevel: 7 };
    const defaultAirStats: ParametricStats = { type: 'aircraft', thrustKgf: 15000, weightEmpty: 15, maxSpeedMach: 2.0, rcs: 1.0, missileRangeKm: 80, techLevel: 7 };
    const defaultADStats: ParametricStats = { type: 'air_defense', radarRangeKm: 150, interceptRangeKm: 100, missileSpeedMach: 4.0, targetChannels: 4, deployTimeMin: 15, techLevel: 7 };

    const [stats, setStats] = useState<ParametricStats>(defaultGroundStats);
    const [modules, setModules] = useState<ModuleType[]>([]);

    const potential = calculateCustomPotential(stats, modules);

    // Auto-set Side based on Country
    useEffect(() => {
        if (['RU', 'CN'].includes(country)) {
            setSide(country === 'RU' ? 'RUS' : 'CHINA');
        } else {
            setSide('NATO');
        }
    }, [country]);

    // Auto-set Icon and default stats based on Category
    useEffect(() => {
        if (category === 'aircraft') {
            setIconType('Fighter');
            setStats(defaultAirStats);
        } else if (category === 'air_defense') {
            setIconType('SAM');
            setStats(defaultADStats);
        } else {
        }
        setModules([]); // reset modules on category change
    }, [category]);

    const handleSave = () => {
        if (!name.trim()) return;

        const unitId = `custom_${Date.now()}`;
        ARSENAL[unitId] = {
            name: name,
            displayName: name,
            country,
            side,
            category,
            iconType,
            potential,
            activeModules: modules
        };

        onUnitAdded(unitId);
        onClose();
        setName(''); // Reset
    };

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ARSENAL, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "custom_arsenal.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedArsenal = JSON.parse(event.target?.result as string);
                // Simple validation
                for (const key in importedArsenal) {
                    if (importedArsenal[key].name && importedArsenal[key].potential !== undefined) {
                        ARSENAL[key] = importedArsenal[key];
                    }
                }
                alert("Арсенал успешно обновлен из файла!");
                if (fileInputRef.current) fileInputRef.current.value = '';
            } catch (err) {
                alert("Ошибка чтения файла JSON.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg bg-slate-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden glass-panel flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                                <div className="flex items-center gap-2 text-tactical-primary">
                                    <BrainCircuit size={18} />
                                    <h2 className="font-black tracking-widest uppercase text-sm">Конструктор Юнитов (Real TTx)</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Импорт JSON">
                                        <Upload size={14} />
                                    </button>
                                    <button onClick={handleExport} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors mr-2" title="Экспорт JSON">
                                        <Download size={14} />
                                    </button>
                                    <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
                                    <button onClick={onClose} className="text-slate-500 hover:text-red-400 transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">

                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-mono uppercase tracking-[.1em] mb-1 block">Название техники</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Например: M1A2 SEPv3 Abrams"
                                            className="w-full bg-slate-950/80 border border-white/10 text-sm p-3 rounded-md outline-none focus:border-tactical-primary/50 text-white placeholder:text-slate-600 font-bold"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-[.1em] mb-1 block">Страна</label>
                                            <select
                                                value={country}
                                                onChange={(e) => setCountry(e.target.value as Country)}
                                                className="w-full bg-slate-950/80 border border-white/10 text-xs p-3 rounded-md outline-none text-white focus:border-tactical-primary/50"
                                            >
                                                {Object.entries({
                                                    RU: 'Россия',
                                                    US: 'США',
                                                    DE: 'Германия',
                                                    GB: 'Великобритания',
                                                    FR: 'Франция',
                                                    IT: 'Италия',
                                                    PL: 'Польша',
                                                    CN: 'Китай'
                                                }).map(([code, crname]) => (
                                                    <option key={code} value={code}>{crname} ({code})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-[.1em] mb-1 block">Категория</label>
                                            <select
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value as Category)}
                                                className="w-full bg-slate-950/80 border border-white/10 text-xs p-3 rounded-md outline-none text-white focus:border-tactical-primary/50"
                                            >
                                                <option value="ground">Наземные Силы</option>
                                                <option value="aircraft">Авиация</option>
                                                <option value="air_defense">ПВО</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-500 font-mono uppercase tracking-[.1em] mb-1 block">Тактическая Роль</label>
                                        <select
                                            value={iconType}
                                            onChange={(e) => setIconType(e.target.value as IconType)}
                                            className="w-full bg-slate-950/80 border border-white/10 text-xs p-3 rounded-md outline-none text-white focus:border-tactical-primary/50"
                                        >
                                            {category === 'aircraft' && (
                                                <>
                                                    <option value="Fighter">Истребитель (Fighter)</option>
                                                    <option value="Bomber">Бомбардировщик (Bomber)</option>
                                                    <option value="AWACS">ДРЛО (AWACS)</option>
                                                    <option value="UAV">Беспилотник (UAV)</option>
                                                    <option value="Support">Поддержка (Heli/Gunship)</option>
                                                </>
                                            )}
                                            {category === 'air_defense' && (
                                                <option value="SAM">ЗРК (SAM)</option>
                                            )}
                                            {category === 'ground' && (
                                                <>
                                                    <option value="MBT">Основной Танк (MBT)</option>
                                                    <option value="IFV">БМП/БТР (IFV/APC)</option>
                                                    <option value="SPG">Артиллерия (SPG/MLRS)</option>
                                                    <option value="Support">ПВО ближнего (SHORAD)</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </div>

                                <div className="h-px bg-white/5" />

                                {/* Interactive Stats */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Target size={14} className="text-tactical-accent" />
                                        <h3 className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">Реальные ТТХ (Parametric Input)</h3>
                                    </div>

                                    <div className="space-y-5">
                                        {stats.type === 'ground' && (
                                            <>
                                                <ParametricSlider icon={<Zap size={14} />} label="Мощность Двигателя" value={stats.powerHP} min={100} max={3000} step={10} unit="HP" onChange={(v) => setStats({ ...stats, powerHP: v })} color="text-blue-500" />
                                                <ParametricSlider icon={<Zap size={14} />} label="Боевая Масса" value={stats.weightTons} min={5} max={100} step={1} unit="Т" onChange={(v) => setStats({ ...stats, weightTons: v })} color="text-cyan-500" />
                                                <ParametricSlider icon={<Shield size={14} />} label="Эквивалент Брони" value={stats.armorRHA} min={10} max={1500} step={10} unit="мм RHA" onChange={(v) => setStats({ ...stats, armorRHA: v })} color="text-emerald-500" />
                                                <ParametricSlider icon={<Target size={14} />} label="Калибр Орудия" value={stats.gunCaliber} min={12} max={203} step={1} unit="мм" onChange={(v) => setStats({ ...stats, gunCaliber: v })} color="text-red-500" />
                                                <ParametricSlider icon={<Target size={14} />} label="Бронепробиваемость" value={stats.penetration} min={10} max={1200} step={10} unit="мм" onChange={(v) => setStats({ ...stats, penetration: v })} color="text-orange-500" />
                                                <ParametricSlider icon={<Radio size={14} />} label="Уровень Сенсоров / СУО" value={stats.techLevel} min={1} max={10} step={1} unit="LVL" onChange={(v) => setStats({ ...stats, techLevel: v })} color="text-purple-500" />
                                            </>
                                        )}
                                        {stats.type === 'aircraft' && (
                                            <>
                                                <ParametricSlider icon={<Zap size={14} />} label="Тяга Двигателей" value={stats.thrustKgf} min={500} max={120000} step={100} unit="кгс" onChange={(v) => setStats({ ...stats, thrustKgf: v })} color="text-blue-500" />
                                                <ParametricSlider icon={<Zap size={14} />} label="Масса (Пустой)" value={stats.weightEmpty} min={1} max={150} step={0.5} unit="Т" onChange={(v) => setStats({ ...stats, weightEmpty: v })} color="text-cyan-500" />
                                                <ParametricSlider icon={<Zap size={14} />} label="Макс. Скорость" value={stats.maxSpeedMach} min={0.1} max={4.0} step={0.1} unit="Мах" onChange={(v) => setStats({ ...stats, maxSpeedMach: v })} color="text-amber-500" />
                                                <ParametricSlider icon={<Shield size={14} />} label="ЭПР (Стелс)" value={stats.rcs} min={0.0001} max={30} step={0.01} unit="м²" onChange={(v) => setStats({ ...stats, rcs: v })} color="text-emerald-500" />
                                                <ParametricSlider icon={<Target size={14} />} label="Дальность Ракет В-В" value={stats.missileRangeKm} min={0} max={5000} step={10} unit="км" onChange={(v) => setStats({ ...stats, missileRangeKm: v })} color="text-red-500" />
                                                <ParametricSlider icon={<Radio size={14} />} label="Уровень РЭБ / АФАР" value={stats.techLevel} min={1} max={10} step={1} unit="LVL" onChange={(v) => setStats({ ...stats, techLevel: v })} color="text-purple-500" />
                                            </>
                                        )}
                                        {stats.type === 'air_defense' && (
                                            <>
                                                <ParametricSlider icon={<Radio size={14} />} label="Дальность Радара" value={stats.radarRangeKm} min={10} max={1000} step={10} unit="км" onChange={(v) => setStats({ ...stats, radarRangeKm: v })} color="text-blue-500" />
                                                <ParametricSlider icon={<Target size={14} />} label="Дальность Перехвата" value={stats.interceptRangeKm} min={5} max={800} step={5} unit="км" onChange={(v) => setStats({ ...stats, interceptRangeKm: v })} color="text-red-500" />
                                                <ParametricSlider icon={<Zap size={14} />} label="Скорость ЗУР" value={stats.missileSpeedMach} min={1.0} max={20.0} step={0.1} unit="Мах" onChange={(v) => setStats({ ...stats, missileSpeedMach: v })} color="text-amber-500" />
                                                <ParametricSlider icon={<Target size={14} />} label="Канальность (Целей)" value={stats.targetChannels} min={1} max={100} step={1} unit="шт" onChange={(v) => setStats({ ...stats, targetChannels: v })} color="text-cyan-500" />
                                                <ParametricSlider icon={<Zap size={14} />} label="Время развертывания" value={stats.deployTimeMin} min={1} max={60} step={1} unit="мин" onChange={(v) => setStats({ ...stats, deployTimeMin: v })} color="text-emerald-500" />
                                                <ParametricSlider icon={<BrainCircuit size={14} />} label="Помехозащищенность" value={stats.techLevel} min={1} max={10} step={1} unit="LVL" onChange={(v) => setStats({ ...stats, techLevel: v })} color="text-purple-500" />
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Active Modules */}
                                {['ground', 'aircraft'].includes(stats.type) && (
                                    <>
                                        <div className="h-px bg-white/5 mt-6 mb-4" />
                                        <div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <Shield size={14} className="text-tactical-accent" />
                                                <h3 className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">Дополнительные Модули (Loadout)</h3>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {stats.type === 'ground' && (
                                                    <>
                                                        <ModuleCheckbox
                                                            id="era"
                                                            label="ДЗ (Реликт/Контакт)"
                                                            desc="+30% к экв. брони"
                                                            active={modules.includes('era')}
                                                            onChange={(c) => setModules(prev => c ? [...prev, 'era'] : prev.filter(m => m !== 'era'))}
                                                        />
                                                        <ModuleCheckbox
                                                            id="aps"
                                                            label="КАЗ (Арена/Trophy)"
                                                            desc="Перехват угрозы +10% ОБС"
                                                            active={modules.includes('aps')}
                                                            onChange={(c) => setModules(prev => c ? [...prev, 'aps'] : prev.filter(m => m !== 'aps'))}
                                                        />
                                                    </>
                                                )}
                                                {stats.type === 'aircraft' && (
                                                    <>
                                                        <ModuleCheckbox
                                                            id="stealth"
                                                            label="Stealth Mode"
                                                            desc="Вн. отсеки: ЭПР -80%, Дальность ракет -20%"
                                                            active={modules.includes('stealth')}
                                                            onChange={(c) => setModules(prev => c ? [...prev, 'stealth'] : prev.filter(m => m !== 'stealth'))}
                                                        />
                                                        <ModuleCheckbox
                                                            id="beast"
                                                            label="Beast Mode"
                                                            desc="Пилоны: ЭПР +400%, Дальность ракет +30%"
                                                            active={modules.includes('beast')}
                                                            onChange={(c) => setModules(prev => c ? [...prev, 'beast'] : prev.filter(m => m !== 'beast'))}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                            </div>

                            {/* Footer / Results */}
                            <div className="p-6 bg-slate-950/80 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                                        Сводный ОБС:
                                    </div>
                                    <div className="text-2xl font-black font-mono text-tactical-primary drop-shadow-[0_0_10px_var(--color-tactical-primary)]">
                                        {potential.toFixed(2)}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={!name.trim()}
                                    className="px-6 py-3 bg-tactical-primary hover:bg-tactical-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black tracking-widest text-xs rounded-md transition-all duration-300 shadow-xl shadow-tactical-primary/20 flex items-center gap-2"
                                >
                                    <Plus size={16} /> ДОБАВИТЬ В АРСЕНАЛ
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function ParametricSlider({ icon, label, value, min, max, step, unit, onChange, color }: { icon: React.ReactNode, label: string, value: number, min: number, max: number, step: number, unit: string, onChange: (v: number) => void, color: string }) {
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 opacity-80">
                    <span className={color}>{icon}</span>
                    <span className="text-[10px] text-slate-300 font-mono uppercase tracking-widest">{label}</span>
                </div>
                <div className="text-xs font-black font-mono tracking-tighter text-white">
                    {value} <span className="text-[9px] text-slate-500 font-normal">{unit}</span>
                </div>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className={cn("w-full h-1.5 rounded-full appearance-none outline-none bg-slate-800 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full", color.replace('text-', '[&::-webkit-slider-thumb]:bg-'))}
            />
        </div>
    );
}

function ModuleCheckbox({ id, label, desc, active, onChange }: { id: string, label: string, desc: string, active: boolean, onChange: (c: boolean) => void }) {
    return (
        <label className={cn(
            "flex flex-col p-3 rounded-lg border focus-within:ring-1 focus-within:ring-tactical-primary transition-all cursor-pointer relative overflow-hidden",
            active ? "bg-tactical-primary/10 border-tactical-primary/40" : "bg-slate-950/50 border-white/5 hover:border-white/10 hover:bg-white/5"
        )}>
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => onChange(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-sm accent-tactical-primary bg-slate-900 border-white/20"
                />
                <span className={cn("text-[10px] uppercase font-black tracking-widest", active ? "text-tactical-primary" : "text-slate-300")}>{label}</span>
            </div>
            <span className="text-[8px] mt-1 ml-5.5 text-slate-500 font-mono pointer-events-none">{desc}</span>
            {active && <div className="absolute top-0 right-0 w-8 h-8 bg-tactical-primary/20 rounded-bl-full blur-md" />}
        </label>
    );
}
