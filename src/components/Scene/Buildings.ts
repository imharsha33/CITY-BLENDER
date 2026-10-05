import * as THREE from 'three';
import type { BuildingConfig } from '../../types/infrastructure';

const BUILDING_COLORS = [
  0xc8bfae, 0xb5a898, 0xccc4b4, 0xb8b0a0,
  0xd2c8b8, 0xbdb5a5, 0xc4bcac, 0xbab2a2,
];

function hexToColor(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export function createBuilding(config: BuildingConfig): THREE.Group {
  const group = new THREE.Group();
  const color = hexToColor(config.color);

  // ── Main body ──────────────────────────────────────────────────────
  const bodyGeo = new THREE.BoxGeometry(config.width, config.height, config.depth);
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = config.height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // ── Windows ────────────────────────────────────────────────────────
  const winMat = new THREE.MeshLambertMaterial({ color: 0x8aadcc });
  const floors = Math.max(1, Math.floor(config.height / 3.5));
  const cols = Math.max(1, Math.floor(config.width / 3));

  for (let fl = 0; fl < floors; fl++) {
    for (let col = 0; col < cols; col++) {
      const wGeo = new THREE.BoxGeometry(0.8, 1.0, 0.05);
      const win = new THREE.Mesh(wGeo, winMat);
      const xPos = -config.width / 2 + (col + 0.5) * (config.width / cols) + (config.width / cols) * 0.1;
      const yPos = 1.5 + fl * 3.2;
      win.position.set(xPos, yPos, config.depth / 2 + 0.03);
      group.add(win);
    }
  }

  // ── Roof ───────────────────────────────────────────────────────────
  if (config.roofType === 'sloped') {
    const roofGeo = new THREE.CylinderGeometry(0, config.width * 0.65, config.height * 0.25, 4);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x8a5a3a });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = config.height + config.height * 0.12;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
  } else if (config.roofType === 'hip') {
    const roofGeo = new THREE.CylinderGeometry(0.5, config.width * 0.58, config.height * 0.2, 4);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x7a4a2a });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = config.height + config.height * 0.1;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
  } else {
    // Flat roof parapet
    const parGeo = new THREE.BoxGeometry(config.width + 0.2, 0.3, config.depth + 0.2);
    const parMat = new THREE.MeshLambertMaterial({ color: color - 0x111111 });
    const par = new THREE.Mesh(parGeo, parMat);
    par.position.y = config.height + 0.15;
    group.add(par);
  }

  // ── Ground floor details ───────────────────────────────────────────
  const baseGeo = new THREE.BoxGeometry(config.width + 0.2, 0.3, config.depth + 0.2);
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x888878 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.15;
  group.add(base);

  group.position.set(...config.position);
  return group;
}

export function createAllBuildings(configs: BuildingConfig[]): THREE.Group {
  const group = new THREE.Group();
  configs.forEach(c => group.add(createBuilding(c)));
  return group;
}

// Reusable single building for instancing if needed
export function createBuildingInstanced(_count: number): THREE.InstancedMesh {
  const geo = new THREE.BoxGeometry(10, 12, 10);
  const mat = new THREE.MeshLambertMaterial({ color: BUILDING_COLORS[0] });
  return new THREE.InstancedMesh(geo, mat, _count);
}
