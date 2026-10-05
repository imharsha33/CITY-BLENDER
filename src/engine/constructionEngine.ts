import * as THREE from 'three';
import type { ConstructionPhaseId } from '../types/infrastructure';
import { demoScenario } from '../data/demoScenario';

// ─── Timeline phase mapping ────────────────────────────────────────────────────
const PHASES = demoScenario.constructionPhases;

export function getPhaseForProgress(progress: number): ConstructionPhaseId {
  let current: ConstructionPhaseId = 'existing';
  for (const phase of PHASES) {
    if (progress >= phase.timelineStart) {
      current = phase.id;
    }
  }
  return current;
}

export function getPhaseProgress(progress: number, phaseId: ConstructionPhaseId): number {
  const phase = PHASES.find(p => p.id === phaseId);
  if (!phase) return 0;
  if (progress <= phase.timelineStart) return 0;
  if (progress >= phase.timelineEnd) return 1;
  const span = phase.timelineEnd - phase.timelineStart;
  if (span === 0) return 1;
  return (progress - phase.timelineStart) / span;
}

// ─── Reveal helpers ────────────────────────────────────────────────────────────

/** Reveals a mesh by scaling its Z from 0 to 1 (road extends along Z axis). */
export function revealAlongZ(mesh: THREE.Object3D, t: number, length: number) {
  const clamped = Math.max(0, Math.min(1, t));
  mesh.scale.z = clamped;
  // Keep centred as it grows
  if (mesh instanceof THREE.Mesh) {
    mesh.position.z = -length / 2 + (length * clamped) / 2;
  }
}

/** Shows/hides based on threshold. */
export function showAt(object: THREE.Object3D, progress: number, threshold: number) {
  object.visible = progress >= threshold;
}

/** Fades out an object (opacity) above a threshold. */
export function fadeOut(mesh: THREE.Mesh, progress: number, start: number, end: number) {
  const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
  const mat = mesh.material as THREE.MeshLambertMaterial;
  if (!mat.transparent) {
    mat.transparent = true;
  }
  mat.opacity = 1 - t;
  mesh.visible = mat.opacity > 0.01;
}

/** Reveals group children one by one as progress 0→1 within a phase. */
export function revealProgressive(group: THREE.Group, t: number) {
  const count = group.children.length;
  if (count === 0) return;
  const threshold = 1 / count;
  group.children.forEach((child, i) => {
    child.visible = t >= i * threshold;
  });
}

// ─── Main animation state ──────────────────────────────────────────────────────
export interface AnimatedScene {
  // Existing road
  existingRoad: THREE.Group;

  // Work zone
  surveyGroup:   THREE.Group;
  conesGroup:    THREE.Group;
  barriersGroup: THREE.Group;

  // Earthwork
  excavator:      THREE.Group;
  dumpTruck:      THREE.Group;
  earthPileGroup: THREE.Group;

  // New road layers
  roadBaseMesh:    THREE.Mesh;
  pavementMesh:    THREE.Group;
  drainageLeft:    THREE.Mesh;
  drainageRight:   THREE.Mesh;
  medianGroup:     THREE.Group;
  markingsGroup:   THREE.Group;
  streetLightsNew: THREE.Group;
  sidewalkLeft:    THREE.Mesh;
  sidewalkRight:   THREE.Mesh;
  shoulderLeft:    THREE.Mesh;
  shoulderRight:   THREE.Mesh;

  // Finishing
  roller:  THREE.Group;
  mixer:   THREE.Group;
  landscaping: THREE.Group;

  // Road corridor width controller
  corridorGroup: THREE.Group;

  roadLength: number;
}

