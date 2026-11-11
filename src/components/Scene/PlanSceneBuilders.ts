import * as THREE from 'three';
import type { VehicleInstance } from './Vehicles';
import { createVehicle } from './Vehicles';
import { flyoverScenario, ringRoadScenario, combinedScenario } from '../../data/planScenarios';

// ─── High-Contrast Architectural Engineering Materials (Light-Theme Optimized) ───────────
const CONCRETE_PIER_MAT = new THREE.MeshStandardMaterial({
  color: 0xdae0e8,
  roughness: 0.42,
  metalness: 0.12,
});

const CONCRETE_DECK_MAT = new THREE.MeshStandardMaterial({
  color: 0xc9d1dc,
  roughness: 0.48,
  metalness: 0.08,
});

const PARAPET_BARRIER_MAT = new THREE.MeshStandardMaterial({
  color: 0x94a3b8,
  roughness: 0.40,
  metalness: 0.15,
});

const GUIDE_RAIL_MAT = new THREE.MeshStandardMaterial({
  color: 0x0284c7, // Vibrant highway safety blue top rail
  roughness: 0.28,
  metalness: 0.60,
});

const MEDIAN_BARRIER_MAT = new THREE.MeshStandardMaterial({
  color: 0x64748b,
  roughness: 0.55,
  metalness: 0.12,
});

const GROUND_ASPHALT_MAT = new THREE.MeshStandardMaterial({
  color: 0x242830,
  roughness: 0.78,
  metalness: 0.05,
});

const FRESH_ASPHALT_MAT = new THREE.MeshStandardMaterial({
  color: 0x16181e,
  roughness: 0.70,
  metalness: 0.06,
});

const RE_WALL_MAT = new THREE.MeshStandardMaterial({
  color: 0xcfd5de,
  roughness: 0.52,
  metalness: 0.08,
});

const CURB_MAT = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  roughness: 0.35,
  metalness: 0.10,
});

const EARTH_FILL_MAT = new THREE.MeshStandardMaterial({
  color: 0x8b7355,
  roughness: 0.88,
  metalness: 0.02,
});

const GRASS_MAT = new THREE.MeshStandardMaterial({
  color: 0x4f8a3d,
  roughness: 0.85,
  metalness: 0.02,
});

const ROAD_BASE_MAT = new THREE.MeshStandardMaterial({
  color: 0x475569,
  roughness: 0.85,
  metalness: 0.05,
});

const WHITE_MARK_MAT = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.30,
  metalness: 0.05,
  emissive: new THREE.Color(0x555555),
});

const YELLOW_MARK_MAT = new THREE.MeshStandardMaterial({
  color: 0xf59e0b,
  roughness: 0.30,
  metalness: 0.05,
  emissive: new THREE.Color(0x664400),
});

const SIGN_GREEN_MAT = new THREE.MeshStandardMaterial({
  color: 0x059669,
  roughness: 0.35,
  metalness: 0.15,
  emissive: new THREE.Color(0x023d29),
});

const STEEL_STRUCTURE_MAT = new THREE.MeshStandardMaterial({
  color: 0x64748b,
  roughness: 0.35,
  metalness: 0.75,
});

const FOUNTAIN_WATER_MAT = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  roughness: 0.10,
  metalness: 0.20,
  emissive: new THREE.Color(0x0284c7),
});

const BUILDING_COLORS = [0xd5cfc5, 0xc8c0b2, 0xdcd5c8, 0xe0d7ca, 0xccc3b5];

// ─── Helper: Road Segment with 3D Depth ───────────────────────────────────────
function addRoadSeg(
  parent: THREE.Group,
  w: number, h: number, len: number,
  x: number, y: number, z: number,
  rotY = 0,
  mat: THREE.Material = GROUND_ASPHALT_MAT
) {
  const geo = new THREE.BoxGeometry(w, h, len);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y + h / 2, z);
  m.rotation.y = rotY;
  m.receiveShadow = true;
  m.castShadow = true;
  parent.add(m);
  return m;
}

// ─── Helper: Raised Beveled Curb ──────────────────────────────────────────────
function addKerb(parent: THREE.Group, len: number, x: number, y: number, z: number, rotY = 0) {
  const g = new THREE.BoxGeometry(0.35, 0.24, len);
  const m = new THREE.Mesh(g, CURB_MAT);
  m.position.set(x, y + 0.12, z);
  m.rotation.y = rotY;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
}

// ─── Helper: Emissive Dashed Lane Markings ─────────────────────────────────────
function addDashes(
  parent: THREE.Group, xs: number[], yBase: number, len: number,
  dashL = 3.5, gapL = 4.0, mat: THREE.Material = WHITE_MARK_MAT
) {
  const tot = dashL + gapL;
  const cnt = Math.floor(len / tot);
  xs.forEach(x => {
    for (let i = 0; i < cnt; i++) {
      const g = new THREE.BoxGeometry(0.20, 0.02, dashL);
      const m = new THREE.Mesh(g, mat);
      m.position.set(x, yBase + 0.01, -len / 2 + i * tot + dashL / 2);
      parent.add(m);
    }
  });
}

// ─── Helper: Solid Edge Line ──────────────────────────────────────────────────
function addEdgeLine(parent: THREE.Group, x: number, y: number, len: number, mat: THREE.Material = WHITE_MARK_MAT) {
  const g = new THREE.BoxGeometry(0.20, 0.02, len);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y + 0.01, 0);
  parent.add(m);
}

// ─── Helper: Overhead Highway Portal Sign Gantry ──────────────────────────────
// Conforms to IRC:67 / AASHTO highway standards: provides 5.8m minimum clear headroom
// above the asphalt surface so buses, trucks, and cars pass under with generous clearance.
function addOverheadGantry(
  parent: THREE.Group,
  width: number,
  roadSurfaceY: number,
  z: number,
  title1: string,
  title2: string
) {
  const gantryGroup = new THREE.Group();
  const baseY = roadSurfaceY;
  const HEADROOM = 5.8;   // 5.8m vertical clearance above road surface (zero clipping)
  const TRUSS_H  = 2.2;   // 2.2m truss structural depth
  const poleH    = HEADROOM + TRUSS_H + 0.4; // 8.4m total column height above road

  // Twin heavy structural tubular steel support legs
  [-width / 2, width / 2].forEach(x => {
    // Main structural vertical leg
    const legGeo = new THREE.CylinderGeometry(0.24, 0.28, poleH, 12);
    const leg = new THREE.Mesh(legGeo, STEEL_STRUCTURE_MAT);
    leg.position.set(x, baseY + poleH / 2, z);
    leg.castShadow = true;
    gantryGroup.add(leg);

    // Base mounting shoe / anchor bolt flange plate
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.22, 0.85),
      STEEL_STRUCTURE_MAT
    );
    shoe.position.set(x, baseY + 0.11, z);
    shoe.castShadow = true;
    gantryGroup.add(shoe);

    // Diagonal corner knee brace supporting truss cantilever
    const braceGeo = new THREE.BoxGeometry(0.12, 1.6, 0.12);
    const brace = new THREE.Mesh(braceGeo, STEEL_STRUCTURE_MAT);
    const braceDir = x > 0 ? -1 : 1;
    brace.position.set(x + braceDir * 0.55, baseY + HEADROOM - 0.45, z);
    brace.rotation.z = braceDir * (Math.PI / 4);
    gantryGroup.add(brace);
  });

  // Lower chord truss beam (sets the 5.8m clearance line above roadway)
  const bottomBeamGeo = new THREE.BoxGeometry(width + 0.8, 0.32, 0.32);
  const bottomBeam = new THREE.Mesh(bottomBeamGeo, STEEL_STRUCTURE_MAT);
  bottomBeam.position.set(0, baseY + HEADROOM, z);
  bottomBeam.castShadow = true;
  gantryGroup.add(bottomBeam);

  // Upper chord truss beam
  const topBeamGeo = new THREE.BoxGeometry(width + 0.8, 0.32, 0.32);
  const topBeam = new THREE.Mesh(topBeamGeo, STEEL_STRUCTURE_MAT);
  topBeam.position.set(0, baseY + HEADROOM + TRUSS_H, z);
  topBeam.castShadow = true;
  gantryGroup.add(topBeam);

  // Internal truss diagonal webbing lacing
  const webBays = Math.floor(width / 1.6);
  for (let i = 0; i < webBays; i++) {
    const wx = -width / 2 + 0.8 + i * 1.6;
    const diagGeo = new THREE.BoxGeometry(0.08, TRUSS_H * 1.25, 0.08);
    const diag = new THREE.Mesh(diagGeo, STEEL_STRUCTURE_MAT);
    diag.position.set(wx, baseY + HEADROOM + TRUSS_H / 2, z);
    diag.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.55;
    gantryGroup.add(diag);
  }

  // Maintenance walkway inspection grate behind signboards
  const walkwayGeo = new THREE.BoxGeometry(width * 0.9, 0.08, 0.7);
  const walkway = new THREE.Mesh(walkwayGeo, STEEL_STRUCTURE_MAT);
  walkway.position.set(0, baseY + HEADROOM + 0.08, z - 0.35);
  gantryGroup.add(walkway);

  // Highway destination signage plates (elevated securely above the travelway)
  const signW = Math.min(6.5, width * 0.44);
  const signH = 1.8;
  const signCenterY = baseY + HEADROOM + 0.2 + signH / 2; // Center at ~6.9m above road surface

  [-signW * 0.55, signW * 0.55].forEach((sx, idx) => {
    // Green highway retroreflective destination panel
    const signGeo = new THREE.BoxGeometry(signW, signH, 0.10);
    const signMesh = new THREE.Mesh(signGeo, SIGN_GREEN_MAT);
    signMesh.position.set(sx, signCenterY, z + 0.22);
    signMesh.castShadow = true;
    gantryGroup.add(signMesh);

    // Reflective white border trim frame
    const borderGeo = new THREE.BoxGeometry(signW + 0.12, signH + 0.12, 0.06);
    const borderMesh = new THREE.Mesh(borderGeo, WHITE_MARK_MAT);
    borderMesh.position.set(sx, signCenterY, z + 0.18);
    gantryGroup.add(borderMesh);

    // Visual route shield & destination banner bars
    const bannerGeo = new THREE.BoxGeometry(signW * 0.88, 0.22, 0.04);
    const bannerMesh = new THREE.Mesh(bannerGeo, WHITE_MARK_MAT);
    bannerMesh.position.set(sx, signCenterY + signH * 0.26, z + 0.28);
    gantryGroup.add(bannerMesh);

    // Sub-panel lane guide chevron arrows (downward pointing arrows: ↓)
    [-signW * 0.25, signW * 0.25].forEach(ax => {
      const arrowShaft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.04), WHITE_MARK_MAT);
      arrowShaft.position.set(sx + ax, signCenterY - signH * 0.24, z + 0.28);
      gantryGroup.add(arrowShaft);

      const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 4), WHITE_MARK_MAT);
      arrowHead.rotation.z = Math.PI; // pointing DOWN onto the travel lane
      arrowHead.position.set(sx + ax, signCenterY - signH * 0.36, z + 0.28);
      gantryGroup.add(arrowHead);
    });

    // Overhead solar LED sign luminaire hood fixtures
    for (let lx = -signW / 2 + 0.9; lx <= signW / 2 - 0.9; lx += 1.8) {
      const fixtureArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.55), STEEL_STRUCTURE_MAT);
      fixtureArm.position.set(sx + lx, signCenterY + signH / 2 + 0.15, z + 0.32);
      gantryGroup.add(fixtureArm);

      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.16), STEEL_STRUCTURE_MAT);
      hood.position.set(sx + lx, signCenterY + signH / 2 + 0.18, z + 0.55);
      gantryGroup.add(hood);

      const ledLens = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.12), new THREE.MeshBasicMaterial({ color: 0xfffaed }));
      ledLens.rotation.x = Math.PI / 4;
      ledLens.position.set(sx + lx, signCenterY + signH / 2 + 0.13, z + 0.53);
      gantryGroup.add(ledLens);
    }
  });

  parent.add(gantryGroup);
  return gantryGroup;
}

