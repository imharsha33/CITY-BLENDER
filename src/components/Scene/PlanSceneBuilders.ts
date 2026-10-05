import * as THREE from 'three';
import {
  createAsphaltMaterial,
  createFreshAsphaltMaterial,
  createMarkingMaterial,
} from './RoadGeometry';
import type { VehicleInstance } from './Vehicles';
import { createVehicle } from './Vehicles';
import { flyoverScenario, ringRoadScenario } from '../../data/planScenarios';

// ─── Concrete & Engineering Materials ─────────────────────────────────────────
const CONCRETE_PIER_MAT = new THREE.MeshLambertMaterial({ color: 0x7a8088 });
const CONCRETE_DECK_MAT = new THREE.MeshLambertMaterial({ color: 0x666b74 });
const PARAPET_BARRIER_MAT = new THREE.MeshLambertMaterial({ color: 0x8a929e });
const MEDIAN_BARRIER_MAT = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
const GROUND_ASPHALT_MAT = new THREE.MeshLambertMaterial({ color: 0x383838 });
const RAMPO_RE_WALL_MAT = new THREE.MeshLambertMaterial({ color: 0x828892 });
const CURB_MAT = new THREE.MeshLambertMaterial({ color: 0x909090 });
const GREEN_MEDIAN_MAT = new THREE.MeshLambertMaterial({ color: 0x3a6b30 });

// ─── Flyover 3D Construction & Scene Components ───────────────────────────────
export interface FlyoverSceneElements {
  group: THREE.Group;
  surfaceRoads: THREE.Group;
  approachRampSouth: THREE.Group;
  approachRampNorth: THREE.Group;
  elevatedDeck: THREE.Group;
  piersGroup: THREE.Group;
  barriersGroup: THREE.Group;
  medianGroup: THREE.Group;
  markingsGroup: THREE.Group;
  elevatedLights: THREE.Group;
  vehicles: VehicleInstance[];
}

