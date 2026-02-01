import React, { useEffect, useRef, useState } from 'react';
import { X, Map as MapIcon, Globe, Grid, ZoomIn, ZoomOut, Move, Wind, ArrowUpToLine, Weight, Cloud, Clock, Layers } from 'lucide-react';
import { SimulationParams, PointData, TelemetryData } from '../types';
import { MapContainer, TileLayer, useMap, ScaleControl } from 'react-leaflet';
import L from 'leaflet';

interface HeatMapModalProps {
  pointsRef: React.MutableRefObject<PointData[]>;
  params: SimulationParams;
  telemetryRef: React.MutableRefObject<TelemetryData>;
  onClose: () => void;
}

// --- Internal Components ---

// Helper to center map on load, but only when lat/lng changes explicitly
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center[0], center[1]]); // Dependencies explicit to avoid re-locking view on other renders
  return null;
}

const InfoRow = ({ label, value, unit, icon: Icon }: any) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
        <div className="flex items-center gap-2 text-slate-500">
            {Icon && <Icon size={14} />}
            <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <span className="text-sm font-mono font-bold text-slate-700">{value} <span className="text-xs text-slate-400 font-normal">{unit}</span></span>
    </div>
);

// --- Real Map Canvas Overlay Component ---
// Renders the heatmap data on top of the Leaflet map while allowing interaction
const RealMapCanvasOverlay = ({ points, centerLat, centerLng }: { points: PointData[], centerLat: number, centerLng: number }) => {
    const map = useMap();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Position helper
    const metersToLat = 1 / 111320;
    const metersToLng = 1 / (40075000 * Math.cos(centerLat * Math.PI / 180) / 360);

    // Re-draw on map move
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const onMapUpdate = () => {
            const size = map.getSize();
            // Match canvas size to map viewport
            if (canvas.width !== size.x || canvas.height !== size.y) {
                canvas.width = size.x;
                canvas.height = size.y;
            }
            
            const ctx = canvas.getContext('2d');
            if(!ctx) return;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Binning Logic for Map (similar to grid)
            const pixelBins = new Map<string, number>();
            const cellSize = 20; // pixels for binning visual
            
            points.forEach(p => {
                const pLat = centerLat - (p.z * metersToLat);
                const pLng = centerLng + (p.x * metersToLng);
                const point = map.latLngToContainerPoint([pLat, pLng]);
                
                // Only process if on screen (with padding)
                if(point.x >= -cellSize && point.x <= size.x + cellSize && point.y >= -cellSize && point.y <= size.y + cellSize) {
                     const gx = Math.floor(point.x / cellSize);
                     const gy = Math.floor(point.y / cellSize);
                     const key = `${gx},${gy}`;
                     pixelBins.set(key, (pixelBins.get(key) || 0) + 1);
                }
            });
            
            // Draw Radial Gradients
             pixelBins.forEach((count, key) => {
                 const [gx, gy] = key.split(',').map(Number);
                 const cx = gx * cellSize + cellSize/2;
                 const cy = gy * cellSize + cellSize/2;
                 
                 // Density Color Logic
                 let color = '';
                 if (count < 2) color = '59, 130, 246'; // Blue
                 else if (count < 5) color = '34, 197, 94'; // Green
                 else if (count < 10) color = '234, 179, 8'; // Yellow
                 else if (count < 20) color = '249, 115, 22'; // Orange
                 else color = '239, 68, 68'; // Red
                 
                 // Radial Gradient
                 const radius = cellSize;
                 const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
                 grad.addColorStop(0, `rgba(${color}, 0.8)`);
                 grad.addColorStop(1, `rgba(${color}, 0)`);
                 
                 ctx.fillStyle = grad;
                 ctx.beginPath();
                 ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                 ctx.fill();
             });
             
             // Draw Source Marker
             const sourcePt = map.latLngToContainerPoint([centerLat, centerLng]);
             ctx.beginPath();
             ctx.arc(sourcePt.x, sourcePt.y, 6, 0, Math.PI * 2);
             ctx.fillStyle = '#0f172a';
             ctx.fill();
             ctx.strokeStyle = 'white';
             ctx.lineWidth = 2;
             ctx.stroke();
        };
        
        map.on('move', onMapUpdate);
        map.on('zoom', onMapUpdate);
        map.on('viewreset', onMapUpdate);
        
        // Initial draw
        onMapUpdate();
        
        return () => {
            map.off('move', onMapUpdate);
            map.off('zoom', onMapUpdate);
            map.off('viewreset', onMapUpdate);
        };
    }, [map, points, centerLat, centerLng, metersToLat, metersToLng]);

    return (
        <canvas 
            ref={canvasRef} 
            className="leaflet-zoom-animated" 
            style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                pointerEvents: 'none', // Critical for map interaction
                zIndex: 400 
            }} 
        />
    );
};

