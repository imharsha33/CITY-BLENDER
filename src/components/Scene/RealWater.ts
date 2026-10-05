import * as THREE from 'three';
import type { WaterFeatureGeo } from '../../types/geo';
import { GeoCoordinateSystem } from '../../engine/GeoCoordinateSystem';

const WATER_MATERIAL = new THREE.MeshLambertMaterial({
  color: 0x22556b,
  transparent: true,
  opacity: 0.88,
  depthWrite: true,
});

export function buildRealWaterFeatures(
  features: WaterFeatureGeo[],
  coordSystem: GeoCoordinateSystem
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'real-water-features';

  features.forEach((wf) => {
    if (wf.geometry.length < 3) {
      // Linear waterway (canal, stream)
      if (wf.geometry.length >= 2) {
        const points = wf.geometry.map(([lat, lon]) =>
          coordSystem.geoToWorld(lat, lon, 0.02)
        );
        const curve = new THREE.CatmullRomCurve3(points);
        const tube = new THREE.TubeGeometry(curve, points.length * 4, 3.5, 6, false);
        const mesh = new THREE.Mesh(tube, WATER_MATERIAL);
        mesh.scale.set(1, 0.15, 1); // Flatten slightly
        root.add(mesh);
      }
      return;
    }

    // Polygon water body (lake, bay, reservoir, sea, coastline)
    const pts2D: THREE.Vector2[] = wf.geometry.map(([lat, lon]) => {
      const w = coordSystem.geoToWorld(lat, lon);
      return new THREE.Vector2(w.x, -w.z);
    });

    try {
      const shape = new THREE.Shape(pts2D);
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, 0.04, 0); // Sit slightly above terrain

      const mesh = new THREE.Mesh(geo, WATER_MATERIAL);
      mesh.name = wf.id;
      mesh.receiveShadow = true;
      mesh.userData = {
        type: 'water',
        waterData: wf,
      };
      root.add(mesh);
    } catch {
      // Skip malformed polygons
    }
  });

  return root;
}
