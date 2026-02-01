import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ArrowRight } from 'lucide-react';

// --- 3D Background Component ---

const NetworkParticleField = () => {
  const count = 300; // Increased density
  const connectionDistance = 4.5; // Slightly longer connections
  const { viewport, mouse } = useThree();

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * viewport.width * 1.5;
      pos[i * 3 + 1] = (Math.random() - 0.5) * viewport.height * 1.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5;
      
      vel[i * 3] = (Math.random() - 0.5) * 0.01; // Slower, more elegant
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      vel[i * 3 + 2] = 0;
    }
    return [pos, vel];
  }, [viewport]);

  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  useFrame(() => {
    // 1. Update Positions & Mouse Interaction
    const mouseVec = new THREE.Vector3(
        (mouse.x * viewport.width) / 2, 
        (mouse.y * viewport.height) / 2, 
        0
    );

    for (let i = 0; i < count; i++) {
      let ix = i * 3;
      let iy = i * 3 + 1;
      
      // Apply Velocity
      positions[ix] += velocities[ix];
      positions[iy] += velocities[iy];

      // Wrap around screen
      if (positions[ix] > viewport.width / 1.5) positions[ix] = -viewport.width / 1.5;
      if (positions[ix] < -viewport.width / 1.5) positions[ix] = viewport.width / 1.5;
      if (positions[iy] > viewport.height / 1.5) positions[iy] = -viewport.height / 1.5;
      if (positions[iy] < -viewport.height / 1.5) positions[iy] = viewport.height / 1.5;

      // Mouse Attraction/Repulsion (Complex interaction)
      const dx = positions[ix] - mouseVec.x;
      const dy = positions[iy] - mouseVec.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < 6) {
        // Move away gently
        const force = (6 - dist) * 0.02;
        positions[ix] += (dx / dist) * force;
        positions[iy] += (dy / dist) * force;
      }
    }
    
    if (pointsRef.current) {
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // 2. Update Lines (Atmospheric Bonds)
    if (linesRef.current) {
        const linePositions = [];
        
        for (let i = 0; i < count; i++) {
            // Optimization: check distance squared to avoid sqrt
            const dx = positions[i*3] - mouseVec.x;
            const dy = positions[i*3+1] - mouseVec.y;
            
            // Only connect particles near the mouse or near each other
            // To save performance, we limit connections
            for (let j = i + 1; j < count; j++) {
                const dx2 = positions[i*3] - positions[j*3];
                const dy2 = positions[i*3+1] - positions[j*3+1];
                const distSq = dx2*dx2 + dy2*dy2;

                if (distSq < connectionDistance * connectionDistance) {
                    linePositions.push(
                        positions[i*3], positions[i*3+1], positions[i*3+2],
                        positions[j*3], positions[j*3+1], positions[j*3+2]
                    );
                }
            }
        }

        linesRef.current.geometry.setAttribute(
            'position', 
            new THREE.Float32BufferAttribute(linePositions, 3)
        );
    }
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
            <bufferAttribute
                attach="attributes-position"
                count={positions.length / 3}
                array={positions}
                itemSize={3}
            />
        </bufferGeometry>
        <pointsMaterial
            size={0.08}
            color="#64748b"
            transparent
            opacity={0.6}
            sizeAttenuation={true}
        />
      </points>
      <lineSegments ref={linesRef}>
          <bufferGeometry />
          <lineBasicMaterial 
            color="#94a3b8" 
            transparent 
            opacity={0.15} 
            depthWrite={false}
          />
      </lineSegments>
    </>
  );
};

// --- Main Landing Page ---

export default function LandingPage({ onExplore }: { onExplore: () => void }) {
  return (
    <div className="relative w-full h-full bg-white font-sans text-slate-800 overflow-hidden selection:bg-blue-100 selection:text-blue-900">
      
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-white via-slate-50 to-slate-100">
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }} dpr={[1, 2]}>
             <NetworkParticleField />
        </Canvas>
      </div>

      {/* Content Layer */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 pointer-events-none">
        
        <div className="max-w-6xl w-full text-center pointer-events-auto animate-fade-in-up">
            {/* Header / Logo Area - Removed Icon, Increased Size */}
            <div className="mb-14 flex flex-col items-center gap-4">
                 <h1 className="text-7xl md:text-8xl font-bold tracking-tighter text-slate-900 leading-none">
                    Spread<span className="text-slate-400 font-light">X</span>
                 </h1>
                 <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 bg-white/80 backdrop-blur px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">
                    Particle Dispersion Simulation System
                 </p>
            </div>

            {/* Main Headline */}
            <h2 className="text-4xl md:text-5xl font-light tracking-tight text-slate-800 mb-8 leading-tight">
                Learn How Post-Burning Particles<br />
                <span className="font-semibold text-slate-900">Move Across the Environment</span>
            </h2>

            {/* Subtext */}
            <p className="text-lg text-slate-500 font-light mb-12 max-w-2xl mx-auto leading-relaxed">
                Simulate, visualize, and analyze how combustion particles disperse, travel with wind, and affect surrounding regions in real time.
            </p>
            
            {/* Call to Action */}
            <div className="flex flex-col items-center gap-6">
                <button 
                    onClick={onExplore}
                    className="group px-12 py-5 bg-slate-900 text-white rounded-lg font-semibold tracking-wide shadow-2xl shadow-slate-300 hover:shadow-xl hover:bg-black hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 text-lg"
                >
                    ENTER SIMULATION
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>

        {/* Footer info */}
        <div className="absolute bottom-8 w-full text-center">
            <div className="flex justify-center gap-8 text-[11px] text-slate-400 font-medium tracking-wide uppercase">
                <span>• Atmospheric Dynamics</span>
                <span>• Pollution Tracking</span>
                <span>• Hazard Analysis</span>
            </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}