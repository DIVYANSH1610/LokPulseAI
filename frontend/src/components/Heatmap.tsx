// src/components/Heatmap.tsx
"use client";
import { useState } from "react";

// Generate realistic trailing 14 days
const days = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
});

const wards = ["Ward 12", "Ward 04", "Ward 18", "Ward 07", "Ward 22"];

// Generate mock data matrix
const MATRIX_DATA = wards.map(ward => ({
  ward,
  data: days.map(day => {
    // Creating realistic data spikes
    const isSpike = Math.random() > 0.85;
    const count = isSpike ? Math.floor(Math.random() * 40 + 20) : Math.floor(Math.random() * 15);
    
    let color = "bg-slate-50 border-slate-100"; // 0
    if (count > 40) color = "bg-rose-500 border-rose-600";
    else if (count > 25) color = "bg-rose-400 border-rose-500";
    else if (count > 10) color = "bg-orange-300 border-orange-400";
    else if (count > 0) color = "bg-amber-100 border-amber-200";

    return { day, count, color };
  })
}));

export function Heatmap() {
  const [tooltip, setTooltip] = useState<{ x: number, y: number, text: string, count: number } | null>(null);

  return (
    <div className="w-full relative">
      {/* Tooltip */}
      {tooltip && (
        <div 
          className="absolute z-50 pointer-events-none -translate-x-1/2 -translate-y-full pb-3 transition-opacity"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="bg-slate-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl flex flex-col items-center">
            <span className="font-bold text-sm mb-0.5">{tooltip.count} reports</span>
            <span className="text-slate-300">{tooltip.text}</span>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
          </div>
        </div>
      )}

      <div className="flex overflow-x-auto pb-4">
        {/* Y-Axis Labels (Wards) */}
        <div className="flex flex-col gap-2 pt-6 pr-4 shrink-0">
          {wards.map(ward => (
            <div key={ward} className="h-8 flex items-center justify-end text-xs font-bold text-slate-500">
              {ward}
            </div>
          ))}
        </div>

        {/* Matrix Grid */}
        <div className="flex flex-col">
          {/* X-Axis Labels (Days - showing every other day to prevent crowding) */}
          <div className="flex gap-2 mb-2">
            {days.map((day, i) => (
              <div key={day} className="w-8 flex justify-center text-[10px] font-semibold text-slate-400">
                {i % 2 === 0 ? day.split(' ')[1] : ''}
              </div>
            ))}
          </div>

          {/* Data Cells */}
          <div className="flex flex-col gap-2">
            {MATRIX_DATA.map((row, rIdx) => (
              <div key={rIdx} className="flex gap-2">
                {row.data.map((cell, cIdx) => (
                  <div
                    key={cIdx}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const parentRect = e.currentTarget.parentElement?.parentElement?.parentElement?.getBoundingClientRect();
                      if (parentRect) {
                        setTooltip({
                          x: rect.left - parentRect.left + rect.width / 2,
                          y: rect.top - parentRect.top,
                          text: `${row.ward} • ${cell.day}`,
                          count: cell.count
                        });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    className={`w-8 h-8 rounded-md border transition-all duration-200 hover:scale-110 hover:shadow-md cursor-pointer ${cell.color}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Realistic Legend */}
      <div className="mt-6 flex items-center justify-end gap-2 text-xs font-medium text-slate-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-slate-50 border border-slate-100" />
          <div className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" />
          <div className="w-3 h-3 rounded-sm bg-orange-300 border border-orange-400" />
          <div className="w-3 h-3 rounded-sm bg-rose-400 border border-rose-500" />
          <div className="w-3 h-3 rounded-sm bg-rose-500 border border-rose-600" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}