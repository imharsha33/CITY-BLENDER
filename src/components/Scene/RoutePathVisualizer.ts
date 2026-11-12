import * as THREE from 'three';
import type { RealPlace } from '../../data/cityPlaces';
import type { RouteCalculationResult, RouteStep } from '../../engine/RealRouteEngine';
import { GeoCoordinateSystem } from '../../engine/GeoCoordinateSystem';

export class RoutePathVisualizer {
  rootGroup: THREE.Group;
  private placesGroup: THREE.Group;
  private routeLineGroup: THREE.Group;
  private vehicleGroup: THREE.Group;
  private turnDecalsGroup: THREE.Group;

  private curve: THREE.CatmullRomCurve3 | null = null;
  private activeRoute: RouteCalculationResult | null = null;
  private chevronTexture: THREE.CanvasTexture | null = null;

  // Driving Simulation State
  public isDriving = false;
  public driveProgress = 0.0;
  public driveSpeedKmh = 42.0;
  public driveCameraMode: 'follow' | 'overview' = 'follow';

  // Navigation Vehicle Meshes
  private carMeshGroup: THREE.Group | null = null;
  private carHeadlight: THREE.PointLight | null = null;

  // Floating Places & Radar
  private radarRings: { mesh: THREE.Mesh; baseScale: number; speed: number }[] = [];
  private floatingPlaces: { group: THREE.Group; baseY: number; phase: number }[] = [];

  private currentPlaces: RealPlace[] = [];
  private selectedOriginId: string | null = null;
  private selectedDestId: string | null = null;

  constructor() {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'real-route-visualizer-root';

    this.placesGroup = new THREE.Group();
    this.placesGroup.name = 'route-places-group';
    this.rootGroup.add(this.placesGroup);

    this.routeLineGroup = new THREE.Group();
    this.routeLineGroup.name = 'route-path-line-group';
    this.rootGroup.add(this.routeLineGroup);

    this.turnDecalsGroup = new THREE.Group();
    this.turnDecalsGroup.name = 'route-turn-decals-group';
    this.rootGroup.add(this.turnDecalsGroup);

    this.vehicleGroup = new THREE.Group();
    this.vehicleGroup.name = 'route-vehicle-group';
    this.rootGroup.add(this.vehicleGroup);
  }

  // ── 1. Render Google Maps Style Location Pins & Place Names ───────────────────
  renderPlaces(
    places: RealPlace[],
    coordSystem: GeoCoordinateSystem,
    originId: string | null = null,
    destId: string | null = null
  ): void {
    this.currentPlaces = places;
    this.selectedOriginId = originId;
    this.selectedDestId = destId;
    this.radarRings = [];
    this.floatingPlaces = [];

    // Clear existing place markers
    while (this.placesGroup.children.length > 0) {
      const c = this.placesGroup.children[0];
      this.placesGroup.remove(c);
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material.dispose();
      }
    }

    places.forEach((place, idx) => {
      const [lat, lon] = place.coordinate;
      const world = coordSystem.geoToWorld(lat, lon, 0);

      const isOrigin = place.id === originId;
      const isDest = place.id === destId;

      let hexColor = place.isMajorCircle ? '#ea4335' : '#1a73e8';
      let primaryColorNum = place.isMajorCircle ? 0xea4335 : 0x1a73e8;
      if (isOrigin) {
        hexColor = '#10b981'; // Vivid Green for Start
        primaryColorNum = 0x10b981;
      } else if (isDest) {
        hexColor = '#ef4444'; // Vivid Red for Destination
        primaryColorNum = 0xef4444;
      }

      const placeRoot = new THREE.Group();
      placeRoot.position.set(world.x, 0, world.z);
      placeRoot.userData = { place };

      // Ground Plinth & Target Disc on Asphalt
      const plinthGeo = new THREE.CylinderGeometry(2.8, 3.4, 0.25, 24);
      const plinthMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.8,
        metalness: 0.2,
      });
      const plinth = new THREE.Mesh(plinthGeo, plinthMat);
      plinth.position.y = 0.15;
      placeRoot.add(plinth);

