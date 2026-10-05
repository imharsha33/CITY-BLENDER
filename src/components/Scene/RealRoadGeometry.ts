import * as THREE from 'three';
import type { RoadSegmentGeo } from '../../types/geo';
import { GeoCoordinateSystem } from '../../engine/GeoCoordinateSystem';

// Restrained, natural materials for real highway classifications
const ROAD_MATERIALS: Record<string, THREE.MeshLambertMaterial> = {
  motorway:    new THREE.MeshLambertMaterial({ color: 0x1f2124 }),
  trunk:       new THREE.MeshLambertMaterial({ color: 0x24272b }),
  primary:     new THREE.MeshLambertMaterial({ color: 0x2a2d32 }),
  secondary:   new THREE.MeshLambertMaterial({ color: 0x30343a }),
  tertiary:    new THREE.MeshLambertMaterial({ color: 0x363a40 }),
  residential: new THREE.MeshLambertMaterial({ color: 0x3a3e46 }),
  service:     new THREE.MeshLambertMaterial({ color: 0x40454d }),
  default:     new THREE.MeshLambertMaterial({ color: 0x32363c }),
};

const MARKING_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xf0f2f5 });

export function buildRealRoadNetwork(
  roads: RoadSegmentGeo[],
  coordSystem: GeoCoordinateSystem
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'real-road-network';

  roads.forEach((road) => {
    if (road.geometry.length < 2) return;

    // Convert lat/lon points to local world 3D Vector3
    const worldPoints: THREE.Vector3[] = road.geometry.map(([lat, lon]) =>
      coordSystem.geoToWorld(lat, lon, 0.05)
    );

    const halfWidth = (road.estimatedWidth || 6.0) / 2.0;
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

      // Perpendicular vector along ground (Y is up, so perpendicular in XZ is (-tangent.z, 0, tangent.x))
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

    const mat = ROAD_MATERIALS[road.highwayType] || ROAD_MATERIALS.default;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = road.id;
    mesh.userData = {
      type: 'real_road',
      road,
    };
    root.add(mesh);

    // Add center stripe for major corridors (motorway, trunk, primary)
    if (['motorway', 'trunk', 'primary', 'secondary'].includes(road.highwayType) && worldPoints.length >= 2) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints(
        worldPoints.map(pt => new THREE.Vector3(pt.x, pt.y + 0.03, pt.z))
      );
      const stripe = new THREE.Line(lineGeo, MARKING_MATERIAL);
      root.add(stripe);
    }
  });

  return root;
}
