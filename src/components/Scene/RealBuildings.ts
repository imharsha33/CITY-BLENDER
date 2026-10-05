import * as THREE from 'three';
import type { BuildingGeo } from '../../types/geo';
import { GeoCoordinateSystem } from '../../engine/GeoCoordinateSystem';

// Google Maps 3D light architectural building tones
const BUILDING_PALETTE = [
  new THREE.MeshStandardMaterial({ color: 0xe6e2d8, roughness: 0.8, metalness: 0.05 }),
  new THREE.MeshStandardMaterial({ color: 0xded8ce, roughness: 0.8, metalness: 0.05 }),
  new THREE.MeshStandardMaterial({ color: 0xe2ddd2, roughness: 0.8, metalness: 0.05 }),
  new THREE.MeshStandardMaterial({ color: 0xd9d3c8, roughness: 0.8, metalness: 0.05 }),
  new THREE.MeshStandardMaterial({ color: 0xede9e0, roughness: 0.8, metalness: 0.05 }),
];


export function buildRealBuildings(
  buildings: BuildingGeo[],
  coordSystem: GeoCoordinateSystem
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'real-buildings';

  buildings.forEach((b, idx) => {
    if (b.geometry.length < 3) return;

    // Convert polygon coordinates to 2D local space (X, -Z)
    // Note: When ExtrudeGeometry is rotated -PI/2 on X, 2D Y maps to 3D +Z:
    // y_new = z (depth -> up +Y), z_new = -y_2d = -(-w.z) = +w.z
    const pts2D: THREE.Vector2[] = b.geometry.map(([lat, lon]) => {
      const w = coordSystem.geoToWorld(lat, lon);
      return new THREE.Vector2(w.x, -w.z);
    });

    const shape = new THREE.Shape(pts2D);
    const height = Math.max(3.5, b.height || (b.levels ? b.levels * 3.4 : b.estimatedHeight || (6.0 + (idx % 5) * 2.2)));

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: height,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    };

    try {
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.rotateX(-Math.PI / 2);

      const mat = BUILDING_PALETTE[idx % BUILDING_PALETTE.length];
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = b.id;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = {
        type: 'building',
        buildingData: b,
      };
      root.add(mesh);
    } catch {
      // Skip self-intersecting or degenerate polygon geometries
    }
  });

  return root;
}
