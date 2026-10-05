import * as THREE from 'three';
import type { VehicleConfig } from '../../types/infrastructure';

// ─── Shared Materials & Geometries Cache ──────────────────────────────────────
const WHEEL_RUBBER_MAT = new THREE.MeshStandardMaterial({
  color: 0x181a1d,
  roughness: 0.85,
  metalness: 0.1,
});

const WHEEL_RIM_MAT = new THREE.MeshStandardMaterial({
  color: 0xd8e2ec,
  roughness: 0.3,
  metalness: 0.8,
});

const WINDOW_GLASS_MAT = new THREE.MeshStandardMaterial({
  color: 0x111c24,
  roughness: 0.15,
  metalness: 0.9,
  transparent: true,
  opacity: 0.88,
});

const HEADLIGHT_MAT = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 2.2,
  roughness: 0.2,
});

const TAILLIGHT_NORMAL_MAT = new THREE.MeshStandardMaterial({
  color: 0xff2222,
  emissive: 0xff1111,
  emissiveIntensity: 1.8,
  roughness: 0.2,
});

const TAILLIGHT_BRAKE_MAT = new THREE.MeshStandardMaterial({
  color: 0xff3333,
  emissive: 0xff0000,
  emissiveIntensity: 4.5,
  roughness: 0.1,
});

const CHROME_MAT = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  roughness: 0.2,
  metalness: 0.9,
});

const SHADOW_MAT = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.45,
});

/**
 * Creates a detailed composite wheel with rubber tire and alloy rim
 */
function createWheel(radius = 0.34, width = 0.24): THREE.Group {
  const wheelGroup = new THREE.Group();

  // Rubber tire
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 14);
  const tire = new THREE.Mesh(tireGeo, WHEEL_RUBBER_MAT);
  tire.rotation.z = Math.PI / 2;
  wheelGroup.add(tire);

  // Outer alloy rim cap
  const rimGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, width + 0.01, 10);
  const rim = new THREE.Mesh(rimGeo, WHEEL_RIM_MAT);
  rim.rotation.z = Math.PI / 2;
  wheelGroup.add(rim);

  return wheelGroup;
}

/**
 * Creates under-vehicle contact shadow quad
 */
function createContactShadow(width: number, length: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width * 1.15, length * 1.08);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, SHADOW_MAT);
  mesh.position.y = 0.04;
  return mesh;
}

// ─── Vehicle Models ───────────────────────────────────────────────────────────

/**
 * High-detail modern aerodynamic sedan
 */
function createModernSedan(color: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'vehicle-sedan';

  const paintMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.55,
  });

  const skirtMat = new THREE.MeshStandardMaterial({
    color: 0x1f2328,
    roughness: 0.8,
  });

  // Lower chassis skirt
  const skirtGeo = new THREE.BoxGeometry(1.82, 0.25, 4.4);
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.position.y = 0.26;
  group.add(skirt);

  // Main car body
  const bodyGeo = new THREE.BoxGeometry(1.8, 0.52, 4.3);
  const body = new THREE.Mesh(bodyGeo, paintMat);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);

  // Sloping greenhouse cabin
  const cabinGeo = new THREE.BoxGeometry(1.54, 0.48, 2.4);
  const cabin = new THREE.Mesh(cabinGeo, WINDOW_GLASS_MAT);
  cabin.position.set(0, 1.0, -0.15);
  cabin.castShadow = true;
  group.add(cabin);

  // Roof panel
  const roofGeo = new THREE.BoxGeometry(1.48, 0.06, 1.9);
  const roof = new THREE.Mesh(roofGeo, paintMat);
  roof.position.set(0, 1.25, -0.2);
  group.add(roof);

  // Front radiator grille
  const grilleGeo = new THREE.BoxGeometry(1.1, 0.2, 0.08);
  const grille = new THREE.Mesh(grilleGeo, CHROME_MAT);
  grille.position.set(0, 0.52, 2.16);
  group.add(grille);

  // LED projector headlights
  [-0.65, 0.65].forEach(x => {
    const hlGeo = new THREE.BoxGeometry(0.32, 0.14, 0.1);
    const hl = new THREE.Mesh(hlGeo, HEADLIGHT_MAT);
    hl.position.set(x, 0.62, 2.15);
    group.add(hl);
  });

  // Rear LED taillight bar
  const tlGeo = new THREE.BoxGeometry(1.6, 0.12, 0.08);
  const tl = new THREE.Mesh(tlGeo, TAILLIGHT_NORMAL_MAT);
  tl.name = 'taillight';
  tl.position.set(0, 0.66, -2.15);
  group.add(tl);

  // Side mirrors
  [-0.96, 0.96].forEach(x => {
    const mirrorGeo = new THREE.BoxGeometry(0.18, 0.1, 0.12);
    const mirror = new THREE.Mesh(mirrorGeo, paintMat);
    mirror.position.set(x, 0.92, 0.65);
    group.add(mirror);
  });

  // 4 Wheels
  const wheelPositions: [number, number, number][] = [
    [ 0.92, 0.32,  1.3],
    [-0.92, 0.32,  1.3],
    [ 0.92, 0.32, -1.3],
    [-0.92, 0.32, -1.3],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const w = createWheel(0.32, 0.22);
    w.name = 'wheel';
    w.position.set(x, y, z);
    group.add(w);
  });

  // Contact shadow
  group.add(createContactShadow(1.8, 4.4));

  return group;
}

