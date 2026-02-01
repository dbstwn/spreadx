import React, { useState } from 'react';
import { SimulationParams, VizMode } from '../types';
import { Settings, Wind, MoveHorizontal, Box, ArrowUpToLine, Weight, Activity, Cloud, Play, Square, Info, Map, Layers } from 'lucide-react';

interface ControlsProps {
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  vizMode: VizMode;
  setVizMode: (mode: VizMode) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  showHeatmap: boolean;
  setShowHeatmap: (show: boolean) => void;
}

const PARAM_INFO: Record<string, string> = {
  chimneyHeight: "The physical height of the stack. Higher stacks generally allow pollutants to disperse over a wider area before reaching the ground.",
  particleMass: "The mass of each emitted particle unit. Heavier particles settle to the ground faster due to gravity.",
  particleSize: "The physical diameter of the particles. Larger particles experience more aerodynamic drag and settle differently.",
  windSpeed: "The speed of the horizontal wind flow. Higher wind speeds transport particles further downwind.",
  windDirection: "The compass direction the wind is blowing towards.",
  distributionSpread: "Simulates turbulence at the chimney exit. Higher values mean particles exit with more chaotic, wider initial spread.",
  particleDistribution: "Controls the rate of particle emission. Higher values release more particles per second, simulating a denser plume."
};

const Slider = ({ label, value, min, max, step, onChange, icon: Icon, unit, paramKey, activeTooltip, setActiveTooltip }: any) => (
  <div className="mb-4 group relative">
    <div className="flex justify-between items-center mb-1">
      <div className="flex items-center gap-2 text-slate-600">
        <Icon size={14} className="text-blue-500" />
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        {/* Question Mark Button */}
        <button 
          className="text-slate-400 hover:text-blue-500 transition-colors"
          onMouseEnter={() => setActiveTooltip(paramKey)}
          onMouseLeave={() => setActiveTooltip(null)}
          onClick={() => setActiveTooltip(activeTooltip === paramKey ? null : paramKey)}
        >
          <Info size={12} />
        </button>
      </div>
      <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-semibold">{value} {unit}</span>
    </div>
    
    {/* Tooltip Popup */}
    {activeTooltip === paramKey && (
        <div className="absolute left-0 bottom-full mb-2 w-64 bg-slate-800 text-white text-xs p-3 rounded shadow-xl z-50 pointer-events-none">
            <p className="font-semibold mb-1 border-b border-slate-600 pb-1">{label}</p>
            <p className="opacity-90 leading-relaxed">{PARAM_INFO[paramKey]}</p>
            <div className="absolute bottom-[-4px] left-4 w-2 h-2 bg-slate-800 transform rotate-45"></div>
        </div>
    )}

    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-300"
    />
  </div>
);

