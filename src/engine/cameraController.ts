import * as THREE from 'three';
import type { CameraMode } from '../types/infrastructure';
import type { GeoBounds } from './RealLocationManager';

export interface CameraTarget {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

const CAMERA_PRESETS: Record<string, CameraTarget> = {
  overview: {
    position: new THREE.Vector3(0, 180, 160),
    lookAt: new THREE.Vector3(0, 0, 0),
  },
  road_level: {
    position: new THREE.Vector3(8, 3.5, -30),
    lookAt: new THREE.Vector3(0, 1.5, 40),
  },
  follow: {
    position: new THREE.Vector3(4, 6, -50),
    lookAt: new THREE.Vector3(0, 2, 30),
  },
  flyover: {
    position: new THREE.Vector3(30, 35, -80),
    lookAt: new THREE.Vector3(0, 0, 20),
  },
  hero: {
    position: new THREE.Vector3(-18, 22, 80),
    lookAt: new THREE.Vector3(0, 2, -60),
  },
  top: {
    position: new THREE.Vector3(0, 220, 0.1),
    lookAt: new THREE.Vector3(0, 0, 0),
  },
};

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private currentTarget: CameraTarget;
  private lerpSpeed = 0.05;
  private _mode: CameraMode = 'overview';

  // Interactive navigation state
  private domElement: HTMLElement | null = null;
  private isPointerDown = false;
  private pointerButton = 0; // 0: Left (Orbit), 2: Right (Pan)
  private previousPointer = { x: 0, y: 0 };
  private activeTouches: Map<number, { x: number; y: number }> = new Map();
  private initialPinchDist = 0;

  // Spherical orbit parameters around currentTarget.lookAt
  private spherical = new THREE.Spherical(200, Math.PI / 4, 0);

  // Flight animation state
  private isFlying = false;
  private flightStart: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
  private flightTarget: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
  private flightProgress = 0;
  private flightDuration = 1.8;
  private flightCallback?: () => void;

