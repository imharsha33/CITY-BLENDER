import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
    maxSpeedKmh: 115,
    accel: 18.0,
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
    maxSpeedKmh: 135,
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
    maxSpeedKmh: 110,
    accel: 16.0,
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
  id: string;
  name: string;
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

export interface SensorMeasurementLog {
  id: number;
  time: string;
  timestampIso: string;
  elapsedSec: string;
  source: 'USER' | 'AI_TRAFFIC';
  vehicleId: string;
  vehicleType: string;
  vehicleClass: string;
  weightTons: number;
  speedKmh: number;
  junctionId: string;
  junctionName: string;
  approachName: string;
  axis: 'NS' | 'EW';
  pressureMpa: number;
  resistanceShiftPct: number;
  strainMicrostrain: number;
  signalVoltageMv: number;
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

  const [missions, setMissions] = useState<MissionState[]>([
    { id: 'detect_car', title: 'Drive over sensor to detect Car (Class II)', completed: false },
    { id: 'detect_bike', title: 'Switch to Bike [V] and test Light Footprint (Class I)', completed: false },
    { id: 'detect_bus', title: 'Switch to Bus [V] and trigger Heavy Stress (> 5.0 MPa)', completed: false },
    { id: 'cross_turn', title: 'Turn 90° into East-West Cross Avenue at a 4-way intersection', completed: false },
    { id: 'green_wave', title: 'Trigger Adaptive Green Wave preemption at 3 junctions', completed: false },
  ]);

  // ── Sensor Continuous Telemetry & CSV Export States ──
  const sensorLogsRef = useRef<SensorMeasurementLog[]>([]);
  const lastSensorLogTimeMapRef = useRef<Map<string, number>>(new Map());
  const sensorLogSeqRef = useRef<number>(0);
  const simStartTimeRef = useRef<number>(Date.now());
  const lastCountUpdateRef = useRef<number>(0);
  const currentCountRef = useRef<number>(0);

  const [telemetryLogsCount, setTelemetryLogsCount] = useState<number>(0);
  const [showTelemetryModal, setShowTelemetryModal] = useState<boolean>(false);
  const [telemetryFilter, setTelemetryFilter] = useState<'ALL' | 'USER' | 'AI'>('ALL');
  const [csvExportNotice, setCsvExportNotice] = useState<string | null>(null);

