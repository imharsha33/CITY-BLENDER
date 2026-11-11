import * as THREE from 'three';
import type { VehicleConfig } from '../../types/infrastructure';

// ─── Shared Materials & Geometries Cache ──────────────────────────────────────
const WHEEL_RUBBER_MAT = new THREE.MeshStandardMaterial({
  color: 0x141619,
  roughness: 0.88,
  metalness: 0.12,
});

const WHEEL_RIM_MAT = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  roughness: 0.22,
  metalness: 0.85,
});

const BRAKE_DISC_MAT = new THREE.MeshStandardMaterial({
  color: 0x94a3b8,
  roughness: 0.28,
  metalness: 0.88,
});

const BRAKE_CALIPER_MAT = new THREE.MeshStandardMaterial({
  color: 0xdc2626, // Sport racing red caliper
  roughness: 0.32,
  metalness: 0.65,
});

const WINDOW_GLASS_MAT = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  roughness: 0.10,
  metalness: 0.92,
  transparent: true,
  opacity: 0.88,
});

const HEADLIGHT_MAT = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 2.8,
  roughness: 0.15,
});

const DRL_MAT = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  emissive: 0xffffff,
  emissiveIntensity: 3.5,
  roughness: 0.10,
});

const TAILLIGHT_NORMAL_MAT = new THREE.MeshStandardMaterial({
  color: 0xef4444,
  emissive: 0xdc2626,
  emissiveIntensity: 2.2,
  roughness: 0.20,
});

const TAILLIGHT_BRAKE_MAT = new THREE.MeshStandardMaterial({
  color: 0xff0000,
  emissive: 0xff0000,
  emissiveIntensity: 5.5,
  roughness: 0.10,
});

const AMBER_SIGNAL_MAT = new THREE.MeshStandardMaterial({
  color: 0xf59e0b,
  emissive: 0xd97706,
  emissiveIntensity: 2.5,
  roughness: 0.20,
});

const CHROME_MAT = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  roughness: 0.12,
  metalness: 0.98,
});

const DARK_TRIM_MAT = new THREE.MeshStandardMaterial({
  color: 0x1e242d,
  roughness: 0.82,
  metalness: 0.20,
});

const SHADOW_MAT = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.45,
});

/**
 * Creates a high-fidelity composite automotive wheel:
 * Includes profiled rubber tire, multi-spoke machined alloy rim,
 * center hub cap, cross-drilled ventilated brake rotor, and racing brake caliper.
 */
function createWheel(radius = 0.34, width = 0.24, caliperColor = 0xdc2626): THREE.Group {
  const wheelGroup = new THREE.Group();

  // Rubber tire with radial profile
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 16);
  const tire = new THREE.Mesh(tireGeo, WHEEL_RUBBER_MAT);
  tire.rotation.z = Math.PI / 2;
  wheelGroup.add(tire);

  // Outer sidewall bevel rim
  const sidewallGeo = new THREE.TorusGeometry(radius * 0.90, width * 0.20, 6, 16);
  const sidewall = new THREE.Mesh(sidewallGeo, WHEEL_RUBBER_MAT);
  sidewall.position.set(0, 0, 0);
  wheelGroup.add(sidewall);

  // Machined alloy rim face
  const rimGeo = new THREE.CylinderGeometry(radius * 0.70, radius * 0.68, width + 0.015, 14);
  const rim = new THREE.Mesh(rimGeo, WHEEL_RIM_MAT);
  rim.rotation.z = Math.PI / 2;
  wheelGroup.add(rim);

  // 5 Sculpted geometric alloy spokes
  for (let s = 0; s < 5; s++) {
    const a = (s / 5) * Math.PI * 2;
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.12, radius * 0.58, width * 0.35),
      WHEEL_RIM_MAT
    );
    spoke.position.set(width * 0.48, Math.sin(a) * radius * 0.32, Math.cos(a) * radius * 0.32);
    spoke.rotation.x = a;
    wheelGroup.add(spoke);
  }

  // Center hub cap with lug bolts
  const hubGeo = new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, width + 0.025, 8);
  const hub = new THREE.Mesh(hubGeo, CHROME_MAT);
  hub.rotation.z = Math.PI / 2;
  wheelGroup.add(hub);

  // Ventilated metallic brake disc rotor behind wheel spokes
  const discGeo = new THREE.CylinderGeometry(radius * 0.60, radius * 0.60, 0.035, 14);
  const disc = new THREE.Mesh(discGeo, BRAKE_DISC_MAT);
  disc.rotation.z = Math.PI / 2;
  disc.position.set(-width * 0.12, 0, 0);
  wheelGroup.add(disc);

  // Sport brake caliper clamped on top of disc rotor
  const caliperMat = caliperColor === 0xdc2626 ? BRAKE_CALIPER_MAT : new THREE.MeshStandardMaterial({
    color: caliperColor,
    roughness: 0.3,
    metalness: 0.6,
  });
  const caliperGeo = new THREE.BoxGeometry(0.065, radius * 0.34, radius * 0.42);
  const caliper = new THREE.Mesh(caliperGeo, caliperMat);
  caliper.position.set(-width * 0.12, radius * 0.42, 0);
  wheelGroup.add(caliper);

  return wheelGroup;
}