// ─── Helper: Modern Aerodynamic Dual-Arm Street Light ─────────────────────────
function addModernStreetLight(
  parent: THREE.Group,
  x: number, y: number, z: number,
  h = 7.5,
  dual = false
) {
  const lightGroup = new THREE.Group();
  lightGroup.position.set(x, y, z);

  // Pole
  const pg = new THREE.CylinderGeometry(0.12, 0.18, h, 10);
  const pole = new THREE.Mesh(pg, STEEL_STRUCTURE_MAT);
  pole.position.set(0, h / 2, 0);
  pole.castShadow = true;
  lightGroup.add(pole);

  // Arm(s)
  const arms = dual ? [-1, 1] : [1];
  arms.forEach(dir => {
    const ag = new THREE.BoxGeometry(2.4, 0.10, 0.10);
    const arm = new THREE.Mesh(ag, STEEL_STRUCTURE_MAT);
    arm.position.set(dir * 1.2, h + 0.1, 0);
    arm.rotation.z = dir * 0.12;
    lightGroup.add(arm);

    // Luminaire fixture
    const lg = new THREE.BoxGeometry(0.65, 0.12, 0.35);
    const fixture = new THREE.Mesh(lg, STEEL_STRUCTURE_MAT);
    fixture.position.set(dir * 2.3, h + 0.2, 0);
    lightGroup.add(fixture);

    // Emissive LED glowing lens
    const lensGeo = new THREE.PlaneGeometry(0.55, 0.28);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0xfffaed });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(dir * 2.3, h + 0.13, 0);
    lightGroup.add(lens);
  });

  parent.add(lightGroup);
  return lightGroup;
}

// ─── Helper: Landscaped Tree ──────────────────────────────────────────────────
function addTree(parent: THREE.Group, x: number, z: number, s = 1) {
  const th = 1.6 * s;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18 * s, 0.24 * s, th, 8),
    new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.9 })
  );
  trunk.position.set(x, th / 2, z);
  trunk.castShadow = true;
  parent.add(trunk);

  const foliage = new THREE.Mesh(
    new THREE.SphereGeometry(1.5 * s, 9, 7),
    new THREE.MeshStandardMaterial({ color: 0x3e7b2a, roughness: 0.8 })
  );
  foliage.position.set(x, th + 1.1 * s, z);
  foliage.castShadow = true;
  parent.add(foliage);
}

// ─── Helper: Modern City Building ─────────────────────────────────────────────
function addBuilding(parent: THREE.Group, x: number, z: number, w: number, d: number, h: number, ci = 0) {
  const color = BUILDING_COLORS[ci % BUILDING_COLORS.length];
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15 })
  );
  body.position.set(x, h / 2, z);
  body.castShadow = true;
  body.receiveShadow = true;
  parent.add(body);

  // Roof cap
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 })
  );
  roof.position.set(x, h + 0.25, z);
  parent.add(roof);

  // Architectural window bands
  const bandCount = Math.floor(h / 3.5);
  for (let b = 1; b <= bandCount; b++) {
    const bandGeo = new THREE.BoxGeometry(w + 0.1, 0.9, d + 0.1);
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.8 });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.set(x, b * 3.5, z);
    parent.add(band);
  }
}

// ─── Heavy Bridge Construction Equipment Helpers ─────────────────────────────
function createPilingRig(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'equipment-piling-rig';
  // Heavy crawler carrier chassis
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 1.2, 4.6),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 })
  );
  base.position.y = 0.8;
  base.castShadow = true;
  g.add(base);

  // Twin heavy crawler tracks
  [-2.0, 2.0].forEach(x => {
    const tr = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.9, 5.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
    );
    tr.position.set(x, 0.45, 0);
    tr.castShadow = true;
    g.add(tr);
  });

  // Operator cabin
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.6, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
  );
  cab.position.set(1.1, 2.2, 0.8);
  cab.castShadow = true;
  g.add(cab);

  // Vertical rotary drilling mast (15m height)
  const mast = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 14.5, 0.8),
    STEEL_STRUCTURE_MAT
  );
  mast.position.set(0, 8.0, 1.6);
  mast.castShadow = true;
  g.add(mast);

  // Rotary hydraulic powerhead & continuous flight auger
  const auger = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 9.5, 12),
    new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.4 })
  );
  auger.position.set(0, 5.2, 2.1);
  auger.castShadow = true;
  g.add(auger);

  return g;
}

function createHeavyCrane(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'equipment-crawler-crane';

  // Crawler undercarriage
  const undercarriage = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 1.4, 5.4),
    new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 })
  );
  undercarriage.position.y = 1.0;
  undercarriage.castShadow = true;
  g.add(undercarriage);

  // Tracks
  [-2.2, 2.2].forEach(x => {
    const tr = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.0, 6.0),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
    );
    tr.position.set(x, 0.5, 0);
    tr.castShadow = true;
    g.add(tr);
  });

  // Rotating superstructure deck
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 1.6, 4.0),
    new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.4 })
  );
  deck.position.set(0, 2.3, -0.4);
  deck.castShadow = true;
  g.add(deck);

  // High counterweight blocks
  const cw = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 2.0, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
  );
  cw.position.set(0, 2.5, -2.1);
  cw.castShadow = true;
  g.add(cw);

  // Lattice boom inclined forward (20m length)
  const boom = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 20.0, 0.7),
    STEEL_STRUCTURE_MAT
  );
  boom.position.set(0, 10.5, 4.5);
  boom.rotation.x = -Math.PI / 5.5; // ~32 deg tilt
  boom.castShadow = true;
  g.add(boom);

  // Hoist steel wire rope & spreader beam
  const wire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 8.0, 6),
    STEEL_STRUCTURE_MAT
  );
  wire.position.set(0, 8.0, 9.8);
  g.add(wire);

  // Girder lifting spreader beam
  const spreader = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 0.35, 0.35),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 })
  );
  spreader.position.set(0, 4.0, 9.8);
  spreader.castShadow = true;
  g.add(spreader);

  return g;
}

function createRebarCage(height = 6.2, radius = 1.1): THREE.Group {
  const g = new THREE.Group();
  g.name = 'rebar-cage';
  const barMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.75, roughness: 0.35 });
  const count = 14;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, height, 6), barMat);
    bar.position.set(Math.cos(a) * radius, height / 2 + 0.4, Math.sin(a) * radius);
    bar.castShadow = true;
    g.add(bar);
  }
  for (let y = 0.8; y < height; y += 1.1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.035, 6, 18), barMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  return g;
}

// =============================================================================
// FLYOVER  –  High-Definition Grade-Separated Elevated Viaduct
// =============================================================================

export interface FlyoverSceneElements {
  group: THREE.Group;
  surfaceRoads: THREE.Group;
  serviceRoads: THREE.Group;
  approachRampSouth: THREE.Group;
  approachRampNorth: THREE.Group;
  elevatedDeck: THREE.Group;
  piersGroup: THREE.Group;
  barriersGroup: THREE.Group;
  medianGroup: THREE.Group;
  markingsGroup: THREE.Group;
  elevatedLights: THREE.Group;
  overheadGantry: THREE.Group;
  constructionGroup: THREE.Group;
  pilingRigGroup: THREE.Group;
  craneGroup: THREE.Group;
  rebarCagesGroup: THREE.Group;
  vehicles: VehicleInstance[];
}

