import * as THREE from 'three';

/**
 * Generates realistic procedural canvas textures for civil engineering asphalt surfaces,
 * lane markings, arrows, zebra crossings, and curbs.
 */

let cachedAsphaltTexture: THREE.CanvasTexture | null = null;
let cachedWornAsphaltTexture: THREE.CanvasTexture | null = null;
let cachedZebraTexture: THREE.CanvasTexture | null = null;
let cachedArrowTextures: Map<string, THREE.CanvasTexture> = new Map();

/**
 * Creates high-detail procedural asphalt texture with aggregate specks,
 * subtle micro-roughness and tire wear shading.
 */
export function getProceduralAsphaltTexture(worn = false): THREE.CanvasTexture {
  if (worn && cachedWornAsphaltTexture) return cachedWornAsphaltTexture;
  if (!worn && cachedAsphaltTexture) return cachedAsphaltTexture;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Base dark asphalt tone
    const baseColor = worn ? '#2e3136' : '#22252a';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);

    // Subtle aggregate grain
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    // Seeded-style high-density noise
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * (worn ? 36 : 24);
      data[i]     = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle longitudinal tire track wear streaks
    const gradient = ctx.createLinearGradient(0, 0, size, 0);
    gradient.addColorStop(0, 'rgba(0,0,0,0.15)');
    gradient.addColorStop(0.2, 'rgba(20,20,25,0.05)');
    gradient.addColorStop(0.35, 'rgba(0,0,0,0.22)'); // left wheel path
    gradient.addColorStop(0.5, 'rgba(30,30,35,0.02)');
    gradient.addColorStop(0.65, 'rgba(0,0,0,0.22)'); // right wheel path
    gradient.addColorStop(0.8, 'rgba(20,20,25,0.05)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.15)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 16);

  if (worn) {
    cachedWornAsphaltTexture = texture;
  } else {
    cachedAsphaltTexture = texture;
  }

  return texture;
}

/**
 * Creates procedural texture for pedestrian zebra crossings.
 */
export function getZebraCrosswalkTexture(): THREE.CanvasTexture {
  if (cachedZebraTexture) return cachedZebraTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, 256, 256);

    // Crisp white thermal plastic bars
    ctx.fillStyle = '#f8fafc';
    const numBars = 6;
    const barWidth = 256 / (numBars * 2);
    for (let i = 0; i < numBars; i++) {
      ctx.fillRect(i * barWidth * 2 + barWidth * 0.2, 10, barWidth * 1.6, 236);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  cachedZebraTexture = texture;
  return texture;
}

/**
 * Creates procedural texture for lane direction arrows (straight, left, right).
 */
export function getLaneArrowTexture(type: 'straight' | 'left' | 'right' | 'straight_left' | 'straight_right'): THREE.CanvasTexture {
  if (cachedArrowTextures.has(type)) return cachedArrowTextures.get(type)!;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, 128, 256);
    ctx.fillStyle = '#f8fafc';

    ctx.save();
    ctx.translate(64, 128);

    if (type === 'straight') {
      // Arrow shaft
      ctx.fillRect(-6, -60, 12, 120);
      // Arrow head
      ctx.beginPath();
      ctx.moveTo(0, -95);
      ctx.lineTo(28, -50);
      ctx.lineTo(12, -50);
      ctx.lineTo(12, -60);
      ctx.lineTo(-12, -60);
      ctx.lineTo(-12, -50);
      ctx.lineTo(-28, -50);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'left') {
      ctx.beginPath();
      ctx.moveTo(-10, 40);
      ctx.bezierCurveTo(-10, -10, -25, -40, -45, -50);
      ctx.lineTo(-45, -30);
      ctx.lineTo(-75, -55);
      ctx.lineTo(-45, -80);
      ctx.lineTo(-45, -60);
      ctx.bezierCurveTo(-15, -50, 2, -10, 2, 40);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'right') {
      ctx.beginPath();
      ctx.moveTo(10, 40);
      ctx.bezierCurveTo(10, -10, 25, -40, 45, -50);
      ctx.lineTo(45, -30);
      ctx.lineTo(75, -55);
      ctx.lineTo(45, -80);
      ctx.lineTo(45, -60);
      ctx.bezierCurveTo(15, -50, -2, -10, -2, 40);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  cachedArrowTextures.set(type, texture);
  return texture;
}