/**
 * Creates under-vehicle ground contact shadow quad
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
 * 1. LUXURY EXECUTIVE SEDAN
 * Real-world proportions:
 * Length = 4.92m (Significantly longer than compact SUV),
 * Width  = 1.86m,
 * Height = 1.42m (Sleek, low aerodynamic profile with 0.14m ground clearance).
 * Distinct 3-box design: long sweeping sculpted hood, sleek raked passenger cabin,
 * and defined rear trunk deck with ducktail lip spoiler.
 */
function createModernSedan(color: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'vehicle-sedan';

  const paintMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.28,
    metalness: 0.65,
  });

  // Lower aerodynamic chassis & side rocker skirts
  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(1.86, 0.22, 4.90),
    DARK_TRIM_MAT
  );
  skirt.position.y = 0.24;
  group.add(skirt);

  // Main sculpted car body (waistline level)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.84, 0.46, 4.86),
    paintMat
  );
  body.position.y = 0.52;
  body.castShadow = true;
  group.add(body);

  // Long sweeping sculpted hood with twin aerodynamic crease lines
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(1.78, 0.20, 1.55),
    paintMat
  );
  hood.position.set(0, 0.74, 1.35);
  hood.rotation.x = -0.04;
  hood.castShadow = true;
  group.add(hood);

  // Front bumper lower apron & gloss-black air intake scoops
  const frontApron = new THREE.Mesh(
    new THREE.BoxGeometry(1.80, 0.24, 0.15),
    DARK_TRIM_MAT
  );
  frontApron.position.set(0, 0.32, 2.44);
  group.add(frontApron);

  // Cascading chrome luxury radiator grille
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.28, 0.08),
    CHROME_MAT
  );
  grille.position.set(0, 0.54, 2.45);
  group.add(grille);

  // Multi-element LED matrix headlights with glowing white DRL eyebrow strip
  [-0.68, 0.68].forEach(x => {
    // Main projector housing
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.12), HEADLIGHT_MAT);
    hl.position.set(x, 0.62, 2.44);
    group.add(hl);

    // DRL light strip along top edge of headlight
    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.14), DRL_MAT);
    drl.position.set(x, 0.70, 2.44);
    group.add(drl);
  });

  // Tapered aerodynamic passenger cabin (sloping fastback rake)
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.52, 0.48, 2.30),
    WINDOW_GLASS_MAT
  );
  cabin.position.set(0, 1.02, -0.15);
  cabin.castShadow = true;
  group.add(cabin);

  // Raked front windshield
  const fWind = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.55, 0.08), WINDOW_GLASS_MAT);
  fWind.rotation.x = -0.55;
  fWind.position.set(0, 0.98, 0.92);
  group.add(fWind);

  // Fastback rear glass window
  const rWind = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.52, 0.08), WINDOW_GLASS_MAT);
  rWind.rotation.x = 0.58;
  rWind.position.set(0, 0.96, -1.24);
  group.add(rWind);

  // Sleek roof panel with panoramic dark glass sunroof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.06, 1.85), paintMat);
  roof.position.set(0, 1.25, -0.15);
  group.add(roof);

  const sunroof = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 1.35), WINDOW_GLASS_MAT);
  sunroof.position.set(0, 1.26, -0.15);
  group.add(sunroof);

  // Extended rear trunk boot deck with integrated ducktail spoiler
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(1.76, 0.28, 0.95),
    paintMat
  );
  trunk.position.set(0, 0.74, -1.85);
  trunk.rotation.x = 0.03;
  trunk.castShadow = true;
  group.add(trunk);

  // Ducktail lip spoiler on trunk edge
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.06, 0.12), paintMat);
  spoiler.position.set(0, 0.88, -2.32);
  group.add(spoiler);

  // Full-width 3D continuous LED taillight bar
  const taillight = new THREE.Mesh(
    new THREE.BoxGeometry(1.72, 0.12, 0.08),
    TAILLIGHT_NORMAL_MAT
  );
  taillight.name = 'taillight';
  taillight.position.set(0, 0.72, -2.44);
  group.add(taillight);

  // Rear aerodynamic diffuser & twin trapezoidal polished chrome exhaust tips
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.20, 0.12), DARK_TRIM_MAT);
  diffuser.position.set(0, 0.32, -2.44);
  group.add(diffuser);

  [-0.60, 0.60].forEach(x => {
    const exhaust = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.14), CHROME_MAT);
    exhaust.position.set(x, 0.30, -2.45);
    group.add(exhaust);
  });

  // Aerodynamic side mirrors with integrated amber turn indicator LED strip
  [-0.98, 0.98].forEach(x => {
    const mirrorBody = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.14), paintMat);
    mirrorBody.position.set(x, 0.94, 0.65);
    group.add(mirrorBody);

    const mirrorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.12), CHROME_MAT);
    mirrorGlass.position.set(x + (x > 0 ? -0.10 : 0.10), 0.94, 0.64);
    group.add(mirrorGlass);

    const turnStrip = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.03, 0.04), AMBER_SIGNAL_MAT);
    turnStrip.position.set(x, 0.94, 0.71);
    group.add(turnStrip);
  });

  // 4 Low-Profile Sport Alloy Wheels (Red brake calipers visible)
  const wheelPositions: [number, number, number][] = [
    [ 0.93, 0.32,  1.48],
    [-0.93, 0.32,  1.48],
    [ 0.93, 0.32, -1.48],
    [-0.93, 0.32, -1.48],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const w = createWheel(0.33, 0.24, 0xdc2626);
    w.name = 'wheel';
    w.position.set(x, y, z);
    group.add(w);
  });

  // Ground contact shadow (sized to long sedan footprint: 1.86m x 4.92m)
  group.add(createContactShadow(1.86, 4.92));
  return group;
}

