import * as THREE from 'three';
import type { VehicleConfig } from '../../types/infrastructure';

// ─── Vehicle geometry ──────────────────────────────────────────────────────────
function createCar(color: number): THREE.Group {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(1.8, 0.65, 4.2);
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.6, 0.5, 2.2);
  const cabinMat = new THREE.MeshLambertMaterial({ color: 0x6090a0 });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(0, 1.05, -0.2);
  group.add(cabin);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const wheelPositions: [number, number, number][] = [
    [ 0.95, 0.3,  1.4],
    [-0.95, 0.3,  1.4],
    [ 0.95, 0.3, -1.4],
    [-0.95, 0.3, -1.4],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    group.add(w);
  });

  // Headlights
  const hlMat = new THREE.MeshLambertMaterial({ color: 0xffffdd });
  [-0.5, 0.5].forEach(x => {
    const hlGeo = new THREE.BoxGeometry(0.3, 0.18, 0.05);
    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.position.set(x, 0.58, 2.12);
    group.add(hl);
  });

  return group;
}

function createBus(color: number): THREE.Group {
  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(2.4, 1.8, 9.0);
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.3;
  body.castShadow = true;
  group.add(body);

  const winMat = new THREE.MeshLambertMaterial({ color: 0x8ab0c8 });
  for (let i = 0; i < 6; i++) {
    const wGeo = new THREE.BoxGeometry(0.05, 0.7, 1.1);
    const w = new THREE.Mesh(wGeo, winMat);
    w.position.set(1.21, 1.6, -3.5 + i * 1.2);
    group.add(w);
    const wr = w.clone();
    wr.position.x = -1.21;
    group.add(wr);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wPos: [number, number, number][] = [
    [ 1.25, 0.4,  3.2], [-1.25, 0.4,  3.2],
    [ 1.25, 0.4, -3.2], [-1.25, 0.4, -3.2],
  ];
  wPos.forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    group.add(w);
  });

  return group;
}

function createTruck(color: number): THREE.Group {
  const group = new THREE.Group();

  // Cab
  const cabGeo = new THREE.BoxGeometry(2.2, 2.2, 2.6);
  const cabMat = new THREE.MeshLambertMaterial({ color });
  const cab = new THREE.Mesh(cabGeo, cabMat);
  cab.position.set(0, 1.5, 3.0);
  cab.castShadow = true;
  group.add(cab);

  // Cargo
  const cargoGeo = new THREE.BoxGeometry(2.2, 2.4, 6.5);
  const cargoMat = new THREE.MeshLambertMaterial({ color: 0xa0a0a0 });
  const cargo = new THREE.Mesh(cargoGeo, cargoMat);
  cargo.position.set(0, 1.7, -1.5);
  cargo.castShadow = true;
  group.add(cargo);

  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wPos: [number, number, number][] = [
    [ 1.2, 0.45,  3.0], [-1.2, 0.45,  3.0],
    [ 1.2, 0.45, -1.5], [-1.2, 0.45, -1.5],
    [ 1.2, 0.45, -3.5], [-1.2, 0.45, -3.5],
  ];
  wPos.forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    group.add(w);
  });

  return group;
}

// ─── Vehicle instance ──────────────────────────────────────────────────────────
export interface VehicleInstance {
  group: THREE.Group;
  config: VehicleConfig;
  currentZ: number;
}

const LANE_OFFSETS_1_LANE = [-1.0, 1.0];  // two-way on 1 lane (tight)
const LANE_OFFSETS_4_LANE = [-6.75, -3.75, 3.75, 6.75, -5.25, 5.25]; // 4 lanes + shoulder

export function createVehicle(config: VehicleConfig): VehicleInstance {
  const hexColor = parseInt(config.color.replace('#', ''), 16);
  let group: THREE.Group;

  switch (config.type) {
    case 'bus':   group = createBus(hexColor);   break;
    case 'truck': group = createTruck(hexColor); break;
    default:      group = createCar(hexColor);   break;
  }

  // Face direction of travel
  group.rotation.y = config.direction === 1 ? 0 : Math.PI;

  return { group, config, currentZ: config.initialOffset };
}

