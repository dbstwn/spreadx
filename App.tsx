import React, { useState, useCallback, useMemo, useRef } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import Controls from './components/Controls';
import AnalyticsGraph from './components/AnalyticsGraph';
import HeatMapModal from './components/HeatMapModal';
import Legend from './components/Legend';
import LandingPage from './components/LandingPage';
import TelemetryPanel from './components/TelemetryPanel';
import Terminal from './components/Terminal';
import { SimulationParams, VizMode, TelemetryData, PointData, LogEntry } from './types';
import { X } from 'lucide-react';

const INITIAL_PARAMS: SimulationParams = {
  chimneyHeight: 30,
  particleMass: 2.0,
  particleSize: 0.5,
  windSpeed: 10,
  windDirection: 90,
  distributionSpread: 1.0,
  particleDistribution: 2.0 
};

export default function App() {
  const [params, setParams] = useState<SimulationParams>(INITIAL_PARAMS);
  const [vizMode, setVizMode] = useState<VizMode>('velocity');
  const [isRunning, setIsRunning] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [graphZoom, setGraphZoom] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  
  // Terminal Logs State
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Logger Function
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    // Create date object
    const d = new Date();
    // Convert to UTC
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    // Add 7 hours for UTC+7
    const nd = new Date(utc + (3600000 * 7));
    
    // Format: YYYY-MM-DD HH:MM:SS.mmm
    const dateStr = nd.toISOString().replace('T', ' ').slice(0, -1);
    
    // Final Format: YYYY-MM-DD HH:MM:SS.mmm (No UTC suffix)
    const timestamp = `${dateStr}`;

    setLogs(prev => {
      const newLogs = [...prev, { timestamp, type, message }];
      if (newLogs.length > 50) return newLogs.slice(newLogs.length - 50); // Keep last 50
      return newLogs;
    });
  }, []);

  // Shared Heatmap Points - Persistent coordinate storage
  const heatmapPointsRef = useRef<PointData[]>([]);

  // Shared Telemetry Ref 
  const telemetryRef = useRef<TelemetryData>({
    time: 0,
    rate: 0,
    count: 0,
    maxHeight: 0,
    maxDist: 0
  });

  const handleParamChange = useCallback((newParams: React.SetStateAction<SimulationParams>) => {
    setIsRunning(false);
    setParams(newParams);
    if (!isRunning) {
        addLog('SYS', 'Parameters updated - Simulation reset pending');
    }
  }, [isRunning, addLog]);

  if (showLanding) {
    return <LandingPage onExplore={() => setShowLanding(false)} />;
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Graph Zoom Modal */}
      {graphZoom && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-10">
          <div className="bg-white w-full h-full max-w-6xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
            <button 
              onClick={() => setGraphZoom(false)}
              className="absolute top-4 right-4 z-20 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
               <X size={20} />
            </button>
            <div className="flex-1">
              <AnalyticsGraph params={params} />
            </div>
            <div className="h-12 border-t border-slate-100 flex items-center justify-center text-sm text-slate-500 bg-slate-50">
               Interactive 3D Scatter Plot: Particle Physics Correlation Model
            </div>
          </div>
        </div>
      )}

      {/* Heat Map Modal - Now uses Points Reference and Telemetry */}
      {showHeatmap && (
        <HeatMapModal 
            pointsRef={heatmapPointsRef}
            params={params} 
            telemetryRef={telemetryRef}
            onClose={() => setShowHeatmap(false)} 
        />
      )}

      {/* Left Sidebar: Controls Only */}
      <div className="w-80 flex-shrink-0 h-full z-30 shadow-xl border-r border-slate-200 bg-white flex flex-col">
        <Controls 
          params={params} 
          setParams={handleParamChange} 
          vizMode={vizMode} 
          setVizMode={setVizMode}
          isRunning={isRunning}
          setIsRunning={setIsRunning}
          showHeatmap={showHeatmap}
          setShowHeatmap={setShowHeatmap}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative bg-slate-100 min-w-0">
        
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 w-full h-24 pointer-events-none z-20 flex flex-col justify-center px-6 bg-gradient-to-b from-white/95 to-transparent">
             <div className="flex flex-col gap-1">
                 <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm font-sans">
                   Spread<span className="text-blue-600">X</span>
                 </h1>
                 <div className="flex items-center gap-2">
                   <span className="h-px w-8 bg-slate-400"></span>
                   <p className="text-xs text-slate-600 font-medium tracking-widest uppercase">
                     Particle Dispersion Simulation System
                   </p>
                 </div>
             </div>
        </div>

        {/* 3D Simulation Canvas (Top Section - Flexible Height) */}
        <div className="flex-1 relative m-2 mt-2 rounded-xl overflow-hidden border border-slate-300 bg-slate-200 shadow-inner ring-1 ring-slate-200">
           <SimulationCanvas 
             params={params} 
             mode={vizMode} 
             isRunning={isRunning} 
             heatmapPointsRef={heatmapPointsRef}
             telemetryRef={telemetryRef}
             addLog={addLog}
           />
           <Legend mode={vizMode} />
        </div>

        {/* Bottom Dashboard Panel: Balanced 3-Column Grid */}
        <div className="h-80 flex-shrink-0 bg-white border-t border-slate-200 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] z-30 grid grid-cols-3 divide-x divide-slate-200">
             
             {/* 1. Live Telemetry Panel */}
             <div className="flex flex-col relative overflow-hidden bg-white">
                 <TelemetryPanel telemetryRef={telemetryRef} />
             </div>
             
             {/* 2. Analytics Graph (Parameter-Environment) */}
             <div className="flex flex-col relative overflow-hidden bg-slate-50 p-2">
                 <div className="w-full h-full rounded border border-slate-200 overflow-hidden bg-white">
                    <AnalyticsGraph params={params} onZoom={() => setGraphZoom(true)} />
                 </div>
             </div>

             {/* 3. Terminal Window */}
             <div className="flex flex-col relative overflow-hidden bg-[#0e1116]">
                <Terminal logs={logs} />
             </div>

        </div>
      </div>
    </div>
  );
}