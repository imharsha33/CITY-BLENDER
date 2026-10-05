import * as THREE from 'three';
import type { POIGeo } from '../../types/geo';
import { GeoCoordinateSystem } from '../../engine/GeoCoordinateSystem';

const PIN_COLORS: Record<string, number> = {
  hospital: 0xd9434e, // Red
  station: 0xe5a93c,  // Amber
  school: 0x3d94d9,   // Blue
  government: 0x8a63d2, // Violet
  commercial: 0x2ea879, // Green
  default: 0x9a9ea6,  // Gray
};

export function buildRealPOIMarkers(
  pois: POIGeo[],
  coordSystem: GeoCoordinateSystem
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'real-poi-markers';

  pois.forEach((poi) => {
    const [lat, lon] = poi.coordinate;
    const worldPos = coordSystem.geoToWorld(lat, lon, 0);

    const pinGroup = new THREE.Group();
    pinGroup.position.set(worldPos.x, 0, worldPos.z);

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.5, 8);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x6e7480 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 1.75;
    pinGroup.add(stem);

    // Head
    const headColor = PIN_COLORS[poi.type] || PIN_COLORS.default;
    const headGeo = new THREE.SphereGeometry(0.5, 12, 8);
    const headMat = new THREE.MeshLambertMaterial({ color: headColor });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 3.5;
    pinGroup.add(head);

    // Ground anchor ring
    const ringGeo = new THREE.RingGeometry(0.3, 0.6, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: headColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.04;
    pinGroup.add(ring);

    root.add(pinGroup);
  });

  return root;
}