      // Inner Ground Ring
      const ringGeo = new THREE.RingGeometry(1.4, 2.4, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: primaryColorNum,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.28;
      placeRoot.add(ring);

      // Animated Radar Ripple
      const radarGeo = new THREE.RingGeometry(2.5, 4.0, 32);
      radarGeo.rotateX(-Math.PI / 2);
      const radarMat = new THREE.MeshBasicMaterial({
        color: primaryColorNum,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        opacity: 0.5,
      });
      const radar = new THREE.Mesh(radarGeo, radarMat);
      radar.position.y = 0.29;
      placeRoot.add(radar);
      this.radarRings.push({ mesh: radar, baseScale: 1.0, speed: place.isMajorCircle ? 1.6 : 1.2 });

      // Vertical Locator Stem
      const pinAltitude = isOrigin || isDest ? 20.0 : 16.0;
      const stemGeo = new THREE.CylinderGeometry(0.14, 0.28, pinAltitude, 12);
      const stemMat = new THREE.MeshBasicMaterial({
        color: primaryColorNum,
        transparent: true,
        opacity: 0.8,
      });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = pinAltitude / 2;
      placeRoot.add(stem);

      // Elevated Teardrop Pin & Label Sprite
      const pinBadgeGroup = new THREE.Group();
      pinBadgeGroup.position.y = pinAltitude;

      const pinSprite = this.createGoogleMapPinSprite(place, hexColor, isOrigin, isDest);
      pinBadgeGroup.add(pinSprite);

      placeRoot.add(pinBadgeGroup);

      this.floatingPlaces.push({
        group: pinBadgeGroup,
        baseY: pinAltitude,
        phase: idx * 0.9,
      });

      this.placesGroup.add(placeRoot);
    });
  }

  private createGoogleMapPinSprite(
    place: RealPlace,
    pinColor: string,
    isOrigin: boolean,
    isDest: boolean
  ): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 240;
    const ctx = canvas.getContext('2d')!;

    const pinX = 90;
    const pinBulbY = 80;
    const pinRadius = 40;
    const pinTipY = 195;

    // Teardrop path
    ctx.beginPath();
    ctx.arc(pinX, pinBulbY, pinRadius, Math.PI, 0, false);
    ctx.lineTo(pinX + 18, pinBulbY + 36);
    ctx.lineTo(pinX, pinTipY);
    ctx.lineTo(pinX - 18, pinBulbY + 36);
    ctx.closePath();

    ctx.fillStyle = pinColor;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Center icon
    ctx.beginPath();
    ctx.arc(pinX, pinBulbY, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = pinColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isOrigin ? 'A' : isDest ? 'B' : '★', pinX, pinBulbY);

    // Label card bubble
    const cardX = 160;
    const cardY = 35;
    const cardW = 590;
    const cardH = 110;
    const cardR = 14;

    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = pinColor;
    ctx.stroke();

    // Text Header Tag
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = pinColor;
    const categoryTag = isOrigin
      ? '🟢 START ORIGIN'
      : isDest
      ? '🏁 DESTINATION'
      : place.isMajorCircle
      ? '★ MAJOR TRAFFIC CIRCLE'
      : 'LANDMARK';
    ctx.fillText(categoryTag, cardX + 18, cardY + 12);

    // Main Place Name
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(place.name, cardX + 18, cardY + 34);

    // Description
    ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#475569';
    const desc = place.description.length > 55 ? place.description.substring(0, 52) + '...' : place.description;
    ctx.fillText(desc, cardX + 18, cardY + 72);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(spriteMat);
    const spriteScale = isOrigin || isDest ? 56 : 46;
    sprite.scale.set(spriteScale, spriteScale * (canvas.height / canvas.width), 1);
    sprite.center.set(pinX / canvas.width, 1.0);

    return sprite;
  }

  // ── 2. Create Dynamic Forward-Flowing Directional Chevron Texture ────────────
  private createDirectionalChevronTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Solid Royal Navigation Blue (#1d4ed8)
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, 512, 128);

    // Vibrant Cyan central highway guide
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 10, 512, 108);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.fillRect(0, 48, 512, 32);

    // Draw repeating directional forward chevrons (>>>)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;

    for (let x = 64; x < 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x - 24, 26);
      ctx.lineTo(x + 24, 64);
      ctx.lineTo(x - 24, 102);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  // ── 3. Render Solid, High-Contrast Directional Highway Ribbon ─────────────────
  renderRoute(route: RouteCalculationResult): void {
    this.clearRoute();
    this.activeRoute = route;
    if (!route.worldPath || route.worldPath.length < 2) return;

    // Filter coincident duplicate points to avoid singularities
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < route.worldPath.length; i++) {
      const p = route.worldPath[i];
      if (points.length === 0 || p.distanceTo(points[points.length - 1]) > 0.08) {
        points.push(new THREE.Vector3(p.x, 0.52, p.z));
      }
    }
    if (points.length < 2) return;

    // Smooth 3D Spline along actual road network
    this.curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.1);

    // Calculate total curve distance
    const totalDist = route.distanceMeters || 1000;
    const numSteps = Math.max(80, Math.min(2400, Math.floor(totalDist / 4)));
    const curvePoints = this.curve.getPoints(numSteps);

    // ── A. High-Contrast Dark Navy Border Casing (W = 5.6m, Y = 0.48m) ─────────
    const casingGeo = new THREE.BufferGeometry();
    const casingVerts: number[] = [];
    const casingHalfW = 2.8;

    // ── B. Inner Vivid Directional Ribbon with Animated Chevrons (W = 4.2m, Y = 0.54m) ─
    const ribbonGeo = new THREE.BufferGeometry();
    const ribbonVerts: number[] = [];
    const ribbonUvs: number[] = [];
    const ribbonHalfW = 2.1;

    for (let i = 0; i < curvePoints.length - 1; i++) {
      const p1 = curvePoints[i];
      const p2 = curvePoints[i + 1];

      const dir = new THREE.Vector3().subVectors(p2, p1);
      dir.y = 0;
      if (dir.lengthSq() < 0.00001) dir.set(0, 0, 1);
      dir.normalize();

      // Perpendicular 2D horizontal normal
      const norm = new THREE.Vector3(-dir.z, 0, dir.x);

      // Casing vertices (Y = 0.48)
      const cL1 = new THREE.Vector3().copy(p1).addScaledVector(norm, casingHalfW);
      const cR1 = new THREE.Vector3().copy(p1).addScaledVector(norm, -casingHalfW);
      const cL2 = new THREE.Vector3().copy(p2).addScaledVector(norm, casingHalfW);
      const cR2 = new THREE.Vector3().copy(p2).addScaledVector(norm, -casingHalfW);

      casingVerts.push(
        cL1.x, 0.48, cL1.z,
        cR1.x, 0.48, cR1.z,
        cL2.x, 0.48, cL2.z,
        cR1.x, 0.48, cR1.z,
        cR2.x, 0.48, cR2.z,
        cL2.x, 0.48, cL2.z
      );

      // Inner Ribbon vertices (Y = 0.54)
      const rL1 = new THREE.Vector3().copy(p1).addScaledVector(norm, ribbonHalfW);
      const rR1 = new THREE.Vector3().copy(p1).addScaledVector(norm, -ribbonHalfW);
      const rL2 = new THREE.Vector3().copy(p2).addScaledVector(norm, ribbonHalfW);
      const rR2 = new THREE.Vector3().copy(p2).addScaledVector(norm, -ribbonHalfW);

      ribbonVerts.push(
        rL1.x, 0.54, rL1.z,
        rR1.x, 0.54, rR1.z,
        rL2.x, 0.54, rL2.z,
        rR1.x, 0.54, rR1.z,
        rR2.x, 0.54, rR2.z,
        rL2.x, 0.54, rL2.z
      );

      const u1 = i / (numSteps / Math.max(3, totalDist / 18));
      const u2 = (i + 1) / (numSteps / Math.max(3, totalDist / 18));

      ribbonUvs.push(
        u1, 0,
        u1, 1,
        u2, 0,
        u1, 1,
        u2, 1,
        u2, 0
      );
    }

    casingGeo.setAttribute('position', new THREE.Float32BufferAttribute(casingVerts, 3));
    const casingMat = new THREE.MeshBasicMaterial({
      color: 0x09254a, // Deep Navy Border
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const casingMesh = new THREE.Mesh(casingGeo, casingMat);
    casingMesh.renderOrder = 998;
    this.routeLineGroup.add(casingMesh);

    ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonVerts, 3));
    ribbonGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ribbonUvs, 2));

    this.chevronTexture = this.createDirectionalChevronTexture();
    const ribbonMat = new THREE.MeshBasicMaterial({
      map: this.chevronTexture,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribbonMesh.renderOrder = 999;
    this.routeLineGroup.add(ribbonMesh);

    // ── C. Core Electric Laser Spine Tube (r = 0.22m, Y = 0.65m) ───────────────
    const tubularSegments = Math.max(64, points.length * 6);
    const coreGeo = new THREE.TubeGeometry(this.curve, tubularSegments, 0.22, 8, false);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, // Electric Cyan laser beam
      depthTest: true,
      depthWrite: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = 0.65;
    coreMesh.renderOrder = 1000;
    this.routeLineGroup.add(coreMesh);

    // ── D. 3D Turn Maneuver Direction Decals along Route ───────────────────────
    if (route.steps && route.steps.length > 0) {
      this.renderTurnManeuvers(route.steps);
    }

    // ── E. Build 3D Navigation Vehicle (Car Cursor) ───────────────────────────
    this.buildNavigationCar();

    this.driveProgress = 0.0;
  }

  // ── 4. Render Turn Direction Decals on Ground at Intersections ────────────────
  private renderTurnManeuvers(steps: RouteStep[]): void {
    if (!this.curve) return;

    let accumDist = 0;
    const totalDist = this.activeRoute?.distanceMeters || 1000;

    steps.forEach((step, idx) => {
      accumDist += step.distanceMeters;
      if (idx === steps.length - 1) return;

      const progress = Math.min(0.98, accumDist / totalDist);
      const pos = this.curve!.getPointAt(progress);

      const instruction = (step.instruction || '').toLowerCase();
      let arrowSymbol = '↑';
      let arrowColor = '#38bdf8';
      if (instruction.includes('left')) {
        arrowSymbol = '↰ LEFT';
        arrowColor = '#10b981';
      } else if (instruction.includes('right')) {
        arrowSymbol = '↱ RIGHT';
        arrowColor = '#f59e0b';
      } else if (instruction.includes('roundabout') || instruction.includes('circle')) {
        arrowSymbol = '↻ CIRCLE';
        arrowColor = '#ec4899';
      }

      // Create floating Turn Badge Sprite
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 96;
      const ctx = canvas.getContext('2d')!;

      ctx.beginPath();
      ctx.roundRect(10, 10, 236, 76, 12);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = arrowColor;
      ctx.stroke();

      ctx.font = 'bold 32px sans-serif';
      ctx.fillStyle = arrowColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(arrowSymbol, 128, 48);

      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(pos.x, pos.y + 2.8, pos.z);
      sprite.scale.set(12, 4.5, 1);
      this.turnDecalsGroup.add(sprite);
    });
  }

  // ── 5. Build 3D Navigation Vehicle (Electric Cruiser with Headlights) ──────────
  private buildNavigationCar(): void {
    while (this.vehicleGroup.children.length > 0) {
      this.vehicleGroup.remove(this.vehicleGroup.children[0]);
    }

    const car = new THREE.Group();

    // Chassis
    const chassisGeo = new THREE.BoxGeometry(2.2, 0.7, 4.2);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      metalness: 0.6,
      roughness: 0.3,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.45;
    car.add(chassis);

    // Cabin / Windshield
    const cabinGeo = new THREE.BoxGeometry(1.8, 0.6, 2.3);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.9,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.95, -0.2);
    car.add(cabin);

    // Front Headlights
    const hlGeo = new THREE.BoxGeometry(0.5, 0.16, 0.1);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    const hlLeft = new THREE.Mesh(hlGeo, hlMat);
    hlLeft.position.set(-0.75, 0.45, 2.12);
    car.add(hlLeft);

    const hlRight = new THREE.Mesh(hlGeo, hlMat);
    hlRight.position.set(0.75, 0.45, 2.12);
    car.add(hlRight);

    // Real dynamic headlight beam projecting forward
    this.carHeadlight = new THREE.PointLight(0x60a5fa, 8.0, 45);
    this.carHeadlight.position.set(0, 0.6, 3.2);
    car.add(this.carHeadlight);

    // Rear Taillights
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tlLeft = new THREE.Mesh(hlGeo, tlMat);
    tlLeft.position.set(-0.75, 0.45, -2.12);
    car.add(tlLeft);

    const tlRight = new THREE.Mesh(hlGeo, tlMat);
    tlRight.position.set(0.75, 0.45, -2.12);
    car.add(tlRight);

    // Floating 3D Directional Arrow above the car
    const arrowGeo = new THREE.ConeGeometry(0.9, 2.2, 4);
    arrowGeo.rotateX(Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.set(0, 2.8, 0);
    car.add(arrow);

    // Neon Underglow Ring on Asphalt
    const underGeo = new THREE.RingGeometry(1.5, 2.4, 16);
    underGeo.rotateX(-Math.PI / 2);
    const underMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const underglow = new THREE.Mesh(underGeo, underMat);
    underglow.position.y = 0.08;
    car.add(underglow);

    this.carMeshGroup = car;
    this.vehicleGroup.add(car);

    if (this.curve) {
      const startPos = this.curve.getPointAt(0);
      const startTan = this.curve.getTangentAt(0);
      this.carMeshGroup.position.copy(startPos);
      const angle = Math.atan2(startTan.x, startTan.z);
      this.carMeshGroup.rotation.y = angle;
    }
  }

  // ── 6. Driving Simulation Controls ──────────────────────────────────────────
  startDrive(speedKmh = 45): void {
    this.isDriving = true;
    this.driveSpeedKmh = speedKmh;
  }

  pauseDrive(): void {
    this.isDriving = false;
  }

  resumeDrive(): void {
    this.isDriving = true;
  }

  resetDrive(): void {
    this.driveProgress = 0.0;
    if (this.curve && this.carMeshGroup) {
      const pos = this.curve.getPointAt(0);
      const tan = this.curve.getTangentAt(0);
      this.carMeshGroup.position.copy(pos);
      this.carMeshGroup.rotation.y = Math.atan2(tan.x, tan.z);
    }
  }

  setDriveCameraMode(mode: 'follow' | 'overview'): void {
    this.driveCameraMode = mode;
  }

  getDrivingTransform(): {
    position: THREE.Vector3;
    tangent: THREE.Vector3;
    progress: number;
    speedKmh: number;
    currentStep: RouteStep | null;
  } | null {
    if (!this.curve || !this.carMeshGroup) return null;

    const pos = this.curve.getPointAt(this.driveProgress);
    const tan = this.curve.getTangentAt(this.driveProgress);

    // Find current step along the route
    let currentStep: RouteStep | null = null;
    if (this.activeRoute?.steps) {
      const totalDist = this.activeRoute.distanceMeters || 1;
      let accum = 0;
      for (const step of this.activeRoute.steps) {
        accum += step.distanceMeters;
        if (this.driveProgress <= accum / totalDist) {
          currentStep = step;
          break;
        }
      }
    }

    return {
      position: pos,
      tangent: tan,
      progress: this.driveProgress,
      speedKmh: this.driveSpeedKmh,
      currentStep,
    };
  }

  // ── 7. Animation Loop Update ────────────────────────────────────────────────
  update(delta: number, elapsedTime: number): void {
    // A. Pulse radar rings around major circles
    this.radarRings.forEach((r) => {
      const s = 1.0 + ((elapsedTime * r.speed) % 1.5);
      r.mesh.scale.set(s, s, s);
      const mat = r.mesh.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = Math.max(0, 0.65 * (1 - (s - 1.0) / 1.5));
      }
    });

    // B. Smooth floating animation on location symbols
    this.floatingPlaces.forEach((fp) => {
      fp.group.position.y = fp.baseY + Math.sin(elapsedTime * 2.8 + fp.phase) * 0.75;
    });

    // C. Scroll directional chevron texture along route line
    if (this.chevronTexture) {
      const flowRate = this.isDriving ? 0.9 : 0.45;
      this.chevronTexture.offset.x -= delta * flowRate;
    }

    // D. Animate Navigation Car along route curve
    if (this.curve && this.carMeshGroup) {
      if (this.isDriving) {
        const totalDistMeters = Math.max(100, this.activeRoute?.distanceMeters || 1000);
        // speed: m/s = kmh / 3.6
        const speedMs = (this.driveSpeedKmh * 1000) / 3600;
        const progressDelta = (speedMs * delta) / totalDistMeters;

        this.driveProgress += progressDelta;
        if (this.driveProgress >= 1.0) {
          this.driveProgress = 1.0;
          this.isDriving = false; // Finished trip!
        }
      }

      const carPos = this.curve.getPointAt(this.driveProgress);
      const carTan = this.curve.getTangentAt(this.driveProgress);

      this.carMeshGroup.position.set(carPos.x, carPos.y, carPos.z);
      const targetAngle = Math.atan2(carTan.x, carTan.z);
      this.carMeshGroup.rotation.y = targetAngle;
    }
  }

  getInteractivePlaceObjects(): THREE.Object3D[] {
    return this.placesGroup.children;
  }

  getBeaconWorldPosition(): THREE.Vector3 | null {
    if (this.curve && this.carMeshGroup) {
      return this.carMeshGroup.position.clone();
    }
    return null;
  }

  getRouteBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
    if (!this.curve) return null;
    const pts = this.curve.getPoints(40);
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    pts.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    });

    return { minX, maxX, minZ, maxZ };
  }

  clearRoute(): void {
    this.curve = null;
    this.activeRoute = null;
    this.isDriving = false;
    this.driveProgress = 0.0;

    while (this.routeLineGroup.children.length > 0) {
      const c = this.routeLineGroup.children[0];
      this.routeLineGroup.remove(c);
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material.dispose();
      }
    }

    while (this.turnDecalsGroup.children.length > 0) {
      const c = this.turnDecalsGroup.children[0];
      this.turnDecalsGroup.remove(c);
      if (c instanceof THREE.Sprite) {
        c.material.dispose();
      }
    }

    while (this.vehicleGroup.children.length > 0) {
      const c = this.vehicleGroup.children[0];
      this.vehicleGroup.remove(c);
    }
    this.carMeshGroup = null;
  }

  clear(): void {
    this.clearRoute();
    while (this.placesGroup.children.length > 0) {
      const c = this.placesGroup.children[0];
      this.placesGroup.remove(c);
    }
  }
}
