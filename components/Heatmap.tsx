"use client";

import { Hotspot } from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  Road: "#0f2c4c",
  Health: "#c9483c",
  Education: "#1b7a72",
  Water: "#2c5580",
  Electricity: "#d98e2b",
  Sanitation: "#8fb8ad",
  Agriculture: "#5f9ea8",
  Other: "#8a97a1",
};

/**
 * Lightweight lat/lng -> SVG scatter, standing in for the Google Maps
 * Platform heatmap layer in the full spec. Swap for an actual Maps
 * overlay once GOOGLE_MAPS_API_KEY is wired in — the data shape
 * (lat, lng, weight, dominant_category) is already Maps-ready.
 */
export function Heatmap({ hotspots }: { hotspots: Hotspot[] }) {
  if (hotspots.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-ink-muted">
        No geo-tagged issues yet.
      </div>
    );
  }

  const lats = hotspots.map((h) => h.lat);
  const lngs = hotspots.map((h) => h.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latPad = (maxLat - minLat || 0.01) * 0.15;
  const lngPad = (maxLng - minLng || 0.01) * 0.15;

  const W = 480;
  const H = 280;

  const project = (lat: number, lng: number) => {
    const x = ((lng - (minLng - lngPad)) / (maxLng - minLng + 2 * lngPad || 1)) * W;
    // invert y since lat increases northward but SVG y increases downward
    const y = H - ((lat - (minLat - latPad)) / (maxLat - minLat + 2 * latPad || 1)) * H;
    return { x, y };
  };

  const maxWeight = Math.max(...hotspots.map((h) => h.weight), 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-64 rounded-md" style={{ background: "var(--teal-100)" }}>
      {hotspots.map((h, i) => {
        const { x, y } = project(h.lat, h.lng);
        const r = 6 + (h.weight / maxWeight) * 16;
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={r}
              fill={CATEGORY_COLORS[h.dominant_category] ?? CATEGORY_COLORS.Other}
              opacity={0.35}
            />
            <circle
              cx={x}
              cy={y}
              r={4}
              fill={CATEGORY_COLORS[h.dominant_category] ?? CATEGORY_COLORS.Other}
            />
            <text x={x + r + 4} y={y + 3} fontSize={10} fill="var(--ink-muted)" className="font-data">
              {h.weight >= 10 ? Math.round(h.weight) : Number(h.weight.toFixed(1))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
