import * as THREE from 'three';
import type { WaterFeatureGeo } from '../../types/geo';
import { GeoCoordinateSystem } from '../../engine/GeoCoordinateSystem';

// Google Maps serene vibrant water blue
const WATER_COLOR = 0x9cd2ea;
const WATER_MATERIAL = new THREE.MeshStandardMaterial({
  color: WATER_COLOR,
  roughness: 0.25,
  metalness: 0.1,
  side: THREE.DoubleSide,
});

const RIVER_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x90cae2,
  roughness: 0.3,
  metalness: 0.1,
  side: THREE.DoubleSide,
});

export function buildRealWaterFeatures(
  features: WaterFeatureGeo[],
  coordSystem: GeoCoordinateSystem
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'real-water-features';

  features.forEach((wf) => {
    if (!wf.geometry || wf.geometry.length < 2) return;

    const coords = wf.geometry;
    const first = coords[0];
    const last = coords[coords.length - 1];

    // Check if it's a closed area (lake, reservoir, tank, pond)
    const dLat = Math.abs(first[0] - last[0]);
    const dLon = Math.abs(first[1] - last[1]);
    const isClosed = coords.length >= 4 && (dLat < 0.0001 && dLon < 0.0001);

    if (!isClosed || coords.length > 250) {
      // ── Linear Waterway: River, Canal, Stream (e.g. Vaigai, Kiruthumal, Sathaiyar) ──
      // Build a smooth extruded ribbon along the water polyline
      const worldPoints: THREE.Vector3[] = coords.map(([lat, lon]) =>
        coordSystem.geoToWorld(lat, lon, 0.02)
      );

      // Estimate river width (wider for named major rivers like Vaigai)
      let riverWidth = 14.0;
      const lowerName = (wf.name || '').toLowerCase();
      if (lowerName.includes('vaigai')) {
        riverWidth = 32.0;
      } else if (lowerName.includes('canal') || lowerName.includes('stream')) {
        riverWidth = 8.0;
      } else if (lowerName.includes('river')) {
        riverWidth = 24.0;
      }

      const halfWidth = riverWidth / 2.0;
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

      const mesh = new THREE.Mesh(geo, RIVER_MATERIAL);
      mesh.name = wf.id || 'river';
      mesh.receiveShadow = true;
      root.add(mesh);
      return;
    }

    // ── Closed Polygon Water Body: Lake, Pond, Reservoir ──
    const pts2D: THREE.Vector2[] = coords.slice(0, coords.length - 1).map(([lat, lon]) => {
      const w = coordSystem.geoToWorld(lat, lon);
      return new THREE.Vector2(w.x, -w.z);
    });

    try {
      const shape = new THREE.Shape(pts2D);
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, 0.025, 0);

      const mesh = new THREE.Mesh(geo, WATER_MATERIAL);
      mesh.name = wf.id || 'lake';
      mesh.receiveShadow = true;
      mesh.userData = {
        type: 'water',
        waterData: wf,
      };
      root.add(mesh);
    } catch {
      // Skip if triangulation fails
    }
  });

  return root;
}