// ─── Apply progress to the entire animated scene ──────────────────────────────
export function applyTimeline(scene: AnimatedScene, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const RL = scene.roadLength;

  // ── PHASE 0 · Existing road ──────────────────────────────────────────────
  // Gradually fade out worn asphalt appearance as construction begins
  scene.existingRoad.visible = true;
  const existingMat = (scene.existingRoad.children[0] as THREE.Mesh)
    ?.material as THREE.MeshLambertMaterial | undefined;
  if (existingMat) {
    existingMat.transparent = true;
    if (p < 0.28) {
      existingMat.opacity = 1.0;
    } else if (p < 0.48) {
      existingMat.opacity = 1 - getPhaseProgress(p, 'modification');
    } else {
      existingMat.opacity = 0;
      scene.existingRoad.visible = false;
    }
  }

  // ── PHASE 1 · Survey ─────────────────────────────────────────────────────
  {
    const t = p >= 0.08 && p < 0.28 ? 1 : p < 0.08 ? 0 : 0;
    scene.surveyGroup.visible = t > 0;
  }

  // ── PHASE 2 · Cones & barriers ───────────────────────────────────────────
  scene.conesGroup.visible    = p >= 0.18 && p < 0.92;
  scene.barriersGroup.visible = p >= 0.18 && p < 0.88;

  // ── PHASE 3–4 · Heavy equipment ──────────────────────────────────────────
  scene.excavator.visible  = p >= 0.28 && p < 0.56;
  scene.dumpTruck.visible  = p >= 0.28 && p < 0.64;
  scene.roller.visible     = p >= 0.56 && p < 0.80;
  scene.mixer.visible      = p >= 0.48 && p < 0.82;
  scene.earthPileGroup.visible = p >= 0.28 && p < 0.60;

  // Animate excavator rotation to simulate digging
  if (scene.excavator.visible) {
    const t = getPhaseProgress(p, 'earthwork');
    scene.excavator.rotation.y = Math.sin(t * Math.PI * 6) * 0.5 - 0.4;
  }

  // Road expansion happens via individual object visibility below

  {
    const t = getPhaseProgress(p, 'drainage');
    scene.drainageLeft.visible  = p >= 0.48;
    scene.drainageRight.visible = p >= 0.48;
    if (p >= 0.48) {
      scene.drainageLeft.scale.z  = Math.min(1, t * 1.1);
      scene.drainageRight.scale.z = Math.min(1, t * 1.1);
    }
  }

  // ── PHASE 6 · Road base ──────────────────────────────────────────────────
  {
    const t = getPhaseProgress(p, 'road_base');
    scene.roadBaseMesh.visible = p >= 0.56;
    if (p >= 0.56) {
      scene.roadBaseMesh.scale.z = Math.min(1, t * 1.1);
    }
  }

  // ── PHASE 7 · Pavement ───────────────────────────────────────────────────
  {
    const t = getPhaseProgress(p, 'pavement');
    scene.pavementMesh.visible = p >= 0.64;
    if (p >= 0.64) {
      // Reveal progressively along Z
      const reveal = Math.min(1, t * 1.05);
      scene.pavementMesh.scale.z = reveal;
      scene.pavementMesh.position.z = -RL / 2 + (RL * reveal) / 2;
    }
  }

  // ── PHASE 8 · Shoulders / sidewalks ──────────────────────────────────────
  scene.shoulderLeft.visible  = p >= 0.68;
  scene.shoulderRight.visible = p >= 0.68;
  scene.sidewalkLeft.visible  = p >= 0.72;
  scene.sidewalkRight.visible = p >= 0.72;

  // ── PHASE 8 · Median ────────────────────────────────────────────────────
  {
    const t = getPhaseProgress(p, 'median');
    scene.medianGroup.visible = p >= 0.74;
    if (p >= 0.74) {
      scene.medianGroup.scale.z = Math.min(1, t * 1.05);
      scene.medianGroup.position.z = -RL / 2 + (RL * Math.min(1, t * 1.05)) / 2;
    }
  }

  // ── PHASE 9 · Markings ──────────────────────────────────────────────────
  {
    const t = getPhaseProgress(p, 'markings');
    scene.markingsGroup.visible = p >= 0.82;
    if (p >= 0.82) {
      revealProgressive(scene.markingsGroup, t);
    }
  }

  // ── PHASE 10 · Street lights ─────────────────────────────────────────────
  {
    const t = getPhaseProgress(p, 'streetlights');
    scene.streetLightsNew.visible = p >= 0.88;
    if (p >= 0.88) {
      revealProgressive(scene.streetLightsNew, t);
    }
  }

  // ── PHASE 11 · Landscaping ───────────────────────────────────────────────
  {
    scene.landscaping.visible = p >= 0.94;
    if (p >= 0.94) {
      const t = getPhaseProgress(p, 'landscaping');
      revealProgressive(scene.landscaping, t);
    }
  }
}
