import * as THREE from 'three';
import { createVehicle, type VehicleInstance } from './Vehicles';
import type { VehicleConfig } from '../../types/infrastructure';
import type { CameraController } from '../../engine/cameraController';

export interface ApproachTelemetry {
  id: 'north' | 'east' | 'south' | 'west';
  name: string;
  densityLevel: 'High' | 'Moderate' | 'Light' | 'Low';
  densityVehPerHour: number;
  assignedGreenSeconds: number;
  currentSignal: 'RED' | 'AMBER' | 'GREEN';
  activeSensorPressureMpa: number;
  resistanceChangePercent: number;
  sensorTriggered: boolean;
}

export interface SignalJunctionTelemetry {
  currentPhase: 'NORTH_SOUTH' | 'EAST_WEST';
  phaseTimeRemaining: number;
  totalCycleSeconds: number;
  adaptiveMode: boolean;
  totalVehiclesDetected: number;
  approaches: Record<'north' | 'east' | 'south' | 'west', ApproachTelemetry>;
  latestSensorReading: {
    approach: string;
    pressureMpa: number;
    weightTons: number;
    deltaROverR: number;
    timestamp: number;
  };
}

export interface SmartSignalJunctionHandle {
  group: THREE.Group;
  update: (delta: number) => void;
  getTelemetry: () => SignalJunctionTelemetry;
  triggerVehiclePress: (approach?: 'north' | 'east' | 'south' | 'west') => void;
  setAdaptiveMode: (enabled: boolean) => void;
  focusCamera: (camCtrl: CameraController, viewPreset?: 'overview' | 'sensor_cutaway' | 'control_unit' | 'north_queue') => void;
  dispose: () => void;
}