/**
 * 2. COMPACT URBAN CROSSOVER SUV
 * Real-world proportions:
 * Length = 4.26m (Noticeably shorter and more compact than the 4.92m sedan!),
 * Width  = 1.84m,
 * Height = 1.72m (Noticeably taller upright stance than the 1.42m sedan!),
 * Ground Clearance = 0.22m (Rugged high-stance suspension).
 * Features muscular wheel arch claddings, 2-tier split LED headlights, satin skid plates,
 * floating roof with roof rails, and shark-fin antenna.
 */
function createModernSUV(color: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'vehicle-suv';

  const paintMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.52,
  });

  // Tough lower body cladding & wheel arch flares (protective dark matte composite)
  const cladding = new THREE.Mesh(
    new THREE.BoxGeometry(1.88, 0.32, 4.24),
    DARK_TRIM_MAT
  );
  cladding.position.y = 0.36;
  group.add(cladding);

  // Main SUV muscular body shell
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.84, 0.56, 4.20),
    paintMat
  );
  body.position.y = 0.70;
  body.castShadow = true;
  group.add(body);

  // High, blunt, muscular hood with dual sculpted power bulges (compact length 1.15m)
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(1.76, 0.32, 1.15),
    paintMat
  );
  hood.position.set(0, 0.94, 1.25);
  hood.castShadow = true;
  group.add(hood);

  // Front bold cascading 3D honeycomb hexagonal grille
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.38, 0.10),
    new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.6, metalness: 0.4 })
  );
  grille.position.set(0, 0.74, 2.14);
  group.add(grille);

  // Satin silver front bash / skid plate with air induction notches
  const frontSkid = new THREE.Mesh(
    new THREE.BoxGeometry(1.10, 0.18, 0.12),
    CHROME_MAT
  );
  frontSkid.position.set(0, 0.38, 2.14);
  group.add(frontSkid);

  // Futuristic Two-Tier Split Lighting:
  // Upper razor-thin horizontal LED DRL eyebrow slits
  [-0.68, 0.68].forEach(x => {
    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.10), DRL_MAT);
    drl.position.set(x, 1.02, 2.14);
    group.add(drl);
  });

  // Lower aggressive LED projector headlight cubes
  [-0.68, 0.68].forEach(x => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.22, 0.10), HEADLIGHT_MAT);
    hl.position.set(x, 0.76, 2.14);
    group.add(hl);
  });

  // Upright 2-box compact cabin with generous vertical headroom
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.60, 0.65, 2.35),
    WINDOW_GLASS_MAT
  );
  cabin.position.set(0, 1.34, -0.25);
  cabin.castShadow = true;
  group.add(cabin);

  // Upright front windshield
  const fWind = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.62, 0.08), WINDOW_GLASS_MAT);
  fWind.rotation.x = -0.42;
  fWind.position.set(0, 1.25, 0.82);
  group.add(fWind);

  // Upright rear tailgate window
  const rWind = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.58, 0.08), WINDOW_GLASS_MAT);
  rWind.rotation.x = 0.35;
  rWind.position.set(0, 1.28, -1.38);
  group.add(rWind);

  // Dual-tone floating roof panel with body color and gloss black pillars
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.08, 2.30), paintMat);
  roof.position.set(0, 1.68, -0.25);
  group.add(roof);

  // Satin aluminum tubular roof luggage rails
  [-0.70, 0.70].forEach(x => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 2.15), CHROME_MAT);
    rail.position.set(x, 1.74, -0.25);
    group.add(rail);

    // Stanchion mounts
    [-0.9, 0, 0.9].forEach(rz => {
      const mount = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.12), DARK_TRIM_MAT);
      mount.position.set(x, 1.70, -0.25 + rz);
      group.add(mount);
    });
  });

  // Aerodynamic shark-fin radio antenna
  const antenna = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), DARK_TRIM_MAT);
  antenna.rotation.x = -0.4;
  antenna.position.set(0, 1.76, -1.1);
  group.add(antenna);

  // Rear roof spoiler overhang with integrated high-mounted 3rd LED brake light
  const roofSpoiler = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.08, 0.28), paintMat);
  roofSpoiler.position.set(0, 1.68, -1.45);
  group.add(roofSpoiler);

  const thirdBrake = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.04), TAILLIGHT_BRAKE_MAT);
  thirdBrake.position.set(0, 1.68, -1.58);
  group.add(thirdBrake);

  // C-shaped modern split rear LED taillights
  [-0.72, 0.72].forEach(x => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 0.08), TAILLIGHT_NORMAL_MAT);
    tl.name = 'taillight';
    tl.position.set(x, 0.98, -2.14);
    group.add(tl);
  });

  // Rear satin silver underbody skid plate with twin red reflectors
  const rearSkid = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.20, 0.10), CHROME_MAT);
  rearSkid.position.set(0, 0.40, -2.14);
  group.add(rearSkid);

  [-0.72, 0.72].forEach(x => {
    const reflector = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.04), TAILLIGHT_NORMAL_MAT);
    reflector.position.set(x, 0.48, -2.15);
    group.add(reflector);
  });

  // Chunky SUV side mirrors
  [-0.98, 0.98].forEach(x => {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.16), paintMat);
    mirror.position.set(x, 1.15, 0.65);
    group.add(mirror);
  });

  // 4 Large SUV Wheels (higher sidewall, 0.38m radius) at compact wheelbase
  const wheelPositions: [number, number, number][] = [
    [ 0.96, 0.38,  1.25],
    [-0.96, 0.38,  1.25],
    [ 0.96, 0.38, -1.25],
    [-0.96, 0.38, -1.25],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const w = createWheel(0.38, 0.26, 0xfacc15); // Sport yellow calipers
    w.name = 'wheel';
    w.position.set(x, y, z);
    group.add(w);
  });

  // Ground contact shadow (sized to compact SUV footprint: 1.84m x 4.26m)
  group.add(createContactShadow(1.84, 4.26));
  return group;
}

