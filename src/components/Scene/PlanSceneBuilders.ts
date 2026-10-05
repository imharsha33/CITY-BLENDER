import * as THREE from 'three';
import {
  createFreshAsphaltMaterial,
  createMarkingMaterial,
} from './RoadGeometry';
import type { VehicleInstance } from './Vehicles';
import { createVehicle } from './Vehicles';
import { flyoverScenario, ringRoadScenario } from '../../data/planScenarios';

// ─── Shared Engineering Materials ─────────────────────────────────────────────
const CONCRETE_PIER_MAT   = new THREE.MeshLambertMaterial({ color: 0x7a8088 });
const CONCRETE_DECK_MAT   = new THREE.MeshLambertMaterial({ color: 0x62686f });
const PARAPET_BARRIER_MAT = new THREE.MeshLambertMaterial({ color: 0x8a929e });
const MEDIAN_BARRIER_MAT  = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
const GROUND_ASPHALT_MAT  = new THREE.MeshLambertMaterial({ color: 0x303030 });
const FRESH_ASPHALT_MAT   = new THREE.MeshLambertMaterial({ color: 0x222428 });
const RE_WALL_MAT         = new THREE.MeshLambertMaterial({ color: 0x7a8080 });
const CURB_MAT            = new THREE.MeshLambertMaterial({ color: 0x9a9a9a });
const EARTH_FILL_MAT      = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
const GRASS_MAT           = new THREE.MeshLambertMaterial({ color: 0x4a7a38 });
const ROAD_BASE_MAT       = new THREE.MeshLambertMaterial({ color: 0x606060 });
const WHITE_MARK_MAT      = new THREE.MeshLambertMaterial({ color: 0xffffff });
const YELLOW_MARK_MAT     = new THREE.MeshLambertMaterial({ color: 0xf5c542 });
const BUILDING_COLORS     = [0xc4bbb0, 0xbab2a2, 0xcec6b6, 0xd2c8b8, 0xbdb5a5];

// ─── Helper: Add a Road Box Segment ───────────────────────────────────────────
function addRoadSeg(
  parent: THREE.Group,
  w: number, h: number, len: number,
  x: number, y: number, z: number,
  rotY = 0,
  mat: THREE.Material = GROUND_ASPHALT_MAT
) {
  const geo = new THREE.BoxGeometry(w, h, len);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ─── Helper: Kerb strip along Z ───────────────────────────────────────────────
function addKerb(parent: THREE.Group, len: number, x: number, y: number, z: number, rotY = 0) {
  const g = new THREE.BoxGeometry(0.3, 0.22, len);
  const m = new THREE.Mesh(g, CURB_MAT);
  m.position.set(x, y, z); m.rotation.y = rotY; parent.add(m);
}

// ─── Helper: Dashed lane markings along Z ─────────────────────────────────────
function addDashes(
  parent: THREE.Group, xs: number[], yBase: number, len: number,
  dashL = 3, gapL = 3, mat: THREE.Material = WHITE_MARK_MAT
) {
  const tot = dashL + gapL;
  const cnt = Math.floor(len / tot);
  xs.forEach(x => {
    for (let i = 0; i < cnt; i++) {
      const g = new THREE.BoxGeometry(0.18, 0.015, dashL);
      const m = new THREE.Mesh(g, mat);
      m.position.set(x, yBase, -len / 2 + i * tot + dashL / 2);
      parent.add(m);
    }
  });
}

// ─── Helper: Solid edge line along Z ──────────────────────────────────────────
function addEdgeLine(parent: THREE.Group, x: number, y: number, len: number, mat: THREE.Material = WHITE_MARK_MAT) {
  const g = new THREE.BoxGeometry(0.18, 0.015, len);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, 0); parent.add(m);
}

