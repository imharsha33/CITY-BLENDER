import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import './VehicleSimulationView.css';

export type PlayerVehicleType = 'car' | 'bike' | 'suv' | 'bus' | 'truck';

interface VehicleProfile {
  type: PlayerVehicleType;
  name: string;
  category: string;
  classTag: string;
  weightTons: number;
  basePressureMpa: number;
  maxSpeedKmh: number;
  accel: number;
  brakeDecel: number;
  steerResponsiveness: number;
  colorHex: number;
  icon: string;
}

const VEHICLE_PROFILES: Record<PlayerVehicleType, VehicleProfile> = {
  car: {
    type: 'car',
    name: 'Sedan (Passenger Car)',
    category: 'Class II: Light Passenger Vehicle',
    classTag: 'CLASS II',
    weightTons: 1.65,
    basePressureMpa: 1.45,
    maxSpeedKmh: 110,
    accel: 17.0,
    brakeDecel: 30.0,
    steerResponsiveness: 2.6,
    colorHex: 0x0284c7,
    icon: '🚗',
  },
  bike: {
    type: 'bike',
    name: 'Motorbike (Two-Wheeler)',
    category: 'Class I: Light Motorized Two-Wheeler',
    classTag: 'CLASS I',
    weightTons: 0.24,
    basePressureMpa: 0.48,
    maxSpeedKmh: 130,
    accel: 24.0,
    brakeDecel: 32.0,
    steerResponsiveness: 3.5,
    colorHex: 0xf59e0b,
    icon: '🏍️',
  },
  suv: {
    type: 'suv',
    name: 'SUV (Multi-Utility Vehicle)',
    category: 'Class II+: Mid-Heavy Passenger',
    classTag: 'CLASS II+',
    weightTons: 2.45,
    basePressureMpa: 2.15,
    maxSpeedKmh: 105,
    accel: 15.0,
    brakeDecel: 28.0,
    steerResponsiveness: 2.3,
    colorHex: 0xd97706,
    icon: '🚙',
  },
  bus: {
    type: 'bus',
    name: 'City Transit Bus',
    category: 'Class IV: Heavy Public Commercial Transit',
    classTag: 'CLASS IV',
    weightTons: 12.5,
    basePressureMpa: 5.4,
    maxSpeedKmh: 75,
    accel: 9.5,
    brakeDecel: 22.0,
    steerResponsiveness: 1.6,
    colorHex: 0x059669,
    icon: '🚌',
  },
  truck: {
    type: 'truck',
    name: 'Delivery Logistics Truck',
    category: 'Class III: Medium Heavy Freight Carrier',
    classTag: 'CLASS III',
    weightTons: 6.8,
    basePressureMpa: 3.85,
    maxSpeedKmh: 85,
    accel: 11.0,
    brakeDecel: 25.0,
    steerResponsiveness: 1.8,
    colorHex: 0x7c3aed,
    icon: '🚚',
  },
};

interface SensorPlateData {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  pulseMat: THREE.MeshBasicMaterial;
  pulseScale: number;
  center: THREE.Vector3;
  approachName: string;
  axis: 'NS' | 'EW';
  lastDetectedVehicleName: string;
}

interface SignalHead {
  red: THREE.Mesh;
  green: THREE.Mesh;
  axis: 'NS' | 'EW';
}

interface JunctionData {
  id: string;
  name: string;
  x: number;
  z: number;
  currentPhase: 'NS_GREEN' | 'EW_GREEN';
  tcuTimer: number;
  cleared: boolean;
  signals: SignalHead[];
  sensorPlates: SensorPlateData[];
}

interface AITrafficVehicle {
  group: THREE.Group;
  type: PlayerVehicleType;
  profile: VehicleProfile;
  speed: number;
  axis: 'NS' | 'EW';
  direction: 1 | -1;
  laneOffset: number;
  roadCoord: number;
  wheels: THREE.Mesh[];
}

interface BuildingCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface MissionState {
  id: string;
  title: string;
  completed: boolean;
}

