"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react';import { motion, AnimatePresence } from 'framer-motion';import { Activity, Crosshair, Radio, Settings, Trash2, AlertTriangle, MoveUpRight } from 'lucide-react';import { ARSENAL, MODIFIERS, IconType } from '@/lib/unit-database';
import { RBPEngine, ActiveUnit, FormationType } from '@/lib/rbp-engine';
import { cn } from '@/lib/utils';
import { TRANSLATIONS } from '@/lib/i18n';
import HolographicMap from './HolographicMap';
import CustomUnitBuilder from './CustomUnitBuilder';
import { MilitaryUnitIcon } from './icons/StrategicIcons';
import ComparisonMatrix from './ComparisonMatrix';

// Premium tactical unit icon wrapper used across the tactical HUD.
export const TacticalUnitIcon = ({ type, side, size = 32 }: { type: IconType, side: string, size?: number }) => (
    <MilitaryUnitIcon type={type} side={side} size={size} />
);

const UnitMarker = React.memo(({ u, isSelected, onSelect, onDoubleClick, registerNode }: { u: ActiveUnit, isSelected: boolean, onSelect: (event: React.MouseEvent<HTMLDivElement>) => void, onDoubleClick?: () => void, registerNode: (id: string, node: HTMLDivElement | null) => void }) => {
    // Initial static values (will be immediately taken over by 60FPS DOM manipulation loop)
    const initialRot = Math.atan2(u.vy, u.vx) * (180 / Math.PI) + 90;

    return (
        <div
            ref={(node) => registerNode(u.id, node)}
            data-testid="unit-marker"
            style={{
                left: `${u.lon}%`,
                top: `${u.lat}%`
            }}
            className="absolute pointer-events-auto will-change-[left,top]"
            onClick={(e) => {
                e.stopPropagation();
                onSelect(e);
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                if (onDoubleClick) onDoubleClick();
            }}
        >
            <div className="relative -translate-x-1/2 -translate-y-1/2">
                {/* Selection Ring */}
                {isSelected && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: 0.4 }}
                        className="absolute inset-0 rounded-full border-2 border-tactical-primary animate-pulse z-[-1]"
                        style={{ margin: '-10px' }}
                    />
                )}

                <div
                    id={`unit-rot-${u.id}`}
                    style={{
                        '--rot': `${initialRot}deg`,
                        transform: `rotate(var(--rot)) scale(${isSelected ? 1.2 : 1})`,
                        transition: 'transform 0.1s linear'
                    } as React.CSSProperties}
                    className={cn(
                        "drop-shadow-[0_0_15px_currentColor] cursor-pointer",
                        u.unit.side === 'NATO' ? "text-tactical-nato" :
                            u.unit.side === 'RUS' ? "text-tactical-rus" :
                                "text-tactical-china",
                        isSelected && "brightness-150"
                    )}
                >
                    <TacticalUnitIcon type={u.unit.iconType} side={u.unit.side} size={40} />
                </div>

                {/* Tactical Data Label */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none whitespace-nowrap min-w-[80px]">
                    <div className="bg-slate-950/90 px-2 py-0.5 rounded-sm border border-white/10 text-[9px] font-black uppercase text-white/90 backdrop-blur-md shadow-2xl flex items-center gap-1.5">
                        <span className="opacity-50 font-mono">{u.unit.country}</span>
                        <span className="w-px h-2 bg-white/20" />
                        {u.unit.displayName || u.unit.name}
                    </div>
                    {u.targetId && (
                        <div className="mt-1 flex items-center gap-1 bg-tactical-accent/10 px-1.5 py-0.5 rounded-full border border-tactical-accent/30">
                            <AlertTriangle size={8} className="text-tactical-accent" />
                            <span className="text-[7px] text-tactical-accent font-black tracking-widest animate-pulse italic">ЗАХВАТ ЦЕЛИ</span>
                        </div>
                    )}
                </div>

                {/* Engagement Indicator */}
                {u.targetId && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-current opacity-20 rounded-full animate-ping pointer-events-none" />
                )}
            </div>
        </div>
    );
});
UnitMarker.displayName = "UnitMarker";

function isWeatherKey(value: string): value is keyof typeof MODIFIERS.weather {
    return value in MODIFIERS.weather;
}

function isEwKey(value: string): value is keyof typeof MODIFIERS.ew {
    return value in MODIFIERS.ew;
}