export function buildFlyover3D(): FlyoverSceneElements {
  const root = new THREE.Group();
  root.name = 'flyover-root';

  const DECK_ELEVATION = 6.8;
  const VIADUCT_HALF_LEN = 36; // Elevated horizontal deck between Z=-36 and Z=+36
  const RAMP_LEN = 54;         // Approach ramps from Z=-90 to -36 and Z=+36 to +90
  const DECK_WIDTH = 15.0;     // 4-lane divided deck

  // 1. Surface Ground Roads (N-S and E-W crossroads)
  const surfaceRoads = new THREE.Group();
  surfaceRoads.name = 'surface-roads';

  // North-South ground arterial (width 16m, length 220m)
  const nsGroundGeo = new THREE.BoxGeometry(16, 0.12, 220);
  const nsGroundMesh = new THREE.Mesh(nsGroundGeo, GROUND_ASPHALT_MAT);
  nsGroundMesh.position.y = 0.06;
  nsGroundMesh.receiveShadow = true;
  surfaceRoads.add(nsGroundMesh);

  // East-West crossroad (width 16m, length 140m at Z=0)
  const ewGroundGeo = new THREE.BoxGeometry(140, 0.12, 16);
  const ewGroundMesh = new THREE.Mesh(ewGroundGeo, GROUND_ASPHALT_MAT);
  ewGroundMesh.position.y = 0.06;
  ewGroundMesh.receiveShadow = true;
  surfaceRoads.add(ewGroundMesh);

  // Junction square intersection apron
  const juncApronGeo = new THREE.BoxGeometry(32, 0.13, 32);
  const juncApron = new THREE.Mesh(juncApronGeo, new THREE.MeshLambertMaterial({ color: 0x333333 }));
  juncApron.position.y = 0.065;
  surfaceRoads.add(juncApron);

  // Surface junction zebra crossings & stop bars
  const markingMat = createMarkingMaterial(0xffffff);
  [-12, 12].forEach(zOff => {
    const barGeo = new THREE.BoxGeometry(14, 0.02, 0.8);
    const bar = new THREE.Mesh(barGeo, markingMat);
    bar.position.set(0, 0.14, zOff);
    surfaceRoads.add(bar);
  });
  [-12, 12].forEach(xOff => {
    const barGeo = new THREE.BoxGeometry(0.8, 0.02, 14);
    const bar = new THREE.Mesh(barGeo, markingMat);
    bar.position.set(xOff, 0.14, 0);
    surfaceRoads.add(bar);
  });

  root.add(surfaceRoads);

  // 2. Concrete Support Piers & Crosshead Caps
  const piersGroup = new THREE.Group();
  piersGroup.name = 'piers-group';
  const pierZPositions = [-36, -18, 18, 36];

  pierZPositions.forEach(z => {
    // Twin cylindrical pier columns (left & right)
    [-3.8, 3.8].forEach(x => {
      const colGeo = new THREE.CylinderGeometry(1.1, 1.3, DECK_ELEVATION - 0.7, 16);
      colGeo.translate(0, (DECK_ELEVATION - 0.7) / 2, 0);
      const col = new THREE.Mesh(colGeo, CONCRETE_PIER_MAT);
      col.position.set(x, 0, z);
      col.castShadow = true;
      col.receiveShadow = true;
      piersGroup.add(col);

      // Pile cap foundation block at ground
      const capGeo = new THREE.BoxGeometry(3.2, 0.6, 3.2);
      const cap = new THREE.Mesh(capGeo, CONCRETE_PIER_MAT);
      cap.position.set(x, 0.3, z);
      piersGroup.add(cap);
    });

    // Heavy transverse cantilever crosshead bent cap beam
    const bentGeo = new THREE.BoxGeometry(DECK_WIDTH - 0.6, 0.8, 2.6);
    const bent = new THREE.Mesh(bentGeo, CONCRETE_PIER_MAT);
    bent.position.set(0, DECK_ELEVATION - 0.4, z);
    bent.castShadow = true;
    piersGroup.add(bent);
  });
  root.add(piersGroup);

  // 3. Elevated Main Viaduct Deck (Z = -36 to +36)
  const elevatedDeck = new THREE.Group();
  elevatedDeck.name = 'elevated-deck';

  const deckLength = VIADUCT_HALF_LEN * 2;
  const deckSlabGeo = new THREE.BoxGeometry(DECK_WIDTH, 0.5, deckLength);
  const deckSlab = new THREE.Mesh(deckSlabGeo, CONCRETE_DECK_MAT);
  deckSlab.position.set(0, DECK_ELEVATION, 0);
  deckSlab.castShadow = true;
  deckSlab.receiveShadow = true;
  elevatedDeck.add(deckSlab);

  // Wearing course asphalt layer
  const wearGeo = new THREE.BoxGeometry(DECK_WIDTH - 0.2, 0.08, deckLength);
  const wear = new THREE.Mesh(wearGeo, createFreshAsphaltMaterial());
  wear.position.set(0, DECK_ELEVATION + 0.28, 0);
  elevatedDeck.add(wear);

  root.add(elevatedDeck);

  // 4. Approach Ramps (South and North)
  const approachRampSouth = createApproachRamp(DECK_WIDTH, RAMP_LEN, DECK_ELEVATION, -VIADUCT_HALF_LEN - RAMP_LEN / 2, true);
  const approachRampNorth = createApproachRamp(DECK_WIDTH, RAMP_LEN, DECK_ELEVATION,  VIADUCT_HALF_LEN + RAMP_LEN / 2, false);
  root.add(approachRampSouth);
  root.add(approachRampNorth);

  // 5. Parapet Crash Barriers
  const barriersGroup = new THREE.Group();
  barriersGroup.name = 'barriers-group';
  const totalViaductLen = deckLength + RAMP_LEN * 2;

  // Deck level barriers (Z = -36 to +36)
  [-DECK_WIDTH / 2 + 0.3, DECK_WIDTH / 2 - 0.3].forEach(x => {
    const bGeo = new THREE.BoxGeometry(0.4, 0.9, deckLength);
    const b = new THREE.Mesh(bGeo, PARAPET_BARRIER_MAT);
    b.position.set(x, DECK_ELEVATION + 0.65, 0);
    barriersGroup.add(b);

    // Steel safety handrail tube on top
    const railGeo = new THREE.CylinderGeometry(0.06, 0.06, deckLength, 8);
    railGeo.rotateX(Math.PI / 2);
    const rail = new THREE.Mesh(railGeo, new THREE.MeshLambertMaterial({ color: 0xcccccc }));
    rail.position.set(x, DECK_ELEVATION + 1.15, 0);
    barriersGroup.add(rail);
  });
  root.add(barriersGroup);

  // 6. Central Median on Elevated Deck
  const medianGroup = new THREE.Group();
  medianGroup.name = 'median-group';
  const medGeo = new THREE.BoxGeometry(1.2, 0.5, deckLength);
  const med = new THREE.Mesh(medGeo, MEDIAN_BARRIER_MAT);
  med.position.set(0, DECK_ELEVATION + 0.45, 0);
  medianGroup.add(med);
  root.add(medianGroup);

  // 7. Elevated Markings
  const markingsGroup = new THREE.Group();
  markingsGroup.name = 'markings-group';
  const dashLen = 3;
  const dashGap = 3;
  const numDashes = Math.floor(deckLength / (dashLen + dashGap));

  // 4 lanes on deck: Lane dividers at X = -3.5m and X = +3.5m
  [-3.5, 3.5].forEach(x => {
    for (let i = 0; i < numDashes; i++) {
      const dGeo = new THREE.BoxGeometry(0.18, 0.02, dashLen);
      const d = new THREE.Mesh(dGeo, markingMat);
      d.position.set(x, DECK_ELEVATION + 0.33, -VIADUCT_HALF_LEN + i * (dashLen + dashGap) + dashLen / 2);
      markingsGroup.add(d);
    }
  });
  root.add(markingsGroup);

  // 8. Elevated Highway Lighting
  const elevatedLights = new THREE.Group();
  elevatedLights.name = 'elevated-lights';
  [-28, 0, 28].forEach(z => {
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.15, 6.0, 8);
    poleGeo.translate(0, 3.0, 0);
    const pole = new THREE.Mesh(poleGeo, new THREE.MeshLambertMaterial({ color: 0x999999 }));
    pole.position.set(0, DECK_ELEVATION + 0.5, z);

    // Dual-arm luminaire
    [-1.2, 1.2].forEach(armX => {
      const armGeo = new THREE.BoxGeometry(Math.abs(armX), 0.08, 0.08);
      const arm = new THREE.Mesh(armGeo, new THREE.MeshLambertMaterial({ color: 0x999999 }));
      arm.position.set(armX / 2, DECK_ELEVATION + 6.3, z);
      elevatedLights.add(arm);

      const lampGeo = new THREE.BoxGeometry(0.4, 0.1, 0.25);
      const lamp = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xffffcc }));
      lamp.position.set(armX, DECK_ELEVATION + 6.25, z);
      elevatedLights.add(lamp);
    });

    elevatedLights.add(pole);
  });
  root.add(elevatedLights);

  // 9. Vehicles Setup
  const vehicles = flyoverScenario.vehicles.map(createVehicle);
  vehicles.forEach(v => root.add(v.group));

  return {
    group: root,
    surfaceRoads,
    approachRampSouth,
    approachRampNorth,
    elevatedDeck,
    piersGroup,
    barriersGroup,
    medianGroup,
    markingsGroup,
    elevatedLights,
    vehicles,
  };
}

