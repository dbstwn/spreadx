import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Line, Sphere, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationParams } from '../types';
import { Maximize2 } from 'lucide-react';

// Constants for Graph Scale
const GRAPH_SIZE = 10;

const AxisLabel = ({ position, text, color = "#475569" }: { position: [number, number, number], text: string, color?: string }) => (
  <Billboard position={position} follow={true} lockX={false} lockY={false} lockZ={false}>
      <Text fontSize={0.5} color={color} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#ffffff">
          {text}
      </Text>
  </Billboard>
);

const AxisTicks = () => {
    return (
        <group>
             {/* X Ticks (Particle Size) */}
             {[0, 0.5, 1.0].map((v, i) => (
                <Billboard key={`x-${i}`} position={[v * GRAPH_SIZE, -0.5, 0]}>
                    <Text fontSize={0.3} color="#94a3b8">{(v * 2).toFixed(1)}</Text>
                </Billboard>
             ))}
             
             {/* Y Ticks (Distance) */}
             {[0, 0.5, 1.0].map((v, i) => (
                 <Billboard key={`y-${i}`} position={[-0.5, v * GRAPH_SIZE, 0]}>
                     <Text fontSize={0.3} color="#94a3b8">{(v * 800).toFixed(0)}</Text>
                 </Billboard>
             ))}

              {/* Z Ticks (Wind Speed) */}
              {[0, 0.5, 1.0].map((v, i) => (
                 <Billboard key={`z-${i}`} position={[0, -0.5, v * GRAPH_SIZE]}>
                     <Text fontSize={0.3} color="#94a3b8">{(v * 25).toFixed(0)}</Text>
                 </Billboard>
             ))}
        </group>
    )
}

const Axis = () => (
  <group>
    {/* Axes Lines */}
    <Line points={[[0,0,0], [GRAPH_SIZE,0,0]]} color="#ef4444" lineWidth={2} /> {/* X: Particle Size - Red */}
    <Line points={[[0,0,0], [0,GRAPH_SIZE,0]]} color="#10b981" lineWidth={2} /> {/* Y: Distance - Green */}
    <Line points={[[0,0,0], [0,0,GRAPH_SIZE]]} color="#3b82f6" lineWidth={2} /> {/* Z: Wind Speed - Blue */}

    {/* Labels with Billboard for Readability */}
    <AxisLabel position={[GRAPH_SIZE + 1.5, 0, 0]} text="Size (µm)" />
    <AxisLabel position={[0, GRAPH_SIZE + 1, 0]} text="Dist (m)" />
    <AxisLabel position={[0, 0, GRAPH_SIZE + 1.5]} text="Wind (m/s)" />

    <AxisTicks />
    
    {/* Floor Grid */}
    <gridHelper 
        args={[GRAPH_SIZE, 10, 0xe2e8f0, 0xf1f5f9]} 
        position={[GRAPH_SIZE/2, 0, GRAPH_SIZE/2]} 
    />
  </group>
);