export function buildFlyover3D(): FlyoverSceneElements {
  const root = new THREE.Group();
  root.name = 'flyover-root';

  const DECK_Y    = 7.0;   // Generous clearance above surface intersection
  const DECK_HALF = 45;    // 90m elevated deck span
  const RAMP_LEN  = 55;    // Smooth approach gradient
  const DECK_W    = 15.0;  // 4 elevated lanes (2x2) + median
  const ROAD_W    = 16.0;  // Surface corridor width
  const AREA_LEN  = 260;
  const AREA_W    = 220;

  // 1. Terrain & Manicured Surroundings ─────────────────────────────────────────
  const terrain = new THREE.Group();
  const gnd = new THREE.Mesh(
    new THREE.PlaneGeometry(AREA_W, AREA_LEN),
    GRASS_MAT
  );
  gnd.rotation.x = -Math.PI / 2;
  gnd.position.y = -0.01; // Flush ground foundation below road layers
  gnd.receiveShadow = true;
  terrain.add(gnd);

  // Flanking paved pedestrian sidewalks with textured stone pavers (placed outside service road)
  [-15.6, 15.6].forEach(x => {
    const sw = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.15, AREA_LEN),
      new THREE.MeshStandardMaterial({ color: 0xc8c3b7, roughness: 0.65 })
    );
    sw.position.set(x, 0.075, 0);
    sw.receiveShadow = true;
    terrain.add(sw);
  });
  root.add(terrain);

  // 2. Surface Roads (4-Way Intersection Underneath Viaduct) ─────────────────────
  const surfaceRoads = new THREE.Group();
  // N-S Corridor
  addRoadSeg(surfaceRoads, ROAD_W + 1.2, 0.10, AREA_LEN, 0, 0.05, 0, 0, ROAD_BASE_MAT);
  addRoadSeg(surfaceRoads, ROAD_W,       0.08, AREA_LEN, 0, 0.12, 0, 0, FRESH_ASPHALT_MAT);

  // E-W Crossroad Arterial
  addRoadSeg(surfaceRoads, 180, 0.10, ROAD_W + 1.2, 0, 0.05, 0, 0, ROAD_BASE_MAT);
  addRoadSeg(surfaceRoads, 180, 0.08, ROAD_W,       0, 0.12, 0, 0, FRESH_ASPHALT_MAT);

  // Central Junction Apron with High-Friction Intersection Pavement
  const junctionApron = new THREE.Mesh(
    new THREE.BoxGeometry(ROAD_W + 3, 0.09, ROAD_W + 3),
    new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.85 })
  );
  junctionApron.position.set(0, 0.13, 0);
  junctionApron.receiveShadow = true;
  surfaceRoads.add(junctionApron);

  // Curbs along surface roads
  [-ROAD_W / 2 - 0.2, ROAD_W / 2 + 0.2].forEach(x => addKerb(surfaceRoads, AREA_LEN, x, 0.12, 0));

  // Surface Road Lane Markings
  addEdgeLine(surfaceRoads, -0.15, 0.14, AREA_LEN, YELLOW_MARK_MAT);
  addEdgeLine(surfaceRoads,  0.15, 0.14, AREA_LEN, YELLOW_MARK_MAT);
  addDashes(surfaceRoads, [-ROAD_W / 4, ROAD_W / 4], 0.14, AREA_LEN, 3.5, 4.0);

  // Stop bars and high-visibility zebra crosswalks
  [-11, 11].forEach(z => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W, 0.02, 0.6), WHITE_MARK_MAT);
    b.position.set(0, 0.15, z);
    surfaceRoads.add(b);

    // Crosswalk zebra stripes
    for (let s = 0; s < 6; s++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W * 0.85, 0.02, 0.55), WHITE_MARK_MAT);
      st.position.set(0, 0.15, z + (s - 2.5) * 1.1);
      surfaceRoads.add(st);
    }
  });

  [-11, 11].forEach(x => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, ROAD_W), WHITE_MARK_MAT);
    b.position.set(x, 0.15, 0);
    surfaceRoads.add(b);
  });
  root.add(surfaceRoads);

  // 3. Pier Foundations & Cantilever Hammerhead Bents ───────────────────────────
  // Single central column at x=0 (inside the 2m median), so vehicles at x=±2.0 and ±5.5 never clip.
  // z=0 is omitted entirely so the 4-way ground crossroad is completely open.
  const piersGroup = new THREE.Group();
  const pierZPositions = [-DECK_HALF, -22, 22, DECK_HALF]; // No z=0 — keep crossroad clear

  pierZPositions.forEach(z => {
    // Heavy reinforced foundation plinth / pile cap (narrow, below lane paths)
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.8, 3.6),
      CONCRETE_PIER_MAT
    );
    cap.position.set(0, 0.4, z);
    cap.castShadow = true;
    piersGroup.add(cap);

    // Single heavy central cylindrical pier column in the median (r=1.0m)
    const colH = DECK_Y - 1.2;
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.25, colH, 20),
      CONCRETE_PIER_MAT
    );
    col.position.set(0, colH / 2 + 0.8, z);
    col.castShadow = true;
    col.receiveShadow = true;
    piersGroup.add(col);

    // Crash protective base collar
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.30, 1.45, 1.2, 20),
      CONCRETE_PIER_MAT
    );
    collar.position.set(0, 1.2 / 2 + 0.4, z);
    collar.castShadow = true;
    piersGroup.add(collar);

    // Sculpted cantilever hammerhead crosshead bent – spans full deck width from central column
    const bent = new THREE.Mesh(
      new THREE.BoxGeometry(DECK_W + 0.8, 1.2, 3.2),
      CONCRETE_PIER_MAT
    );
    bent.position.set(0, DECK_Y - 0.6, z);
    bent.castShadow = true;
    piersGroup.add(bent);

    // Neoprene elastomeric bearing pads
    [-5.0, -1.8, 1.8, 5.0].forEach(bx => {
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.16, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
      );
      pad.position.set(bx, DECK_Y - 0.08, z);
      piersGroup.add(pad);
    });
  });
  root.add(piersGroup);

  // 4. Elevated Viaduct Deck with Precast Box-Girder Spine ──────────────────────
  const elevatedDeck = new THREE.Group();
  const deckLen = DECK_HALF * 2;

  // Post-tensioned box girder spine (trapezoidal aesthetic underside)
  const girderSpine = new THREE.Mesh(
    new THREE.BoxGeometry(DECK_W - 2.2, 1.1, deckLen),
    CONCRETE_DECK_MAT
  );
  girderSpine.position.set(0, DECK_Y - 0.55, 0);
  girderSpine.castShadow = true;
  girderSpine.receiveShadow = true;
  elevatedDeck.add(girderSpine);

  // Cantilevered deck overhang slab
  const deckSlab = new THREE.Mesh(
    new THREE.BoxGeometry(DECK_W + 0.6, 0.35, deckLen),
    CONCRETE_DECK_MAT
  );
  deckSlab.position.set(0, DECK_Y + 0.18, 0);
  deckSlab.castShadow = true;
  deckSlab.receiveShadow = true;
  elevatedDeck.add(deckSlab);

  // High-performance asphalt wearing course
  const asphaltDeck = new THREE.Mesh(
    new THREE.BoxGeometry(DECK_W - 0.4, 0.08, deckLen),
    FRESH_ASPHALT_MAT
  );
  asphaltDeck.position.set(0, DECK_Y + 0.39, 0);
  asphaltDeck.receiveShadow = true;
  elevatedDeck.add(asphaltDeck);

  root.add(elevatedDeck);

  // 5. Approach Ramps with Stepped RE Panel Embankments ─────────────────────────
  const approachRampSouth = buildHighFidelityRamp(DECK_W, RAMP_LEN, DECK_Y, -(DECK_HALF + RAMP_LEN / 2), true);
  const approachRampNorth = buildHighFidelityRamp(DECK_W, RAMP_LEN, DECK_Y,  (DECK_HALF + RAMP_LEN / 2), false);
  root.add(approachRampSouth);
  root.add(approachRampNorth);

  // 6. Parapet Crash Barriers with Highway Safety Blue Rails ───────────────────
  const barriersGroup = new THREE.Group();
  [-DECK_W / 2 + 0.28, DECK_W / 2 - 0.28].forEach(x => {
    // New Jersey profile concrete crash parapet
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.50, 1.05, deckLen),
      PARAPET_BARRIER_MAT
    );
    b.position.set(x, DECK_Y + 0.90, 0);
    b.castShadow = true;
    barriersGroup.add(b);

    // Tubular safety guide rail on top (Vibrant Highway Blue)
    const railGeo = new THREE.CylinderGeometry(0.065, 0.065, deckLen, 10);
    railGeo.rotateX(Math.PI / 2);
    const rail = new THREE.Mesh(railGeo, GUIDE_RAIL_MAT);
    rail.position.set(x, DECK_Y + 1.48, 0);
    barriersGroup.add(rail);

    // Reflective guide posts every 10m
    const count = Math.floor(deckLen / 10);
    for (let i = 0; i < count; i++) {
      const pz = -deckLen / 2 + i * 10 + 5;
      const reflector = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.18, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      reflector.position.set(x + (x > 0 ? -0.26 : 0.26), DECK_Y + 1.15, pz);
      barriersGroup.add(reflector);
    }
  });
  root.add(barriersGroup);

  // 7. Central Concrete Median Barrier on Deck ─────────────────────────────────
  const medianGroup = new THREE.Group();
  const med = new THREE.Mesh(
    new THREE.BoxGeometry(0.70, 0.95, deckLen),
    MEDIAN_BARRIER_MAT
  );
  med.position.set(0, DECK_Y + 0.85, 0);
  med.castShadow = true;
  medianGroup.add(med);
  root.add(medianGroup);

  // 8. High-Contrast Thermoplastic Lane Markings on Viaduct Deck ────────────────
  const markingsGroup = new THREE.Group();
  const SY = DECK_Y + 0.44;

  // Solid outer edge lines
  addEdgeLine(markingsGroup, -(DECK_W / 2 - 0.75), SY, deckLen, WHITE_MARK_MAT);
  addEdgeLine(markingsGroup,  (DECK_W / 2 - 0.75), SY, deckLen, WHITE_MARK_MAT);

  // Dashed lane lines (2 lanes in each direction)
  addDashes(markingsGroup, [-3.8, 3.8], SY, deckLen, 4.0, 4.0, WHITE_MARK_MAT);

  // Double yellow median margins
  addEdgeLine(markingsGroup, -0.45, SY, deckLen, YELLOW_MARK_MAT);
  addEdgeLine(markingsGroup,  0.45, SY, deckLen, YELLOW_MARK_MAT);
  root.add(markingsGroup);

  // 9. Elevated Modern Street Lights Along Median Barrier ──────────────────────
  const elevatedLights = new THREE.Group();
  [-30, 0, 30].forEach(z => {
    addModernStreetLight(elevatedLights, 0, DECK_Y + 0.42, z, 5.8, true);
  });
  root.add(elevatedLights);

  // 10. Overhead Steel Truss Portal Sign Gantries ──────────────────────────────
  const overheadGantry = new THREE.Group();
  addOverheadGantry(
    overheadGantry,
    DECK_W - 0.4,
    DECK_Y + 0.45,
    -15,
    'EXPRESS VIADUCT • THROUGH CORRIDOR',
    'CITY CENTER / TECH PARK'
  );
  root.add(overheadGantry);

  // 11. Ground Street Lights Along Service Road Outer Verge ───────────────────
  const groundLights = new THREE.Group();
  [-100, -65, -30, 30, 65, 100].forEach(z => {
    addModernStreetLight(groundLights, -17.3, 0, z, 7.5, false);
    addModernStreetLight(groundLights,  17.3, 0, z, 7.5, false);
  });
  root.add(groundLights);

  // 12. Flanking Architecture & Trees ──────────────────────────────────────────
  const bldgs = new THREE.Group();
  const bd: number[][] = [
    [-34, -100, 16, 14, 22, 0], [-36, -55, 14, 12, 18, 1],
    [-38,   55, 15, 13, 24, 2], [-34,  95, 13, 15, 20, 3],
    [ 34, -100, 15, 13, 20, 1], [ 36, -55, 13, 15, 26, 0],
    [ 38,   55, 16, 12, 18, 4], [ 34,  95, 14, 14, 22, 2],
    [-42,  -18, 12, 11, 14, 3], [ 42,  -18, 12, 11, 16, 0],
    [-40,   18, 14, 12, 18, 1], [ 40,   18, 14, 12, 16, 2],
  ];
  bd.forEach(([x, z, w, d, h, ci]) => addBuilding(bldgs, x, z, w, d, h, ci));
  root.add(bldgs);

  const trees = new THREE.Group();
  [-110, -85, -60, 60, 85, 110].forEach(z => {
    addTree(trees, -19.0, z, 1.1);
    addTree(trees,  19.0, z, 1.1);
  });
  [-65, -35, 35, 65].forEach(x => {
    addTree(trees, x, -(ROAD_W / 2 + 5.5), 1.0);
    addTree(trees, x,  (ROAD_W / 2 + 5.5), 1.0);
  });
  root.add(trees);

  // 13-A. Dedicated 2-Lane Service / Frontage Roads Flanking the Flyover ────────
  // Two parallel ground-level service roads (width 5.5m each) run along the entire
  // corridor, separated from the central elevated ramp corridor by concrete barriers.
  const serviceRoads = new THREE.Group();
  serviceRoads.name = 'flyover-service-roads';
  const SRW = 5.5;                          // 2-lane service road width
  const SRX = 11.15;                         // Centre-line of service road
  const SRY_BASE = 0.08;
  const SRY_ASP  = 0.12;
  const SR_LEN   = AREA_LEN * 0.92;          // 240m continuous service road

  [-SRX, SRX].forEach(sx => {
    // Road aggregate sub-base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(SRW + 0.4, 0.14, SR_LEN),
      ROAD_BASE_MAT
    );
    base.position.set(sx, SRY_BASE, 0);
    base.receiveShadow = true;
    serviceRoads.add(base);

    // Smooth asphalt surface
    const asp = new THREE.Mesh(
      new THREE.BoxGeometry(SRW, 0.08, SR_LEN),
      FRESH_ASPHALT_MAT
    );
    asp.position.set(sx, SRY_ASP, 0);
    asp.receiveShadow = true;
    serviceRoads.add(asp);

    // Yellow dashed lane divider between the 2 service lanes
    const dashCount = Math.floor(SR_LEN / 7);
    for (let i = 0; i < dashCount; i++) {
      const dz = -SR_LEN / 2 + i * 7 + 3;
      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.02, 3.5),
        YELLOW_MARK_MAT
      );
      dash.position.set(sx, SRY_ASP + 0.01, dz);
      serviceRoads.add(dash);
    }

    // Inner concrete barrier wall separating flyover corridor from service road
    const innerBarrier = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.85, SR_LEN),
      PARAPET_BARRIER_MAT
    );
    innerBarrier.position.set(sx + (sx > 0 ? -SRW / 2 - 0.20 : SRW / 2 + 0.20), 0.45, 0);
    innerBarrier.castShadow = true;
    serviceRoads.add(innerBarrier);

    // Outer kerb bordering pedestrian sidewalk
    const kerbOuter = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.18, SR_LEN),
      CURB_MAT
    );
    kerbOuter.position.set(sx + (sx > 0 ? SRW / 2 + 0.12 : -SRW / 2 - 0.12), 0.09, 0);
    serviceRoads.add(kerbOuter);

    // Direction arrows along service road
    for (let az = -SR_LEN / 2 + 35; az < SR_LEN / 2; az += 70) {
      const arrow = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.02, 2.2),
        WHITE_MARK_MAT
      );
      arrow.position.set(sx, SRY_ASP + 0.01, az);
      serviceRoads.add(arrow);
    }
  });
  root.add(serviceRoads);

  // 13. Construction Equipment & Work-Zone Progression Objects ───────────────
  const constructionGroup = new THREE.Group();
  constructionGroup.name = 'flyover-construction-group';

  // Piling Rig group for deep foundation drilling (safely outside all active lanes)
  const pilingRigGroup = new THREE.Group();
  const rig = createPilingRig();
  rig.position.set(-22, 0, -25);
  pilingRigGroup.add(rig);

  // Warning cones & safety barrels around piling rig staging area
  for (let i = 0; i < 8; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 })
    );
    cone.position.set(-22 + Math.cos(i * 0.8) * 3.8, 0.35, -25 + Math.sin(i * 0.8) * 3.8);
    pilingRigGroup.add(cone);
  }
  constructionGroup.add(pilingRigGroup);

  // Crawler Crane positioned on East construction staging pad
  const craneGroup = new THREE.Group();
  const crane = createHeavyCrane();
  crane.position.set(22, 0, 20);
  craneGroup.add(crane);
  constructionGroup.add(craneGroup);

  // Rebar cages standing where the single central pier columns will rise
  const rebarCagesGroup = new THREE.Group();
  [-DECK_HALF, -22, 0, 22, DECK_HALF].forEach(pz => {
    // Single central cage (matches updated pier positions at x=0)
    const cage = createRebarCage(DECK_Y - 1.2, 1.15);
    cage.position.set(0, 0.4, pz);
    rebarCagesGroup.add(cage);
  });
  constructionGroup.add(rebarCagesGroup);

  // Work-zone safety barricades positioned on protective divider curb
  [-95, -70, -45, 45, 70, 95].forEach(bz => {
    const barL = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.9, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })
    );
    barL.position.set(-8.2, 0.45, bz);
    constructionGroup.add(barL);

    const barR = barL.clone();
    barR.position.set(8.2, 0.45, bz);
    constructionGroup.add(barR);
  });
  root.add(constructionGroup);

  // 14. Vehicles (Dual-Level Traffic: Upper Express Viaduct + Lower Crossroads) ─
  const vehicles = flyoverScenario.vehicles.map(createVehicle);
  vehicles.forEach(v => root.add(v.group));

  return {
    group: root,
    surfaceRoads,
    serviceRoads,
    approachRampSouth,
    approachRampNorth,
    elevatedDeck,
    piersGroup,
    barriersGroup,
    medianGroup,
    markingsGroup,
    elevatedLights,
    overheadGantry,
    constructionGroup,
    pilingRigGroup,
    craneGroup,
    rebarCagesGroup,
    vehicles,
  };
}