// ─── Helper: Street light pole + arm + lamp ───────────────────────────────────
function addLight(parent: THREE.Group, x: number, y: number, z: number, h = 7, armX = 1) {
  const pg = new THREE.CylinderGeometry(0.1, 0.13, h, 8);
  pg.translate(0, h / 2, 0);
  const pole = new THREE.Mesh(pg, new THREE.MeshLambertMaterial({ color: 0x888888 }));
  pole.position.set(x, y, z); parent.add(pole);
  const ag = new THREE.BoxGeometry(2.2, 0.08, 0.08);
  const arm = new THREE.Mesh(ag, new THREE.MeshLambertMaterial({ color: 0x888888 }));
  arm.position.set(x + armX * 1.1, y + h + 0.04, z); parent.add(arm);
  const lg = new THREE.BoxGeometry(0.5, 0.12, 0.3);
  const lamp = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ color: 0xffffcc }));
  lamp.position.set(x + armX * 2.2, y + h, z); parent.add(lamp);
}

// ─── Helper: Tree ─────────────────────────────────────────────────────────────
function addTree(parent: THREE.Group, x: number, z: number, s = 1) {
  const th = 1.4 * s;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18 * s, 0.22 * s, th, 7),
    new THREE.MeshLambertMaterial({ color: 0x5a3d28 })
  );
  trunk.position.set(x, th / 2, z); parent.add(trunk);
  const foliage = new THREE.Mesh(
    new THREE.SphereGeometry(1.4 * s, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0x2e6b28 })
  );
  foliage.position.set(x, th + 1.0 * s, z); parent.add(foliage);
}

// ─── Helper: Building block ───────────────────────────────────────────────────
function addBuilding(parent: THREE.Group, x: number, z: number, w: number, d: number, h: number, ci = 0) {
  const color = BUILDING_COLORS[ci % BUILDING_COLORS.length];
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.set(x, h / 2, z);
  body.castShadow = true; body.receiveShadow = true; parent.add(body);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.3, 0.4, d + 0.3),
    new THREE.MeshLambertMaterial({ color: Math.max(0, color - 0x101010) })
  );
  roof.position.set(x, h + 0.2, z); parent.add(roof);
}

