import * as THREE from 'three';

// ─── Ground terrain ───────────────────────────────────────────────────────────
export function createTerrain(): THREE.Group {
  const group = new THREE.Group();

  // Main ground plane
  const groundGeo = new THREE.PlaneGeometry(300, 400, 40, 60);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x7a8f5a });

  // Subtle elevation noise
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i); // plane Y = world Z before rotation
    // avoid bumps near road corridor
    const distFromRoad = Math.abs(x);
    if (distFromRoad > 8) {
      const bump = (Math.sin(x * 0.3) * 0.3 + Math.cos(z * 0.2) * 0.4) * (distFromRoad / 80);
      pos.setZ(i, bump);
    }
  }
  groundGeo.computeVertexNormals();

  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Road corridor dirt strip (slightly darker)
  const corridorGeo = new THREE.PlaneGeometry(20, 400);
  const corridorMat = new THREE.MeshLambertMaterial({ color: 0x6a7850 });
  const corridor = new THREE.Mesh(corridorGeo, corridorMat);
  corridor.rotation.x = -Math.PI / 2;
  corridor.position.y = 0.001;
  group.add(corridor);

  // Grass patches
  addGrassPatches(group);

  return group;
}

function addGrassPatches(group: THREE.Group) {
  const patchMat = new THREE.MeshLambertMaterial({ color: 0x5e7a40 });
  const positions: [number, number][] = [
    [-40, -90], [-50, -30], [-45, 40], [-55, 80],
    [ 40, -70], [ 50,  10], [ 42, 60], [ 52, -20],
    [-35,  -5], [ 35,  50],
  ];
  positions.forEach(([x, z]) => {
    const w = 15 + Math.random() * 20;
    const d = 10 + Math.random() * 15;
    const geo = new THREE.PlaneGeometry(w, d);
    const mesh = new THREE.Mesh(geo, patchMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.002, z);
    group.add(mesh);
  });
}

// ─── Earth pile (earthwork phase) ─────────────────────────────────────────────
export function createEarthPile(position: THREE.Vector3, scale = 1): THREE.Mesh {
  const geo = new THREE.SphereGeometry(1.5 * scale, 8, 5);
  // Flatten into a mound shape
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < 0) pos.setY(i, 0);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  mesh.castShadow = true;
  return mesh;
}

// ─── Construction rubble ──────────────────────────────────────────────────────
export function createRubblePile(position: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x777060 });

  for (let i = 0; i < 8; i++) {
    const size = 0.2 + Math.random() * 0.4;
    const geo = new THREE.BoxGeometry(size, size * 0.6, size);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(
      (Math.random() - 0.5) * 2,
      size * 0.3,
      (Math.random() - 0.5) * 2,
    );
    m.rotation.y = Math.random() * Math.PI;
    group.add(m);
  }

  group.position.copy(position);
  return group;
}