export function updateVehicles(
  instances: VehicleInstance[],
  delta: number,
  progress: number,
  laneOffsets1: number[],
  laneOffsets4: number[],
  roadLength: number
) {
  const half = roadLength / 2;
  const trafficMultiplier = getTrafficMultiplier(progress);
  const is4Lane = progress > 0.74;

  // 1. Calculate active visibility and target lane X offset for all vehicles
  const activeVehicles: {
    inst: VehicleInstance;
    xOff: number;
    laneKey: string;
    speed: number;
  }[] = [];

  instances.forEach(inst => {
    const { config } = inst;
    const isUpgradeOnly = config.laneIndex >= 2;
    const visible = (isUpgradeOnly ? progress > 0.72 : (progress < 0.28 || progress > 0.64)) && trafficMultiplier > 0;
    inst.group.visible = visible;

    if (!visible) return;

    // Map lane index cleanly:
    // In 1-lane road: laneIndex 0 -> Southbound (-1.2m), laneIndex 1 -> Northbound (+1.2m)
    // In 4-lane road: laneIndex 0 (-5.5m), 1 (-2.6m), 2 (+2.6m), 3 (+5.5m)
    let effectiveLane = config.laneIndex;
    if (!is4Lane) {
      effectiveLane = config.direction === 1 ? 0 : 1;
    } else {
      // In 4-lane mode, ensure lane aligns with direction
      if (config.direction === 1 && effectiveLane >= 2) effectiveLane = 1;
      if (config.direction === -1 && effectiveLane < 2) effectiveLane = 2;
    }

    const offsetArr = is4Lane ? laneOffsets4 : laneOffsets1;
    const clampedIndex = Math.max(0, Math.min(effectiveLane, offsetArr.length - 1));
    const xOff = offsetArr[clampedIndex] ?? (config.direction === 1 ? -1.2 : 1.2);

    activeVehicles.push({
      inst,
      xOff,
      laneKey: `${config.direction}_${clampedIndex}`,
      speed: config.speed,
    });
  });

  // 2. Intelligent Car-Following Model (headway spacing & smooth deceleration)
  const SAFE_HEADWAY = 18.0; // Distance in meters at which vehicle begins slowing down
  const MIN_HEADWAY = 8.0;   // Minimum distance buffer behind lead vehicle

  activeVehicles.forEach(v => {
    const { inst, laneKey } = v;
    const dir = inst.config.direction;

    // Find the lead vehicle ahead in the same lane
    let closestDist = Infinity;
    let leadSpeed = inst.config.speed;

    activeVehicles.forEach(other => {
      if (other.inst.config.id === inst.config.id) return;
      if (other.laneKey !== laneKey) return;

      // Distance ahead along travel direction:
      let distAhead = (other.inst.currentZ - inst.currentZ) * dir;
      // Handle periodic wrap-around
      if (distAhead < 0) distAhead += roadLength;

      if (distAhead > 0.5 && distAhead < closestDist) {
        closestDist = distAhead;
        leadSpeed = other.inst.config.speed;
      }
    });

    // Speed adaptation
    let currentSpeed = inst.config.speed;
    if (closestDist < SAFE_HEADWAY) {
      if (closestDist <= MIN_HEADWAY) {
        // Immediate headway preservation: match or stay below lead speed
        currentSpeed = Math.min(currentSpeed * 0.2, leadSpeed * 0.5);
      } else {
        // Smoothly interpolate speed towards lead vehicle speed
        const t = (closestDist - MIN_HEADWAY) / (SAFE_HEADWAY - MIN_HEADWAY);
        currentSpeed = leadSpeed + (inst.config.speed - leadSpeed) * t;
      }
    }

    // 3. Move vehicle smoothly
    inst.currentZ += dir * currentSpeed * delta * 60 * trafficMultiplier;

    // Wrap around road boundaries
    if (inst.currentZ > half + 10)  inst.currentZ = -half - 10;
    if (inst.currentZ < -half - 10) inst.currentZ =  half + 10;

    inst.group.position.set(v.xOff, 0, inst.currentZ);
  });
}

function getTrafficMultiplier(progress: number): number {
  if (progress < 0.18) return 1.0;          // Normal pre-construction
  if (progress < 0.28) return 0.5;          // Light — preparation
  if (progress < 0.65) return 0.0;          // No traffic during construction
  if (progress < 0.75) return 0.3;          // Returning
  if (progress < 0.90) return 0.6;          // Partial
  return 1.0;                               // Full
}

export function createAllVehicles(configs: VehicleConfig[]): VehicleInstance[] {
  return configs.map(createVehicle);
}
