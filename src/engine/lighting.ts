import * as THREE from 'three';

export type LightingMode = 'day' | 'sunset' | 'night';

export function setupLighting(scene: THREE.Scene): void {
  // Ambient sky + ground hemisphere
  const hemi = new THREE.HemisphereLight(0xb0d8f0, 0x6a8050, 0.6);
  scene.add(hemi);

  // Primary sun
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.1);
  sun.position.set(60, 80, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.width  = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far  = 400;
  sun.shadow.camera.left   = -120;
  sun.shadow.camera.right  =  120;
  sun.shadow.camera.top    =  120;
  sun.shadow.camera.bottom = -120;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Soft fill from opposite side
  const fill = new THREE.DirectionalLight(0xd0e8ff, 0.3);
  fill.position.set(-40, 30, -60);
  scene.add(fill);

  // Clear, non-occluding atmospheric fog for city digital twins
  scene.fog = new THREE.Fog(0x0f172a, 1200, 25000);
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
    scene.background = new THREE.Color(0x0f172a); // Deep digital twin navy/slate
    if (scene.fog) {
      scene.fog.color.setHex(0x0f172a);
      (scene.fog as THREE.Fog).near = 1500;
      (scene.fog as THREE.Fog).far = 30000;
    }
    if (hemi) {
      hemi.color.setHex(0x94a3b8);
      hemi.groundColor.setHex(0x1e293b);
      hemi.intensity = 0.85;
    }
    if (sun) {
      sun.color.setHex(0xffffff);
      sun.intensity = 1.3;
      sun.position.set(120, 250, 100);
    }
    if (fill) fill.intensity = 0.5;
  } else if (mode === 'sunset') {
    scene.background = new THREE.Color(0xca7550);
    if (scene.fog) scene.fog.color.setHex(0xb86c4c);
    if (hemi) {
      hemi.color.setHex(0xff9e79);
      hemi.groundColor.setHex(0x7a4325);
      hemi.intensity = 0.55;
    }
    if (sun) {
      sun.color.setHex(0xff8833);
      sun.intensity = 1.3;
      sun.position.set(90, 30, -30);
    }
    if (fill) fill.intensity = 0.2;
  } else if (mode === 'night') {
    scene.background = new THREE.Color(0x0d131f);
    if (scene.fog) scene.fog.color.setHex(0x0d131f);
    if (hemi) {
      hemi.color.setHex(0x223355);
      hemi.groundColor.setHex(0x111622);
      hemi.intensity = 0.35;
    }
    if (sun) {
      sun.color.setHex(0x5577aa);
      sun.intensity = 0.25;
      sun.position.set(40, 60, 20);
    }
    if (fill) fill.intensity = 0.1;
  }
}

export function setHeroLighting(scene: THREE.Scene): void {
  setLightingPreset(scene, 'sunset');
}

export function setNormalLighting(scene: THREE.Scene): void {
  setLightingPreset(scene, 'day');
}