function createApproachRamp(
  width: number,
  length: number,
  height: number,
  centerZ: number,
  isAscending: boolean
): THREE.Group {
  const group = new THREE.Group();
  const slopeAngle = Math.atan2(height, length) * (isAscending ? 1 : -1);

  // Wedge inclined ramp slab
  const rampGeo = new THREE.BoxGeometry(width, 0.45, length);
  const rampMesh = new THREE.Mesh(rampGeo, CONCRETE_DECK_MAT);
  rampMesh.rotation.x = slopeAngle;
  rampMesh.position.set(0, height / 2 + 0.15, centerZ);
  rampMesh.castShadow = true;
  group.add(rampMesh);

  // Asphalt surface
  const aspGeo = new THREE.BoxGeometry(width - 0.2, 0.06, length);
  const aspMesh = new THREE.Mesh(aspGeo, createFreshAsphaltMaterial());
  aspMesh.rotation.x = slopeAngle;
  aspMesh.position.set(0, height / 2 + 0.4, centerZ);
  group.add(aspMesh);

  // Reinforced Earth (RE) solid retaining sidewalls
  [-width / 2, width / 2].forEach(x => {
    // Triangular prismatic retaining wall wedge
    const shape = new THREE.Shape();
    if (isAscending) {
      shape.moveTo(-length / 2, 0);
      shape.lineTo(length / 2, height);
      shape.lineTo(length / 2, 0);
    } else {
      shape.moveTo(-length / 2, height);
      shape.lineTo(length / 2, 0);
      shape.lineTo(-length / 2, 0);
    }
    shape.closePath();

    const extrudeSettings = { depth: 0.6, bevelEnabled: false };
    const wallGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    wallGeo.rotateY(Math.PI / 2);
    const wall = new THREE.Mesh(wallGeo, RAMPO_RE_WALL_MAT);
    wall.position.set(x - 0.3, 0, centerZ);
    group.add(wall);
  });

  return group;
}

