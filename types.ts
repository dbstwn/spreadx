export interface SimulationParams {
  chimneyHeight: number; // 10 to 50 meters
  particleMass: number; // 1 to 10 arbitrary units
  particleSize: number; // 0.1 to 2.0 arbitrary units
  windSpeed: number; // 0 to 20 m/s
  windDirection: number; // 0 to 360 degrees
  distributionSpread: number; // 0.1 to 2.0 (turbulence factor)
  particleDistribution: number; // 1 to 10 (emission multiplier)
}

export type VizMode = 'velocity' | 'pressure';

export interface ParticleData {
  position: [number, number, number];
  velocity: [number, number, number];
  life: number;
  maxLife: number;
  seed: number;
}

export interface TelemetryData {
  time: number;
  rate: number;
  count: number;
  maxHeight: number;
  maxDist: number;
}

export interface PointData {
  x: number;
  z: number;
}

export interface LogEntry {
  timestamp: string;
  type: 'INFO' | 'WARN' | 'SYS' | 'PHYS';
  message: string;
}