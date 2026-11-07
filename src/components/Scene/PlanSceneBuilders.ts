import * as THREE from 'three';
import type { VehicleInstance } from './Vehicles';
import { createVehicle } from './Vehicles';
import { flyoverScenario, ringRoadScenario } from '../../data/planScenarios';

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
function addOverheadGantry(
  parent: THREE.Group,
  width: number,
  yClearance: number,
  z: number,
  title1: string,
  title2: string
) {
  const gantryGroup = new THREE.Group();
  const poleHeight = yClearance + 2.5;

  // Twin support legs
  [-width / 2, width / 2].forEach(x => {
    const legGeo = new THREE.CylinderGeometry(0.22, 0.26, poleHeight, 10);
    const leg = new THREE.Mesh(legGeo, STEEL_STRUCTURE_MAT);
    leg.position.set(x, poleHeight / 2, z);
    leg.castShadow = true;
    gantryGroup.add(leg);
  });

  // Cross truss beams
  const beamGeo = new THREE.BoxGeometry(width + 0.8, 0.35, 0.35);
  const topBeam = new THREE.Mesh(beamGeo, STEEL_STRUCTURE_MAT);
  topBeam.position.set(0, yClearance + 1.8, z);
  gantryGroup.add(topBeam);

  const bottomBeam = new THREE.Mesh(beamGeo, STEEL_STRUCTURE_MAT);
  bottomBeam.position.set(0, yClearance + 0.8, z);
  gantryGroup.add(bottomBeam);

  // Highway destination signage plates
  const signW = Math.min(6.5, width * 0.42);
  [-signW * 0.6, signW * 0.6].forEach((sx, idx) => {
    const signGeo = new THREE.BoxGeometry(signW, 1.3, 0.12);
    const signMesh = new THREE.Mesh(signGeo, SIGN_GREEN_MAT);
    signMesh.position.set(sx, yClearance + 1.3, z + 0.22);
    signMesh.castShadow = true;
    gantryGroup.add(signMesh);

    // Border trim
    const borderGeo = new THREE.BoxGeometry(signW + 0.1, 1.4, 0.08);
    const borderMesh = new THREE.Mesh(borderGeo, WHITE_MARK_MAT);
    borderMesh.position.set(sx, yClearance + 1.3, z + 0.18);
    gantryGroup.add(borderMesh);
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

// =============================================================================
// FLYOVER  –  High-Definition Grade-Separated Elevated Viaduct
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
  overheadGantry: THREE.Group;
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

  // Flanking paved pedestrian sidewalks with textured stone pavers
  [-ROAD_W / 2 - 3.5, ROAD_W / 2 + 3.5].forEach(x => {
    const sw = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 0.15, AREA_LEN),
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
  const piersGroup = new THREE.Group();
  const pierZPositions = [-DECK_HALF, -22, 0, 22, DECK_HALF];

  pierZPositions.forEach(z => {
    // Heavy reinforced foundation plinth / pile cap
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(DECK_W - 1.5, 0.8, 3.6),
      CONCRETE_PIER_MAT
    );
    cap.position.set(0, 0.4, z);
    cap.castShadow = true;
    piersGroup.add(cap);

    // Twin tapered cylindrical pier columns with grooved reveal details
    [-4.2, 4.2].forEach(x => {
      const colH = DECK_Y - 1.2;
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.35, colH, 20),
        CONCRETE_PIER_MAT
      );
      col.position.set(x, colH / 2 + 0.8, z);
      col.castShadow = true;
      col.receiveShadow = true;
      piersGroup.add(col);

      // Crash protective base collar
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(1.45, 1.55, 1.2, 20),
        CONCRETE_PIER_MAT
      );
      collar.position.set(x, 1.2 / 2 + 0.4, z);
      collar.castShadow = true;
      piersGroup.add(collar);
    });

    // Sculpted cantilever hammerhead crosshead bent
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

  // 11. Ground Street Lights ───────────────────────────────────────────────────
  const groundLights = new THREE.Group();
  [-100, -65, -30, 30, 65, 100].forEach(z => {
    addModernStreetLight(groundLights, -(ROAD_W / 2 + 1.8), 0, z, 7.5, false);
    addModernStreetLight(groundLights,  (ROAD_W / 2 + 1.8), 0, z, 7.5, false);
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
    addTree(trees, -(ROAD_W / 2 + 5.5), z, 1.1);
    addTree(trees,  (ROAD_W / 2 + 5.5), z, 1.1);
  });
  [-65, -35, 35, 65].forEach(x => {
    addTree(trees, x, -(ROAD_W / 2 + 5.5), 1.0);
    addTree(trees, x,  (ROAD_W / 2 + 5.5), 1.0);
  });
  root.add(trees);

  // 13. Vehicles (Dual-Level Traffic: Upper Express Viaduct + Lower Crossroads) ─
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
    overheadGantry,
    vehicles,
  };
}