export default function Controls({ params, setParams, vizMode, setVizMode, isRunning, setIsRunning, showHeatmap, setShowHeatmap }: ControlsProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const updateParam = (key: keyof SimulationParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-full bg-white p-4 overflow-hidden font-sans">
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
        <div className="mb-6 border-b border-slate-200 pb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-1">
            <Settings className="text-blue-600" />
            <span>Config Panel</span>
          </h2>
          <p className="text-xs text-slate-500">Emission parameters configuration</p>
        </div>

        {/* Main Control */}
        <div className="mb-6 space-y-3">
          <button
              onClick={() => setIsRunning(!isRunning)}
              className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg font-bold text-sm shadow-md transition-all transform active:scale-95 ${
                  isRunning 
                  ? 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200' 
                  : 'bg-green-600 text-white hover:bg-green-500 border border-green-700 shadow-green-200'
              }`}
          >
              {isRunning ? (
                  <>
                      <Square size={16} fill="currentColor" /> STOP SIMULATION
                  </>
              ) : (
                  <>
                      <Play size={16} fill="currentColor" /> START SIMULATION
                  </>
              )}
          </button>

          {/* Heat Map Toggle */}
          <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg font-semibold text-xs border transition-all ${
                  showHeatmap 
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
          >
              <Map size={14} /> {showHeatmap ? 'HIDE MAP' : 'SHOW MAP'}
          </button>

          {!isRunning && (
              <p className="text-[10px] text-center text-slate-400 mt-1 italic">
                  *Params locked during active run.
              </p>
          )}
        </div>

        {/* Visualization Modes */}
        <div className="mb-8">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Analysis Mode</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setVizMode('velocity')}
              className={`flex flex-col items-center justify-center p-3 rounded border shadow-sm transition-all ${
                vizMode === 'velocity' 
                  ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' 
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <Activity size={20} className="mb-1" />
              <span className="text-[10px] font-bold">VELOCITY</span>
            </button>
            
            <button
              onClick={() => setVizMode('pressure')}
              className={`flex flex-col items-center justify-center p-3 rounded border shadow-sm transition-all ${
                vizMode === 'pressure' 
                  ? 'bg-amber-50 border-amber-500 text-amber-700 ring-1 ring-amber-500' 
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <Box size={20} className="mb-1" />
              <span className="text-[10px] font-bold">PRESSURE</span>
            </button>
          </div>
        </div>

        {/* Physical Parameters */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 pl-1 border-l-2 border-slate-300 tracking-wider">Source Parameters</h3>
          
          <Slider
            label="Chimney Height"
            icon={ArrowUpToLine}
            value={params.chimneyHeight}
            min={10}
            max={60}
            step={1}
            unit="m"
            paramKey="chimneyHeight"
            activeTooltip={activeTooltip}
            setActiveTooltip={setActiveTooltip}
            onChange={(v: number) => updateParam('chimneyHeight', v)}
          />
          
          <Slider
            label="Particle Mass"
            icon={Weight}
            value={params.particleMass}
            min={1}
            max={10}
            step={0.5}
            unit="amu"
            paramKey="particleMass"
            activeTooltip={activeTooltip}
            setActiveTooltip={setActiveTooltip}
            onChange={(v: number) => updateParam('particleMass', v)}
          />
          
          <Slider
            label="Particle Size"
            icon={Cloud}
            value={params.particleSize}
            min={0.1}
            max={2.0}
            step={0.1}
            unit="μm"
            paramKey="particleSize"
            activeTooltip={activeTooltip}
            setActiveTooltip={setActiveTooltip}
            onChange={(v: number) => updateParam('particleSize', v)}
          />
          
          {/* New Parameter: Particle Distribution */}
          <Slider
            label="Emission Density"
            icon={Layers}
            value={params.particleDistribution}
            min={1}
            max={10}
            step={1}
            unit="x"
            paramKey="particleDistribution"
            activeTooltip={activeTooltip}
            setActiveTooltip={setActiveTooltip}
            onChange={(v: number) => updateParam('particleDistribution', v)}
          />
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 pl-1 border-l-2 border-slate-300 tracking-wider">Environment</h3>
          
          <Slider
            label="Wind Speed"
            icon={Wind}
            value={params.windSpeed}
            min={0}
            max={25}
            step={0.5}
            unit="m/s"
            paramKey="windSpeed"
            activeTooltip={activeTooltip}
            setActiveTooltip={setActiveTooltip}
            onChange={(v: number) => updateParam('windSpeed', v)}
          />
          
          <Slider
            label="Wind Direction"
            icon={MoveHorizontal}
            value={params.windDirection}
            min={0}
            max={359}
            step={1}
            unit="deg"
            paramKey="windDirection"
            activeTooltip={activeTooltip}
            setActiveTooltip={setActiveTooltip}
            onChange={(v: number) => updateParam('windDirection', v)}
          />

          <Slider
            label="Plume Spread"
            icon={Activity}
            value={params.distributionSpread}
            min={0.1}
            max={3.0}
            step={0.1}
            unit="σ"
            paramKey="distributionSpread"
            activeTooltip={activeTooltip}
            setActiveTooltip={setActiveTooltip}
            onChange={(v: number) => updateParam('distributionSpread', v)}
          />
        </div>
      </div>
    </div>
  );
}