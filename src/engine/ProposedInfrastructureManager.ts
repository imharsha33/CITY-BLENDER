import * as THREE from 'three';
import type { CandidatePlan, ProposedRoadSegment, PlanningViewState } from '../types/planning';
import { GeoCoordinateSystem } from './GeoCoordinateSystem';

// Restrained, professional civil engineering materials
const PROPOSED_ASPHALT_MAT = new THREE.MeshLambertMaterial({
  color: 0x22252a,
});

const PROPOSED_COMPARE_MAT = new THREE.MeshLambertMaterial({
  color: 0x3d2c20, // Warm terracotta / bronze tint in compare mode for immediate visual contrast
});

const CONCRETE_DECK_MAT = new THREE.MeshLambertMaterial({
  color: 0x7a808a,
});

const PIER_CONCRETE_MAT = new THREE.MeshLambertMaterial({
  color: 0x686e78,
});

const BARRIER_MAT = new THREE.MeshLambertMaterial({
  color: 0x9096a2,
});

const PROPOSED_MARKING_MAT = new THREE.MeshBasicMaterial({
  color: 0xffffff,
});

const AMBER_MEDIAN_MAT = new THREE.MeshBasicMaterial({
  color: 0xf39c12,
});

export class ProposedInfrastructureManager {
  rootGroup: THREE.Group;
  private currentPlan: CandidatePlan | null = null;
  private currentViewState: PlanningViewState = 'proposed';
  private coordSystem: GeoCoordinateSystem | null = null;

  constructor() {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'proposed-infrastructure-root';
    this.rootGroup.visible = false;
  }

  buildProposedScene(
    plan: CandidatePlan,
    coordSystem: GeoCoordinateSystem
  ): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
    this.clear();
    this.currentPlan = plan;
    this.coordSystem = coordSystem;

    if (!plan.proposedGeometry || plan.proposedGeometry.length === 0) {
      this.rootGroup.visible = false;
      return null;
    }

