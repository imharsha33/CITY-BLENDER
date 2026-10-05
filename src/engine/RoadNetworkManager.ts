import * as THREE from 'three';
import type { RoadSegmentGeo } from '../types/geo';
import { GeoCoordinateSystem } from './GeoCoordinateSystem';

// Visual hierarchy styling for civil engineering GIS digital twins
interface RoadHierarchyStyle {
  width: number;
  asphaltColor: number;
  centerlineColor: number;
  layerElevation: number;
  hasMarkings: boolean;
  markingDashed: boolean;
}

const HIERARCHY_STYLES: Record<string, RoadHierarchyStyle> = {
  motorway: {
    width: 14.0,
    asphaltColor: 0x1a1d21,
    centerlineColor: 0xf59e0b, // Amber national highway
    layerElevation: 0.08,
    hasMarkings: true,
    markingDashed: false,
  },
  trunk: {
    width: 12.0,
    asphaltColor: 0x1f2227,
    centerlineColor: 0x38bdf8, // Sky blue arterial
    layerElevation: 0.07,
    hasMarkings: true,
    markingDashed: false,
  },
  primary: {
    width: 10.0,
    asphaltColor: 0x24282f,
    centerlineColor: 0xe2e8f0, // Crisp white primary
    layerElevation: 0.06,
    hasMarkings: true,
    markingDashed: false,
  },
  secondary: {
    width: 8.0,
    asphaltColor: 0x2a2f38,
    centerlineColor: 0x94a3b8, // Slate secondary
    layerElevation: 0.05,
    hasMarkings: true,
    markingDashed: true,
  },
  tertiary: {
    width: 6.5,
    asphaltColor: 0x303641,
    centerlineColor: 0x64748b, // Muted tertiary
    layerElevation: 0.04,
    hasMarkings: false,
    markingDashed: false,
  },
  residential: {
    width: 5.5,
    asphaltColor: 0x363d4a,
    centerlineColor: 0x475569, // Local neighborhood
    layerElevation: 0.03,
    hasMarkings: false,
    markingDashed: false,
  },
  service: {
    width: 4.0,
    asphaltColor: 0x3c4352,
    centerlineColor: 0x334155, // Service / alley
    layerElevation: 0.02,
    hasMarkings: false,
    markingDashed: false,
  },
  unclassified: {
    width: 5.5,
    asphaltColor: 0x333946,
    centerlineColor: 0x64748b,
    layerElevation: 0.03,
    hasMarkings: false,
    markingDashed: false,
  },
  default: {
    width: 5.5,
    asphaltColor: 0x2f3542,
    centerlineColor: 0x64748b,
    layerElevation: 0.03,
    hasMarkings: false,
    markingDashed: false,
  },
};

export class RoadNetworkManager {
  rootGroup: THREE.Group;
  private roadMeshesGroup: THREE.Group;
  private centerlinesGroup: THREE.Group;
  private junctionsGroup: THREE.Group;
  private highlightGroup: THREE.Group;

  private roads: RoadSegmentGeo[] = [];
  private coordSystem: GeoCoordinateSystem | null = null;
  private selectedRoadId: string | null = null;

  // Cache for fast raycasting
  interactiveRoads: THREE.Mesh[] = [];

  // Material caches
  private asphaltMaterials = new Map<number, THREE.MeshLambertMaterial>();
  private lineMaterials = new Map<number, THREE.LineBasicMaterial>();
  private highlightMaterial: THREE.MeshBasicMaterial;
  private highlightLineMaterial: THREE.LineBasicMaterial;

