import * as THREE from 'three';
import type { RoadGeometryConfig } from '../../types/infrastructure';

// ─── Materials ────────────────────────────────────────────────────────────────
export function createAsphaltMaterial(worn = false): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    color: worn ? 0x4a4a4a : 0x3a3a3a,
  });
}

export function createFreshAsphaltMaterial(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
}

export function createMarkingMaterial(color = 0xffffff): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

export function createMedianMaterial(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color: 0x607050 });
}

export function createSidewalkMaterial(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color: 0xb0a890 });
}

// ─── Road base plane ──────────────────────────────────────────────────────────
export function createRoadBase(config: RoadGeometryConfig): THREE.Mesh {
  const totalWidth = getTotalRoadWidth(config);
  const geo = new THREE.BoxGeometry(totalWidth, 0.12, config.length);
  const mat = createAsphaltMaterial(config.lanes === 1);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.position.y = 0.06;
  return mesh;
}

export function getTotalRoadWidth(config: RoadGeometryConfig): number {
  let w = config.lanes * config.laneWidth;
  if (config.hasMedian && config.medianWidth) w += config.medianWidth;
  if (config.hasShoulder && config.shoulderWidth) w += config.shoulderWidth * 2;
  if (config.hasSidewalk && config.sidewalkWidth) w += config.sidewalkWidth * 2;
  return w;
}

// ─── Lane markings ────────────────────────────────────────────────────────────
export function createLaneMarkings(config: RoadGeometryConfig): THREE.Group {
  const group = new THREE.Group();
  const mat = createMarkingMaterial(0xffffff);
  const dashLen = 3;
  const dashGap = 3;
  const numDashes = Math.floor(config.length / (dashLen + dashGap));
  const markW = 0.15;
  const markH = 0.01;

  if (config.lanes === 1) {
    // Single center dashed line
    for (let i = 0; i < numDashes; i++) {
      const geo = new THREE.BoxGeometry(markW, markH, dashLen);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(0, 0.13, -config.length / 2 + i * (dashLen + dashGap) + dashLen / 2);
      group.add(m);
    }
    // Edge lines
    const edgeMat = createMarkingMaterial(0xffffff);
    [-1, 1].forEach(side => {
      const eGeo = new THREE.BoxGeometry(markW, markH, config.length);
      const em = new THREE.Mesh(eGeo, edgeMat);
      em.position.set(side * (config.lanes * config.laneWidth / 2 - 0.1), 0.13, 0);
      group.add(em);
    });
  } else {
    const lanesPerDir = config.lanes / 2;
    const lw = config.laneWidth;
    const mw = config.medianWidth ?? 0;

    // Lane dividers per direction
    for (let dir = 0; dir < 2; dir++) {
      const dirSign = dir === 0 ? 1 : -1;
      const dirOffset = dirSign * (mw / 2 + lw / 2);

      for (let lane = 0; lane < lanesPerDir - 1; lane++) {
        const xOff = dirOffset + dirSign * (lane + 1) * lw;
        for (let i = 0; i < numDashes; i++) {
          const geo = new THREE.BoxGeometry(markW, markH, dashLen);
          const m = new THREE.Mesh(geo, mat);
          m.position.set(xOff, 0.13, -config.length / 2 + i * (dashLen + dashGap) + dashLen / 2);
          group.add(m);
        }
      }
    }

    // Outer edge lines
    const totalLaneW = lanesPerDir * lw;
    const edgeMat = createMarkingMaterial(0xffffff);
    const edgeOffsets = [
      mw / 2 + totalLaneW - 0.1,
      -(mw / 2 + totalLaneW - 0.1),
    ];
    edgeOffsets.forEach(xOff => {
      const geo = new THREE.BoxGeometry(markW, markH, config.length);
      const m = new THREE.Mesh(geo, edgeMat);
      m.position.set(xOff, 0.13, 0);
      group.add(m);
    });
  }

  return group;
}

// ─── Central median ───────────────────────────────────────────────────────────
export function createMedian(config: RoadGeometryConfig): THREE.Group {
  const group = new THREE.Group();
  if (!config.hasMedian || !config.medianWidth) return group;

  // Raised kerb base
  const kerbGeo = new THREE.BoxGeometry(config.medianWidth, 0.18, config.length);
  const kerbMat = new THREE.MeshLambertMaterial({ color: 0x808070 });
  const kerb = new THREE.Mesh(kerbGeo, kerbMat);
  kerb.position.y = 0.09;
  group.add(kerb);

  // Green strip on top
  const greenGeo = new THREE.BoxGeometry(config.medianWidth - 0.3, 0.05, config.length - 0.5);
  const greenMat = new THREE.MeshLambertMaterial({ color: 0x4a7a3a });
  const green = new THREE.Mesh(greenGeo, greenMat);
  green.position.y = 0.2;
  group.add(green);

  return group;
}

// ─── Sidewalk ─────────────────────────────────────────────────────────────────
export function createSidewalk(config: RoadGeometryConfig, side: 'left' | 'right'): THREE.Mesh {
  const sw = config.sidewalkWidth ?? 2;
  const roadHalfW = getTotalRoadWidth(config) / 2;
  const sign = side === 'left' ? -1 : 1;

  const geo = new THREE.BoxGeometry(sw, 0.15, config.length);
  const mat = createSidewalkMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(sign * (roadHalfW + sw / 2), 0.075, 0);
  mesh.receiveShadow = true;
  return mesh;
}

// ─── Road shoulder ────────────────────────────────────────────────────────────
export function createShoulder(config: RoadGeometryConfig, side: 'left' | 'right'): THREE.Mesh {
  const sw = config.shoulderWidth ?? 1.5;
  const lanesW = config.lanes * config.laneWidth;
  const medianW = config.medianWidth ?? 0;
  const halfRoad = (lanesW + medianW) / 2;
  const sign = side === 'left' ? -1 : 1;

  const geo = new THREE.BoxGeometry(sw, 0.10, config.length);
  const mat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(sign * (halfRoad + sw / 2), 0.05, 0);
  return mesh;
}

// ─── Drainage channel ─────────────────────────────────────────────────────────
export function createDrainageChannel(config: RoadGeometryConfig, side: 'left' | 'right'): THREE.Mesh {
  const roadHalfW = getTotalRoadWidth(config) / 2;
  const sign = side === 'left' ? -1 : 1;
  const geo = new THREE.BoxGeometry(0.6, 0.25, config.length);
  const mat = new THREE.MeshLambertMaterial({ color: 0x6a6a7a });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(sign * (roadHalfW + 0.3 + (config.sidewalkWidth ?? 0)), -0.05, 0);
  return mesh;
}

// ─── Full road assembler ──────────────────────────────────────────────────────
export function buildRoad(config: RoadGeometryConfig): THREE.Group {
  const group = new THREE.Group();
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