/**
 * Modern SUV / Crossover with roof racks and rugged stance
 */
function createModernSUV(color: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'vehicle-suv';

  const paintMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.5,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1a1c20,
    roughness: 0.8,
  });

  // Elevated lower body & skid plates
  const skidGeo = new THREE.BoxGeometry(1.9, 0.3, 4.6);
  const skid = new THREE.Mesh(skidGeo, trimMat);
  skid.position.y = 0.34;
  group.add(skid);

  // Main SUV body
  const bodyGeo = new THREE.BoxGeometry(1.88, 0.68, 4.5);
  const body = new THREE.Mesh(bodyGeo, paintMat);
  body.position.y = 0.72;
  body.castShadow = true;
  group.add(body);

  // Tall cabin
  const cabinGeo = new THREE.BoxGeometry(1.62, 0.65, 2.9);
  const cabin = new THREE.Mesh(cabinGeo, WINDOW_GLASS_MAT);
  cabin.position.set(0, 1.28, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  // Roof panel
  const roofGeo = new THREE.BoxGeometry(1.58, 0.08, 2.7);
  const roof = new THREE.Mesh(roofGeo, paintMat);
  roof.position.set(0, 1.62, -0.2);
  group.add(roof);

  // Roof luggage rails
  [-0.68, 0.68].forEach(x => {
    const railGeo = new THREE.BoxGeometry(0.06, 0.08, 2.4);
    const rail = new THREE.Mesh(railGeo, CHROME_MAT);
    rail.position.set(x, 1.68, -0.2);
    group.add(rail);
  });

  // Front bull-bar / grille
  const grilleGeo = new THREE.BoxGeometry(1.3, 0.28, 0.1);
  const grille = new THREE.Mesh(grilleGeo, CHROME_MAT);
  grille.position.set(0, 0.65, 2.26);
  group.add(grille);

  // Headlights
  [-0.68, 0.68].forEach(x => {
    const hlGeo = new THREE.BoxGeometry(0.36, 0.18, 0.1);
    const hl = new THREE.Mesh(hlGeo, HEADLIGHT_MAT);
    hl.position.set(x, 0.8, 2.25);
    group.add(hl);
  });

  // Taillights
  [-0.72, 0.72].forEach(x => {
    const tlGeo = new THREE.BoxGeometry(0.25, 0.35, 0.08);
    const tl = new THREE.Mesh(tlGeo, TAILLIGHT_NORMAL_MAT);
    tl.name = 'taillight';
    tl.position.set(x, 0.95, -2.25);
    group.add(tl);
  });

  // 4 Large Wheels
  const wheelPositions: [number, number, number][] = [
    [ 0.96, 0.38,  1.4],
    [-0.96, 0.38,  1.4],
    [ 0.96, 0.38, -1.4],
    [-0.96, 0.38, -1.4],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const w = createWheel(0.38, 0.26);
    w.name = 'wheel';
    w.position.set(x, y, z);
    group.add(w);
  });

  group.add(createContactShadow(1.9, 4.6));
  return group;
}