// =============================================================================
// FLYOVER  –  Grade-Separated Elevated Viaduct
// =============================================================================

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

  const DECK_Y    = 6.8;
  const DECK_HALF = 36;
  const RAMP_LEN  = 55;
  const DECK_W    = 14.0;
  const ROAD_W    = 16.0;
  const AREA_LEN  = 240;
  const AREA_W    = 200;

  // 1. Terrain ─────────────────────────────────────────────────────────────────
  const terrain = new THREE.Group();
  const gnd = new THREE.Mesh(
    new THREE.PlaneGeometry(AREA_W, AREA_LEN),
    new THREE.MeshLambertMaterial({ color: 0x4a5e3a })
  );
  gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true; terrain.add(gnd);
  // Sidewalk strips
  [-ROAD_W / 2 - 4, ROAD_W / 2 + 4].forEach(x => {
    const sw = new THREE.Mesh(
      new THREE.PlaneGeometry(6, AREA_LEN),
      new THREE.MeshLambertMaterial({ color: 0x8a8070 })
    );
    sw.rotation.x = -Math.PI / 2; sw.position.set(x, 0.005, 0); terrain.add(sw);
  });
  root.add(terrain);

  // 2. Surface roads ───────────────────────────────────────────────────────────
  const surfaceRoads = new THREE.Group();
  // N-S road sub-base + wearing course
  addRoadSeg(surfaceRoads, ROAD_W + 1.5, 0.08, AREA_LEN, 0, 0.04, 0, 0, ROAD_BASE_MAT);
  addRoadSeg(surfaceRoads, ROAD_W,       0.07, AREA_LEN, 0, 0.10, 0, 0, FRESH_ASPHALT_MAT);
  // E-W crossroad
  addRoadSeg(surfaceRoads, 160, 0.07, ROAD_W, 0, 0.10, 0, 0, FRESH_ASPHALT_MAT);
  // Junction apron
  const ja = new THREE.Mesh(
    new THREE.BoxGeometry(ROAD_W + 2, 0.08, ROAD_W + 2),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  );
  ja.position.y = 0.12; surfaceRoads.add(ja);
  // Kerbs
  [-ROAD_W / 2 - 0.15, ROAD_W / 2 + 0.15].forEach(x => addKerb(surfaceRoads, AREA_LEN, x, 0.20, 0));
  // Lane markings on N-S road
  addEdgeLine(surfaceRoads, -0.15, 0.12, AREA_LEN, YELLOW_MARK_MAT);
  addEdgeLine(surfaceRoads,  0.15, 0.12, AREA_LEN, YELLOW_MARK_MAT);
  addDashes(surfaceRoads, [-ROAD_W / 4, ROAD_W / 4], 0.12, AREA_LEN);
  // Stop bars
  [-10, 10].forEach(z => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W, 0.02, 0.5), WHITE_MARK_MAT);
    b.position.set(0, 0.14, z); surfaceRoads.add(b);
  });
  [-10, 10].forEach(x => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, ROAD_W), WHITE_MARK_MAT);
    b.position.set(x, 0.14, 0); surfaceRoads.add(b);
  });
  // Zebra crossings (4 stripes each side)
  [-13, 13].forEach(z => {
    for (let s = 0; s < 5; s++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W, 0.02, 0.55), WHITE_MARK_MAT);
      st.position.set(0, 0.15, z + (s - 2) * 1.1); surfaceRoads.add(st);
    }
  });
  root.add(surfaceRoads);

  // 3. Pier foundations ────────────────────────────────────────────────────────
  const piersGroup = new THREE.Group();
  [-DECK_HALF, -18, 18, DECK_HALF].forEach(z => {
    // Pile cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(DECK_W - 1, 0.7, 3.0), CONCRETE_PIER_MAT);
    cap.position.set(0, 0.35, z); piersGroup.add(cap);
    // Twin columns
    [-4.0, 4.0].forEach(x => {
      const ch = DECK_Y - 0.7;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, ch, 16), CONCRETE_PIER_MAT);
      col.position.set(x, ch / 2 + 0.7, z); col.castShadow = true; piersGroup.add(col);
    });
    // Crosshead
    const bent = new THREE.Mesh(new THREE.BoxGeometry(DECK_W + 0.5, 0.9, 2.8), CONCRETE_PIER_MAT);
    bent.position.set(0, DECK_Y - 0.45, z); piersGroup.add(bent);
  });
  root.add(piersGroup);

  // 4. Elevated deck ───────────────────────────────────────────────────────────
  const elevatedDeck = new THREE.Group();
  const deckLen = DECK_HALF * 2;
  const girder = new THREE.Mesh(new THREE.BoxGeometry(DECK_W, 0.9, deckLen), CONCRETE_DECK_MAT);
  girder.position.set(0, DECK_Y - 0.45, 0); girder.castShadow = true; elevatedDeck.add(girder);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(DECK_W + 0.4, 0.28, deckLen), CONCRETE_DECK_MAT);
  slab.position.set(0, DECK_Y + 0.14, 0); elevatedDeck.add(slab);
  const wear = new THREE.Mesh(new THREE.BoxGeometry(DECK_W - 0.4, 0.07, deckLen), FRESH_ASPHALT_MAT);
  wear.position.set(0, DECK_Y + 0.31, 0); elevatedDeck.add(wear);
  root.add(elevatedDeck);

  // 5. Approach ramps with solid earth embankment ──────────────────────────────
  const approachRampSouth = buildGroundedRamp(DECK_W, RAMP_LEN, DECK_Y, -(DECK_HALF + RAMP_LEN / 2), true);
  const approachRampNorth = buildGroundedRamp(DECK_W, RAMP_LEN, DECK_Y,  (DECK_HALF + RAMP_LEN / 2), false);
  root.add(approachRampSouth);
  root.add(approachRampNorth);

  // 6. Parapet crash barriers on deck ─────────────────────────────────────────
  const barriersGroup = new THREE.Group();
  [-DECK_W / 2 + 0.25, DECK_W / 2 - 0.25].forEach(x => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.0, deckLen), PARAPET_BARRIER_MAT);
    b.position.set(x, DECK_Y + 0.82, 0); b.castShadow = true; barriersGroup.add(b);
    const rg = new THREE.CylinderGeometry(0.055, 0.055, deckLen, 8);
    rg.rotateX(Math.PI / 2);
    const rail = new THREE.Mesh(rg, new THREE.MeshLambertMaterial({ color: 0xcccccc }));
    rail.position.set(x, DECK_Y + 1.38, 0); barriersGroup.add(rail);
  });
  root.add(barriersGroup);

  // 7. Central median on deck ──────────────────────────────────────────────────
  const medianGroup = new THREE.Group();
  const med = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, deckLen), MEDIAN_BARRIER_MAT);
  med.position.set(0, DECK_Y + 0.73, 0); medianGroup.add(med);
  root.add(medianGroup);

  // 8. Lane markings on deck ───────────────────────────────────────────────────
  const markingsGroup = new THREE.Group();
  const SY = DECK_Y + 0.36;
  addEdgeLine(markingsGroup, -(DECK_W / 2 - 0.7), SY, deckLen);
  addEdgeLine(markingsGroup,  (DECK_W / 2 - 0.7), SY, deckLen);
  addDashes(markingsGroup, [-3.5, 3.5], SY, deckLen, 4, 4);
  addEdgeLine(markingsGroup, -0.2, SY, deckLen, YELLOW_MARK_MAT);
  addEdgeLine(markingsGroup,  0.2, SY, deckLen, YELLOW_MARK_MAT);
  root.add(markingsGroup);

  // 9. Elevated LED lighting ───────────────────────────────────────────────────
  const elevatedLights = new THREE.Group();
  [-24, 0, 24].forEach(z => {
    const ph = 5.5;
    const pg = new THREE.CylinderGeometry(0.10, 0.13, ph, 8);
    pg.translate(0, ph / 2, 0);
    const p = new THREE.Mesh(pg, new THREE.MeshLambertMaterial({ color: 0x888888 }));
    p.position.set(0, DECK_Y + 0.38, z); elevatedLights.add(p);
    [-2.0, 2.0].forEach(ax => {
      const ag = new THREE.BoxGeometry(Math.abs(ax) * 2, 0.07, 0.07);
      const arm = new THREE.Mesh(ag, new THREE.MeshLambertMaterial({ color: 0x888888 }));
      arm.position.set(ax / 2, DECK_Y + ph + 0.04, z); elevatedLights.add(arm);
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.1, 0.25),
        new THREE.MeshBasicMaterial({ color: 0xffffcc })
      );
      lamp.position.set(ax, DECK_Y + ph, z); elevatedLights.add(lamp);
    });
  });
  root.add(elevatedLights);

  // 10. Ground street lights ───────────────────────────────────────────────────
  const groundLights = new THREE.Group();
  [-90, -60, -30, 30, 60, 90].forEach(z => {
    addLight(groundLights, -(ROAD_W / 2 + 1.5), 0, z, 7,  1);
    addLight(groundLights,  (ROAD_W / 2 + 1.5), 0, z, 7, -1);
  });
  root.add(groundLights);

  // 11. Buildings flanking corridor ────────────────────────────────────────────
  const bldgs = new THREE.Group();
  const bd: number[][] = [
    [-30, -90, 14, 12, 18, 0], [-32, -50, 12, 10, 14, 1],
    [-34,  50, 13, 11, 20, 2], [-30,  85, 11, 13, 16, 3],
    [ 30, -90, 13, 11, 16, 1], [ 32, -50, 11, 13, 22, 0],
    [ 34,  50, 14, 10, 14, 4], [ 30,  85, 12, 12, 18, 2],
    [-38, -20, 10,  9, 10, 3], [ 38, -20, 10,  9, 12, 0],
    [-36,  20, 12, 10, 16, 1], [ 36,  20, 12, 10, 14, 2],
  ];
  bd.forEach(([x, z, w, d, h, ci]) => addBuilding(bldgs, x, z, w, d, h, ci));
  root.add(bldgs);

  // 12. Trees ──────────────────────────────────────────────────────────────────
  const trees = new THREE.Group();
  [-95, -75, -55, 55, 75, 95].forEach(z => {
    addTree(trees, -(ROAD_W / 2 + 5), z, 1.0);
    addTree(trees,  (ROAD_W / 2 + 5), z, 1.0);
  });
  [-55, -30, 30, 55].forEach(x => {
    addTree(trees, x, -(ROAD_W / 2 + 5), 0.9);
    addTree(trees, x,  (ROAD_W / 2 + 5), 0.9);
  });
  root.add(trees);

  // 13. Vehicles ───────────────────────────────────────────────────────────────
  const vehicles = flyoverScenario.vehicles.map(createVehicle);
  vehicles.forEach(v => root.add(v.group));

  return { group: root, surfaceRoads, approachRampSouth, approachRampNorth,
    elevatedDeck, piersGroup, barriersGroup, medianGroup, markingsGroup,
    elevatedLights, vehicles };
}

