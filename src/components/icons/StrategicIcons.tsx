"use client";

import React, { useId } from "react";
import type { IconType } from "@/lib/unit-database";
import type { AnalyticsLayerKey } from "@/components/map/LayerSelector";

export type StrategicTabIconName =
  | "summary"
  | "bp"
  | "economics"
  | "military"
  | "coalition"
  | "comparison"
  | "analytics"
  | "whatif"
  | "doctrine"
  | "geography";

interface BaseIconProps {
  size?: number;
  className?: string;
  title?: string;
}

function IconShell({
  size = 18,
  className,
  title,
  children,
  viewBox = "0 0 24 24",
}: BaseIconProps & { children: React.ReactNode; viewBox?: string }) {
  const gid = useId().replace(/:/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={`${gid}-beam`} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.8" />
        </linearGradient>
        <radialGradient id={`${gid}-core`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) rotate(90) scale(11)">
          <stop stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="0.62" stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <filter id={`${gid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.15" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.7 0" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill={`url(#${gid}-core)`} />
      <g filter={`url(#${gid}-glow)`} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}

export function StrategicTabIcon({ name, size = 14, className, title }: BaseIconProps & { name: StrategicTabIconName }) {
  const common = { size, className, title };

  switch (name) {
    case "summary":
      return (
        <IconShell {...common}>
          <circle cx="12" cy="12" r="6.5" strokeWidth="1.4" />
          <circle cx="12" cy="12" r="2" fill="currentColor" strokeWidth="0" />
          <path d="M12 2.8v2.5M12 18.7v2.5M2.8 12h2.5M18.7 12h2.5" strokeWidth="1.2" opacity="0.85" />
        </IconShell>
      );
    case "bp":
      return (
        <IconShell {...common}>
          <path d="M12 2.8l7.2 4.2v8.2L12 21.2l-7.2-6V7z" strokeWidth="1.35" fill="currentColor" fillOpacity="0.08" />
          <path d="M12 6.3v11.4M6.7 9.2l10.6 5.6M17.3 9.2L6.7 14.8" strokeWidth="1.05" opacity="0.75" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" strokeWidth="0" />
        </IconShell>
      );
    case "economics":
      return (
        <IconShell {...common}>
          <path d="M5 18.7h14M7 16V9.5M12 16V5.4M17 16v-7.2" strokeWidth="1.5" />
          <path d="M5.5 10.6l3-3 3.2 2.2 5.8-5.2" strokeWidth="1.25" />
          <path d="M17.5 4.6v4h-4" strokeWidth="1.1" opacity="0.8" />
        </IconShell>
      );
    case "military":
      return (
        <IconShell {...common}>
          <path d="M4.7 18.7l6.8-6.8M12.5 10.9l6.8-6.8M19.2 18.8l-6.7-6.9M11.5 10.9L4.8 4.2" strokeWidth="1.35" />
          <path d="M15.3 3.2h5.2v5.2M3.5 15.6v4.9h4.9" strokeWidth="1.15" opacity="0.85" />
          <circle cx="12" cy="12" r="2" fill="currentColor" strokeWidth="0" />
        </IconShell>
      );
    case "coalition":
      return (
        <IconShell {...common}>
          <path d="M12 3.8l7 4v8l-7 4-7-4v-8z" strokeWidth="1.3" />
          <path d="M12 7.8l3.6 2.1v4.2L12 16.2l-3.6-2.1V9.9z" strokeWidth="1.1" fill="currentColor" fillOpacity="0.08" />
          <path d="M12 3.8v4M19 7.8l-3.4 2M19 15.8l-3.4-1.8M12 19.8v-3.6M5 15.8l3.4-1.8M5 7.8l3.4 2" strokeWidth="0.9" opacity="0.7" />
        </IconShell>
      );
    case "comparison":
      return (
        <IconShell {...common}>
          <path d="M4 8.2h11.2M11.8 5l3.4 3.2-3.4 3.2M20 15.8H8.8M12.2 12.6l-3.4 3.2 3.4 3.2" strokeWidth="1.45" />
          <path d="M4 15.8h2M20 8.2h-2" strokeWidth="1.1" opacity="0.55" />
        </IconShell>
      );
    case "analytics":
      return (
        <IconShell {...common}>
          <path d="M5 17.8l4.1-4.3 3.2 2.3 6.7-8.7" strokeWidth="1.4" />
          <path d="M5 5.2v13h14" strokeWidth="1.2" opacity="0.8" />
          <circle cx="9.1" cy="13.5" r="1.2" fill="currentColor" strokeWidth="0" />
          <circle cx="12.3" cy="15.8" r="1.2" fill="currentColor" strokeWidth="0" />
          <circle cx="19" cy="7.1" r="1.2" fill="currentColor" strokeWidth="0" />
        </IconShell>
      );
    case "whatif":
      return (
        <IconShell {...common}>
          <path d="M8.3 8.2a4 4 0 017.6 1.6c0 3.1-4 3-4 6" strokeWidth="1.45" />
          <path d="M12 20h.01" strokeWidth="2.4" />
          <path d="M4 12h2M18 12h2M6.3 5.9l1.4 1.4M16.3 16.7l1.4 1.4" strokeWidth="1.05" opacity="0.65" />
        </IconShell>
      );
    case "doctrine":
      return (
        <IconShell {...common}>
          <path d="M12 3.2l2.6 5.2 5.7.8-4.1 4 1 5.7-5.2-2.7-5.2 2.7 1-5.7-4.1-4 5.7-.8z" strokeWidth="1.25" fill="currentColor" fillOpacity="0.08" />
          <path d="M12 7.2v5.1l3.2 1.8" strokeWidth="1.05" opacity="0.85" />
        </IconShell>
      );
    case "geography":
      return (
        <IconShell {...common}>
          <circle cx="12" cy="12" r="8.2" strokeWidth="1.25" />
          <path d="M4.2 11.7c2.5-1.1 4.7-1.1 6.5 0s4 .9 6.9-.6M6.2 16c2.2-.6 4.2-.4 6.2.7 1.8.9 3.5.8 5.3-.4" strokeWidth="1" opacity="0.75" />
          <path d="M12 3.8c-1.7 2.4-2.5 5.1-2.5 8.2 0 3.1.8 5.8 2.5 8.2M12 3.8c1.7 2.4 2.5 5.1 2.5 8.2 0 3.1-.8 5.8-2.5 8.2" strokeWidth="0.9" opacity="0.65" />
        </IconShell>
      );
    default:
      return null;
  }
}

export function IntelLayerIcon({ name, size = 16, className, title }: BaseIconProps & { name: AnalyticsLayerKey }) {
  const common = { size, className, title };

  switch (name) {
    case "bp":
      return (
        <IconShell {...common}>
          <circle cx="12" cy="12" r="7.2" strokeWidth="1.25" />
          <circle cx="12" cy="12" r="2.4" fill="currentColor" strokeWidth="0" />
          <path d="M12 4.8v3M12 16.2v3M4.8 12h3M16.2 12h3" strokeWidth="1" opacity="0.75" />
        </IconShell>
      );
    case "budget":
      return (
        <IconShell {...common}>
          <path d="M12 4v16M16.5 7.2c-.9-1-2.2-1.6-4-1.6-2.3 0-4 .9-4 2.6s1.3 2.4 4 2.9c2.9.5 4.3 1.4 4.3 3.4s-1.8 3.2-4.5 3.2c-2 0-3.6-.6-4.9-1.9" strokeWidth="1.25" />
        </IconShell>
      );
    case "fleet":
      return (
        <IconShell {...common}>
          <path d="M5 14.2l2-6.4h10l2 6.4" strokeWidth="1.25" />
          <path d="M4.2 15.2c1.4 1.1 2.9 1.1 4.3 0 1.4-1.1 2.9-1.1 4.3 0s2.9 1.1 4.3 0 2.4-.8 3.4 0" strokeWidth="1.15" />
          <path d="M12 7.8V3.6M8.8 7.8l3.2-4.2 3.2 4.2" strokeWidth="1.05" opacity="0.8" />
        </IconShell>
      );
    case "aviation":
      return (
        <IconShell {...common}>
          <path d="M12 3l2.7 7.2 6.3 2.1v1.6l-5.6.8 1.5 4.7-1.2 1L12 17.3l-3.7 3.1-1.2-1 1.5-4.7-5.6-.8v-1.6l6.3-2.1z" strokeWidth="1.15" fill="currentColor" fillOpacity="0.08" />
          <path d="M12 3v14.3" strokeWidth="0.9" opacity="0.65" />
        </IconShell>
      );
    case "tanks":
      return (
        <IconShell {...common}>
          <rect x="4.4" y="12" width="15.2" height="5.6" rx="2" strokeWidth="1.25" />
          <path d="M8 12l1.1-3.6h5.8L16 12M12 8.4V5.2h6" strokeWidth="1.15" />
          <path d="M7.4 17.6h9.2" strokeWidth="1" opacity="0.65" />
        </IconShell>
      );
    case "nukes":
      return (
        <IconShell {...common}>
          <circle cx="12" cy="12" r="2" fill="currentColor" strokeWidth="0" />
          <path d="M12 5.2a6.8 6.8 0 016.1 3.8l-4.1 1.3M18.1 15a6.8 6.8 0 01-6.1 3.8v-4.3M5.9 15a6.8 6.8 0 010-6l4.1 1.3" strokeWidth="1.2" />
          <circle cx="12" cy="12" r="8.4" strokeWidth="0.85" opacity="0.45" />
        </IconShell>
      );
    case "readiness":
      return (
        <IconShell {...common}>
          <path d="M5 17h14M7 15v-4M12 15V6M17 15v-7" strokeWidth="1.45" />
          <path d="M4.8 6.8h4.5l2.1-2.3 3.1 4.2 1.8-2h2.9" strokeWidth="1.2" opacity="0.85" />
        </IconShell>
      );
    case "logistics":
      return (
        <IconShell {...common}>
          <path d="M4 8.2h12.4M13.5 5.2l3 3-3 3M20 15.8H7.6M10.5 12.8l-3 3 3 3" strokeWidth="1.35" />
          <circle cx="12" cy="12" r="1.7" fill="currentColor" strokeWidth="0" opacity="0.75" />
        </IconShell>
      );
    case "economy":
      return (
        <IconShell {...common}>
          <path d="M12 3.5l7 4v8.9l-7 4-7-4V7.5z" strokeWidth="1.2" />
          <path d="M8.2 14.8l2.2-2.9 2.5 1.6 3.2-4.6" strokeWidth="1.25" />
          <path d="M16.1 8.9v3.4h-3.2" strokeWidth="1" opacity="0.75" />
        </IconShell>
      );
    case "manpower":
      return (
        <IconShell {...common}>
          <circle cx="12" cy="8" r="2.2" strokeWidth="1.2" />
          <path d="M7.2 18.8c.5-3.2 2-5 4.8-5s4.3 1.8 4.8 5" strokeWidth="1.25" />
          <path d="M5.2 15.8c.5-2.2 1.6-3.5 3.4-3.9M18.8 15.8c-.5-2.2-1.6-3.5-3.4-3.9" strokeWidth="1" opacity="0.65" />
        </IconShell>
      );
    case "c2":
      return (
        <IconShell {...common}>
          <circle cx="12" cy="12" r="2.2" fill="currentColor" strokeWidth="0" />
          <circle cx="5.5" cy="7.2" r="1.7" strokeWidth="1.1" />
          <circle cx="18.5" cy="7.2" r="1.7" strokeWidth="1.1" />
          <circle cx="7.1" cy="18" r="1.7" strokeWidth="1.1" />
          <circle cx="16.9" cy="18" r="1.7" strokeWidth="1.1" />
          <path d="M7 8.2l3.3 2.5M17 8.2l-3.3 2.5M8.6 16.6l2-2.9M15.4 16.6l-2-2.9" strokeWidth="0.9" opacity="0.75" />
        </IconShell>
      );
    case "artillery":
      return (
        <IconShell {...common}>
          <path d="M5 17h7l7-9" strokeWidth="1.45" />
          <path d="M7.2 17a3 3 0 005.8 0M17.5 6.2l2.1 1.6" strokeWidth="1.05" />
          <path d="M16.8 5.1l1-1.9M19.1 7.6l2.1-.4" strokeWidth="0.9" opacity="0.65" />
        </IconShell>
      );
    case "projection":
      return (
        <IconShell {...common}>
          <path d="M5 19L19 5M12.8 5H19v6.2" strokeWidth="1.45" />
          <path d="M6 8.8c3.4-3 8.6-3 12 0M8.1 16.1c3 2.5 7.4 2.5 10.4 0" strokeWidth="1" opacity="0.6" />
        </IconShell>
      );
    case "alliances":
      return (
        <IconShell {...common}>
          <path d="M12 4l6.7 3.9v8.2L12 20l-6.7-3.9V7.9z" strokeWidth="1.2" />
          <circle cx="12" cy="12" r="2" fill="currentColor" strokeWidth="0" />
          <path d="M12 4v6M18.7 7.9l-4.9 3M18.7 16.1l-4.9-3M12 20v-6M5.3 16.1l4.9-3M5.3 7.9l4.9 3" strokeWidth="0.9" opacity="0.75" />
        </IconShell>
      );
    case "bases":
      return (
        <IconShell {...common}>
          <path d="M5.2 18.8h13.6M7 18.8V9.2l5-3.2 5 3.2v9.6" strokeWidth="1.25" />
          <path d="M9 18.8v-5h6v5M10.2 10.2h3.6M12 6v5.2" strokeWidth="1.05" opacity="0.8" />
          <circle cx="12" cy="12" r="7.6" strokeWidth="0.85" strokeDasharray="1.6 2.4" opacity="0.5" />
        </IconShell>
      );
    case "airRange":
      return (
        <IconShell {...common}>
          <circle cx="12" cy="12" r="8.4" strokeWidth="0.9" opacity="0.45" />
          <circle cx="12" cy="12" r="5.2" strokeWidth="1" opacity="0.65" />
          <path d="M12 4.2l1.7 5.1 4.5 1.5v1.2l-4 .6 1 3.4-.9.7-2.3-2-2.3 2-.9-.7 1-3.4-4-.6v-1.2l4.5-1.5z" strokeWidth="1.05" fill="currentColor" fillOpacity="0.08" />
        </IconShell>
      );
    case "a2ad":
      return (
        <IconShell {...common}>
          <circle cx="12" cy="12" r="8.6" strokeWidth="0.9" strokeDasharray="2 2" opacity="0.55" />
          <circle cx="12" cy="12" r="5.4" strokeWidth="1.05" opacity="0.75" />
          <path d="M12 6.2l3.7 2.1v4.1c0 2.2-1.4 4.1-3.7 5.4-2.3-1.3-3.7-3.2-3.7-5.4V8.3z" strokeWidth="1.1" fill="currentColor" fillOpacity="0.08" />
          <path d="M8.2 12h7.6M12 8.2v7.6" strokeWidth="0.95" opacity="0.8" />
        </IconShell>
      );
    case "chokepoints":
      return (
        <IconShell {...common}>
          <path d="M4.6 6.2c2.6 2.2 4.4 4 4.4 5.8s-1.8 3.6-4.4 5.8M19.4 6.2C16.8 8.4 15 10.2 15 12s1.8 3.6 4.4 5.8" strokeWidth="1.25" />
          <path d="M9.3 12h5.4M12 8.8v6.4" strokeWidth="1.1" opacity="0.85" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" fillOpacity="0.12" strokeWidth="1" />
        </IconShell>
      );
    case "corridors":
      return (
        <IconShell {...common}>
          <path d="M4.5 16.5c4.8-7.2 10.2-7.2 15 0" strokeWidth="1.25" strokeDasharray="2 1.8" />
          <path d="M5.4 16.3h3.5M15.1 16.3h3.5M10.6 11.3l1.4-3 1.4 3" strokeWidth="1.05" />
          <circle cx="5" cy="17" r="1.5" fill="currentColor" fillOpacity="0.16" />
          <circle cx="19" cy="17" r="1.5" fill="currentColor" fillOpacity="0.16" />
        </IconShell>
      );
    case "flashpoints":
      return (
        <IconShell {...common}>
          <path d="M12 3.7l2.1 5 5.4.5-4.1 3.6 1.2 5.3-4.6-2.8-4.6 2.8 1.2-5.3-4.1-3.6 5.4-.5z" strokeWidth="1.05" fill="currentColor" fillOpacity="0.08" />
          <circle cx="12" cy="12" r="3.5" strokeWidth="1" strokeDasharray="1.5 1.7" opacity="0.75" />
          <path d="M12 8.9v4.1M12 15.2h.01" strokeWidth="1.7" />
        </IconShell>
      );
    case "density":
      return (
        <IconShell {...common}>
          <path d="M5 6h4v4H5zM10 6h4v4h-4zM15 6h4v4h-4zM5 11h4v4H5zM10 11h4v4h-4zM15 11h4v4h-4zM5 16h4v2H5zM10 16h4v2h-4zM15 16h4v2h-4z" strokeWidth="1" fill="currentColor" fillOpacity="0.07" />
        </IconShell>
      );
    case "risk":
      return (
        <IconShell {...common}>
          <path d="M12 3.8l8.2 14.4H3.8z" strokeWidth="1.25" fill="currentColor" fillOpacity="0.08" />
          <path d="M12 8.2v5.2M12 16.9h.01" strokeWidth="1.9" />
        </IconShell>
      );
    default:
      return null;
  }
}

function UnitSvgShell({
  type,
  color,
  size,
  children,
}: {
  type: IconType;
  color: string;
  size: number;
  children: React.ReactNode;
}) {
  const gid = useId().replace(/:/g, "");

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label={type} role="img">
      <defs>
        <radialGradient id={`${gid}-unit-core`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(16 16) rotate(90) scale(14)">
          <stop stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <filter id={`${gid}-unit-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="16" cy="16" r="14" fill={`url(#${gid}-unit-core)`} />
      <path d="M5 5h5M22 5h5M5 27h5M22 27h5" stroke={color} strokeOpacity="0.45" strokeWidth="1.1" strokeLinecap="round" />
      <g filter={`url(#${gid}-unit-glow)`} stroke={color} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}

export function MilitaryUnitIcon({ type, side, size = 32 }: { type: IconType; side: string; size?: number }) {
  const color = side === "NATO" ? "var(--color-tactical-nato)" : side === "RUS" ? "var(--color-tactical-rus)" : "var(--color-tactical-china)";

  switch (type) {
    case "Fighter":
      return (
        <UnitSvgShell type={type} color={color} size={size}>
          <path d="M16 3.5l3.7 12 7.6 3v2.2l-6.8.8 2 5.4-1.6 1.2-4.9-3.8-4.9 3.8-1.6-1.2 2-5.4-6.8-.8v-2.2l7.6-3z" strokeWidth="1.35" fill={color} fillOpacity="0.08" />
          <path d="M16 3.5v20.8" strokeWidth="0.9" strokeOpacity="0.65" />
        </UnitSvgShell>
      );
    case "Bomber":
      return (
        <UnitSvgShell type={type} color={color} size={size}>
          <path d="M16 3.8l5.1 11.4 7.1 3.2v2.5l-8.3.5 2.2 5.8-1.5 1.1-4.6-3-4.6 3-1.5-1.1 2.2-5.8-8.3-.5v-2.5l7.1-3.2z" strokeWidth="1.35" fill={color} fillOpacity="0.08" />
          <path d="M10.7 15.2h10.6M16 8.2v17" strokeWidth="0.95" strokeOpacity="0.65" />
        </UnitSvgShell>
      );
    case "AWACS":
      return (
        <UnitSvgShell type={type} color={color} size={size}>
          <circle cx="16" cy="16" r="10.8" strokeWidth="1" strokeDasharray="1.5 2.8" strokeOpacity="0.75" />
          <ellipse cx="16" cy="10.5" rx="5.6" ry="2" strokeWidth="1.15" fill={color} fillOpacity="0.06" />
          <path d="M16 8.8l2.8 8.4 5.4 2v1.6l-5 .6 1.3 3.5-1.1.8-3.4-2.6-3.4 2.6-1.1-.8 1.3-3.5-5-.6v-1.6l5.4-2z" strokeWidth="1.1" />
          <path d="M16 16V5.4" strokeWidth="0.9" strokeOpacity="0.75" />
        </UnitSvgShell>
      );
    case "UAV":
      return (
        <UnitSvgShell type={type} color={color} size={size}>
          <path d="M4.5 16h23M16 5.2v21.6" strokeWidth="1.25" />
          <path d="M9.5 10.5l6.5 5.5-6.5 5.5M22.5 10.5L16 16l6.5 5.5" strokeWidth="1.1" />
          <circle cx="16" cy="16" r="2.2" fill={color} strokeWidth="0" />
        </UnitSvgShell>
      );
    case "SAM":
      return (
        <UnitSvgShell type={type} color={color} size={size}>
          <path d="M6.2 21.4h19.6v5H6.2z" strokeWidth="1.25" fill={color} fillOpacity="0.06" />
          <path d="M10 21.4L15.8 5l5.8 16.4" strokeWidth="1.35" />
          <path d="M15.8 5l3.4 4.8h-6.8zM8.6 26.4h14.8" strokeWidth="1" strokeOpacity="0.75" />
        </UnitSvgShell>
      );
    case "MBT":
      return (
        <UnitSvgShell type={type} color={color} size={size}>
          <rect x="5.4" y="16" width="21.2" height="8.2" rx="2.4" strokeWidth="1.3" fill={color} fillOpacity="0.06" />
          <path d="M10 16l1.6-5.2h8.8L22 16M16 10.8V6.2h9" strokeWidth="1.35" />
          <path d="M8.7 24.2h14.6M10 19.8h12" strokeWidth="0.95" strokeOpacity="0.65" />
          <circle cx="10" cy="24.2" r="1" fill={color} strokeWidth="0" /><circle cx="16" cy="24.2" r="1" fill={color} strokeWidth="0" /><circle cx="22" cy="24.2" r="1" fill={color} strokeWidth="0" />
        </UnitSvgShell>
      );
    case "IFV":
      return (
        <UnitSvgShell type={type} color={color} size={size}>
          <rect x="5.8" y="17" width="20.4" height="7" rx="2" strokeWidth="1.25" fill={color} fillOpacity="0.06" />
          <path d="M11 17l1.3-4.4h6.2l1.3 4.4M15.4 12.6V8.8h6.4" strokeWidth="1.2" />
          <path d="M9.4 24h13.2M8.5 20.3h15" strokeWidth="0.95" strokeOpacity="0.65" />
        </UnitSvgShell>
      );
    case "SPG":
      return (
        <UnitSvgShell type={type} color={color} size={size}>
          <rect x="5.8" y="18" width="20.4" height="6.6" rx="2" strokeWidth="1.25" fill={color} fillOpacity="0.06" />
          <path d="M15.5 18L18 5.2" strokeWidth="1.8" />
          <path d="M12 18h7M8.7 24.6h14.6M17.8 5.2l3.2.6" strokeWidth="1" strokeOpacity="0.75" />
        </UnitSvgShell>
      );
    case "Support":
    default:
      return (
        <UnitSvgShell type={type} color={color} size={size}>
          <path d="M16 5.2l9.3 5.4v10.8L16 26.8l-9.3-5.4V10.6z" strokeWidth="1.25" fill={color} fillOpacity="0.06" />
          <path d="M16 10.2v11.6M10.2 16h11.6" strokeWidth="1.4" />
          <circle cx="16" cy="16" r="8.3" strokeWidth="0.9" strokeDasharray="2 3" strokeOpacity="0.65" />
        </UnitSvgShell>
      );
  }
}