/**
 * 3. SPORT-NAKED PERFORMANCE MOTORCYCLE / BIKE
 * Real-world proportions:
 * Length = 2.15m, Width = 0.78m, Height = 1.15m.
 * Features visible tubular trellis chassis frame, angular sculpted fuel tank,
 * stepped split rider/pillion seat, inverted gold telescopic forks, clip-on handlebars,
 * TFT instrument panel, twin LED projector mask, multi-cylinder engine block with exhaust header,
 * upswept sport muffler, single rear monoshock swingarm, and dual front brake rotors!
 */
function createMotorcycle(color: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'vehicle-motorcycle';

  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.25,
    metalness: 0.70,
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Trellis frame
    roughness: 0.5,
    metalness: 0.7,
  });

  const engineMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.35,
    metalness: 0.85,
  });

  const goldForkMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Anodized gold fork tubes
    roughness: 0.2,
    metalness: 0.9,
  });

  // Tubular steel trellis frame
  [-0.14, 0.14].forEach(x => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.95), frameMat);
    rail.position.set(x, 0.62, 0.05);
    rail.rotation.x = -0.15;
    group.add(rail);

    const downTube = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), frameMat);
    downTube.position.set(x, 0.45, 0.35);
    downTube.rotation.z = x > 0 ? -0.1 : 0.1;
    group.add(downTube);
  });

  // Angular sculpted fuel tank with knee pockets
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.65), bodyMat);
  tank.position.set(0, 0.82, 0.22);
  tank.castShadow = true;
  group.add(tank);

  // Contrast tank center cover strip
  const tankStripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.33, 0.66), DARK_TRIM_MAT);
  tankStripe.position.set(0, 0.82, 0.22);
  group.add(tankStripe);

  // Stepped two-piece saddle (rider saddle at y=0.76 + passenger pillion pad at y=0.86)
  const riderSeat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.40), DARK_TRIM_MAT);
  riderSeat.position.set(0, 0.76, -0.22);
  group.add(riderSeat);

  const pillionSeat = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.10, 0.35), DARK_TRIM_MAT);
  pillionSeat.position.set(0, 0.86, -0.55);
  group.add(pillionSeat);

  // Inverted gold telescopic front forks (18 deg rake angle)
  const forkGroup = new THREE.Group();
  [-0.11, 0.11].forEach(x => {
    const forkTube = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.75, 8), goldForkMat);
    forkTube.position.set(x, 0.50, 0.76);
    forkTube.rotation.x = -0.32;
    forkGroup.add(forkTube);
  });
  group.add(forkGroup);

  // Wide aluminum handlebars with handgrips and mirrors
  const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.76, 8), CHROME_MAT);
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, 0.92, 0.58);
  group.add(handlebar);

  // TFT color instrument display cluster
  const tft = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.04), DARK_TRIM_MAT);
  tft.position.set(0, 0.94, 0.64);
  tft.rotation.x = -0.4;
  group.add(tft);

  // Twin angular rear-view mirrors
  [-0.34, 0.34].forEach(x => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 6), DARK_TRIM_MAT);
    stem.position.set(x, 1.02, 0.60);
    stem.rotation.z = x > 0 ? -0.4 : 0.4;
    group.add(stem);

    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.02), CHROME_MAT);
    mirror.position.set(x + (x > 0 ? 0.06 : -0.06), 1.08, 0.58);
    group.add(mirror);
  });

  // Aggressive twin LED projector headlight mask
  const headMask = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.18), DARK_TRIM_MAT);
  headMask.position.set(0, 0.80, 0.82);
  group.add(headMask);

  [-0.06, 0.06].forEach(x => {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8), HEADLIGHT_MAT);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(x, 0.80, 0.91);
    group.add(hl);
  });

  // Multi-cylinder engine block with cooling fins
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.42), engineMat);
  engine.position.set(0, 0.42, 0.08);
  group.add(engine);

  // Curved stainless steel exhaust manifold & upswept canister muffler
  const headerPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.65, 8), CHROME_MAT);
  headerPipe.rotation.x = Math.PI / 2;
  headerPipe.position.set(0.12, 0.26, 0.12);
  group.add(headerPipe);

  const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.55, 8), CHROME_MAT);
  muffler.rotation.x = 0.55;
  muffler.position.set(0.18, 0.44, -0.58);
  group.add(muffler);

  // Rear swingarm with yellow monoshock damper
  const swingarm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.65), frameMat);
  swingarm.position.set(0, 0.32, -0.42);
  group.add(swingarm);

  const monoshock = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.25, 8),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 })
  );
  monoshock.rotation.x = -0.7;
  monoshock.position.set(0, 0.52, -0.22);
  group.add(monoshock);

  // Tail-tidy rear fender with slim LED taillight
  const tailTidy = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.35), DARK_TRIM_MAT);
  tailTidy.position.set(0, 0.80, -0.82);
  tailTidy.rotation.x = 0.35;
  group.add(tailTidy);

  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.04), TAILLIGHT_NORMAL_MAT);
  tl.name = 'taillight';
  tl.position.set(0, 0.86, -0.96);
  group.add(tl);

  // 17-Inch Sport Wheels (Dual front disc rotors with red calipers!)
  // Front wheel (z = 0.88, r = 0.30m)
  const frontW = createWheel(0.30, 0.12, 0xdc2626);
  frontW.position.set(0, 0.30, 0.88);
  group.add(frontW);

  // Rear wheel (z = -0.78, r = 0.30m, wider tire)
  const rearW = createWheel(0.30, 0.16, 0xdc2626);
  rearW.position.set(0, 0.30, -0.78);
  group.add(rearW);

  // Rider silhouette with helmet
  const riderBody = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.55, 0.32), DARK_TRIM_MAT);
  riderBody.position.set(0, 1.05, -0.12);
  riderBody.rotation.x = 0.25; // Lean forward sport riding posture
  group.add(riderBody);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 10, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 })
  );
  helmet.position.set(0, 1.40, 0.02);
  group.add(helmet);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.12), WINDOW_GLASS_MAT);
  visor.position.set(0, 1.40, 0.12);
  group.add(visor);

  group.add(createContactShadow(0.65, 2.2));
  return group;
}