/**
 * Builds an approach ramp with a solid stepped earth embankment underneath,
 * RE retaining walls on the sides, and proper parapet barriers on top.
 */
function buildGroundedRamp(
  width: number, length: number, deckH: number, cZ: number, ascending: boolean
): THREE.Group {
  const g = new THREE.Group();
  const slope = Math.atan2(deckH, length) * (ascending ? 1 : -1);
  const halfH = deckH / 2;

  // Inclined deck slab
  const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.38, length), CONCRETE_DECK_MAT);
  slab.rotation.x = slope; slab.position.set(0, halfH + 0.17, cZ); slab.castShadow = true; g.add(slab);

  // Asphalt on ramp
  const asp = new THREE.Mesh(new THREE.BoxGeometry(width - 0.4, 0.07, length), FRESH_ASPHALT_MAT);
  asp.rotation.x = slope; asp.position.set(0, halfH + 0.38, cZ); g.add(asp);

  // Stepped earth fill embankment
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const layerH = ascending ? deckH * (i + 1) / steps : deckH * (1 - i / steps);
    if (layerH < 0.15) continue;
    const lz = cZ + ((ascending ? t : 1 - t) - 0.5) * length;
    const sl = length / steps + 0.15;

    // Earth fill body
    const fill = new THREE.Mesh(new THREE.BoxGeometry(width + 5, layerH, sl), EARTH_FILL_MAT);
    fill.position.set(0, layerH / 2, lz); fill.receiveShadow = true; g.add(fill);

    // Grass cap on side shoulders (not under road surface)
    const grass = new THREE.Mesh(new THREE.BoxGeometry(width + 5, 0.08, sl), GRASS_MAT);
    grass.position.set(0, layerH + 0.04, lz); g.add(grass);
  }

  // RE retaining walls on both sides
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const wh = ascending ? deckH * (i + 1) / steps : deckH * (1 - i / steps);
    if (wh < 0.5) continue;
    const wz = cZ + ((ascending ? t : 1 - t) - 0.5) * length;
    const wl = length / steps + 0.15;
    [-width / 2 - 0.25, width / 2 + 0.25].forEach(x => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, Math.min(wh, deckH), wl), RE_WALL_MAT);
      wall.position.set(x, Math.min(wh, deckH) / 2, wz); g.add(wall);
    });
  }

  // Parapet barriers on ramp (follow slope)
  [-width / 2 + 0.3, width / 2 - 0.3].forEach(x => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, length), PARAPET_BARRIER_MAT);
    b.rotation.x = slope; b.position.set(x, halfH + 0.65, cZ); g.add(b);
  });

  // Ramp lane markings
  for (let i = 0; i < 7; i++) {
    const frac = (i + 0.5) / 7;
    const mz = cZ + (frac - 0.5) * length;
    [-3.5, 3.5].forEach(x => {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.015, 3.0), WHITE_MARK_MAT);
      d.rotation.x = slope; d.position.set(x, halfH + 0.42, mz); g.add(d);
    });
  }

  return g;
}