/**
 * Builds a high-fidelity approach ramp with stepped RE (Reinforced Earth) retaining
 * panel walls, solid earth embankments, and crash barriers.
 */
function buildHighFidelityRamp(
  width: number, length: number, deckH: number, cZ: number, ascending: boolean
): THREE.Group {
  const g = new THREE.Group();
  // Negative rotation around X pitches upward as Z increases (for ascending ramp to deck)
  const slope = Math.atan2(deckH, length) * (ascending ? -1 : 1);
  const halfH = deckH / 2;

  // Inclined concrete ramp slab
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.4, 0.40, length),
    CONCRETE_DECK_MAT
  );
  slab.rotation.x = slope;
  slab.position.set(0, halfH + 0.20, cZ);
  slab.castShadow = true;
  g.add(slab);

  // Asphalt travelway on ramp
  const asp = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.4, 0.08, length),
    FRESH_ASPHALT_MAT
  );
  asp.rotation.x = slope;
  asp.position.set(0, halfH + 0.44, cZ);
  g.add(asp);

  // Stepped earth embankment with side RE retaining walls
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const layerH = ascending ? deckH * (i + 1) / steps : deckH * (1 - i / steps);
    if (layerH < 0.2) continue;
    const lz = cZ + ((ascending ? t : 1 - t) - 0.5) * length;
    const sl = length / steps + 0.2;

    // Solid core earth fill
    const fill = new THREE.Mesh(
      new THREE.BoxGeometry(width + 2.0, layerH, sl),
      EARTH_FILL_MAT
    );
    fill.position.set(0, layerH / 2, lz);
    fill.receiveShadow = true;
    g.add(fill);

    // RE panel retaining walls flanking both sides
    [-width / 2 - 0.25, width / 2 + 0.25].forEach(x => {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, layerH, sl),
        RE_WALL_MAT
      );
      panel.position.set(x, layerH / 2, lz);
      panel.castShadow = true;
      g.add(panel);
    });
  }

  // Parapet crash barriers following slope with safety guide rails
  [-width / 2 + 0.28, width / 2 - 0.28].forEach(x => {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.95, length),
      PARAPET_BARRIER_MAT
    );
    b.rotation.x = slope;
    b.position.set(x, halfH + 0.70, cZ);
    b.castShadow = true;
    g.add(b);

    const railGeo = new THREE.CylinderGeometry(0.06, 0.06, length, 8);
    railGeo.rotateX(Math.PI / 2);
    const rail = new THREE.Mesh(railGeo, GUIDE_RAIL_MAT);
    rail.rotation.x = slope;
    rail.position.set(x, halfH + 1.25, cZ);
    g.add(rail);
  });

  // Crash impact attenuator cushion at ground bifurcation nose
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

  // High-contrast ramp lane markings
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
    const gm = addOverheadGantry(overheadGantry, CARR_W * 2 + MEDIAN_W, 1.2, 0, names[0], names[1]);
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