/**
 * Aerodynamic modern city transit bus
 */
function createModernBus(color: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'vehicle-bus';

  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.35,
  });

  const skirtMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.8,
  });

  const destMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 1.5,
  });

  // Main bus shell
  const bodyGeo = new THREE.BoxGeometry(2.5, 2.1, 9.6);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.6;
  body.castShadow = true;
  group.add(body);

  // Lower bumper skirt
  const skirtGeo = new THREE.BoxGeometry(2.54, 0.45, 9.7);
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.position.y = 0.55;
  group.add(skirt);

  // Front panoramic windshield
  const fWindGeo = new THREE.BoxGeometry(2.36, 1.1, 0.1);
  const fWind = new THREE.Mesh(fWindGeo, WINDOW_GLASS_MAT);
  fWind.position.set(0, 1.85, 4.81);
  group.add(fWind);

  // Illuminated front destination display board: [ METRO TRANSIT ]
  const destGeo = new THREE.BoxGeometry(1.6, 0.28, 0.12);
  const dest = new THREE.Mesh(destGeo, destMat);
  dest.position.set(0, 2.45, 4.82);
  group.add(dest);

  // Side panoramic windows
  for (let i = 0; i < 7; i++) {
    const zPos = -3.6 + i * 1.25;
    [-1.26, 1.26].forEach(x => {
      const wGeo = new THREE.BoxGeometry(0.08, 0.9, 1.05);
      const w = new THREE.Mesh(wGeo, WINDOW_GLASS_MAT);
      w.position.set(x, 1.9, zPos);
      group.add(w);
    });
  }

  // Roof AC pods
  const acGeo = new THREE.BoxGeometry(1.5, 0.35, 2.2);
  const ac = new THREE.Mesh(acGeo, skirtMat);
  ac.position.set(0, 2.8, -0.5);
  group.add(ac);

  // Headlights
  [-0.9, 0.9].forEach(x => {
    const hlGeo = new THREE.BoxGeometry(0.38, 0.2, 0.1);
    const hl = new THREE.Mesh(hlGeo, HEADLIGHT_MAT);
    hl.position.set(x, 0.85, 4.82);
    group.add(hl);
  });

  // Taillights
  [-0.95, 0.95].forEach(x => {
    const tlGeo = new THREE.BoxGeometry(0.24, 0.6, 0.1);
    const tl = new THREE.Mesh(tlGeo, TAILLIGHT_NORMAL_MAT);
    tl.name = 'taillight';
    tl.position.set(x, 1.1, -4.81);
    group.add(tl);
  });

  // Wheels (Dual rear wheels for transit bus)
  const wheelPositions: [number, number, number][] = [
    [ 1.3, 0.44,  3.2],
    [-1.3, 0.44,  3.2],
    [ 1.3, 0.44, -3.2],
    [-1.3, 0.44, -3.2],
    [ 1.3, 0.44, -2.4],
    [-1.3, 0.44, -2.4],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const w = createWheel(0.44, 0.28);
    w.name = 'wheel';
    w.position.set(x, y, z);
    group.add(w);
  });

  group.add(createContactShadow(2.6, 9.8));
  return group;
}

/**
 * Heavy commercial freight truck with articulated cab and shipping container
 */
