import * as THREE from 'three';
import type {
  AnalysisResultResponse,
  InfrastructureIssue,
  RoadAnalysisItem,
  JunctionAnalysisItem,
  AnalysisFilterType,
} from '../../types/analysis';
import { GeoCoordinateSystem } from '../../engine/GeoCoordinateSystem';

// Engineering visualization severity colors (restrained, non-neon)
const SEVERITY_COLORS = {
  CRITICAL: 0xd32f2f, // Deep Red
  HIGH:     0xe65100, // Rich Orange
  MEDIUM:   0xd48817, // Amber
  SPINE:    0x2c7da0, // Slate Blue / Cyan corridor
  NEUTRAL:  0x4a4e57,
};

export class AnalysisVisualizer {
  rootGroup: THREE.Group;
  private roadHighlightsGroup: THREE.Group;
  private junctionMarkersGroup: THREE.Group;
  private issueMarkersGroup: THREE.Group;

  private currentData: AnalysisResultResponse | null = null;
  private coordSystem: GeoCoordinateSystem | null = null;
  private filter: AnalysisFilterType = 'ALL';

  // Interactive raycast targets
  interactiveObjects: THREE.Object3D[] = [];

  constructor() {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'analysis-visualizer-root';

    this.roadHighlightsGroup = new THREE.Group();
    this.roadHighlightsGroup.name = 'analysis-road-highlights';
    this.rootGroup.add(this.roadHighlightsGroup);

    this.junctionMarkersGroup = new THREE.Group();
    this.junctionMarkersGroup.name = 'analysis-junction-markers';
    this.rootGroup.add(this.junctionMarkersGroup);

    this.issueMarkersGroup = new THREE.Group();
    this.issueMarkersGroup.name = 'analysis-issue-markers';
    this.rootGroup.add(this.issueMarkersGroup);

    this.rootGroup.visible = false;
  }

