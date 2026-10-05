import * as THREE from 'three';
import type { RoadGeometryConfig } from '../../types/infrastructure';
import {
  getProceduralAsphaltTexture,
  getZebraCrosswalkTexture,
  getLaneArrowTexture,
} from './RoadTextures';

// ─── High-Fidelity Materials ──────────────────────────────────────────────────
export function createAsphaltMaterial(worn = false): THREE.MeshStandardMaterial {
  const map = getProceduralAsphaltTexture(worn);
  return new THREE.MeshStandardMaterial({
    map,
    color: worn ? 0x666b73 : 0x3d4148,
    roughness: 0.88,
    metalness: 0.08,
  });
}

export function createFreshAsphaltMaterial(): THREE.MeshStandardMaterial {
  const map = getProceduralAsphaltTexture(false);
  return new THREE.MeshStandardMaterial({
    map,
    color: 0x272a30,
    roughness: 0.82,
    metalness: 0.05,
  });
}

export function createMarkingMaterial(color = 0xffffff): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.1,
    emissive: new THREE.Color(color).multiplyScalar(0.08),
  });
}

export function createYellowMarkingMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Amber / warm highway yellow
    roughness: 0.45,
    metalness: 0.1,
    emissive: new THREE.Color(0xd97706).multiplyScalar(0.12),
  });
}

export function createMedianMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.75,
    metalness: 0.15,
  });
}

export function createSidewalkMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.85,
    metalness: 0.05,
  });
}

export function createCurbMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.7,
    metalness: 0.1,
  });
}

// ─── Road base plane ──────────────────────────────────────────────────────────
export function createRoadBase(config: RoadGeometryConfig): THREE.Mesh {
  const totalWidth = getTotalRoadWidth(config);
  const geo = new THREE.BoxGeometry(totalWidth, 0.16, config.length);
  const mat = createAsphaltMaterial(config.lanes === 1);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.position.y = 0.08;
  return mesh;
}

export function getTotalRoadWidth(config: RoadGeometryConfig): number {
  let w = config.lanes * config.laneWidth;
  if (config.hasMedian && config.medianWidth) w += config.medianWidth;
  if (config.hasShoulder && config.shoulderWidth) w += config.shoulderWidth * 2;
  if (config.hasSidewalk && config.sidewalkWidth) w += config.sidewalkWidth * 2;
  return w;
}

