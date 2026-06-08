"use client";

import React, { useId } from 'react';
import type { ActiveUnit } from '@/lib/rbp-engine';

export default function HolographicMap({ units = [], c2Nodes = [] }: { units?: ActiveUnit[], c2Nodes?: string[] }) {
    const gid = useId().replace(/:/g, "");

    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none perspective-center">
            <div className="absolute inset-0 tilted-map">
                <div className="absolute inset-0 bg-grid-tactical opacity-20" />
                <div className="absolute inset-0 overflow-hidden">
                    <div className="w-full h-[2px] bg-tactical-primary/30 blur-[2px] shadow-[0_0_15px_var(--color-tactical-primary)] animate-scanline" />
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-tactical-primary)_0%,transparent_70%)] opacity-[0.03] animate-pulse-slow" />

                <svg
                    viewBox="0 0 1000 600"
                    className="absolute inset-0 w-full h-full opacity-40 fill-none stroke-tactical-primary/25 stroke-[0.5]"
                    style={{ filter: 'drop-shadow(0 0 12px var(--color-tactical-primary))' }}
                    aria-hidden="true"
                >
                    <defs>
                        <radialGradient id={`${gid}-map-core`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(500 300) rotate(90) scale(420 620)">
                            <stop stopColor="var(--color-tactical-primary)" stopOpacity="0.13" />
                            <stop offset="0.55" stopColor="var(--color-tactical-primary)" stopOpacity="0.035" />
                            <stop offset="1" stopColor="var(--color-tactical-primary)" stopOpacity="0" />
                        </radialGradient>
                        <linearGradient id={`${gid}-frontline`} x1="120" y1="80" x2="900" y2="520" gradientUnits="userSpaceOnUse">
                            <stop stopColor="var(--color-tactical-primary)" stopOpacity="0.15" />
                            <stop offset="0.48" stopColor="var(--color-tactical-primary)" stopOpacity="0.62" />
                            <stop offset="1" stopColor="var(--color-tactical-primary)" stopOpacity="0.16" />
                        </linearGradient>
                        <filter id={`${gid}-soft-glow`} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    <rect width="1000" height="600" fill={`url(#${gid}-map-core)`} stroke="none" />

                    {/* Holographic terrain plates */}
                    <g strokeWidth="0.8" strokeDasharray="2,5" className="opacity-70" filter={`url(#${gid}-soft-glow)`}>
                        <path d="M145,120 L182,96 L229,106 L262,86 L300,111 L322,151 L292,205 L244,236 L178,214 L143,171 Z" fill="var(--color-tactical-primary)" fillOpacity="0.018" />
                        <path d="M444,99 L552,76 L651,88 L755,108 L860,132 L913,183 L852,255 L701,286 L603,265 L498,242 L443,181 Z" fill="var(--color-tactical-primary)" fillOpacity="0.018" />
                        <path d="M477,300 L551,278 L625,311 L603,451 L520,484 L448,421 Z" fill="var(--color-tactical-primary)" fillOpacity="0.018" />
                        <path d="M257,278 L323,300 L354,382 L300,484 L239,423 L218,318 Z" fill="var(--color-tactical-primary)" fillOpacity="0.018" />
                        <path d="M778,350 L884,369 L906,423 L821,464 L748,431 Z" fill="var(--color-tactical-primary)" fillOpacity="0.018" />
                    </g>

                    {/* Contour / operation grid overlays */}
                    <g opacity="0.45" strokeWidth="0.65">
                        <path d="M95 360 C205 300 284 336 389 288 S632 206 764 274 S889 358 936 310" stroke={`url(#${gid}-frontline)`} strokeDasharray="8 10" />
                        <path d="M80 430 C210 376 314 438 436 379 S638 302 781 363 S891 454 958 398" stroke={`url(#${gid}-frontline)`} strokeDasharray="3 12" opacity="0.55" />
                        <path d="M135 170 C246 211 341 163 462 176 S697 221 870 168" stroke={`url(#${gid}-frontline)`} strokeDasharray="5 8" opacity="0.45" />
                    </g>

                    {/* C2 Network Mesh Visualization */}
                    <g className="stroke-tactical-primary/45 stroke-[0.75] stroke-dasharray-mesh">
                        {units.map(u => {
                            // Simulation of mesh connectivity: draw lines to other units of the same side within range
                            return units
                                .filter(other => other.id !== u.id && other.unit.side === u.unit.side)
                                .filter(other => Math.sqrt((other.lon - u.lon)**2 + (other.lat - u.lat)**2) < 30)
                                .map(other => (
                                    <line key={`${u.id}-${other.id}`} x1={`${u.lon}%`} y1={`${u.lat}%`} x2={`${other.lon}%`} y2={`${other.lat}%`} />
                                ));
                        })}
                    </g>

                    {/* Static C2 node accents */}
                    <g opacity={c2Nodes.length ? 0.75 : 0.35}>
                        {[
                            [160, 150], [286, 385], [516, 329], [702, 181], [825, 404]
                        ].map(([x, y], idx) => (
                            <g key={`${x}-${y}`}>
                                <circle cx={x} cy={y} r="10" stroke="var(--color-tactical-primary)" strokeOpacity="0.28" />
                                <circle cx={x} cy={y} r="2.4" fill="var(--color-tactical-primary)" fillOpacity={idx < c2Nodes.length ? 0.75 : 0.25} stroke="none" />
                                <path d={`M ${x - 14} ${y} h-8 M ${x + 14} ${y} h8 M ${x} ${y - 14} v-8 M ${x} ${y + 14} v8`} stroke="var(--color-tactical-primary)" strokeOpacity="0.25" />
                            </g>
                        ))}
                    </g>
                </svg>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,var(--color-tactical-bg)_100%)] opacity-60 pointer-events-none" />
            </div>
        </div>
    );
}