export default function HeatMapModal({ pointsRef, params, telemetryRef, onClose }: HeatMapModalProps) {
  const [mode, setMode] = useState<'GRID' | 'REAL'>('GRID');
  
  // Real Map State
  const [lat, setLat] = useState(51.505);
  const [lng, setLng] = useState(-0.09);
  const [showRealMapConfig, setShowRealMapConfig] = useState(false);
  
  // Grid Canvas State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(2.0); // Zoom level (Pixels per Meter)
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // Pan offset
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Sidebar dynamic stats
  const [stats, setStats] = useState({ time: 0, count: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
        if (telemetryRef.current) {
            setStats({
                time: telemetryRef.current.time,
                count: pointsRef.current.length // Use points length for actual deposition
            });
        }
    }, 200);
    return () => clearInterval(interval);
  }, [telemetryRef, pointsRef]);

  // --- Grid Mode Logic (Density Binning with Radial Gradients) ---
  useEffect(() => {
    if (mode !== 'GRID') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); 
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // 1. Clear Background to White (Clean)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2 + offset.x;
      const centerY = canvas.height / 2 + offset.y;

      // 2. Binning / Density Calculation
      const cellSizeMeters = 4; 
      const cellSizePx = cellSizeMeters * scale;
      const densityMap = new Map<string, number>();
      const points = pointsRef.current;

      // Aggregate points into bins
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        // Quantize coordinates
        const gridX = Math.floor(p.x / cellSizeMeters);
        const gridZ = Math.floor(p.z / cellSizeMeters);
        const key = `${gridX},${gridZ}`;
        densityMap.set(key, (densityMap.get(key) || 0) + 1);
      }

      // 3. Draw Density Cells as Soft Circles
      const getDensityColorRGB = (count: number) => {
          if (count < 5) return '59, 130, 246'; // Blue
          if (count < 10) return '34, 197, 94'; // Green
          if (count < 20) return '234, 179, 8'; // Yellow
          if (count < 40) return '249, 115, 22'; // Orange
          return '239, 68, 68'; // Red
      };

      for (const [key, count] of densityMap.entries()) {
          const [gx, gz] = key.split(',').map(Number);
          
          const rectX = centerX + (gx * cellSizeMeters * scale);
          const rectY = centerY + (gz * cellSizeMeters * scale);
          const radius = cellSizePx * 1.2; // Slightly overlap

          const rgb = getDensityColorRGB(count);
          
          const grad = ctx.createRadialGradient(rectX + cellSizePx/2, rectY + cellSizePx/2, 0, rectX + cellSizePx/2, rectY + cellSizePx/2, radius);
          grad.addColorStop(0, `rgba(${rgb}, 0.8)`);
          grad.addColorStop(1, `rgba(${rgb}, 0)`);
          
          ctx.fillStyle = grad;
          ctx.fillRect(rectX - radius, rectY - radius, radius * 2 + cellSizePx, radius * 2 + cellSizePx);
      }

      // 4. Draw Grid Lines Overlay (Optional, for reference)
      const gridSize = 50 * scale;
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;

      const startX = (offset.x % gridSize) - gridSize;
      const startY = (offset.y % gridSize) - gridSize;

      ctx.beginPath();
      for (let x = startX; x < canvas.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let y = startY; y < canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();

      // 5. Draw Origin Marker
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [mode, scale, offset]);

  // Canvas Handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (mode !== 'GRID') return;
    const zoomSensitivity = 0.001;
    const newScale = Math.min(Math.max(0.5, scale - e.deltaY * zoomSensitivity), 10);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || mode !== 'GRID') return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const activateRealMap = () => {
    setShowRealMapConfig(true);
  };

  const confirmRealMap = () => {
    setShowRealMapConfig(false);
    setMode('REAL');
  };

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}m ${secs}s`;
  };

  // Grid Distance Scale Calculation
  const scaleBarWidthPx = 150;
  const realDistanceMeters = scaleBarWidthPx / scale;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl flex flex-col overflow-hidden h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
             <div className="p-2 bg-indigo-100 rounded text-indigo-600">
                <MapIcon size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-800">Ground Deposition Heat Map</h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono uppercase tracking-wider">
                  <span>Geospatial Analysis Module</span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex bg-slate-200 rounded p-1">
                <button 
                    onClick={() => setMode('GRID')}
                    className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 ${mode === 'GRID' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Grid size={14} /> GRID
                </button>
                <button 
                    onClick={activateRealMap}
                    className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 ${mode === 'REAL' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Globe size={14} /> REAL MAP
                </button>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors ml-4">
                <X size={24} className="text-slate-500" />
             </button>
          </div>
        </div>

        {/* Real Map Config Modal */}
        {showRealMapConfig && (
            <div className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                    <h3 className="text-lg font-bold mb-2">Set Source Coordinates</h3>
                    {/* ADDED HELPER TEXT */}
                    <p className="text-xs text-slate-500 mb-4 italic">Use comma (,) for decimal coordinates.</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Latitude</label>
                            <input type="number" step="any" value={lat} onChange={e => setLat(parseFloat(e.target.value))} className="w-full border rounded p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Longitude</label>
                            <input type="number" step="any" value={lng} onChange={e => setLng(parseFloat(e.target.value))} className="w-full border rounded p-2 text-sm" />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={confirmRealMap} className="flex-1 bg-blue-600 text-white py-2 rounded font-bold text-sm">Load Map</button>
                            <button onClick={() => setShowRealMapConfig(false)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded font-bold text-sm">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Body Container */}
        <div className="flex flex-1 overflow-hidden">
            
            {/* NEW SIDE INFORMATION PANEL */}
            <div className="w-72 bg-white border-r border-slate-200 flex flex-col z-10 overflow-y-auto custom-scrollbar">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Simulation State</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-white p-2 rounded border border-slate-200 shadow-sm">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Time</div>
                            <div className="text-lg font-mono font-bold text-slate-800">{formatTime(stats.time)}</div>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200 shadow-sm">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Deposition</div>
                            <div className="text-lg font-mono font-bold text-red-600">{stats.count.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 flex-1">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Parameters</h3>
                    <div className="space-y-1">
                         <InfoRow icon={ArrowUpToLine} label="Chimney Ht" value={params.chimneyHeight} unit="m" />
                         <InfoRow icon={Cloud} label="Part. Size" value={params.particleSize} unit="μm" />
                         <InfoRow icon={Weight} label="Part. Mass" value={params.particleMass} unit="amu" />
                         <InfoRow icon={Wind} label="Wind Speed" value={params.windSpeed} unit="m/s" />
                         <InfoRow icon={Move} label="Wind Dir" value={params.windDirection} unit="°" />
                         <InfoRow icon={Layers} label="Spread" value={params.distributionSpread} unit="σ" />
                    </div>
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Class Legend</h3>
                     <div className="space-y-2 text-[10px] font-bold text-slate-600">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> Very High (Critical)</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-sm"></div> High</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-sm"></div> Moderate</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> Low</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> Very Low</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-slate-200 rounded-sm"></div> None</div>
                     </div>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative bg-slate-100 overflow-hidden">
                
                {/* MODE: GRID CANVAS */}
                {mode === 'GRID' && (
                    <>
                        <canvas 
                            ref={canvasRef}
                            width={1200}
                            height={800}
                            className="w-full h-full cursor-move block"
                            onWheel={handleWheel}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        />
                        
                        {/* Grid Controls Hint */}
                        <div className="absolute top-4 left-4 bg-white/90 p-3 rounded shadow-sm border border-slate-200 pointer-events-none">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-1">Navigation</h4>
                            <ul className="text-[10px] text-slate-600 space-y-0.5">
                                <li>• Scroll to Zoom</li>
                                <li>• Drag to Pan</li>
                            </ul>
                        </div>

                        {/* DISTANCE SCALE (GRID MODE) */}
                        <div className="absolute bottom-6 left-6 bg-white/90 p-2 rounded shadow border border-slate-200 pointer-events-none z-[400] flex flex-col gap-1 items-start">
                             <div className="text-[10px] font-bold text-slate-500 uppercase">Distance Scale</div>
                             <div className="flex items-center gap-2">
                                 {/* Visual Bar */}
                                 <div className="h-2 bg-slate-800 border-x border-white" style={{ width: `${scaleBarWidthPx}px` }}></div>
                                 <span className="text-xs font-mono font-bold text-slate-800">{realDistanceMeters.toFixed(1)} m</span>
                             </div>
                             <div className="text-[9px] text-slate-400 font-mono">Grid units match simulation scale (1u = 1m)</div>
                        </div>
                    </>
                )}

                {/* MODE: REAL MAP (LEAFLET) */}
                {mode === 'REAL' && (
                    <div className="w-full h-full relative z-0">
                        <MapContainer 
                            center={[lat, lng]} 
                            zoom={15} 
                            scrollWheelZoom={true} // ENABLED ZOOM
                            style={{ height: '100%', width: '100%' }}
                        >
                            <ChangeView center={[lat, lng]} zoom={15} />
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <ScaleControl position="bottomleft" imperial={false} />
                            
                            {/* Replaced Slow Marker Logic with Efficient Canvas Overlay */}
                            <RealMapCanvasOverlay 
                                points={pointsRef.current} 
                                centerLat={lat} 
                                centerLng={lng} 
                            />
                        </MapContainer>
                    </div>
                )}

                {/* IMPROVED LEGEND OVERLAY (SHARED - 5 Color Scale) */}
                <div className="absolute bottom-6 right-6 z-[400] bg-white/95 backdrop-blur border border-slate-200 p-5 rounded-lg w-96 shadow-xl">
                    <div className="text-xs font-bold text-slate-700 mb-3 uppercase flex justify-between items-center">
                        <span>Deposition Intensity (Particles/Area)</span>
                    </div>
                    {/* Gradient Bar - 5 Sections */}
                    <div className="h-4 w-full rounded mb-2 flex border border-slate-200 shadow-inner overflow-hidden">
                        <div className="flex-1 bg-blue-500"></div>
                        <div className="flex-1 bg-green-500"></div>
                        <div className="flex-1 bg-yellow-500"></div>
                        <div className="flex-1 bg-orange-500"></div>
                        <div className="flex-1 bg-red-500"></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 font-mono font-bold">
                        <span>Very Low</span>
                        <span>Low</span>
                        <span>Mod</span>
                        <span>High</span>
                        <span>V.High</span>
                    </div>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
}