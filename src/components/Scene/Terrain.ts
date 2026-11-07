import * as THREE from 'three';

// ─── Ground terrain (Flat, flush, guaranteed zero road penetration) ───────────
export function createTerrain(): THREE.Group {
  const group = new THREE.Group();

  // Main ground plane (completely flat at Y = 0 to prevent any grass clipping through roads)
  const groundGeo = new THREE.PlaneGeometry(400, 400);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x4a8238,
    roughness: 0.88,
    metalness: 0.02,
  });

  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.005; // Slightly below Y=0 so roads at Y>=0.05 are always clean and unobscured
  ground.receiveShadow = true;
  group.add(ground);

  // Subtle soil shoulder strip flanking road corridor
  const corridorGeo = new THREE.PlaneGeometry(28, 400);
  const corridorMat = new THREE.MeshStandardMaterial({
    color: 0x5a6845,
    roughness: 0.90,
  });
  const corridor = new THREE.Mesh(corridorGeo, corridorMat);
  corridor.rotation.x = -Math.PI / 2;
  corridor.position.y = 0.001;
  corridor.receiveShadow = true;
  group.add(corridor);

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