// ─── Lane markings, Cat's Eyes & Directional Arrows ───────────────────────────
export function createLaneMarkings(config: RoadGeometryConfig): THREE.Group {
  const group = new THREE.Group();
  const whiteMat = createMarkingMaterial(0xffffff);
  const yellowMat = createYellowMarkingMaterial();

  const dashLen = 3.5;
  const dashGap = 4.5;
  const numDashes = Math.floor(config.length / (dashLen + dashGap));
  const markW = 0.18;
  const markH = 0.015;
  const markY = 0.165;

  // Cat's eyes / road studs material
  const studGeo = new THREE.BoxGeometry(0.12, 0.03, 0.12);
  const studWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.6,
  });
  const studAmberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.7,
  });

  if (config.lanes === 1) {
    // 2-Way single lane: Double solid yellow lines with center studs
    const yellowGap = 0.12;
    [-yellowGap, yellowGap].forEach(offset => {
      const yLineGeo = new THREE.BoxGeometry(0.14, markH, config.length);
      const yLine = new THREE.Mesh(yLineGeo, yellowMat);
      yLine.position.set(offset, markY, 0);
      group.add(yLine);
    });

    // Amber center cat's eye reflectors every 10 meters
    for (let z = -config.length / 2 + 10; z < config.length / 2; z += 12) {
      const stud = new THREE.Mesh(studGeo, studAmberMat);
      stud.position.set(0, markY + 0.01, z);
      group.add(stud);
    }

    // Outer edge solid white lines
    [-1, 1].forEach(side => {
      const eGeo = new THREE.BoxGeometry(markW, markH, config.length);
      const em = new THREE.Mesh(eGeo, whiteMat);
      em.position.set(side * (config.lanes * config.laneWidth / 2 - 0.15), markY, 0);
      group.add(em);
    });

    // Add pedestrian zebra crossing at midpoint
    const zebraGeo = new THREE.PlaneGeometry(config.laneWidth * 0.95, 4.5);
    zebraGeo.rotateX(-Math.PI / 2);
    const zebraMat = new THREE.MeshStandardMaterial({
      map: getZebraCrosswalkTexture(),
      roughness: 0.6,
    });
    const zebra = new THREE.Mesh(zebraGeo, zebraMat);
    zebra.position.set(0, markY + 0.005, 0);
    group.add(zebra);

    // Directional arrows
    [-30, 30].forEach((zPos, idx) => {
      const arrowGeo = new THREE.PlaneGeometry(1.4, 2.8);
      arrowGeo.rotateX(-Math.PI / 2);
      const arrowMat = new THREE.MeshBasicMaterial({
        map: getLaneArrowTexture('straight'),
        transparent: true,
        opacity: 0.9,
      });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      const laneX = idx === 0 ? -config.laneWidth * 0.28 : config.laneWidth * 0.28;
      arrow.position.set(laneX, markY + 0.006, zPos);
      if (idx === 0) arrow.rotation.y = Math.PI; // Face opposite direction
      group.add(arrow);
    });
  } else {
    // Multi-lane divided highway
    const lanesPerDir = config.lanes / 2;
    const lw = config.laneWidth;
    const mw = config.medianWidth ?? 0;

    // Lane dividers per direction
    for (let dir = 0; dir < 2; dir++) {
      const dirSign = dir === 0 ? 1 : -1;
      const dirOffset = dirSign * (mw / 2);

      for (let lane = 1; lane < lanesPerDir; lane++) {
        const xOff = dirOffset + dirSign * lane * lw;
        for (let i = 0; i < numDashes; i++) {
          const geo = new THREE.BoxGeometry(markW, markH, dashLen);
          const m = new THREE.Mesh(geo, whiteMat);
          const zPos = -config.length / 2 + i * (dashLen + dashGap) + dashLen / 2;
          m.position.set(xOff, markY, zPos);
          group.add(m);

          // White cat's eye reflector in the gap
          if (i % 2 === 0) {
            const stud = new THREE.Mesh(studGeo, studWhiteMat);
            stud.position.set(xOff, markY + 0.01, zPos + dashLen / 2 + dashGap / 2);
            group.add(stud);
          }
        }
      }

      // Directional arrows on each lane
      for (let lane = 0; lane < lanesPerDir; lane++) {
        const laneCenterX = dirOffset + dirSign * (lane + 0.5) * lw;
        const arrowType = lane === 0 ? 'straight' : (lane === lanesPerDir - 1 ? (dirSign > 0 ? 'right' : 'left') : 'straight');
        [-40, 20].forEach(zPos => {
          const arrowGeo = new THREE.PlaneGeometry(1.5, 3.0);
          arrowGeo.rotateX(-Math.PI / 2);
          const arrowMat = new THREE.MeshBasicMaterial({
            map: getLaneArrowTexture(arrowType),
            transparent: true,
            opacity: 0.88,
          });
          const arrow = new THREE.Mesh(arrowGeo, arrowMat);
          arrow.position.set(laneCenterX, markY + 0.006, zPos);
          if (dirSign < 0) arrow.rotation.y = Math.PI;
          group.add(arrow);
        });
      }
    }

    // Outer continuous edge lines
    const totalLaneW = lanesPerDir * lw;
    const edgeOffsets = [
      mw / 2 + totalLaneW - 0.15,
      -(mw / 2 + totalLaneW - 0.15),
    ];
    edgeOffsets.forEach(xOff => {
      const geo = new THREE.BoxGeometry(markW * 1.2, markH, config.length);
      const m = new THREE.Mesh(geo, whiteMat);
      m.position.set(xOff, markY, 0);
      group.add(m);
    });

    // Inner median edge lines (solid yellow)
    if (mw > 0) {
      [-mw / 2 + 0.15, mw / 2 - 0.15].forEach(xOff => {
        const geo = new THREE.BoxGeometry(markW, markH, config.length);
        const m = new THREE.Mesh(geo, yellowMat);
        m.position.set(xOff, markY, 0);
        group.add(m);
      });
    }

    // Pedestrian zebra crossing at junction points
    [-65, 65].forEach(zPos => {
      for (let dir = 0; dir < 2; dir++) {
        const dirSign = dir === 0 ? 1 : -1;
        const dirCenter = dirSign * (mw / 2 + totalLaneW / 2);
        const zebraGeo = new THREE.PlaneGeometry(totalLaneW * 0.96, 5.0);
        zebraGeo.rotateX(-Math.PI / 2);
        const zebraMat = new THREE.MeshStandardMaterial({
          map: getZebraCrosswalkTexture(),
          roughness: 0.6,
        });
        const zebra = new THREE.Mesh(zebraGeo, zebraMat);
        zebra.position.set(dirCenter, markY + 0.005, zPos);
        group.add(zebra);
      }
    });
  }

  return group;
}

