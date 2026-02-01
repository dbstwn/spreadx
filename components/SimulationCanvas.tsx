import React, { useRef, useMemo, useEffect, forwardRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewcube } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationParams, VizMode, TelemetryData, PointData, LogEntry } from '../types';

// Constants
const PARTICLE_COUNT = 15000; 
const GRAVITY = -9.81;
const TIME_STEP = 0.016;

// Helpers
const getVelocityColor = (speed: number) => {
  const normalized = Math.min(Math.max(speed, 0), 15) / 15;
  const hue = 120 - (normalized * 120);
  return new THREE.Color(`hsl(${hue}, 90%, 45%)`);
};

const getPressureColor = (pressure: number) => {
  const normalized = Math.min(Math.max(pressure, 0), 1);
  const hue = 120 - (normalized * 120);
  return new THREE.Color(`hsl(${hue}, 90%, 45%)`);
};

// --- Particles System ---
interface ParticlesProps {
  params: SimulationParams;
  mode: VizMode;
  isRunning: boolean;
  heatmapPointsRef: React.MutableRefObject<PointData[]>;
  telemetryRef: React.MutableRefObject<TelemetryData>;
  addLog: (type: LogEntry['type'], msg: string) => void;
}

const Particles = forwardRef(({ params, mode, isRunning, heatmapPointsRef, telemetryRef, addLog }: ParticlesProps, ref) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const spawnIndexRef = useRef(0);
  
  // Physics State - Persistent
  const particles = useMemo(() => {
    return new Array(PARTICLE_COUNT).fill(0).map((_, i) => ({
      id: i,
      position: new THREE.Vector3(0, params.chimneyHeight, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      life: 0,
      active: false,
      deposited: false
    }));
  }, [params.chimneyHeight]); 

  // Simulation State Refs
  const totalTimeRef = useRef(0);
  const totalSpawnedRef = useRef(0);
  const lastLogTime = useRef(0);

  // Reset Logic
  useEffect(() => {
    if (!isRunning) {
      particles.forEach(p => {
        p.active = false;
        p.deposited = false;
        p.life = 0;
        p.position.set(0, params.chimneyHeight, 0);
        p.velocity.set(0, 0, 0);
      });
      
      spawnIndexRef.current = 0;
      totalTimeRef.current = 0;
      totalSpawnedRef.current = 0;
      if (telemetryRef.current) {
         telemetryRef.current.time = 0;
         telemetryRef.current.rate = 0;
         telemetryRef.current.count = 0;
         telemetryRef.current.maxHeight = 0;
         telemetryRef.current.maxDist = 0;
      }
      
      // Clear Heatmap Points
      heatmapPointsRef.current = [];
      
      // Clear Visuals
      if (meshRef.current) {
         particles.forEach((_, i) => {
            dummy.position.set(0, -9999, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
         });
         meshRef.current.instanceMatrix.needsUpdate = true;
      }

      addLog('INFO', 'Simulation paused by user');
    } else {
      addLog('SYS', 'Physics engine initialized');
    }
  }, [isRunning, params, particles, dummy, heatmapPointsRef, telemetryRef]);

  // Simulation Loop
  useFrame((state, delta) => {
    if (!meshRef.current || !isRunning) return;

    totalTimeRef.current += delta;
    const currentTime = totalTimeRef.current;

    // Frequent logging throttle
    if (currentTime - lastLogTime.current > 2.0) {
        addLog('PHYS', `Integration Step | Active: ${particles.filter(p=>p.active).length}`);
        lastLogTime.current = currentTime;
    }

    const { chimneyHeight, particleMass, particleSize, windSpeed, windDirection, distributionSpread, particleDistribution } = params;
    
    // Wind vector
    const windRad = (windDirection * Math.PI) / 180;
    const windVec = new THREE.Vector3(Math.cos(windRad) * windSpeed, 0, Math.sin(windRad) * windSpeed);

    // Emission Logic
    const emissionRate = 20 * particleDistribution; 
    const numToSpawn = Math.floor(emissionRate * delta) + (Math.random() < (emissionRate * delta % 1) ? 1 : 0);
    
    let spawned = 0;
    let attempts = 0;

    while (spawned < numToSpawn && attempts < PARTICLE_COUNT) {
        const i = spawnIndexRef.current;
        const p = particles[i];

        if (!p.active) {
            p.active = true;
            p.deposited = false; 
            p.life = 20 + Math.random() * 10; 
            
            p.position.set(
                (Math.random() - 0.5) * 1.0, 
                chimneyHeight, 
                (Math.random() - 0.5) * 1.0
            );
            
            p.velocity.set(
                (Math.random() - 0.5) * distributionSpread, 
                4 + Math.random() * 2, 
                (Math.random() - 0.5) * distributionSpread
            );
            spawned++;
            totalSpawnedRef.current++;
        }
        
        spawnIndexRef.current = (spawnIndexRef.current + 1) % PARTICLE_COUNT;
        attempts++;
    }
    
    if (spawned > 0 && Math.random() < 0.05) {
        addLog('INFO', `Emitted batch: ${spawned} particles`);
    }

    let maxHeight = 0;
    let maxDist = 0;
    let depositedThisFrame = 0;

    particles.forEach((p, i) => {
      if (p.active) {
        // Physics
        const dragCoeff = (1.0 / particleMass) * particleSize * 0.8;
        p.velocity.x += (windVec.x - p.velocity.x) * dragCoeff * TIME_STEP;
        p.velocity.z += (windVec.z - p.velocity.z) * dragCoeff * TIME_STEP;
        p.velocity.y += (GRAVITY * particleMass * 0.05) * TIME_STEP; 

        // Turbulence
        const turbulence = distributionSpread * 0.2;
        p.velocity.x += (Math.random() - 0.5) * turbulence;
        p.velocity.z += (Math.random() - 0.5) * turbulence;
        p.velocity.y += (Math.random() - 0.5) * (turbulence * 0.5);

        // Integrate
        p.position.addScaledVector(p.velocity, TIME_STEP);

        // Ground Collision Logic
        if (p.position.y <= 0) {
          p.position.y = 0;
          p.active = false;
          p.deposited = true;
          depositedThisFrame++;
          
          // Store actual coordinate
          heatmapPointsRef.current.push({ x: p.position.x, z: p.position.z });
        }

        p.life -= TIME_STEP;
        if (p.life <= 0) {
            p.active = false; 
        }

        // Stats Update
        if (p.position.y > maxHeight) maxHeight = p.position.y;
        const d = Math.sqrt(p.position.x*p.position.x + p.position.z*p.position.z);
        if (d > maxDist) maxDist = d;

        // Render Update
        dummy.position.copy(p.position);
        const scale = 0.3 * particleSize;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);

        // Color
        let color;
        if (mode === 'velocity') {
          color = getVelocityColor(p.velocity.length());
        } else {
          const distFromSource = p.position.distanceTo(new THREE.Vector3(0, chimneyHeight, 0));
          const pressure = Math.exp(-distFromSource * 0.05); 
          color = getPressureColor(pressure);
        }
        meshRef.current!.setColorAt(i, color);

      } else if (p.deposited) {
        // Render Deposited
        dummy.position.copy(p.position);
        const scale = 0.3 * particleSize;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
        
        const sootColor = new THREE.Color(0.2, 0.2, 0.2);
        meshRef.current!.setColorAt(i, sootColor);

        const d = Math.sqrt(p.position.x*p.position.x + p.position.z*p.position.z);
        if (d > maxDist) maxDist = d;
      } else {
        // Hidden
        dummy.position.set(0, -9999, 0);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      }
    });

    if (depositedThisFrame > 0 && Math.random() < 0.1) {
        addLog('PHYS', `Ground deposition recorded: ${depositedThisFrame} units`);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

    // Update Telemetry Ref
    if (telemetryRef.current) {
        telemetryRef.current.time = totalTimeRef.current;
        telemetryRef.current.rate = spawned / delta;
        telemetryRef.current.count = totalSpawnedRef.current;
        telemetryRef.current.maxHeight = Math.max(telemetryRef.current.maxHeight, maxHeight);
        telemetryRef.current.maxDist = Math.max(telemetryRef.current.maxDist, maxDist);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial 
        color="#ffffff"
        emissive="#444444"
        emissiveIntensity={0.2}
        roughness={0.5} 
        metalness={0.5} 
      />
    </instancedMesh>
  );
});

const SceneContent = forwardRef(({ params, mode, isRunning, heatmapPointsRef, telemetryRef, addLog }: ParticlesProps, ref) => {
  return (
    <>
      <OrbitControls 
        makeDefault
        target={[0, params.chimneyHeight / 2, 0]} 
        maxPolarAngle={Math.PI / 2 - 0.05} 
        minDistance={10} 
        maxDistance={200} 
      />
      
      <GizmoHelper alignment="top-right" margin={[80, 80]}>
         <GizmoViewcube 
            font="16px Inter" 
            opacity={0.9} 
            color="white" 
            strokeColor="#94a3b8" 
            textColor="#0f172a" 
            hoverColor="#3b82f6"
         />
      </GizmoHelper>

      <color attach="background" args={['#f8fafc']} />
      <fog attach="fog" args={['#f8fafc', 50, 1000]} />
      
      <Grid 
        position={[0, -0.01, 0]} 
        args={[200, 200]} 
        cellSize={10} 
        cellThickness={0.6} 
        cellColor="#cbd5e1" 
        sectionSize={50} 
        sectionThickness={1.0}
        sectionColor="#94a3b8" 
        fadeDistance={400}
      />
      
      <axesHelper args={[5]} />

      <group position={[0, params.chimneyHeight / 2, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.5, 2, params.chimneyHeight, 32]} />
          <meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[1.52, 2.02, params.chimneyHeight, 8]} />
          <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={0.2} />
        </mesh>
        <mesh position={[0, params.chimneyHeight / 2, 0]} castShadow>
          <torusGeometry args={[1.6, 0.2, 16, 32]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
      </group>

      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[40, 60, 20]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      >
        <orthographicCamera attach="shadow-camera" args={[-60, 60, -60, 60, 0.1, 200]} />
      </directionalLight>
      <hemisphereLight args={['#ffffff', '#f1f5f9', 0.5]} />

      <Particles 
        ref={ref}
        params={params} 
        mode={mode} 
        isRunning={isRunning} 
        heatmapPointsRef={heatmapPointsRef}
        telemetryRef={telemetryRef}
        addLog={addLog}
      />
    </>
  );
});

export default forwardRef(function SimulationCanvas(props: ParticlesProps, ref) {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden relative bg-slate-100">
       <Canvas shadows camera={{ position: [50, 40, 50], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
        <SceneContent {...props} ref={ref} />
      </Canvas>
    </div>
  );
});