export function buildSmartSignalJunction3D(): SmartSignalJunctionHandle {
  const group = new THREE.Group();
  group.name = 'smart-signal-junction-root';

  // ─── Materials ──────────────────────────────────────────────────────────────
  const ASPHALT_MAT = new THREE.MeshStandardMaterial({
    color: 0x24282e,
    roughness: 0.85,
    metalness: 0.1,
  });

  const MARKING_WHITE = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const MARKING_YELLOW = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const SIDEWALK_MAT = new THREE.MeshStandardMaterial({ color: 0xe6e2d8, roughness: 0.9 });
  const CURB_MAT = new THREE.MeshStandardMaterial({ color: 0xb5b0a4, roughness: 0.8 });
  const GRASS_MAT = new THREE.MeshStandardMaterial({ color: 0xa8c898, roughness: 0.95 });
  const CABINET_MAT = new THREE.MeshStandardMaterial({ color: 0xd8dde4, metalness: 0.7, roughness: 0.3 });
  const POLE_MAT = new THREE.MeshStandardMaterial({ color: 0x22262c, metalness: 0.8, roughness: 0.4 });
  const SENSOR_PLATE_MAT = new THREE.MeshStandardMaterial({
    color: 0x1f2329,
    metalness: 0.85,
    roughness: 0.3,
  });
  const SENSOR_ACTIVE_MAT = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 2.5,
    roughness: 0.2,
  });
  const CONDUIT_MAT = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

  // Signal Head Materials
  const SIGNAL_HOUSING_MAT = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.5 });
  const LENS_OFF_MAT = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
  const RED_ON_MAT = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 3.5 });
  const AMBER_ON_MAT = new THREE.MeshStandardMaterial({ color: 0xffab00, emissive: 0xffab00, emissiveIntensity: 3.0 });
  const GREEN_ON_MAT = new THREE.MeshStandardMaterial({ color: 0x00e676, emissive: 0x00e676, emissiveIntensity: 3.5 });

  // ─── 1. Road Geometry & Intersection Layout ─────────────────────────────────
  const roadHalfWidth = 7.0; // 14m wide total road
  const armLength = 80;

  // Central Intersection Box
  const centerGeo = new THREE.BoxGeometry(roadHalfWidth * 2, 0.2, roadHalfWidth * 2);
  centerGeo.translate(0, -0.1, 0);
  const centerMesh = new THREE.Mesh(centerGeo, ASPHALT_MAT);
  centerMesh.receiveShadow = true;
  group.add(centerMesh);

  // 4 Approach Corridor Roads
  // North (+Z), South (-Z), East (+X), West (-X)
  const northArm = new THREE.Mesh(new THREE.BoxGeometry(roadHalfWidth * 2, 0.2, armLength), ASPHALT_MAT);
  northArm.position.set(0, -0.1, roadHalfWidth + armLength / 2);
  northArm.receiveShadow = true;
  group.add(northArm);

  const southArm = new THREE.Mesh(new THREE.BoxGeometry(roadHalfWidth * 2, 0.2, armLength), ASPHALT_MAT);
  southArm.position.set(0, -0.1, -(roadHalfWidth + armLength / 2));
  southArm.receiveShadow = true;
  group.add(southArm);

  const eastArm = new THREE.Mesh(new THREE.BoxGeometry(armLength, 0.2, roadHalfWidth * 2), ASPHALT_MAT);
  eastArm.position.set(roadHalfWidth + armLength / 2, -0.1, 0);
  eastArm.receiveShadow = true;
  group.add(eastArm);

  const westArm = new THREE.Mesh(new THREE.BoxGeometry(armLength, 0.2, roadHalfWidth * 2), ASPHALT_MAT);
  westArm.position.set(-(roadHalfWidth + armLength / 2), -0.1, 0);
  westArm.receiveShadow = true;
  group.add(westArm);

  // Ground base surround
  const groundGeo = new THREE.PlaneGeometry(240, 240);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMesh = new THREE.Mesh(groundGeo, GRASS_MAT);
  groundMesh.position.y = -0.22;
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // ─── 2. Road Markings (Stop lines, Crosswalks, Dashed dividers) ──────────────
  function createCrosswalk(width: number, length: number, x: number, z: number, rotY = 0) {
    const cwGroup = new THREE.Group();
    cwGroup.position.set(x, 0.015, z);
    cwGroup.rotation.y = rotY;

    const barW = 0.55;
    const barGap = 0.55;
    const barLen = length;
    const numBars = Math.floor(width / (barW + barGap));
    const startX = -((numBars - 1) * (barW + barGap)) / 2;

    for (let i = 0; i < numBars; i++) {
      const barGeo = new THREE.BoxGeometry(barW, 0.01, barLen);
      const barMesh = new THREE.Mesh(barGeo, MARKING_WHITE);
      barMesh.position.set(startX + i * (barW + barGap), 0, 0);
      cwGroup.add(barMesh);
    }
    group.add(cwGroup);
  }

  // Crosswalks on each approach
  createCrosswalk(13, 3.2, 0, roadHalfWidth + 3.0, 0); // North
  createCrosswalk(13, 3.2, 0, -(roadHalfWidth + 3.0), 0); // South
  createCrosswalk(13, 3.2, roadHalfWidth + 3.0, 0, Math.PI / 2); // East
  createCrosswalk(13, 3.2, -(roadHalfWidth + 3.0), 0, Math.PI / 2); // West

  // Stop lines
  function createStopLine(x: number, z: number, rotY = 0) {
    const geo = new THREE.BoxGeometry(6.5, 0.012, 0.45);
    const mesh = new THREE.Mesh(geo, MARKING_WHITE);
    mesh.position.set(x, 0.018, z);
    mesh.rotation.y = rotY;
    group.add(mesh);
  }
  createStopLine(3.25, roadHalfWidth + 5.5, 0); // North inbound
  createStopLine(-3.25, -(roadHalfWidth + 5.5), 0); // South inbound
  createStopLine(roadHalfWidth + 5.5, -3.25, Math.PI / 2); // East inbound
  createStopLine(-(roadHalfWidth + 5.5), 3.25, Math.PI / 2); // West inbound

  // Center divider lines
  const divN = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.012, armLength - 6), MARKING_YELLOW);
  divN.position.set(0, 0.015, roadHalfWidth + 6 + (armLength - 6) / 2);
  group.add(divN);

  const divS = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.012, armLength - 6), MARKING_YELLOW);
  divS.position.set(0, 0.015, -(roadHalfWidth + 6 + (armLength - 6) / 2));
  group.add(divS);

  const divE = new THREE.Mesh(new THREE.BoxGeometry(armLength - 6, 0.012, 0.25), MARKING_YELLOW);
  divE.position.set(roadHalfWidth + 6 + (armLength - 6) / 2, 0.015, 0);
  group.add(divE);

  const divW = new THREE.Mesh(new THREE.BoxGeometry(armLength - 6, 0.012, 0.25), MARKING_YELLOW);
  divW.position.set(-(roadHalfWidth + 6 + (armLength - 6) / 2), 0.015, 0);
  group.add(divW);

  // ─── 3. Sidewalks & Corner Curbs ────────────────────────────────────────────
  const swW = 6.0;
  const swH = 0.22;
  const cornerDist = roadHalfWidth + swW / 2;

  function createSidewalkCorner(signX: number, signZ: number) {
    const swGeo = new THREE.BoxGeometry(swW, swH, swW);
    const sw = new THREE.Mesh(swGeo, SIDEWALK_MAT);
    sw.position.set(signX * cornerDist, swH / 2 - 0.1, signZ * cornerDist);
    sw.receiveShadow = true;
    group.add(sw);
  }
  createSidewalkCorner(1, 1);
  createSidewalkCorner(-1, 1);
  createSidewalkCorner(1, -1);
  createSidewalkCorner(-1, -1);

  // ─── 4. Traffic Control Unit (Cabinet) ──────────────────────────────────────
  const cabinetGroup = new THREE.Group();
  cabinetGroup.name = 'traffic-control-unit';
  cabinetGroup.position.set(roadHalfWidth + 2.5, 0, roadHalfWidth + 2.5);

  // Plinth foundation
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.4), CURB_MAT);
  plinth.position.y = 0.15;
  cabinetGroup.add(plinth);

  // Main cabinet body
  const cabBody = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.0, 1.1), CABINET_MAT);
  cabBody.position.y = 1.3;
  cabBody.castShadow = true;
  cabinetGroup.add(cabBody);

  // Status LEDs on cabinet
  const ledPower = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x00e676 })
  );
  ledPower.position.set(-0.35, 2.0, 0.56);
  cabinetGroup.add(ledPower);

  const ledData = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff })
  );
  ledData.position.set(-0.20, 2.0, 0.56);
  cabinetGroup.add(ledData);

  group.add(cabinetGroup);

  // ─── 5. Traffic Signal Poles & Aspect Heads ─────────────────────────────────
  interface SignalHeadMesh {
    approach: 'north' | 'east' | 'south' | 'west';
    poleGroup: THREE.Group;
    redMesh: THREE.Mesh;
    amberMesh: THREE.Mesh;
    greenMesh: THREE.Mesh;
    spotLight: THREE.PointLight;
  }

  const signalHeads: SignalHeadMesh[] = [];

  function createSignalPole(approach: 'north' | 'east' | 'south' | 'west', x: number, z: number, rotY: number) {
    const poleGroup = new THREE.Group();
    poleGroup.position.set(x, 0, z);
    poleGroup.rotation.y = rotY;

    // Vertical mast pole
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6.2, 12), POLE_MAT);
    mast.position.y = 3.1;
    mast.castShadow = true;
    poleGroup.add(mast);

    // Cantilever horizontal mast arm extending over inbound lanes
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.5, 10), POLE_MAT);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(-2.25, 5.8, 0);
    poleGroup.add(arm);

    // Signal housing box over lane
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.8, 0.45), SIGNAL_HOUSING_MAT);
    box.position.set(-3.5, 5.5, 0);
    box.castShadow = true;
    poleGroup.add(box);

    // 3 Lenses: Red (top), Amber (middle), Green (bottom)
    const lensRadius = 0.22;
    const lensGeo = new THREE.SphereGeometry(lensRadius, 14, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    lensGeo.rotateX(Math.PI / 2);

    const redMesh = new THREE.Mesh(lensGeo, RED_ON_MAT);
    redMesh.position.set(-3.5, 6.05, 0.22);
    poleGroup.add(redMesh);

    const amberMesh = new THREE.Mesh(lensGeo, LENS_OFF_MAT);
    amberMesh.position.set(-3.5, 5.5, 0.22);
    poleGroup.add(amberMesh);

    const greenMesh = new THREE.Mesh(lensGeo, LENS_OFF_MAT);
    greenMesh.position.set(-3.5, 4.95, 0.22);
    poleGroup.add(greenMesh);

    // Dynamic point light matching current signal
    const spotLight = new THREE.PointLight(0xff1744, 1.5, 12);
    spotLight.position.set(-3.5, 5.5, 0.8);
    poleGroup.add(spotLight);

    group.add(poleGroup);

    signalHeads.push({
      approach,
      poleGroup,
      redMesh,
      amberMesh,
      greenMesh,
      spotLight,
    });
  }

  // 4 Corner Poles facing each approach:
  // North approach vehicles look south toward center -> pole at (roadHalfWidth + 1.2, roadHalfWidth + 6.0) facing +Z
  createSignalPole('north', roadHalfWidth + 1.5, roadHalfWidth + 6.0, 0);
  createSignalPole('south', -(roadHalfWidth + 1.5), -(roadHalfWidth + 6.0), Math.PI);
  createSignalPole('east', roadHalfWidth + 6.0, -(roadHalfWidth + 1.5), -Math.PI / 2);
  createSignalPole('west', -(roadHalfWidth + 6.0), roadHalfWidth + 1.5, Math.PI / 2);

  // ─── 6. Piezoresistive Sub-surface Sensors Beneath Road ──────────────────────
  interface SensorPadMesh {
    approach: 'north' | 'east' | 'south' | 'west';
    mesh: THREE.Mesh;
    glowMesh: THREE.Mesh;
    worldPos: THREE.Vector3;
    activePulse: number;
  }

  const sensorPads: SensorPadMesh[] = [];

  function createSensorPad(approach: 'north' | 'east' | 'south' | 'west', x: number, z: number, rotY = 0) {
    const padGroup = new THREE.Group();
    padGroup.position.set(x, 0.02, z);
    padGroup.rotation.y = rotY;

    // Outer protective frame
    const frameGeo = new THREE.BoxGeometry(2.4, 0.02, 1.0);
    const frameMesh = new THREE.Mesh(frameGeo, CURB_MAT);
    padGroup.add(frameMesh);

    // Inner piezoresistive transducer plate
    const plateGeo = new THREE.BoxGeometry(2.1, 0.025, 0.8);
    const plateMesh = new THREE.Mesh(plateGeo, SENSOR_PLATE_MAT.clone());
    padGroup.add(plateMesh);

    // Glowing pressure indicator plane
    const glowGeo = new THREE.PlaneGeometry(2.2, 0.9);
    glowGeo.rotateX(-Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.y = 0.028;
    padGroup.add(glowMesh);

    group.add(padGroup);

    sensorPads.push({
      approach,
      mesh: plateMesh,
      glowMesh,
      worldPos: new THREE.Vector3(x, 0, z),
      activePulse: 0,
    });
  }

  // Place sensors beneath the road on each approach lane (8m to 14m before stop line)
  // North approach (2 inbound lanes at X = 1.75 and X = 5.0)
  createSensorPad('north', 2.0, roadHalfWidth + 10.0, 0);
  createSensorPad('north', 5.0, roadHalfWidth + 10.0, 0);
  createSensorPad('north', 2.0, roadHalfWidth + 15.0, 0);
  createSensorPad('north', 5.0, roadHalfWidth + 15.0, 0);

  // South approach (inbound lanes at X = -2.0 and X = -5.0)
  createSensorPad('south', -2.0, -(roadHalfWidth + 10.0), 0);
  createSensorPad('south', -5.0, -(roadHalfWidth + 10.0), 0);

  // East approach (inbound lanes at Z = -2.0 and Z = -5.0)
  createSensorPad('east', roadHalfWidth + 10.0, -2.0, Math.PI / 2);
  createSensorPad('east', roadHalfWidth + 10.0, -5.0, Math.PI / 2);

  // West approach (inbound lanes at Z = 2.0 and Z = 5.0)
  createSensorPad('west', -(roadHalfWidth + 10.0), 2.0, Math.PI / 2);
  createSensorPad('west', -(roadHalfWidth + 10.0), 5.0, Math.PI / 2);

  // Sub-surface conduit lines connecting sensors to Traffic Control Unit
  const conduitPts = [
    new THREE.Vector3(3.5, 0.015, roadHalfWidth + 10.0),
    new THREE.Vector3(roadHalfWidth + 2.0, 0.015, roadHalfWidth + 10.0),
    new THREE.Vector3(roadHalfWidth + 2.5, 0.015, roadHalfWidth + 3.0),
  ];
  const conduitGeo = new THREE.BufferGeometry().setFromPoints(conduitPts);
  const conduitLine = new THREE.Line(conduitGeo, CONDUIT_MAT);
  group.add(conduitLine);

  // ─── 7. Sub-surface Road Trench / Cutaway View ──────────────────────────────
  // Demonstrating the cross-section shown in the user's diagram:
  // Asphalt Layer, Piezoresistive Sensor, Base Layer, Road Foundation
  const cutawayGroup = new THREE.Group();
  cutawayGroup.name = 'subsurface-cutaway-trench';
  cutawayGroup.position.set(-(roadHalfWidth + 14.0), 0, -(roadHalfWidth + 8.0));

  // Trench dimensions
  const trenchW = 6.0;
  const trenchL = 5.0;

  // Layer 4: Road Foundation / Bedrock (Soil: 0.50m)
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0x5a483a, roughness: 0.95 });
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(trenchW, 0.5, trenchL), foundationMat);
  foundation.position.y = -0.65;
  cutawayGroup.add(foundation);

  // Layer 3: Base Layer / Crushed Aggregate (0.30m)
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x8a847a, roughness: 0.9 });
  const baseLayer = new THREE.Mesh(new THREE.BoxGeometry(trenchW, 0.3, trenchL), baseMat);
  baseLayer.position.y = -0.25;
  cutawayGroup.add(baseLayer);

  // Layer 2: Piezoresistive Sensor (Embedded in asphalt/base)
  const sensorEmbedMat = new THREE.MeshStandardMaterial({
    color: 0x1f2329,
    metalness: 0.9,
    roughness: 0.2,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.8,
  });
  const sensorEmbed = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 1.4), sensorEmbedMat);
  sensorEmbed.position.set(0, -0.08, 0);
  cutawayGroup.add(sensorEmbed);

  // Layer 1: Asphalt Surface Course (0.15m)
  const asphaltCutMat = new THREE.MeshStandardMaterial({ color: 0x1c2024, roughness: 0.9 });
  const asphaltLayer = new THREE.Mesh(new THREE.BoxGeometry(trenchW, 0.15, trenchL), asphaltCutMat);
  asphaltLayer.position.y = 0.02;
  cutawayGroup.add(asphaltLayer);

  // 3D Wheel Resting on Asphalt directly over sensor
  const cutawayWheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 0.45, 18),
    new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.9 })
  );
  cutawayWheel.rotation.z = Math.PI / 2;
  cutawayWheel.position.set(0, 0.72, 0);
  cutawayGroup.add(cutawayWheel);

  // Downward Glowing Red Pressure Arrows (Vehicle Weight / Pressure)
  const arrowGroup = new THREE.Group();
  for (let a = -0.6; a <= 0.6; a += 0.6) {
    const arrowCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.3, 10),
      new THREE.MeshBasicMaterial({ color: 0xff1744 })
    );
    arrowCone.rotation.x = Math.PI;
    arrowCone.position.set(a, 0.22, 0);
    arrowGroup.add(arrowCone);

    const arrowStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8),
      new THREE.MeshBasicMaterial({ color: 0xff1744 })
    );
    arrowStem.position.set(a, 0.45, 0);
    arrowGroup.add(arrowStem);
  }
  cutawayGroup.add(arrowGroup);

  group.add(cutawayGroup);

  // ─── 8. Surrounding City Context (Light Buildings & Trees) ───────────────────
  function addBuilding(x: number, z: number, w: number, d: number, h: number, color = 0xded8ce) {
    const bGeo = new THREE.BoxGeometry(w, h, d);
    const bMat = new THREE.MeshLambertMaterial({ color });
    const bMesh = new THREE.Mesh(bGeo, bMat);
    bMesh.position.set(x, h / 2, z);
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    group.add(bMesh);
  }

  addBuilding(38, 38, 28, 26, 32, 0xe6e2d8);
  addBuilding(38, -38, 26, 28, 28, 0xded8ce);
  addBuilding(-38, 38, 28, 24, 24, 0xe2ddd2);
  addBuilding(-38, -38, 24, 26, 30, 0xdcd6cb);

  // ─── 9. Traffic Vehicles Simulation ─────────────────────────────────────────
  interface RoadJunctionVehicle {
    instance: VehicleInstance;
    approach: 'north' | 'east' | 'south' | 'west';
    laneIndex: number;
    laneCoord: number; // locked lateral coordinate (X for N/S, Z for E/W)
    maxSpeed: number;
    length: number;
  }

  const junctionVehicles: RoadJunctionVehicle[] = [];

  interface JunctionVehConfig {
    id: string;
    approach: 'north' | 'east' | 'south' | 'west';
    laneIndex: number;
    distance: number;
    speed: number;
    type: 'car' | 'bus' | 'truck';
    color: string;
  }

  // Vehicles across approaches
  // North approach (inbound heading South: X = 2.0 or 5.0, Z > 0, moves -Z)
  // East approach (inbound heading West: Z = -2.0 or -5.0, X > 0, moves -X)
  // South approach (inbound heading North: X = -2.0 or -5.0, Z < 0, moves +Z)
  // West approach (inbound heading East: Z = 2.0 or 5.0, X < 0, moves +X)
  const vehConfigs: JunctionVehConfig[] = [
    // North (high density queue)
    { id: 'v-n-1', approach: 'north', laneIndex: 0, distance: 16, speed: 11, type: 'car',   color: '#e8eaed' },
    { id: 'v-n-2', approach: 'north', laneIndex: 1, distance: 20, speed: 11, type: 'car',   color: '#1a73e8' },
    { id: 'v-n-3', approach: 'north', laneIndex: 0, distance: 28, speed: 10, type: 'bus',   color: '#0288d1' },
    { id: 'v-n-4', approach: 'north', laneIndex: 1, distance: 34, speed: 11, type: 'car',   color: '#1e8e3e' },
    { id: 'v-n-5', approach: 'north', laneIndex: 0, distance: 44, speed: 9,  type: 'truck', color: '#5f6368' },
    { id: 'v-n-6', approach: 'north', laneIndex: 1, distance: 52, speed: 11, type: 'car',   color: '#d93025' },

    // East (moderate density queue)
    { id: 'v-e-1', approach: 'east',  laneIndex: 0, distance: 18, speed: 11, type: 'car',   color: '#f9ab00' },
    { id: 'v-e-2', approach: 'east',  laneIndex: 1, distance: 26, speed: 11, type: 'car',   color: '#3949ab' },
    { id: 'v-e-3', approach: 'east',  laneIndex: 0, distance: 38, speed: 10, type: 'bus',   color: '#00897b' },

    // South (light approach)
    { id: 'v-s-1', approach: 'south', laneIndex: 0, distance: 22, speed: 11, type: 'car',   color: '#7b1fa2' },
    { id: 'v-s-2', approach: 'south', laneIndex: 1, distance: 38, speed: 11, type: 'car',   color: '#ffffff' },

    // West (light approach)
    { id: 'v-w-1', approach: 'west',  laneIndex: 0, distance: 24, speed: 11, type: 'car',   color: '#00acc1' },
    { id: 'v-w-2', approach: 'west',  laneIndex: 1, distance: 42, speed: 11, type: 'car',   color: '#fb8c00' },
  ];

  vehConfigs.forEach((cfg) => {
    const v = createVehicle({
      id: cfg.id,
      laneIndex: cfg.laneIndex,
      type: cfg.type,
      color: cfg.color,
      speed: cfg.speed,
      direction: 1,
      initialOffset: cfg.distance,
    });

    let laneCoord = 0;
    if (cfg.approach === 'north') {
      v.group.rotation.y = Math.PI; // heading south (-Z)
      laneCoord = cfg.laneIndex === 0 ? 2.2 : 5.0;
      v.group.position.set(laneCoord, 0, roadHalfWidth + cfg.distance);
    } else if (cfg.approach === 'east') {
      v.group.rotation.y = -Math.PI / 2; // heading west (-X)
      laneCoord = cfg.laneIndex === 0 ? -2.2 : -5.0;
      v.group.position.set(roadHalfWidth + cfg.distance, 0, laneCoord);
    } else if (cfg.approach === 'south') {
      v.group.rotation.y = 0; // heading north (+Z)
      laneCoord = cfg.laneIndex === 0 ? -2.2 : -5.0;
      v.group.position.set(laneCoord, 0, -(roadHalfWidth + cfg.distance));
    } else if (cfg.approach === 'west') {
      v.group.rotation.y = Math.PI / 2; // heading east (+X)
      laneCoord = cfg.laneIndex === 0 ? 2.2 : 5.0;
      v.group.position.set(-(roadHalfWidth + cfg.distance), 0, laneCoord);
    }

    group.add(v.group);
    junctionVehicles.push({
      instance: v,
      approach: cfg.approach,
      laneIndex: cfg.laneIndex,
      laneCoord,
      maxSpeed: cfg.speed,
      length: cfg.type === 'bus' || cfg.type === 'truck' ? 8.0 : 4.5,
    });
  });

  // ─── 10. State Machine & Dynamic Signal Control ─────────────────────────────
  let currentPhase: 'NORTH_SOUTH' | 'EAST_WEST' = 'NORTH_SOUTH';
  let phaseTimer = 45.0; // Starts with North/South high density green
  let totalVehiclesCount = 42;
  let adaptiveMode = true;

  // Keep reference to vehicles for backward compat
  const vehicles: VehicleInstance[] = junctionVehicles.map((t) => t.instance);

  // Approach telemetry state
  const approachStates: Record<'north' | 'east' | 'south' | 'west', ApproachTelemetry> = {
    north: {
      id: 'north',
      name: 'North Approach',
      densityLevel: 'High',
      densityVehPerHour: 48,
      assignedGreenSeconds: 45,
      currentSignal: 'GREEN',
      activeSensorPressureMpa: 0.88,
      resistanceChangePercent: -15.4,
      sensorTriggered: true,
    },
    east: {
      id: 'east',
      name: 'East Approach',
      densityLevel: 'Moderate',
      densityVehPerHour: 22,
      assignedGreenSeconds: 25,
      currentSignal: 'RED',
      activeSensorPressureMpa: 0.42,
      resistanceChangePercent: -7.2,
      sensorTriggered: false,
    },
    south: {
      id: 'south',
      name: 'South Approach',
      densityLevel: 'Light',
      densityVehPerHour: 8,
      assignedGreenSeconds: 15,
      currentSignal: 'GREEN',
      activeSensorPressureMpa: 0.25,
      resistanceChangePercent: -4.1,
      sensorTriggered: false,
    },
    west: {
      id: 'west',
      name: 'West Approach',
      densityLevel: 'Low',
      densityVehPerHour: 5,
      assignedGreenSeconds: 12,
      currentSignal: 'RED',
      activeSensorPressureMpa: 0.18,
      resistanceChangePercent: -3.0,
      sensorTriggered: false,
    },
  };

  let latestReading = {
    approach: 'North Approach (Lane 1)',
    pressureMpa: 0.88,
    weightTons: 1.85,
    deltaROverR: -15.4,
    timestamp: Date.now(),
  };

  // Update traffic light pole meshes based on phase
  function updateSignalLamps(nsState: 'RED' | 'AMBER' | 'GREEN', ewState: 'RED' | 'AMBER' | 'GREEN') {
    signalHeads.forEach((sig) => {
      const isNS = sig.approach === 'north' || sig.approach === 'south';
      const state = isNS ? nsState : ewState;

      sig.redMesh.material = state === 'RED' ? RED_ON_MAT : LENS_OFF_MAT;
      sig.amberMesh.material = state === 'AMBER' ? AMBER_ON_MAT : LENS_OFF_MAT;
      sig.greenMesh.material = state === 'GREEN' ? GREEN_ON_MAT : LENS_OFF_MAT;

      if (state === 'RED') {
        sig.spotLight.color.setHex(0xff1744);
        sig.spotLight.intensity = 1.6;
      } else if (state === 'AMBER') {
        sig.spotLight.color.setHex(0xffab00);
        sig.spotLight.intensity = 1.4;
      } else {
        sig.spotLight.color.setHex(0x00e676);
        sig.spotLight.intensity = 1.6;
      }
    });

    approachStates.north.currentSignal = nsState;
    approachStates.south.currentSignal = nsState;
    approachStates.east.currentSignal = ewState;
    approachStates.west.currentSignal = ewState;
  }

  // Initial lamp state
  updateSignalLamps('GREEN', 'RED');

  // Trigger manual or vehicle press
  function triggerVehiclePress(approach: 'north' | 'east' | 'south' | 'west' = 'north') {
    totalVehiclesCount += 1;
    const pad = sensorPads.find((p) => p.approach === approach) || sensorPads[0];
    if (pad) {
      pad.activePulse = 1.0;
    }
    const weightTons = 1.4 + Math.random() * 2.2;
    const pressureMpa = +(0.65 + weightTons * 0.18).toFixed(2);
    const deltaR = +(-(pressureMpa * 17.5)).toFixed(1);

    approachStates[approach].activeSensorPressureMpa = pressureMpa;
    approachStates[approach].resistanceChangePercent = deltaR;
    approachStates[approach].sensorTriggered = true;

    latestReading = {
      approach: `${approachStates[approach].name} (Piezoresistive Sensor #2)`,
      pressureMpa,
      weightTons: +weightTons.toFixed(2),
      deltaROverR: deltaR,
      timestamp: Date.now(),
    };
  }

  // ─── 11. Frame Update Loop ──────────────────────────────────────────────────
  function update(delta: number) {
    phaseTimer -= delta;

    // Phase transition logic
    if (phaseTimer <= 0) {
      if (currentPhase === 'NORTH_SOUTH') {
        currentPhase = 'EAST_WEST';
        phaseTimer = adaptiveMode ? approachStates.east.assignedGreenSeconds : 20.0;
        updateSignalLamps('RED', 'GREEN');
      } else {
        currentPhase = 'NORTH_SOUTH';
        phaseTimer = adaptiveMode ? approachStates.north.assignedGreenSeconds : 20.0;
        updateSignalLamps('GREEN', 'RED');
      }
    } else if (phaseTimer < 3.0) {
      // Amber transition
      if (currentPhase === 'NORTH_SOUTH') {
        updateSignalLamps('AMBER', 'RED');
      } else {
        updateSignalLamps('RED', 'AMBER');
      }
    }

    // Signal state booleans (only move when >= 3s remain = not amber)
    const nsGreen = currentPhase === 'NORTH_SOUTH' && phaseTimer > 3.0;
    const ewGreen = currentPhase === 'EAST_WEST' && phaseTimer > 3.0;

    // Decay active sensor glow pulses
    sensorPads.forEach((pad) => {
      if (pad.activePulse > 0) {
        pad.activePulse = Math.max(0, pad.activePulse - delta * 2.5);
        const glowMat = pad.glowMesh.material as THREE.MeshBasicMaterial;
        glowMat.opacity = pad.activePulse * 0.85;
      }
    });

    const STOP_DIST = roadHalfWidth + 5.5; // 12.5m
    const FIRST_STOP_OFFSET = STOP_DIST + 2.0; // 14.5m

    // Group vehicles by approach and lane to prevent rear-end collisions
    type LaneKey = `${'north' | 'east' | 'south' | 'west'}-${number}`;
    const lanes: Record<LaneKey, RoadJunctionVehicle[]> = {
      'north-0': [], 'north-1': [],
      'east-0': [], 'east-1': [],
      'south-0': [], 'south-1': [],
      'west-0': [], 'west-1': [],
    };

    junctionVehicles.forEach((v) => {
      const key: LaneKey = `${v.approach}-${v.laneIndex}`;
      lanes[key].push(v);
    });

    // ── Update North vehicles (moving South: -Z direction) ──
    (['north-0', 'north-1'] as LaneKey[]).forEach((key) => {
      const vehs = lanes[key];
      // Sort inbound vehicles by Z ascending (smallest Z is closest to stop line)
      vehs.sort((a, b) => a.instance.group.position.z - b.instance.group.position.z);

      let prevLeadZ = -999;
      vehs.forEach((v) => {
        const pos = v.instance.group.position;
        // Lock X strictly onto road lane and Y on asphalt
        pos.x = v.laneCoord;
        pos.y = 0.0;

        if (pos.z > STOP_DIST) {
          // Inbound approach before stop line
          let targetStop = nsGreen ? -999 : FIRST_STOP_OFFSET;
          if (prevLeadZ > -999) {
            targetStop = Math.max(targetStop, prevLeadZ + v.length + 2.5);
          }

          if (pos.z > targetStop + 0.1) {
            const distRemaining = pos.z - targetStop;
            const speed = Math.min(v.maxSpeed, Math.max(2.0, distRemaining * 1.8));
            pos.z -= delta * speed;

            // Trigger sensor pad when passing over Z ≈ 17.0
            if (Math.abs(pos.z - 17.0) < 0.6) {
              triggerVehiclePress('north');
            }
          }
          prevLeadZ = pos.z;
        } else {
          // Inside junction or outbound on South arm: continue full speed
          pos.z -= delta * v.maxSpeed;
          // Wrap around after travelling far down South road
          if (pos.z < -65.0) {
            pos.z = roadHalfWidth + 50.0 + Math.random() * 20.0;
          }
        }
      });
    });

    // ── Update East vehicles (moving West: -X direction) ──
    (['east-0', 'east-1'] as LaneKey[]).forEach((key) => {
      const vehs = lanes[key];
      vehs.sort((a, b) => a.instance.group.position.x - b.instance.group.position.x);

      let prevLeadX = -999;
      vehs.forEach((v) => {
        const pos = v.instance.group.position;
        pos.z = v.laneCoord;
        pos.y = 0.0;

        if (pos.x > STOP_DIST) {
          let targetStop = ewGreen ? -999 : FIRST_STOP_OFFSET;
          if (prevLeadX > -999) {
            targetStop = Math.max(targetStop, prevLeadX + v.length + 2.5);
          }

          if (pos.x > targetStop + 0.1) {
            const distRemaining = pos.x - targetStop;
            const speed = Math.min(v.maxSpeed, Math.max(2.0, distRemaining * 1.8));
            pos.x -= delta * speed;

            if (Math.abs(pos.x - 17.0) < 0.6) {
              triggerVehiclePress('east');
            }
          }
          prevLeadX = pos.x;
        } else {
          pos.x -= delta * v.maxSpeed;
          if (pos.x < -65.0) {
            pos.x = roadHalfWidth + 50.0 + Math.random() * 20.0;
          }
        }
      });
    });

    // ── Update South vehicles (moving North: +Z direction) ──
    (['south-0', 'south-1'] as LaneKey[]).forEach((key) => {
      const vehs = lanes[key];
      vehs.sort((a, b) => b.instance.group.position.z - a.instance.group.position.z);

      let prevLeadZ = 999;
      vehs.forEach((v) => {
        const pos = v.instance.group.position;
        pos.x = v.laneCoord;
        pos.y = 0.0;

        if (pos.z < -STOP_DIST) {
          let targetStop = nsGreen ? 999 : -FIRST_STOP_OFFSET;
          if (prevLeadZ < 999) {
            targetStop = Math.min(targetStop, prevLeadZ - (v.length + 2.5));
          }

          if (pos.z < targetStop - 0.1) {
            const distRemaining = targetStop - pos.z;
            const speed = Math.min(v.maxSpeed, Math.max(2.0, distRemaining * 1.8));
            pos.z += delta * speed;
          }
          prevLeadZ = pos.z;
        } else {
          pos.z += delta * v.maxSpeed;
          if (pos.z > 65.0) {
            pos.z = -(roadHalfWidth + 50.0 + Math.random() * 20.0);
          }
        }
      });
    });

    // ── Update West vehicles (moving East: +X direction) ──
    (['west-0', 'west-1'] as LaneKey[]).forEach((key) => {
      const vehs = lanes[key];
      vehs.sort((a, b) => b.instance.group.position.x - a.instance.group.position.x);

      let prevLeadX = 999;
      vehs.forEach((v) => {
        const pos = v.instance.group.position;
        pos.z = v.laneCoord;
        pos.y = 0.0;

        if (pos.x < -STOP_DIST) {
          let targetStop = ewGreen ? 999 : -FIRST_STOP_OFFSET;
          if (prevLeadX < 999) {
            targetStop = Math.min(targetStop, prevLeadX - (v.length + 2.5));
          }

          if (pos.x < targetStop - 0.1) {
            const distRemaining = targetStop - pos.x;
            const speed = Math.min(v.maxSpeed, Math.max(2.0, distRemaining * 1.8));
            pos.x += delta * speed;
          }
          prevLeadX = pos.x;
        } else {
          pos.x += delta * v.maxSpeed;
          if (pos.x > 65.0) {
            pos.x = -(roadHalfWidth + 50.0 + Math.random() * 20.0);
          }
        }
      });
    });

    // Animate downward pressure arrow bobbing in cutaway
    arrowGroup.position.y = Math.sin(Date.now() * 0.006) * 0.05;
  }

  // ─── 12. Camera Focus Presets ───────────────────────────────────────────────
  function focusCamera(
    camCtrl: CameraController,
    preset: 'overview' | 'sensor_cutaway' | 'control_unit' | 'north_queue' = 'overview'
  ) {
    if (preset === 'sensor_cutaway') {
      camCtrl.flyTo(
        new THREE.Vector3(-(roadHalfWidth + 16.0), 3.5, -(roadHalfWidth + 4.0)),
        new THREE.Vector3(-(roadHalfWidth + 14.0), 0.2, -(roadHalfWidth + 8.0)),
        1.2
      );
    } else if (preset === 'control_unit') {
      camCtrl.flyTo(
        new THREE.Vector3(roadHalfWidth + 6.0, 4.0, roadHalfWidth + 7.0),
        new THREE.Vector3(roadHalfWidth + 2.5, 1.2, roadHalfWidth + 2.5),
        1.2
      );
    } else if (preset === 'north_queue') {
      camCtrl.flyTo(
        new THREE.Vector3(8.0, 8.0, roadHalfWidth + 30.0),
        new THREE.Vector3(2.5, 1.0, roadHalfWidth + 10.0),
        1.2
      );
    } else {
      // Perspective matching the user's reference diagram
      camCtrl.flyTo(
        new THREE.Vector3(-28.0, 32.0, 42.0),
        new THREE.Vector3(0, 0.5, 0),
        1.4
      );
    }
  }

  return {
    group,
    update,
    getTelemetry: () => ({
      currentPhase,
      phaseTimeRemaining: Math.ceil(phaseTimer),
      totalCycleSeconds: adaptiveMode ? 70 : 40,
      adaptiveMode,
      totalVehiclesDetected: totalVehiclesCount,
      approaches: approachStates,
      latestSensorReading: latestReading,
    }),
    triggerVehiclePress,
    setAdaptiveMode: (enabled: boolean) => {
      adaptiveMode = enabled;
    },
    focusCamera,
    dispose: () => {
      group.clear();
    },
  };
}
