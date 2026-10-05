import * as THREE from 'three';
import type { RoadSegmentGeo } from '../types/geo';
import { GeoCoordinateSystem } from './GeoCoordinateSystem';
import { createVehicle, type VehicleInstance } from '../components/Scene/Vehicles';
import type { VehicleConfig } from '../types/infrastructure';

interface SimVehicle {
  instance: VehicleInstance;
  road: RoadSegmentGeo;
  worldPoints: THREE.Vector3[];
  t: number;             // Parametric distance [0..1] along road polyline
  speedMps: number;      // Speed in meters per second
  direction: 1 | -1;     // 1 = along points, -1 = reverse
  laneOffset: number;    // Lateral offset in meters (left or right of centerline)
  totalLength: number;   // Total length of this road in meters
  distances: number[];   // Cumulative distance array for points
}

export class RealTrafficSimulation {
  rootGroup: THREE.Group;
  private vehicles: SimVehicle[] = [];
  private roads: RoadSegmentGeo[] = [];
  private coordSystem: GeoCoordinateSystem | null = null;
  private active = true;

  // Selected vehicle for chase camera
  selectedVehicle: SimVehicle | null = null;

  constructor() {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'real-traffic-simulation-root';
  }

  buildSimulation(roads: RoadSegmentGeo[], coordSystem: GeoCoordinateSystem): void {
    this.clear();
    this.roads = roads;
    this.coordSystem = coordSystem;

    // Filter candidate roads for traffic (major arterials & collectors)
    const trafficRoads = roads.filter(r =>
      r.geometry &&
      r.geometry.length >= 2 &&
      ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'].includes(r.highwayType)
    );

    if (trafficRoads.length === 0) return;

    // Palette of vehicle colors
    const COLORS = [
      '#ffffff', '#1e293b', '#dc2626', '#2563eb', '#f59e0b',
      '#10b981', '#64748b', '#0f172a', '#e2e8f0', '#7c3aed'
    ];
    const TYPES: ('car' | 'bus' | 'truck')[] = [
      'car', 'car', 'car', 'car', 'car', 'bus', 'truck'
    ];

    // Determine target vehicle count based on road density (40-90 vehicles)
    const targetCount = Math.min(100, Math.max(35, Math.floor(trafficRoads.length * 1.2)));

    for (let i = 0; i < targetCount; i++) {
      const road = trafficRoads[i % trafficRoads.length];
      const worldPoints = road.geometry.map(([lat, lon]) =>
        coordSystem.geoToWorld(lat, lon, 0.08)
      );

      // Compute cumulative segment distances
      const distances: number[] = [0];
      let totalLen = 0;
      for (let j = 1; j < worldPoints.length; j++) {
        const d = worldPoints[j].distanceTo(worldPoints[j - 1]);
        totalLen += d;
        distances.push(totalLen);
      }

      if (totalLen < 15) continue; // Skip tiny stubs

      const vType = TYPES[i % TYPES.length];
      const color = COLORS[i % COLORS.length];

      // Base speed scaled by highway hierarchy
      let baseSpeed = 14; // m/s (~50 km/h)
      if (road.highwayType === 'motorway') baseSpeed = 24; // ~85 km/h
      else if (road.highwayType === 'trunk') baseSpeed = 20; // ~72 km/h
      else if (road.highwayType === 'primary') baseSpeed = 16;
      else if (road.highwayType === 'secondary') baseSpeed = 12;
      else baseSpeed = 10;

      // Slight individual speed variance (±20%)
      const speed = baseSpeed * (0.85 + Math.random() * 0.3);

      const direction: 1 | -1 = (i % 2 === 0 || road.oneWay) ? 1 : -1;
      const roadHalfWidth = (road.estimatedWidth || 7.0) / 2.0;
      // Offset into respective driving lane: in India/LHD, forward is on left side (-offset)
      const laneOffset = (direction === 1 ? -1 : 1) * (roadHalfWidth * 0.5);

      const config: VehicleConfig = {
        id: `sim_veh_${i}_${road.id}`,
        type: vType,
        color,
        laneIndex: i % 2,
        initialOffset: 0,
        speed,
        direction,
      };

      const inst = createVehicle(config);
      this.rootGroup.add(inst.group);

      const simV: SimVehicle = {
        instance: inst,
        road,
        worldPoints,
        t: (i * 0.17 + Math.random() * 0.1) % 1.0,
        speedMps: speed,
        direction,
        laneOffset,
        totalLength: totalLen,
        distances,
      };

      // Set initial position
      this.updateVehiclePosition(simV, 0);
      this.vehicles.push(simV);
    }
  }

  private updateVehiclePosition(v: SimVehicle, dt: number): void {
    if (v.totalLength <= 0) return;

    // Advance parametric t along road
    const deltaT = (v.speedMps * dt * v.direction) / v.totalLength;
    v.t += deltaT;

    // Loop around road segment
    if (v.t > 1.0) v.t -= 1.0;
    if (v.t < 0.0) v.t += 1.0;

    const targetDist = v.t * v.totalLength;

    // Find bounding segment in polyline
    let segIdx = 0;
    for (let i = 0; i < v.distances.length - 1; i++) {
      if (targetDist >= v.distances[i] && targetDist <= v.distances[i + 1]) {
        segIdx = i;
        break;
      }
    }

    const p0 = v.worldPoints[segIdx];
    const p1 = v.worldPoints[Math.min(segIdx + 1, v.worldPoints.length - 1)];
    const segLen = Math.max(0.001, v.distances[segIdx + 1] - v.distances[segIdx]);
    const segT = Math.max(0, Math.min(1, (targetDist - v.distances[segIdx]) / segLen));

    // Interpolate centerline point
    const centerPt = new THREE.Vector3().lerpVectors(p0, p1, segT);

    // Compute road tangent and perpendicular normal for lane offset
    const tangent = new THREE.Vector3().subVectors(p1, p0).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // Final vehicle position with lateral lane offset
    const finalPos = new THREE.Vector3().addVectors(
      centerPt,
      normal.clone().multiplyScalar(v.laneOffset)
    );

    v.instance.group.position.copy(finalPos);

    // Orient vehicle towards motion direction
    let angle = Math.atan2(tangent.x, tangent.z);
    if (v.direction === -1) {
      angle += Math.PI;
    }
    v.instance.group.rotation.set(0, angle, 0);
  }

  update(delta: number): void {
    if (!this.active || this.vehicles.length === 0) return;
    const clampedDt = Math.min(0.08, delta);

    for (let i = 0; i < this.vehicles.length; i++) {
      this.updateVehiclePosition(this.vehicles[i], clampedDt);
    }
  }

  setVisible(visible: boolean): void {
    this.rootGroup.visible = visible;
  }

  getVehicleCount(): number {
    return this.vehicles.length;
  }

  clear(): void {
    while (this.rootGroup.children.length > 0) {
      const child = this.rootGroup.children[0];
      this.rootGroup.remove(child);
    }
    this.vehicles = [];
    this.selectedVehicle = null;
  }
}
