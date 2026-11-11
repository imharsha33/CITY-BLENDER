import * as THREE from 'three';
import type { RoadSegmentGeo } from '../types/geo';
import { GeoCoordinateSystem } from './GeoCoordinateSystem';
import { createVehicle, type VehicleInstance } from '../components/Scene/Vehicles';
import type { VehicleConfig } from '../types/infrastructure';

interface SimVehicle {
  instance: VehicleInstance;
  road: RoadSegmentGeo;
  worldPoints: THREE.Vector3[];
  t: number;                // Parametric distance [0..1] along road polyline
  desiredSpeedMps: number;  // Cruising speed based on road hierarchy
  currentSpeedMps: number;  // Dynamic actual speed (accelerating/braking)
  direction: 1 | -1;        // 1 = forward along polyline, -1 = reverse
  laneIndex: number;        // Lane index
  laneOffset: number;       // Lateral offset in meters (left or right of centerline)
  totalLength: number;      // Total length of this road in meters
  distances: number[];      // Cumulative distance array for points
  isBraking: boolean;
  waitingAtJunction: boolean;
  worldPosition: THREE.Vector3;
}

interface JunctionNode {
  id: string;
  position: THREE.Vector3;
  connectedRoadIds: string[];
}

export class RealTrafficSimulation {
  rootGroup: THREE.Group;
  private vehicles: SimVehicle[] = [];
  private roads: RoadSegmentGeo[] = [];
  private coordSystem: GeoCoordinateSystem | null = null;
  private junctions: JunctionNode[] = [];
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

    // Build junction index from road endpoints to enable realistic intersection yielding
    this.buildJunctionIndex(trafficRoads, coordSystem);

    // Palette of vehicle colors
    const COLORS = [
      '#ffffff', '#1e293b', '#dc2626', '#2563eb', '#f59e0b',
      '#10b981', '#64748b', '#0f172a', '#e2e8f0', '#7c3aed'
    ];
    const TYPES: ('sedan' | 'suv' | 'bike' | 'bus' | 'truck')[] = [
      'sedan', 'suv', 'sedan', 'suv', 'bike', 'bus', 'truck', 'sedan', 'suv', 'bike'
    ];

    // Target vehicle count based on road density (35-85 vehicles)
    const targetCount = Math.min(85, Math.max(30, Math.floor(trafficRoads.length * 1.1)));

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
      let baseSpeed = 13; // m/s (~47 km/h)
      if (road.highwayType === 'motorway') baseSpeed = 22; // ~80 km/h
      else if (road.highwayType === 'trunk') baseSpeed = 18; // ~65 km/h
      else if (road.highwayType === 'primary') baseSpeed = 15; // ~54 km/h
      else if (road.highwayType === 'secondary') baseSpeed = 11;
      else baseSpeed = 9;

      // Slight individual driver variance (±15%)
      const speed = baseSpeed * (0.88 + Math.random() * 0.24);

      const direction: 1 | -1 = (i % 2 === 0 || road.oneWay) ? 1 : -1;
      const roadHalfWidth = (road.estimatedWidth || 7.0) / 2.0;

      // Distribute vehicles across inner/outer lanes if multi-lane
      const numLanes = road.lanes || (roadHalfWidth > 5.0 ? 2 : 1);
      const laneIdx = (i % numLanes);
      const laneFraction = numLanes > 1 ? (laneIdx === 0 ? 0.35 : 0.70) : 0.50;

      // Offset into respective driving lane: in India/LHD, forward is on left side (-offset)
      const laneOffset = (direction === 1 ? -1 : 1) * (roadHalfWidth * laneFraction);

      const config: VehicleConfig = {
        id: `sim_veh_${i}_${road.id}`,
        type: vType,
        color,
        laneIndex: laneIdx,
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
        t: (i * 0.19 + Math.random() * 0.08) % 1.0,
        desiredSpeedMps: speed,
        currentSpeedMps: speed,
        direction,
        laneIndex: laneIdx,
        laneOffset,
        totalLength: totalLen,
        distances,
        isBraking: false,
        waitingAtJunction: false,
        worldPosition: new THREE.Vector3(),
      };