  const handleDownloadCsv = useCallback(() => {
    const logs = sensorLogsRef.current;
    if (!logs || logs.length === 0) {
      alert('No sensor readings captured yet. Drive your vehicle or allow AI traffic to circulate over the sensor pads.');
      return;
    }

    const headers = [
      'Record_ID',
      'Timestamp_ISO',
      'Elapsed_Simulation_Time',
      'Source',
      'Vehicle_ID',
      'Vehicle_Type',
      'Vehicle_Class',
      'Weight_Tons',
      'Speed_KMH',
      'Junction_ID',
      'Junction_Name',
      'Approach_Name',
      'Sensor_Axis',
      'Axle_Pressure_MPa',
      'Resistance_Shift_Percent',
      'Microstrain_ue',
      'Signal_Voltage_mV',
    ];

    const rows = logs.map((log) => [
      log.id,
      `"${log.timestampIso}"`,
      `"${log.elapsedSec}"`,
      `"${log.source}"`,
      `"${log.vehicleId.replace(/"/g, '""')}"`,
      `"${log.vehicleType.replace(/"/g, '""')}"`,
      `"${log.vehicleClass}"`,
      log.weightTons,
      log.speedKmh,
      `"${log.junctionId}"`,
      `"${log.junctionName.replace(/"/g, '""')}"`,
      `"${log.approachName.replace(/"/g, '""')}"`,
      `"${log.axis}"`,
      log.pressureMpa,
      log.resistanceShiftPct,
      log.strainMicrostrain,
      log.signalVoltageMv,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timeStr = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.setAttribute('download', `piezoresistive_sensor_telemetry_${timeStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCsvExportNotice(`Exported ${logs.length} readings as CSV`);
    setTimeout(() => setCsvExportNotice(null), 4000);
  }, []);

  const handleClearLogs = useCallback(() => {
    sensorLogsRef.current = [];
    lastSensorLogTimeMapRef.current.clear();
    sensorLogSeqRef.current = 0;
    currentCountRef.current = 0;
    setTelemetryLogsCount(0);
  }, []);

  const displayedLogs = useMemo(() => {
    const all = sensorLogsRef.current;
    let filtered = all;
    if (telemetryFilter === 'USER') {
      filtered = all.filter((l) => l.source === 'USER');
    } else if (telemetryFilter === 'AI') {
      filtered = all.filter((l) => l.source === 'AI_TRAFFIC');
    }
    return filtered.slice(-150).reverse();
  }, [showTelemetryModal, telemetryFilter, telemetryLogsCount]);

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
    let aiCounter = 0;

    function spawnAIVehicle(
      type: PlayerVehicleType,
      axis: 'NS' | 'EW',
      roadCoord: number,
      startAlong: number,
      direction: 1 | -1
    ) {
      aiCounter++;
      const aiId = `AI-${String(aiCounter).padStart(2, '0')}`;
      const vGroup = new THREE.Group();
      const p = VEHICLE_PROFILES[type];
      const aiName = `${aiId} (${p.name.split(' ')[0]})`;
      const paintMat = new THREE.MeshStandardMaterial({ color: p.colorHex, metalness: 0.7, roughness: 0.25 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
      const tMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      const wheels: THREE.Mesh[] = [];

      const laneOffset = direction === 1 ? -LANE_OFFSET : LANE_OFFSET;

      if (type === 'bike') {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 2.0), paintMat);
        frame.position.y = 0.55;
        vGroup.add(frame);

        const rider = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.5), glassMat);
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
        const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 10.5), paintMat);
        b.position.y = 1.6;
        vGroup.add(b);

        const g = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.9, 9.8), glassMat);
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
        const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.2, 2.2), paintMat);
        cab.position.set(0, 1.4, 2.2);
        vGroup.add(cab);

        const cont = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 5.5), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
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
        const b = new THREE.Mesh(new THREE.BoxGeometry(2.0, isSuv ? 0.8 : 0.65, 4.4), paintMat);
        b.position.y = 0.55;
        vGroup.add(b);

        const c = new THREE.Mesh(new THREE.BoxGeometry(1.7, isSuv ? 0.7 : 0.6, 2.4), glassMat);
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

      const targetSpeed = 13.0 + Math.random() * 7.0; // 48 to 72 km/h
      aiTraffic.push({
        id: aiId,
        name: aiName,
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
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 2.1), paintMat);
        frame.position.y = 0.55;
        playerMeshGroup.add(frame);

        const rider = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.75, 0.5), glassMat);
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
        const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 10.5), paintMat);
        b.position.y = 1.6;
        playerMeshGroup.add(b);

        const g = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.9, 9.8), glassMat);
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
        const b = new THREE.Mesh(new THREE.BoxGeometry(isTruck ? 2.3 : 2.05, bodyH, 4.5), paintMat);
        b.position.y = 0.55;
        playerMeshGroup.add(b);

        const c = new THREE.Mesh(new THREE.BoxGeometry(1.7, isSuv ? 0.7 : 0.6, 2.4), glassMat);
        c.position.set(0, 1.15, -0.2);
        playerMeshGroup.add(c);

        if (isTruck) {
          const cont = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.5, 5.0), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
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

      playerTires.forEach((t) => {
        t.rotation.x += (carSpeed / 0.36) * dt;
      });

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
      aiTraffic.forEach((ai) => {
        let shouldStop = false;

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

          ai.wheels.forEach((w) => {
            w.rotation.x += (ai.speed / 0.36) * dt;
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

        // D) PIEZORESISTIVE SENSOR ACTIVATION BY AI VEHICLES
        junctions.forEach((j) => {
          j.sensorPlates.forEach((sp) => {
            if (ai.group.position.distanceTo(sp.center) < 3.5) {
              sp.mat.emissiveIntensity = 4.2;
              sp.mat.color.setHex(0x00e5ff);
              sp.pulseScale += 4.5 * dt;
              if (sp.pulseScale > 3.2) sp.pulseScale = 0.5;
              sp.pulseMat.opacity = Math.max(0.95 - sp.pulseScale * 0.25, 0.0);
              sp.lastDetectedVehicleName = `${ai.profile.icon} ${ai.name}`;

              // Adaptive signal preemption (safely transitions through yellow phase)
              const isRedForAxis = (sp.axis === 'NS' && (j.currentPhase === 'EW_GREEN' || j.currentPhase === 'EW_YELLOW')) ||
                                   (sp.axis === 'EW' && (j.currentPhase === 'NS_GREEN' || j.currentPhase === 'NS_YELLOW'));
              if (isRedForAxis && j.tcuTimer > 2.0) {
                // Shorten current phase so it clears to yellow quickly
                j.tcuTimer = 1.0;
              }

              // Continuous Piezoresistive Telemetry Logging for AI traffic (~240ms interval per contact)
              const now = performance.now();
              const logKey = `${ai.id}_${sp.approachName}`;
              const lastLog = lastSensorLogTimeMapRef.current.get(logKey) || 0;
              if (now - lastLog >= 240) {
                lastSensorLogTimeMapRef.current.set(logKey, now);

                const aiSpeedKmh = parseFloat((ai.speed * 3.6).toFixed(1));
                const dynamicInertia = 1.0 + (aiSpeedKmh / 120) * 0.7;
                const pMpa = parseFloat((ai.profile.basePressureMpa * dynamicInertia * (0.95 + Math.random() * 0.1)).toFixed(2));
                const rPct = parseFloat((-(pMpa * 11.2) * (0.98 + Math.random() * 0.04)).toFixed(1));
                const strainMicrostrain = Math.round(pMpa * 285.5);
                const signalVoltageMv = parseFloat((Math.abs(rPct) * 11.85).toFixed(1));

                sensorLogSeqRef.current += 1;
                const nowDate = new Date();
                const elapsedSec = ((Date.now() - simStartTimeRef.current) / 1000).toFixed(1);

                sensorLogsRef.current.push({
                  id: sensorLogSeqRef.current,
                  time: nowDate.toTimeString().split(' ')[0] + '.' + String(nowDate.getMilliseconds()).padStart(3, '0'),
                  timestampIso: nowDate.toISOString(),
                  elapsedSec: `+${elapsedSec}s`,
                  source: 'AI_TRAFFIC',
                  vehicleId: ai.name,
                  vehicleType: ai.profile.name,
                  vehicleClass: ai.profile.classTag,
                  weightTons: ai.profile.weightTons,
                  speedKmh: aiSpeedKmh,
                  junctionId: j.id,
                  junctionName: j.name,
                  approachName: sp.approachName,
                  axis: sp.axis,
                  pressureMpa: pMpa,
                  resistanceShiftPct: rPct,
                  strainMicrostrain,
                  signalVoltageMv,
                });

                if (sensorLogsRef.current.length > 10000) {
                  sensorLogsRef.current.shift();
                }
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

            activeDetectedName = `${profile.icon} ${profile.name}`;
            activeClass = profile.classTag;
            activeW = profile.weightTons;
            currentZone = `${sp.approachName} [PIEZORESISTIVE ACTIVE]`;

            sp.mat.emissiveIntensity = 4.8;
            sp.mat.color.setHex(0x00e5ff);
            sp.pulseScale += 5.0 * dt;
            if (sp.pulseScale > 3.2) sp.pulseScale = 0.5;
            sp.pulseMat.opacity = Math.max(0.95 - sp.pulseScale * 0.25, 0.0);

            // Continuous Piezoresistive Telemetry Logging for User Vehicle (~240ms interval per contact)
            const now = performance.now();
            const playerLogKey = `PLAYER_${sp.approachName}`;
            const lastPlayerLog = lastSensorLogTimeMapRef.current.get(playerLogKey) || 0;
            if (now - lastPlayerLog >= 240) {
              lastSensorLogTimeMapRef.current.set(playerLogKey, now);

              const pMpa = parseFloat(detectedP.toFixed(2));
              const rPct = parseFloat(detectedDR.toFixed(1));
              const strainMicrostrain = Math.round(pMpa * 285.5);
              const signalVoltageMv = parseFloat((Math.abs(rPct) * 11.85).toFixed(1));

              sensorLogSeqRef.current += 1;
              const nowDate = new Date();
              const elapsedSec = ((Date.now() - simStartTimeRef.current) / 1000).toFixed(1);

              sensorLogsRef.current.push({
                id: sensorLogSeqRef.current,
                time: nowDate.toTimeString().split(' ')[0] + '.' + String(nowDate.getMilliseconds()).padStart(3, '0'),
                timestampIso: nowDate.toISOString(),
                elapsedSec: `+${elapsedSec}s`,
                source: 'USER',
                vehicleId: `User (${profile.name.split(' ')[0]})`,
                vehicleType: profile.name,
                vehicleClass: profile.classTag,
                weightTons: profile.weightTons,
                speedKmh: parseFloat(kmh.toFixed(1)),
                junctionId: j.id,
                junctionName: j.name,
                approachName: sp.approachName,
                axis: sp.axis,
                pressureMpa: pMpa,
                resistanceShiftPct: rPct,
                strainMicrostrain,
                signalVoltageMv,
              });

              if (sensorLogsRef.current.length > 10000) {
                sensorLogsRef.current.shift();
              }
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

      // Throttled UI count sync (every ~200ms)
      const nowMs = performance.now();
      if (nowMs - lastCountUpdateRef.current > 200) {
        lastCountUpdateRef.current = nowMs;
        if (currentCountRef.current !== sensorLogSeqRef.current) {
          currentCountRef.current = sensorLogSeqRef.current;
          setTelemetryLogsCount(sensorLogSeqRef.current);
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

      {/* Unified Slim Navigation Header */}
      <header className="simulation-hud-bar">
        {/* Left: Home & City Tag */}
        <div className="hud-group-left">
          <button className="hud-btn-home" onClick={onReturnToHome} title="Return to Front Page">
            ← Home
          </button>
          <div className="hud-badge-tag">
            <span className="hud-live-dot" />
            <span className="hud-title-text">METROPOLITAN MINI CITY (5x5 GRID)</span>
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
            <span className="pill-val">{junctionsClearedCount}/25</span>
            <span className="pill-sub">CLEARED</span>
          </div>
          <div className="hud-metric-pill hud-metric-pill--next">
            <span className="pill-val">{nextJunctionName}</span>
            <span className="pill-sub">{nextJunctionDist}m</span>
          </div>

          {/* Continuous Sensor Readings Log & CSV Quick Download */}
          <button
            className="hud-btn-telemetry"
            onClick={() => setShowTelemetryModal(true)}
            title="Open Live Sensor Telemetry Stream"
          >
            <span className="hud-telemetry-dot" />
            <span className="hud-telemetry-text">SENSORS</span>
            <span className="hud-telemetry-badge">{telemetryLogsCount}</span>
          </button>

          <button
            className="hud-btn-csv"
            onClick={handleDownloadCsv}
            title="Export All Piezoresistive Sensor Measurements to CSV"
          >
            📥 CSV
          </button>

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

        {/* Continuous Logging Counter & Quick Actions */}
        <div className="telemetry-log-stats-row">
          <span className="tel-log-pulse" />
          <span className="tel-log-count-text">
            {telemetryLogsCount > 0 ? `${telemetryLogsCount} readings logged` : 'Sensors active • 0 readings'}
          </span>
        </div>

        <div className="telemetry-actions-row">
          <button
            className="tel-action-btn tel-action-btn--csv"
            onClick={handleDownloadCsv}
            title="Download CSV of all vehicle readings"
          >
            📥 CSV
          </button>
          <button
            className="tel-action-btn tel-action-btn--view"
            onClick={() => setShowTelemetryModal(true)}
            title="Open Live Sensor Stream Log"
          >
            📊 View Log ({telemetryLogsCount})
          </button>
        </div>
      </div>

      {/* CSV Export Success Toast */}
      {csvExportNotice && (
        <div className="sim-toast-notice">
          ✓ {csvExportNotice}
        </div>
      )}

      {/* Full Real-Time Sensor Telemetry Modal & Table */}
      {showTelemetryModal && (
        <div className="telemetry-modal-backdrop" onClick={() => setShowTelemetryModal(false)}>
          <div className="telemetry-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="telemetry-modal-header">
              <div className="modal-title-group">
                <span className="modal-live-dot" />
                <div>
                  <h3>Continuous Piezoresistive Sensor Measurements</h3>
                  <p>Real-time dynamic axle load, resistance shift, and microstrain recorded across all 25 intersections</p>
                </div>
              </div>
              <div className="modal-header-actions">
                <button className="modal-btn-download" onClick={handleDownloadCsv}>
                  📥 Download CSV ({telemetryLogsCount})
                </button>
                <button className="modal-btn-clear" onClick={handleClearLogs} title="Clear recorded data">
                  🗑️ Clear
                </button>
                <button className="modal-btn-close" onClick={() => setShowTelemetryModal(false)} title="Close Inspector">
                  ✕
                </button>
              </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="telemetry-kpi-bar">
              <div className="kpi-card">
                <span className="kpi-lbl">TOTAL MEASUREMENTS</span>
                <span className="kpi-val">{telemetryLogsCount}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-lbl">USER VEHICLE PASSES</span>
                <span className="kpi-val">
                  {sensorLogsRef.current.filter((l) => l.source === 'USER').length}
                </span>
              </div>
              <div className="kpi-card">
                <span className="kpi-lbl">AI FLEET PASSES</span>
                <span className="kpi-val">
                  {sensorLogsRef.current.filter((l) => l.source === 'AI_TRAFFIC').length}
                </span>
              </div>
              <div className="kpi-card">
                <span className="kpi-lbl">PEAK AXLE STRESS</span>
                <span className="kpi-val text-blue">
                  {sensorLogsRef.current.length > 0
                    ? Math.max(...sensorLogsRef.current.map((l) => l.pressureMpa)).toFixed(2) + ' MPa'
                    : '0.00 MPa'}
                </span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="telemetry-filter-bar">
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${telemetryFilter === 'ALL' ? 'filter-tab--active' : ''}`}
                  onClick={() => setTelemetryFilter('ALL')}
                >
                  All Vehicles ({sensorLogsRef.current.length})
                </button>
                <button
                  className={`filter-tab ${telemetryFilter === 'USER' ? 'filter-tab--active' : ''}`}
                  onClick={() => setTelemetryFilter('USER')}
                >
                  🚗 User Vehicle ({sensorLogsRef.current.filter((l) => l.source === 'USER').length})
                </button>
                <button
                  className={`filter-tab ${telemetryFilter === 'AI' ? 'filter-tab--active' : ''}`}
                  onClick={() => setTelemetryFilter('AI')}
                >
                  🤖 AI Traffic Fleet ({sensorLogsRef.current.filter((l) => l.source === 'AI_TRAFFIC').length})
                </button>
              </div>
              <span className="filter-note">
                Showing latest {displayedLogs.length} entries (real-time stream)
              </span>
            </div>

            {/* Live Data Table */}
            <div className="telemetry-table-container">
              {displayedLogs.length === 0 ? (
                <div className="telemetry-empty-state">
                  <span className="empty-icon">📡</span>
                  <h4>Waiting for Sensor Data...</h4>
                  <p>Drive your vehicle over any sensor pad, or let AI traffic pass through intersections to capture data.</p>
                </div>
              ) : (
                <table className="telemetry-data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Time</th>
                      <th>Source</th>
                      <th>Vehicle</th>
                      <th>Class</th>
                      <th>Weight</th>
                      <th>Speed</th>
                      <th>Junction & Approach</th>
                      <th>Axle Stress</th>
                      <th>ΔR/R₀</th>
                      <th>Voltage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedLogs.map((log) => (
                      <tr key={log.id} className={log.source === 'USER' ? 'row-user' : 'row-ai'}>
                        <td className="col-id">#{log.id}</td>
                        <td className="col-time">{log.time}</td>
                        <td>
                          <span className={`source-pill ${log.source === 'USER' ? 'source-pill--user' : 'source-pill--ai'}`}>
                            {log.source === 'USER' ? 'USER' : 'AI'}
                          </span>
                        </td>
                        <td className="col-vname">{log.vehicleId}</td>
                        <td><span className="class-tag">{log.vehicleClass}</span></td>
                        <td className="col-num">{log.weightTons} T</td>
                        <td className="col-num">{log.speedKmh} km/h</td>
                        <td className="col-approach">{log.approachName}</td>
                        <td className="col-stress">{log.pressureMpa} MPa</td>
                        <td className="col-res">{log.resistanceShiftPct}%</td>
                        <td className="col-volt">{log.signalVoltageMv} mV</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="telemetry-modal-footer">
              <span className="footer-status">
                <span className="status-dot" /> Sensor Network: 25 Intersections × 4 Approaches = 100 Piezoresistive Plates Online
              </span>
              <div className="footer-actions">
                <button className="modal-btn-download-secondary" onClick={handleDownloadCsv}>
                  📥 Export to CSV
                </button>
                <button className="modal-btn-close-secondary" onClick={() => setShowTelemetryModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
