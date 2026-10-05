import * as THREE from 'three';

// ─── Traffic cone ──────────────────────────────────────────────────────────────
export function createCone(): THREE.Group {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const coneMat = new THREE.MeshLambertMaterial({ color: 0xff6600 });
  const stripMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

  const baseGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.08, 8);
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.set(0, 0.04, 0);
  group.add(baseMesh);

  const coneGeo = new THREE.ConeGeometry(0.15, 0.6, 8);
  const c = new THREE.Mesh(coneGeo, coneMat);
  c.position.y = 0.38;
  group.add(c);

  const stripGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.06, 8);
  const s = new THREE.Mesh(stripGeo, stripMat);
  s.position.y = 0.3;
  group.add(s);

  return group;
}

// ─── Construction barrier ──────────────────────────────────────────────────────
export function createBarrier(): THREE.Group {
  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(0.45, 0.9, 1.8);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.45;
  group.add(body);

  // Stripes
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xff4400 });
  for (let i = 0; i < 3; i++) {
    const sg = new THREE.BoxGeometry(0.46, 0.14, 1.81);
    const s = new THREE.Mesh(sg, stripeMat);
    s.position.y = 0.25 + i * 0.28;
    group.add(s);
  }

  return group;
}

// ─── Survey marker / stake ─────────────────────────────────────────────────────
export function createSurveyMarker(): THREE.Group {
  const group = new THREE.Group();

  const stakeGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6);
  const stakeMat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
  const stake = new THREE.Mesh(stakeGeo, stakeMat);
  stake.position.y = 0.6;
  group.add(stake);

  const flagGeo = new THREE.BoxGeometry(0.3, 0.2, 0.01);
  const flagMat = new THREE.MeshLambertMaterial({ color: 0xff2200 });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(0.15, 1.3, 0);
  group.add(flag);

  return group;
}

// ─── Simplified excavator ──────────────────────────────────────────────────────
export function createExcavator(): THREE.Group {
  const group = new THREE.Group();
  const metalMat = new THREE.MeshLambertMaterial({ color: 0xf0a020 });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x333333 });

  // Body
  const bodyGeo = new THREE.BoxGeometry(2.4, 1.4, 3.2);
  const body = new THREE.Mesh(bodyGeo, metalMat);
  body.position.y = 1.1;
  group.add(body);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.2, 1.0, 1.4);
  const cabin = new THREE.Mesh(cabinGeo, metalMat);
  cabin.position.set(0.5, 2.2, -0.5);
  group.add(cabin);

  // Tracks
  [-1.3, 1.3].forEach(x => {
    const trackGeo = new THREE.BoxGeometry(0.5, 0.5, 3.5);
    const track = new THREE.Mesh(trackGeo, darkMat);
    track.position.set(x, 0.25, 0);
    group.add(track);
  });

  // Arm
  const arm1Geo = new THREE.BoxGeometry(0.3, 2.2, 0.3);
  const arm1 = new THREE.Mesh(arm1Geo, metalMat);
  arm1.position.set(-0.3, 2.5, 1.2);
  arm1.rotation.z = 0.3;
  group.add(arm1);

  const arm2Geo = new THREE.BoxGeometry(0.25, 1.8, 0.25);
  const arm2 = new THREE.Mesh(arm2Geo, metalMat);
  arm2.position.set(-0.6, 3.5, 2.2);
  arm2.rotation.z = -0.5;
  group.add(arm2);

  // Bucket
  const bucketGeo = new THREE.BoxGeometry(0.8, 0.4, 0.5);
  const bucket = new THREE.Mesh(bucketGeo, darkMat);
  bucket.position.set(-0.8, 2.5, 3.0);
  group.add(bucket);

  return group;
}

// ─── Simplified dump truck ─────────────────────────────────────────────────────
export function createDumpTruck(): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xd0a020 });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x333333 });

  // Cab
  const cabGeo = new THREE.BoxGeometry(2.4, 2.0, 2.8);
  const cab = new THREE.Mesh(cabGeo, bodyMat);
  cab.position.set(0, 1.5, 2.8);
  group.add(cab);

  // Bed (raised)
  const bedGeo = new THREE.BoxGeometry(2.5, 1.4, 4.5);
  const bed = new THREE.Mesh(bedGeo, bodyMat);
  bed.position.set(0, 1.7, -1.0);
  bed.rotation.x = -0.15; // slightly raised
  group.add(bed);

  // Bed dirt load
  const loadGeo = new THREE.BoxGeometry(2.2, 0.6, 4.0);
  const loadMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
  const load = new THREE.Mesh(loadGeo, loadMat);
  load.position.set(0, 2.8, -1.0);
  group.add(load);

  // Wheels
  const wGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 10);
  const wPos: [number, number, number][] = [
    [ 1.3, 0.5,  2.8], [-1.3, 0.5,  2.8],
    [ 1.3, 0.5, -0.5], [-1.3, 0.5, -0.5],
    [ 1.3, 0.5, -2.5], [-1.3, 0.5, -2.5],
  ];
  wPos.forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wGeo, darkMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    group.add(w);
  });

  return group;
}