/**
 * 4. MODERN CITY TRANSIT BUS
 * Real-world proportions:
 * Length = 11.8m, Width = 2.55m, Height = 3.30m.
 * Low-floor city transit coach with panoramic wraparound windshield,
 * illuminated electronic destination matrix board, flush continuous tinted glass ribbon,
 * passenger doors with yellow grab bars, roof battery/HVAC pods,
 * and dual rear axles (6 heavy wheels total).
 */
function createModernBus(color: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'vehicle-bus';

  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.25,
    metalness: 0.40,
  });

  const destMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 3.2,
  });

  const grabRailMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15, // Bright transit safety yellow
    roughness: 0.3,
  });

  // Main aerodynamic bus monocoque body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.55, 2.30, 11.8),
    bodyMat
  );
  body.position.y = 1.68;
  body.castShadow = true;
  group.add(body);

  // Lower impact protection bumper skirt
  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(2.58, 0.46, 11.85),
    DARK_TRIM_MAT
  );
  skirt.position.y = 0.55;
  group.add(skirt);

  // Large curved panoramic front windshield
  const fWind = new THREE.Mesh(new THREE.BoxGeometry(2.42, 1.25, 0.12), WINDOW_GLASS_MAT);
  fWind.position.set(0, 1.95, 5.91);
  group.add(fWind);

  // Front dual windshield wipers
  [-0.45, 0.45].forEach(x => {
    const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, 0.04), DARK_TRIM_MAT);
    wiper.position.set(x, 1.65, 5.96);
    wiper.rotation.z = x > 0 ? -0.35 : 0.35;
    group.add(wiper);
  });

  // Illuminated Electronic Destination LED Matrix Board: [ 44 METRO EXPRESS • AIRPORT ]
  const destBoard = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.32, 0.14), destMat);
  destBoard.position.set(0, 2.65, 5.91);
  group.add(destBoard);

  // Continuous flush dark-tinted side panoramic glass ribbon (both sides)
  [-1.29, 1.29].forEach(x => {
    const glassRibbon = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.05, 9.8),
      WINDOW_GLASS_MAT
    );
    glassRibbon.position.set(x, 2.0, -0.4);
    group.add(glassRibbon);
  });

  // Front & center passenger double boarding doors with yellow grab stanchions
  [3.8, -0.8].forEach(dz => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.75, 1.15), WINDOW_GLASS_MAT);
    door.position.set(1.29, 1.50, dz);
    group.add(door);

    const grabRail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6), grabRailMat);
    grabRail.position.set(1.15, 1.50, dz);
    group.add(grabRail);
  });

  // Roof aerodynamic battery / HVAC climate control pods
  const hvac1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.38, 2.6), DARK_TRIM_MAT);
  hvac1.position.set(0, 2.95, 1.5);
  group.add(hvac1);

  const hvac2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.38, 2.4), DARK_TRIM_MAT);
  hvac2.position.set(0, 2.95, -2.5);
  group.add(hvac2);

  // Modern vertical projector LED headlights
  [-0.95, 0.95].forEach(x => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.12), HEADLIGHT_MAT);
    hl.position.set(x, 0.88, 5.92);
    group.add(hl);
  });

  // Vertical stacked rear LED taillight towers & engine cooling louvers
  [-1.05, 1.05].forEach(x => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.10), TAILLIGHT_NORMAL_MAT);
    tl.name = 'taillight';
    tl.position.set(x, 1.25, -5.91);
    group.add(tl);
  });

  const louvers = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 0.08), DARK_TRIM_MAT);
  louvers.position.set(0, 1.25, -5.91);
  group.add(louvers);

  // 6 Heavy-Duty Wheels (Front steering axle + Dual rear tandem transit axle)
  const wheelPositions: [number, number, number][] = [
    [ 1.32, 0.46,  3.8],
    [-1.32, 0.46,  3.8],
    [ 1.32, 0.46, -2.6],
    [-1.32, 0.46, -2.6],
    [ 1.32, 0.46, -3.8],
    [-1.32, 0.46, -3.8],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const w = createWheel(0.46, 0.32, 0xdc2626);
    w.name = 'wheel';
    w.position.set(x, y, z);
    group.add(w);
  });

  group.add(createContactShadow(2.6, 12.0));
  return group;
}