const TheoreticalSurface = ({ params }: { params: SimulationParams }) => {
  // Custom Mesh Generation
  const { positions, indices } = useMemo(() => {
    const sizeSteps = 30;
    const windSteps = 30;
    const vertices = [];
    const indices = [];

    for (let z = 0; z <= windSteps; z++) {
        for (let x = 0; x <= sizeSteps; x++) {
            const u = x / sizeSteps; // 0..1 (Size)
            const v = z / windSteps; // 0..1 (Wind)

            // Map to physical values
            const pSize = 0.1 + u * 1.9; // 0.1 to 2.0
            const pWind = 0 + v * 25; // 0 to 25

            // Physics Model
            // Heavier/Larger particles fall faster -> Less distance
            // Fall Speed approx proportional to mass and size (Stokes law simplified)
            const fallSpeed = Math.max(0.2, params.particleMass * 0.3 + pSize * 0.5);
            const timeToGround = params.chimneyHeight / fallSpeed;
            const distance = pWind * timeToGround;

            // Map back to Graph Coordinates (0..10)
            const gx = u * GRAPH_SIZE;
            const gz = v * GRAPH_SIZE;
            const gy = Math.min((distance / 800) * GRAPH_SIZE, GRAPH_SIZE); // Scale distance (max 800m visible)

            vertices.push(gx, gy, gz);
        }
    }

    for (let z = 0; z < windSteps; z++) {
        for (let x = 0; x < sizeSteps; x++) {
            const a = z * (sizeSteps + 1) + x;
            const b = z * (sizeSteps + 1) + x + 1;
            const c = (z + 1) * (sizeSteps + 1) + x;
            const d = (z + 1) * (sizeSteps + 1) + x + 1;

            indices.push(a, b, d);
            indices.push(a, d, c);
        }
    }

    return {
        positions: new Float32Array(vertices),
        indices: indices
    };
  }, [params.chimneyHeight, params.particleMass]);

  // Current Point
  const currentPos = useMemo(() => {
    const s = (params.particleSize - 0.1) / 1.9; // Norm size
    const w = params.windSpeed / 25.0; // Norm wind
    
    const fallSpeed = Math.max(0.2, params.particleMass * 0.3 + params.particleSize * 0.5);
    const timeToGround = params.chimneyHeight / fallSpeed;
    const distance = params.windSpeed * timeToGround;

    return new THREE.Vector3(
        s * GRAPH_SIZE,
        Math.min((distance / 800) * GRAPH_SIZE, GRAPH_SIZE),
        w * GRAPH_SIZE
    );
  }, [params]);

  return (
    <>
        {/* Wireframe Surface */}
        <mesh position={[0,0,0]}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={positions.length / 3}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="index"
                    count={indices.length}
                    array={new Uint16Array(indices)}
                    itemSize={1}
                />
            </bufferGeometry>
            <meshStandardMaterial color="#3b82f6" wireframe opacity={0.3} transparent side={THREE.DoubleSide} />
        </mesh>
        
        {/* Solid Surface (Bottom) for depth */}
        <mesh position={[0, -0.05, 0]}>
             <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={positions.length / 3}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="index"
                    count={indices.length}
                    array={new Uint16Array(indices)}
                    itemSize={1}
                />
            </bufferGeometry>
            <meshStandardMaterial color="#93c5fd" opacity={0.1} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>

        {/* Current Data Point Marker */}
        <group position={currentPos}>
            <Sphere args={[0.4, 16, 16]}>
                <meshStandardMaterial color="#ef4444" emissive="#b91c1c" emissiveIntensity={0.8} />
            </Sphere>
            {/* Drop lines */}
            <Line points={[[0,0,0], [0, -currentPos.y, 0]]} color="#cbd5e1" dashed lineWidth={1} />
            <Line points={[[0,0,0], [-currentPos.x, 0, 0]]} color="#cbd5e1" dashed lineWidth={1} />
            <Line points={[[0,0,0], [0, 0, -currentPos.z]]} color="#cbd5e1" dashed lineWidth={1} />
        </group>
    </>
  );
};

export default function AnalyticsGraph({ params, onZoom }: { params: SimulationParams, onZoom?: () => void }) {
  return (
    <div className="w-full h-full bg-white rounded border border-slate-200 relative overflow-hidden group">
        <div className="absolute top-3 left-4 z-10 pointer-events-none">
             {/* 3. Chart Title Update */}
             <h3 className="text-sm text-slate-800 font-bold tracking-tight">Parameter–Environment Chart</h3>
             <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">Particle Size vs Wind Speed vs Dist</p>
             
             <div className="flex items-center gap-2 mt-2">
                 <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400 opacity-50 border border-blue-500"></div>
                    <span className="text-[9px] text-slate-500">Model Surface</span>
                 </div>
                 <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-[9px] text-slate-500 font-bold">Current Sim</span>
                 </div>
             </div>
        </div>
        
        {/* Zoom Button */}
        {onZoom && (
          <button 
            onClick={onZoom}
            className="absolute top-2 right-2 z-20 p-1.5 bg-white border border-slate-200 rounded shadow-sm text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-all opacity-0 group-hover:opacity-100"
            title="Maximize Chart"
          >
            <Maximize2 size={16} />
          </button>
        )}

      <Canvas camera={{ position: [18, 12, 18], fov: 35 }}>
        <OrbitControls autoRotate autoRotateSpeed={1} target={[GRAPH_SIZE/2, GRAPH_SIZE/3, GRAPH_SIZE/2]} minPolarAngle={0} maxPolarAngle={Math.PI/2} />
        <Axis />
        <TheoreticalSurface params={params} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      </Canvas>
    </div>
  );
}