// ─── Road roller ──────────────────────────────────────────────────────────────
export function createRoller(): THREE.Group {
  const group = new THREE.Group();
  const bodyMat   = new THREE.MeshLambertMaterial({ color: 0x606060 });
  const drumMat   = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const cabinMat  = new THREE.MeshLambertMaterial({ color: 0x404040 });

  // Main body
  const bodyGeo = new THREE.BoxGeometry(2.0, 1.4, 2.5);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.5;
  group.add(body);

  // Cabin
  const cGeo = new THREE.BoxGeometry(1.6, 1.0, 1.5);
  const c = new THREE.Mesh(cGeo, cabinMat);
  c.position.set(0, 2.7, 0);
  group.add(c);

  // Front drum
  const drumGeo = new THREE.CylinderGeometry(0.7, 0.7, 2.1, 14);
  const frontDrum = new THREE.Mesh(drumGeo, drumMat);
  frontDrum.rotation.z = Math.PI / 2;
  frontDrum.position.set(0, 0.7, 1.8);
  group.add(frontDrum);

  // Rear wheels
  const wGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 10);
  const wMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  [[ 1.0, 0.5, -1.5], [-1.0, 0.5, -1.5]].forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wGeo, wMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    group.add(w);
  });

  return group;
}

// ─── Concrete mixer ────────────────────────────────────────────────────────────
export function createConcreteMixer(): THREE.Group {
  const group = new THREE.Group();
  const truckMat  = new THREE.MeshLambertMaterial({ color: 0xa0a8b0 });
  const drumMat   = new THREE.MeshLambertMaterial({ color: 0xe0e0e0 });

  const cabGeo = new THREE.BoxGeometry(2.2, 2.0, 2.5);
  const cab = new THREE.Mesh(cabGeo, truckMat);
  cab.position.set(0, 1.5, 2.0);
  group.add(cab);

  const frameGeo = new THREE.BoxGeometry(2.0, 1.0, 4.5);
  const frame = new THREE.Mesh(frameGeo, truckMat);
  frame.position.set(0, 1.0, -1.0);
  group.add(frame);

  const barrelGeo = new THREE.CylinderGeometry(1.0, 0.6, 3.2, 10);
  const barrel = new THREE.Mesh(barrelGeo, drumMat);
  barrel.position.set(0, 2.8, -0.8);
  barrel.rotation.x = 0.3;
  group.add(barrel);

  const wGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 10);
  const wMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  ([ [1.15,0.5,2.0],[-1.15,0.5,2.0],[1.15,0.5,-1.0],[-1.15,0.5,-1.0] ] as [number,number,number][]).forEach(([x,y,z]) => {
    const w = new THREE.Mesh(wGeo, wMat);
    w.rotation.z = Math.PI/2;
    w.position.set(x,y,z);
    group.add(w);
  });

  return group;
}

// ─── Construction object spawner ───────────────────────────────────────────────
export interface ConstructionObjects {
  conesGroup: THREE.Group;
  barriersGroup: THREE.Group;
  surveyGroup: THREE.Group;
  excavator: THREE.Group;
  dumpTruck: THREE.Group;
  roller: THREE.Group;
  mixer: THREE.Group;
  earthPileGroup: THREE.Group;
}

export function buildConstructionObjects(roadLength: number): ConstructionObjects {
  // Cones — along construction boundary
  const conesGroup = new THREE.Group();
  const conePositions = [-8, -6, 6, 8];
  const spacing = 6;
  const count = Math.floor(roadLength / spacing);
  for (let i = 0; i < count; i++) {
    conePositions.forEach(x => {
      const cone = createCone();
      cone.position.set(x, 0, -roadLength / 2 + i * spacing);
      conesGroup.add(cone);
    });
  }

  // Barriers
  const barriersGroup = new THREE.Group();
  const bPositions = [-7.5, 7.5];
  const bSpacing = 2.2;
  const bCount = Math.floor(roadLength / bSpacing);
  for (let i = 0; i < bCount; i++) {
    bPositions.forEach(x => {
      const b = createBarrier();
      b.position.set(x, 0, -roadLength / 2 + i * bSpacing + bSpacing / 2);
      barriersGroup.add(b);
    });
  }

  // Survey markers
  const surveyGroup = new THREE.Group();
  [-9, -5, 5, 9].forEach(x => {
    [-80, -50, -20, 10, 40, 70].forEach(z => {
      const s = createSurveyMarker();
      s.position.set(x, 0, z);
      surveyGroup.add(s);
    });
  });

  // Heavy equipment
  const excavator = createExcavator();
  excavator.position.set(-4, 0, 20);
  excavator.rotation.y = -0.4;

  const dumpTruck = createDumpTruck();
  dumpTruck.position.set(3, 0, -10);
  dumpTruck.rotation.y = 0.2;

  const roller = createRoller();
  roller.position.set(-2, 0, -35);

  const mixer = createConcreteMixer();
  mixer.position.set(5, 0, 50);
  mixer.rotation.y = Math.PI;

  // Earth piles
  const earthPileGroup = new THREE.Group();
  const epPositions: [number, number, number][] = [
    [-5, 0, 10], [6, 0, 5], [-6, 0, -25], [5, 0, 40], [-4, 0, 65],
  ];
  epPositions.forEach(([x, y, z]) => {
    const mound = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 7, 4),
      new THREE.MeshLambertMaterial({ color: 0x8b6914 })
    );
    mound.scale.y = 0.5;
    mound.position.set(x, 0.4, z);
    earthPileGroup.add(mound);
  });

  return { conesGroup, barriersGroup, surveyGroup, excavator, dumpTruck, roller, mixer, earthPileGroup };
}
