import * as THREE from 'three';
import type { TreeConfig } from '../../types/infrastructure';

// ─── Single tree ──────────────────────────────────────────────────────────────
export function createTree(config: TreeConfig): THREE.Group {
  const group = new THREE.Group();

  if (config.type === 'round') {
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.6, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.8;
    group.add(trunk);
    // Canopy (sphere)
    const canopyGeo = new THREE.SphereGeometry(1.4 * config.scale, 7, 5);
    const canopyMat = new THREE.MeshLambertMaterial({ color: 0x3d7a2e });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = 2.8 * config.scale;
    canopy.castShadow = true;
    group.add(canopy);

  } else if (config.type === 'tall') {
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.16, 3 * config.scale, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.5 * config.scale;
    group.add(trunk);
    // Three cones stacked (evergreen)
    const green = new THREE.MeshLambertMaterial({ color: 0x2d6a20 });
    [0, 1.2, 2.2].forEach((offset, i) => {
      const r = 1.0 - i * 0.22;
      const cGeo = new THREE.ConeGeometry(r * config.scale, 1.5 * config.scale, 7);
      const cone = new THREE.Mesh(cGeo, green);
      cone.position.y = (2.8 + offset * config.scale);
      cone.castShadow = true;
      group.add(cone);
    });

  } else { // bush
    // Short trunk
    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.8, 5);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.4;
    group.add(trunk);
    // Cluster of spheres
    const bushMat = new THREE.MeshLambertMaterial({ color: 0x4a8a30 });
    const offsets: [number, number, number][] = [
      [0, 1.1, 0], [0.5, 0.9, 0.3], [-0.4, 0.9, -0.3],
      [0.2, 0.8, -0.5], [-0.5, 1.0, 0.4],
    ];
    offsets.forEach(([x, y, z]) => {
      const bGeo = new THREE.SphereGeometry(0.55 * config.scale, 6, 4);
      const b = new THREE.Mesh(bGeo, bushMat);
      b.position.set(x * config.scale, y * config.scale, z * config.scale);
      b.castShadow = true;
      group.add(b);
    });
  }

  group.position.set(...config.position);
  return group;
}

export function createAllTrees(configs: TreeConfig[]): THREE.Group {
  const group = new THREE.Group();
  configs.forEach(c => group.add(createTree(c)));
  return group;
}

// ─── Median planting strip ────────────────────────────────────────────────────
export function createMedianPlanting(length: number): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x3d7a2e });
  const spacing = 8;
  const count = Math.floor(length / spacing);

  for (let i = 0; i < count; i++) {
    const z = -length / 2 + i * spacing + spacing / 2;
    const geo = new THREE.SphereGeometry(0.5, 6, 4);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(0, 0.45, z);
    m.scale.y = 1.5;
    group.add(m);
  }
  return group;
}
