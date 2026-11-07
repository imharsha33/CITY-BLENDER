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
  const slope = Math.atan2(deckH, length) * (ascending ? 1 : -1);
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

  const R         = 74.0;
  const CARR_W    = 7.5;   // Each carriageway (2 express lanes × 3.75m)
  const MEDIAN_W  = 2.5;   // Raised landscaped median
  const SHLDR_W   = 2.0;   // Hard paved shoulder
  const TOTAL_W   = CARR_W * 2 + MEDIAN_W + SHLDR_W * 2; // ~21.5m total
  const A0        = -Math.PI * 0.95;
  const A1        =  Math.PI * 0.35;
  const ASPAN     = A1 - A0;
  const SEGS      = 80;

  // 1. Terrain & Peripheral Urban Canvas ────────────────────────────────────────
  const ter = new THREE.Group();
  const gnd = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 360),
    GRASS_MAT
  );
  gnd.rotation.x = -Math.PI / 2;
  gnd.receiveShadow = true;
  ter.add(gnd);

  // Urban interior core inside the orbital ring
  const innerUrbanCore = new THREE.Mesh(
    new THREE.CircleGeometry(R - TOTAL_W / 2 - 4, 64),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 })
  );
  innerUrbanCore.rotation.x = -Math.PI / 2;
  innerUrbanCore.position.y = 0.01;
  innerUrbanCore.receiveShadow = true;
  ter.add(innerUrbanCore);
  root.add(ter);

  // 2. Orbital Expressway 3D Roadbed & Pavement Layers ─────────────────────────
  const orbitalRingPavement = new THREE.Group();

  function add3DRingLayer(
    rInner: number, rOuter: number,
    yBottom: number, height: number,
    mat: THREE.Material
  ) {
    const ringShape = new THREE.Shape();
    ringShape.absarc(0, 0, rOuter, A0, A1, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, rInner, A0, A1, true);
    ringShape.holes.push(holePath);

    const geo = new THREE.ExtrudeGeometry(ringShape, {
      depth: height,
      bevelEnabled: false,
      curveSegments: SEGS,
    });
    geo.rotateX(-Math.PI / 2);

    const m = new THREE.Mesh(geo, mat);
    m.position.y = yBottom;
    m.receiveShadow = true;
    m.castShadow = true;
    orbitalRingPavement.add(m);
    return m;
  }

  const RI = R - TOTAL_W / 2;
  const RO = R + TOTAL_W / 2;

  // Sub-base gravel foundation (0.10m thickness)
  add3DRingLayer(RI - 0.6, RO + 0.6, 0.02, 0.08, ROAD_BASE_MAT);

  // Inner hard shoulder
  add3DRingLayer(RI, RI + SHLDR_W, 0.08, 0.10, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }));

  // Inner carriageway (anti-clockwise / inbound 2 lanes)
  add3DRingLayer(RI + SHLDR_W, RI + SHLDR_W + CARR_W, 0.08, 0.12, FRESH_ASPHALT_MAT);

  // Outer carriageway (clockwise / outbound 2 lanes)
  add3DRingLayer(RO - SHLDR_W - CARR_W, RO - SHLDR_W, 0.08, 0.12, FRESH_ASPHALT_MAT);

  // Outer hard shoulder
  add3DRingLayer(RO - SHLDR_W, RO, 0.08, 0.10, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }));

  // Raised stone curbs along inner and outer perimeter
  [RI - 0.15, RO + 0.15].forEach(kr => {
    add3DRingLayer(kr - 0.20, kr + 0.20, 0.08, 0.22, CURB_MAT);
  });

  // Emissive Dashed Lane Dividers Along Sweeping Curve
  const MY = 0.22;
  [R - MEDIAN_W / 2 - CARR_W / 2, R + MEDIAN_W / 2 + CARR_W / 2].forEach(rc => {
    const dashCount = 48;
    for (let i = 0; i < dashCount; i++) {
      const a = A0 + (i + 0.5) / dashCount * ASPAN;
      const rY = -Math.atan2(Math.cos(a), Math.sin(a));
      const d = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.02, 3.8),
        WHITE_MARK_MAT
      );
      d.position.set(Math.cos(a) * rc, MY, Math.sin(a) * rc);
      d.rotation.y = rY;
      orbitalRingPavement.add(d);
    }
  });

  // Solid White Shoulder Edge Lines
  [RI + SHLDR_W + 0.2, RO - SHLDR_W - 0.2].forEach(re => {
    const segs = 65;
    for (let i = 0; i < segs; i++) {
      const a = A0 + (i + 0.5) / segs * ASPAN;
      const rY = -Math.atan2(Math.cos(a), Math.sin(a));
      const sl = ASPAN * re / segs + 0.20;
      const e = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, 0.02, sl),
        WHITE_MARK_MAT
      );
      e.position.set(Math.cos(a) * re, MY, Math.sin(a) * re);
      e.rotation.y = rY;
      orbitalRingPavement.add(e);
    }
  });

  root.add(orbitalRingPavement);

  // 3. Central Raised Landscaped Median with Jersey Crash Barriers ─────────────
  const orbitalMedian = new THREE.Group();

  // Raised concrete plinth for median
  const medBase = add3DRingLayer(R - MEDIAN_W / 2, R + MEDIAN_W / 2, 0.10, 0.24, CURB_MAT);
  orbitalMedian.add(medBase);

  // Green landscaped planter turf
  const medTurf = add3DRingLayer(
    R - MEDIAN_W / 2 + 0.35, R + MEDIAN_W / 2 - 0.35,
    0.34, 0.05,
    new THREE.MeshStandardMaterial({ color: 0x3e7b2a, roughness: 0.85 })
  );
  orbitalMedian.add(medTurf);

  // New Jersey profile crash barrier along center-line
  const barrierSegs = 42;
  for (let i = 0; i < barrierSegs; i++) {
    const a = A0 + (i + 0.5) / barrierSegs * ASPAN;
    const rY = -Math.atan2(Math.cos(a), Math.sin(a));
    const sl = ASPAN * R / barrierSegs + 0.15;
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.60, 0.90, sl),
      MEDIAN_BARRIER_MAT
    );
    b.position.set(Math.cos(a) * R, 0.80, Math.sin(a) * R);
    b.rotation.y = rY;
    b.castShadow = true;
    orbitalMedian.add(b);

    // Double yellow edge lines on both sides of median
    [-0.55, 0.55].forEach(mo => {
      const ym = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, sl), YELLOW_MARK_MAT);
      ym.position.set(Math.cos(a) * (R + mo), MY + 0.01, Math.sin(a) * (R + mo));
      ym.rotation.y = rY;
      orbitalMedian.add(ym);
    });
  }
  root.add(orbitalMedian);

  // 4. Outer W-Beam Guardrails with Reflective Delineators ───────────────────────
  const orbitalBarriers = new THREE.Group();
  [RI + 0.15, RO - 0.15].forEach(br => {
    const postCount = 50;
    for (let i = 0; i <= postCount; i++) {
      const a = A0 + (i / postCount) * ASPAN;
      const pg = new THREE.CylinderGeometry(0.08, 0.08, 0.95, 8);
      const post = new THREE.Mesh(pg, STEEL_STRUCTURE_MAT);
      post.position.set(Math.cos(a) * br, 0.58, Math.sin(a) * br);
      post.castShadow = true;
      orbitalBarriers.add(post);
    }
    const railCount = 48;
    for (let i = 0; i < railCount; i++) {
      const a = A0 + (i + 0.5) / railCount * ASPAN;
      const rY = -Math.atan2(Math.cos(a), Math.sin(a));
      const sl = ASPAN * br / railCount + 0.18;
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.22, sl),
        GUIDE_RAIL_MAT
      );
      rail.position.set(Math.cos(a) * br, 0.80, Math.sin(a) * br);
      rail.rotation.y = rY;
      orbitalBarriers.add(rail);
    }
  });
  root.add(orbitalBarriers);

  // 5. High-Capacity Circulating Roundabout Interchanges ────────────────────────
  const roundabouts = new THREE.Group();
  const icA = [A0 + ASPAN * 0.22, A0 + ASPAN * 0.70];

  icA.forEach(ang => {
    const cx = Math.cos(ang) * R, cz = Math.sin(ang) * R;

    // Multi-lane circulating carriageway ring
    const cg = new THREE.RingGeometry(13, 25, 48);
    cg.rotateX(-Math.PI / 2);
    const circ = new THREE.Mesh(cg, FRESH_ASPHALT_MAT);
    circ.position.set(cx, 0.14, cz);
    circ.receiveShadow = true;
    roundabouts.add(circ);

    // Beveled stone curb surrounding island
    const curbG = new THREE.RingGeometry(12.2, 13.0, 48);
    curbG.rotateX(-Math.PI / 2);
    const curbM = new THREE.Mesh(curbG, CURB_MAT);
    curbM.position.set(cx, 0.26, cz);
    roundabouts.add(curbM);

    // Central landscaped island
    const ig = new THREE.CylinderGeometry(12.2, 12.5, 0.55, 48);
    const isl = new THREE.Mesh(ig, new THREE.MeshStandardMaterial({ color: 0x3e7b2a, roughness: 0.85 }));
    isl.position.set(cx, 0.38, cz);
    isl.castShadow = true;
    roundabouts.add(isl);

    // Illuminated Civic Spire Monument in center of roundabout
    const spireG = new THREE.CylinderGeometry(0.2, 1.4, 14, 12);
    const spireM = new THREE.Mesh(spireG, new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.8 }));
    spireM.position.set(cx, 7.5, cz);
    spireM.castShadow = true;
    roundabouts.add(spireM);

    // Cascading water fountain ring at base of spire
    const fountainG = new THREE.RingGeometry(2.0, 5.0, 32);
    fountainG.rotateX(-Math.PI / 2);
    const fountainM = new THREE.Mesh(fountainG, FOUNTAIN_WATER_MAT);
    fountainM.position.set(cx, 0.70, cz);
    roundabouts.add(fountainM);

    // Circulating dashed lane markings
    for (let i = 0; i < 28; i++) {
      const a2 = (i / 28) * Math.PI * 2;
      const mk = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.02, 2.8), WHITE_MARK_MAT);
      mk.position.set(cx + Math.cos(a2) * 19, 0.16, cz + Math.sin(a2) * 19);
      mk.rotation.y = -Math.atan2(Math.cos(a2), Math.sin(a2));
      roundabouts.add(mk);
    }

    // Island ornamental trees
    for (let i = 0; i < 8; i++) {
      const ta = (i / 8) * Math.PI * 2;
      addTree(roundabouts, cx + Math.cos(ta) * 8.5, cz + Math.sin(ta) * 8.5, 0.85);
    }
  });
  root.add(roundabouts);

  // 6. Radial Feeder Avenues Connecting to City ─────────────────────────────────
  const radialRoads = new THREE.Group();
  icA.forEach(ang => {
    const tx = Math.cos(ang) * (RI - SHLDR_W - 12);
    const tz = Math.sin(ang) * (RI - SHLDR_W - 12);
    const len = Math.hypot(tx, tz);
    const rY = -Math.atan2(tz, tx) + Math.PI / 2;

    addRoadSeg(radialRoads, 13.0, 0.10, len, tx / 2, 0.04, tz / 2, rY, ROAD_BASE_MAT);
    addRoadSeg(radialRoads, 11.5, 0.09, len, tx / 2, 0.12, tz / 2, rY, FRESH_ASPHALT_MAT);

    // Stone curbs
    [-5.8, 5.8].forEach(kx => {
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.24, len), CURB_MAT);
      k.position.set(tx / 2 + kx * Math.cos(rY), 0.22, tz / 2 + kx * Math.sin(rY));
      k.rotation.y = rY;
      radialRoads.add(k);
    });

    // Dashed lane lines
    for (let i = 0; i < 9; i++) {
      const t = (i + 0.5) / 9;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.02, 3.8), WHITE_MARK_MAT);
      m.position.set(tx * t, 0.14, tz * t);
      m.rotation.y = rY;
      radialRoads.add(m);
    }
  });
  root.add(radialRoads);

  // 7. Modern Commercial & Corporate Buildings Along Outer Perimeter ────────────
  const buildings = new THREE.Group();
  const ib: number[][] = [
    [ -10,  18, 16, 16, 28, 0], [-35,  30, 18, 14, 24, 1],
    [  15,  26, 14, 16, 32, 2], [ -8, -18, 20, 15, 22, 3],
    [  26,  -8, 16, 16, 26, 4], [ -6, -50, 14, 13, 18, 0],
    [  34,  45, 16, 14, 24, 1], [-22,  62, 12, 14, 18, 2],
  ];
  ib.forEach(([x, z, w, d, h, ci]) => addBuilding(buildings, x, z, w, d, h, ci));

  const ob: number[][] = [
    [-R - 25, -40, 28, 22, 12, 3], [R + 25, -40, 30, 20, 14, 1],
    [       0, -R - 22, 32, 20, 15, 0],
    [-R - 24,  35, 22, 18, 12, 4], [ R + 24,  35, 24, 18, 13, 2],
  ];
  ob.forEach(([x, z, w, d, h, ci]) => addBuilding(buildings, x, z, w, d, h, ci));
  root.add(buildings);

  // 8. Landscaping Trees ────────────────────────────────────────────────────────
  const trees = new THREE.Group();
  const tN = 28;
  for (let i = 0; i < tN; i++) {
    const a = A0 + (i / (tN - 1)) * ASPAN;
    addTree(trees, Math.cos(a) * (RO + 4.2), Math.sin(a) * (RO + 4.2), 1.1 + (i % 3) * 0.15);
    addTree(trees, Math.cos(a) * (RI - 4.8), Math.sin(a) * (RI - 4.8), 0.95 + (i % 2) * 0.1);
  }
  [[-50,-12],[-28,-42],[38,-32],[48,20],[-6,56],[-65,46],[58,-12],[-38,65]]
    .forEach(([tx, tz]) => addTree(trees, tx, tz, 1.1));
  root.add(trees);

  // 9. High-Mast Floodlight Towers ─────────────────────────────────────────────
  const lights = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const a = A0 + (i / 17) * ASPAN;
    const lr = RO + 2.0;
    addModernStreetLight(lights, Math.cos(a) * lr, 0, Math.sin(a) * lr, 9.0, false);
  }
  root.add(lights);

  // 10. Overhead Variable Message Signs (VMS) Arching Over Highway ──────────────
  const overheadGantry = new THREE.Group();
  const gantryAngle = A0 + ASPAN * 0.45;
  const gx = Math.cos(gantryAngle) * R;
  const gz = Math.sin(gantryAngle) * R;
  const gantryMesh = addOverheadGantry(
    overheadGantry,
    TOTAL_W,
    1.2,
    0,
    'RING ROAD BYPASS • MAX 100 KM/H',
    'CITY AIRPORT / LOGISTICS HUB'
  );
  gantryMesh.position.set(gx, 0, gz);
  gantryMesh.rotation.y = -Math.atan2(Math.cos(gantryAngle), Math.sin(gantryAngle));
  root.add(overheadGantry);

  // 11. Vehicles Navigating Orbital Curves ──────────────────────────────────────
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