export const VehicleSimulationView: React.FC<{ onReturnToHome: () => void }> = ({ onReturnToHome }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);

  // States
  const [selectedVehicleType, setSelectedVehicleType] = useState<PlayerVehicleType>('car');
  const selectedVehicleRef = useRef<PlayerVehicleType>('car');

  const [cameraMode, setCameraMode] = useState<'chase' | 'hood' | 'top'>('chase');
  const cameraModeRef = useRef<'chase' | 'hood' | 'top'>('chase');

  // Live HUD States
  const [speedKmh, setSpeedKmh] = useState(0);
  const [gear, setGear] = useState<'D' | 'R' | 'P'>('D');
  const [activePressure, setActivePressure] = useState(0);
  const [deltaROverR, setDeltaROverR] = useState(0);
  const [detectedVehicleName, setDetectedVehicleName] = useState<string>('None (Scanning)');
  const [detectedClassTag, setDetectedClassTag] = useState<string>('STANDBY');
  const [detectedWeight, setDetectedWeight] = useState<number>(0);
  const [currentZoneName, setCurrentZoneName] = useState('Central Grand Avenue');
  const [junctionsClearedCount, setJunctionsClearedCount] = useState(0);
  const [totalTriggers, setTotalTriggers] = useState(0);
  const [nextJunctionDist, setNextJunctionDist] = useState(0);
  const [nextJunctionName, setNextJunctionName] = useState('J5 Grand Central');
  const [crashBanner, setCrashBanner] = useState<string | null>(null);
  const [showMissions, setShowMissions] = useState<boolean>(false);

  const [missions, setMissions] = useState<MissionState[]>([
    { id: 'detect_car', title: 'Drive over sensor to detect Car (Class II)', completed: false },
    { id: 'detect_bike', title: 'Switch to Bike [V] and test Light Footprint (Class I)', completed: false },
    { id: 'detect_bus', title: 'Switch to Bus [V] and trigger Heavy Stress (> 5.0 MPa)', completed: false },
    { id: 'cross_turn', title: 'Turn 90° into East-West Cross Avenue at a 4-way intersection', completed: false },
    { id: 'green_wave', title: 'Trigger Adaptive Green Wave preemption at 3 junctions', completed: false },
  ]);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const switchVehicleRef = useRef<(type: PlayerVehicleType) => void>(() => {});
  const resetCarRef = useRef<() => void>(() => {});

  const resetCar = useCallback(() => {
    resetCarRef.current();
  }, []);

  const handleSelectVehicle = (type: PlayerVehicleType) => {
    setSelectedVehicleType(type);
    selectedVehicleRef.current = type;
    switchVehicleRef.current(type);
  };

  const handleSelectCamera = (mode: 'chase' | 'hood' | 'top') => {
    setCameraMode(mode);
    cameraModeRef.current = mode;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressed.current[k] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
      }
      if (k === 'c') {
        const nextMode = cameraModeRef.current === 'chase' ? 'hood' : cameraModeRef.current === 'hood' ? 'top' : 'chase';
        setCameraMode(nextMode);
        cameraModeRef.current = nextMode;
      }
      if (k === 'r') {
        resetCar();
      }
      if (k === 'v') {
        const order: PlayerVehicleType[] = ['car', 'bike', 'suv', 'bus', 'truck'];
        const curr = selectedVehicleRef.current;
        const next = order[(order.indexOf(curr) + 1) % order.length];
        setSelectedVehicleType(next);
        selectedVehicleRef.current = next;
        switchVehicleRef.current(next);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [resetCar]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ─── 1. Scene & Renderer (Bright Light Theme Daytime) ───────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8f2fc);
    scene.fog = new THREE.FogExp2(0xe8f2fc, 0.0016);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ─── 2. Camera ──────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(54, canvas.clientWidth / canvas.clientHeight, 0.1, 2000);
    camera.position.set(0, 8, -14);

    // ─── 3. Lighting (Clear Sunny Sky Light Theme) ──────────────────────────
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xc8ddf0, 1.1);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfffef5, 2.2);
    sun.position.set(120, 200, -80);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 800;
    const shadowD = 220;
    sun.shadow.camera.left = -shadowD;
    sun.shadow.camera.right = shadowD;
    sun.shadow.camera.top = shadowD;
    sun.shadow.camera.bottom = -shadowD;
    sun.shadow.bias = -0.0004;
    scene.add(sun);

    const amb = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(amb);

    // ─── 4. Materials (Light Theme Architecture & Civil Roadways) ────────────
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x22262d, roughness: 0.8, metalness: 0.08 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x5da852, roughness: 0.95 });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xede9e1, roughness: 0.75 });
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xa8a49c, roughness: 0.85 });
    const whitePaintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const yellowPaintMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    // Crisp Light Architecture
    const bldgWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const bldgSlateMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
    const bldgGlassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.05, metalness: 0.95 });
    const bldgDarkMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });

    const sensorPlateBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e2430, metalness: 0.92, roughness: 0.2 });
    const sensorGlowTemplate = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    });
    const pulseMatTemplate = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    });

    // ─── 5. Mini City Grid Geometry: 3x3 4-Way Intersections ────────────────
    const ROAD_W = 16.0;
    const HALF_W = ROAD_W / 2; // 8.0m
    const LANE_OFFSET = 4.0;

    const NS_AVENUES = [
      { id: 'AV_W', name: 'West Commercial Boulevard', x: -110.0 },
      { id: 'AV_C', name: 'Central Grand Avenue', x: 0.0 },
      { id: 'AV_E', name: 'East Innovation Boulevard', x: 110.0 },
    ];

    const EW_STREETS = [
      { id: 'ST_N', name: 'North Tech Parkway', z: -130.0 },
      { id: 'ST_M', name: 'Grand Metro Boulevard', z: 0.0 },
      { id: 'ST_S', name: 'South Bayfront Promenade', z: 130.0 },
    ];

    const CITY_SPAN_X = 360.0;
    const CITY_SPAN_Z = 380.0;

    // Ground Terrain
    const groundGeo = new THREE.PlaneGeometry(CITY_SPAN_X + 150, CITY_SPAN_Z + 150);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMesh = new THREE.Mesh(groundGeo, grassMat);
    groundMesh.position.set(0, -0.04, 0);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // North-South Avenues
    NS_AVENUES.forEach((av) => {
      const roadGeo = new THREE.PlaneGeometry(ROAD_W, CITY_SPAN_Z);
      roadGeo.rotateX(-Math.PI / 2);
      const road = new THREE.Mesh(roadGeo, asphaltMat);
      road.position.set(av.x, 0.001, 0);
      road.receiveShadow = true;
      scene.add(road);

      // Center Double Yellow Lines
      for (let yo of [-0.15, 0.15]) {
        const ylGeo = new THREE.PlaneGeometry(0.14, CITY_SPAN_Z);
        ylGeo.rotateX(-Math.PI / 2);
        const yl = new THREE.Mesh(ylGeo, yellowPaintMat);
        yl.position.set(av.x + yo, 0.015, 0);
        scene.add(yl);
      }
    });

    // East-West Streets
    EW_STREETS.forEach((st) => {
      const roadGeo = new THREE.PlaneGeometry(CITY_SPAN_X, ROAD_W);
      roadGeo.rotateX(-Math.PI / 2);
      const road = new THREE.Mesh(roadGeo, asphaltMat);
      road.position.set(0, 0.002, st.z);
      road.receiveShadow = true;
      scene.add(road);

      // Center Double Yellow Lines
      for (let yo of [-0.15, 0.15]) {
        const ylGeo = new THREE.PlaneGeometry(CITY_SPAN_X, 0.14);
        ylGeo.rotateX(-Math.PI / 2);
        const yl = new THREE.Mesh(ylGeo, yellowPaintMat);
        yl.position.set(0, 0.016, st.z + yo);
        scene.add(yl);
      }
    });

    // ─── 6. Build 9 Four-Way Intersections ──────────────────────────────────
    const junctions: JunctionData[] = [];

    NS_AVENUES.forEach((av, xi) => {
      EW_STREETS.forEach((st, zi) => {
        const jId = `J${xi * 3 + zi + 1}`;
        const jName = `${jId}: ${av.name.split(' ')[0]} & ${st.name.split(' ')[0]} 4-Way Cross`;
        const jX = av.x;
        const jZ = st.z;

        const plazaGeo = new THREE.PlaneGeometry(ROAD_W + 0.4, ROAD_W + 0.4);
        plazaGeo.rotateX(-Math.PI / 2);
        const plaza = new THREE.Mesh(plazaGeo, asphaltMat);
        plaza.position.set(jX, 0.003, jZ);
        plaza.receiveShadow = true;
        scene.add(plaza);

        const sensorPlates: SensorPlateData[] = [];
        const signals: SignalHead[] = [];

        const APPROACHES = [
          { name: 'Northbound (S to N)', axis: 'NS' as const, cx: jX + LANE_OFFSET, cz: jZ + HALF_W + 14.0, stopZ: jZ + HALF_W + 3.0, stopX: jX + LANE_OFFSET, zebraZ: jZ + HALF_W + 1.2, zebraDir: 'EW' },
          { name: 'Southbound (N to S)', axis: 'NS' as const, cx: jX - LANE_OFFSET, cz: jZ - HALF_W - 14.0, stopZ: jZ - HALF_W - 3.0, stopX: jX - LANE_OFFSET, zebraZ: jZ - HALF_W - 1.2, zebraDir: 'EW' },
          { name: 'Eastbound (W to E)', axis: 'EW' as const, cx: jX - HALF_W - 14.0, cz: jZ + LANE_OFFSET, stopX: jX - HALF_W - 3.0, stopZ: jZ + LANE_OFFSET, zebraX: jX - HALF_W - 1.2, zebraDir: 'NS' },
          { name: 'Westbound (E to W)', axis: 'EW' as const, cx: jX + HALF_W + 14.0, cz: jZ - LANE_OFFSET, stopX: jX + HALF_W + 3.0, stopZ: jZ - LANE_OFFSET, zebraX: jX + HALF_W + 1.2, zebraDir: 'NS' },
        ];

        APPROACHES.forEach((app) => {
          if (app.zebraDir === 'EW') {
            for (let zi2 = 0; zi2 < 8; zi2++) {
              const stripeGeo = new THREE.PlaneGeometry(0.7, 2.8);
              stripeGeo.rotateX(-Math.PI / 2);
              const stripe = new THREE.Mesh(stripeGeo, whitePaintMat);
              stripe.position.set(jX - HALF_W + 1.2 + zi2 * 1.9, 0.022, app.zebraZ!);
              scene.add(stripe);
            }
            const sbGeo = new THREE.PlaneGeometry(HALF_W - 0.6, 0.8);
            sbGeo.rotateX(-Math.PI / 2);
            const sb = new THREE.Mesh(sbGeo, whitePaintMat);
            sb.position.set(app.stopX, 0.022, app.stopZ);
            scene.add(sb);
          } else {
            for (let zi2 = 0; zi2 < 8; zi2++) {
              const stripeGeo = new THREE.PlaneGeometry(2.8, 0.7);
              stripeGeo.rotateX(-Math.PI / 2);
              const stripe = new THREE.Mesh(stripeGeo, whitePaintMat);
              stripe.position.set(app.zebraX!, 0.022, jZ - HALF_W + 1.2 + zi2 * 1.9);
              scene.add(stripe);
            }
            const sbGeo = new THREE.PlaneGeometry(0.8, HALF_W - 0.6);
            sbGeo.rotateX(-Math.PI / 2);
            const sb = new THREE.Mesh(sbGeo, whitePaintMat);
            sb.position.set(app.stopX, 0.022, app.stopZ);
            scene.add(sb);
          }

          const plateGeo = new THREE.BoxGeometry(app.axis === 'NS' ? 3.4 : 6.0, 0.04, app.axis === 'NS' ? 6.0 : 3.4);
          const pBase = new THREE.Mesh(plateGeo, sensorPlateBaseMat);
          pBase.position.set(app.cx, 0.02, app.cz);
          pBase.receiveShadow = true;
          scene.add(pBase);

          const activeMat = sensorGlowTemplate.clone();
          const gridGeo = new THREE.PlaneGeometry(app.axis === 'NS' ? 3.2 : 5.6, app.axis === 'NS' ? 5.6 : 3.2);
          gridGeo.rotateX(-Math.PI / 2);
          const pGrid = new THREE.Mesh(gridGeo, activeMat);
          pGrid.position.set(app.cx, 0.042, app.cz);
          scene.add(pGrid);

          const pulseMat = pulseMatTemplate.clone();
          const ringGeo = new THREE.RingGeometry(0.2, 1.2, 32);
          ringGeo.rotateX(-Math.PI / 2);
          const pRing = new THREE.Mesh(ringGeo, pulseMat);
          pRing.position.set(app.cx, 0.045, app.cz);
          scene.add(pRing);

          sensorPlates.push({
            mesh: pGrid,
            mat: activeMat,
            pulseMat,
            pulseScale: 1.0,
            center: new THREE.Vector3(app.cx, 0, app.cz),
            approachName: `${jId} ${app.name}`,
            axis: app.axis,
            lastDetectedVehicleName: 'None',
          });
        });

        // 4-Way Traffic Signal Gantries
        const signalHousingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
        const poleGeo = new THREE.CylinderGeometry(0.25, 0.32, 7.5, 16);
        const pole1 = new THREE.Mesh(poleGeo, signalHousingMat);
        pole1.position.set(jX + HALF_W + 1.8, 3.75, jZ + HALF_W + 1.8);
        scene.add(pole1);

        const armGeoNS = new THREE.CylinderGeometry(0.16, 0.16, 8.5, 16);
        armGeoNS.rotateZ(Math.PI / 2);
        const armNS = new THREE.Mesh(armGeoNS, signalHousingMat);
        armNS.position.set(jX + HALF_W - 2.5, 7.0, jZ + HALF_W + 1.8);
        scene.add(armNS);

        const boxNS = new THREE.BoxGeometry(0.7, 1.8, 0.4);
        const headNS = new THREE.Mesh(boxNS, signalHousingMat);
        headNS.position.set(jX + LANE_OFFSET, 6.2, jZ + HALF_W + 1.8);
        scene.add(headNS);

        const redMatNS = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 0.2 });
        const greenMatNS = new THREE.MeshStandardMaterial({ color: 0x00e676, emissive: 0x00e676, emissiveIntensity: 4.5 });
        const lensRedNS = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16), redMatNS);
        lensRedNS.rotateX(Math.PI / 2);
        lensRedNS.position.set(0, 0.45, 0.21);
        headNS.add(lensRedNS);

        const lensGreenNS = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16), greenMatNS);
        lensGreenNS.rotateX(Math.PI / 2);
        lensGreenNS.position.set(0, -0.45, 0.21);
        headNS.add(lensGreenNS);

        signals.push({ red: lensRedNS, green: lensGreenNS, axis: 'NS' });

        const pole2 = new THREE.Mesh(poleGeo, signalHousingMat);
        pole2.position.set(jX - HALF_W - 1.8, 3.75, jZ - HALF_W - 1.8);
        scene.add(pole2);

        const armGeoEW = new THREE.CylinderGeometry(0.16, 0.16, 8.5, 16);
        armGeoEW.rotateX(Math.PI / 2);
        const armEW = new THREE.Mesh(armGeoEW, signalHousingMat);
        armEW.position.set(jX - HALF_W - 1.8, 7.0, jZ - HALF_W + 2.5);
        scene.add(armEW);

        const boxEW = new THREE.BoxGeometry(0.4, 1.8, 0.7);
        const headEW = new THREE.Mesh(boxEW, signalHousingMat);
        headEW.position.set(jX - HALF_W - 1.8, 6.2, jZ - LANE_OFFSET);
        scene.add(headEW);

        const redMatEW = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 4.5 });
        const greenMatEW = new THREE.MeshStandardMaterial({ color: 0x00e676, emissive: 0x00e676, emissiveIntensity: 0.2 });
        const lensRedEW = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16), redMatEW);
        lensRedEW.rotateZ(Math.PI / 2);
        lensRedEW.position.set(-0.21, 0.45, 0);
        headEW.add(lensRedEW);

        const lensGreenEW = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16), greenMatEW);
        lensGreenEW.rotateZ(Math.PI / 2);
        lensGreenEW.position.set(-0.21, -0.45, 0);
        headEW.add(lensGreenEW);

        signals.push({ red: lensRedEW, green: lensGreenEW, axis: 'EW' });

        const tcuBodyGeo = new THREE.BoxGeometry(1.2, 2.0, 0.9);
        const tcuBody = new THREE.Mesh(tcuBodyGeo, signalHousingMat);
        tcuBody.position.set(jX + HALF_W + 2.2, 1.0, jZ - HALF_W - 2.2);
        scene.add(tcuBody);

        junctions.push({
          id: jId,
          name: jName,
          x: jX,
          z: jZ,
          currentPhase: 'NS_GREEN',
          tcuTimer: 8.0,
          cleared: false,
          signals,
          sensorPlates,
        });
      });
    });

    // ─── 7. Mini City Blocks & SOLID BUILDING COLLIDERS ─────────────────────
    const buildingColliders: BuildingCollider[] = [];

    const BLOCK_BOUNDS_X = [-200, -110 - HALF_W, -110 + HALF_W, 0 - HALF_W, 0 + HALF_W, 110 - HALF_W, 110 + HALF_W, 200];
    const BLOCK_BOUNDS_Z = [-200, -130 - HALF_W, -130 + HALF_W, 0 - HALF_W, 0 + HALF_W, 130 - HALF_W, 130 + HALF_W, 200];

    for (let biX = 0; biX < 4; biX++) {
      for (let biZ = 0; biZ < 4; biZ++) {
        const xMin = BLOCK_BOUNDS_X[biX * 2];
        const xMax = BLOCK_BOUNDS_X[biX * 2 + 1];
        const zMin = BLOCK_BOUNDS_Z[biZ * 2];
        const zMax = BLOCK_BOUNDS_Z[biZ * 2 + 1];

        const bw = xMax - xMin;
        const bd = zMax - zMin;
        const bcX = (xMin + xMax) / 2;
        const bcZ = (zMin + zMax) / 2;

        if (bw < 15 || bd < 15) continue;

        // Sidewalk Base
        const swGeo = new THREE.BoxGeometry(bw, 0.22, bd);
        const sw = new THREE.Mesh(swGeo, sidewalkMat);
        sw.position.set(bcX, 0.11, bcZ);
        sw.receiveShadow = true;
        scene.add(sw);

        // Curbs
        const curbThick = 0.35;
        const curbHeight = 0.28;
        const c1Geo = new THREE.BoxGeometry(bw, curbHeight, curbThick);
        const c1 = new THREE.Mesh(c1Geo, curbMat);
        c1.position.set(bcX, 0.14, zMin + curbThick / 2);
        scene.add(c1);

        const c2 = c1.clone();
        c2.position.set(bcX, 0.14, zMax - curbThick / 2);
        scene.add(c2);

        // Skyscraper & Commercial Towers
        const seed = Math.abs(Math.sin(bcX * 12.3 + bcZ * 45.6));
        const numTowers = seed > 0.4 ? 2 : 1;

        for (let ti = 0; ti < numTowers; ti++) {
          const tw = (bw - 10) / numTowers;
          const td = bd - 12;
          const th = 32.0 + ((seed * 100 + ti * 35) % 65);
          const tx = bcX + (numTowers === 2 ? (ti === 0 ? -tw / 2 : tw / 2) : 0);
          const tz = bcZ;

          const bldgGeo = new THREE.BoxGeometry(tw, th, td);
          const chosenMat = (seed + ti) % 2 > 0.7 ? bldgSlateMat : (seed + ti) % 3 === 0 ? bldgDarkMat : bldgWhiteMat;
          const bldg = new THREE.Mesh(bldgGeo, chosenMat);
          bldg.position.set(tx, th / 2 + 0.22, tz);
          bldg.castShadow = true;
          bldg.receiveShadow = true;
          scene.add(bldg);

          // Glass facade curtain wall
          const glassGeo = new THREE.BoxGeometry(tw + 0.2, th * 0.76, td + 0.2);
          const glass = new THREE.Mesh(glassGeo, bldgGlassMat);
          glass.position.set(tx, th * 0.45 + 0.22, tz);
          scene.add(glass);

          // HVAC & Antenna
          const hvacGeo = new THREE.BoxGeometry(tw * 0.4, 3.5, td * 0.4);
          const hvac = new THREE.Mesh(hvacGeo, curbMat);
          hvac.position.set(tx, th + 1.8, tz);
          scene.add(hvac);

          if (th > 60) {
            const antGeo = new THREE.CylinderGeometry(0.12, 0.3, 14.0, 8);
            const ant = new THREE.Mesh(antGeo, sensorPlateBaseMat);
            ant.position.set(tx, th + 8.5, tz);
            scene.add(ant);
          }

          // REGISTER SOLID COLLIDER BOX FOR THIS BUILDING
          buildingColliders.push({
            minX: tx - tw / 2,
            maxX: tx + tw / 2,
            minZ: tz - td / 2,
            maxZ: tz + td / 2,
          });
        }

        // Sidewalk Street Trees
        for (let treeSide of [-1, 1]) {
          const treeTrunkGeo = new THREE.CylinderGeometry(0.2, 0.26, 2.8);
          const treeTrunk = new THREE.Mesh(treeTrunkGeo, curbMat);
          treeTrunk.position.set(bcX + treeSide * (bw / 2 - 2.5), 1.4, bcZ);
          scene.add(treeTrunk);

          const folGeo = new THREE.DodecahedronGeometry(2.0, 1);
          const fol = new THREE.Mesh(folGeo, grassMat);
          fol.position.set(bcX + treeSide * (bw / 2 - 2.5), 3.8, bcZ);
          fol.castShadow = true;
          scene.add(fol);
        }
      }
    }

    // ─── 8. Active Dynamic Multi-Axis AI Traffic Flow ────────────────────────
    const aiTraffic: AITrafficVehicle[] = [];

    function spawnAIVehicle(
      type: PlayerVehicleType,
      axis: 'NS' | 'EW',
      roadCoord: number,
      startAlong: number,
      direction: 1 | -1
    ) {
      const vGroup = new THREE.Group();
      const p = VEHICLE_PROFILES[type];
      const paintMat = new THREE.MeshStandardMaterial({ color: p.colorHex, metalness: 0.7, roughness: 0.25 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
      const tMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      const wheels: THREE.Mesh[] = [];

      const laneOffset = direction === 1 ? -LANE_OFFSET : LANE_OFFSET;

      if (type === 'bike') {
        const frameGeo = new THREE.BoxGeometry(0.45, 0.5, 2.0);
        const frame = new THREE.Mesh(frameGeo, paintMat);
        frame.position.y = 0.55;
        vGroup.add(frame);

        const riderGeo = new THREE.BoxGeometry(0.4, 0.7, 0.5);
        const rider = new THREE.Mesh(riderGeo, glassMat);
        rider.position.set(0, 0.95, -0.1);
        vGroup.add(rider);

        [0.85, -0.85].forEach((wz) => {
          const wGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 16);
          wGeo.rotateZ(Math.PI / 2);
          const w = new THREE.Mesh(wGeo, tMat);
          w.position.set(0, 0.35, wz);
          vGroup.add(w);
          wheels.push(w);
        });
      } else if (type === 'bus') {
        const bGeo = new THREE.BoxGeometry(2.6, 2.8, 10.5);
        const b = new THREE.Mesh(bGeo, paintMat);
        b.position.y = 1.6;
        vGroup.add(b);

        const gGeo = new THREE.BoxGeometry(2.65, 0.9, 9.8);
        const g = new THREE.Mesh(gGeo, glassMat);
        g.position.set(0, 2.0, 0);
        vGroup.add(g);

        [-1.32, 1.32].forEach((wx) => {
          [3.8, -3.8].forEach((wz) => {
            const wGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16);
            wGeo.rotateZ(Math.PI / 2);
            const w = new THREE.Mesh(wGeo, tMat);
            w.position.set(wx, 0.5, wz);
            vGroup.add(w);
            wheels.push(w);
          });
        });
      } else if (type === 'truck') {
        const cabGeo = new THREE.BoxGeometry(2.3, 2.2, 2.2);
        const cab = new THREE.Mesh(cabGeo, paintMat);
        cab.position.set(0, 1.4, 2.2);
        vGroup.add(cab);

        const contGeo = new THREE.BoxGeometry(2.4, 2.6, 5.5);
        const cont = new THREE.Mesh(contGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
        cont.position.set(0, 1.7, -1.8);
        vGroup.add(cont);

        [-1.2, 1.2].forEach((wx) => {
          [2.2, -1.5, -3.2].forEach((wz) => {
            const wGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.28, 16);
            wGeo.rotateZ(Math.PI / 2);
            const w = new THREE.Mesh(wGeo, tMat);
            w.position.set(wx, 0.44, wz);
            vGroup.add(w);
            wheels.push(w);
          });
        });
      } else {
        const isSuv = type === 'suv';
        const bGeo = new THREE.BoxGeometry(2.0, isSuv ? 0.8 : 0.65, 4.4);
        const b = new THREE.Mesh(bGeo, paintMat);
        b.position.y = 0.55;
        vGroup.add(b);

        const cGeo = new THREE.BoxGeometry(1.7, isSuv ? 0.7 : 0.6, 2.4);
        const c = new THREE.Mesh(cGeo, glassMat);
        c.position.set(0, 1.15, -0.2);
        vGroup.add(c);

        [-1.0, 1.0].forEach((wx) => {
          [-1.35, 1.35].forEach((wz) => {
            const wGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 16);
            wGeo.rotateZ(Math.PI / 2);
            const w = new THREE.Mesh(wGeo, tMat);
            w.position.set(wx, 0.36, wz);
            vGroup.add(w);
            wheels.push(w);
          });
        });
      }

      if (axis === 'NS') {
        vGroup.position.set(roadCoord + laneOffset, 0, startAlong);
        vGroup.rotation.y = direction === 1 ? 0 : Math.PI;
      } else {
        vGroup.position.set(startAlong, 0, roadCoord + laneOffset);
        vGroup.rotation.y = direction === 1 ? Math.PI / 2 : -Math.PI / 2;
      }

      scene.add(vGroup);

      const targetSpeed = 12.0 + Math.random() * 8.0;
      aiTraffic.push({
        group: vGroup,
        type,
        profile: p,
        speed: targetSpeed,
        axis,
        direction,
        laneOffset,
        roadCoord,
        wheels,
      });
    }

    // Spawn 20 Active AI Vehicles
    spawnAIVehicle('car', 'NS', 0.0, 160.0, -1);
    spawnAIVehicle('bus', 'NS', 0.0, -80.0, -1);
    spawnAIVehicle('suv', 'NS', 0.0, -160.0, 1);
    spawnAIVehicle('bike', 'NS', 0.0, 70.0, 1);

    spawnAIVehicle('truck', 'NS', -110.0, 140.0, -1);
    spawnAIVehicle('car', 'NS', -110.0, -100.0, 1);
    spawnAIVehicle('suv', 'NS', -110.0, 40.0, 1);

    spawnAIVehicle('bus', 'NS', 110.0, 120.0, -1);
    spawnAIVehicle('car', 'NS', 110.0, -50.0, -1);
    spawnAIVehicle('bike', 'NS', 110.0, -140.0, 1);

    spawnAIVehicle('car', 'EW', 0.0, -140.0, 1);
    spawnAIVehicle('truck', 'EW', 0.0, 60.0, 1);
    spawnAIVehicle('bus', 'EW', 0.0, 140.0, -1);
    spawnAIVehicle('bike', 'EW', 0.0, -60.0, -1);

    spawnAIVehicle('suv', 'EW', -130.0, -120.0, 1);
    spawnAIVehicle('car', 'EW', -130.0, 100.0, -1);
    spawnAIVehicle('bus', 'EW', -130.0, -30.0, -1);

    spawnAIVehicle('truck', 'EW', 130.0, -150.0, 1);
    spawnAIVehicle('car', 'EW', 130.0, 30.0, 1);
    spawnAIVehicle('suv', 'EW', 130.0, 120.0, -1);

    // ─── 9. Player Drivable Vehicle with Instant Mesh Swapping ──────────────
    const playerRoot = new THREE.Group();
    playerRoot.name = 'PlayerVehicleRoot';
    scene.add(playerRoot);

    let playerMeshGroup: THREE.Group | null = null;
    let frontWheels: THREE.Group[] = [];
    let playerTires: THREE.Mesh[] = [];

    function buildPlayerMesh(vType: PlayerVehicleType) {
      if (playerMeshGroup) {
        playerRoot.remove(playerMeshGroup);
      }
      frontWheels = [];
      playerTires = [];

      playerMeshGroup = new THREE.Group();
      const p = VEHICLE_PROFILES[vType];
      const paintMat = new THREE.MeshStandardMaterial({ color: p.colorHex, metalness: 0.8, roughness: 0.2 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.05 });
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

      if (vType === 'bike') {
        const frameGeo = new THREE.BoxGeometry(0.45, 0.55, 2.1);
        const frame = new THREE.Mesh(frameGeo, paintMat);
        frame.position.y = 0.55;
        playerMeshGroup.add(frame);

        const riderGeo = new THREE.BoxGeometry(0.4, 0.75, 0.5);
        const rider = new THREE.Mesh(riderGeo, glassMat);
        rider.position.set(0, 1.0, -0.1);
        playerMeshGroup.add(rider);

        [0.85, -0.85].forEach((wz, idx) => {
          const wHolder = new THREE.Group();
          wHolder.position.set(0, 0.35, wz);

          const tGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.16, 20);
          tGeo.rotateZ(Math.PI / 2);
          const t = new THREE.Mesh(tGeo, tireMat);
          wHolder.add(t);
          playerTires.push(t);

          playerMeshGroup!.add(wHolder);
          if (idx === 0) frontWheels.push(wHolder);
        });
      } else if (vType === 'bus') {
        const bGeo = new THREE.BoxGeometry(2.6, 2.8, 10.5);
        const b = new THREE.Mesh(bGeo, paintMat);
        b.position.y = 1.6;
        playerMeshGroup.add(b);

        const gGeo = new THREE.BoxGeometry(2.65, 0.9, 9.8);
        const g = new THREE.Mesh(gGeo, glassMat);
        g.position.set(0, 2.0, 0);
        playerMeshGroup.add(g);

        [-1.32, 1.32].forEach((wx) => {
          [3.8, -3.8].forEach((wz, idx) => {
            const wHolder = new THREE.Group();
            wHolder.position.set(wx, 0.5, wz);

            const tGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.32, 20);
            tGeo.rotateZ(Math.PI / 2);
            const t = new THREE.Mesh(tGeo, tireMat);
            wHolder.add(t);
            playerTires.push(t);

            playerMeshGroup!.add(wHolder);
            if (idx === 0) frontWheels.push(wHolder);
          });
        });
      } else {
        const isTruck = vType === 'truck';
        const isSuv = vType === 'suv';
        const bodyH = isTruck ? 1.4 : isSuv ? 0.8 : 0.65;
        const bGeo = new THREE.BoxGeometry(isTruck ? 2.3 : 2.05, bodyH, 4.5);
        const b = new THREE.Mesh(bGeo, paintMat);
        b.position.y = 0.55;
        playerMeshGroup.add(b);

        const cGeo = new THREE.BoxGeometry(1.7, isSuv ? 0.7 : 0.6, 2.4);
        const c = new THREE.Mesh(cGeo, glassMat);
        c.position.set(0, 1.15, -0.2);
        playerMeshGroup.add(c);

        if (isTruck) {
          const contGeo = new THREE.BoxGeometry(2.4, 2.5, 5.0);
          const cont = new THREE.Mesh(contGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
          cont.position.set(0, 1.7, -1.8);
          playerMeshGroup.add(cont);
        }

        [-1.02, 1.02].forEach((wx) => {
          [-1.35, 1.35].forEach((wz, idx) => {
            const wHolder = new THREE.Group();
            wHolder.position.set(wx, 0.36, wz);

            const tGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 20);
            tGeo.rotateZ(Math.PI / 2);
            const t = new THREE.Mesh(tGeo, tireMat);
            wHolder.add(t);
            playerTires.push(t);

            playerMeshGroup!.add(wHolder);
            if (idx === 1) frontWheels.push(wHolder);
          });
        });
      }

      playerRoot.add(playerMeshGroup);
    }

    // Build the initial vehicle mesh matching ref
    buildPlayerMesh(selectedVehicleRef.current);

    // Instant Vehicle Switching handler without scene reloads!
    switchVehicleRef.current = (vType: PlayerVehicleType) => {
      buildPlayerMesh(vType);
    };

    // Starting Position
    const START_POS = new THREE.Vector3(LANE_OFFSET, 0, 80.0);
    const START_ROT = Math.PI;
    playerRoot.position.copy(START_POS);
    playerRoot.rotation.y = START_ROT;

    resetCarRef.current = () => {
      playerRoot.position.copy(START_POS);
      playerRoot.rotation.set(0, START_ROT, 0);
      carSpeed = 0;
      steeringAngle = 0;
      setSpeedKmh(0);
      setActivePressure(0);
      setDeltaROverR(0);
      setDetectedVehicleName('None (Scanning)');
      setDetectedClassTag('STANDBY');
      setDetectedWeight(0);
      setJunctionsClearedCount(0);
      setTotalTriggers(0);
      setCrashBanner(null);
      junctions.forEach((j) => {
        j.currentPhase = 'NS_GREEN';
        j.cleared = false;
        j.tcuTimer = 8.0;
        j.signals.forEach((sig) => {
          const isNS = sig.axis === 'NS';
          (sig.red.material as THREE.MeshStandardMaterial).emissiveIntensity = isNS ? 0.2 : 4.5;
          (sig.green.material as THREE.MeshStandardMaterial).emissiveIntensity = isNS ? 4.5 : 0.2;
        });
      });
    };

    // ─── 10. Simulation Loop with Real Collisions, Physics, & Camera ─────────
    let carSpeed = 0;
    let steeringAngle = 0;
    let lastTime = performance.now();
    let animId: number;
    let crashShakeTimer = 0;

    let bannerTimeout: ReturnType<typeof setTimeout> | null = null;
    const triggerCrash = (collidedWith: string) => {
      setCrashBanner(`💥 CRASH IMPACT! Collided with ${collidedWith}`);
      crashShakeTimer = 0.25; // 250ms of camera impact vibration
      if (bannerTimeout) clearTimeout(bannerTimeout);
      bannerTimeout = setTimeout(() => {
        setCrashBanner(null);
      }, 2400);
    };

    const animate = (currentTime: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const currentType = selectedVehicleRef.current;
      const profile = VEHICLE_PROFILES[currentType];

      // Controls
      const keys = keysPressed.current;
      const isUp = keys['w'] || keys['arrowup'];
      const isDown = keys['s'] || keys['arrowdown'];
      const isLeft = keys['a'] || keys['arrowleft'];
      const isRight = keys['d'] || keys['arrowright'];
      const isSpace = keys[' '];

      // Steering
      const maxSteer = 0.54;
      if (isLeft) {
        steeringAngle = Math.min(steeringAngle + profile.steerResponsiveness * dt, maxSteer);
      } else if (isRight) {
        steeringAngle = Math.max(steeringAngle - profile.steerResponsiveness * dt, -maxSteer);
      } else {
        if (steeringAngle > 0) steeringAngle = Math.max(steeringAngle - 4.2 * dt, 0);
        else if (steeringAngle < 0) steeringAngle = Math.min(steeringAngle + 4.2 * dt, 0);
      }

      frontWheels.forEach((w) => {
        w.rotation.y = steeringAngle;
      });

      // Acceleration / Braking
      let isBraking = false;
      const maxSpeedUnits = profile.maxSpeedKmh / 3.6;
      if (isUp) {
        if (carSpeed < 0) {
          carSpeed += profile.brakeDecel * dt;
          isBraking = true;
        } else {
          carSpeed = Math.min(carSpeed + profile.accel * dt, maxSpeedUnits);
        }
      } else if (isDown) {
        if (carSpeed > 0) {
          carSpeed = Math.max(carSpeed - profile.brakeDecel * dt, 0);
          isBraking = true;
        } else {
          carSpeed = Math.max(carSpeed - profile.accel * 0.5 * dt, -maxSpeedUnits * 0.35);
        }
      } else {
        if (carSpeed > 0) carSpeed = Math.max(carSpeed - 5.0 * dt, 0);
        else if (carSpeed < 0) carSpeed = Math.min(carSpeed + 5.0 * dt, 0);
      }

      if (isSpace) {
        isBraking = true;
        if (carSpeed > 0) carSpeed = Math.max(carSpeed - profile.brakeDecel * 1.6 * dt, 0);
        else if (carSpeed < 0) carSpeed = Math.min(carSpeed + profile.brakeDecel * 1.6 * dt, 0);
      }

      if (carSpeed > 0.5) setGear('D');
      else if (carSpeed < -0.5) setGear('R');
      else setGear('P');

      // Vehicle Heading & 360° Movement
      const turnSpeed = (carSpeed / 4.2) * Math.sin(steeringAngle);
      playerRoot.rotation.y += turnSpeed * dt;

      if (currentType === 'bike') {
        playerRoot.rotation.z = -steeringAngle * 0.45;
      } else {
        playerRoot.rotation.z = 0;
      }

      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRoot.rotation.y);
      playerRoot.position.addScaledVector(forward, carSpeed * dt);

      // Check if player completed 90° cross-turn mission
      const headingAngle = Math.abs(playerRoot.rotation.y % Math.PI);
      if (Math.abs(headingAngle - Math.PI / 2) < 0.3) {
        setMissions((prev) => prev.map((m) => (m.id === 'cross_turn' ? { ...m, completed: true } : m)));
      }

      // ─── SOLID BUILDING COLLISION PHYSICS ──────────────────────────────────
      const carRadius = currentType === 'bus' ? 2.2 : currentType === 'truck' ? 1.9 : 1.35;
      for (const b of buildingColliders) {
        if (
          playerRoot.position.x + carRadius > b.minX &&
          playerRoot.position.x - carRadius < b.maxX &&
          playerRoot.position.z + carRadius > b.minZ &&
          playerRoot.position.z - carRadius < b.maxZ
        ) {
          // Calculate penetration depth along all 4 cardinal faces
          const penLeft = playerRoot.position.x + carRadius - b.minX;
          const penRight = b.maxX - (playerRoot.position.x - carRadius);
          const penBottom = playerRoot.position.z + carRadius - b.minZ;
          const penTop = b.maxZ - (playerRoot.position.z - carRadius);

          const minPen = Math.min(penLeft, penRight, penBottom, penTop);
          if (minPen === penLeft) playerRoot.position.x = b.minX - carRadius;
          else if (minPen === penRight) playerRoot.position.x = b.maxX + carRadius;
          else if (minPen === penBottom) playerRoot.position.z = b.minZ - carRadius;
          else if (minPen === penTop) playerRoot.position.z = b.maxZ + carRadius;

          // Crash rebound
          if (Math.abs(carSpeed) > 2.0) {
            triggerCrash('Building Wall');
          }
          carSpeed = -carSpeed * 0.35;
          break;
        }
      }

      // ─── VEHICLE-TO-VEHICLE CRASH & IMPACT PHYSICS ────────────────────────
      const playerLength = currentType === 'bus' ? 5.2 : currentType === 'truck' ? 4.2 : 2.5;

      aiTraffic.forEach((ai) => {
        const aiLength = ai.type === 'bus' ? 5.2 : ai.type === 'truck' ? 4.2 : 2.5;
        const impactDist = playerLength + aiLength - 1.2;

        const diff = playerRoot.position.clone().sub(ai.group.position);
        diff.y = 0;
        const dist = diff.length();

        if (dist < impactDist && dist > 0.05) {
          const normal = diff.normalize();
          const overlap = impactDist - dist;

          // Momentum-based push apart
          const totalWeight = profile.weightTons + ai.profile.weightTons;
          const playerRatio = ai.profile.weightTons / totalWeight;
          const aiRatio = profile.weightTons / totalWeight;

          playerRoot.position.addScaledVector(normal, overlap * playerRatio);
          ai.group.position.addScaledVector(normal, -overlap * aiRatio);

          if (Math.abs(carSpeed) > 1.5 || ai.speed > 3.0) {
            triggerCrash(`${ai.profile.icon} ${ai.profile.name}`);
          }

          // Elastic bounce
          carSpeed = -carSpeed * 0.45;
          ai.speed = Math.max(ai.speed * 0.3, 4.0);
        }
      });

      // City Boundaries Wrap-Around
      const HALF_SPAN_X = CITY_SPAN_X / 2;
      const HALF_SPAN_Z = CITY_SPAN_Z / 2;
      if (playerRoot.position.x > HALF_SPAN_X) playerRoot.position.x = -HALF_SPAN_X + 10;
      else if (playerRoot.position.x < -HALF_SPAN_X) playerRoot.position.x = HALF_SPAN_X - 10;

      if (playerRoot.position.z > HALF_SPAN_Z) playerRoot.position.z = -HALF_SPAN_Z + 10;
      else if (playerRoot.position.z < -HALF_SPAN_Z) playerRoot.position.z = HALF_SPAN_Z - 10;

      playerTires.forEach((t) => {
        t.rotation.x += (carSpeed / 0.36) * dt;
      });

      const kmh = Math.abs(Math.round(carSpeed * 3.6));
      setSpeedKmh(kmh);

      // ─── 11. TCU 4-Way Traffic Signal Control ──────────────────────────────
      junctions.forEach((j) => {
        j.tcuTimer -= dt;
        if (j.tcuTimer <= 0) {
          j.currentPhase = j.currentPhase === 'NS_GREEN' ? 'EW_GREEN' : 'NS_GREEN';
          j.tcuTimer = 8.0;

          j.signals.forEach((sig) => {
            const isGreen = (sig.axis === 'NS' && j.currentPhase === 'NS_GREEN') || (sig.axis === 'EW' && j.currentPhase === 'EW_GREEN');
            (sig.red.material as THREE.MeshStandardMaterial).emissiveIntensity = isGreen ? 0.2 : 4.5;
            (sig.green.material as THREE.MeshStandardMaterial).emissiveIntensity = isGreen ? 4.5 : 0.2;
          });
        }
      });

      // ─── 12. Active Dynamic AI Traffic across Both Axes ────────────────────
      aiTraffic.forEach((ai) => {
        let shouldStop = false;

        junctions.forEach((j) => {
          if (ai.axis === 'NS') {
            if (Math.abs(ai.group.position.x - j.x) < 5.0) {
              const distZ = ai.direction === 1 ? j.z - ai.group.position.z : ai.group.position.z - j.z;
              if (distZ > 0 && distZ < 22.0 && j.currentPhase !== 'NS_GREEN') {
                shouldStop = true;
              }
            }
          } else {
            if (Math.abs(ai.group.position.z - j.z) < 5.0) {
              const distX = ai.direction === 1 ? j.x - ai.group.position.x : ai.group.position.x - j.x;
              if (distX > 0 && distX < 22.0 && j.currentPhase !== 'EW_GREEN') {
                shouldStop = true;
              }
            }
          }
        });

        if (!shouldStop) {
          const move = ai.speed * dt * ai.direction;
          if (ai.axis === 'NS') {
            ai.group.position.z += move;
          } else {
            ai.group.position.x += move;
          }

          ai.wheels.forEach((w) => {
            w.rotation.x += (ai.speed / 0.36) * dt;
          });
        }

        if (ai.axis === 'NS') {
          if (ai.group.position.z > HALF_SPAN_Z) ai.group.position.z = -HALF_SPAN_Z + 5;
          else if (ai.group.position.z < -HALF_SPAN_Z) ai.group.position.z = HALF_SPAN_Z - 5;
        } else {
          if (ai.group.position.x > HALF_SPAN_X) ai.group.position.x = -HALF_SPAN_X + 5;
          else if (ai.group.position.x < -HALF_SPAN_X) ai.group.position.x = HALF_SPAN_X - 5;
        }

        // AI Vehicle Piezoresistive Sensor Detection
        junctions.forEach((j) => {
          j.sensorPlates.forEach((sp) => {
            if (ai.group.position.distanceTo(sp.center) < 3.5) {
              sp.mat.emissiveIntensity = 4.2;
              sp.mat.color.setHex(0x00e5ff);
              sp.pulseScale += 4.5 * dt;
              if (sp.pulseScale > 3.2) sp.pulseScale = 0.5;
              sp.pulseMat.opacity = Math.max(0.95 - sp.pulseScale * 0.25, 0.0);
              sp.lastDetectedVehicleName = `${ai.profile.icon} ${ai.profile.name}`;

              const needsFlip = (sp.axis === 'NS' && j.currentPhase !== 'NS_GREEN') || (sp.axis === 'EW' && j.currentPhase !== 'EW_GREEN');
              if (needsFlip) {
                j.currentPhase = sp.axis === 'NS' ? 'NS_GREEN' : 'EW_GREEN';
                j.tcuTimer = 7.0;
                j.signals.forEach((sig) => {
                  const isGreen = (sig.axis === 'NS' && j.currentPhase === 'NS_GREEN') || (sig.axis === 'EW' && j.currentPhase === 'EW_GREEN');
                  (sig.red.material as THREE.MeshStandardMaterial).emissiveIntensity = isGreen ? 0.2 : 4.5;
                  (sig.green.material as THREE.MeshStandardMaterial).emissiveIntensity = isGreen ? 4.5 : 0.2;
                });
              }
            }
          });
        });
      });

      // ─── 13. Player Piezoresistive Telemetry Engine ────────────────────────
      const playerPos = playerRoot.position;
      let detectedP = 0;
      let detectedDR = 0;
      let currentZone = 'Central City Arterial';
      let activeDetectedName = 'None (Scanning)';
      let activeClass = 'STANDBY';
      let activeW = 0;

      const nearestJunction = junctions
        .map((j) => ({ ...j, dist: playerPos.distanceTo(new THREE.Vector3(j.x, 0, j.z)) }))
        .sort((a, b) => a.dist - b.dist)[0];

      if (nearestJunction) {
        setNextJunctionName(nearestJunction.id);
        setNextJunctionDist(Math.round(nearestJunction.dist));
      }

      junctions.forEach((j) => {
        if (!j.cleared && playerPos.distanceTo(new THREE.Vector3(j.x, 0, j.z)) < 10.0) {
          j.cleared = true;
          setJunctionsClearedCount((c) => {
            const next = c + 1;
            if (next >= 3) {
              setMissions((prev) => prev.map((m) => (m.id === 'green_wave' ? { ...m, completed: true } : m)));
            }
            return next;
          });
        }

        j.sensorPlates.forEach((sp) => {
          const dist = playerPos.distanceTo(sp.center);
          if (dist < 3.8) {
            const dynamicInertia = 1.0 + (kmh / 120) * 0.7 + (isBraking ? 1.0 : 0.0);
            detectedP = profile.basePressureMpa * dynamicInertia;
            detectedDR = -(detectedP * 11.2);

            activeDetectedName = `${profile.icon} ${profile.name}`;
            activeClass = profile.classTag;
            activeW = profile.weightTons;
            currentZone = `${sp.approachName} [PIEZORESISTIVE ACTIVE]`;

            sp.mat.emissiveIntensity = 4.8;
            sp.mat.color.setHex(0x00e5ff);
            sp.pulseScale += 5.0 * dt;
            if (sp.pulseScale > 3.2) sp.pulseScale = 0.5;
            sp.pulseMat.opacity = Math.max(0.95 - sp.pulseScale * 0.25, 0.0);

            if (currentType === 'car') {
              setMissions((prev) => prev.map((m) => (m.id === 'detect_car' ? { ...m, completed: true } : m)));
            } else if (currentType === 'bike') {
              setMissions((prev) => prev.map((m) => (m.id === 'detect_bike' ? { ...m, completed: true } : m)));
            } else if (currentType === 'bus' && detectedP > 4.5) {
              setMissions((prev) => prev.map((m) => (m.id === 'detect_bus' ? { ...m, completed: true } : m)));
            }

            const needsFlip = (sp.axis === 'NS' && j.currentPhase !== 'NS_GREEN') || (sp.axis === 'EW' && j.currentPhase !== 'EW_GREEN');
            if (needsFlip) {
              j.currentPhase = sp.axis === 'NS' ? 'NS_GREEN' : 'EW_GREEN';
              j.tcuTimer = 9.0;
              j.signals.forEach((sig) => {
                const isGreen = (sig.axis === 'NS' && j.currentPhase === 'NS_GREEN') || (sig.axis === 'EW' && j.currentPhase === 'EW_GREEN');
                (sig.red.material as THREE.MeshStandardMaterial).emissiveIntensity = isGreen ? 0.2 : 4.5;
                (sig.green.material as THREE.MeshStandardMaterial).emissiveIntensity = isGreen ? 4.5 : 0.2;
              });
              setTotalTriggers((c) => c + 1);
            }
          }
        });
      });

      setCurrentZoneName(currentZone);
      setActivePressure(parseFloat(detectedP.toFixed(2)));
      setDeltaROverR(parseFloat(detectedDR.toFixed(1)));
      if (detectedP > 0) {
        setDetectedVehicleName(activeDetectedName);
        setDetectedClassTag(activeClass);
        setDetectedWeight(activeW);
      }

      // Camera Follow with Crash Screen Shake
      const activeCamMode = cameraModeRef.current;
      if (activeCamMode === 'chase') {
        const offsetDist = currentType === 'bus' ? -12.5 : -7.8;
        const offsetHeight = currentType === 'bus' ? 4.8 : 3.5;
        const offset = new THREE.Vector3(0, offsetHeight, offsetDist).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRoot.rotation.y);
        const desiredCamPos = playerRoot.position.clone().add(offset);

        if (crashShakeTimer > 0) {
          crashShakeTimer -= dt;
          desiredCamPos.x += (Math.random() - 0.5) * 0.8;
          desiredCamPos.y += (Math.random() - 0.5) * 0.8;
        }

        camera.position.lerp(desiredCamPos, 0.16);
        const lookTarget = playerRoot.position.clone().add(new THREE.Vector3(0, 1.2, 3.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRoot.rotation.y));
        camera.lookAt(lookTarget);
      } else if (activeCamMode === 'hood') {
        const hoodPos = playerRoot.position.clone().add(new THREE.Vector3(0, 1.15, 0.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRoot.rotation.y));
        if (crashShakeTimer > 0) {
          crashShakeTimer -= dt;
          hoodPos.y += (Math.random() - 0.5) * 0.5;
        }
        camera.position.copy(hoodPos);
        const lookTarget = playerRoot.position.clone().add(new THREE.Vector3(0, 1.1, 14.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRoot.rotation.y));
        camera.lookAt(lookTarget);
      } else if (activeCamMode === 'top') {
        camera.position.set(playerRoot.position.x, 56.0, playerRoot.position.z - 0.1);
        camera.lookAt(playerRoot.position);
      }

      renderer.render(scene, camera);

      // ─── 14. Draw Crisp Light-Theme GPS Minimap Radar ──────────────────────
      const mapCanvas = minimapCanvasRef.current;
      if (mapCanvas) {
        const ctx = mapCanvas.getContext('2d');
        if (ctx) {
          const w = mapCanvas.width;
          const h = mapCanvas.height;
          ctx.clearRect(0, 0, w, h);

          // Clean Light Theme Canvas Background
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, w, h);

          const scale = w / CITY_SPAN_X;
          const toX = (wx: number) => (wx + CITY_SPAN_X / 2) * scale;
          const toY = (wz: number) => (wz + CITY_SPAN_Z / 2) * scale;

          // Roads (Clean Slate Asphalt)
          ctx.fillStyle = '#cbd5e1';
          NS_AVENUES.forEach((av) => {
            ctx.fillRect(toX(av.x - HALF_W), 0, ROAD_W * scale, h);
          });
          EW_STREETS.forEach((st) => {
            ctx.fillRect(0, toY(st.z - HALF_W), w, ROAD_W * scale);
          });

          // 4-Way Intersections & Signal Phase (Green / Red)
          junctions.forEach((j) => {
            const jx = toX(j.x);
            const jy = toY(j.z);
            ctx.fillStyle = j.currentPhase === 'NS_GREEN' ? '#16a34a' : '#dc2626';
            ctx.beginPath();
            ctx.arc(jx, jy, 4, 0, Math.PI * 2);
            ctx.fill();
          });

          // AI Traffic Dots (Vibrant Amber)
          ctx.fillStyle = '#d97706';
          aiTraffic.forEach((ai) => {
            const ax = toX(ai.group.position.x);
            const ay = toY(ai.group.position.z);
            ctx.fillRect(ax - 2, ay - 2, 4, 4);
          });

          // Player Car Marker (Bold Cyan / Cobalt) with Heading Arrow
          const px = toX(playerRoot.position.x);
          const py = toY(playerRoot.position.z);
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(-playerRoot.rotation.y + Math.PI);
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.moveTo(0, -7);
          ctx.lineTo(5, 5);
          ctx.lineTo(-5, 5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!canvas) return;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []); // Run ONCE on mount! Vehicle & camera mode updates happen live via refs!

  return (
    <div className="simulation-game-root simulation-theme-light" ref={mountRef}>
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="simulation-canvas" />

      {/* Crash Banner Notification */}
      {crashBanner && <div className="sim-crash-banner">{crashBanner}</div>}

      {/* Unified Slim Navigation Header */}
      <header className="simulation-hud-bar">
        {/* Left: Home & City Tag */}
        <div className="hud-group-left">
          <button className="hud-btn-home" onClick={onReturnToHome} title="Return to Front Page">
            ← Home
          </button>
          <div className="hud-badge-tag">
            <span className="hud-live-dot" />
            <span className="hud-title-text">MINI CITY 4-WAY CROSS</span>
          </div>
        </div>

        {/* Center: Compact Vehicle Switcher Chips */}
        <div className="hud-group-center">
          {(['car', 'bike', 'suv', 'bus', 'truck'] as PlayerVehicleType[]).map((vKey) => {
            const p = VEHICLE_PROFILES[vKey];
            const isActive = selectedVehicleType === vKey;
            return (
              <button
                key={vKey}
                className={`hud-vehicle-chip ${isActive ? 'hud-vehicle-chip--active' : ''}`}
                onClick={() => handleSelectVehicle(vKey)}
                title={`Switch to ${p.name} (${p.weightTons}T)`}
              >
                <span className="chip-icon">{p.icon}</span>
                <span className="chip-name">{vKey.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Grid Stats, Camera, & Reset */}
        <div className="hud-group-right">
          <div className="hud-metric-pill">
            <span className="pill-val">{junctionsClearedCount}/9</span>
            <span className="pill-sub">CLEARED</span>
          </div>
          <div className="hud-metric-pill hud-metric-pill--next">
            <span className="pill-val">{nextJunctionName}</span>
            <span className="pill-sub">{nextJunctionDist}m</span>
          </div>

          <div className="hud-cam-toggles">
            <button
              className={`hud-cam-btn ${cameraMode === 'chase' ? 'hud-cam-btn--active' : ''}`}
              onClick={() => handleSelectCamera('chase')}
              title="Chase Cam [C]"
            >
              Chase
            </button>
            <button
              className={`hud-cam-btn ${cameraMode === 'hood' ? 'hud-cam-btn--active' : ''}`}
              onClick={() => handleSelectCamera('hood')}
              title="POV Cam"
            >
              POV
            </button>
            <button
              className={`hud-cam-btn ${cameraMode === 'top' ? 'hud-cam-btn--active' : ''}`}
              onClick={() => handleSelectCamera('top')}
              title="Tactical Drone Cam"
            >
              Drone
            </button>
          </div>

          <button className="hud-btn-reset" onClick={resetCar} title="Reset Position [R]">
            ↺
          </button>
        </div>
      </header>

      {/* Mini City Tactical Radar (Compact Top-Left) */}
      <div className="simulation-hud-minimap">
        <canvas ref={minimapCanvasRef} width={100} height={100} className="minimap-canvas" />
        <div className="minimap-legend">
          <span className="legend-item"><span className="legend-dot legend-dot--player" /> You</span>
          <span className="legend-item"><span className="legend-dot legend-dot--traffic" /> AI</span>
          <span className="legend-item"><span className="legend-dot legend-dot--signal" /> Light</span>
        </div>
      </div>

      {/* Compact Collapsible Missions Pill (Top-Right) */}
      <div className="simulation-hud-missions">
        <button
          className="missions-toggle-btn"
          onClick={() => setShowMissions(!showMissions)}
          title="Toggle Mission Objectives"
        >
          <span className="toggle-icon">🎯</span>
          <span className="toggle-text">
            Missions ({missions.filter((m) => m.completed).length}/{missions.length})
          </span>
          <span className="toggle-arrow">{showMissions ? '▲' : '▼'}</span>
        </button>
        {showMissions && (
          <ul className="missions-dropdown-list">
            {missions.map((m) => (
              <li key={m.id} className={`mission-dropdown-item ${m.completed ? 'mission-dropdown-item--done' : ''}`}>
                <span className="m-check">{m.completed ? '✓' : '○'}</span>
                <span className="m-desc">{m.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Compact Speedometer (Bottom-Left) */}
      <div className="simulation-hud-speedometer">
        <div className="hud-gear-chip">{gear}</div>
        <div className="hud-speed-row">
          <span className="hud-speed-digits">{speedKmh}</span>
          <span className="hud-speed-unit">KM/H</span>
        </div>
        <div className="hud-speed-track">
          <div
            className="hud-speed-bar"
            style={{ width: `${Math.min((speedKmh / VEHICLE_PROFILES[selectedVehicleType].maxSpeedKmh) * 100, 100)}%` }}
          />
        </div>
        <div className="hud-speed-hint">WASD / Arrows: Drive • Space: Brake</div>
      </div>

      {/* Sleek Piezoresistive Telemetry Monitor (Bottom-Right) */}
      <div className="simulation-hud-telemetry">
        <div className="telemetry-bar-header">
          <span className="tel-dot" />
          <span className="tel-title">PIEZORESISTIVE SENSOR</span>
          {activePressure > 0 && <span className="tel-live-badge">DETECTED</span>}
        </div>

        <div className="telemetry-vehicle-row">
          <span className="tel-vname">{detectedVehicleName}</span>
          <span className="tel-vclass">{detectedClassTag}</span>
        </div>

        <div className="telemetry-stats-row">
          <div className="tel-stat-box">
            <span className="tel-stat-lbl">AXLE STRESS</span>
            <span className={`tel-stat-num ${activePressure > 0 ? 'tel-stat-num--active' : ''}`}>
              {activePressure > 0 ? `${activePressure} MPa` : '0.00 MPa'}
            </span>
          </div>
          <div className="tel-stat-box">
            <span className="tel-stat-lbl">RESISTANCE SHIFT</span>
            <span className={`tel-stat-num ${deltaROverR !== 0 ? 'tel-stat-num--active' : ''}`}>
              {deltaROverR !== 0 ? `${deltaROverR}%` : '0.0%'}
            </span>
          </div>
        </div>

        <div className="telemetry-zone-row">
          <span className="tel-zone-lbl">ZONE:</span>
          <span className="tel-zone-val">{currentZoneName}</span>
        </div>
      </div>
    </div>
  );
};
