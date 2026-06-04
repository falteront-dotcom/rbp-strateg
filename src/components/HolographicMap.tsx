"use client";

import React from 'react';
import { motion } from 'framer-motion';
import type { ActiveUnit } from '@/lib/rbp-engine';

export default function HolographicMap({ units = [], c2Nodes = [] }: { units?: ActiveUnit[], c2Nodes?: string[] }) {
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
                    className="absolute inset-0 w-full h-full opacity-30 fill-none stroke-tactical-primary/20 stroke-[0.5]"
                    style={{ filter: 'drop-shadow(0 0 10px var(--color-tactical-primary))' }}
                >
                    <g strokeWidth="0.5" strokeDasharray="1,3" className="opacity-40">
                        <path d="M150,120 L180,100 L220,110 L250,90 L280,110 L300,150 L280,200 L240,230 L180,210 L150,170 Z" />
                        <path d="M450,100 L550,80 L650,90 L750,110 L850,130 L900,180 L850,250 L700,280 L600,260 L500,240 L450,180 Z" />
                        <path d="M480,300 L550,280 L620,310 L600,450 L520,480 L450,420 Z" />
                        <path d="M260,280 L320,300 L350,380 L300,480 L240,420 L220,320 Z" />
                        <path d="M780,350 L880,370 L900,420 L820,460 L750,430 Z" />
                    </g>
                    
                    {/* C2 Network Mesh Visualization */}
                    <g className="stroke-tactical-primary/30 stroke-[0.5] stroke-dasharray-mesh">
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
                </svg>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,var(--color-tactical-bg)_100%)] opacity-60 pointer-events-none" />
            </div>
        </div>
    );
}