function createHeavyTruck(color: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'vehicle-truck';

  const cabMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.5,
  });

  const cargoMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Slate corrugated cargo container
    roughness: 0.6,
    metalness: 0.25,
  });

  // Heavy Tractor Cab
  const cabGeo = new THREE.BoxGeometry(2.4, 2.3, 2.8);
  const cab = new THREE.Mesh(cabGeo, cabMat);
  cab.position.set(0, 1.7, 3.4);
  cab.castShadow = true;
  group.add(cab);

  // Cab Windshield
  const wGeo = new THREE.BoxGeometry(2.1, 0.9, 0.1);
  const w = new THREE.Mesh(wGeo, WINDOW_GLASS_MAT);
  w.position.set(0, 2.15, 4.81);
  group.add(w);

  // Chrome vertical exhaust smokestacks
  [-1.15, 1.15].forEach(x => {
    const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8);
    const pipe = new THREE.Mesh(pipeGeo, CHROME_MAT);
    pipe.position.set(x, 2.6, 2.05);
    group.add(pipe);
  });

  // Front big chrome grille
  const grilleGeo = new THREE.BoxGeometry(1.6, 0.9, 0.12);
  const grille = new THREE.Mesh(grilleGeo, CHROME_MAT);
  grille.position.set(0, 1.25, 4.82);
  group.add(grille);

  // Large Cargo Container
  const cargoGeo = new THREE.BoxGeometry(2.45, 2.6, 7.2);
  const cargo = new THREE.Mesh(cargoGeo, cargoMat);
  cargo.position.set(0, 2.05, -1.8);
  cargo.castShadow = true;
  group.add(cargo);

  // Headlights
  [-0.95, 0.95].forEach(x => {
    const hlGeo = new THREE.BoxGeometry(0.35, 0.22, 0.1);
    const hl = new THREE.Mesh(hlGeo, HEADLIGHT_MAT);
    hl.position.set(x, 0.88, 4.82);
    group.add(hl);
  });

  // Reflective Rear Bumper with Hazard Warning Striping
  const bumperGeo = new THREE.BoxGeometry(2.4, 0.3, 0.12);
  const bumperMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.4,
  });
  const bumper = new THREE.Mesh(bumperGeo, bumperMat);
  bumper.position.set(0, 0.65, -5.42);
  group.add(bumper);

  // Taillights
  [-0.95, 0.95].forEach(x => {
    const tlGeo = new THREE.BoxGeometry(0.3, 0.2, 0.1);
    const tl = new THREE.Mesh(tlGeo, TAILLIGHT_NORMAL_MAT);
    tl.name = 'taillight';
    tl.position.set(x, 0.75, -5.45);
    group.add(tl);
  });

  // Heavy 6-Wheel Configuration
  const wheelPositions: [number, number, number][] = [
    [ 1.25, 0.48,  3.4],
    [-1.25, 0.48,  3.4],
    [ 1.25, 0.48, -1.8],
    [-1.25, 0.48, -1.8],
    [ 1.25, 0.48, -3.8],
    [-1.25, 0.48, -3.8],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const wh = createWheel(0.48, 0.32);
    wh.name = 'wheel';
    wh.position.set(x, y, z);
    group.add(wh);
  });

  group.add(createContactShadow(2.5, 10.6));
  return group;
}

/**
 * Authentic regional Auto-Rickshaw (3-wheeler) for Indian city digital twins
 */
function createAutoRickshaw(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'vehicle-autorickshaw';

  const yellowCanopyMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.4,
  });

  const greenBodyMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.5,
  });

  // Lower frame
  const frameGeo = new THREE.BoxGeometry(1.2, 0.3, 2.4);
  const frame = new THREE.Mesh(frameGeo, greenBodyMat);
  frame.position.y = 0.35;
  group.add(frame);

  // Yellow curved roof canopy
  const roofGeo = new THREE.BoxGeometry(1.18, 0.65, 1.8);
  const roof = new THREE.Mesh(roofGeo, yellowCanopyMat);
  roof.position.set(0, 1.15, -0.2);
  roof.castShadow = true;
  group.add(roof);

  // Front windshield
  const windGeo = new THREE.BoxGeometry(1.0, 0.5, 0.08);
  const wind = new THREE.Mesh(windGeo, WINDOW_GLASS_MAT);
  wind.position.set(0, 1.05, 0.72);
  group.add(wind);

  // Single front headlight
  const hlGeo = new THREE.BoxGeometry(0.24, 0.24, 0.1);
  const hl = new THREE.Mesh(hlGeo, HEADLIGHT_MAT);
  hl.position.set(0, 0.65, 1.22);
  group.add(hl);

  // Rear taillights
  [-0.45, 0.45].forEach(x => {
    const tlGeo = new THREE.BoxGeometry(0.18, 0.12, 0.08);
    const tl = new THREE.Mesh(tlGeo, TAILLIGHT_NORMAL_MAT);
    tl.name = 'taillight';
    tl.position.set(x, 0.55, -1.21);
    group.add(tl);
  });

  // 3 Wheels (1 front center, 2 rear)
  const frontW = createWheel(0.24, 0.14);
  frontW.position.set(0, 0.24, 0.95);
  group.add(frontW);

  [-0.62, 0.62].forEach(x => {
    const rw = createWheel(0.24, 0.16);
    rw.position.set(x, 0.24, -0.7);
    group.add(rw);
  });

  group.add(createContactShadow(1.3, 2.5));
  return group;
}