// ─── Central median with Concrete Jersey Crash Barriers ───────────────────────
export function createMedian(config: RoadGeometryConfig): THREE.Group {
  const group = new THREE.Group();
  if (!config.hasMedian || !config.medianWidth) return group;

  const mw = config.medianWidth;
  const len = config.length;

  // Concrete Jersey barrier base
  const curbGeo = new THREE.BoxGeometry(mw, 0.28, len);
  const curbMat = createCurbMaterial();
  const curb = new THREE.Mesh(curbGeo, curbMat);
  curb.position.y = 0.14;
  curb.receiveShadow = true;
  curb.castShadow = true;
  group.add(curb);

  // Center reinforced crash barrier wall
  const barrierH = 0.85;
  const barrierW = Math.min(0.6, mw * 0.45);
  const barrierGeo = new THREE.BoxGeometry(barrierW, barrierH, len);
  const barrierMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.65,
    metalness: 0.15,
  });
  const barrier = new THREE.Mesh(barrierGeo, barrierMat);
  barrier.position.y = 0.28 + barrierH / 2;
  barrier.castShadow = true;
  barrier.receiveShadow = true;
  group.add(barrier);

  // Amber reflectors on crash barrier
  const barStudGeo = new THREE.BoxGeometry(0.08, 0.08, 0.02);
  const barAmberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.8,
  });
  for (let z = -len / 2 + 10; z < len / 2; z += 12) {
    [-barrierW / 2 - 0.01, barrierW / 2 + 0.01].forEach(x => {
      const stud = new THREE.Mesh(barStudGeo, barAmberMat);
      stud.position.set(x, 0.28 + barrierH * 0.7, z);
      group.add(stud);
    });
  }

  // Green turf strip flanking the barrier if wide enough
  if (mw >= 2.0) {
    const turfW = (mw - barrierW) / 2 - 0.15;
    [-mw / 4 - barrierW / 4, mw / 4 + barrierW / 4].forEach(x => {
      const turfGeo = new THREE.BoxGeometry(turfW, 0.06, len - 1);
      const turfMat = new THREE.MeshStandardMaterial({
        color: 0x2d6a4f,
        roughness: 0.9,
      });
      const turf = new THREE.Mesh(turfGeo, turfMat);
      turf.position.set(x, 0.28 + 0.03, 0);
      group.add(turf);
    });
  }

  return group;
}