// =============================================================================
// RING ROAD  –  Orbital Peripheral Bypass (Fully Grounded)
// =============================================================================

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

  const R         = 72.0;
  const CARR_W    = 7.0;   // each carriageway (2 lanes × 3.5m)
  const MEDIAN_W  = 2.0;
  const SHLDR_W   = 2.0;
  const TOTAL_W   = CARR_W * 2 + MEDIAN_W + SHLDR_W * 2;
  const A0        = -Math.PI * 0.90;
  const A1        =  Math.PI * 0.30;
  const ASPAN     = A1 - A0;
  const SEGS      = 64;

  // 1. Terrain ─────────────────────────────────────────────────────────────────
  const ter = new THREE.Group();
  const gnd = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 320),
    new THREE.MeshLambertMaterial({ color: 0x4a5e3a })
  );
  gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true; ter.add(gnd);
  // Urban paved interior (inside ring)
  const inn = new THREE.Mesh(
    new THREE.CircleGeometry(R - TOTAL_W / 2 - 3, 48),
    new THREE.MeshLambertMaterial({ color: 0x4d5555 })
  );
  inn.rotation.x = -Math.PI / 2; inn.position.y = 0.005; ter.add(inn);
  root.add(ter);

  // 2. Ring road pavement layers ───────────────────────────────────────────────
  const orbitalRingPavement = new THREE.Group();

  function ringLayer(rInner: number, rOuter: number, y: number, mat: THREE.Material) {
    const g = new THREE.RingGeometry(rInner, rOuter, SEGS, 1, A0, ASPAN);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat);
    m.position.y = y; m.receiveShadow = true; orbitalRingPavement.add(m);
  }

  const RI = R - TOTAL_W / 2;
  const RO = R + TOTAL_W / 2;
  // Sub-base
  ringLayer(RI - 0.5, RO + 0.5, 0.04, ROAD_BASE_MAT);
  // Inner hard shoulder
  ringLayer(RI, RI + SHLDR_W, 0.07, new THREE.MeshLambertMaterial({ color: 0x555555 }));
  // Inner carriageway (anti-clockwise / inbound)
  ringLayer(RI + SHLDR_W, RI + SHLDR_W + CARR_W, 0.09, FRESH_ASPHALT_MAT);
  // Outer carriageway (clockwise / outbound)
  ringLayer(RO - SHLDR_W - CARR_W, RO - SHLDR_W, 0.09, FRESH_ASPHALT_MAT);
  // Outer hard shoulder
  ringLayer(RO - SHLDR_W, RO, 0.07, new THREE.MeshLambertMaterial({ color: 0x555555 }));

  // Lane dashes on each carriageway
  const MY = 0.11;
  [R - MEDIAN_W / 2 - CARR_W / 2, R + MEDIAN_W / 2 + CARR_W / 2].forEach(rc => {
    for (let i = 0; i < 38; i++) {
      const a = A0 + (i + 0.5) / 38 * ASPAN;
      const rY = -Math.atan2(Math.cos(a), Math.sin(a));
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 3.5), WHITE_MARK_MAT);
      d.position.set(Math.cos(a) * rc, MY, Math.sin(a) * rc); d.rotation.y = rY;
      orbitalRingPavement.add(d);
    }
  });

  // Edge solid lines (inner and outer road edge)
  [RI + SHLDR_W + 0.3, RO - SHLDR_W - 0.3].forEach(re => {
    for (let i = 0; i < 55; i++) {
      const a = A0 + (i + 0.5) / 55 * ASPAN;
      const rY = -Math.atan2(Math.cos(a), Math.sin(a));
      const sl = ASPAN * re / 55 + 0.15;
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, sl), WHITE_MARK_MAT);
      e.position.set(Math.cos(a) * re, MY, Math.sin(a) * re); e.rotation.y = rY;
      orbitalRingPavement.add(e);
    }
  });

  root.add(orbitalRingPavement);

  // 3. Central raised median ───────────────────────────────────────────────────
  const orbitalMedian = new THREE.Group();

  function medRing(rI: number, rO: number, y: number, mat: THREE.Material) {
    const g = new THREE.RingGeometry(rI, rO, SEGS, 1, A0, ASPAN);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat); m.position.y = y; orbitalMedian.add(m);
  }

  // Concrete base
  medRing(R - MEDIAN_W / 2, R + MEDIAN_W / 2, 0.15, new THREE.MeshLambertMaterial({ color: 0x7a7a7a }));
  // Green planting strip
  medRing(R - MEDIAN_W / 2 + 0.28, R + MEDIAN_W / 2 - 0.28, 0.19, new THREE.MeshLambertMaterial({ color: 0x3a7030 }));
  // Kerbs
  [R - MEDIAN_W / 2, R + MEDIAN_W / 2].forEach(kr => {
    medRing(kr - 0.12, kr + 0.12, 0.14, CURB_MAT);
  });

  // Jersey crash barriers along median centre-line
  for (let i = 0; i < 34; i++) {
    const a = A0 + (i + 0.5) / 34 * ASPAN;
    const rY = -Math.atan2(Math.cos(a), Math.sin(a));
    const sl = ASPAN * R / 34 + 0.08;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, sl), MEDIAN_BARRIER_MAT);
    b.position.set(Math.cos(a) * R, 0.60, Math.sin(a) * R); b.rotation.y = rY;
    orbitalMedian.add(b);
  }
  root.add(orbitalMedian);

  // 4. Outer W-beam guardrail barriers ─────────────────────────────────────────
  const orbitalBarriers = new THREE.Group();
  [RI + 0.2, RO - 0.2].forEach(br => {
    for (let i = 0; i <= 42; i++) {
      const a = A0 + (i / 42) * ASPAN;
      const pg = new THREE.CylinderGeometry(0.07, 0.07, 0.82, 6);
      pg.translate(0, 0.41, 0);
      const post = new THREE.Mesh(pg, PARAPET_BARRIER_MAT);
      post.position.set(Math.cos(a) * br, 0.09, Math.sin(a) * br); orbitalBarriers.add(post);
    }
    for (let i = 0; i < 40; i++) {
      const a = A0 + (i + 0.5) / 40 * ASPAN;
      const rY = -Math.atan2(Math.cos(a), Math.sin(a));
      const sl = ASPAN * br / 40 + 0.12;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, sl), PARAPET_BARRIER_MAT);
      rail.position.set(Math.cos(a) * br, 0.58, Math.sin(a) * br); rail.rotation.y = rY;
      orbitalBarriers.add(rail);
    }
  });
  root.add(orbitalBarriers);

  // 5. Interchange roundabouts ─────────────────────────────────────────────────
  const roundabouts = new THREE.Group();
  const icA = [A0 + ASPAN * 0.22, A0 + ASPAN * 0.68];
  icA.forEach(ang => {
    const cx = Math.cos(ang) * R, cz = Math.sin(ang) * R;

    // Carriageway ring
    const cg = new THREE.RingGeometry(12, 22, 36); cg.rotateX(-Math.PI / 2);
    const circ = new THREE.Mesh(cg, new THREE.MeshLambertMaterial({ color: 0x2a2a2a }));
    circ.position.set(cx, 0.09, cz); roundabouts.add(circ);

    // Central island
    const ig = new THREE.CylinderGeometry(11.5, 12, 0.42, 36); ig.translate(0, 0.21, 0);
    const isl = new THREE.Mesh(ig, new THREE.MeshLambertMaterial({ color: 0x3a6b30 }));
    isl.position.set(cx, 0.08, cz); roundabouts.add(isl);

    // Circulating lane dashes
    for (let i = 0; i < 22; i++) {
      const a2 = (i / 22) * Math.PI * 2;
      const mk = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 2.2), WHITE_MARK_MAT);
      mk.position.set(cx + Math.cos(a2) * 17, 0.11, cz + Math.sin(a2) * 17);
      mk.rotation.y = -Math.atan2(Math.cos(a2), Math.sin(a2)); roundabouts.add(mk);
    }

    // Flagpole
    const fpg = new THREE.CylinderGeometry(0.14, 0.22, 9, 8); fpg.translate(0, 4.5, 0);
    const fp = new THREE.Mesh(fpg, new THREE.MeshLambertMaterial({ color: 0xdddddd }));
    fp.position.set(cx, 0.42, cz); roundabouts.add(fp);

    // Island trees
    for (let i = 0; i < 7; i++) {
      const ta = (i / 7) * Math.PI * 2;
      addTree(roundabouts, cx + Math.cos(ta) * 7, cz + Math.sin(ta) * 7, 0.75);
    }
  });
  root.add(roundabouts);

  // 6. Radial feeder roads ─────────────────────────────────────────────────────
  const radialRoads = new THREE.Group();
  icA.forEach(ang => {
    const tx = Math.cos(ang) * (RI - SHLDR_W - 10);
    const tz = Math.sin(ang) * (RI - SHLDR_W - 10);
    const len = Math.hypot(tx, tz);
    const rY = -Math.atan2(tz, tx) + Math.PI / 2;
    addRoadSeg(radialRoads, 11.5, 0.07, len, tx / 2, 0.04, tz / 2, rY, ROAD_BASE_MAT);
    addRoadSeg(radialRoads, 10.0, 0.06, len, tx / 2, 0.09, tz / 2, rY, FRESH_ASPHALT_MAT);
    // Kerbs
    [-5.0, 5.0].forEach(kx => {
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, len), CURB_MAT);
      k.position.set(tx / 2 + kx * Math.cos(rY), 0.19, tz / 2 + kx * Math.sin(rY));
      k.rotation.y = rY; radialRoads.add(k);
    });
    // Lane dashes
    for (let i = 0; i < 7; i++) {
      const t = (i + 0.5) / 7;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 3.5), WHITE_MARK_MAT);
      m.position.set(tx * t, 0.12, tz * t); m.rotation.y = rY; radialRoads.add(m);
    }
  });
  root.add(radialRoads);

  // 7. Buildings ───────────────────────────────────────────────────────────────
  const buildings = new THREE.Group();
  const ib: number[][] = [
    [ -8,  15, 14, 14, 24, 0], [-30,  25, 16, 13, 20, 1],
    [ 12,  22, 12, 15, 28, 2], [ -8, -15, 18, 14, 18, 3],
    [ 22,  -5, 15, 15, 22, 4], [ -5, -45, 12, 11, 16, 0],
    [ 30,  40, 14, 12, 20, 1], [-20,  55, 10, 12, 14, 2],
  ];
  ib.forEach(([x, z, w, d, h, ci]) => addBuilding(buildings, x, z, w, d, h, ci));
  const ob: number[][] = [
    [-R - 20, -35, 26, 20, 10, 3], [R + 20, -35, 28, 18, 11, 1],
    [       0, -R - 18, 30, 18, 12, 0],
    [-R - 20,  30, 20, 16,  9, 4], [ R + 20,  30, 22, 16, 10, 2],
  ];
  ob.forEach(([x, z, w, d, h, ci]) => addBuilding(buildings, x, z, w, d, h, ci));
  root.add(buildings);

  // 8. Trees ───────────────────────────────────────────────────────────────────
  const trees = new THREE.Group();
  const tN = 20;
  for (let i = 0; i < tN; i++) {
    const a = A0 + (i / (tN - 1)) * ASPAN;
    addTree(trees, Math.cos(a) * (RO + 3.5), Math.sin(a) * (RO + 3.5), 1.0 + (i % 3) * 0.15);
    addTree(trees, Math.cos(a) * (RI - 4.0), Math.sin(a) * (RI - 4.0), 0.9 + (i % 2) * 0.1);
  }
  [[-45,-10],[-25,-38],[35,-28],[45,18],[-5,52],[-60,42],[55,-10],[-35,60]]
    .forEach(([tx, tz]) => addTree(trees, tx, tz, 1.0));
  root.add(trees);

  // 9. High-mast LED lights ────────────────────────────────────────────────────
  const lights = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const a = A0 + (i / 15) * ASPAN;
    const lr = RO + 1.5;
    addLight(lights, Math.cos(a) * lr, 0, Math.sin(a) * lr, 8, Math.cos(a) > 0 ? -1 : 1);
  }
  root.add(lights);

  // 10. Vehicles ───────────────────────────────────────────────────────────────
  const vehicles = ringRoadScenario.vehicles.map(createVehicle);
  vehicles.forEach(v => root.add(v.group));

  return { group: root, orbitalRingPavement, orbitalMedian, orbitalBarriers,
    roundabouts, radialRoads, buildings, trees, lights, vehicles };
}