export default function TacticalHUD() {
    const [engine] = useState(() => new RBPEngine());
    const [activeUnits, setActiveUnits] = useState<ActiveUnit[]>([]);
    const [summary, setSummary] = useState({ NATO: 0, RUS: 0, CHINA: 0 });
    const [weather, setWeather] = useState<keyof typeof MODIFIERS.weather>('Clear');
    const [ew, setEw] = useState<keyof typeof MODIFIERS.ew>('None');
    const [selectedUnit, setSelectedUnit] = useState<string>(Object.keys(ARSENAL)[0]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);
    const [selectedFormation, setSelectedFormation] = useState<FormationType | undefined>(undefined); // undefined = auto
    const [deployQuantity, setDeployQuantity] = useState<number>(1);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [isMatrixOpen, setIsMatrixOpen] = useState(false);
    const [time, setTime] = useState(new Date());
    const [logs, setLogs] = useState<{ id: string, text: string, type: 'info' | 'warn' | 'crit', time: string }[]>([]);

    const addLog = React.useCallback((text: string, type: 'info' | 'warn' | 'crit' = 'info') => {
        setLogs(prev => [{
            id: Math.random().toString(36).substr(2, 9),
            text,
            type,
            time: new Date().toLocaleTimeString('ru-RU', { hour12: false })
        }, ...prev].slice(0, 50));
    }, []);

    const requestRef = useRef<number>(null);
    const prevTargetsRef = useRef<Record<string, string | undefined>>({});
    const markerRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Callback to register Marker DOM nodes for direct 60 FPS manipulation
    const registerNode = React.useCallback((id: string, node: HTMLDivElement | null) => {
        if (node) {
            markerRefs.current[id] = node;
        } else {
            delete markerRefs.current[id];
        }
    }, []);

    const t = TRANSLATIONS;

    // Grouping units for the asset list
    const groupedUnits = useMemo(() => {
        const groups: Record<string, ActiveUnit[]> = {};
        activeUnits.forEach(u => {
            const country = t.countries[u.unit.country as keyof typeof t.countries] || u.unit.country;
            if (!groups[country]) groups[country] = [];
            groups[country].push(u);
        });
        return groups;
    }, [activeUnits, t]);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const lastTimeRef = useRef<number>(0);
    const lastRenderTickRef = useRef<number>(0);

    useEffect(() => {
        const tick = (time: number) => {
            if (lastTimeRef.current === 0) {
                lastTimeRef.current = time;
            }
            const dt = time - lastTimeRef.current;
            lastTimeRef.current = time;
            engine.stepSimulation(dt);
            const overview = engine.getOverview();

            // 60 FPS Direct DOM Manipulation (Bypasses React)
            overview.units.forEach(u => {
                const node = markerRefs.current[u.id];
                if (node) {
                    node.style.left = `${u.lon}%`;
                    node.style.top = `${u.lat}%`;

                    const rotNode = node.querySelector(`#unit-rot-${u.id}`) as HTMLDivElement;
                    if (rotNode) {
                        const targetRot = Math.atan2(u.vy, u.vx) * (180 / Math.PI) + 90;
                        rotNode.style.setProperty('--rot', `${targetRot}deg`);
                    }
                }
            });

            // Throttle React State Updates to ~10 FPS
            if (time - lastRenderTickRef.current > 100) {
                lastRenderTickRef.current = time;

                // Detect new target locks for logging
                overview.units.forEach(u => {
                    const prevTargetId = prevTargetsRef.current[u.id];
                    if (u.targetId && prevTargetId !== u.targetId) {
                        const target = overview.units.find(t => t.id === u.targetId);
                        if (target) {
                            addLog(`ЗАХВАТ: ${u.unit.displayName} -> ${target.unit.displayName}`, 'warn');
                        }
                    }
                    prevTargetsRef.current[u.id] = u.targetId;
                });

                setActiveUnits([...overview.units]);
                setSummary({ NATO: overview.NATO, RUS: overview.RUS, CHINA: overview.CHINA });
            }

            requestRef.current = requestAnimationFrame(tick);
        };

        requestRef.current = requestAnimationFrame(tick);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [engine, addLog]);

    const updateSystem = React.useCallback((nextWeather: keyof typeof MODIFIERS.weather = weather, nextEw: keyof typeof MODIFIERS.ew = ew) => {
        engine.setWeather(nextWeather);
        engine.setEW(nextEw);
        const overview = engine.getOverview();
        setSummary({ NATO: overview.NATO, RUS: overview.RUS, CHINA: overview.CHINA });
        setActiveUnits([...overview.units]);
    }, [engine, weather, ew]);


    const handleDeploy = () => {
        const unit = ARSENAL[selectedUnit];
        const newIds: string[] = [];
        const baseLat = 20 + Math.random() * 60;
        const baseLon = 20 + Math.random() * 60;

        for (let i = 0; i < deployQuantity; i++) {
            const lat = baseLat + (Math.random() - 0.5) * (deployQuantity > 1 ? 2 : 0);
            const lon = baseLon + (Math.random() - 0.5) * (deployQuantity > 1 ? 2 : 0);
            const id = engine.addUnit(unit, lat, lon);
            newIds.push(id);
        }

        addLog(`РАЗВЕРНУТЫ: ${unit.displayName} x${deployQuantity} [${baseLat.toFixed(1)}, ${baseLon.toFixed(1)}]`, 'info');
        setSelectedIds(prev => [...new Set([...prev, ...newIds])]);
    };

    const mapRef = useRef<HTMLDivElement>(null);

    const handleMapMouseDown = (e: React.MouseEvent) => {
        if (!mapRef.current) return;
        const rect = mapRef.current.getBoundingClientRect();
        const startX = ((e.clientX - rect.left) / rect.width) * 100;
        const startY = ((e.clientY - rect.top) / rect.height) * 100;
        setSelectionBox({ startX, startY, currentX: startX, currentY: startY });
    };

    const handleMapMouseMove = (e: React.MouseEvent) => {
        if (!selectionBox || !mapRef.current) return;
        const rect = mapRef.current.getBoundingClientRect();
        const currentX = ((e.clientX - rect.left) / rect.width) * 100;
        const currentY = ((e.clientY - rect.top) / rect.height) * 100;
        setSelectionBox(prev => prev ? { ...prev, currentX, currentY } : null);
    };

    const handleMapMouseUp = (e: React.MouseEvent) => {
        if (!selectionBox) return;

        // Selection logic
        const x1 = Math.min(selectionBox.startX, selectionBox.currentX);
        const y1 = Math.min(selectionBox.startY, selectionBox.currentY);
        const x2 = Math.max(selectionBox.startX, selectionBox.currentX);
        const y2 = Math.max(selectionBox.startY, selectionBox.currentY);

        const isClick = Math.abs(selectionBox.startX - selectionBox.currentX) < 0.5 &&
            Math.abs(selectionBox.startY - selectionBox.currentY) < 0.5;

        if (isClick) {
            // Map click => assign formation (group) or single waypoint
            if (selectedIds.length > 1) {
                engine.assignFormation(selectedIds, selectionBox.startX, selectionBox.startY, selectedFormation);
                const firstUnit = activeUnits.find(u => u.id === selectedIds[0]);
                const formationLabel = selectedFormation ?? 'AUTO';
                addLog(`ПОСТРОЕНИЕ [${formationLabel}]: ${firstUnit?.unit.displayName} +${selectedIds.length - 1} -> [${selectionBox.startX.toFixed(0)}, ${selectionBox.startY.toFixed(0)}]`, 'info');
            } else if (selectedIds.length === 1) {
                engine.setWaypoint(selectedIds[0], selectionBox.startX, selectionBox.startY);
                const firstUnit = activeUnits.find(u => u.id === selectedIds[0]);
                addLog(`МАРШРУТ: ${firstUnit?.unit.displayName} -> [${selectionBox.startX.toFixed(0)}, ${selectionBox.startY.toFixed(0)}]`, 'info');
            } else {
                setSelectedIds([]);
            }
        } else {
            // Box selection
            const newlySelected = activeUnits
                .filter(u => u.lon >= x1 && u.lon <= x2 && u.lat >= y1 && u.lat <= y2)
                .map(u => u.id);

            if (e.shiftKey) {
                setSelectedIds(prev => [...new Set([...prev, ...newlySelected])]);
            } else {
                setSelectedIds(newlySelected);
            }
        }
        setSelectionBox(null);
    };

    const removeUnit = (id: string) => {
        engine.removeUnit(id);
        updateSystem();
    };

    return (
        <div className="relative h-screen w-screen bg-tactical-bg flex overflow-hidden font-sans text-slate-100 selection:bg-tactical-primary/30">
            {/* HolographicMap is now inside the main content area */}

            {/* Vignette Overlay (Animated Flicker) */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_200px_oklch(0%_0_0_/_80%)] z-10 animate-flicker" />

            {/* TOP HEADER BAR */}
            <header className="absolute top-0 left-0 right-0 h-16 glass-panel z-50 flex items-center justify-between px-8 border-b border-white/5 tactical-corner bl br">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-tactical-primary/10 rounded-sm">
                            <Radio className="w-4 h-4 text-tactical-primary animate-flicker" />
                        </div>
                        <span className="font-black tracking-[.25em] text-lg uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-tactical-primary via-tactical-secondary to-tactical-accent">
                            {t.header.title}
                        </span>
                    </div>
                    <div className="h-6 w-px bg-white/10" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-mono tracking-wider">{t.header.status}</span>
                        <span className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> {t.header.live_feed}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-8 font-mono">
                    <div className="text-right">
                        <div className="text-[9px] text-slate-500 italic tracking-widest">{t.header.coord_precision}</div>
                        <div className="text-[10px] text-tactical-primary font-bold">WGS-84 / GLONASS-M</div>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div className="text-right">
                        <div className="text-[10px] text-slate-400">{time.toLocaleDateString('ru-RU')}</div>
                        <div className="text-xl font-black text-white tabular-nums tracking-tighter tabular-nums">
                            {time.toLocaleTimeString('ru-RU')}
                        </div>
                    </div>
                </div>
            </header>

            {/* MAIN HUD LAYOUT */}
            <div className="flex-1 mt-16 flex overflow-hidden relative z-20">

                {/* LEFT: ASSET CONTROL & GROUPED LIST */}
                <nav className="w-80 glass-panel border-r border-white/5 flex flex-col p-6 z-40 bg-slate-950/20">
                    <div className="mb-6 space-y-4">
                        <h2 className="text-[10px] font-bold text-tactical-primary mb-4 tracking-[.3em] uppercase opacity-70 flex items-center gap-2">
                            <MoveUpRight size={12} /> {t.deployment.title}
                        </h2>
                        <div className="space-y-4 bg-white/5 p-4 rounded-lg border border-white/5 backdrop-blur-md relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-tactical-primary/50" />
                            <div className="flex gap-2">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[9px] text-slate-500 font-mono uppercase tracking-[.1em]">{t.deployment.platform_type}</label>
                                    <select
                                        className="w-full bg-slate-950/80 border border-white/10 text-xs p-2.5 rounded-md outline-none focus:border-tactical-primary/50 transition-all text-slate-200"
                                        value={selectedUnit}
                                        onChange={(e) => setSelectedUnit(e.target.value)}
                                    >
                                        {Object.entries(ARSENAL).map(([id, info]) => (
                                            <option key={id} value={id}>
                                                [{info.country}] {info.displayName || id}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-16 space-y-1">
                                    <label className="text-[9px] text-slate-500 font-mono uppercase tracking-[.1em]">МАСШ.</label>
                                    <select
                                        className="w-full bg-slate-950/80 border border-white/10 text-xs p-2.5 rounded-md outline-none focus:border-tactical-primary/50 transition-all text-tactical-primary font-bold shadow-inner"
                                        value={deployQuantity}
                                        onChange={(e) => setDeployQuantity(Number(e.target.value))}
                                    >
                                        <option value={1}>x1</option>
                                        <option value={5}>x5</option>
                                        <option value={10}>x10</option>
                                        <option value={20}>x20</option>
                                        <option value={50}>x50</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                onClick={handleDeploy}
                                data-testid="deploy-button"
                                className="w-full py-3 bg-tactical-primary hover:bg-tactical-primary/90 text-black font-black tracking-widest text-xs rounded-md transition-all duration-300 active:scale-[0.98] shadow-[0_0_15px_rgba(0,168,255,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Crosshair size={14} /> {t.deployment.deploy_btn}
                            </button>

                            <button
                                onClick={() => setIsBuilderOpen(true)}
                                className="w-full py-2 bg-transparent hover:bg-white/5 border border-white/10 text-tactical-primary font-bold tracking-widest text-[9px] rounded-md transition-all duration-300 uppercase flex items-center justify-center gap-2"
                            >
                                + Создать Кастомный Юнит
                            </button>

                            <button
                                onClick={() => setIsMatrixOpen(true)}
                                className="w-full py-2 bg-transparent hover:bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent font-bold tracking-widest text-[9px] rounded-md transition-all duration-300 uppercase flex items-center justify-center gap-2 mt-2 shadow-[0_0_10px_rgba(234,179,8,0.1)]"
                            >
                                <Activity size={12} /> Аналитика (Сравнение)
                            </button>

                            {/* Formation Selector — only shown when 2+ units selected */}
                            {selectedIds.length > 1 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-px flex-1 bg-white/10" />
                                        <span className="text-[8px] font-black tracking-widest text-tactical-primary opacity-60 uppercase">Построение</span>
                                        <div className="h-px flex-1 bg-white/10" />
                                    </div>
                                    <div className="grid grid-cols-5 gap-1">
                                        {([undefined, 'LINE', 'WEDGE', 'COLUMN', 'DIAMOND'] as (FormationType | undefined)[]).map((f) => {
                                            const label = f ?? 'AUTO';
                                            const icons: Record<string, string> = {
                                                AUTO: '⚡', LINE: '═══', WEDGE: '▽', COLUMN: '┃', DIAMOND: '◇'
                                            };
                                            const isActive = selectedFormation === f;
                                            return (
                                                <button
                                                    key={label}
                                                    onClick={() => setSelectedFormation(f)}
                                                    title={label}
                                                    className={cn(
                                                        'py-1.5 rounded text-[8px] font-black tracking-tight transition-all border flex flex-col items-center gap-0.5 cursor-pointer',
                                                        isActive
                                                            ? 'bg-tactical-primary text-black border-tactical-primary'
                                                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-tactical-primary/50 hover:text-tactical-primary'
                                                    )}
                                                >
                                                    <span className="text-xs">{icons[label]}</span>
                                                    <span>{label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h2 className="text-[10px] font-bold text-slate-500 tracking-[.2em] uppercase">{t.deployment.active_assets}</h2>
                            <div className="h-4 px-2 bg-white/5 rounded text-[10px] font-mono text-tactical-primary border border-white/5 flex items-center">
                                {activeUnits.length}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                            <AnimatePresence initial={false}>
                                {Object.entries(groupedUnits).map(([country, units]) => (
                                    <div key={country} className="space-y-2">
                                        <div className="flex items-center gap-2 opacity-50">
                                            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                            <span className="text-[9px] font-black tracking-tighter whitespace-nowrap">{country}</span>
                                        </div>
                                        {units.map(u => (
                                            <motion.div
                                                key={u.id}
                                                initial={{ x: -10, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                exit={{ x: -20, opacity: 0 }}
                                                onClick={(e) => {
                                                    if (e.shiftKey) {
                                                        setSelectedIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                                                    } else {
                                                        setSelectedIds([u.id]);
                                                    }
                                                }}
                                                className={cn(
                                                    "p-3 rounded-md glass-panel flex items-center justify-between group transition-all duration-300 hover:bg-white/10 border-l-2 cursor-pointer relative",
                                                    u.unit.side === 'RUS' ? "border-tactical-rus" : u.unit.side === 'NATO' ? "border-tactical-nato" : "border-tactical-china",
                                                    selectedIds.includes(u.id) && "bg-tactical-primary/10 ring-1 ring-tactical-primary/30"
                                                )}
                                            >
                                                {selectedIds.includes(u.id) && (
                                                    <div className="absolute top-0 right-0 p-1">
                                                        <div className="w-1 h-1 rounded-full bg-tactical-primary animate-ping" />
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3">
                                                    <TacticalUnitIcon type={u.unit.iconType} side={u.unit.side} size={20} />
                                                    <div>
                                                        <p className="text-[10px] font-bold tracking-tight text-slate-200">{u.unit.displayName || u.unit.name}</p>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <p className="text-[7px] font-mono text-slate-500 uppercase leading-none">{t.icons[u.unit.iconType]}</p>
                                                            {u.unitState === 'FORMATION' && (
                                                                <span className="text-[6px] font-black tracking-widest text-tactical-primary bg-tactical-primary/10 px-1 rounded uppercase">
                                                                    {u.formationType ?? '◇'}
                                                                </span>
                                                            )}
                                                            {u.unitState === 'MOVING' && (
                                                                <span className="text-[6px] font-black tracking-widest text-tactical-secondary bg-tactical-secondary/10 px-1 rounded uppercase animate-pulse">
                                                                    ▶ ДВИЖ
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeUnit(u.id)} className="p-1.5 text-slate-600 hover:text-tactical-accent transition-all opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={12} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* INTEL CARD - COMBAT POTENTIAL CALCULATOR */}
                        <AnimatePresence>
                            {selectedIds.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="mt-4 shrink-0 bg-slate-950/80 border border-tactical-primary/30 rounded-lg p-4 shadow-[0_0_20px_rgba(0,168,255,0.1)] relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-tactical-primary" />

                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <Crosshair size={12} className="text-tactical-primary animate-flicker" />
                                        <h3 className="text-[9px] font-black tracking-[0.2em] text-tactical-primary uppercase">Боевой Анализ (Intel)</h3>
                                    </div>

                                    {(() => {
                                        const units = activeUnits.filter(u => selectedIds.includes(u.id));
                                        if (units.length === 0) return null;

                                        const primary = units[0];
                                        let basePotential = 0;
                                        let effectivePotential = 0;
                                        const roles = new Set<string>();
                                        let isAirOnly = true;
                                        let isGroundOnly = true;

                                        units.forEach(u => {
                                            basePotential += u.unit.potential * u.quantity;
                                            effectivePotential += u.potential;
                                            roles.add(u.unit.iconType);
                                            if (u.unit.category !== 'aircraft') isAirOnly = false;
                                            if (u.unit.category !== 'ground') isGroundOnly = false;
                                        });

                                        const penalty = basePotential - effectivePotential;
                                        const penaltyPercent = basePotential > 0 ? (penalty / basePotential) * 100 : 0;

                                        let groupRole = "Смешанная группа (Mixed)";
                                        if (isAirOnly) groupRole = roles.has('Bomber') ? "Ударная авиация (Strike)" : (roles.has('AWACS') ? "ДРЛО / Разведка (Recon)" : "Превосходство в воздухе (Air Superiority)");
                                        if (isGroundOnly) groupRole = roles.has('MBT') ? "Тяжелый штурм (Heavy Assault)" : (roles.has('SPG') ? "Артиллерийская поддержка (Arty)" : "Механизированная пехота (Mech Inf)");
                                        if (roles.has('SAM')) groupRole = "Противовоздушная Оборона (IADS)";

                                        return (
                                            <div className="space-y-3 px-1">
                                                <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                                    <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">Тактическая Роль</span>
                                                    <span className="text-[10px] font-bold text-slate-200">{groupRole}</span>
                                                </div>

                                                {/* SIMULATION-GRADE: Unit Status for primary selected unit */}
                                                <div className="grid grid-cols-3 gap-2 bg-black/40 p-2 rounded border border-white/5">
                                                    <div className="flex flex-col items-center" data-testid="fuel-stat">
                                                        <span className="text-[7px] text-slate-500 uppercase font-mono">Fuel</span>
                                                        <div className="text-[10px] font-bold text-tactical-primary" data-testid="fuel-value">
                                                            {((primary.logistics.state.fuel.current / primary.logistics.state.fuel.capacity) * 100).toFixed(0)}%
                                                        </div>
                                                        <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                                                            <div className="h-full bg-tactical-primary" style={{ width: `${(primary.logistics.state.fuel.current / primary.logistics.state.fuel.capacity) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-center" data-testid="wear-stat">
                                                        <span className="text-[7px] text-slate-500 uppercase font-mono">Wear</span>
                                                        <div className="text-[10px] font-bold text-tactical-accent" data-testid="wear-value">
                                                            {primary.logistics.state.maintenance.wear.toFixed(1)}%
                                                        </div>
                                                        <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                                                            <div className="h-full bg-tactical-accent" style={{ width: `${primary.logistics.state.maintenance.wear}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-center" data-testid="crew-stat">
                                                        <span className="text-[7px] text-slate-500 uppercase font-mono">Crew</span>
                                                        <div className="text-[10px] font-bold text-slate-200" data-testid="crew-value">
                                                            {(primary.logistics.state.crew.fatigue * 100).toFixed(0)}%
                                                        </div>
                                                        <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                                                            <div className="h-full bg-slate-400" style={{ width: `${primary.logistics.state.crew.fatigue * 100}%` }} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <div className="text-[8px] text-slate-500 font-mono tracking-widest uppercase mb-1">Базовая Мощь</div>
                                                        <div className="text-lg font-black font-mono text-slate-400">{basePotential.toFixed(1)}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[8px] text-slate-500 font-mono tracking-widest uppercase mb-1">Среда / РЭБ</div>
                                                        <div className={cn("text-xs font-bold font-mono", penaltyPercent > 0 ? "text-tactical-accent" : "text-slate-500")}>
                                                            {penaltyPercent > 0 ? `-${penaltyPercent.toFixed(0)}% ЭФФ.` : "ОПТИМАЛЬНО"}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-tactical-primary/10 rounded p-2 border border-tactical-primary/20 flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-tactical-primary tracking-widest uppercase">ИТОГО (ОБС)</span>
                                                    <span className="text-2xl font-black font-mono text-tactical-primary tracking-tighter drop-shadow-[0_0_8px_var(--color-tactical-primary)]">
                                                        {effectivePotential.toFixed(1)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </nav>

                {/* CENTER: THEATER VIEW */}
                <main className="flex-1 p-8 overflow-hidden relative">
                    <div className="w-full h-full relative rounded-3xl overflow-hidden bg-slate-900/10 border border-white/5 backdrop-blur-[2px]">
                        {/* HUD Coordinate Frame */}
                        <div className="absolute inset-4 border border-white/5 pointer-events-none z-10">
                            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-tactical-primary" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-tactical-primary" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-tactical-primary" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-tactical-primary" />
                        </div>

                        {/* Combat Units - NO CONTAINERS, SMOOTH PHYSICS */}
                        <div
                            className="relative w-full h-full cursor-crosshair overflow-hidden group/map"
                            ref={mapRef}
                            onMouseDown={handleMapMouseDown}
                            onMouseMove={handleMapMouseMove}
                            onMouseUp={handleMapMouseUp}
                        >
                            <HolographicMap units={activeUnits} />

                            {/* Selection Box UI */}
                            {selectionBox && (
                                <div
                                    className="absolute border border-tactical-accent bg-tactical-accent/10 pointer-events-none z-50"
                                    style={{
                                        left: `${Math.min(selectionBox.startX, selectionBox.currentX)}%`,
                                        top: `${Math.min(selectionBox.startY, selectionBox.currentY)}%`,
                                        width: `${Math.abs(selectionBox.startX - selectionBox.currentX)}%`,
                                        height: `${Math.abs(selectionBox.startY - selectionBox.currentY)}%`,
                                    }}
                                />
                            )}

                            {/* Waypoint Path Visualization */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                                {activeUnits.map(u => {
                                    if (u.waypoints.length === 0) return null;
                                    const isSelected = selectedIds.includes(u.id);
                                    if (!isSelected) return null; // Only show paths for selected units for clarity

                                    return (
                                        <g key={`path-${u.id}`}>
                                            <motion.line
                                                x1={`${u.lon}%`}
                                                y1={`${u.lat}%`}
                                                x2={`${u.waypoints[0].x}%`}
                                                y2={`${u.waypoints[0].y}%`}
                                                stroke="var(--tactical-accent)"
                                                strokeWidth="0.5"
                                                strokeDasharray="2,2"
                                                initial={{ pathLength: 0, opacity: 0 }}
                                                animate={{ pathLength: 1, opacity: 0.4 }}
                                            />
                                            <circle
                                                cx={`${u.waypoints[0].x}%`}
                                                cy={`${u.waypoints[0].y}%`}
                                                r="1.5"
                                                fill="var(--tactical-accent)"
                                                className="animate-pulse"
                                            />
                                        </g>
                                    );
                                })}
                            </svg>

                            {activeUnits.map(u => (
                                <UnitMarker
                                    key={u.id}
                                    u={u}
                                    isSelected={selectedIds.includes(u.id)}
                                    registerNode={registerNode}
                                    onSelect={(event) => {
                                        if (event.shiftKey) {
                                            setSelectedIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                                        } else {
                                            setSelectedIds([u.id]);
                                        }
                                    }}
                                    onDoubleClick={() => {
                                        // Select all units of the identical name
                                        const sameTypeIds = activeUnits.filter(unit => unit.unit.name === u.unit.name).map(unit => unit.id);
                                        setSelectedIds(sameTypeIds);
                                        addLog(`ВЫДЕЛЕНЫ: Все ${u.unit.displayName} (${sameTypeIds.length} ед.)`, 'info');
                                    }}
                                />
                            ))}
                        </div>

                        {/* Combat Visual Effects */}
                        <VisualCombatFX units={activeUnits} />
                    </div>
                </main>

                {/* RIGHT: SYSTEM STATUS */}
                <aside className="w-80 glass-panel border-l border-white/5 flex flex-col p-4 z-40 gap-4">
                    <div className="space-y-4">
                        <h2 className="text-[10px] font-bold text-slate-500 tracking-[.3em] uppercase mb-4 flex items-center gap-2">
                            <Activity size={12} className="text-tactical-primary animate-pulse" /> {t.summary.title}
                        </h2>
                        <div className="space-y-4">
                            <PotentialIndicator side={t.summary.nato} value={summary.NATO} color="text-tactical-nato" barColor="bg-tactical-nato" glowColor="var(--color-tactical-nato)" />
                            <PotentialIndicator side={t.summary.rus} value={summary.RUS} color="text-tactical-rus" barColor="bg-tactical-rus" glowColor="var(--color-tactical-rus)" />
                            <PotentialIndicator side={t.summary.china} value={summary.CHINA} color="text-tactical-china" barColor="bg-tactical-china" glowColor="var(--color-tactical-china)" />
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    <div className="space-y-4">
                        <h2 className="text-[10px] font-bold text-slate-500 tracking-[.3em] uppercase flex items-center gap-2 px-1">
                            <Settings size={12} className="text-tactical-primary" /> {t.environment.title}
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[8px] text-slate-600 font-mono uppercase tracking-widest ml-1">{t.environment.atmospherics}</label>
                                <select
                                    data-testid="weather-select"
                                    className="mt-1 w-full bg-slate-950/80 border border-white/5 text-[10px] p-2 rounded-md outline-none text-tactical-primary font-bold shadow-inner"
                                    value={weather}
                                    onChange={(e) => { if (isWeatherKey(e.target.value)) { setWeather(e.target.value); updateSystem(e.target.value, ew); } }}
                                >
                                    {Object.keys(MODIFIERS.weather).map(w => <option key={w} value={w}>{t.weather[w as keyof typeof t.weather]}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[8px] text-slate-600 font-mono uppercase tracking-widest ml-1">{t.environment.interference}</label>
                                <select
                                    data-testid="ew-select"
                                    className="mt-1 w-full bg-slate-950/80 border border-white/5 text-[10px] p-2 rounded-md outline-none text-tactical-accent font-bold shadow-inner"
                                    value={ew}
                                    onChange={(e) => { if (isEwKey(e.target.value)) { setEw(e.target.value); updateSystem(weather, e.target.value); } }}
                                >
                                    {Object.keys(MODIFIERS.ew).map(e => <option key={e} value={e}>{t.ew[e as keyof typeof t.ew]}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* TACTICAL LOG */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <h2 className="text-[10px] font-bold text-slate-500 tracking-[.3em] uppercase flex items-center gap-2 mb-2 px-1">
                            <Activity size={12} className="text-tactical-accent animate-pulse" /> TACTICAL_LOG
                        </h2>
                        <div className="flex-1 bg-slate-950/50 border border-white/5 rounded-md p-3 font-mono text-[9px] overflow-y-auto space-y-2 scrollbar-hide select-text">
                            {logs.length === 0 ? (
                                <div className="text-slate-700 italic opacity-50 flex items-center justify-center h-full">
                                    [ОЖИДАНИЕ ДАННЫХ...]
                                </div>
                            ) : (
                                logs.map(log => (
                                    <div key={log.id} className="flex gap-2">
                                        <span className="text-slate-600 font-bold shrink-0">[{log.time}]</span>
                                        <span className={cn(
                                            "leading-normal whitespace-pre-wrap",
                                            log.type === 'crit' ? "text-red-500" :
                                                log.type === 'warn' ? "text-tactical-accent" :
                                                    "text-slate-400"
                                        )}>
                                            {log.text}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="mt-auto space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-950/80 rounded-lg border border-white/5 shadow-2xl">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{t.simulation.threat_level}</span>
                            <span className={cn(
                                "text-xs font-black font-mono px-2 py-0.5 rounded",
                                (summary.RUS / (summary.NATO || 1)) > 1.2 ? "bg-tactical-rus/20 text-tactical-rus animate-pulse" : "bg-green-500/10 text-green-500"
                            )}>
                                {summary.NATO > 0 ? (summary.RUS / summary.NATO).toFixed(2) : "0.00"}X
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <SmallMetric label={t.simulation.scan} val="7.4 THz" />
                            <SmallMetric label={t.simulation.sat} val="ENCRYPT" color="text-tactical-primary" />
                            <SmallMetric label={t.simulation.iff} val={t.simulation.on} color="text-green-500" />
                        </div>
                    </div>
                </aside>
            </div>

            {/* Modals & Overlays */}
            <CustomUnitBuilder
                isOpen={isBuilderOpen}
                onClose={() => setIsBuilderOpen(false)}
                onUnitAdded={(id) => {
                    setSelectedUnit(id);
                    addLog(`Новый юнит добавлен в арсенал: ${ARSENAL[id].displayName}`, 'info');
                }}
            />

            <ComparisonMatrix
                isOpen={isMatrixOpen}
                onClose={() => setIsMatrixOpen(false)}
            />
        </div>
    );
}

function PotentialIndicator({ side, value, color, barColor, glowColor }: { side: string, value: number, color: string, barColor: string, glowColor: string }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end px-1">
                <span className="text-[9px] font-mono text-slate-500 tracking-[0.2em]">{side} ОБС</span>
                <span className={cn("text-xl font-black font-mono italic tracking-tighter", color)}>{value.toFixed(2)}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 p-[1px]">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(value * 10, 100)}%` }}
                    className={cn("h-full rounded-full transition-all duration-1000", barColor)}
                    style={{ boxShadow: `0 0 15px ${glowColor}` }}
                />
            </div>
        </div>
    );
}

function SmallMetric({ label, val, color = "text-slate-400" }: { label: string, val: string, color?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-2 glass-panel border border-white/5 rounded-md bg-white/5">
            <span className="text-[7px] text-slate-600 font-black tracking-widest uppercase">{label}</span>
            <span className={cn("text-[9px] font-mono mt-0.5 font-bold", color)}>{val}</span>
        </div>
    );
}

function VisualCombatFX({ units }: { units: ActiveUnit[] }) {
    return (
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
            <svg className="w-full h-full">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {units.map(u => {
                    if (!u.targetId) return null;
                    const target = units.find(t => t.id === u.targetId);
                    if (!target) return null;

                    return (
                        <motion.line
                            key={`${u.id}-fire`}
                            x1={`${u.lon}%`} y1={`${u.lat}%`}
                            x2={`${target.lon}%`} y2={`${target.lat}%`}
                            stroke={u.unit.side === 'NATO' ? 'var(--color-tactical-nato)' : u.unit.side === 'RUS' ? 'var(--color-tactical-rus)' : 'var(--color-tactical-china)'}
                            strokeWidth="1.2"
                            strokeDasharray="4,12"
                            strokeLinecap="round"
                            filter="url(#glow)"
                            animate={{ strokeDashoffset: [0, -40], opacity: [0.3, 0.7, 0.3] }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            className="opacity-40"
                        />
                    );
                })}
            </svg>
        </div>
    );
}