      // Set initial position
      this.updateVehicleGeometry(simV);
      this.vehicles.push(simV);
    }
  }

  private buildJunctionIndex(roads: RoadSegmentGeo[], coordSystem: GeoCoordinateSystem) {
    this.junctions = [];
    const nodeMap: Map<string, { pos: THREE.Vector3; roads: Set<string> }> = new Map();

    roads.forEach(r => {
      if (!r.geometry || r.geometry.length < 2) return;
      const pStart = coordSystem.geoToWorld(r.geometry[0][0], r.geometry[0][1], 0.08);
      const pEnd   = coordSystem.geoToWorld(r.geometry[r.geometry.length - 1][0], r.geometry[r.geometry.length - 1][1], 0.08);

      [pStart, pEnd].forEach(p => {
        const key = `${Math.round(p.x / 6) * 6},${Math.round(p.z / 6) * 6}`;
        const entry = nodeMap.get(key) || { pos: p.clone(), roads: new Set<string>() };
        entry.roads.add(r.id);
        nodeMap.set(key, entry);
      });
    });

    nodeMap.forEach((entry, key) => {
      if (entry.roads.size > 1) {
        this.junctions.push({
          id: key,
          position: entry.pos,
          connectedRoadIds: Array.from(entry.roads),
        });
      }
    });
  }

  private updateVehicleGeometry(v: SimVehicle): void {
    if (v.totalLength <= 0) return;

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

    v.worldPosition.copy(finalPos);
    v.instance.group.position.copy(finalPos);

    // Orient vehicle towards motion direction
    let angle = Math.atan2(tangent.x, tangent.z);
    if (v.direction === -1) {
      angle += Math.PI;
    }
    v.instance.group.rotation.set(v.isBraking ? -0.018 : 0, angle, 0);
  }

  update(delta: number): void {
    if (!this.active || this.vehicles.length === 0) return;
    const dt = Math.min(0.08, delta);

    // ── 1. Map-Aware Intelligent Car-Following Model (IDM) & Obstacle Detection ──
    const SAFE_HEADWAY_M = 22.0;
    const MIN_STOP_GAP_M = 6.5;

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      let leadGap = Infinity;
      let leadSpeed = v.desiredSpeedMps;

      // Check distance to lead vehicle in same road & direction
      for (let j = 0; j < this.vehicles.length; j++) {
        if (i === j) continue;
        const other = this.vehicles[j];
        if (other.road.id !== v.road.id || other.direction !== v.direction) continue;

        // Same or adjacent lane offset check
        if (Math.abs(other.laneOffset - v.laneOffset) > 2.2) continue;

        let distAhead = 0;
        if (v.direction === 1) {
          distAhead = (other.t - v.t) * v.totalLength;
          if (distAhead < 0) distAhead += v.totalLength;
        } else {
          distAhead = (v.t - other.t) * v.totalLength;
          if (distAhead < 0) distAhead += v.totalLength;
        }

        if (distAhead > 0.5 && distAhead < leadGap) {
          leadGap = distAhead;
          leadSpeed = other.currentSpeedMps;
        }
      }

      // Check for junction proximity and potential cross-traffic obstacles
      let junctionYield = false;
      const distToEndpoint = v.direction === 1
        ? (1.0 - v.t) * v.totalLength
        : v.t * v.totalLength;

      if (distToEndpoint < 16.0) {
        // Approaching an intersection node
        const endPos = v.direction === 1
          ? v.worldPoints[v.worldPoints.length - 1]
          : v.worldPoints[0];

        // Check if another vehicle is traversing this intersection
        for (let j = 0; j < this.vehicles.length; j++) {
          if (i === j) continue;
          const other = this.vehicles[j];
          if (other.road.id === v.road.id) continue; // Crossing traffic only

          const dToCrossing = other.worldPosition.distanceTo(endPos);
          if (dToCrossing < 9.0) {
            // Another vehicle is traversing the intersection! Yield and wait.
            junctionYield = true;
            break;
          }
        }
      }

      // ── 2. Speed Adaptation & Braking Kinematics ──
      let targetSpeed = v.desiredSpeedMps;
      let braking = false;

      if (junctionYield && distToEndpoint < 12.0) {
        // Stop at intersection threshold
        targetSpeed = 0;
        braking = true;
      } else if (leadGap < SAFE_HEADWAY_M) {
        braking = true;
        if (leadGap <= MIN_STOP_GAP_M) {
          targetSpeed = 0; // Complete stop behind lead vehicle
        } else {
          const ratio = (leadGap - MIN_STOP_GAP_M) / (SAFE_HEADWAY_M - MIN_STOP_GAP_M);
          targetSpeed = Math.min(v.desiredSpeedMps, leadSpeed * ratio + 0.5);
        }
      }

      // Smooth acceleration / deceleration
      const accelRate = targetSpeed < v.currentSpeedMps ? 5.5 : 2.5;
      v.currentSpeedMps += (targetSpeed - v.currentSpeedMps) * Math.min(1.0, dt * accelRate);
      v.isBraking = braking && v.currentSpeedMps < v.desiredSpeedMps - 0.8;
      v.waitingAtJunction = junctionYield;

      // ── 3. Advance Vehicle along Polyline ──
      if (v.totalLength > 0) {
        const deltaT = (v.currentSpeedMps * dt * v.direction) / v.totalLength;
        v.t += deltaT;

        // Loop around road segment seamlessly
        if (v.t > 1.0) v.t -= 1.0;
        if (v.t < 0.0) v.t += 1.0;

        this.updateVehicleGeometry(v);
      }
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
    this.junctions = [];
  }
}
