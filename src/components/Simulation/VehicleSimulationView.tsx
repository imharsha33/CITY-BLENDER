import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import './VehicleSimulationView.css';
import {
  createVehicle as createDetailedVehicle,
  type VehicleInstance,
} from '../Scene/Vehicles';

export type PlayerVehicleType = 'car' | 'bike' | 'suv' | 'bus' | 'truck';

export interface TyreFootprint {
  tyreCount: number;
  axleCount: number;
  tyreWidthMm: number;
  contactPatchAreaM2: number;
  wheelbaseM: number;
  dualRear: boolean;
  tyrePattern: string;
}

export interface TyreSensorAnalysis {
  detectedType: PlayerVehicleType;
  tyreCount: number;
  axleCount: number;
  tyreWidthMm: number;
  contactPatchM2: number;
  tyrePattern: string;
  classificationReason: string;
}

export interface SensorDetectionLog {
  id: number;
  time: string;
  isoTime: string;
  vehicleType: PlayerVehicleType;
  vehicleName: string;
  classTag: string;
  speedKmh: number;
  weightTons: number;
  pressureMpa: number;
  deltaROverR: number;
  approach: string;
  source: 'AI Traffic' | 'Player Vehicle';
  tyreCount: number;
  axleCount: number;
  tyreWidthMm: number;
  contactPatchM2: number;
  tyrePattern: string;
  classificationBasis: string;
}

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
  tyre: TyreFootprint;
}

const VEHICLE_PROFILES: Record<PlayerVehicleType, VehicleProfile> = {
  car: {
    type: 'car',
    name: 'Sedan (Passenger Car)',
    category: 'Class II: Light Passenger Vehicle',
    classTag: 'CLASS II',
    weightTons: 1.65,
    basePressureMpa: 1.45,
    maxSpeedKmh: 115,
    accel: 18.0,
    brakeDecel: 30.0,
    steerResponsiveness: 2.6,
    colorHex: 0x0284c7,
    icon: '🚗',
    tyre: {
      tyreCount: 4,
      axleCount: 2,
      tyreWidthMm: 205,
      contactPatchAreaM2: 0.068,
      wheelbaseM: 2.70,
      dualRear: false,
      tyrePattern: '4x Standard Radial (205mm)',
    },
  },
  bike: {
    type: 'bike',
    name: 'Motorbike (Two-Wheeler)',
    category: 'Class I: Light Motorized Two-Wheeler',
    classTag: 'CLASS I',
    weightTons: 0.24,
    basePressureMpa: 0.48,
    maxSpeedKmh: 135,
    accel: 24.0,
    brakeDecel: 32.0,
    steerResponsiveness: 3.5,
    colorHex: 0xf59e0b,
    icon: '🏍️',
    tyre: {
      tyreCount: 2,
      axleCount: 2,
      tyreWidthMm: 120,
      contactPatchAreaM2: 0.018,
      wheelbaseM: 1.45,
      dualRear: false,
      tyrePattern: '2x Narrow Inline (120mm)',
    },
  },
  suv: {
    type: 'suv',
    name: 'SUV (Multi-Utility Vehicle)',
    category: 'Class II+: Mid-Heavy Passenger',
    classTag: 'CLASS II+',
    weightTons: 2.45,
    basePressureMpa: 2.15,
    maxSpeedKmh: 110,
    accel: 16.0,
    brakeDecel: 28.0,
    steerResponsiveness: 2.3,
    colorHex: 0xd97706,
    icon: '🚙',
    tyre: {
      tyreCount: 4,
      axleCount: 2,
      tyreWidthMm: 265,
      contactPatchAreaM2: 0.095,
      wheelbaseM: 2.85,
      dualRear: false,
      tyrePattern: '4x All-Terrain Wide (265mm)',
    },
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
    tyre: {
      tyreCount: 6,
      axleCount: 2,
      tyreWidthMm: 295,
      contactPatchAreaM2: 0.145,
      wheelbaseM: 6.20,
      dualRear: true,
      tyrePattern: '6x Heavy Commercial (Dual Rear 295mm)',
    },
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
    tyre: {
      tyreCount: 6,
      axleCount: 2,
      tyreWidthMm: 285,
      contactPatchAreaM2: 0.130,
      wheelbaseM: 4.80,
      dualRear: true,
      tyrePattern: '6x Medium Freight (Dual Rear 285mm)',
    },
  },
};

export function analyzeTyreDetection(
  vehicleType: PlayerVehicleType,
  measuredPressureMpa: number
): TyreSensorAnalysis {
  const t = VEHICLE_PROFILES[vehicleType].tyre;
  let detectedType: PlayerVehicleType = 'car';
  let classificationReason = '';

  if (t.tyreCount === 2 || t.tyreWidthMm <= 140) {
    detectedType = 'bike';
    classificationReason = `2 Narrow Tyres (${t.tyreWidthMm}mm, patch ${t.contactPatchAreaM2}m²) • Single-Track Footprint`;
  } else if (t.dualRear || t.tyreCount >= 6) {
    if (t.wheelbaseM > 5.5 || measuredPressureMpa > 4.2) {
      detectedType = 'bus';
      classificationReason = `6 Tyres (Dual-Wheel Rear Axle, ${t.tyreWidthMm}mm) • 6.2m Wheelbase • High-Density Transit Footprint`;
    } else {
      detectedType = 'truck';
      classificationReason = `6 Commercial Tyres (Dual Rear Axle, ${t.tyreWidthMm}mm) • 4.8m Wheelbase • Heavy Freight Footprint`;
    }
  } else if (t.tyreWidthMm >= 250 || measuredPressureMpa > 1.9) {
    detectedType = 'suv';
    classificationReason = `4 Wide Radial Tyres (${t.tyreWidthMm}mm, patch ${t.contactPatchAreaM2}m²) • Wide-Track Multi-Utility Footprint`;
  } else {
    detectedType = 'car';
    classificationReason = `4 Standard Radial Tyres (${t.tyreWidthMm}mm, patch ${t.contactPatchAreaM2}m²) • Dual-Axle Passenger Footprint`;
  }

  return {
    detectedType,
    tyreCount: t.tyreCount,
    axleCount: t.axleCount,
    tyreWidthMm: t.tyreWidthMm,
    contactPatchM2: t.contactPatchAreaM2,
    tyrePattern: t.tyrePattern,
    classificationReason,
  };
}

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
  yellow: THREE.Mesh;
  green: THREE.Mesh;
  axis: 'NS' | 'EW';
}

interface JunctionData {
  id: string;
  name: string;
  x: number;
  z: number;
  currentPhase: 'NS_GREEN' | 'NS_YELLOW' | 'EW_GREEN' | 'EW_YELLOW';
  tcuTimer: number;
  cleared: boolean;
  signals: SignalHead[];
  sensorPlates: SensorPlateData[];
}

interface AITrafficVehicle {
  group: THREE.Group;
  instance: VehicleInstance;
  type: PlayerVehicleType;
  profile: VehicleProfile;
  speedVariation: number;
  speed: number;
  axis: 'NS' | 'EW';
  direction: 1 | -1;
  laneOffset: number;
  roadCoord: number;
  wheels: THREE.Mesh[];
  lastSensorTriggerTime: number;
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
  const [currentZoneName, setCurrentZoneName] = useState('Central Grand Boulevard');
  const [junctionsClearedCount, setJunctionsClearedCount] = useState(0);
  const [totalTriggers, setTotalTriggers] = useState(0);
  const [nextJunctionDist, setNextJunctionDist] = useState(0);
  const [nextJunctionName, setNextJunctionName] = useState('J13 Grand Central');
  const [crashBanner, setCrashBanner] = useState<string | null>(null);
  const [showMissions, setShowMissions] = useState<boolean>(false);

  // Traffic Control & Fleet Sensor Log States
  const [trafficPaused, setTrafficPaused] = useState<boolean>(false);
  const trafficPausedRef = useRef<boolean>(false);

  const [trafficSpeedLimit, setTrafficSpeedLimit] = useState<number>(30); // 30 km/h default (comfortable city speed)
  const trafficSpeedLimitRef = useRef<number>(30);