    const bounds = this.buildSegments(plan.proposedGeometry, coordSystem);
    this.rootGroup.visible = this.currentViewState.toLowerCase() !== 'existing';
    return bounds;
  }

  buildStrategyScene(
    segments: ProposedRoadSegment[],
    coordSystem: GeoCoordinateSystem
  ): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
    this.clear();
    this.currentPlan = null;
    this.coordSystem = coordSystem;

    if (!segments || segments.length === 0) {
      this.rootGroup.visible = false;
      return null;
    }

    const bounds = this.buildSegments(segments, coordSystem);
    this.rootGroup.visible = this.currentViewState.toLowerCase() !== 'existing';
    return bounds;
  }

  private buildSegments(
    segments: ProposedRoadSegment[],
    coordSystem: GeoCoordinateSystem
  ): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    segments.forEach(seg => {
      if (!seg.geometry || seg.geometry.length < 2) return;

      const worldPoints: THREE.Vector3[] = seg.geometry.map(([lat, lon], idx) => {
        let elev = 0.08; // slightly above base terrain

        if (seg.isElevated) {
          if (seg.type === 'flyover_ramp_up') {
            const t = idx / (seg.geometry.length - 1);
            elev = 0.1 + t * seg.elevationMeters;
          } else if (seg.type === 'flyover_ramp_down') {
            const t = idx / (seg.geometry.length - 1);
            elev = seg.elevationMeters - t * (seg.elevationMeters - 0.1);
          } else {
            elev = seg.elevationMeters;
          }
        }

        const w = coordSystem.geoToWorld(lat, lon, elev);
        if (w.x < minX) minX = w.x;
        if (w.x > maxX) maxX = w.x;
        if (w.z < minZ) minZ = w.z;
        if (w.z > maxZ) maxZ = w.z;

        return w;
      });

      // 1. Build road ribbon surface
      const roadMesh = this.createRoadRibbon(
        worldPoints,
        seg.widthMeters || 12.0,
        seg.isElevated ? CONCRETE_DECK_MAT : PROPOSED_ASPHALT_MAT
      );
      this.rootGroup.add(roadMesh);

      // 2. Add Piers / Pillars if elevated deck
      if (seg.isElevated && seg.type === 'flyover_deck') {
        const pierGroup = this.createSupportPillars(worldPoints, seg.elevationMeters);
        this.rootGroup.add(pierGroup);
      }

      // 3. Add Parapet / Safety Barriers along both edges
      if (seg.isElevated) {
        const barrierGroup = this.createElevatedBarriers(worldPoints, seg.widthMeters || 12.0);
        this.rootGroup.add(barrierGroup);
      }

      // 4. Add crisp engineering markings (center double yellow line + lane white dashed lines)
      const markings = this.createProposedMarkings(worldPoints, seg.lanes || 2, seg.widthMeters || 12.0);
      this.rootGroup.add(markings);

      // 5. Add physical median barrier if configured
      if (seg.hasMedian) {
        const median = this.createMedianBarrier(worldPoints, seg.medianWidth || 1.2);
        this.rootGroup.add(median);
      }
    });

    return isFinite(minX) ? { minX, maxX, minZ, maxZ } : null;
  }

  setViewState(viewState: PlanningViewState): void {
    this.currentViewState = viewState;
    const lower = viewState.toLowerCase();
    if (lower === 'existing') {
      this.rootGroup.visible = false;
    } else {
      this.rootGroup.visible = true;
      // In compare mode, switch materials to warm contrasting tone
      this.rootGroup.traverse(child => {
        if (child instanceof THREE.Mesh && child.userData?.type === 'proposed_road_surface') {
          child.material = lower === 'compare' ? PROPOSED_COMPARE_MAT : PROPOSED_ASPHALT_MAT;
        }
      });
    }
  }

  private createRoadRibbon(
    worldPoints: THREE.Vector3[],
    width: number,
    material: THREE.Material
  ): THREE.Mesh {
    const halfWidth = width / 2.0;
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < worldPoints.length; i++) {
      const p = worldPoints[i];
      let tangent = new THREE.Vector3();

      if (i === 0) {
        tangent.subVectors(worldPoints[1], worldPoints[0]).normalize();
      } else if (i === worldPoints.length - 1) {
        tangent.subVectors(worldPoints[i], worldPoints[i - 1]).normalize();
      } else {
        const t1 = new THREE.Vector3().subVectors(p, worldPoints[i - 1]).normalize();
        const t2 = new THREE.Vector3().subVectors(worldPoints[i + 1], p).normalize();
        tangent.addVectors(t1, t2).normalize();
      }

      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const left = new THREE.Vector3().addVectors(p, normal.clone().multiplyScalar(-halfWidth));
      const right = new THREE.Vector3().addVectors(p, normal.clone().multiplyScalar(halfWidth));

      vertices.push(left.x, left.y, left.z);
      vertices.push(right.x, right.y, right.z);

      if (i < worldPoints.length - 1) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.userData = { type: 'proposed_road_surface' };

    return mesh;
  }

  private createSupportPillars(worldPoints: THREE.Vector3[], deckHeight: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'flyover-piers';

    const pillarGeo = new THREE.CylinderGeometry(1.1, 1.3, deckHeight, 16);
    pillarGeo.translate(0, deckHeight / 2.0, 0);

    // Place pillars every ~35 meters
    let accDist = 0;
    for (let i = 0; i < worldPoints.length - 1; i++) {
      const p1 = worldPoints[i];
      const p2 = worldPoints[i + 1];
      const segLen = p1.distanceTo(p2);

      if (accDist === 0 || accDist >= 35.0) {
        const pier = new THREE.Mesh(pillarGeo, PIER_CONCRETE_MAT);
        pier.position.set(p1.x, 0, p1.z);
        pier.castShadow = true;
        pier.receiveShadow = true;
        group.add(pier);
        accDist = 0;
      }
      accDist += segLen;
    }

    return group;
  }

  private createElevatedBarriers(worldPoints: THREE.Vector3[], width: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'flyover-barriers';
    const halfWidth = width / 2.0;

    const leftPts: THREE.Vector3[] = [];
    const rightPts: THREE.Vector3[] = [];

    for (let i = 0; i < worldPoints.length; i++) {
      const p = worldPoints[i];
      let tangent = new THREE.Vector3();

      if (i === 0) {
        tangent.subVectors(worldPoints[1], worldPoints[0]).normalize();
      } else if (i === worldPoints.length - 1) {
        tangent.subVectors(worldPoints[i], worldPoints[i - 1]).normalize();
      } else {
        const t1 = new THREE.Vector3().subVectors(p, worldPoints[i - 1]).normalize();
        const t2 = new THREE.Vector3().subVectors(worldPoints[i + 1], p).normalize();
        tangent.addVectors(t1, t2).normalize();
      }

      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      leftPts.push(new THREE.Vector3().addVectors(p, normal.clone().multiplyScalar(-halfWidth)).add(new THREE.Vector3(0, 0.4, 0)));
      rightPts.push(new THREE.Vector3().addVectors(p, normal.clone().multiplyScalar(halfWidth)).add(new THREE.Vector3(0, 0.4, 0)));
    }

    const barrierGeoL = new THREE.BufferGeometry().setFromPoints(leftPts);
    const barrierLineL = new THREE.Line(barrierGeoL, BARRIER_MAT);
    group.add(barrierLineL);

    const barrierGeoR = new THREE.BufferGeometry().setFromPoints(rightPts);
    const barrierLineR = new THREE.Line(barrierGeoR, BARRIER_MAT);
    group.add(barrierLineR);

    return group;
  }

  private createProposedMarkings(
    worldPoints: THREE.Vector3[],
    lanes: number,
    width: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'proposed-markings';

    // Center divider stripe
    const centerPts = worldPoints.map(p => new THREE.Vector3(p.x, p.y + 0.04, p.z));
    const centerGeo = new THREE.BufferGeometry().setFromPoints(centerPts);
    const centerLine = new THREE.Line(centerGeo, AMBER_MEDIAN_MAT);
    group.add(centerLine);

    // Multi-lane dividers if lanes >= 4
    if (lanes >= 4) {
      const laneWidth = width / lanes;
      [-laneWidth, laneWidth].forEach(offset => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i < worldPoints.length; i++) {
          const p = worldPoints[i];
          let tangent = new THREE.Vector3();
          if (i === 0) tangent.subVectors(worldPoints[1], worldPoints[0]).normalize();
          else if (i === worldPoints.length - 1) tangent.subVectors(worldPoints[i], worldPoints[i - 1]).normalize();
          else {
            const t1 = new THREE.Vector3().subVectors(p, worldPoints[i - 1]).normalize();
            const t2 = new THREE.Vector3().subVectors(worldPoints[i + 1], p).normalize();
            tangent.addVectors(t1, t2).normalize();
          }
          const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
          pts.push(new THREE.Vector3().addVectors(p, normal.clone().multiplyScalar(offset)).add(new THREE.Vector3(0, 0.04, 0)));
        }
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(lineGeo, PROPOSED_MARKING_MAT);
        group.add(line);
      });
    }

    return group;
  }

  private createMedianBarrier(worldPoints: THREE.Vector3[], medianWidth: number): THREE.Mesh {
    const pts = worldPoints.map(p => new THREE.Vector3(p.x, p.y + 0.25, p.z));
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, pts.length * 4, medianWidth / 2.0, 6, false);
    tube.scale(1, 0.4, 1); // Flatten into jersey barrier profile
    const mesh = new THREE.Mesh(tube, CONCRETE_DECK_MAT);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  clear(): void {
    while (this.rootGroup.children.length > 0) {
      const child = this.rootGroup.children[0];
      this.rootGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
      }
    }
    this.currentPlan = null;
  }
}