/**
 * Builds a high-fidelity monolithic approach ramp with smooth Reinforced Earth (RE)
 * retaining walls, solid bridge abutment, metal expansion joints, and continuous asphalt pavement.
 * Completely eliminates stepped/segmented blocks for a seamless civil engineering finish.
 */
function buildHighFidelityRamp(
  width: number, length: number, deckH: number, cZ: number, ascending: boolean
): THREE.Group {
  const g = new THREE.Group();
  // Pitch angle for the ramp gradient
  const slope = Math.atan2(deckH, length) * (ascending ? -1 : 1);
  const halfH = deckH / 2;

  // 1. Continuous smooth inclined reinforced concrete ramp slab
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.4, 0.42, length),
    CONCRETE_DECK_MAT
  );
  slab.rotation.x = slope;
  slab.position.set(0, halfH + 0.20, cZ);
  slab.castShadow = true;
  slab.receiveShadow = true;
  g.add(slab);

  // 2. High-performance asphalt travelway on ramp
  const asp = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.4, 0.08, length),
    FRESH_ASPHALT_MAT
  );
  asp.rotation.x = slope;
  asp.position.set(0, halfH + 0.44, cZ);
  asp.receiveShadow = true;
  g.add(asp);

  // 3. Monolithic Smooth RE (Reinforced Earth) Retaining Side Walls (NO JAGGED STEPS)
  // Constructs seamless right-triangular solid prisms for both flank retaining walls
  const wallShape = new THREE.Shape();
  if (ascending) {
    // Rises from ground (z = -length/2, y = 0) to deck abutment (z = +length/2, y = deckH)
    wallShape.moveTo(-length / 2, 0);
    wallShape.lineTo(length / 2, 0);
    wallShape.lineTo(length / 2, deckH);
    wallShape.lineTo(-length / 2, 0);
  } else {
    // Descends from deck abutment (z = -length/2, y = deckH) to ground (z = +length/2, y = 0)
    wallShape.moveTo(-length / 2, 0);
    wallShape.lineTo(length / 2, 0);
    wallShape.lineTo(-length / 2, deckH);
    wallShape.lineTo(-length / 2, 0);
  }

  const wallThick = 0.65;
  const wallGeo = new THREE.ExtrudeGeometry(wallShape, {
    depth: wallThick,
    bevelEnabled: false,
  });
  // Rotate so 2D (z, y) extrudes along local X axis
  wallGeo.rotateY(Math.PI / 2);

  // Left continuous retaining wall
  const leftWall = new THREE.Mesh(wallGeo, RE_WALL_MAT);
  leftWall.position.set(-width / 2 - wallThick / 2, 0, cZ);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  g.add(leftWall);

  // Right continuous retaining wall
  const rightWall = new THREE.Mesh(wallGeo.clone(), RE_WALL_MAT);
  rightWall.position.set(width / 2 - wallThick / 2, 0, cZ);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  g.add(rightWall);

  // NOTE: No solid core fill spanning the full width is added here –
  // the visual earth embankment is implied by the flanking retaining walls
  // so vehicles can pass through the ramp corridor without geometry clipping.

  // Architectural coping trim along retaining wall top edges
  const copingGeo = new THREE.BoxGeometry(0.35, 0.22, length);
  [-width / 2 - 0.15, width / 2 + 0.15].forEach(x => {
    const coping = new THREE.Mesh(copingGeo, CURB_MAT);
    coping.rotation.x = slope;
    coping.position.set(x, halfH + 0.50, cZ);
    coping.castShadow = true;
    g.add(coping);
  });

  // Architectural horizontal reveal lines on RE wall panels (modern precast aesthetic)
  const panelJointLevels = [1.2, 2.4, 3.6, 4.8, 6.0];
  panelJointLevels.forEach(lvl => {
    if (lvl < deckH - 0.5) {
      const panelLen = length * (1 - lvl / deckH);
      const panelOffset = (ascending ? (length - panelLen) / 2 : -(length - panelLen) / 2);
      [-width / 2 - 0.35, width / 2 + 0.35].forEach(x => {
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.05, panelLen),
          CONCRETE_DECK_MAT
        );
        line.position.set(x, lvl, cZ + panelOffset);
        g.add(line);
      });
    }
  });

  // 4. Open abutment seat at the high end – thin back-wall + side wingwalls ONLY.
  // The full-height wall that previously blocked the roadway is removed so vehicles pass freely.
  const abutZ = cZ + (ascending ? length / 2 : -length / 2);

  // Thin back-wall sits behind the deck edge (not in the lane corridor)
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(width + 1.8, deckH * 0.55, 0.65),
    CONCRETE_PIER_MAT
  );
  backWall.position.set(0, deckH * 0.275, abutZ + (ascending ? 1.0 : -1.0));
  backWall.castShadow = true;
  g.add(backWall);

  // Side wingwalls – placed only at lateral flanks, NOT spanning the lane openings
  [-width / 2 - 0.9, width / 2 + 0.9].forEach(wx => {
    const wingH = deckH * 0.65;
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, wingH, 2.8),
      CONCRETE_PIER_MAT
    );
    wing.position.set(wx, wingH / 2, abutZ + (ascending ? 0.5 : -0.5));
    wing.castShadow = true;
    g.add(wing);
  });

  // Metallic tooth expansion joint assembly at deck transition
  const expJoint = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.2, 0.08, 0.7),
    STEEL_STRUCTURE_MAT
  );
  expJoint.position.set(0, deckH + 0.44, abutZ);
  g.add(expJoint);

  // 5. Parapet crash barriers following slope with safety guide rails
  [-width / 2 + 0.28, width / 2 - 0.28].forEach(x => {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.95, length),
      PARAPET_BARRIER_MAT
    );
    b.rotation.x = slope;
    b.position.set(x, halfH + 0.70, cZ);
    b.castShadow = true;
    g.add(b);

    const railGeo = new THREE.CylinderGeometry(0.065, 0.065, length, 8);
    railGeo.rotateX(Math.PI / 2);
    const rail = new THREE.Mesh(railGeo, GUIDE_RAIL_MAT);
    rail.rotation.x = slope;
    rail.position.set(x, halfH + 1.25, cZ);
    g.add(rail);
  });

  // 6. Crash impact attenuator cushion at ground bifurcation nose
  const noseZ = cZ + (ascending ? -length / 2 - 1.2 : length / 2 + 1.2);
  [-width / 2 + 0.28, width / 2 - 0.28].forEach(x => {
    const cushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.40, 1.1, 10),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
    );
    cushion.position.set(x, 0.55, noseZ);
    cushion.castShadow = true;
    g.add(cushion);
  });

  // 7. High-contrast ramp lane markings
  for (let i = 0; i < 8; i++) {
    const frac = (i + 0.5) / 8;
    const mz = cZ + (frac - 0.5) * length;
    [-3.8, 3.8].forEach(x => {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.02, 3.5), WHITE_MARK_MAT);
      d.rotation.x = slope;
      d.position.set(x, halfH + 0.48, mz);
      g.add(d);
    });
  }

  return g;
}

