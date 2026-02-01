import React from 'react';
import { VizMode } from '../types';

export default function Legend({ mode }: { mode: VizMode }) {
  if (mode === 'velocity') {
    return (
      <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur border border-slate-200 p-4 rounded-lg w-52 z-20 shadow-xl">
        <div className="text-xs font-bold text-slate-700 mb-2 uppercase flex justify-between items-center">
            <span>Velocity (m/s)</span>
        </div>
        {/* Green (Low) -> Red (High) */}
        <div className="h-3 w-full rounded mb-1 bg-gradient-to-r from-[hsl(120,90%,45%)] via-[hsl(60,90%,45%)] to-[hsl(0,90%,45%)] border border-slate-100"></div>
        <div className="flex justify-between text-[10px] text-slate-500 font-mono font-semibold mt-1">
          <span>0.0</span>
          <span>7.5</span>
          <span>15.0+</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur border border-slate-200 p-4 rounded-lg w-52 z-20 shadow-xl">
      <div className="text-xs font-bold text-slate-700 mb-2 uppercase flex justify-between items-center">
          <span>Pressure Field (Pa)</span>
      </div>
      {/* Green (Low) -> Red (High) */}
      <div className="h-3 w-full rounded mb-1 bg-gradient-to-r from-[hsl(120,90%,45%)] via-[hsl(60,90%,45%)] to-[hsl(0,90%,45%)] border border-slate-100"></div>
      <div className="flex justify-between text-[10px] text-slate-500 font-mono font-semibold mt-1">
        <span>Low</span>
        <span>Med</span>
        <span>High</span>
      </div>
    </div>
  );
}