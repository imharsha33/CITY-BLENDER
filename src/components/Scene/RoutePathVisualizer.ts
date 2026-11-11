import * as THREE from 'three';
import type { RealPlace } from '../../data/cityPlaces';
import type { RouteCalculationResult } from '../../engine/RealRouteEngine';
import { GeoCoordinateSystem } from '../../engine/GeoCoordinateSystem';

export class RoutePathVisualizer {
  rootGroup: THREE.Group;
  private placesGroup: THREE.Group;
  private routeLineGroup: THREE.Group;
  private beaconGroup: THREE.Group;

  private curve: THREE.CatmullRomCurve3 | null = null;
  private travelProgress = 0;
  private beaconMesh: THREE.Mesh | null = null;
  private beaconLight: THREE.PointLight | null = null;
  private trailMeshes: THREE.Mesh[] = [];
  private mainBeaconGroup: THREE.Group | null = null;

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

    this.beaconGroup = new THREE.Group();
    this.beaconGroup.name = 'route-travel-beacon-group';
    this.rootGroup.add(this.beaconGroup);
  }

  // ── 1. Render Google Maps Style Location Pins & Place Names Popping On Top ──
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

      // Color scheme: Emerald for Origin, Crimson for Dest, Amber/Red for Major Circles, Classic Google Blue for regular
      let hexColor = place.isMajorCircle ? '#ea4335' : '#1a73e8';
      let primaryColorNum = place.isMajorCircle ? 0xea4335 : 0x1a73e8;
      if (isOrigin) {
        hexColor = '#0f9d58';
        primaryColorNum = 0x0f9d58; // Google Emerald
      } else if (isDest) {
        hexColor = '#dc2626';
        primaryColorNum = 0xdc2626; // Google Red / Crimson
      }

      const placeRoot = new THREE.Group();
      placeRoot.position.set(world.x, 0, world.z);
      placeRoot.userData = { place };

      // A. Ground Plinth & Target Disc on Asphalt
      const plinthGeo = new THREE.CylinderGeometry(2.6, 3.2, 0.22, 24);
      const plinthMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.8,
        metalness: 0.2,
      });
      const plinth = new THREE.Mesh(plinthGeo, plinthMat);
      plinth.position.y = 0.11;
      plinth.receiveShadow = true;
      placeRoot.add(plinth);

      // Inner Ground Ring
      const ringGeo = new THREE.RingGeometry(1.4, 2.3, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: primaryColorNum,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.23;
      placeRoot.add(ring);

      // Radar Sonar Wave (animated outward on ground)
      const radarGeo = new THREE.RingGeometry(2.5, 3.8, 32);
      radarGeo.rotateX(-Math.PI / 2);
      const radarMat = new THREE.MeshBasicMaterial({
        color: primaryColorNum,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        opacity: 0.45,
      });
      const radar = new THREE.Mesh(radarGeo, radarMat);
      radar.position.y = 0.24;
      placeRoot.add(radar);
      this.radarRings.push({ mesh: radar, baseScale: 1.0, speed: place.isMajorCircle ? 1.6 : 1.2 });

      // B. Vertical Locator Beam / Pin Stem connecting ground to elevated pin
      const pinAltitude = isOrigin || isDest ? 18.5 : 15.5;
      const stemGeo = new THREE.CylinderGeometry(0.12, 0.24, pinAltitude, 12);
      const stemMat = new THREE.MeshBasicMaterial({
        color: primaryColorNum,
        transparent: true,
        opacity: 0.75,
      });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = pinAltitude / 2;
      placeRoot.add(stem);

      // C. Elevated Google Maps Teardrop Pin & Place Name Badge (Popping on top)
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

  /**
   * Generates a high-resolution Google Maps style location teardrop pin & place name badge.
   * Rendered with depthTest=false so it is ALWAYS visible on top of buildings.
   */
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

    // 1. Draw Google Maps Teardrop Location Symbol
    const pinX = 90;
    const pinBulbY = 80;
    const pinRadius = 38;
    const pinTipY = 188;

    // Drop shadow under pin
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;

    // Outer teardrop path
    ctx.beginPath();
    ctx.arc(pinX, pinBulbY, pinRadius, Math.PI * 0.82, Math.PI * 0.18, false);
    ctx.lineTo(pinX, pinTipY);
    ctx.closePath();

    ctx.fillStyle = pinColor;
    ctx.fill();
    ctx.restore();

    // Subtle white outline on teardrop pin
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Inner White Dot Circle (classic Google Map marker center)
    ctx.beginPath();
    ctx.arc(pinX, pinBulbY, pinRadius * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // 2. Draw Floating Google Maps Place Name Card / Pill
    const cardX = 148;
    const cardY = 24;
    const cardW = 590;
    const cardH = 110;
    const cardR = 14;

    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.42)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 7;

    // Rounded card background
    ctx.beginPath();
    ctx.moveTo(cardX + cardR, cardY);
    ctx.lineTo(cardX + cardW - cardR, cardY);
    ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + cardR);
    ctx.lineTo(cardX + cardW, cardY + cardH - cardR);
    ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - cardR, cardY + cardH);
    ctx.lineTo(cardX + cardR, cardY + cardH);
    ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - cardR);
    ctx.lineTo(cardX, cardY + cardR);
    ctx.quadraticCurveTo(cardX, cardY, cardX + cardR, cardY);
    ctx.closePath();

    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    // Left color indicator bar on card
    ctx.fillStyle = pinColor;
    ctx.beginPath();
    ctx.moveTo(cardX + cardR, cardY);
    ctx.lineTo(cardX + 10, cardY);
    ctx.lineTo(cardX + 10, cardY + cardH);
    ctx.lineTo(cardX + cardR, cardY + cardH);
    ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - cardR);
    ctx.lineTo(cardX, cardY + cardR);
    ctx.quadraticCurveTo(cardX, cardY, cardX + cardR, cardY);
    ctx.closePath();
    ctx.fill();

    // Card border
    ctx.lineWidth = 3;
    ctx.strokeStyle = isOrigin ? '#10b981' : isDest ? '#f43f5e' : '#cbd5e1';
    ctx.stroke();

    // Category / Status Tag
    let categoryTag = 'LOCATION';
    let tagColor = '#64748b';
    if (isOrigin) {
      categoryTag = '📍 START';
      tagColor = '#059669';
    } else if (isDest) {
      categoryTag = '🏁 DEST';
      tagColor = '#dc2626';
    } else if (place.isMajorCircle) {
      categoryTag = '● CIRCLE';
      tagColor = '#d97706';
    }

    ctx.fillStyle = tagColor;
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(categoryTag, cardX + 22, cardY + 14);

    // Place Name Heading (Bold, clean, Google Maps style)
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Ellipsize long names if needed
    let displayName = place.name;
    const maxW = cardW - 36;
    while (ctx.measureText(displayName).width > maxW && displayName.length > 3) {
      displayName = displayName.slice(0, -1);
    }
    if (displayName.length < place.name.length) displayName += '…';
    ctx.fillText(displayName, cardX + 22, cardY + 50);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false, // Ensures pins and labels pop on TOP of all buildings
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.renderOrder = 9999;
    sprite.scale.set(55.0, 17.0, 1);
    sprite.position.set(9.0, 2.0, 0);

    return sprite;
  }

  // ── 2. Render Thicker, Darker Glowing Blue Route Line ────────────────────────
  renderRoute(route: RouteCalculationResult): void {
    this.clearRoute();
    if (!route.worldPath || route.worldPath.length < 2) return;

    // Filter coincident/duplicate consecutive points to prevent Frenet frame singularities
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < route.worldPath.length; i++) {
      const p = route.worldPath[i];
      if (points.length === 0 || p.distanceTo(points[points.length - 1]) > 0.05) {
        points.push(p);
      }
    }
    if (points.length < 2) return;

    // Create a smooth 3D CatmullRom spline from road vertices
    this.curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.15);

    const tubularSegments = Math.max(64, points.length * 8);

    // Increased line widths: wide, prominent and bold
    const radiusAura = 1.75;  // Outer deep glowing aura corona
    const radiusOuter = 1.15; // Wide primary glowing tube (doubled width)
    const radiusCore = 0.52;  // Dense saturated inner laser core

    // A. Outer Deep Glowing Corona (Dark Electric Blue)
    const auraGeo = new THREE.TubeGeometry(this.curve, tubularSegments, radiusAura, 12, false);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x0022cc, // Deep dark royal electric blue
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    auraMesh.position.y = 0.22;
    this.routeLineGroup.add(auraMesh);

    // B. Primary Glowing Tube (Rich Dark Royal Blue Glow)
    const outerGeo = new THREE.TubeGeometry(this.curve, tubularSegments, radiusOuter, 12, false);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x0044ff, // Rich saturated electric royal blue
      transparent: true,
      opacity: 0.90,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.position.y = 0.22;
    this.routeLineGroup.add(outerMesh);

    // C. Inner Core Laser Beam (Intense Electric Sapphire Core)
    const coreGeo = new THREE.TubeGeometry(this.curve, tubularSegments, radiusCore, 8, false);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x0099ff, // Saturated electric sapphire core
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = 0.22;
    this.routeLineGroup.add(coreMesh);

    // D. Ground Asphalt Projection Glow Ribbon (Wide Dark Blue Glow on Road Surface)
    const ribbonPts = this.curve.getPoints(tubularSegments);
    const ribbonGeo = new THREE.BufferGeometry();
    const ribbonVertices: number[] = [];
    const ribbonHalfW = 2.8; // Doubled ground glow width

    for (let i = 0; i < ribbonPts.length - 1; i++) {
      const p1 = ribbonPts[i];
      const p2 = ribbonPts[i + 1];
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      const norm = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      const l1 = new THREE.Vector3().copy(p1).addScaledVector(norm, ribbonHalfW);
      const r1 = new THREE.Vector3().copy(p1).addScaledVector(norm, -ribbonHalfW);
      const l2 = new THREE.Vector3().copy(p2).addScaledVector(norm, ribbonHalfW);
      const r2 = new THREE.Vector3().copy(p2).addScaledVector(norm, -ribbonHalfW);

      ribbonVertices.push(
        l1.x, 0.16, l1.z,
        r1.x, 0.16, r1.z,
        l2.x, 0.16, l2.z,
        r1.x, 0.16, r1.z,
        r2.x, 0.16, r2.z,
        l2.x, 0.16, l2.z
      );
    }

    ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonVertices, 3));
    const ribbonMat = new THREE.MeshBasicMaterial({
      color: 0x002288, // Dark saturated blue asphalt projection
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
    this.routeLineGroup.add(ribbonMesh);

    // E. Animated Travelling Sapphire Energy Pulse with Trailing Comets
    const beaconGroup = new THREE.Group();

    // Primary energy orb
    const bGeo = new THREE.SphereGeometry(1.1, 16, 16);
    const bMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.98,
    });
    this.beaconMesh = new THREE.Mesh(bGeo, bMat);
    beaconGroup.add(this.beaconMesh);

    // Outer glow aura
    const bAuraGeo = new THREE.SphereGeometry(2.4, 16, 16);
    const bAuraMat = new THREE.MeshBasicMaterial({
      color: 0x0044ff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const bAura = new THREE.Mesh(bAuraGeo, bAuraMat);
    beaconGroup.add(bAura);

    // Dynamic light point illuminating the road as it glides
    this.beaconLight = new THREE.PointLight(0x0055ff, 5.0, 45);
    beaconGroup.add(this.beaconLight);

    const startPos = this.curve.getPointAt(0);
    beaconGroup.position.copy(startPos);
    this.mainBeaconGroup = beaconGroup;
    this.beaconGroup.add(beaconGroup);

    // Trailing comet particle orbs
    this.trailMeshes = [];
    const trailOffsets = [0.016, 0.032, 0.048, 0.064];
    trailOffsets.forEach((_, tIdx) => {
      const trailGeo = new THREE.SphereGeometry(0.72 - tIdx * 0.12, 10, 10);
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0x0055ff,
        transparent: true,
        opacity: 0.85 - tIdx * 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const trailMesh = new THREE.Mesh(trailGeo, trailMat);
      trailMesh.position.copy(startPos);
      this.trailMeshes.push(trailMesh);
      this.beaconGroup.add(trailMesh);
    });

    this.travelProgress = 0;
  }

  // ── 3. Animation Loop Update ────────────────────────────────────────────────
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

    // B. Smooth floating "popping" animation on Google Maps location symbols
    this.floatingPlaces.forEach((fp) => {
      fp.group.position.y = fp.baseY + Math.sin(elapsedTime * 2.8 + fp.phase) * 0.75;
    });

    // C. Travel light beacon along the glowing blue route
    if (this.curve && this.mainBeaconGroup) {
      // Speed: completes one full transit in ~6.5 seconds
      this.travelProgress += delta * 0.15;
      if (this.travelProgress > 1.0) {
        this.travelProgress = 0.0;
      }

      const pos = this.curve.getPointAt(this.travelProgress);
      this.mainBeaconGroup.position.set(pos.x, pos.y + 0.35, pos.z);

      // Trailing particles follow behind on the curve
      const trailOffsets = [0.018, 0.036, 0.054, 0.072];
      this.trailMeshes.forEach((mesh, idx) => {
        let tTrail = this.travelProgress - trailOffsets[idx];
        if (tTrail < 0) tTrail += 1.0;
        const trailPos = this.curve!.getPointAt(tTrail);
        mesh.position.set(trailPos.x, trailPos.y + 0.3, trailPos.z);
      });

      // Pulse beacon glow
      if (this.beaconMesh) {
        const pulse = 1.0 + Math.sin(elapsedTime * 7) * 0.22;
        this.beaconMesh.scale.set(pulse, pulse, pulse);
      }
    }
  }

  getInteractivePlaceObjects(): THREE.Object3D[] {
    return this.placesGroup.children;
  }

  getBeaconWorldPosition(): THREE.Vector3 | null {
    if (this.curve && this.mainBeaconGroup) {
      return this.mainBeaconGroup.position.clone();
    }
    return null;
  }

  getRouteBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
    if (!this.curve) return null;
    const pts = this.curve.getPoints(50);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
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
    this.travelProgress = 0;
    this.mainBeaconGroup = null;
    this.trailMeshes = [];
    while (this.routeLineGroup.children.length > 0) {
      const c = this.routeLineGroup.children[0];
      this.routeLineGroup.remove(c);
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material.dispose();
      }
    }
    while (this.beaconGroup.children.length > 0) {
      const c = this.beaconGroup.children[0];
      this.beaconGroup.remove(c);
    }
  }

  clear(): void {
    this.clearRoute();
    while (this.placesGroup.children.length > 0) {
      const c = this.placesGroup.children[0];
      this.placesGroup.remove(c);
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material.dispose();
      }
    }
    this.radarRings = [];
    this.floatingPlaces = [];
  }
}