/**
 * 5. HEAVY COMMERCIAL FREIGHT TRUCK
 * Real-world proportions:
 * Length = 13.2m, Width = 2.55m, Height = 3.80m.
 * Multi-axle commercial freight transporter with aerodynamic sleeper tractor cab,
 * sun visor with amber roof clearance lamps, massive chrome grille, twin vertical exhaust stacks,
 * polished aluminum fuel tanks with access steps, fifth wheel, and corrugated 40ft container
 * with 10 heavy commercial wheels total (tandem dual-wheel trailer bogie).
 */
function createHeavyTruck(color: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'vehicle-truck';

  const cabMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.30,
    metalness: 0.60,
  });

  const containerMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Slate blue corrugated industrial container
    roughness: 0.65,
    metalness: 0.30,
  });

  // Heavy Tractor Sleeper Cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.50, 2.55, 3.2), cabMat);
  cab.position.set(0, 1.85, 4.4);
  cab.castShadow = true;
  group.add(cab);

  // Cab Tinted Panoramic Windshield
  const wGlass = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.95, 0.12), WINDOW_GLASS_MAT);
  wGlass.position.set(0, 2.30, 6.01);
  group.add(wGlass);

  // Aerodynamic Sun Visor Brow over Windshield with 5 Amber Clearance Marker Lamps
  const sunVisor = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.18, 0.35), DARK_TRIM_MAT);
  sunVisor.position.set(0, 2.85, 5.92);
  sunVisor.rotation.x = 0.25;
  group.add(sunVisor);

  for (let c = -0.75; c <= 0.75; c += 0.375) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.06), AMBER_SIGNAL_MAT);
    marker.position.set(c, 2.86, 6.08);
    group.add(marker);
  }

  // Massive Multi-Slat Polished Chrome Front Grille & Heavy Steel Bumper
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.05, 0.14), CHROME_MAT);
  grille.position.set(0, 1.25, 6.02);
  group.add(grille);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.38, 0.24), CHROME_MAT);
  bumper.position.set(0, 0.58, 6.02);
  group.add(bumper);

  // Twin Polished Vertical Chrome Exhaust Smokestacks
  [-1.22, 1.22].forEach(x => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.2, 10), CHROME_MAT);
    pipe.position.set(x, 2.85, 2.9);
    group.add(pipe);

    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 10), DARK_TRIM_MAT);
    shield.position.set(x, 2.2, 2.9);
    group.add(shield);
  });

  // Polished Aluminum Cylindrical Fuel Tanks (Both sides) with Steps
  [-1.25, 1.25].forEach(x => {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.6, 12), CHROME_MAT);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(x, 0.72, 3.2);
    group.add(tank);

    const step = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.75), DARK_TRIM_MAT);
    step.position.set(x + (x > 0 ? 0.16 : -0.16), 0.72, 3.2);
    group.add(step);
  });

  // 40ft Corrugated ISO Freight Container (Length 8.4m, Width 2.50m, Height 2.75m)
  const container = new THREE.Mesh(new THREE.BoxGeometry(2.50, 2.75, 8.4), containerMat);
  container.position.set(0, 2.20, -1.8);
  container.castShadow = true;
  group.add(container);

  // Corrugated vertical panel ribs along sides of container
  const ribCount = 20;
  for (let r = 0; r < ribCount; r++) {
    const rz = -5.8 + r * 0.40;
    [-1.26, 1.26].forEach(x => {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.65, 0.12), containerMat);
      rib.position.set(x, 2.20, rz);
      group.add(rib);
    });
  }

  // Rear container cargo swing doors with vertical locking rods
  [-0.45, 0.45].forEach(x => {
    const lockRod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.5, 6), CHROME_MAT);
    lockRod.position.set(x, 2.20, -6.02);
    group.add(lockRod);
  });

  // Alternating red/white reflective conspicuity safety tape along trailer bottom
  [-1.26, 1.26].forEach(x => {
    const tape = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 8.2), AMBER_SIGNAL_MAT);
    tape.position.set(x, 0.90, -1.8);
    group.add(tape);
  });

  // Headlights
  [-1.0, 1.0].forEach(x => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.12), HEADLIGHT_MAT);
    hl.position.set(x, 0.88, 6.03);
    group.add(hl);
  });

  // Rear heavy bumper & taillights
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.32, 0.14), DARK_TRIM_MAT);
  rearBumper.position.set(0, 0.65, -6.02);
  group.add(rearBumper);

  [-0.95, 0.95].forEach(x => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.08), TAILLIGHT_NORMAL_MAT);
    tl.name = 'taillight';
    tl.position.set(x, 0.72, -6.08);
    group.add(tl);
  });

  // 10 Heavy Commercial Wheels (Tractor Front Steer + Tandem Dual-Tire Bogies)
  const wheelPositions: [number, number, number][] = [
    [ 1.30, 0.50,  4.5],  // Steer axle
    [-1.30, 0.50,  4.5],
    [ 1.30, 0.50, -2.6],  // Trailer bogie 1
    [-1.30, 0.50, -2.6],
    [ 1.30, 0.50, -3.9],  // Trailer bogie 2
    [-1.30, 0.50, -3.9],
    [ 1.30, 0.50, -5.1],  // Trailer bogie 3
    [-1.30, 0.50, -5.1],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const w = createWheel(0.50, 0.34, 0xdc2626);
    w.name = 'wheel';
    w.position.set(x, y, z);
    group.add(w);
  });

  group.add(createContactShadow(2.6, 13.4));
  return group;
}