// ─── Ring Road 3D Construction & Scene Components ─────────────────────────────
export interface RingRoadSceneElements {
  group: THREE.Group;
  orbitalRingPavement: THREE.Group;
  orbitalMedian: THREE.Group;
  orbitalBarriers: THREE.Group;
  roundabouts: THREE.Group;
  radialRoads: THREE.Group;
  buildings: THREE.Group;
  trees: THREE.Group;
  lights: THREE.Group;
  vehicles: VehicleInstance[];
}

export function buildRingRoad3D(): RingRoadSceneElements {
  const root = new THREE.Group();
  root.name = 'ring-road-root';

  const RADIUS = 68.0;      // 68m curve radius
  const ROAD_WIDTH = 15.0;  // 4-lane divided orbital ring
  const START_ANGLE = -Math.PI * 0.85; // ~-153 degrees
  const END_ANGLE   =  Math.PI * 0.25; // ~+45 degrees
  const SEGMENTS = 48;

  // 1. Orbital Ring Pavement (sweeping curved arc)
  const orbitalRingPavement = new THREE.Group();
  orbitalRingPavement.name = 'orbital-ring-pavement';

  // Build curved road ribbon using RingGeometry / custom loft
  const ringGeo = new THREE.RingGeometry(
    RADIUS - ROAD_WIDTH / 2,
    RADIUS + ROAD_WIDTH / 2,
    SEGMENTS,
    1,
    START_ANGLE,
    END_ANGLE - START_ANGLE
  );
  ringGeo.rotateX(-Math.PI / 2);

  const ringMat = createFreshAsphaltMaterial();
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.y = 0.08;
  ringMesh.receiveShadow = true;
  orbitalRingPavement.add(ringMesh);

  // Lane markings on the curved ring road
  const markMat = createMarkingMaterial(0xffffff);
  [-3.75, 3.75].forEach(rOffset => {
    const laneR = RADIUS + rOffset;
    const dashCount = 36;
    const arcSpan = END_ANGLE - START_ANGLE;
    for (let i = 0; i < dashCount; i++) {
      const a = START_ANGLE + (i / dashCount) * arcSpan;
      const x = Math.cos(a) * laneR;
      const z = Math.sin(a) * laneR;
      const nextA = a + 0.02;
      const dx = Math.cos(nextA) * laneR - x;
      const dz = Math.sin(nextA) * laneR - z;
      const rotY = Math.atan2(dx, dz);

      const dGeo = new THREE.BoxGeometry(0.18, 0.015, 2.5);
      const d = new THREE.Mesh(dGeo, markMat);
      d.position.set(x, 0.10, z);
      d.rotation.y = rotY;
      orbitalRingPavement.add(d);
    }
  });
  root.add(orbitalRingPavement);

  // 2. Central Median along the orbital curve
  const orbitalMedian = new THREE.Group();
  orbitalMedian.name = 'orbital-median';
  const medGeo = new THREE.RingGeometry(
    RADIUS - 1.0,
    RADIUS + 1.0,
    SEGMENTS,
    1,
    START_ANGLE,
    END_ANGLE - START_ANGLE
  );
  medGeo.rotateX(-Math.PI / 2);
  const medMesh = new THREE.Mesh(medGeo, GREEN_MEDIAN_MAT);
  medMesh.position.y = 0.18;
  orbitalMedian.add(medMesh);

  // Median kerbs
  [-1.0, 1.0].forEach(kOffset => {
    const kerbGeo = new THREE.RingGeometry(
      RADIUS + kOffset - 0.15,
      RADIUS + kOffset + 0.15,
      SEGMENTS,
      1,
      START_ANGLE,
      END_ANGLE - START_ANGLE
    );
    kerbGeo.rotateX(-Math.PI / 2);
    const km = new THREE.Mesh(kerbGeo, CURB_MAT);
    km.position.y = 0.16;
    orbitalMedian.add(km);
  });
  root.add(orbitalMedian);

  // 3. Outer Barriers along orbital ring edges
  const orbitalBarriers = new THREE.Group();
  orbitalBarriers.name = 'orbital-barriers';
  [RADIUS - ROAD_WIDTH / 2, RADIUS + ROAD_WIDTH / 2].forEach(bRadius => {
    const bCount = 40;
    const arcSpan = END_ANGLE - START_ANGLE;
    for (let i = 0; i <= bCount; i++) {
      const a = START_ANGLE + (i / bCount) * arcSpan;
      const x = Math.cos(a) * bRadius;
      const z = Math.sin(a) * bRadius;

      const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6);
      postGeo.translate(0, 0.45, 0);
      const post = new THREE.Mesh(postGeo, PARAPET_BARRIER_MAT);
      post.position.set(x, 0.08, z);
      orbitalBarriers.add(post);
    }
  });
  root.add(orbitalBarriers);

  // 4. Two Major Roundabouts / Interchanges connecting Radial Corridors
  const roundabouts = new THREE.Group();
  roundabouts.name = 'interchange-roundabouts';

  // Interchanges located at angle -Math.PI * 0.65 and angle -Math.PI * 0.15 along the ring
  const interchangeAngles = [-Math.PI * 0.65, -Math.PI * 0.15];
  interchangeAngles.forEach(ang => {
    const cx = Math.cos(ang) * RADIUS;
    const cz = Math.sin(ang) * RADIUS;

    // Circulating road ring
    const circGeo = new THREE.RingGeometry(12, 22, 32);
    circGeo.rotateX(-Math.PI / 2);
    const circ = new THREE.Mesh(circGeo, GROUND_ASPHALT_MAT);
    circ.position.set(cx, 0.09, cz);
    roundabouts.add(circ);

    // Center landscaped roundabout island
    const islandGeo = new THREE.CylinderGeometry(11.8, 12, 0.6, 32);
    islandGeo.translate(0, 0.3, 0);
    const island = new THREE.Mesh(islandGeo, GREEN_MEDIAN_MAT);
    island.position.set(cx, 0.08, cz);
    roundabouts.add(island);

    // Central monument / flagpole
    const poleGeo = new THREE.CylinderGeometry(0.15, 0.25, 8.0, 8);
    poleGeo.translate(0, 4.0, 0);
    const pole = new THREE.Mesh(poleGeo, new THREE.MeshLambertMaterial({ color: 0xdddddd }));
    pole.position.set(cx, 0.6, cz);
    roundabouts.add(pole);
  });
  root.add(roundabouts);

  // 5. Radial Corridors linking city center to roundabouts
  const radialRoads = new THREE.Group();
  radialRoads.name = 'radial-feeder-roads';
  interchangeAngles.forEach(ang => {
    const targetX = Math.cos(ang) * (RADIUS - 20);
    const targetZ = Math.sin(ang) * (RADIUS - 20);

    const len = Math.hypot(targetX, targetZ);
    const radGeo = new THREE.BoxGeometry(10, 0.11, len);
    const radMesh = new THREE.Mesh(radGeo, GROUND_ASPHALT_MAT);
    radMesh.position.set(targetX / 2, 0.07, targetZ / 2);
    radMesh.rotation.y = -ang + Math.PI / 2;
    radialRoads.add(radMesh);
  });
  root.add(radialRoads);

  // 6. Buildings & Urban District
  const buildings = new THREE.Group();
  buildings.name = 'ring-buildings';
  ringRoadScenario.buildings.forEach(b => {
    const bGeo = new THREE.BoxGeometry(b.width, b.height, b.depth);
    bGeo.translate(0, b.height / 2, 0);
    const bMat = new THREE.MeshLambertMaterial({ color: parseInt(b.color.replace('#', ''), 16) });
    const bMesh = new THREE.Mesh(bGeo, bMat);
    bMesh.position.set(b.position[0], b.position[1], b.position[2]);
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    buildings.add(bMesh);
  });
  root.add(buildings);

  // 7. Trees & Green Buffer
  const trees = new THREE.Group();
  trees.name = 'ring-trees';
  ringRoadScenario.trees.forEach(t => {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2 * t.scale, 0.25 * t.scale, 1.8 * t.scale, 6),
      new THREE.MeshLambertMaterial({ color: 0x5a3d28 })
    );
    trunk.position.set(t.position[0], 0.9 * t.scale, t.position[2]);

    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(1.6 * t.scale, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0x2e6b28 })
    );
    foliage.position.set(t.position[0], 2.4 * t.scale, t.position[2]);
    trees.add(trunk);
    trees.add(foliage);
  });
  root.add(trees);

  // 8. Orbital Highway Lights
  const lights = new THREE.Group();
  lights.name = 'ring-lights';
  for (let i = 0; i < 14; i++) {
    const a = START_ANGLE + (i / 13) * (END_ANGLE - START_ANGLE);
    const x = Math.cos(a) * (RADIUS + ROAD_WIDTH / 2 + 1.5);
    const z = Math.sin(a) * (RADIUS + ROAD_WIDTH / 2 + 1.5);

    const poleGeo = new THREE.CylinderGeometry(0.12, 0.15, 6.5, 8);
    poleGeo.translate(0, 3.25, 0);
    const pole = new THREE.Mesh(poleGeo, new THREE.MeshLambertMaterial({ color: 0x888888 }));
    pole.position.set(x, 0.08, z);
    lights.add(pole);

    const lampGeo = new THREE.BoxGeometry(0.4, 0.1, 0.3);
    const lamp = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xffffcc }));
    lamp.position.set(x - Math.cos(a) * 0.8, 6.4, z - Math.sin(a) * 0.8);
    lights.add(lamp);
  }
  root.add(lights);

  // 9. Vehicles
  const vehicles = ringRoadScenario.vehicles.map(createVehicle);
  vehicles.forEach(v => root.add(v.group));

  return {
    group: root,
    orbitalRingPavement,
    orbitalMedian,
    orbitalBarriers,
    roundabouts,
    radialRoads,
    buildings,
    trees,
    lights,
    vehicles,
  };
}