// =============================================================================
// RING ROAD  –  High-Capacity Orbital Expressway & Circulating Roundabout
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
  overheadGantry: THREE.Group;
  vehicles: VehicleInstance[];
}

export function buildRingRoad3D(): RingRoadSceneElements {
  const root = new THREE.Group();
  root.name = 'ring-road-root';

  const R         = 75.0;  // Continuous 360° orbital ring radius
  const CARR_W    = 7.5;   // 2 express lanes (3.75m each)
  const MEDIAN_W  = 3.0;   // Raised central landscaped median
  const SHLDR_W   = 2.0;   // Hard paved shoulder
  const RI        = R - MEDIAN_W / 2 - CARR_W - SHLDR_W; // 62.0m inner edge
  const RO        = R + MEDIAN_W / 2 + CARR_W + SHLDR_W; // 88.0m outer edge
  const SEGS      = 160;   // Smooth circular segments

  // 1. Terrain & Metropolitan Canvas ──────────────────────────────────────────
  const ter = new THREE.Group();
  const gnd = new THREE.Mesh(
    new THREE.PlaneGeometry(380, 380),
    GRASS_MAT
  );
  gnd.rotation.x = -Math.PI / 2;
  gnd.position.y = -0.01; // Below road layers
  gnd.receiveShadow = true;
  ter.add(gnd);

  // Urban interior core inside the orbital ring
  const innerUrbanCore = new THREE.Mesh(
    new THREE.CircleGeometry(RI - 2.0, 96),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.82 })
  );
  innerUrbanCore.rotation.x = -Math.PI / 2;
  innerUrbanCore.position.y = 0.002;
  innerUrbanCore.receiveShadow = true;
  ter.add(innerUrbanCore);
  root.add(ter);

  // 2. Full 360° Orbital Expressway Pavement Layers ───────────────────────────
  const orbitalRingPavement = new THREE.Group();

  function addConcentricRing(
    rIn: number, rOut: number,
    y: number,
    mat: THREE.Material
  ) {
    const geo = new THREE.RingGeometry(rIn, rOut, SEGS);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.receiveShadow = true;
    orbitalRingPavement.add(m);
    return m;
  }

  // Foundation sub-base
  addConcentricRing(RI - 0.5, RO + 0.5, 0.04, ROAD_BASE_MAT);

  // Inner hard shoulder
  addConcentricRing(RI, RI + SHLDR_W, 0.08, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }));

  // Inner carriageway (counter-clockwise 2 lanes)
  addConcentricRing(RI + SHLDR_W, R - MEDIAN_W / 2, 0.12, FRESH_ASPHALT_MAT);

  // Outer carriageway (clockwise 2 lanes)
  addConcentricRing(R + MEDIAN_W / 2, RO - SHLDR_W, 0.12, FRESH_ASPHALT_MAT);

  // Outer hard shoulder
  addConcentricRing(RO - SHLDR_W, RO, 0.08, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }));

  // Vertical stone curb walls along inner and outer perimeter
  [RI, RO].forEach(kr => {
    const curbGeo = new THREE.CylinderGeometry(kr, kr, 0.22, SEGS, 1, true);
    const curb = new THREE.Mesh(curbGeo, CURB_MAT);
    curb.position.y = 0.11;
    curb.castShadow = true;
    orbitalRingPavement.add(curb);
  });

  // Solid white shoulder edge lines (full 360° rings)
  const MY = 0.13;
  [RI + SHLDR_W + 0.12, RO - SHLDR_W - 0.12].forEach(re => {
    const edgeGeo = new THREE.RingGeometry(re - 0.10, re + 0.10, SEGS);
    edgeGeo.rotateX(-Math.PI / 2);
    const edge = new THREE.Mesh(edgeGeo, WHITE_MARK_MAT);
    edge.position.y = MY;
    orbitalRingPavement.add(edge);
  });

  // Solid yellow median edge lines (full 360° rings)
  [R - MEDIAN_W / 2 - 0.12, R + MEDIAN_W / 2 + 0.12].forEach(ym => {
    const ymGeo = new THREE.RingGeometry(ym - 0.10, ym + 0.10, SEGS);
    ymGeo.rotateX(-Math.PI / 2);
    const yellow = new THREE.Mesh(ymGeo, YELLOW_MARK_MAT);
    yellow.position.y = MY;
    orbitalRingPavement.add(yellow);
  });

  // Emissive dashed lane dividers around the full 360° loop
  const DASH_COUNT = 72;
  const innerLaneDividerR = (RI + SHLDR_W + (R - MEDIAN_W / 2)) / 2; // 67.75m
  const outerLaneDividerR = (R + MEDIAN_W / 2 + (RO - SHLDR_W)) / 2; // 82.25m

  [innerLaneDividerR, outerLaneDividerR].forEach(dividerR => {
    for (let i = 0; i < DASH_COUNT; i++) {
      const a = (i / DASH_COUNT) * Math.PI * 2;
      const d = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, 0.02, 3.5),
        WHITE_MARK_MAT
      );
      d.position.set(Math.cos(a) * dividerR, MY + 0.01, Math.sin(a) * dividerR);
      d.rotation.y = -a;
      orbitalRingPavement.add(d);
    }
  });

  root.add(orbitalRingPavement);

  // 3. Central Raised Landscaped Median with Continuous Jersey Barriers ────────
  const orbitalMedian = new THREE.Group();

  // Raised stone median plinth
  const medBaseGeo = new THREE.RingGeometry(R - MEDIAN_W / 2, R + MEDIAN_W / 2, SEGS);
  medBaseGeo.rotateX(-Math.PI / 2);
  const medBase = new THREE.Mesh(medBaseGeo, CURB_MAT);
  medBase.position.y = 0.16;
  orbitalMedian.add(medBase);

  // Green planter strip with hedge shrubs
  const medTurfGeo = new THREE.RingGeometry(R - MEDIAN_W / 2 + 0.35, R + MEDIAN_W / 2 - 0.35, SEGS);
  medTurfGeo.rotateX(-Math.PI / 2);
  const medTurf = new THREE.Mesh(medTurfGeo, new THREE.MeshStandardMaterial({ color: 0x3e7b2a, roughness: 0.85 }));
  medTurf.position.y = 0.22;
  orbitalMedian.add(medTurf);

  // Modular New Jersey crash barrier blocks placed radially around R=75m
  const BARRIER_COUNT = 56;
  for (let i = 0; i < BARRIER_COUNT; i++) {
    const a = (i / BARRIER_COUNT) * Math.PI * 2;
    const arcLen = (Math.PI * 2 * R) / BARRIER_COUNT;
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.85, arcLen * 0.95),
      MEDIAN_BARRIER_MAT
    );
    b.position.set(Math.cos(a) * R, 0.65, Math.sin(a) * R);
    b.rotation.y = -a;
    b.castShadow = true;
    orbitalMedian.add(b);
  }
  root.add(orbitalMedian);

  // 4. Outer W-Beam Guardrails with Galvanized Safety Rails ────────────────────
  const orbitalBarriers = new THREE.Group();
  const POST_COUNT = 64;
  for (let i = 0; i < POST_COUNT; i++) {
    const a = (i / POST_COUNT) * Math.PI * 2;
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.95, 8);
    const post = new THREE.Mesh(postGeo, STEEL_STRUCTURE_MAT);
    post.position.set(Math.cos(a) * (RO - 0.15), 0.58, Math.sin(a) * (RO - 0.15));
    post.castShadow = true;
    orbitalBarriers.add(post);

    const arcLen = (Math.PI * 2 * (RO - 0.15)) / POST_COUNT;
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.20, arcLen * 1.05),
      GUIDE_RAIL_MAT
    );
    rail.position.set(Math.cos(a) * (RO - 0.15), 0.78, Math.sin(a) * (RO - 0.15));
    rail.rotation.y = -a;
    orbitalBarriers.add(rail);
  }
  root.add(orbitalBarriers);

  // 5. 4 Cardinal Interchange Roundabouts (North, East, South, West) ───────────
  const roundabouts = new THREE.Group();
  const cardinalAngles = [
    0,               // East  (+X)
    Math.PI / 2,     // North (+Z)
    Math.PI,         // West  (-X)
    Math.PI * 1.5,   // South (-Z)
  ];

  cardinalAngles.forEach(ang => {
    const cx = Math.cos(ang) * R;
    const cz = Math.sin(ang) * R;

    // Multi-lane circulating carriageway ring
    const cg = new THREE.RingGeometry(11, 23, 48);
    cg.rotateX(-Math.PI / 2);
    const circ = new THREE.Mesh(cg, FRESH_ASPHALT_MAT);
    circ.position.set(cx, 0.14, cz);
    circ.receiveShadow = true;
    roundabouts.add(circ);

    // Stone curb surrounding central island
    const curbG = new THREE.RingGeometry(10.2, 11.0, 48);
    curbG.rotateX(-Math.PI / 2);
    const curbM = new THREE.Mesh(curbG, CURB_MAT);
    curbM.position.set(cx, 0.24, cz);
    roundabouts.add(curbM);

    // Central landscaped island
    const ig = new THREE.CylinderGeometry(10.2, 10.5, 0.45, 48);
    const isl = new THREE.Mesh(ig, new THREE.MeshStandardMaterial({ color: 0x3e7b2a, roughness: 0.85 }));
    isl.position.set(cx, 0.35, cz);
    isl.castShadow = true;
    roundabouts.add(isl);

    // Illuminated Civic Spire Monument
    const spireG = new THREE.CylinderGeometry(0.25, 1.3, 14, 12);
    const spireM = new THREE.Mesh(spireG, new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.8 }));
    spireM.position.set(cx, 7.35, cz);
    spireM.castShadow = true;
    roundabouts.add(spireM);

    // Cascading circular water fountain
    const fountainG = new THREE.RingGeometry(1.8, 4.5, 32);
    fountainG.rotateX(-Math.PI / 2);
    const fountainM = new THREE.Mesh(fountainG, FOUNTAIN_WATER_MAT);
    fountainM.position.set(cx, 0.62, cz);
    roundabouts.add(fountainM);

    // Circulating dashed lane markings
    for (let i = 0; i < 24; i++) {
      const a2 = (i / 24) * Math.PI * 2;
      const mk = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.02, 2.6), WHITE_MARK_MAT);
      mk.position.set(cx + Math.cos(a2) * 17, 0.16, cz + Math.sin(a2) * 17);
      mk.rotation.y = -Math.atan2(Math.cos(a2), Math.sin(a2));
      roundabouts.add(mk);
    }

    // Island ornamental trees
    for (let i = 0; i < 6; i++) {
      const ta = (i / 6) * Math.PI * 2;
      addTree(roundabouts, cx + Math.cos(ta) * 7.5, cz + Math.sin(ta) * 7.5, 0.85);
    }
  });
  root.add(roundabouts);

  // 6. 4 Radial Feeder Highways Linking Downtown to Ring Road ─────────────────
  const radialRoads = new THREE.Group();
  cardinalAngles.forEach(ang => {
    // Length from inner city core to roundabout
    const startR = 18;
    const endR   = R - 23;
    const length = endR - startR; // ~34m
    const midR   = (startR + endR) / 2;
    const midX   = Math.cos(ang) * midR;
    const midZ   = Math.sin(ang) * midR;
    const rY     = -ang + Math.PI / 2;

    addRoadSeg(radialRoads, 13.0, 0.08, length, midX, 0.04, midZ, rY, ROAD_BASE_MAT);
    addRoadSeg(radialRoads, 11.5, 0.08, length, midX, 0.12, midZ, rY, FRESH_ASPHALT_MAT);

    // Stone curbs
    [-5.8, 5.8].forEach(kx => {
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, length), CURB_MAT);
      k.position.set(midX + kx * Math.cos(rY), 0.20, midZ + kx * Math.sin(rY));
      k.rotation.y = rY;
      radialRoads.add(k);
    });

    // Dashed center divider
    const count = 6;
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const curR = startR + t * length;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.02, 3.2), WHITE_MARK_MAT);
      m.position.set(Math.cos(ang) * curR, 0.14, Math.sin(ang) * curR);
      m.rotation.y = rY;
      radialRoads.add(m);
    }
  });
  root.add(radialRoads);

  // 7. Central Metropolitan Skyscraper Core & Outer Corporate Towers ───────────
  const buildings = new THREE.Group();
  // Central Downtown Skyline (inside ring)
  const downtown: number[][] = [
    [  0,   0, 18, 18, 38, 0], // Center Iconic Tower
    [-18,  14, 14, 14, 26, 1], [ 18,  14, 15, 13, 30, 2],
    [-18, -14, 13, 15, 24, 3], [ 18, -14, 14, 14, 28, 4],
    [  0,  28, 16, 12, 22, 1], [  0, -28, 15, 13, 20, 2],
    [-28,   0, 12, 16, 25, 3], [ 28,   0, 13, 15, 27, 0],
  ];
  downtown.forEach(([x, z, w, d, h, ci]) => addBuilding(buildings, x, z, w, d, h, ci));

  // Outer Peripheral Tech Parks (outside ring)
  const outerParks: number[][] = [
    [-98, -45, 22, 18, 14, 1], [ 98, -45, 24, 16, 15, 2],
    [-98,  45, 20, 18, 16, 3], [ 98,  45, 22, 16, 14, 0],
    [-45, -98, 20, 20, 15, 4], [ 45, -98, 22, 18, 13, 1],
    [-45,  98, 18, 22, 14, 2], [ 45,  98, 20, 20, 16, 3],
  ];
  outerParks.forEach(([x, z, w, d, h, ci]) => addBuilding(buildings, x, z, w, d, h, ci));
  root.add(buildings);

  // 8. Landscaping Trees ──────────────────────────────────────────────────────
  const trees = new THREE.Group();
  // Trees along outer ring perimeter
  const tN = 36;
  for (let i = 0; i < tN; i++) {
    const a = (i / tN) * Math.PI * 2;
    addTree(trees, Math.cos(a) * (RO + 4.5), Math.sin(a) * (RO + 4.5), 1.1 + (i % 3) * 0.15);
    addTree(trees, Math.cos(a) * (RI - 4.5), Math.sin(a) * (RI - 4.5), 0.95 + (i % 2) * 0.1);
  }
  root.add(trees);

  // 9. Modern High-Mast LED Lighting Along Central Median ─────────────────────
  const lights = new THREE.Group();
  const LIGHT_COUNT = 24;
  for (let i = 0; i < LIGHT_COUNT; i++) {
    const a = (i / LIGHT_COUNT) * Math.PI * 2;
    addModernStreetLight(lights, Math.cos(a) * R, 0.22, Math.sin(a) * R, 8.0, true);
  }
  // High-mast towers at the 4 roundabouts
  cardinalAngles.forEach(ang => {
    const hx = Math.cos(ang) * (R + 26);
    const hz = Math.sin(ang) * (R + 26);
    addModernStreetLight(lights, hx, 0, hz, 12.0, false);
  });
  root.add(lights);

  // 10. Overhead Steel Portal Sign Gantries Across Highway ────────────────────
  const overheadGantry = new THREE.Group();
  // 4 Gantries on approaches to the 4 roundabouts
  const gantryAngles = [
    Math.PI * 0.20,
    Math.PI * 0.70,
    Math.PI * 1.20,
    Math.PI * 1.70,
  ];

  gantryAngles.forEach((ga, idx) => {
    const names = [
      ['ORBITAL RING ROAD • EXPRESS', 'EAST ROUNDABOUT / DOWNTOWN'],
      ['NORTH BELTWAY • SPEED 90', 'NORTH ARTERIAL / AIRPORT'],
      ['WEST BYPASS • LOGISTICS', 'WEST COMMERCIAL DISTRICT'],
      ['SOUTH RING • CONGESTION FREE', 'SOUTH EXPRESSWAY / PORT'],
    ][idx];

    const gx = Math.cos(ga) * R;
    const gz = Math.sin(ga) * R;
    const gm = addOverheadGantry(overheadGantry, CARR_W * 2 + MEDIAN_W, 0.14, 0, names[0], names[1]);
    gm.position.set(gx, 0, gz);
    gm.rotation.y = -ga + Math.PI / 2;
  });
  root.add(overheadGantry);

  // 11. Vehicles Cruising Full 360° Continuous Orbits ─────────────────────────
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
    overheadGantry,
    vehicles,
  };
}

