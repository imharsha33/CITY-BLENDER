import * as THREE from 'three';
import type { StreetLightConfig } from '../../types/infrastructure';

// ─── Single street light ───────────────────────────────────────────────────────
export function createStreetLight(config: StreetLightConfig): THREE.Group {
  const group = new THREE.Group();

  const isMedian = config.side === 'median';
  const poleH = isMedian ? 9 : 8;
  const armLen = isMedian ? 2.5 : 3.5;

  // Pole
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, poleH, 8);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x7a7a8a });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = poleH / 2;
  pole.castShadow = true;
  group.add(pole);

  // Arm
  const armGeo = new THREE.BoxGeometry(0.06, 0.06, armLen);
  const arm = new THREE.Mesh(armGeo, poleMat);
  arm.position.set(isMedian ? 0 : armLen / 2, poleH - 0.2, 0);
  if (!isMedian) arm.rotation.y = Math.PI / 2;
  group.add(arm);

  // Lamp head
  const lampGeo = new THREE.BoxGeometry(0.5, 0.2, 0.8);
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
  const lamp = new THREE.Mesh(lampGeo, lampMat);
  lamp.position.set(isMedian ? 0 : armLen, poleH - 0.1, 0);
  group.add(lamp);

  // Light lens
  const lensMat = new THREE.MeshLambertMaterial({ color: 0xfff0c0, emissive: 0xfff0c0, emissiveIntensity: 0.4 });
  const lensGeo = new THREE.BoxGeometry(0.45, 0.08, 0.75);
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.set(isMedian ? 0 : armLen, poleH - 0.22, 0);
  group.add(lens);

  // Base footing
  const baseGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.3, 8);
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.15;
  group.add(base);

  group.position.set(...config.position);
  return group;
}

export function createAllStreetLights(configs: StreetLightConfig[]): THREE.Group {
  const group = new THREE.Group();
  configs.forEach(c => group.add(createStreetLight(c)));
  return group;
}

// ─── Road sign ─────────────────────────────────────────────────────────────────
export function createRoadSign(
  position: THREE.Vector3,
  type: 'speed' | 'warning' | 'info' = 'info'
): THREE.Group {
  const group = new THREE.Group();

  const colors: Record<typeof type, number> = {
    speed:   0xffffff,
    warning: 0xf0c020,
    info:    0x2060c0,
  };

  // Post
  const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6);
  const postMat = new THREE.MeshLambertMaterial({ color: 0x808080 });
  const post = new THREE.Mesh(postGeo, postMat);
  post.position.y = 1.25;
  group.add(post);

  // Sign panel
  const panelGeo = new THREE.BoxGeometry(0.8, 0.6, 0.06);
  const panelMat = new THREE.MeshLambertMaterial({ color: colors[type] });
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.y = 2.8;
  group.add(panel);

  group.position.copy(position);
  return group;
}