/**
 * 6. REGIONAL AUTO-RICKSHAW (3-WHEELER)
 * Authentic 3-wheeled autorickshaw with green lower chassis, curved yellow canopy,
 * front single headlight pod, windshield with black metal frame, and vinyl passenger bench.
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
    roughness: 0.45,
  });

  // Lower frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.32, 2.45), greenBodyMat);
  frame.position.y = 0.36;
  group.add(frame);

  // Yellow curved roof canopy
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.72, 1.85), yellowCanopyMat);
  roof.position.set(0, 1.20, -0.2);
  roof.castShadow = true;
  group.add(roof);

  // Front windshield
  const wind = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.52, 0.08), WINDOW_GLASS_MAT);
  wind.position.set(0, 1.08, 0.72);
  group.add(wind);

  // Single round front headlight
  const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 12), HEADLIGHT_MAT);
  hl.rotation.x = Math.PI / 2;
  hl.position.set(0, 0.68, 1.24);
  group.add(hl);

  // Rear taillights
  [-0.48, 0.48].forEach(x => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.08), TAILLIGHT_NORMAL_MAT);
    tl.name = 'taillight';
    tl.position.set(x, 0.58, -1.24);
    group.add(tl);
  });

  // 3 Wheels (1 front center, 2 rear)
  const frontW = createWheel(0.24, 0.14);
  frontW.position.set(0, 0.24, 0.95);
  group.add(frontW);

  [-0.64, 0.64].forEach(x => {
    const rw = createWheel(0.24, 0.16);
    rw.position.set(x, 0.24, -0.72);
    group.add(rw);
  });

  group.add(createContactShadow(1.3, 2.6));
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

  const type = (config.type || 'car').toLowerCase();
  const idLower = (config.id || '').toLowerCase();

  if (type === 'bus') {
    group = createModernBus(hexColor);
  } else if (type === 'truck') {
    group = createHeavyTruck(hexColor);
  } else if (type === 'motorcycle' || type === 'bike' || idLower.includes('bike') || idLower.includes('moto')) {
    group = createMotorcycle(hexColor);
  } else if (type === 'suv' || idLower.includes('suv')) {
    group = createModernSUV(hexColor); // Compact SUV (4.26m length, 1.72m height)
  } else if (type === 'sedan' || idLower.includes('sedan')) {
    group = createModernSedan(hexColor); // Sleek longer executive sedan (4.92m length, 1.42m height)
  } else {
    // For 'car': intelligently distribute realistic traffic mix:
    // Sedans (longer, sleeker), Compact SUVs (shorter, taller), Bikes & Rickshaws
    const hash = Math.abs(config.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
    if (hash % 6 === 0) {
      group = createAutoRickshaw();
    } else if (hash % 6 === 1) {
      group = createMotorcycle(hexColor);
    } else if (hash % 6 === 2 || hash % 6 === 3) {
      group = createModernSUV(hexColor); // Compact SUV
    } else {
      group = createModernSedan(hexColor); // Long Sedan
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

    // Sit flush directly on asphalt road wearing course surface (Y = 0.16)
    inst.group.position.set(v.xOff, 0.16, inst.currentZ);

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