// =============================================================================
// COMBINED (3-IN-1)  –  Integrated 4-Lane Expressway, Flyover & Orbital Bypass
// =============================================================================

export interface CombinedSceneElements {
  group: THREE.Group;
  ground4Lane: THREE.Group;
  flyoverViaduct: THREE.Group;
  ringRoadExpressway: THREE.Group;
  interchangeConnectors: THREE.Group;
  buildings: THREE.Group;
  trees: THREE.Group;
  lights: THREE.Group;
  overheadGantries: THREE.Group;
  vehicles: VehicleInstance[];
}

export function buildCombined3D(): CombinedSceneElements {
  const root = new THREE.Group();
  root.name = 'combined-3roads-root';

  const DECK_Y     = 7.0;
  const DECK_HALF  = 45;     // 90m elevated deck span (restored previous flyover)
  const RAMP_LEN   = 55;     // Smooth approach ramps descend from ±45m to ±100m
  const ROAD_W     = 16.0;   // 4-lane corridor travelway
  const CORR_LEN   = 260;    // Full corridor span (restored previous length)
  const RING_R     = 108.0;  // Orbital ring radius — crosses z-axis at ±108m (past ramp end at ±100m so no wall clash)
  const RING_W     = 14.5;   // Orbital carriageway width
  const AREA_SIZE  = 400;  // Enlarged terrain to cover new RING_R=108 + suburban buildings

  // 1. Unified Metropolitan Foundation Terrain ──────────────────────────────────
  const terrain = new THREE.Group();
  const baseGround = new THREE.Mesh(
    new THREE.PlaneGeometry(AREA_SIZE, AREA_SIZE),
    GRASS_MAT
  );
  baseGround.rotation.x = -Math.PI / 2;
  baseGround.position.y = -0.01;
  baseGround.receiveShadow = true;
  terrain.add(baseGround);

  // Urban interior district paving inside ring road
  const districtCore = new THREE.Mesh(
    new THREE.CircleGeometry(RING_R - 12.0, 128),
    new THREE.MeshStandardMaterial({ color: 0x3d4856, roughness: 0.85 })
  );
  districtCore.rotation.x = -Math.PI / 2;
  districtCore.position.y = 0.002;
  districtCore.receiveShadow = true;
  terrain.add(districtCore);
  root.add(terrain);

  // 2. Ground 4-Lane Divided Expressway (Runs along Z axis) ──────────────────────
  const ground4Lane = new THREE.Group();
  ground4Lane.name = 'ground-4lane-expressway';

  // Heavy aggregate sub-base
  addRoadSeg(ground4Lane, ROAD_W + 1.6, 0.10, CORR_LEN, 0, 0.04, 0, 0, ROAD_BASE_MAT);
  // Dense fresh asphalt wearing course
  addRoadSeg(ground4Lane, ROAD_W, 0.08, CORR_LEN, 0, 0.12, 0, 0, FRESH_ASPHALT_MAT);

  // Flanking outer curbs and pedestrian sidewalks
  [-ROAD_W / 2 - 0.2, ROAD_W / 2 + 0.2].forEach(x => {
    addKerb(ground4Lane, CORR_LEN, x, 0.12, 0);
  });

  [-ROAD_W / 2 - 3.2, ROAD_W / 2 + 3.2].forEach(x => {
    const sw = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.16, CORR_LEN),
      new THREE.MeshStandardMaterial({ color: 0xc8c3b7, roughness: 0.65 })
    );
    sw.position.set(x, 0.08, 0);
    sw.receiveShadow = true;
    ground4Lane.add(sw);
  });

  // Central landscaped median (2.5m wide raised planter with curbs)
  const medCurbGeo = new THREE.BoxGeometry(2.5, 0.22, CORR_LEN);
  const medCurb = new THREE.Mesh(medCurbGeo, CURB_MAT);
  medCurb.position.set(0, 0.18, 0);
  medCurb.castShadow = true;
  ground4Lane.add(medCurb);

  const medTurfGeo = new THREE.BoxGeometry(2.1, 0.08, CORR_LEN);
  const medTurf = new THREE.Mesh(medTurfGeo, new THREE.MeshStandardMaterial({ color: 0x3e7b2a, roughness: 0.85 }));
  medTurf.position.set(0, 0.25, 0);
  ground4Lane.add(medTurf);

  // Median shrubbery outside flyover footprint (Math.abs(z) > 100)
  for (let z = -CORR_LEN / 2 + 15; z < CORR_LEN / 2 - 15; z += 18) {
    if (Math.abs(z) > 100) { // Outside flyover footprint
      const shrub = new THREE.Mesh(
        new THREE.SphereGeometry(0.75, 7, 5),
        new THREE.MeshStandardMaterial({ color: 0x2d6a20, roughness: 0.8 })
      );
      shrub.position.set(0, 0.85, z);
      shrub.castShadow = true;
      ground4Lane.add(shrub);
    }
  }

  // 4-Lane Lane Markings (2 Northbound, 2 Southbound)
  const MY = 0.14;
  addEdgeLine(ground4Lane, -ROAD_W / 2 + 0.5, MY, CORR_LEN, WHITE_MARK_MAT);
  addEdgeLine(ground4Lane,  ROAD_W / 2 - 0.5, MY, CORR_LEN, WHITE_MARK_MAT);
  addEdgeLine(ground4Lane, -1.35, MY, CORR_LEN, YELLOW_MARK_MAT);
  addEdgeLine(ground4Lane,  1.35, MY, CORR_LEN, YELLOW_MARK_MAT);
  addDashes(ground4Lane, [-5.2, 5.2], MY, CORR_LEN, 4.0, 4.0);

  // Surface Crossroad Arterial passing underneath junction at z=0
  const CROSS_W = 15.0;
  addRoadSeg(ground4Lane, 240, 0.10, CROSS_W + 1.2, 0, 0.04, 0, 0, ROAD_BASE_MAT);
  addRoadSeg(ground4Lane, 240, 0.08, CROSS_W,       0, 0.12, 0, 0, FRESH_ASPHALT_MAT);

  // Intersection pedestrian zebra crosswalks
  [-11, 11].forEach(cz => {
    for (let s = 0; s < 6; s++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W * 0.85, 0.02, 0.55), WHITE_MARK_MAT);
      st.position.set(0, 0.15, cz + (s - 2.5) * 1.1);
      ground4Lane.add(st);
    }
  });
  root.add(ground4Lane);

  // 3. Grade-Separated Elevated Flyover Viaduct ─────────────────────────────────
  const flyoverViaduct = new THREE.Group();
  flyoverViaduct.name = 'flyover-elevated-viaduct';
  const DECK_W = 15.0;
  const deckLen = DECK_HALF * 2;

  // Single central pier columns (x=0, inside median) – no twin columns straddling lanes.
  // z=0 is omitted so the 4-way ground crossroad is completely clear.
  const pierZPositions = [-DECK_HALF, -22, 22, DECK_HALF];
  pierZPositions.forEach(pz => {
    // Narrow plinth pile cap under central column
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.8, 3.6),
      CONCRETE_PIER_MAT
    );
    cap.position.set(0, 0.4, pz);
    cap.castShadow = true;
    flyoverViaduct.add(cap);

    // Single heavy central column (r=1.0m) – vehicle lanes at ±2.0 & ±5.5 have >1m clearance
    const colH = DECK_Y - 1.2;
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.25, colH, 20),
      CONCRETE_PIER_MAT
    );
    col.position.set(0, colH / 2 + 0.8, pz);
    col.castShadow = true;
    flyoverViaduct.add(col);

    // Seismic base collar
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.30, 1.45, 1.2, 20),
      CONCRETE_PIER_MAT
    );
    collar.position.set(0, 1.0, pz);
    flyoverViaduct.add(collar);

    // Sculpted cantilever hammerhead crosshead cap
    const bent = new THREE.Mesh(
      new THREE.BoxGeometry(DECK_W + 0.8, 1.2, 3.2),
      CONCRETE_PIER_MAT
    );
    bent.position.set(0, DECK_Y - 0.6, pz);
    bent.castShadow = true;
    flyoverViaduct.add(bent);

    // Elastomeric bearing pads
    [-5.0, -1.8, 1.8, 5.0].forEach(bx => {
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.16, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
      );
      pad.position.set(bx, DECK_Y - 0.08, pz);
      flyoverViaduct.add(pad);
    });
  });

  // Post-tensioned box girder spine
  const girderSpine = new THREE.Mesh(
    new THREE.BoxGeometry(DECK_W - 2.2, 1.1, deckLen),
    CONCRETE_DECK_MAT
  );
  girderSpine.position.set(0, DECK_Y - 0.55, 0);
  girderSpine.castShadow = true;
  flyoverViaduct.add(girderSpine);

  // Cantilevered deck overhang slab
  const deckSlab = new THREE.Mesh(
    new THREE.BoxGeometry(DECK_W + 0.6, 0.35, deckLen),
    CONCRETE_DECK_MAT
  );
  deckSlab.position.set(0, DECK_Y + 0.18, 0);
  deckSlab.castShadow = true;
  flyoverViaduct.add(deckSlab);

  // High-performance asphalt wearing course
  const aspDeck = new THREE.Mesh(
    new THREE.BoxGeometry(DECK_W - 0.4, 0.08, deckLen),
    FRESH_ASPHALT_MAT
  );
  aspDeck.position.set(0, DECK_Y + 0.39, 0);
  aspDeck.receiveShadow = true;
  flyoverViaduct.add(aspDeck);

  // Smooth Monolithic Approach Ramps (North & South) - ZERO STEPS
  const rampSouth = buildHighFidelityRamp(DECK_W, RAMP_LEN, DECK_Y, -(DECK_HALF + RAMP_LEN / 2), true);
  const rampNorth = buildHighFidelityRamp(DECK_W, RAMP_LEN, DECK_Y,  (DECK_HALF + RAMP_LEN / 2), false);
  flyoverViaduct.add(rampSouth);
  flyoverViaduct.add(rampNorth);

  // New Jersey Parapet Crash Barriers with Highway Blue Guide Rails
  [-DECK_W / 2 + 0.28, DECK_W / 2 - 0.28].forEach(x => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.50, 1.05, deckLen), PARAPET_BARRIER_MAT);
    b.position.set(x, DECK_Y + 0.90, 0);
    b.castShadow = true;
    flyoverViaduct.add(b);

    const railGeo = new THREE.CylinderGeometry(0.065, 0.065, deckLen, 10);
    railGeo.rotateX(Math.PI / 2);
    const rail = new THREE.Mesh(railGeo, GUIDE_RAIL_MAT);
    rail.position.set(x, DECK_Y + 1.48, 0);
    flyoverViaduct.add(rail);
  });

  // Median concrete barrier on deck
  const medFly = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.95, deckLen), MEDIAN_BARRIER_MAT);
  medFly.position.set(0, DECK_Y + 0.85, 0);
  medFly.castShadow = true;
  flyoverViaduct.add(medFly);

  // Viaduct deck thermoplastic markings
  const FY = DECK_Y + 0.44;
  addEdgeLine(flyoverViaduct, -(DECK_W / 2 - 0.75), FY, deckLen, WHITE_MARK_MAT);
  addEdgeLine(flyoverViaduct,  (DECK_W / 2 - 0.75), FY, deckLen, WHITE_MARK_MAT);
  addEdgeLine(flyoverViaduct, -0.45, FY, deckLen, YELLOW_MARK_MAT);
  addEdgeLine(flyoverViaduct,  0.45, FY, deckLen, YELLOW_MARK_MAT);
  addDashes(flyoverViaduct, [-3.8, 3.8], FY, deckLen, 4.0, 4.0);

  // Elevated LED street lighting along flyover median
  [-30, 0, 30].forEach(z => {
    addModernStreetLight(flyoverViaduct, 0, DECK_Y + 0.42, z, 5.8, true);
  });

  // Overhead portal gantry
  addOverheadGantry(flyoverViaduct, DECK_W - 0.4, DECK_Y + 0.45, -15, 'EXPRESS VIADUCT • THROUGH CORRIDOR', 'CITY AIRPORT / HIGHWAY 44');
  root.add(flyoverViaduct);

  // 4. Sweeping Outer Orbital Ring Road Expressway (Full 360° Beltway) ───────────
  const ringRoadExpressway = new THREE.Group();
  ringRoadExpressway.name = 'orbital-ring-road-bypass';
  const SEGS = 160;
  const HALF_W = RING_W / 2;

  // Circular pavement ring
  const ringPavementGeo = new THREE.RingGeometry(RING_R - HALF_W, RING_R + HALF_W, SEGS);
  ringPavementGeo.rotateX(-Math.PI / 2);
  const ringPavement = new THREE.Mesh(ringPavementGeo, FRESH_ASPHALT_MAT);
  ringPavement.position.y = 0.12;
  ringPavement.receiveShadow = true;
  ringRoadExpressway.add(ringPavement);

  // Central orbital median barrier plinth & New Jersey dividers
  const ringMedGeo = new THREE.RingGeometry(RING_R - 1.2, RING_R + 1.2, SEGS);
  ringMedGeo.rotateX(-Math.PI / 2);
  const ringMed = new THREE.Mesh(ringMedGeo, CURB_MAT);
  ringMed.position.y = 0.18;
  ringRoadExpressway.add(ringMed);

  // Outer safety guardrails along ring perimeter (clear of road crossings)
  const BARRIER_POSTS = 52;
  for (let i = 0; i < BARRIER_POSTS; i++) {
    const a = (i / BARRIER_POSTS) * Math.PI * 2;
    const postX = Math.cos(a) * (RING_R + HALF_W - 0.2);
    const postZ = Math.sin(a) * (RING_R + HALF_W - 0.2);

    // Omit guardrails near ground road crossing at z=±108 and x=±82 (ring-corridor intersections)
    if (Math.abs(postX) < 18.0 && (Math.abs(postZ - 108.0) < 18.0 || Math.abs(postZ + 108.0) < 18.0)) {
      continue;
    }
    // Also omit near east/west crossings at x=±108, z≈0
    if (Math.abs(postZ) < 18.0 && (Math.abs(postX - 108.0) < 18.0 || Math.abs(postX + 108.0) < 18.0)) {
      continue;
    }

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.95, 8), STEEL_STRUCTURE_MAT);
    post.position.set(postX, 0.6, postZ);
    ringRoadExpressway.add(post);

    const railW = (Math.PI * 2 * (RING_R + HALF_W)) / BARRIER_POSTS;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, railW * 1.05), GUIDE_RAIL_MAT);
    rail.position.set(postX, 0.8, postZ);
    rail.rotation.y = -a;
    ringRoadExpressway.add(rail);
  }

  // Orbital dashed lane markings
  const innerLaneR = RING_R - HALF_W / 2;
  const outerLaneR = RING_R + HALF_W / 2;
  const DASH_COUNT = 64;
  [innerLaneR, outerLaneR].forEach(dr => {
    for (let i = 0; i < DASH_COUNT; i++) {
      const a = (i / DASH_COUNT) * Math.PI * 2;
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.02, 3.2), WHITE_MARK_MAT);
      d.position.set(Math.cos(a) * dr, 0.14, Math.sin(a) * dr);
      d.rotation.y = -a;
      ringRoadExpressway.add(d);
    }
  });

  // Orbital modern LED lighting poles (omitting corridor crossing zones)
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const poleX = Math.cos(a) * RING_R;
    const poleZ = Math.sin(a) * RING_R;
    // Skip poles near z-axis crossings (z=±108) and x-axis crossings (x=±108)
    if (Math.abs(poleX) < 14.0 && (Math.abs(poleZ - 108.0) < 18.0 || Math.abs(poleZ + 108.0) < 18.0)) {
      continue;
    }
    if (Math.abs(poleZ) < 14.0 && (Math.abs(poleX - 108.0) < 18.0 || Math.abs(poleX + 108.0) < 18.0)) {
      continue;
    }
    addModernStreetLight(ringRoadExpressway, poleX, 0.22, poleZ, 8.0, true);
  }
  root.add(ringRoadExpressway);

  // 5. Interchange Connectors (Roundabouts & Slip Ramps Linking All 3 Roads) ────
  const interchangeConnectors = new THREE.Group();
  interchangeConnectors.name = 'interchange-roundabouts-connectors';

  // East & West Major Interchange Roundabouts connecting Ring Road & Crossroad
  [-RING_R, RING_R].forEach(rx => {
    // Circulating asphalt apron
    const circGeo = new THREE.RingGeometry(11, 22, 48);
    circGeo.rotateX(-Math.PI / 2);
    const circ = new THREE.Mesh(circGeo, FRESH_ASPHALT_MAT);
    circ.position.set(rx, 0.13, 0);
    circ.receiveShadow = true;
    interchangeConnectors.add(circ);

    // Stone curb island
    const curbGeo = new THREE.RingGeometry(10.2, 11.0, 48);
    curbGeo.rotateX(-Math.PI / 2);
    const curb = new THREE.Mesh(curbGeo, CURB_MAT);
    curb.position.set(rx, 0.22, 0);
    interchangeConnectors.add(curb);

    // Central landscaped park
    const parkGeo = new THREE.CylinderGeometry(10.2, 10.5, 0.45, 48);
    const park = new THREE.Mesh(parkGeo, new THREE.MeshStandardMaterial({ color: 0x3e7b2a, roughness: 0.85 }));
    park.position.set(rx, 0.35, 0);
    interchangeConnectors.add(park);

    // Central illuminated fountain
    const fountainG = new THREE.RingGeometry(1.8, 4.2, 32);
    fountainG.rotateX(-Math.PI / 2);
    const fountain = new THREE.Mesh(fountainG, FOUNTAIN_WATER_MAT);
    fountain.position.set(rx, 0.62, 0);
    interchangeConnectors.add(fountain);

    // High-mast lighting spire
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 1.2, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.8 })
    );
    mast.position.set(rx, 7.35, 0);
    interchangeConnectors.add(mast);
  });

  root.add(interchangeConnectors);

  // 6. Metropolitan Architecture & Skyscrapers ──────────────────────────────────
  const buildings = new THREE.Group();
  buildings.name = 'city-skyline-buildings';
  // Ring road pavement occupies R = 100.75m to 115.25m (RING_R=108, HALF_W=7.25).
  // All buildings must be either inside (R < 95m) or outside (R > 120m) that band.
  const cityBlocks: number[][] = [
    // ── Urban Core District (inside ring, R ≈ 55–85m) ──────────────────────
    [-42, -65, 18, 16, 32, 0], [ 42, -65, 16, 18, 36, 1],
    [-45, -45, 16, 14, 28, 2], [ 45, -45, 15, 16, 34, 3],
    [-45,  45, 17, 15, 30, 4], [ 45,  45, 18, 14, 32, 0],
    [-42,  65, 15, 16, 26, 1], [ 42,  65, 16, 16, 30, 2],
    // Extra mid-ring towers inside the ring road circle
    [-68, -40, 14, 12, 22, 3], [ 68, -40, 12, 14, 24, 4],
    [-68,  40, 13, 12, 20, 0], [ 68,  40, 14, 13, 22, 1],

    // ── Suburban Tech Parks (outside ring, R ≈ 125–145m) ───────────────────
    [-128, -48, 24, 20, 22, 1], [ 128, -48, 22, 22, 24, 2],
    [-128,  48, 22, 20, 20, 3], [ 128,  48, 24, 22, 25, 4],
    [-48, -128, 20, 24, 22, 0], [ 48, -128, 22, 22, 26, 1],
    [-48,  128, 24, 20, 24, 2], [ 48,  128, 20, 24, 22, 3],
    // Corner district towers
    [-105, -105, 18, 18, 18, 2], [ 105, -105, 16, 18, 20, 3],
    [-105,  105, 18, 16, 18, 0], [ 105,  105, 16, 16, 20, 1],
  ];
  cityBlocks.forEach(([x, z, w, d, h, ci]) => addBuilding(buildings, x, z, w, d, h, ci));
  root.add(buildings);

  // 7. Lush Urban Trees & Green Belts ──────────────────────────────────────────
  const trees = new THREE.Group();
  // Flanking Ground 4-lane
  [-130, -100, -70, -40, 40, 70, 100, 130].forEach(z => {
    addTree(trees, -(ROAD_W / 2 + 6.0), z, 1.15);
    addTree(trees,  (ROAD_W / 2 + 6.0), z, 1.15);
  });
  // Along Outer Ring Road
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    addTree(trees, Math.cos(a) * (RING_R + 11.0), Math.sin(a) * (RING_R + 11.0), 1.1);
  }
  root.add(trees);

  // 8. Overhead Portal Destination Sign Gantries ────────────────────────────────
  const overheadGantries = new THREE.Group();
  addOverheadGantry(
    overheadGantries,
    ROAD_W + 1.0,
    0.16,
    -120,
    'EXPRESS ARTERIAL • METRO CORRIDOR',
    'FLYOVER VIADUCT • ORBITAL BYPASS'
  );
  addOverheadGantry(
    overheadGantries,
    ROAD_W + 1.0,
    0.16,
    120,
    'EXPRESS ARTERIAL • METRO CORRIDOR',
    'CENTRAL BUSINESS DISTRICT • TECH PARK'
  );
  root.add(overheadGantries);

  // 9. Modern LED Street Lights ────────────────────────────────────────────────
  const lights = new THREE.Group();
  [-140, -110, 110, 140].forEach(z => {
    addModernStreetLight(lights, 0, 0.25, z, 7.5, true);
  });
  root.add(lights);

  // 10. Coordinated Multi-Tier Vehicle Fleet ───────────────────────────────────
  const vehicles = combinedScenario.vehicles.map(createVehicle);
  vehicles.forEach(v => root.add(v.group));

  return {
    group: root,
    ground4Lane,
    flyoverViaduct,
    ringRoadExpressway,
    interchangeConnectors,
    buildings,
    trees,
    lights,
    overheadGantries,
    vehicles,
  };
}