  constructor() {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'whole-city-road-network';

    this.roadMeshesGroup = new THREE.Group();
    this.roadMeshesGroup.name = 'network-road-surfaces';
    this.rootGroup.add(this.roadMeshesGroup);

    this.centerlinesGroup = new THREE.Group();
    this.centerlinesGroup.name = 'network-centerlines-gis';
    this.rootGroup.add(this.centerlinesGroup);

    this.junctionsGroup = new THREE.Group();
    this.junctionsGroup.name = 'network-junction-discs';
    this.rootGroup.add(this.junctionsGroup);

    this.highlightGroup = new THREE.Group();
    this.highlightGroup.name = 'network-selected-road-highlight';
    this.rootGroup.add(this.highlightGroup);

    this.highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
    });

    this.highlightLineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 3,
    });
  }

  private getAsphaltMaterial(color: number): THREE.MeshLambertMaterial {
    if (!this.asphaltMaterials.has(color)) {
      this.asphaltMaterials.set(color, new THREE.MeshLambertMaterial({ color }));
    }
    return this.asphaltMaterials.get(color)!;
  }

  private getLineMaterial(color: number): THREE.LineBasicMaterial {
    if (!this.lineMaterials.has(color)) {
      this.lineMaterials.set(color, new THREE.LineBasicMaterial({ color }));
    }
    return this.lineMaterials.get(color)!;
  }

  buildNetwork(roads: RoadSegmentGeo[], coordSystem: GeoCoordinateSystem): void {
    this.clear();
    this.roads = roads;
    this.coordSystem = coordSystem;

    if (!roads || roads.length === 0) return;

    // Track junction intersections for smooth junction blending
    const junctionPoints: Map<string, { pos: THREE.Vector3; maxHalfWidth: number }> = new Map();

    roads.forEach((road) => {
      if (!road.geometry || road.geometry.length < 2) return;

      const isFlyover = road.bridge === true || (road.name && (
        road.name.toLowerCase().includes('flyover') ||
        road.name.toLowerCase().includes('overpass') ||
        road.name.toLowerCase().includes('bridge') ||
        road.name.toLowerCase().includes('elevated')
      ));
      const isRingRoad = road.name && (
        road.name.toLowerCase().includes('ring road') ||
        road.name.toLowerCase().includes('bypass') ||
        road.name.toLowerCase().includes('outer')
      );

      const style = HIERARCHY_STYLES[road.highwayType] || HIERARCHY_STYLES.default;
      let roadWidth = road.estimatedWidth ? Math.max(road.estimatedWidth, style.width * 0.7) : style.width;
      if (isRingRoad) roadWidth = Math.max(roadWidth, 14.5);
      const halfWidth = roadWidth / 2.0;

      const layerElev = isFlyover ? 6.5 : style.layerElevation;

      // Convert geo coordinates to local 3D points
      const worldPoints: THREE.Vector3[] = road.geometry.map(([lat, lon]) =>
        coordSystem.geoToWorld(lat, lon, layerElev)
      );

      // If flyover, generate concrete structural piers underneath
      if (isFlyover && worldPoints.length >= 2) {
        for (let i = 0; i < worldPoints.length; i++) {
          if (i === 0 || i === worldPoints.length - 1 || i % 3 === 0) {
            const p = worldPoints[i];
            const pillarGeo = new THREE.CylinderGeometry(0.7, 0.85, Math.max(1.0, p.y), 10);
            const pillarMat = this.getAsphaltMaterial(0x64748b);
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(p.x, p.y / 2, p.z);
            pillar.castShadow = true;
            this.junctionsGroup.add(pillar);
          }
        }
      }

      // Track start/end points as potential junctions
      const pStart = worldPoints[0];
      const pEnd = worldPoints[worldPoints.length - 1];
      const kStart = `${Math.round(pStart.x * 2)},${Math.round(pStart.z * 2)}`;
      const kEnd = `${Math.round(pEnd.x * 2)},${Math.round(pEnd.z * 2)}`;

      const exStart = junctionPoints.get(kStart);
      if (!exStart || halfWidth > exStart.maxHalfWidth) {
        junctionPoints.set(kStart, { pos: pStart, maxHalfWidth: halfWidth });
      }
      const exEnd = junctionPoints.get(kEnd);
      if (!exEnd || halfWidth > exEnd.maxHalfWidth) {
        junctionPoints.set(kEnd, { pos: pEnd, maxHalfWidth: halfWidth });
      }

      // Build extruded 3D ribbon mesh for the road corridor
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

      const mat = this.getAsphaltMaterial(style.asphaltColor);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = road.id;
      mesh.receiveShadow = true;
      mesh.userData = {
        type: 'real_road',
        road,
      };
      this.roadMeshesGroup.add(mesh);
      this.interactiveRoads.push(mesh);

      // Add crisp GIS centerline line so roads are visible at city-wide camera altitudes
      const linePts = worldPoints.map(pt => new THREE.Vector3(pt.x, pt.y + 0.02, pt.z));
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const lineMat = this.getLineMaterial(style.centerlineColor);
      const line = new THREE.Line(lineGeo, lineMat);
      line.userData = { type: 'centerline', roadId: road.id };
      this.centerlinesGroup.add(line);
    });

    // Generate circular junction discs at intersection vertices for smooth civil geometry
    junctionPoints.forEach(({ pos, maxHalfWidth }) => {
      const discGeo = new THREE.CircleGeometry(maxHalfWidth * 1.05, 12);
      discGeo.rotateX(-Math.PI / 2);
      const discMat = this.getAsphaltMaterial(0x2a2f38);
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.position.set(pos.x, pos.y - 0.005, pos.z);
      this.junctionsGroup.add(disc);
    });

    this.rootGroup.visible = true;
  }

  /**
   * Highlights the selected road while preserving 100% of the surrounding network.
   */
  highlightRoad(roadId: string | null): void {
    this.selectedRoadId = roadId;

    // Clear existing highlight
    while (this.highlightGroup.children.length > 0) {
      const child = this.highlightGroup.children[0];
      this.highlightGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry?.dispose();
      }
    }

    if (!roadId || !this.coordSystem) return;

    const targetRoad = this.roads.find(r => r.id === roadId);
    if (!targetRoad || targetRoad.geometry.length < 2) return;

    const style = HIERARCHY_STYLES[targetRoad.highwayType] || HIERARCHY_STYLES.default;
    const roadWidth = (targetRoad.estimatedWidth || style.width) + 1.2;
    const halfWidth = roadWidth / 2.0;

    const worldPoints: THREE.Vector3[] = targetRoad.geometry.map(([lat, lon]) =>
      this.coordSystem!.geoToWorld(lat, lon, 0.12) // Slightly elevated for crystal clear priority
    );

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

    const highlightMesh = new THREE.Mesh(geo, this.highlightMaterial);
    this.highlightGroup.add(highlightMesh);

    // Add glowing white spine line on top of highlight
    const spinePts = worldPoints.map(pt => new THREE.Vector3(pt.x, pt.y + 0.05, pt.z));
    const spineGeo = new THREE.BufferGeometry().setFromPoints(spinePts);
    const spineLine = new THREE.Line(spineGeo, this.highlightLineMaterial);
    this.highlightGroup.add(spineLine);
  }

  getSelectedRoadId(): string | null {
    return this.selectedRoadId;
  }

  setVisible(visible: boolean): void {
    this.rootGroup.visible = visible;
  }

  clear(): void {
    while (this.roadMeshesGroup.children.length > 0) {
      const child = this.roadMeshesGroup.children[0];
      this.roadMeshesGroup.remove(child);
      if (child instanceof THREE.Mesh) child.geometry?.dispose();
    }

    while (this.centerlinesGroup.children.length > 0) {
      const child = this.centerlinesGroup.children[0];
      this.centerlinesGroup.remove(child);
      if (child instanceof THREE.Line) child.geometry?.dispose();
    }

    while (this.junctionsGroup.children.length > 0) {
      const child = this.junctionsGroup.children[0];
      this.junctionsGroup.remove(child);
      if (child instanceof THREE.Mesh) child.geometry?.dispose();
    }

    while (this.highlightGroup.children.length > 0) {
      const child = this.highlightGroup.children[0];
      this.highlightGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) child.geometry?.dispose();
    }

    this.interactiveRoads = [];
    this.roads = [];
    this.selectedRoadId = null;
  }
}