  buildVisuals(data: AnalysisResultResponse, coordSystem: GeoCoordinateSystem): void {
    this.clear();
    this.currentData = data;
    this.coordSystem = coordSystem;

    // 1. Build Road Highlights ONLY for Problematic Segments & Critical Spines
    data.roadAnalysis.forEach((road) => {
      if (road.geometry.length < 2) return;

      const isCritical = road.bottleneckCategory === 'CRITICAL' || road.vcRatio >= 1.0;
      const isHigh = road.bottleneckCategory === 'HIGH' || (road.vcRatio >= 0.85 && road.vcRatio < 1.0);
      const isMedium = road.bottleneckCategory === 'POTENTIAL' || (road.vcRatio >= 0.70 && road.vcRatio < 0.85);
      const isSpine = road.networkImportance >= 80;

      // Normal roads remain clean neutral asphalt; only highlight issues or spines
      if (!isCritical && !isHigh && !isMedium && !isSpine) return;

      let colorHex = SEVERITY_COLORS.MEDIUM;
      let opacity = 0.75;
      let layerY = 0.08;

      if (isCritical) {
        colorHex = SEVERITY_COLORS.CRITICAL;
        opacity = 0.85;
        layerY = 0.12;
      } else if (isHigh) {
        colorHex = SEVERITY_COLORS.HIGH;
        opacity = 0.80;
        layerY = 0.10;
      } else if (isMedium) {
        colorHex = SEVERITY_COLORS.MEDIUM;
        opacity = 0.70;
        layerY = 0.08;
      } else if (isSpine) {
        colorHex = SEVERITY_COLORS.SPINE;
        opacity = 0.65;
        layerY = 0.07;
      }

      const worldPoints = road.geometry.map(([lat, lon]) =>
        coordSystem.geoToWorld(lat, lon, layerY)
      );

      const halfWidth = (road.lanes * 1.7) + (isCritical ? 0.6 : 0.2);
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

      const mat = new THREE.MeshLambertMaterial({
        color: colorHex,
        transparent: true,
        opacity,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `analysis-road-${road.roadId}`;
      mesh.userData = {
        type: 'road',
        roadId: road.roadId,
        roadData: road,
        isCritical,
        isHigh,
        isMedium,
        isSpine,
      };

      this.roadHighlightsGroup.add(mesh);
      this.interactiveObjects.push(mesh);
    });

    // 2. Build Junction Highlights (Actual Intersection Ground Markers)
    data.junctionAnalysis.forEach((junction) => {
      if (junction.junctionScore < 35 && junction.congestionClass === 'A') return;

      const [lat, lon] = junction.coordinate;
      const worldPos = coordSystem.geoToWorld(lat, lon, 0.1);

      let junctionColor = SEVERITY_COLORS.MEDIUM;
      if (junction.junctionScore >= 70) junctionColor = SEVERITY_COLORS.CRITICAL;
      else if (junction.junctionScore >= 50) junctionColor = SEVERITY_COLORS.HIGH;

      const junctionGroup = new THREE.Group();
      junctionGroup.position.set(worldPos.x, 0.1, worldPos.z);

      // Ground disc marker
      const discGeo = new THREE.RingGeometry(1.2, 3.8 + Math.min(junction.armCount * 0.5, 3.0), 24);
      const discMat = new THREE.MeshBasicMaterial({
        color: junctionColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.60,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = Math.PI / 2;
      junctionGroup.add(disc);

      // Center node indicator
      const dotGeo = new THREE.CircleGeometry(1.1, 16);
      const dotMat = new THREE.MeshBasicMaterial({
        color: 0x1e2124,
        side: THREE.DoubleSide,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.rotation.x = Math.PI / 2;
      dot.position.y = 0.02;
      junctionGroup.add(dot);

      junctionGroup.userData = {
        type: 'junction',
        junctionId: junction.id,
        junctionData: junction,
        ringMesh: disc,
      };

      this.junctionMarkersGroup.add(junctionGroup);
      this.interactiveObjects.push(disc);
    });

    // 3. Build Minimal Engineering Issue Annotations
    data.issues.forEach((issue) => {
      const [lat, lon] = issue.location;
      const worldPos = coordSystem.geoToWorld(lat, lon, 0);

      const markerGroup = new THREE.Group();
      markerGroup.position.set(worldPos.x, 0, worldPos.z);

      let colorHex = SEVERITY_COLORS.MEDIUM;
      if (issue.severity === 'CRITICAL') colorHex = SEVERITY_COLORS.CRITICAL;
      else if (issue.severity === 'HIGH') colorHex = SEVERITY_COLORS.HIGH;

      // Slender engineering stem
      const stemHeight = 3.2;
      const stemGeo = new THREE.CylinderGeometry(0.06, 0.06, stemHeight, 6);
      const stemMat = new THREE.MeshLambertMaterial({ color: 0x4a4e57 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = stemHeight / 2;
      markerGroup.add(stem);

      // Geometric head based on issue classification:
      // ● Capacity: Sphere
      // ◆ Bottleneck: Octahedron
      // ○ Junction: Torus
      // ◇ Spine: Cylinder / Lozenge
      let headGeo: THREE.BufferGeometry;
      if (issue.type === 'CAPACITY_DEFICIENCY') {
        headGeo = new THREE.SphereGeometry(0.42, 12, 10);
      } else if (issue.type === 'BOTTLENECK') {
        headGeo = new THREE.OctahedronGeometry(0.48, 0);
      } else if (issue.type === 'JUNCTION_RISK') {
        headGeo = new THREE.TorusGeometry(0.38, 0.12, 8, 16);
      } else {
        headGeo = new THREE.ConeGeometry(0.42, 0.7, 6);
      }

      const headMat = new THREE.MeshLambertMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.25,
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = stemHeight + 0.35;
      if (issue.type === 'JUNCTION_RISK') head.rotation.x = Math.PI / 4;
      markerGroup.add(head);

      // Subtle base point
      const baseGeo = new THREE.CircleGeometry(0.5, 12);
      const baseMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      });
      const baseCircle = new THREE.Mesh(baseGeo, baseMat);
      baseCircle.rotation.x = Math.PI / 2;
      baseCircle.position.y = 0.05;
      markerGroup.add(baseCircle);

      markerGroup.userData = {
        type: 'issue',
        issueId: issue.id,
        issueData: issue,
        headMesh: head,
      };

      this.issueMarkersGroup.add(markerGroup);
      this.interactiveObjects.push(head);
    });

    this.rootGroup.visible = true;
    this.applyFilter(this.filter);
  }

  applyFilter(filter: AnalysisFilterType): void {
    this.filter = filter;
    if (!this.currentData) return;

    // Filter Issue Annotations
    this.issueMarkersGroup.children.forEach((child) => {
      const issue: InfrastructureIssue | undefined = child.userData?.issueData;
      if (!issue) return;

      if (filter === 'ALL') {
        child.visible = true;
      } else if (filter === 'BOTTLENECK') {
        child.visible = issue.type === 'BOTTLENECK';
      } else if (filter === 'CAPACITY') {
        child.visible = issue.type === 'CAPACITY_DEFICIENCY';
      } else if (filter === 'JUNCTION') {
        child.visible = issue.type === 'JUNCTION_RISK';
      } else if (filter === 'CONNECTIVITY') {
        child.visible = issue.type === 'NETWORK_CRITICAL_SEGMENT' || issue.type === 'CONNECTIVITY_WEAKNESS';
      }
    });

    // Filter Road Overlays
    this.roadHighlightsGroup.children.forEach((child) => {
      const u = child.userData;
      if (!u) return;

      if (filter === 'ALL') {
        child.visible = true;
      } else if (filter === 'BOTTLENECK') {
        child.visible = !!(u.isCritical || u.isHigh);
      } else if (filter === 'CAPACITY') {
        child.visible = !!(u.roadData?.vcRatio >= 0.85);
      } else if (filter === 'JUNCTION') {
        child.visible = false;
      } else if (filter === 'CONNECTIVITY') {
        child.visible = !!u.isSpine;
      }
    });

    // Filter Junction Markers
    this.junctionMarkersGroup.children.forEach((child) => {
      child.visible = filter === 'ALL' || filter === 'JUNCTION';
    });
  }

  setVisible(visible: boolean): void {
    this.rootGroup.visible = visible;
  }

  updateAnimation(time: number): void {
    // Subtle rotation and calm breathing for engineering markers
    this.issueMarkersGroup.children.forEach((child, i) => {
      const head = child.userData?.headMesh as THREE.Mesh | undefined;
      if (head) {
        head.rotation.y = time * 0.8 + i;
        head.position.y = 3.55 + Math.sin(time * 2.0 + i) * 0.12;
      }
    });

    // Subtle breathing opacity on junction ground rings
    this.junctionMarkersGroup.children.forEach((child, i) => {
      const ring = child.userData?.ringMesh as THREE.Mesh | undefined;
      if (ring && ring.material instanceof THREE.MeshBasicMaterial) {
        ring.material.opacity = 0.50 + Math.sin(time * 2.5 + i) * 0.18;
      }
    });
  }

  clear(): void {
    while (this.roadHighlightsGroup.children.length > 0) {
      const child = this.roadHighlightsGroup.children[0];
      this.roadHighlightsGroup.remove(child);
      if (child instanceof THREE.Mesh) child.geometry?.dispose();
    }

    while (this.junctionMarkersGroup.children.length > 0) {
      const child = this.junctionMarkersGroup.children[0];
      this.junctionMarkersGroup.remove(child);
      if (child instanceof THREE.Group) {
        child.children.forEach(c => {
          if (c instanceof THREE.Mesh) c.geometry?.dispose();
        });
      }
    }

    while (this.issueMarkersGroup.children.length > 0) {
      const child = this.issueMarkersGroup.children[0];
      this.issueMarkersGroup.remove(child);
      if (child instanceof THREE.Group) {
        child.children.forEach(c => {
          if (c instanceof THREE.Mesh) c.geometry?.dispose();
        });
      }
    }

    this.interactiveObjects = [];
    this.currentData = null;
  }
}