  const [playerSpeedGoverned, setPlayerSpeedGoverned] = useState<boolean>(true);
  const playerSpeedGovernedRef = useRef<boolean>(true);

  const [detectedTyreInfo, setDetectedTyreInfo] = useState<TyreSensorAnalysis | null>(null);

  const [sensorLogs, setSensorLogs] = useState<SensorDetectionLog[]>([]);
  const sensorLogsRef = useRef<SensorDetectionLog[]>([]);
  const logCounterRef = useRef<number>(1);

  const [vehicleCounts, setVehicleCounts] = useState({
    total: 0,
    car: 0,
    suv: 0,
    bike: 0,
    bus: 0,
    truck: 0,
  });
  const vehicleCountsRef = useRef({
    total: 0,
    car: 0,
    suv: 0,
    bike: 0,
    bus: 0,
    truck: 0,
  });

  const [showFleetDrawer, setShowFleetDrawer] = useState<boolean>(false);
  const playerLastSensorTimeRef = useRef<number>(0);

  const handleToggleTraffic = useCallback(() => {
    setTrafficPaused((prev) => {
      const next = !prev;
      trafficPausedRef.current = next;
      return next;
    });
  }, []);

  const handleSpeedLimitChange = useCallback((val: number) => {
    const clamped = Math.max(10, Math.min(80, val));
    setTrafficSpeedLimit(clamped);
    trafficSpeedLimitRef.current = clamped;
  }, []);

  const handleTogglePlayerGovernor = useCallback(() => {
    setPlayerSpeedGoverned((prev) => {
      const next = !prev;
      playerSpeedGovernedRef.current = next;
      return next;
    });
  }, []);