// ─── Sidewalk & Curbs ─────────────────────────────────────────────────────────
export function createSidewalk(config: RoadGeometryConfig, side: 'left' | 'right'): THREE.Group {
  const group = new THREE.Group();
  const sw = config.sidewalkWidth ?? 2.5;
  const roadHalfW = getTotalRoadWidth(config) / 2;
  const sign = side === 'left' ? -1 : 1;

  // Raised pedestrian pavement
  const walkGeo = new THREE.BoxGeometry(sw, 0.22, config.length);
  const walkMat = createSidewalkMaterial();
  const walk = new THREE.Mesh(walkGeo, walkMat);
  walk.position.set(sign * (roadHalfW + sw / 2), 0.11, 0);
  walk.receiveShadow = true;
  group.add(walk);

  // Bevelled granite curb separating road and sidewalk
  const curbGeo = new THREE.BoxGeometry(0.35, 0.26, config.length);
  const curbMat = createCurbMaterial();
  const curb = new THREE.Mesh(curbGeo, curbMat);
  curb.position.set(sign * (roadHalfW - 0.175), 0.13, 0);
  curb.castShadow = true;
  curb.receiveShadow = true;
  group.add(curb);

  return group;
}

// ─── Road shoulder & Rumble strip ─────────────────────────────────────────────
export function createShoulder(config: RoadGeometryConfig, side: 'left' | 'right'): THREE.Group {
  const group = new THREE.Group();
  const sw = config.shoulderWidth ?? 2.0;
  const lanesW = config.lanes * config.laneWidth;
  const medianW = config.medianWidth ?? 0;
  const halfRoad = (lanesW + medianW) / 2;
  const sign = side === 'left' ? -1 : 1;

  const geo = new THREE.BoxGeometry(sw, 0.14, config.length);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x474c54,
    roughness: 0.9,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(sign * (halfRoad + sw / 2), 0.07, 0);
  mesh.receiveShadow = true;
  group.add(mesh);

  // Textured corrugated rumble strips along edge
  const rumbleGeo = new THREE.BoxGeometry(0.4, 0.02, 0.35);
  const rumbleMat = new THREE.MeshStandardMaterial({
    color: 0x33373d,
    roughness: 0.7,
  });
  for (let z = -config.length / 2 + 1; z < config.length / 2; z += 1.2) {
    const r = new THREE.Mesh(rumbleGeo, rumbleMat);
    r.position.set(sign * (halfRoad + 0.25), 0.142, z);
    group.add(r);
  }

  return group;
}

// ─── Drainage channels & slotted grates ───────────────────────────────────────
export function createDrainageChannel(config: RoadGeometryConfig, side: 'left' | 'right'): THREE.Group {
  const group = new THREE.Group();
  const roadHalfW = getTotalRoadWidth(config) / 2;
  const sign = side === 'left' ? -1 : 1;

  // Concrete gutter channel
  const geo = new THREE.BoxGeometry(0.7, 0.2, config.length);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.7,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(sign * (roadHalfW + 0.35 + (config.sidewalkWidth ?? 0)), 0.04, 0);
  group.add(mesh);

  // Drainage storm grates every 25 meters
  const grateGeo = new THREE.BoxGeometry(0.55, 0.03, 1.2);
  const grateMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
    metalness: 0.7,
  });
  for (let z = -config.length / 2 + 10; z < config.length / 2; z += 25) {
    const grate = new THREE.Mesh(grateGeo, grateMat);
    grate.position.set(sign * (roadHalfW + 0.35 + (config.sidewalkWidth ?? 0)), 0.142, z);
    group.add(grate);
  }

  return group;
}

// ─── Full road assembler ──────────────────────────────────────────────────────
export function buildRoad(config: RoadGeometryConfig): THREE.Group {
  const group = new THREE.Group();
  group.name = 'civil-road-assembly';

  group.add(createRoadBase(config));
  if (config.hasMarkings) group.add(createLaneMarkings(config));
  if (config.hasMedian) group.add(createMedian(config));

  if (config.hasShoulder) {
    group.add(createShoulder(config, 'left'));
    group.add(createShoulder(config, 'right'));
  }
  if (config.hasSidewalk) {
    group.add(createSidewalk(config, 'left'));
    group.add(createSidewalk(config, 'right'));
  }
  if (config.hasDrainage) {
    group.add(createDrainageChannel(config, 'left'));
    group.add(createDrainageChannel(config, 'right'));
  }

  return group;
}
