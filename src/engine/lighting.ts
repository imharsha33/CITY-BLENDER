import * as THREE from 'three';

export type LightingMode = 'day' | 'sunset' | 'night';

export function setupLighting(scene: THREE.Scene): void {
  // Google Maps light ambient hemisphere
  const hemi = new THREE.HemisphereLight(0xffffff, 0xf4f3f0, 0.9);
  scene.add(hemi);

  // Primary sun
  const sun = new THREE.DirectionalLight(0xffffff, 1.25);
  sun.position.set(80, 160, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.width  = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 1.0;
  sun.shadow.camera.far  = 600;
  sun.shadow.camera.left   = -180;
  sun.shadow.camera.right  =  180;
  sun.shadow.camera.top    =  180;
  sun.shadow.camera.bottom = -180;
  sun.shadow.bias = -0.0003;
  scene.add(sun);

  // Soft fill from opposite side
  const fill = new THREE.DirectionalLight(0xe8f0fe, 0.45);
  fill.position.set(-60, 50, -80);
  scene.add(fill);

  // Clean light fog
  scene.fog = new THREE.Fog(0xf1f3f4, 2000, 35000);
}

export function setLightingPreset(scene: THREE.Scene, mode: LightingMode): void {
  const hemi = scene.children.find(
    c => c instanceof THREE.HemisphereLight
  ) as THREE.HemisphereLight | undefined;
  const sun = scene.children.find(
    c => c instanceof THREE.DirectionalLight && c.position.x > 0
  ) as THREE.DirectionalLight | undefined;
  const fill = scene.children.find(
    c => c instanceof THREE.DirectionalLight && c.position.x < 0
  ) as THREE.DirectionalLight | undefined;

  if (mode === 'day') {
    scene.background = new THREE.Color(0xf1f3f4); // Google Maps crisp light background
    if (scene.fog) {
      scene.fog.color.setHex(0xf1f3f4);
      (scene.fog as THREE.Fog).near = 2000;
      (scene.fog as THREE.Fog).far = 35000;
    }
    if (hemi) {
      hemi.color.setHex(0xffffff);
      hemi.groundColor.setHex(0xf4f3f0);
      hemi.intensity = 0.95;
    }
    if (sun) {
      sun.color.setHex(0xffffff);
      sun.intensity = 1.35;
      sun.position.set(100, 220, 80);
    }
    if (fill) fill.intensity = 0.45;
  } else if (mode === 'sunset') {
    scene.background = new THREE.Color(0xfdecd8);
    if (scene.fog) scene.fog.color.setHex(0xfadbc5);
    if (hemi) {
      hemi.color.setHex(0xffedd5);
      hemi.groundColor.setHex(0xfde047);
      hemi.intensity = 0.75;
    }
    if (sun) {
      sun.color.setHex(0xf97316);
      sun.intensity = 1.25;
      sun.position.set(90, 40, -30);
    }
    if (fill) fill.intensity = 0.35;
  } else if (mode === 'night') {
    scene.background = new THREE.Color(0x1a1d24);
    if (scene.fog) scene.fog.color.setHex(0x1a1d24);
    if (hemi) {
      hemi.color.setHex(0x384152);
      hemi.groundColor.setHex(0x1f242e);
      hemi.intensity = 0.45;
    }
    if (sun) {
      sun.color.setHex(0x60a5fa);
      sun.intensity = 0.4;
      sun.position.set(40, 60, 20);
    }
    if (fill) fill.intensity = 0.2;
  }
}

export function setHeroLighting(scene: THREE.Scene): void {
  setLightingPreset(scene, 'day');
}

export function setNormalLighting(scene: THREE.Scene): void {
  setLightingPreset(scene, 'day');
}