/**
 * Motorcycle / Two-Wheeler
 */
function createMotorcycle(color: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'vehicle-motorcycle';

  const bikeMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.6,
  });

  // Bike body
  const bodyGeo = new THREE.BoxGeometry(0.4, 0.35, 1.8);
  const body = new THREE.Mesh(bodyGeo, bikeMat);
  body.position.y = 0.5;
  group.add(body);

  // Headlight
  const hlGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 10);
  const hl = new THREE.Mesh(hlGeo, HEADLIGHT_MAT);
  hl.rotation.x = Math.PI / 2;
  hl.position.set(0, 0.65, 0.92);
  group.add(hl);

  // Taillight
  const tlGeo = new THREE.BoxGeometry(0.14, 0.08, 0.05);
  const tl = new THREE.Mesh(tlGeo, TAILLIGHT_NORMAL_MAT);
  tl.name = 'taillight';
  tl.position.set(0, 0.65, -0.92);
  group.add(tl);

  // Rider silhouette
  const riderGeo = new THREE.BoxGeometry(0.38, 0.6, 0.45);
  const riderMat = new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.9 });
  const rider = new THREE.Mesh(riderGeo, riderMat);
  rider.position.set(0, 0.95, -0.1);
  group.add(rider);

  // Helmet
  const helmetGeo = new THREE.SphereGeometry(0.16, 8, 8);
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2 });
  const helmet = new THREE.Mesh(helmetGeo, helmetMat);
  helmet.position.set(0, 1.35, -0.05);
  group.add(helmet);

  // Front and rear wheels
  [0.75, -0.75].forEach(z => {
    const w = createWheel(0.28, 0.1);
    w.position.set(0, 0.28, z);
    group.add(w);
  });

  return group;
}

// ─── Vehicle instance interface ───────────────────────────────────────────────
export interface VehicleInstance {
  group: THREE.Group;
  config: VehicleConfig;
  currentZ: number;
  currentSpeed: number;
  isBraking: boolean;
}