  // Cinematic auto-rotation
  private isCinematicOrbit = false;
  private orbitSpeed = 0.003;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.currentTarget = { ...CAMERA_PRESETS.overview };
    this.applyImmediate(CAMERA_PRESETS.overview);
    this.updateSphericalFromCurrent();
  }

  get mode() { return this._mode; }

  setMode(mode: CameraMode) {
    this._mode = mode;
    this.isCinematicOrbit = (mode === 'hero' || mode === 'overview');
    if (CAMERA_PRESETS[mode]) {
      this.currentTarget = {
        position: CAMERA_PRESETS[mode].position.clone(),
        lookAt: CAMERA_PRESETS[mode].lookAt.clone(),
      };
      this.updateSphericalFromCurrent();
    }
  }

  setModeImmediate(mode: CameraMode) {
    this._mode = mode;
    this.isCinematicOrbit = (mode === 'hero' || mode === 'overview');
    if (CAMERA_PRESETS[mode]) {
      this.applyImmediate(CAMERA_PRESETS[mode]);
      this.updateSphericalFromCurrent();
    }
  }

  private applyImmediate(t: CameraTarget) {
    this.camera.position.copy(t.position);
    this.camera.lookAt(t.lookAt);
    this.currentTarget = { position: t.position.clone(), lookAt: t.lookAt.clone() };
  }

  private updateSphericalFromCurrent() {
    const offset = new THREE.Vector3().subVectors(this.currentTarget.position, this.currentTarget.lookAt);
    this.spherical.setFromVector3(offset);
  }

  // Drive camera based on demo timeline progress
  driveFromProgress(progress: number) {
    if (this._mode !== 'road_level' && this._mode !== 'flyover' && this._mode !== 'follow' && this._mode !== 'hero') {
      return;
    }
    if (progress < 0.10) {
      this.setMode('overview');
    } else if (progress < 0.25) {
      this.setMode('road_level');
    } else if (progress < 0.55) {
      this.setMode('flyover');
    } else if (progress < 0.85) {
      this.setMode('follow');
    } else {
      this.setMode('hero');
    }
  }

  flyTo(
    destPos: THREE.Vector3,
    destLookAt: THREE.Vector3,
    duration = 1.8,
    onComplete?: () => void
  ) {
    this.isFlying = true;
    this.isCinematicOrbit = false;
    this.flightProgress = 0;
    this.flightDuration = Math.max(0.4, duration);
    this.flightCallback = onComplete;

    const currentLook = new THREE.Vector3();
    this.camera.getWorldDirection(currentLook);
    const lookAtPos = this.camera.position.clone().add(currentLook.multiplyScalar(60));

    this.flightStart = {
      pos: this.camera.position.clone(),
      look: lookAtPos,
    };
    this.flightTarget = {
      pos: destPos.clone(),
      look: destLookAt.clone(),
    };
  }

  /**
   * Fit camera dynamically to the entire geographic extent of the active city.
   */
  fitWholeArea(bounds: GeoBounds, duration = 1.8) {
    this._mode = 'whole_area';
    const centerX = bounds.centerX;
    const centerZ = bounds.centerZ;
    const maxSpan = bounds.maxSpan;

    const fovRad = (this.camera.fov * Math.PI) / 180;
    const requiredDistance = (maxSpan / 2) / Math.tan(fovRad / 2);
    const altitude = Math.max(160, Math.min(3200, requiredDistance * 1.08));
    const offsetZ = altitude * 0.72;

    const destPos = new THREE.Vector3(centerX, altitude, centerZ + offsetZ);
    const destLookAt = new THREE.Vector3(centerX, 0, centerZ);

    this.flyTo(destPos, destLookAt, duration, () => {
      this.updateSphericalFromCurrent();
    });
  }

  /**
   * Fit camera to any arbitrary bounding box with padding.
   */
  fitToBounds(minX: number, maxX: number, minZ: number, maxZ: number, duration = 1.8) {
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const spanX = Math.max(120, maxX - minX);
    const spanZ = Math.max(120, maxZ - minZ);
    const maxSpan = Math.max(spanX, spanZ);

    const fovRad = (this.camera.fov * Math.PI) / 180;
    const requiredDistance = (maxSpan / 2) / Math.tan(fovRad / 2);
    const altitude = Math.max(160, Math.min(3200, requiredDistance * 1.05));
    const offsetZ = altitude * 0.70;

    const destPos = new THREE.Vector3(centerX, altitude, centerZ + offsetZ);
    const destLookAt = new THREE.Vector3(centerX, 0, centerZ);

    this.flyTo(destPos, destLookAt, duration, () => {
      this.updateSphericalFromCurrent();
    });
  }

  /**
   * 2D GIS Top-Down View (looking directly down, North up).
   */
  setTopDownView(bounds: GeoBounds | null, duration = 1.6) {
    this._mode = 'top';
    const centerX = bounds ? bounds.centerX : 0;
    const centerZ = bounds ? bounds.centerZ : 0;
    const maxSpan = bounds ? bounds.maxSpan : 600;

    const fovRad = (this.camera.fov * Math.PI) / 180;
    const requiredDistance = (maxSpan / 2) / Math.tan(fovRad / 2);
    const altitude = Math.max(180, Math.min(3400, requiredDistance * 1.15));

    // Position directly above center, looking straight down
    const destPos = new THREE.Vector3(centerX, altitude, centerZ + 0.01);
    const destLookAt = new THREE.Vector3(centerX, 0, centerZ);

    this.flyTo(destPos, destLookAt, duration, () => {
      this.updateSphericalFromCurrent();
    });
  }

  /**
   * 3D Perspective Isometric View (45-degree angle).
   */
  set3DView(bounds: GeoBounds | null, duration = 1.6) {
    this._mode = 'view_3d';
    const centerX = bounds ? bounds.centerX : 0;
    const centerZ = bounds ? bounds.centerZ : 0;
    const maxSpan = bounds ? bounds.maxSpan : 600;

    const fovRad = (this.camera.fov * Math.PI) / 180;
    const requiredDistance = (maxSpan / 2) / Math.tan(fovRad / 2);
    const altitude = Math.max(160, Math.min(2800, requiredDistance * 0.95));
    const offsetZ = altitude * 0.75;
    const offsetX = -altitude * 0.35;

    const destPos = new THREE.Vector3(centerX + offsetX, altitude, centerZ + offsetZ);
    const destLookAt = new THREE.Vector3(centerX, 0, centerZ);

    this.flyTo(destPos, destLookAt, duration, () => {
      this.updateSphericalFromCurrent();
    });
  }

  /**
   * High-Altitude Cinematic Establishing Shot.
   */
  setCinematicView(bounds: GeoBounds | null, duration = 2.0) {
    this._mode = 'hero';
    this.isCinematicOrbit = true;
    const centerX = bounds ? bounds.centerX : 0;
    const centerZ = bounds ? bounds.centerZ : 0;
    const maxSpan = bounds ? bounds.maxSpan : 600;

    const fovRad = (this.camera.fov * Math.PI) / 180;
    const requiredDistance = (maxSpan / 2) / Math.tan(fovRad / 2);
    const altitude = Math.max(220, Math.min(2600, requiredDistance * 1.1));
    const offsetZ = altitude * 0.85;

    const destPos = new THREE.Vector3(centerX - altitude * 0.5, altitude, centerZ + offsetZ);
    const destLookAt = new THREE.Vector3(centerX, 0, centerZ);

    this.flyTo(destPos, destLookAt, duration, () => {
      this.updateSphericalFromCurrent();
    });
  }

  /**
   * Focus on a specific element (road, junction, bottleneck, spine)
   * while generously retaining the surrounding city context.
   */
  focusElement(
    worldPos: THREE.Vector3,
    viewType: 'road' | 'junction' | 'bottleneck' | 'spine' | 'zone' = 'road',
    duration = 1.5
  ) {
    let altitude = 110;
    let offsetZ = 120;
    let offsetX = 40;

    if (viewType === 'junction') {
      altitude = 90;
      offsetZ = 95;
      offsetX = 30;
    } else if (viewType === 'bottleneck') {
      altitude = 120;
      offsetZ = 135;
      offsetX = 50;
    } else if (viewType === 'spine') {
      altitude = 180;
      offsetZ = 190;
      offsetX = 60;
    }

    const destPos = new THREE.Vector3(worldPos.x + offsetX, altitude, worldPos.z + offsetZ);
    const destLookAt = new THREE.Vector3(worldPos.x, 0.5, worldPos.z);

    this.flyTo(destPos, destLookAt, duration, () => {
      this.updateSphericalFromCurrent();
    });
  }

  /**
   * Step zoom (In / Out)
   */
  zoom(direction: 'in' | 'out', factor = 0.25) {
    this.isFlying = false;
    this.isCinematicOrbit = false;

    const currentDist = this.spherical.radius;
    const newDist = direction === 'in'
      ? Math.max(25, currentDist * (1 - factor))
      : Math.min(3500, currentDist * (1 + factor));

    this.spherical.radius = newDist;

    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.currentTarget.position.copy(this.currentTarget.lookAt).add(offset);
  }

  /**
   * Reset rotation to North (looking along -Z axis).
   */
  resetNorth() {
    this.isFlying = false;
    this.isCinematicOrbit = false;
    this.spherical.theta = 0; // Aligns North
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.currentTarget.position.copy(this.currentTarget.lookAt).add(offset);
  }

  // ── Mouse / Touch Interactive Navigation Listeners ───────────────────────────

  attachDomElement(domElement: HTMLElement) {
    this.domElement = domElement;

    domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    domElement.addEventListener('wheel', this.onWheel, { passive: false });
    domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  detachDomElement() {
    if (!this.domElement) return;

    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    this.domElement = null;
  }

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private onPointerDown = (e: PointerEvent) => {
    this.isPointerDown = true;
    this.pointerButton = e.button;
    this.previousPointer = { x: e.clientX, y: e.clientY };
    this.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Interrupt auto-flight and cinematic rotation on direct user interaction
    if (this.isFlying) this.isFlying = false;
    this.isCinematicOrbit = false;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isPointerDown) return;

    this.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch pinch-to-zoom check
    if (this.activeTouches.size === 2) {
      const touches = Array.from(this.activeTouches.values());
      const dist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
      if (this.initialPinchDist > 0) {
        const delta = (this.initialPinchDist - dist) * 2.0;
        this.spherical.radius = Math.max(25, Math.min(3500, this.spherical.radius + delta));
        const offset = new THREE.Vector3().setFromSpherical(this.spherical);
        this.currentTarget.position.copy(this.currentTarget.lookAt).add(offset);
      }
      this.initialPinchDist = dist;
      return;
    }

    const deltaX = e.clientX - this.previousPointer.x;
    const deltaY = e.clientY - this.previousPointer.y;
    this.previousPointer = { x: e.clientX, y: e.clientY };

    // PAN: Right Mouse Button or Shift + Left Mouse Button
    if (this.pointerButton === 2 || (this.pointerButton === 0 && e.shiftKey)) {
      const panSpeed = (this.spherical.radius / 1000) * 0.85;

      // Get camera view vectors projected onto XZ ground plane
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      const panDelta = new THREE.Vector3()
        .addScaledVector(right, -deltaX * panSpeed)
        .addScaledVector(forward, deltaY * panSpeed);

      this.currentTarget.position.add(panDelta);
      this.currentTarget.lookAt.add(panDelta);
      return;
    }

    // ORBIT: Left Mouse Button
    if (this.pointerButton === 0) {
      const rotSpeed = 0.005;
      this.spherical.theta -= deltaX * rotSpeed;
      this.spherical.phi -= deltaY * rotSpeed;

      // Clamp polar angle (keep camera above ground, don't flip upside down)
      this.spherical.phi = Math.max(0.12, Math.min(Math.PI / 2 - 0.08, this.spherical.phi));

      const offset = new THREE.Vector3().setFromSpherical(this.spherical);
      this.currentTarget.position.copy(this.currentTarget.lookAt).add(offset);
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    this.activeTouches.delete(e.pointerId);
    if (this.activeTouches.size === 0) {
      this.isPointerDown = false;
      this.initialPinchDist = 0;
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.isFlying = false;
    this.isCinematicOrbit = false;

    const zoomSpeed = 0.0015;
    const factor = Math.exp(e.deltaY * zoomSpeed);

    this.spherical.radius = Math.max(25, Math.min(3500, this.spherical.radius * factor));

    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.currentTarget.position.copy(this.currentTarget.lookAt).add(offset);
  };

  // ── Render Loop Update ───────────────────────────────────────────────────────

  update(delta = 0.016) {
    // 1. Flight travel interpolation
    if (this.isFlying && this.flightStart && this.flightTarget) {
      this.flightProgress += delta / this.flightDuration;
      const p = Math.min(1, this.flightProgress);

      const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const arcHeight = Math.sin(p * Math.PI) * 50;

      this.camera.position.lerpVectors(this.flightStart.pos, this.flightTarget.pos, ease);
      this.camera.position.y += arcHeight;

      const currentLook = new THREE.Vector3().lerpVectors(
        this.flightStart.look,
        this.flightTarget.look,
        ease
      );
      this.camera.lookAt(currentLook);

      if (p >= 1) {
        this.isFlying = false;
        this.currentTarget = {
          position: this.flightTarget.pos.clone(),
          lookAt: this.flightTarget.look.clone(),
        };
        this.updateSphericalFromCurrent();
        this.flightCallback?.();
      }
      return;
    }

    // 2. Slow cinematic establishing orbit
    if (this.isCinematicOrbit && !this.isPointerDown) {
      this.spherical.theta += this.orbitSpeed * delta * 60;
      const offset = new THREE.Vector3().setFromSpherical(this.spherical);
      this.currentTarget.position.copy(this.currentTarget.lookAt).add(offset);
    }

    // 3. Smooth damping to target
    const t = this.lerpSpeed;
    this.camera.position.lerp(this.currentTarget.position, t);

    const currentLook = new THREE.Vector3();
    this.camera.getWorldDirection(currentLook);
    const desiredDir = this.currentTarget.lookAt.clone().sub(this.camera.position).normalize();
    const blended = currentLook.lerp(desiredDir, t * 2.2).normalize();
    this.camera.lookAt(this.camera.position.clone().add(blended));
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