  const handleDownloadCSV = useCallback(() => {
    const logs = sensorLogsRef.current;
    if (logs.length === 0) {
      alert('No piezoresistive sensor detections recorded yet. Allow vehicles to cross sensor plates or drive across them!');
      return;
    }

    const headers = [
      'Log ID',
      'Timestamp (Local)',
      'Timestamp (ISO)',
      'Vehicle Name',
      'Classified Type',
      'Class Tag',
      'Source',
      'Speed (km/h)',
      'Axle Weight (Tons)',
      'Sensor Pressure (MPa)',
      'Resistance Shift Delta R/R (%)',
      'Tyres Detected',
      'Axles Count',
      'Tyre Width (mm)',
      'Contact Patch (m2)',
      'Tyre Footprint Pattern',
      'Tyre Classification Basis',
      'Sensor Location / Approach',
    ];

    const rows = logs.map((l) => [
      l.id,
      `"${l.time}"`,
      `"${l.isoTime}"`,
      `"${l.vehicleName}"`,
      l.vehicleType.toUpperCase(),
      `"${l.classTag}"`,
      `"${l.source}"`,
      l.speedKmh.toFixed(1),
      l.weightTons.toFixed(2),
      l.pressureMpa.toFixed(2),
      `"${l.deltaROverR.toFixed(1)}%"`,
      l.tyreCount,
      l.axleCount,
      l.tyreWidthMm,
      l.contactPatchM2,
      `"${l.tyrePattern}"`,
      `"${l.classificationBasis}"`,
      `"${l.approach}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `piezoresistive_traffic_sensor_log_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleClearLogs = useCallback(() => {
    sensorLogsRef.current = [];
    setSensorLogs([]);
    const resetCounts = { total: 0, car: 0, suv: 0, bike: 0, bus: 0, truck: 0 };
    vehicleCountsRef.current = resetCounts;
    setVehicleCounts(resetCounts);
  }, []);

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
      if (k === 'p') {
        handleToggleTraffic();
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

    // ─── 1. Scene & Renderer (Bright Clean Daytime Light Theme) ──────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8f2fc);
    scene.fog = new THREE.FogExp2(0xe8f2fc, 0.001);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ─── 2. Camera ──────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(54, canvas.clientWidth / canvas.clientHeight, 0.1, 2500);
    camera.position.set(0, 8, -14);

    // ─── 3. Lighting ────────────────────────────────────────────────────────
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xc8ddf0, 1.15);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfffef5, 2.3);
    sun.position.set(200, 350, -150);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 1200;
    const shadowD = 350;
    sun.shadow.camera.left = -shadowD;
    sun.shadow.camera.right = shadowD;
    sun.shadow.camera.top = shadowD;
    sun.shadow.camera.bottom = -shadowD;
    sun.shadow.bias = -0.0004;
    scene.add(sun);

    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(amb);

    // ─── 4. Materials (Civil Roadways & Architecture) ────────────────────────
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x22262d, roughness: 0.8, metalness: 0.08 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x5ea854, roughness: 0.95 });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xede9e1, roughness: 0.75 });
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xa8a49c, roughness: 0.85 });
    const whitePaintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const yellowPaintMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

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

    // ─── 5. ENLARGED MINI CITY GRID (800m x 800m — 5x5 = 25 Intersections) ──
    const ROAD_W = 16.0;
    const HALF_W = ROAD_W / 2; // 8.0m
    const LANE_OFFSET = 4.0;

    const NS_AVENUES = [
      { id: 'AV_W2', name: 'West Terminal Expressway', x: -280.0 },
      { id: 'AV_W1', name: 'Financial District Avenue', x: -140.0 },
      { id: 'AV_C',  name: 'Central Grand Boulevard', x: 0.0 },
      { id: 'AV_E1', name: 'Innovation & Tech Corridor', x: 140.0 },
      { id: 'AV_E2', name: 'East Bay Parkway', x: 280.0 },
    ];

    const EW_STREETS = [
      { id: 'ST_N2', name: 'North Uptown Way', z: -280.0 },
      { id: 'ST_N1', name: 'University Spine', z: -140.0 },
      { id: 'ST_M',  name: 'Grand Metropolitan Crossway', z: 0.0 },
      { id: 'ST_S1', name: 'Civic Center Boulevard', z: 140.0 },
      { id: 'ST_S2', name: 'South Harbor Parkway', z: 280.0 },
    ];

    const CITY_SPAN_X = 800.0;
    const CITY_SPAN_Z = 800.0;

    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(CITY_SPAN_X + 250, CITY_SPAN_Z + 250);
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

      for (let yo of [-0.15, 0.15]) {
        const ylGeo = new THREE.PlaneGeometry(CITY_SPAN_X, 0.14);
        ylGeo.rotateX(-Math.PI / 2);
        const yl = new THREE.Mesh(ylGeo, yellowPaintMat);
        yl.position.set(0, 0.016, st.z + yo);
        scene.add(yl);
      }
    });

    // ─── 6. Build 25 Four-Way Intersections with 4-Way 3-Light Signals ───────
    const junctions: JunctionData[] = [];

    NS_AVENUES.forEach((av, xi) => {
      EW_STREETS.forEach((st, zi) => {
        const jIdx = xi * 5 + zi + 1;
        const jId = `J${jIdx}`;
        const jName = `${jId}: ${av.name.split(' ')[0]} & ${st.name.split(' ')[0]}`;
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

        // 4 Approaches (North, South, East, West)
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

          // Piezoresistive sensor pad
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

        // ── 4 Dedicated Traffic Light Gantries (One on each corner facing incoming drivers) ──
        const signalHousingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });

        // Helper to construct a 3-light head (Red, Yellow, Green)
        const createSignalHead = (posX: number, posY: number, posZ: number, rotY: number, axis: 'NS' | 'EW') => {
          const headBox = new THREE.BoxGeometry(0.6, 1.7, 0.35);
          const head = new THREE.Mesh(headBox, signalHousingMat);
          head.position.set(posX, posY, posZ);
          head.rotation.y = rotY;
          scene.add(head);

          const redMat = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 0.1 });
          const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.1 });
          const greenMat = new THREE.MeshStandardMaterial({ color: 0x00e676, emissive: 0x00e676, emissiveIntensity: 0.1 });

          // Red (Top)
          const lensR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16), redMat);
          lensR.rotateX(Math.PI / 2);
          lensR.position.set(0, 0.5, 0.18);
          head.add(lensR);

          // Yellow (Middle)
          const lensY = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16), yellowMat);
          lensY.rotateX(Math.PI / 2);
          lensY.position.set(0, 0, 0.18);
          head.add(lensY);

          // Green (Bottom)
          const lensG = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16), greenMat);
          lensG.rotateX(Math.PI / 2);
          lensG.position.set(0, -0.5, 0.18);
          head.add(lensG);

          signals.push({ red: lensR, yellow: lensY, green: lensG, axis });
        };

        // 4 Corner Poles with cantilever heads:
        // 1. South-East corner (faces Northbound traffic coming from South)
        const poleGeo = new THREE.CylinderGeometry(0.22, 0.28, 7.0, 16);
        const p1 = new THREE.Mesh(poleGeo, signalHousingMat);
        p1.position.set(jX + HALF_W + 1.8, 3.5, jZ + HALF_W + 1.8);
        scene.add(p1);
        createSignalHead(jX + LANE_OFFSET, 6.0, jZ + HALF_W + 1.8, 0, 'NS'); // Faces +Z

        // 2. North-West corner (faces Southbound traffic coming from North)
        const p2 = new THREE.Mesh(poleGeo, signalHousingMat);
        p2.position.set(jX - HALF_W - 1.8, 3.5, jZ - HALF_W - 1.8);
        scene.add(p2);
        createSignalHead(jX - LANE_OFFSET, 6.0, jZ - HALF_W - 1.8, Math.PI, 'NS'); // Faces -Z

        // 3. South-West corner (faces Eastbound traffic coming from West)
        const p3 = new THREE.Mesh(poleGeo, signalHousingMat);
        p3.position.set(jX - HALF_W - 1.8, 3.5, jZ + HALF_W + 1.8);
        scene.add(p3);
        createSignalHead(jX - HALF_W - 1.8, 6.0, jZ + LANE_OFFSET, -Math.PI / 2, 'EW'); // Faces -X

        // 4. North-East corner (faces Westbound traffic coming from East)
        const p4 = new THREE.Mesh(poleGeo, signalHousingMat);
        p4.position.set(jX + HALF_W + 1.8, 3.5, jZ - HALF_W - 1.8);
        scene.add(p4);
        createSignalHead(jX + HALF_W + 1.8, 6.0, jZ - LANE_OFFSET, Math.PI / 2, 'EW'); // Faces +X

        // TCU Edge Cabinet
        const tcuBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 0.9), signalHousingMat);
        tcuBody.position.set(jX + HALF_W + 2.2, 1.0, jZ + HALF_W + 2.2);
        scene.add(tcuBody);

        junctions.push({
          id: jId,
          name: jName,
          x: jX,
          z: jZ,
          currentPhase: 'NS_GREEN',
          tcuTimer: 7.5,
          cleared: false,
          signals,
          sensorPlates,
        });
      });
    });

    // ─── 7. Expansive City Blocks & Solid Building Colliders ────────────────
    const buildingColliders: BuildingCollider[] = [];

    // Block bounds for 5x5 grid (6 divisions across X and Z)
    const BLOCK_BOUNDS_X = [
      -380, -280 - HALF_W,
      -280 + HALF_W, -140 - HALF_W,
      -140 + HALF_W, 0 - HALF_W,
      0 + HALF_W, 140 - HALF_W,
      140 + HALF_W, 280 - HALF_W,
      280 + HALF_W, 380,
    ];
    const BLOCK_BOUNDS_Z = [
      -380, -280 - HALF_W,
      -280 + HALF_W, -140 - HALF_W,
      -140 + HALF_W, 0 - HALF_W,
      0 + HALF_W, 140 - HALF_W,
      140 + HALF_W, 280 - HALF_W,
      280 + HALF_W, 380,
    ];

    for (let biX = 0; biX < 6; biX++) {
      for (let biZ = 0; biZ < 6; biZ++) {
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
        const c1 = new THREE.Mesh(new THREE.BoxGeometry(bw, curbHeight, curbThick), curbMat);
        c1.position.set(bcX, 0.14, zMin + curbThick / 2);
        scene.add(c1);

        const c2 = c1.clone();
        c2.position.set(bcX, 0.14, zMax - curbThick / 2);
        scene.add(c2);

        // Skyscrapers & Commercial Towers
        const seed = Math.abs(Math.sin(bcX * 12.3 + bcZ * 45.6));
        const numTowers = seed > 0.45 ? 2 : 1;

        for (let ti = 0; ti < numTowers; ti++) {
          const tw = (bw - 10) / numTowers;
          const td = bd - 12;
          const th = 32.0 + ((seed * 120 + ti * 40) % 75);
          const tx = bcX + (numTowers === 2 ? (ti === 0 ? -tw / 2 : tw / 2) : 0);
          const tz = bcZ;

          const chosenMat = (seed + ti) % 2 > 0.7 ? bldgSlateMat : (seed + ti) % 3 === 0 ? bldgDarkMat : bldgWhiteMat;
          const bldg = new THREE.Mesh(new THREE.BoxGeometry(tw, th, td), chosenMat);
          bldg.position.set(tx, th / 2 + 0.22, tz);
          bldg.castShadow = true;
          bldg.receiveShadow = true;
          scene.add(bldg);

          const glass = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.2, th * 0.76, td + 0.2), bldgGlassMat);
          glass.position.set(tx, th * 0.45 + 0.22, tz);
          scene.add(glass);

          const hvac = new THREE.Mesh(new THREE.BoxGeometry(tw * 0.4, 3.5, td * 0.4), curbMat);
          hvac.position.set(tx, th + 1.8, tz);
          scene.add(hvac);

          if (th > 65) {
            const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 14.0, 8), sensorPlateBaseMat);
            ant.position.set(tx, th + 8.5, tz);
            scene.add(ant);
          }

          buildingColliders.push({
            minX: tx - tw / 2,
            maxX: tx + tw / 2,
            minZ: tz - td / 2,
            maxZ: tz + td / 2,
          });
        }

        // Sidewalk Trees
        for (let treeSide of [-1, 1]) {
          const treeTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 2.8), curbMat);
          treeTrunk.position.set(bcX + treeSide * (bw / 2 - 2.5), 1.4, bcZ);
          scene.add(treeTrunk);

          const fol = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0, 1), grassMat);
          fol.position.set(bcX + treeSide * (bw / 2 - 2.5), 3.8, bcZ);
          fol.castShadow = true;
          scene.add(fol);
        }
      }
    }

    // ─── 8. 32 Active AI Traffic Vehicles Circulating Seamlessly ─────────────
    const aiTraffic: AITrafficVehicle[] = [];

    function spawnAIVehicle(
      type: PlayerVehicleType,
      axis: 'NS' | 'EW',
      roadCoord: number,
      startAlong: number,
      direction: 1 | -1
    ) {
      const p = VEHICLE_PROFILES[type];
      const laneOffset = direction === 1 ? -LANE_OFFSET : LANE_OFFSET;

      // Map PlayerVehicleType to Vehicles.ts type
      const vehicleTypeMap: Record<PlayerVehicleType, string> = {
        car: 'sedan', bike: 'bike', suv: 'suv', bus: 'bus', truck: 'truck',
      };
      const colorPalette = [
        '#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed',
        '#0891b2', '#be185d', '#ea580c', '#4f46e5', '#0f766e',
      ];
      const colorHex = colorPalette[Math.floor(Math.random() * colorPalette.length)];

      const inst = createDetailedVehicle({
        id: `ai_${type}_${axis}_${roadCoord}_${startAlong}`,
        type: vehicleTypeMap[type] as 'sedan' | 'suv' | 'bike' | 'bus' | 'truck',
        color: colorHex,
        speed: p.maxSpeedKmh / 3.6 * 0.6,
        laneIndex: 0,
        initialOffset: 0,
        direction,
      });

      const vGroup = inst.group;

      if (axis === 'NS') {
        vGroup.position.set(roadCoord + laneOffset, 0, startAlong);
        vGroup.rotation.y = direction === 1 ? 0 : Math.PI;
      } else {
        vGroup.position.set(startAlong, 0, roadCoord + laneOffset);
        vGroup.rotation.y = direction === 1 ? Math.PI / 2 : -Math.PI / 2;
      }

      scene.add(vGroup);

      const speedVariation = 0.85 + Math.random() * 0.3; // 85% to 115% nominal speed variation
      const initialSpeed = (trafficSpeedLimitRef.current / 3.6) * speedVariation;
      aiTraffic.push({
        group: vGroup,
        instance: inst,
        type,
        profile: p,
        speedVariation,
        speed: initialSpeed,
        axis,
        direction,
        laneOffset,
        roadCoord,
        wheels: [],
        lastSensorTriggerTime: 0,
      });
    }

    // Spawn 32 AI Vehicles across the 5x5 city grid
    // North-South Fleet
    spawnAIVehicle('car',   'NS', 0.0,    220.0, -1);
    spawnAIVehicle('bus',   'NS', 0.0,    60.0,  -1);
    spawnAIVehicle('suv',   'NS', 0.0,    -100.0, 1);
    spawnAIVehicle('bike',  'NS', 0.0,    -260.0, 1);

    spawnAIVehicle('truck', 'NS', -140.0, 180.0, -1);
    spawnAIVehicle('car',   'NS', -140.0, -40.0, -1);
    spawnAIVehicle('suv',   'NS', -140.0, -220.0, 1);

    spawnAIVehicle('bus',   'NS', 140.0,  260.0, -1);
    spawnAIVehicle('car',   'NS', 140.0,  50.0,   1);
    spawnAIVehicle('bike',  'NS', 140.0,  -160.0, 1);

    spawnAIVehicle('car',   'NS', -280.0, 200.0, -1);
    spawnAIVehicle('truck', 'NS', -280.0, -150.0, 1);

    spawnAIVehicle('suv',   'NS', 280.0,  120.0, -1);
    spawnAIVehicle('bus',   'NS', 280.0,  -80.0,  1);

    // East-West Fleet
    spawnAIVehicle('car',   'EW', 0.0,    -240.0, 1);
    spawnAIVehicle('truck', 'EW', 0.0,    -80.0,  1);
    spawnAIVehicle('bus',   'EW', 0.0,    80.0,  -1);
    spawnAIVehicle('bike',  'EW', 0.0,    240.0, -1);

    spawnAIVehicle('suv',   'EW', -140.0, -200.0, 1);
    spawnAIVehicle('car',   'EW', -140.0, 20.0,   1);
    spawnAIVehicle('bus',   'EW', -140.0, 180.0, -1);

    spawnAIVehicle('truck', 'EW', 140.0,  -260.0, 1);
    spawnAIVehicle('car',   'EW', 140.0,  -30.0,  1);
    spawnAIVehicle('suv',   'EW', 140.0,  160.0, -1);

    spawnAIVehicle('car',   'EW', -280.0, -180.0, 1);
    spawnAIVehicle('bike',  'EW', -280.0, 140.0, -1);

    spawnAIVehicle('truck', 'EW', 280.0,  -120.0, 1);
    spawnAIVehicle('car',   'EW', 280.0,  100.0, -1);

    // ─── 9. Player Vehicle with Instant In-Place Swapping ───────────────────
    const playerRoot = new THREE.Group();
    playerRoot.name = 'PlayerVehicleRoot';
    scene.add(playerRoot);

    let playerMeshGroup: THREE.Group | null = null;
    let frontWheels: THREE.Group[] = [];
    let playerTires: THREE.Mesh[] = [];
    let playerVehicleInstance: VehicleInstance | null = null;

    const vehicleTypeToDetailedType: Record<PlayerVehicleType, 'sedan' | 'suv' | 'bike' | 'bus' | 'truck'> = {
      car: 'sedan', bike: 'bike', suv: 'suv', bus: 'bus', truck: 'truck',
    };
    const vehiclePlayerColors: Record<PlayerVehicleType, string> = {
      car: '#0284c7', bike: '#f59e0b', suv: '#d97706', bus: '#059669', truck: '#7c3aed',
    };

    function buildPlayerMesh(vType: PlayerVehicleType) {
      if (playerMeshGroup) {
        playerRoot.remove(playerMeshGroup);
      }
      frontWheels = [];
      playerTires = [];

      // Use the high-fidelity detailed vehicle builder
      const inst = createDetailedVehicle({
        id: `player_${vType}`,
        type: vehicleTypeToDetailedType[vType],
        color: vehiclePlayerColors[vType],
        speed: VEHICLE_PROFILES[vType].maxSpeedKmh / 3.6,
        laneIndex: 0,
        initialOffset: 0,
        direction: 1,
      });

      playerVehicleInstance = inst;
      playerMeshGroup = inst.group;
      // Reset rotation — parent root controls orientation
      playerMeshGroup.rotation.set(0, 0, 0);

      // Extract front wheel groups for steering animation
      playerMeshGroup.traverse((obj) => {
        if (obj.name === 'wheel' && obj instanceof THREE.Group) {
          // Front wheels are those with positive Z position relative to center
          if (obj.position.z > 0.5) {
            frontWheels.push(obj as THREE.Group);
          }
        }
      });

      playerRoot.add(playerMeshGroup);
    }

    buildPlayerMesh(selectedVehicleRef.current);

    switchVehicleRef.current = (vType: PlayerVehicleType) => {
      buildPlayerMesh(vType);
    };

    // Starting Position on Central Grand Boulevard heading North
    const START_POS = new THREE.Vector3(LANE_OFFSET, 0, 70.0);
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
    };

    // ─── 10. Simulation Loop with Accurate Signals & Anti-Crash AI ───────────
    let carSpeed = 0;
    let steeringAngle = 0;
    let lastTime = performance.now();
    let animId: number;
    let crashShakeTimer = 0;
    let hasNewSensorLog = false;
    let lastUiSyncTime = 0;

    let bannerTimeout: ReturnType<typeof setTimeout> | null = null;
    const triggerCrash = (collidedWith: string) => {
      setCrashBanner(`💥 CRASH IMPACT! Collided with ${collidedWith}`);
      crashShakeTimer = 0.22;
      if (bannerTimeout) clearTimeout(bannerTimeout);
      bannerTimeout = setTimeout(() => {
        setCrashBanner(null);
      }, 2200);
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

      // Acceleration / Braking strictly locked to the adjusted speed
      let isBraking = false;
      const targetSpeedUnits = trafficSpeedLimitRef.current / 3.6;
      let maxSpeedUnits = targetSpeedUnits;

      // Auto-brake / engine-brake smoothly if current vehicle speed is above the set limit
      if (carSpeed > maxSpeedUnits) {
        carSpeed = Math.max(carSpeed - 14.0 * dt, maxSpeedUnits);
      }

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

      // Check cross turn mission
      const headingAngle = Math.abs(playerRoot.rotation.y % Math.PI);
      if (Math.abs(headingAngle - Math.PI / 2) < 0.3) {
        setMissions((prev) => prev.map((m) => (m.id === 'cross_turn' ? { ...m, completed: true } : m)));
      }

      // ─── SOLID BUILDING COLLIDERS ──────────────────────────────────────────
      const carRadius = currentType === 'bus' ? 2.2 : currentType === 'truck' ? 1.9 : 1.35;
      for (const b of buildingColliders) {
        if (
          playerRoot.position.x + carRadius > b.minX &&
          playerRoot.position.x - carRadius < b.maxX &&
          playerRoot.position.z + carRadius > b.minZ &&
          playerRoot.position.z - carRadius < b.maxZ
        ) {
          const penLeft = playerRoot.position.x + carRadius - b.minX;
          const penRight = b.maxX - (playerRoot.position.x - carRadius);
          const penBottom = playerRoot.position.z + carRadius - b.minZ;
          const penTop = b.maxZ - (playerRoot.position.z - carRadius);

          const minPen = Math.min(penLeft, penRight, penBottom, penTop);
          if (minPen === penLeft) playerRoot.position.x = b.minX - carRadius;
          else if (minPen === penRight) playerRoot.position.x = b.maxX + carRadius;
          else if (minPen === penBottom) playerRoot.position.z = b.minZ - carRadius;
          else if (minPen === penTop) playerRoot.position.z = b.maxZ + carRadius;

          if (Math.abs(carSpeed) > 2.0) {
            triggerCrash('Building Wall');
          }
          carSpeed = -carSpeed * 0.35;
          break;
        }
      }

      // ─── VEHICLE-TO-VEHICLE CRASH PHYSICS (PLAYER <-> AI) ──────────────────
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

          const totalWeight = profile.weightTons + ai.profile.weightTons;
          const playerRatio = ai.profile.weightTons / totalWeight;
          const aiRatio = profile.weightTons / totalWeight;

          playerRoot.position.addScaledVector(normal, overlap * playerRatio);
          ai.group.position.addScaledVector(normal, -overlap * aiRatio);

          if (Math.abs(carSpeed) > 1.5 || ai.speed > 3.0) {
            triggerCrash(`${ai.profile.icon} ${ai.profile.name}`);
          }

          carSpeed = -carSpeed * 0.45;
          ai.speed = Math.max(ai.speed * 0.3, 4.0);
        }
      });

      // City Boundaries Wrap-Around (400m bounds)
      const HALF_SPAN_X = CITY_SPAN_X / 2;
      const HALF_SPAN_Z = CITY_SPAN_Z / 2;
      if (playerRoot.position.x > HALF_SPAN_X) playerRoot.position.x = -HALF_SPAN_X + 15;
      else if (playerRoot.position.x < -HALF_SPAN_X) playerRoot.position.x = HALF_SPAN_X - 15;

      if (playerRoot.position.z > HALF_SPAN_Z) playerRoot.position.z = -HALF_SPAN_Z + 15;
      else if (playerRoot.position.z < -HALF_SPAN_Z) playerRoot.position.z = HALF_SPAN_Z - 15;

      // Animate player vehicle wheels (traverse to find named wheel groups)
      if (playerMeshGroup) {
        playerMeshGroup.traverse((obj) => {
          if (obj.name === 'wheel') {
            // Spin each wheel group around its axle (X axis in local space)
            obj.children.forEach((child) => {
              if (child instanceof THREE.Mesh) {
                child.rotation.x += (carSpeed / 0.36) * dt;
              }
            });
          }
        });
      }

      const kmh = Math.abs(Math.round(carSpeed * 3.6));
      setSpeedKmh(kmh);

      // ─── 11. TCU 4-PHASE REALISTIC TRAFFIC SIGNAL CONTROLLER ────────────────
      // Phases: NS_GREEN (7.0s) -> NS_YELLOW (2.5s) -> EW_GREEN (7.0s) -> EW_YELLOW (2.5s)
      junctions.forEach((j) => {
        j.tcuTimer -= dt;
        if (j.tcuTimer <= 0) {
          if (j.currentPhase === 'NS_GREEN') {
            j.currentPhase = 'NS_YELLOW';
            j.tcuTimer = 2.5;
          } else if (j.currentPhase === 'NS_YELLOW') {
            j.currentPhase = 'EW_GREEN';
            j.tcuTimer = 7.0;
          } else if (j.currentPhase === 'EW_GREEN') {
            j.currentPhase = 'EW_YELLOW';
            j.tcuTimer = 2.5;
          } else {
            j.currentPhase = 'NS_GREEN';
            j.tcuTimer = 7.0;
          }

          // Update all 4 signal heads precisely
          j.signals.forEach((sig) => {
            const isNS = sig.axis === 'NS';
            if (isNS) {
              const isG = j.currentPhase === 'NS_GREEN';
              const isY = j.currentPhase === 'NS_YELLOW';
              const isR = j.currentPhase === 'EW_GREEN' || j.currentPhase === 'EW_YELLOW';

              (sig.green.material as THREE.MeshStandardMaterial).emissiveIntensity = isG ? 4.5 : 0.1;
              (sig.yellow.material as THREE.MeshStandardMaterial).emissiveIntensity = isY ? 4.5 : 0.1;
              (sig.red.material as THREE.MeshStandardMaterial).emissiveIntensity = isR ? 4.5 : 0.1;
            } else {
              const isG = j.currentPhase === 'EW_GREEN';
              const isY = j.currentPhase === 'EW_YELLOW';
              const isR = j.currentPhase === 'NS_GREEN' || j.currentPhase === 'NS_YELLOW';

              (sig.green.material as THREE.MeshStandardMaterial).emissiveIntensity = isG ? 4.5 : 0.1;
              (sig.yellow.material as THREE.MeshStandardMaterial).emissiveIntensity = isY ? 4.5 : 0.1;
              (sig.red.material as THREE.MeshStandardMaterial).emissiveIntensity = isR ? 4.5 : 0.1;
            }
          });
        }
      });

      // ─── 12. ANTI-CRASH DYNAMIC AI TRAFFIC NAVIGATION ──────────────────────
      const isTrafficPaused = trafficPausedRef.current;
      const currentSpeedLimit = trafficSpeedLimitRef.current;

      aiTraffic.forEach((ai) => {
        let shouldStop = isTrafficPaused;

        // Dynamic speed governed by user speed limit setting
        if (!isTrafficPaused) {
          ai.speed = (currentSpeedLimit / 3.6) * ai.speedVariation;
        } else {
          ai.speed = 0;
        }

        // A) SAFE FOLLOWING DISTANCE: Check for vehicle ahead in the same lane
        let distToLead = 999.0;

        // Check distance to player
        const toPlayer = playerRoot.position.clone().sub(ai.group.position);
        if (ai.axis === 'NS') {
          if (Math.abs(toPlayer.x) < 3.0) {
            const forwardDist = toPlayer.z * ai.direction;
            if (forwardDist > 0 && forwardDist < 25.0) {
              distToLead = Math.min(distToLead, forwardDist);
            }
          }
        } else {
          if (Math.abs(toPlayer.z) < 3.0) {
            const forwardDist = toPlayer.x * ai.direction;
            if (forwardDist > 0 && forwardDist < 25.0) {
              distToLead = Math.min(distToLead, forwardDist);
            }
          }
        }

        // Check distance to other AI vehicles in the same lane
        aiTraffic.forEach((other) => {
          if (other === ai || other.axis !== ai.axis || other.direction !== ai.direction) return;
          if (ai.axis === 'NS') {
            if (Math.abs(other.group.position.x - ai.group.position.x) < 2.5) {
              const forwardDist = (other.group.position.z - ai.group.position.z) * ai.direction;
              if (forwardDist > 0 && forwardDist < 25.0) {
                distToLead = Math.min(distToLead, forwardDist);
              }
            }
          } else {
            if (Math.abs(other.group.position.z - ai.group.position.z) < 2.5) {
              const forwardDist = (other.group.position.x - ai.group.position.x) * ai.direction;
              if (forwardDist > 0 && forwardDist < 25.0) {
                distToLead = Math.min(distToLead, forwardDist);
              }
            }
          }
        });

        if (distToLead < 9.0) {
          shouldStop = true; // Maintain safe following distance!
        }

        // B) TRAFFIC LIGHT COMPLIANCE: Check upcoming 4-way intersection signals
        if (!shouldStop) {
          junctions.forEach((j) => {
            if (ai.axis === 'NS') {
              if (Math.abs(ai.group.position.x - j.x) < 5.0) {
                const distToLine = (j.z - ai.group.position.z) * ai.direction;
                // Approaching within 25m of stop bar
                if (distToLine > 6.0 && distToLine < 24.0) {
                  const isGreen = j.currentPhase === 'NS_GREEN';
                  if (!isGreen) {
                    shouldStop = true; // Stop cleanly before zebra crossing!
                  }
                }
              }
            } else {
              if (Math.abs(ai.group.position.z - j.z) < 5.0) {
                const distToLine = (j.x - ai.group.position.x) * ai.direction;
                if (distToLine > 6.0 && distToLine < 24.0) {
                  const isGreen = j.currentPhase === 'EW_GREEN';
                  if (!isGreen) {
                    shouldStop = true;
                  }
                }
              }
            }
          });
        }

        // C) MOVEMENT & WHEEL ANIMATION
        if (!shouldStop) {
          const move = ai.speed * dt * ai.direction;
          if (ai.axis === 'NS') {
            ai.group.position.z += move;
          } else {
            ai.group.position.x += move;
          }

          // Animate wheels by traversing named wheel groups
          ai.group.traverse((obj) => {
            if (obj.name === 'wheel') {
              obj.children.forEach((child) => {
                if (child instanceof THREE.Mesh) {
                  child.rotation.x += (ai.speed / 0.36) * dt;
                }
              });
            }
          });
        }

        // Wrap around at city perimeter
        if (ai.axis === 'NS') {
          if (ai.group.position.z > HALF_SPAN_Z) ai.group.position.z = -HALF_SPAN_Z + 10;
          else if (ai.group.position.z < -HALF_SPAN_Z) ai.group.position.z = HALF_SPAN_Z - 10;
        } else {
          if (ai.group.position.x > HALF_SPAN_X) ai.group.position.x = -HALF_SPAN_X + 10;
          else if (ai.group.position.x < -HALF_SPAN_X) ai.group.position.x = HALF_SPAN_X - 10;
        }

        // D) PIEZORESISTIVE SENSOR ACTIVATION BY AI VEHICLES & REAL-TIME LOGGING
        junctions.forEach((j) => {
          j.sensorPlates.forEach((sp) => {
            if (ai.group.position.distanceTo(sp.center) < 3.8) {
              sp.mat.emissiveIntensity = 4.2;
              sp.mat.color.setHex(0x00e5ff);
              sp.pulseScale += 4.5 * dt;
              if (sp.pulseScale > 3.2) sp.pulseScale = 0.5;
              sp.pulseMat.opacity = Math.max(0.95 - sp.pulseScale * 0.25, 0.0);
              sp.lastDetectedVehicleName = `${ai.profile.icon} ${ai.profile.name}`;

              // Debounced recording of AI vehicle crossing (> 2.0s cooldown per AI vehicle)
              if (currentTime - ai.lastSensorTriggerTime > 2000) {
                ai.lastSensorTriggerTime = currentTime;
                const aiKmh = Math.max(Math.round(ai.speed * 3.6), 14);
                const dynamicInertia = 1.0 + (aiKmh / 120) * 0.4;
                const press = parseFloat((ai.profile.basePressureMpa * dynamicInertia).toFixed(2));
                const dr = parseFloat((-(press * 11.2)).toFixed(1));
                const now = new Date();

                // Piezoresistive Tyre Footprint Detection & Classification
                const tyreAnalysis = analyzeTyreDetection(ai.type, press);

                const logEntry: SensorDetectionLog = {
                  id: logCounterRef.current++,
                  time: now.toLocaleTimeString(),
                  isoTime: now.toISOString(),
                  vehicleType: tyreAnalysis.detectedType,
                  vehicleName: ai.profile.name,
                  classTag: ai.profile.classTag,
                  speedKmh: aiKmh,
                  weightTons: ai.profile.weightTons,
                  pressureMpa: press,
                  deltaROverR: dr,
                  approach: `${j.id} (${sp.approachName})`,
                  source: 'AI Traffic',
                  tyreCount: tyreAnalysis.tyreCount,
                  axleCount: tyreAnalysis.axleCount,
                  tyreWidthMm: tyreAnalysis.tyreWidthMm,
                  contactPatchM2: tyreAnalysis.contactPatchM2,
                  tyrePattern: tyreAnalysis.tyrePattern,
                  classificationBasis: tyreAnalysis.classificationReason,
                };

                sensorLogsRef.current.unshift(logEntry);
                if (sensorLogsRef.current.length > 500) sensorLogsRef.current.pop();
                vehicleCountsRef.current[tyreAnalysis.detectedType] += 1;
                vehicleCountsRef.current.total += 1;
                hasNewSensorLog = true;
              }

              // Adaptive signal preemption (safely transitions through yellow phase)
              const isRedForAxis = (sp.axis === 'NS' && (j.currentPhase === 'EW_GREEN' || j.currentPhase === 'EW_YELLOW')) ||
                                   (sp.axis === 'EW' && (j.currentPhase === 'NS_GREEN' || j.currentPhase === 'NS_YELLOW'));
              if (isRedForAxis && j.tcuTimer > 2.0) {
                // Shorten current phase so it clears to yellow quickly
                j.tcuTimer = 1.0;
              }
            }
          });
        });
      });

      // ─── 13. PLAYER PIEZORESISTIVE TELEMETRY & ADAPTIVE PREEMPTION ─────────
      const playerPos = playerRoot.position;
      let detectedP = 0;
      let detectedDR = 0;
      let currentZone = 'Central Grand Boulevard';
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
        if (!j.cleared && playerPos.distanceTo(new THREE.Vector3(j.x, 0, j.z)) < 12.0) {
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

            // Piezoresistive Tyre Footprint Detection & Classification for Player
            const tyreAnalysis = analyzeTyreDetection(currentType, detectedP);
            setDetectedTyreInfo(tyreAnalysis);

            activeDetectedName = `${profile.icon} ${profile.name} (${tyreAnalysis.tyreCount} Tyres)`;
            activeClass = `${profile.classTag} • ${tyreAnalysis.tyrePattern}`;
            activeW = profile.weightTons;
            currentZone = `${sp.approachName} [PIEZORESISTIVE ACTIVE]`;

            sp.mat.emissiveIntensity = 4.8;
            sp.mat.color.setHex(0x00e5ff);
            sp.pulseScale += 5.0 * dt;
            if (sp.pulseScale > 3.2) sp.pulseScale = 0.5;
            sp.pulseMat.opacity = Math.max(0.95 - sp.pulseScale * 0.25, 0.0);

            // Debounced recording of player crossing sensor (> 2.0s cooldown)
            if (currentTime - playerLastSensorTimeRef.current > 2000) {
              playerLastSensorTimeRef.current = currentTime;
              const now = new Date();
              const logEntry: SensorDetectionLog = {
                id: logCounterRef.current++,
                time: now.toLocaleTimeString(),
                isoTime: now.toISOString(),
                vehicleType: tyreAnalysis.detectedType,
                vehicleName: profile.name,
                classTag: profile.classTag,
                speedKmh: kmh,
                weightTons: profile.weightTons,
                pressureMpa: parseFloat(detectedP.toFixed(2)),
                deltaROverR: parseFloat(detectedDR.toFixed(1)),
                approach: `${j.id} (${sp.approachName})`,
                source: 'Player Vehicle',
                tyreCount: tyreAnalysis.tyreCount,
                axleCount: tyreAnalysis.axleCount,
                tyreWidthMm: tyreAnalysis.tyreWidthMm,
                contactPatchM2: tyreAnalysis.contactPatchM2,
                tyrePattern: tyreAnalysis.tyrePattern,
                classificationBasis: tyreAnalysis.classificationReason,
              };

              sensorLogsRef.current.unshift(logEntry);
              if (sensorLogsRef.current.length > 500) sensorLogsRef.current.pop();
              vehicleCountsRef.current[tyreAnalysis.detectedType] += 1;
              vehicleCountsRef.current.total += 1;
              hasNewSensorLog = true;
            }

            if (currentType === 'car') {
              setMissions((prev) => prev.map((m) => (m.id === 'detect_car' ? { ...m, completed: true } : m)));
            } else if (currentType === 'bike') {
              setMissions((prev) => prev.map((m) => (m.id === 'detect_bike' ? { ...m, completed: true } : m)));
            } else if (currentType === 'bus' && detectedP > 4.5) {
              setMissions((prev) => prev.map((m) => (m.id === 'detect_bus' ? { ...m, completed: true } : m)));
            }

            // Adaptive preemption for player: trigger green clearance!
            const isRedForAxis = (sp.axis === 'NS' && (j.currentPhase === 'EW_GREEN' || j.currentPhase === 'EW_YELLOW')) ||
                                 (sp.axis === 'EW' && (j.currentPhase === 'NS_GREEN' || j.currentPhase === 'NS_YELLOW'));
            if (isRedForAxis) {
              // Accelerate cycle to yield green for player's approach
              if (j.currentPhase === 'EW_GREEN') {
                j.currentPhase = 'EW_YELLOW';
                j.tcuTimer = 1.8;
              } else if (j.currentPhase === 'NS_GREEN') {
                j.currentPhase = 'NS_YELLOW';
                j.tcuTimer = 1.8;
              }
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

      // Periodic batch sync to React state for Fleet Sensor Logs & Vehicle Counts (every 300ms)
      if (hasNewSensorLog && currentTime - lastUiSyncTime > 300) {
        lastUiSyncTime = currentTime;
        hasNewSensorLog = false;
        setSensorLogs([...sensorLogsRef.current.slice(0, 40)]);
        setVehicleCounts({ ...vehicleCountsRef.current });
      }

      // Camera Follow
      const activeCamMode = cameraModeRef.current;
      if (activeCamMode === 'chase') {
        const offsetDist = currentType === 'bus' ? -12.5 : -7.8;
        const offsetHeight = currentType === 'bus' ? 4.8 : 3.5;
        const offset = new THREE.Vector3(0, offsetHeight, offsetDist).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRoot.rotation.y);
        const desiredCamPos = playerRoot.position.clone().add(offset);

        if (crashShakeTimer > 0) {
          crashShakeTimer -= dt;
          desiredCamPos.x += (Math.random() - 0.5) * 0.7;
          desiredCamPos.y += (Math.random() - 0.5) * 0.7;
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
        camera.position.set(playerRoot.position.x, 65.0, playerRoot.position.z - 0.1);
        camera.lookAt(playerRoot.position);
      }

      renderer.render(scene, camera);

      // ─── 14. GPS Minimap Radar (Enlarged 5x5 Grid) ─────────────────────────
      const mapCanvas = minimapCanvasRef.current;
      if (mapCanvas) {
        const ctx = mapCanvas.getContext('2d');
        if (ctx) {
          const w = mapCanvas.width;
          const h = mapCanvas.height;
          ctx.clearRect(0, 0, w, h);

          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, w, h);

          const scale = w / CITY_SPAN_X;
          const toX = (wx: number) => (wx + CITY_SPAN_X / 2) * scale;
          const toY = (wz: number) => (wz + CITY_SPAN_Z / 2) * scale;

          // Roads
          ctx.fillStyle = '#cbd5e1';
          NS_AVENUES.forEach((av) => {
            ctx.fillRect(toX(av.x - HALF_W), 0, ROAD_W * scale, h);
          });
          EW_STREETS.forEach((st) => {
            ctx.fillRect(0, toY(st.z - HALF_W), w, ROAD_W * scale);
          });

          // 25 Intersections with 4-Phase Colors (Green / Amber / Red)
          junctions.forEach((j) => {
            const jx = toX(j.x);
            const jy = toY(j.z);
            const isGreen = j.currentPhase === 'NS_GREEN';
            const isYellow = j.currentPhase === 'NS_YELLOW' || j.currentPhase === 'EW_YELLOW';
            ctx.fillStyle = isGreen ? '#16a34a' : isYellow ? '#f59e0b' : '#dc2626';
            ctx.beginPath();
            ctx.arc(jx, jy, 3.2, 0, Math.PI * 2);
            ctx.fill();
          });

          // AI Traffic Dots
          ctx.fillStyle = '#d97706';
          aiTraffic.forEach((ai) => {
            const ax = toX(ai.group.position.x);
            const ay = toY(ai.group.position.z);
            ctx.fillRect(ax - 1.5, ay - 1.5, 3, 3);
          });

          // Player Car Marker with Heading Arrow
          const px = toX(playerRoot.position.x);
          const py = toY(playerRoot.position.z);
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(-playerRoot.rotation.y + Math.PI);
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.moveTo(0, -6);
          ctx.lineTo(4, 4);
          ctx.lineTo(-4, 4);
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
  }, []);

  return (
    <div className="simulation-game-root simulation-theme-light" ref={mountRef}>
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="simulation-canvas" />

      {/* Crash Banner Notification */}
      {crashBanner && <div className="sim-crash-banner">{crashBanner}</div>}

      {/* ── UNIFIED SMART CITY COMMAND DECK (CLEAN SINGLE-TIER HUD) ── */}
      <header className="simulation-hud-bar">
        {/* Left Section: Home, Flow Control & Speed Governor */}
        <div className="hud-section hud-section--left">
          <button className="hud-btn-home" onClick={onReturnToHome} title="Return to Front Page">
            ← Home
          </button>

          <div className="hud-divider" />

          <button
            className={`hud-flow-btn ${trafficPaused ? 'hud-flow-btn--resume' : 'hud-flow-btn--pause'}`}
            onClick={handleToggleTraffic}
            title={trafficPaused ? 'Resume AI Traffic Movement [P]' : 'Pause AI Traffic Movement [P]'}
          >
            <span>{trafficPaused ? '▶ Resume' : '⏸ Pause'}</span>
          </button>

          <div className="hud-speed-governor" title="Speed limit governor (regulates both AI fleet and your vehicle)">
            <span className="gov-icon">⚡</span>
            <span className="gov-val">{trafficSpeedLimit} <small>km/h</small></span>
            <input
              type="range"
              min={10}
              max={70}
              step={5}
              value={trafficSpeedLimit}
              onChange={(e) => handleSpeedLimitChange(Number(e.target.value))}
              className="hud-slider"
              title="Adjust speed limit"
            />
            <div className="gov-mini-presets">
              {[20, 35, 55].map((preset) => (
                <button
                  key={preset}
                  className={`gov-mini-chip ${trafficSpeedLimit === preset ? 'gov-mini-chip--active' : ''}`}
                  onClick={() => handleSpeedLimitChange(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Section: Segmented Vehicle Switcher */}
        <div className="hud-section hud-section--center">
          <div className="hud-vehicle-picker">
            {(['car', 'bike', 'suv', 'bus', 'truck'] as PlayerVehicleType[]).map((vKey) => {
              const p = VEHICLE_PROFILES[vKey];
              const isActive = selectedVehicleType === vKey;
              return (
                <button
                  key={vKey}
                  className={`hud-v-pill ${isActive ? 'hud-v-pill--active' : ''}`}
                  onClick={() => handleSelectVehicle(vKey)}
                  title={`${p.name} • ${p.weightTons}T • ${p.tyre.tyreCount} Tyres (${p.tyre.tyrePattern})`}
                >
                  <span className="pill-icon">{p.icon}</span>
                  <span className="pill-name">{vKey.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Section: Telemetry, Missions, Camera & Reset */}
        <div className="hud-section hud-section--right">
          <button
            className={`hud-telemetry-btn ${showFleetDrawer ? 'hud-telemetry-btn--active' : ''}`}
            onClick={() => setShowFleetDrawer(!showFleetDrawer)}
            title="Toggle Piezoresistive Tyre Footprint Audit Log & Fleet Breakdown"
          >
            <span className="telemetry-dot" />
            <span>📊 {vehicleCounts.total} Detections</span>
            <span className="telemetry-arrow">{showFleetDrawer ? '▲' : '▾'}</span>
          </button>

          <button
            className="hud-action-btn hud-action-btn--csv"
            onClick={handleDownloadCSV}
            title="Download full tyre sensor CSV log"
          >
            📥 CSV
          </button>

          <button
            className={`hud-action-btn hud-action-btn--missions ${showMissions ? 'hud-action-btn--active' : ''}`}
            onClick={() => setShowMissions(!showMissions)}
            title="Toggle Mission Objectives"
          >
            🎯 Missions ({missions.filter((m) => m.completed).length}/5)
          </button>

          <div className="hud-divider" />

          <div className="hud-cam-switch">
            <button
              className={`hud-cam-pill ${cameraMode === 'chase' ? 'hud-cam-pill--active' : ''}`}
              onClick={() => handleSelectCamera('chase')}
              title="Chase Cam [C]"
            >
              Chase
            </button>
            <button
              className={`hud-cam-pill ${cameraMode === 'hood' ? 'hud-cam-pill--active' : ''}`}
              onClick={() => handleSelectCamera('hood')}
              title="POV Cam"
            >
              POV
            </button>
            <button
              className={`hud-cam-pill ${cameraMode === 'top' ? 'hud-cam-pill--active' : ''}`}
              onClick={() => handleSelectCamera('top')}
              title="Drone Cam"
            >
              Drone
            </button>
          </div>

          <button className="hud-btn-reset" onClick={resetCar} title="Reset Position [R]">
            ↺
          </button>
        </div>
      </header>

      {/* Expandable Fleet Sensor Audit Log Drawer */}
      {showFleetDrawer && (
        <div className="simulation-fleet-drawer">
          <div className="fleet-drawer-header">
            <div className="drawer-title-row">
              <span className="drawer-icon">🛞</span>
              <span className="drawer-title">PIEZORESISTIVE TYRE FOOTPRINT DETECTION & AUDIT LOG</span>
              <span className="drawer-count-badge">{sensorLogs.length} Records</span>
            </div>
            <div className="drawer-actions">
              <button className="drawer-btn-download" onClick={handleDownloadCSV}>
                📥 Download Full CSV
              </button>
              <button className="drawer-btn-clear" onClick={handleClearLogs}>
                🗑️ Clear
              </button>
              <button className="drawer-btn-close" onClick={() => setShowFleetDrawer(false)}>
                ✕
              </button>
            </div>
          </div>

          {/* Real-time Category Breakdown Cards */}
          <div className="fleet-drawer-summary-cards">
            <div className="fleet-summary-card">
              <div className="card-top"><span className="card-icon">🚗</span> <span className="card-label">Sedan</span></div>
              <div className="card-count">{vehicleCounts.car}</div>
              <div className="card-sub">4 Tyres • 205mm radial</div>
            </div>
            <div className="fleet-summary-card">
              <div className="card-top"><span className="card-icon">🚙</span> <span className="card-label">SUV</span></div>
              <div className="card-count">{vehicleCounts.suv}</div>
              <div className="card-sub">4 Tyres • 245mm wide</div>
            </div>
            <div className="fleet-summary-card">
              <div className="card-top"><span className="card-icon">🏍️</span> <span className="card-label">Bike</span></div>
              <div className="card-count">{vehicleCounts.bike}</div>
              <div className="card-sub">2 Tyres • 120mm inline</div>
            </div>
            <div className="fleet-summary-card">
              <div className="card-top"><span className="card-icon">🚌</span> <span className="card-label">Bus</span></div>
              <div className="card-count">{vehicleCounts.bus}</div>
              <div className="card-sub">6 Tyres • Dual-rear axle</div>
            </div>
            <div className="fleet-summary-card">
              <div className="card-top"><span className="card-icon">🚚</span> <span className="card-label">Truck</span></div>
              <div className="card-count">{vehicleCounts.truck}</div>
              <div className="card-sub">6 Tyres • Heavy freight</div>
            </div>
            <div className="fleet-summary-card fleet-summary-card--total">
              <div className="card-top"><span className="card-icon">⚡</span> <span className="card-label">Total Passes</span></div>
              <div className="card-count">{vehicleCounts.total}</div>
              <div className="card-sub">Piezoresistive readings</div>
            </div>
          </div>

          <div className="fleet-table-container">
            {sensorLogs.length === 0 ? (
              <div className="fleet-empty-state">
                No tyre footprints recorded yet. Drive over piezoresistive plates or allow AI vehicles to cross junctions!
              </div>
            ) : (
              <table className="fleet-log-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Time</th>
                    <th>Vehicle</th>
                    <th>Class</th>
                    <th>Source</th>
                    <th>Tyres & Axles</th>
                    <th>Contact Patch</th>
                    <th>Tyre Detection Basis</th>
                    <th>Speed</th>
                    <th>Weight</th>
                    <th>Pressure</th>
                    <th>ΔR/R</th>
                    <th>Intersection & Approach</th>
                  </tr>
                </thead>
                <tbody>
                  {sensorLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td className="log-time">{log.time}</td>
                      <td className="log-vname">
                        <strong>{log.vehicleName}</strong>
                      </td>
                      <td>
                        <span className="log-class-tag">{log.classTag}</span>
                      </td>
                      <td>
                        <span className={`log-source-tag ${log.source === 'Player Vehicle' ? 'player' : 'ai'}`}>
                          {log.source}
                        </span>
                      </td>
                      <td>
                        <span className="log-tyre-tag">{log.tyreCount} Tyres ({log.axleCount}A)</span>
                      </td>
                      <td className="log-num">{log.tyreWidthMm}mm ({log.contactPatchM2} m²)</td>
                      <td className="log-basis">{log.classificationBasis}</td>
                      <td className="log-num">{log.speedKmh} km/h</td>
                      <td className="log-num">{log.weightTons} T</td>
                      <td className="log-num log-pressure">{log.pressureMpa} MPa</td>
                      <td className="log-num log-dr">{log.deltaROverR}%</td>
                      <td className="log-approach">{log.approach}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Mini City Tactical Radar (Positioned Neatly on Left) */}
      <div className="simulation-hud-minimap">
        <canvas ref={minimapCanvasRef} width={100} height={100} className="minimap-canvas" />
        <div className="minimap-legend">
          <span className="legend-item"><span className="legend-dot legend-dot--player" /> You</span>
          <span className="legend-item"><span className="legend-dot legend-dot--traffic" /> AI</span>
          <span className="legend-item"><span className="legend-dot legend-dot--signal" /> Light</span>
        </div>
      </div>

      {/* Floating Missions Panel (Shown when Missions toggled) */}
      {showMissions && (
        <div className="simulation-hud-missions-panel">
          <div className="missions-panel-header">
            <span>🎯 MISSION OBJECTIVES</span>
            <button className="missions-close-btn" onClick={() => setShowMissions(false)}>✕</button>
          </div>
          <ul className="missions-dropdown-list">
            {missions.map((m) => (
              <li key={m.id} className={`mission-dropdown-item ${m.completed ? 'mission-dropdown-item--done' : ''}`}>
                <span className="m-check">{m.completed ? '✓' : '○'}</span>
                <span className="m-desc">{m.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Governed Speedometer (Bottom-Left) */}
      <div className="simulation-hud-speedometer">
        <div className="hud-gear-chip">{gear}</div>
        <div className="hud-speed-row">
          <span className="hud-speed-digits">{speedKmh}</span>
          <span className="hud-speed-unit">KM/H</span>
        </div>
        <div className="hud-speed-track">
          <div
            className="hud-speed-bar"
            style={{ width: `${Math.min((speedKmh / trafficSpeedLimit) * 100, 100)}%` }}
          />
        </div>
        <div className="hud-speed-governor-tag">
          ⚡ GOVERNED: <strong>{trafficSpeedLimit} KM/H</strong>
        </div>
        <div className="hud-speed-hint">WASD / Arrows: Drive • Space: Brake</div>
      </div>

      {/* Piezoresistive & Tyre Detection Telemetry Monitor (Bottom-Right) */}
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

        {/* Tyre Footprint Recognition Box */}
        <div className="telemetry-tyre-box">
          <div className="tyre-box-header">
            <span className="tyre-box-icon">🛞</span>
            <span className="tyre-box-title">TYRE DETECTION SIGNATURE</span>
          </div>
          <div className="tyre-box-grid">
            <div className="tyre-box-stat">
              <span className="tyre-box-lbl">TYRES / AXLES</span>
              <span className="tyre-box-val">
                {detectedTyreInfo ? `${detectedTyreInfo.tyreCount} Tyres • ${detectedTyreInfo.axleCount} Axles` : 'Scanning wheels...'}
              </span>
            </div>
            <div className="tyre-box-stat">
              <span className="tyre-box-lbl">CONTACT PATCH</span>
              <span className="tyre-box-val">
                {detectedTyreInfo ? `${detectedTyreInfo.tyreWidthMm}mm (${detectedTyreInfo.contactPatchM2} m²)` : '—'}
              </span>
            </div>
          </div>
          <div className="tyre-box-reason">
            <span className="tyre-reason-lbl">DETECTION BASIS:</span>
            <span className="tyre-reason-val">
              {detectedTyreInfo ? detectedTyreInfo.classificationReason : 'Awaiting tyre contact on piezoresistive plate'}
            </span>
          </div>
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