export function createVehicle(config: VehicleConfig): VehicleInstance {
  const hexColor = parseInt(config.color.replace('#', ''), 16);
  let group: THREE.Group;

  switch (config.type) {
    case 'bus':
      group = createModernBus(hexColor);
      break;
    case 'truck':
      group = createHeavyTruck(hexColor);
      break;
    default: {
      // Procedurally vary cars: sedan, suv, auto-rickshaw, motorcycle
      const hash = Math.abs(config.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
      if (hash % 6 === 0) {
        group = createAutoRickshaw();
      } else if (hash % 6 === 1) {
        group = createMotorcycle(hexColor);
      } else if (hash % 6 === 2) {
        group = createModernSUV(hexColor);
      } else {
        group = createModernSedan(hexColor);
      }
      break;
    }
  }

  // Face direction of travel (Z+ is North, Z- is South)
  group.rotation.y = config.direction === 1 ? 0 : Math.PI;

  return {
    group,
    config,
    currentZ: config.initialOffset,
    currentSpeed: config.speed,
    isBraking: false,
  };
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

  const activeVehicles: {
    inst: VehicleInstance;
    xOff: number;
    laneKey: string;
    speed: number;
  }[] = [];

  // 1. Calculate active visibility and target lane X offset
  instances.forEach(inst => {
    const { config } = inst;
    const isUpgradeOnly = config.laneIndex >= 2;
    const visible = (isUpgradeOnly ? progress > 0.72 : (progress < 0.28 || progress > 0.64)) && trafficMultiplier > 0;
    inst.group.visible = visible;

    if (!visible) return;

    let effectiveLane = config.laneIndex;
    if (!is4Lane) {
      effectiveLane = config.direction === 1 ? 0 : 1;
    } else {
      if (config.direction === 1 && effectiveLane >= 2) effectiveLane = 1;
      if (config.direction === -1 && effectiveLane < 2) effectiveLane = 2;
    }

    const offsetArr = is4Lane ? laneOffsets4 : laneOffsets1;
    const clampedIndex = Math.max(0, Math.min(effectiveLane, offsetArr.length - 1));
    const xOff = offsetArr[clampedIndex] ?? (config.direction === 1 ? -1.8 : 1.8);

    activeVehicles.push({
      inst,
      xOff,
      laneKey: `${config.direction}_${clampedIndex}`,
      speed: config.speed,
    });
  });

  // 2. Intelligent Car-Following Model (headway spacing & smooth deceleration)
  const SAFE_HEADWAY = 20.0;
  const MIN_HEADWAY = 9.0;

  activeVehicles.forEach(v => {
    const { inst, laneKey } = v;
    const dir = inst.config.direction;

    let closestDist = Infinity;
    let leadSpeed = inst.config.speed;

    activeVehicles.forEach(other => {
      if (other.inst.config.id === inst.config.id) return;
      if (other.laneKey !== laneKey) return;

      let distAhead = (other.inst.currentZ - inst.currentZ) * dir;
      if (distAhead < 0) distAhead += roadLength;

      if (distAhead > 0.5 && distAhead < closestDist) {
        closestDist = distAhead;
        leadSpeed = other.inst.currentSpeed;
      }
    });

    // Speed adaptation
    let targetSpeed = inst.config.speed;
    let braking = false;

    if (closestDist < SAFE_HEADWAY) {
      braking = true;
      if (closestDist <= MIN_HEADWAY) {
        targetSpeed = Math.min(targetSpeed * 0.25, leadSpeed * 0.6);
      } else {
        const t = (closestDist - MIN_HEADWAY) / (SAFE_HEADWAY - MIN_HEADWAY);
        targetSpeed = leadSpeed + (inst.config.speed - leadSpeed) * t;
      }
    }

    // Smooth speed change
    inst.currentSpeed += (targetSpeed - inst.currentSpeed) * Math.min(1.0, delta * 4.0);
    inst.isBraking = braking;

    // Dynamically toggle brake light intensity
    const taillight = inst.group.getObjectByName('taillight') as THREE.Mesh | undefined;
    if (taillight) {
      taillight.material = braking ? TAILLIGHT_BRAKE_MAT : TAILLIGHT_NORMAL_MAT;
    }

    // 3. Move vehicle smoothly
    inst.currentZ += dir * inst.currentSpeed * delta * 60 * trafficMultiplier;

    // Wrap around road boundaries
    if (inst.currentZ > half + 15)  inst.currentZ = -half - 15;
    if (inst.currentZ < -half - 15) inst.currentZ =  half + 15;

    inst.group.position.set(v.xOff, 0, inst.currentZ);

    // Subtle pitch roll on acceleration / braking
    inst.group.rotation.x = braking ? -0.015 : 0;
  });
}

function getTrafficMultiplier(progress: number): number {
  if (progress < 0.18) return 1.0;
  if (progress < 0.28) return 0.5;
  if (progress < 0.65) return 0.0;
  if (progress < 0.75) return 0.4;
  if (progress < 0.90) return 0.7;
  return 1.0;
}

export function createAllVehicles(configs: VehicleConfig[]): VehicleInstance[] {
  return configs.map(createVehicle);
}
