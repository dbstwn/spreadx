import React, { useEffect, useState } from 'react';
import { TelemetryData } from '../types';
import { Clock, Activity, Hash, ArrowUp, MoveHorizontal, Gauge } from 'lucide-react';

interface TelemetryPanelProps {
  telemetryRef: React.MutableRefObject<TelemetryData>;
}

const TelemetryTile = ({ icon: Icon, label, value, unit }: { icon: any, label: string, value: string, unit?: string }) => (
  <div className="flex items-center justify-between bg-slate-50/50 rounded px-3 py-2 border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors shadow-sm overflow-hidden h-full">
    <div className="flex items-center gap-2 opacity-70">
      <Icon size={14} className="text-slate-500" />
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{label}</span>
    </div>
    <div className="flex items-baseline gap-1 pl-2">
      <span className="text-sm font-bold text-slate-800 font-mono leading-none">{value}</span>
      {unit && <span className="text-[9px] text-slate-400 font-medium uppercase">{unit}</span>}
    </div>
  </div>
);

export default function TelemetryPanel({ telemetryRef }: TelemetryPanelProps) {
  const [data, setData] = useState<TelemetryData>({
    time: 0,
    rate: 0,
    count: 0,
    maxHeight: 0,
    maxDist: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (telemetryRef.current) {
        setData({ ...telemetryRef.current });
      }
    }, 100); 

    return () => clearInterval(interval);
  }, [telemetryRef]);

  const formatTime = (t: number) => {
    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full w-full bg-white p-3 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0 px-1 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
            <Gauge size={16} className="text-slate-600" />
            <h3 className="text-sm font-bold text-slate-700 tracking-tight uppercase">Live Telemetry</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded border border-slate-100">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-bold text-slate-400 tracking-wider">ACTIVE</span>
        </div>
      </div>
      
      {/* 2-Column Grid for Balanced Layout */}
      <div className="grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar pr-1 flex-1 content-start">
        
        <div className="col-span-2">
            <TelemetryTile 
                icon={Clock} 
                label="Sim Time" 
                value={formatTime(data.time)} 
            />
        </div>
        
        <TelemetryTile 
            icon={Activity} 
            label="Rate" 
            value={data.rate.toFixed(0)} 
            unit="pps" 
        />

        <TelemetryTile 
            icon={Hash} 
            label="Count" 
            value={data.count.toLocaleString()} 
            unit=""
        />
        
        <TelemetryTile 
            icon={ArrowUp} 
            label="Ceiling" 
            value={data.maxHeight.toFixed(1)} 
            unit="m" 
        />

        <TelemetryTile 
            icon={MoveHorizontal} 
            label="Range" 
            value={data.maxDist.toFixed(1)} 
            unit="m" 
        />
        
      </div>
    </div>
  );
}