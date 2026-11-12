import * as THREE from 'three';
import {
  setupLighting,
  setHeroLighting,
  setNormalLighting,
  setLightingPreset,
  type LightingMode,
} from './lighting';
import { CameraController } from './cameraController';
import { buildRoad } from '../components/Scene/RoadGeometry';
import { createTerrain } from '../components/Scene/Terrain';
import { createAllBuildings } from '../components/Scene/Buildings';
import { createAllTrees, createMedianPlanting } from '../components/Scene/Trees';
import { createAllVehicles, updateVehicles, type VehicleInstance } from '../components/Scene/Vehicles';
import { createAllStreetLights, createRoadSign } from '../components/Scene/StreetLights';
import { buildConstructionObjects } from '../components/Scene/ConstructionObjects';
import { applyTimeline, type AnimatedScene } from './constructionEngine';
import { demoScenario } from '../data/demoScenario';
import type { DemoPlanType } from '../data/planScenarios';
import { flyoverScenario } from '../data/planScenarios';
import {
  buildFlyover3D,
  buildRingRoad3D,
  buildCombined3D,
  type FlyoverSceneElements,
  type RingRoadSceneElements,
  type CombinedSceneElements,
} from '../components/Scene/PlanSceneBuilders';
import { buildSmartSignalJunction3D, type SmartSignalJunctionHandle } from '../components/Scene/SmartSignalJunction';
import { RealLocationManager } from './RealLocationManager';
import { AnalysisVisualizer } from '../components/Scene/AnalysisVisualizer';
import { ProposedInfrastructureManager } from './ProposedInfrastructureManager';
import { GeoCoordinateSystem } from './GeoCoordinateSystem';
import type { GeoAreaResponse, LayerVisibility, SceneMode, RoadSegmentGeo } from '../types/geo';
import type { CandidatePlan, PlanningViewState } from '../types/planning';
import type { InfrastructureStrategy } from '../types/optimization';
import type {
  AnalysisResultResponse,
  AnalysisFilterType,
  InfrastructureIssue,
  RoadAnalysisItem,
  JunctionAnalysisItem,
} from '../types/analysis';
import { TransformationManager } from './TransformationManager';
import type {
  TransformationState,
  ComparisonMode,
} from '../types/transformation';
import type { ForecastResponse } from '../types/forecasting';
import { RoutePathVisualizer } from '../components/Scene/RoutePathVisualizer';
import type { RealPlace } from '../data/cityPlaces';
import type { RouteCalculationResult } from './RealRouteEngine';


export class SceneManager {
  scene:    THREE.Scene;
  camera:   THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;

  private camCtrl:         CameraController;
  private animScene:       AnimatedScene | null = null;
  private vehicles:        VehicleInstance[] = [];
  private demoGroup:       THREE.Group = new THREE.Group();
  private realLocationMgr: RealLocationManager = new RealLocationManager();
  private analysisVis:     AnalysisVisualizer = new AnalysisVisualizer();
  private proposedMgr:     ProposedInfrastructureManager = new ProposedInfrastructureManager();
  public  routeVis:        RoutePathVisualizer = new RoutePathVisualizer();
  public  transformMgr!:   TransformationManager;
  private currentMode:     SceneMode = 'demo';

  private clock      = new THREE.Clock();
  private rafId      = 0;
  private _progress  = 0;
  private autoCam    = true;
  private userLighting: LightingMode | null = null;
  private lastHeroLightingState = false;

  private laneOffsets1 = [-1.75, 1.75];
  private laneOffsets4 = [-6.5, -3.0, 3.0, 6.5, -4.75, 4.75];

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private currentPlanType: DemoPlanType = 'four_lane';
  private flyoverElements: FlyoverSceneElements | null = null;
  private ringRoadElements: RingRoadSceneElements | null = null;
  private combinedElements: CombinedSceneElements | null = null;
  public smartSignalJunction: SmartSignalJunctionHandle | null = null;

  constructor(canvas: HTMLCanvasElement) {
    // ── Renderer ─────────────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0xf1f3f4, 1.0);

    // ── Scene ─────────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f3f4);

    // ── Camera ────────────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(
      55,
      canvas.clientWidth / canvas.clientHeight,
      1.0,
      15000
    );

    this.camCtrl = new CameraController(this.camera);
    this.camCtrl.attachDomElement(canvas);

    // ── Build everything ──────────────────────────────────────────────────────
    this.buildScene();

    // ── Resize ────────────────────────────────────────────────────────────────
    window.addEventListener('resize', this.onResize);
  }

  private buildScene() {
    // Base Environmental Lighting
    setupLighting(this.scene);

    // ── Demo Scenario Subtree (Strictly isolated to Demo Mode) ───────────────
    this.demoGroup.name = 'demo-infrastructure-group';
    this.scene.add(this.demoGroup);

    // Initial default demo: 4-lane Highway
    this.buildFourLaneDemoSubtree();

    // ── Phase 2 Real Location Root ───────────────────────────────────────────
    this.scene.add(this.realLocationMgr.rootGroup);

    // ── Phase 3 Analysis Visualizer Root ─────────────────────────────────────
    this.scene.add(this.analysisVis.rootGroup);

    // ── Phase 4 Proposed Infrastructure Root ──────────────────────────────────
    this.scene.add(this.proposedMgr.rootGroup);

    // ── Phase 8 Route Path & Places Visualizer Root ─────────────────────────
    this.scene.add(this.routeVis.rootGroup);

    // ── Phase 7 Transformation Manager Root ──────────────────────────────────
    this.transformMgr = new TransformationManager(this.scene, this.proposedMgr, this.camCtrl);
  }

  private buildFourLaneDemoSubtree() {
    const scenario = demoScenario;
    const roadLen = scenario.currentState.geometry.length;

    // Demo terrain
    this.demoGroup.add(createTerrain());

    // Existing 1-lane road
    const existingRoad = buildRoad(scenario.currentState.geometry);
    this.demoGroup.add(existingRoad);

    const sign1 = createRoadSign(new THREE.Vector3(-8, 0, -70), 'speed');
    const sign2 = createRoadSign(new THREE.Vector3( 8, 0,  60), 'info');
    existingRoad.add(sign1);
    existingRoad.add(sign2);

    // Future 4-lane geometry
    const futureConfig = scenario.proposedState.geometry;

    const roadBaseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(17, 0.22, roadLen),
      new THREE.MeshLambertMaterial({ color: 0x7a7a7a })
    );
    roadBaseMesh.position.y = 0.04;
    roadBaseMesh.visible = false;
    this.demoGroup.add(roadBaseMesh);

    const pavementMesh = buildRoad(futureConfig);
    pavementMesh.visible = false;
    this.demoGroup.add(pavementMesh);

    // Drainage
    const drainageLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.25, roadLen),
      new THREE.MeshLambertMaterial({ color: 0x6a6a7a })
    );
    drainageLeft.position.set(-10.5, -0.05, 0);
    drainageLeft.visible = false;
    this.demoGroup.add(drainageLeft);

    const drainageRight = drainageLeft.clone();
    drainageRight.position.x = 10.5;
    drainageRight.visible = false;
    this.demoGroup.add(drainageRight);

    // Median
    const medianGroup = new THREE.Group();
    const kerbMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.18, roadLen),
      new THREE.MeshLambertMaterial({ color: 0x808070 })
    );
    kerbMesh.position.y = 0.09;
    medianGroup.add(kerbMesh);
    const greenStrip = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.05, roadLen - 0.5),
      new THREE.MeshLambertMaterial({ color: 0x4a7a3a })
    );
    greenStrip.position.y = 0.20;
    medianGroup.add(greenStrip);
    const medianPlants = createMedianPlanting(roadLen);
    medianGroup.add(medianPlants);
    medianGroup.visible = false;
    this.demoGroup.add(medianGroup);

    // Markings
    const markingsGroup = buildRoad({ ...futureConfig, lanes: 4 });
    const markingsOnly = new THREE.Group();
    markingsGroup.children
      .filter((_, i) => i > 0)
      .forEach(c => markingsOnly.add(c.clone()));
    markingsOnly.visible = false;
    this.demoGroup.add(markingsOnly);

    // Shoulders
    const shoulderMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const shoulderLeft = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.10, roadLen), shoulderMat);
    shoulderLeft.position.set(-9.5, 0.05, 0);
    shoulderLeft.visible = false;
    this.demoGroup.add(shoulderLeft);

    const shoulderRight = shoulderLeft.clone();
    shoulderRight.position.x = 9.5;
    shoulderRight.visible = false;
    this.demoGroup.add(shoulderRight);

    // Sidewalks
    const swMat = new THREE.MeshLambertMaterial({ color: 0xb0a890 });
    const sidewalkLeft = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.15, roadLen), swMat);
    sidewalkLeft.position.set(-11.5, 0.075, 0);
    sidewalkLeft.visible = false;
    this.demoGroup.add(sidewalkLeft);

    const sidewalkRight = sidewalkLeft.clone();
    sidewalkRight.position.x = 11.5;
    sidewalkRight.visible = false;
    this.demoGroup.add(sidewalkRight);

    // Street lights (new)
    const streetLightsNew = createAllStreetLights(scenario.streetLights.filter(l => l.side === 'median'));
    streetLightsNew.visible = false;
    this.demoGroup.add(streetLightsNew);

    // Landscaping group
    const landscaping = new THREE.Group();
    [-90, -65, -40, -15, 10, 35, 60, 85].forEach(z => {
      const tGeo = new THREE.SphereGeometry(0.7, 6, 4);
      const tMat = new THREE.MeshLambertMaterial({ color: 0x3a7030 });
      const t = new THREE.Mesh(tGeo, tMat);
      t.position.set(0, 0.9, z);
      landscaping.add(t);

      const trunkGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.9, 5);
      const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(0, 0.45, z);
      landscaping.add(trunk);
    });
    landscaping.visible = false;
    this.demoGroup.add(landscaping);

    // Buildings & Trees
    this.demoGroup.add(createAllBuildings(scenario.buildings));
    this.demoGroup.add(createAllTrees(scenario.trees));

    const existingLights = createAllStreetLights(
      scenario.streetLights.filter(l => l.side === 'left')
    );
    this.demoGroup.add(existingLights);

    // Construction machinery
    const conObjs = buildConstructionObjects(roadLen);
    this.demoGroup.add(conObjs.conesGroup);
    this.demoGroup.add(conObjs.barriersGroup);
    this.demoGroup.add(conObjs.surveyGroup);
    this.demoGroup.add(conObjs.excavator);
    this.demoGroup.add(conObjs.dumpTruck);
    this.demoGroup.add(conObjs.roller);
    this.demoGroup.add(conObjs.mixer);
    this.demoGroup.add(conObjs.earthPileGroup);

    // Vehicles
    this.vehicles = createAllVehicles(scenario.vehicles);
    this.vehicles.forEach(v => this.demoGroup.add(v.group));

    // Animated scene wiring
    this.animScene = {
      existingRoad,
      surveyGroup:     conObjs.surveyGroup,
      conesGroup:      conObjs.conesGroup,
      barriersGroup:   conObjs.barriersGroup,
      excavator:       conObjs.excavator,
      dumpTruck:       conObjs.dumpTruck,
      earthPileGroup:  conObjs.earthPileGroup,
      roadBaseMesh,
      pavementMesh,
      drainageLeft,
      drainageRight,
      medianGroup,
      markingsGroup:   markingsOnly,
      streetLightsNew,
      sidewalkLeft,
      sidewalkRight,
      shoulderLeft,
      shoulderRight,
      roller:          conObjs.roller,
      mixer:           conObjs.mixer,
      landscaping,
      corridorGroup:   new THREE.Group(),
      roadLength:      roadLen,
    };

    applyTimeline(this.animScene, 0);
  }

  private buildFlyoverDemoSubtree() {
    const elements = buildFlyover3D();
    this.flyoverElements = elements;
    this.demoGroup.add(elements.group);
    this.vehicles = elements.vehicles;
    this.applyFlyoverTimeline(elements, this._progress);
  }

  private buildRingRoadDemoSubtree() {
    const elements = buildRingRoad3D();
    this.ringRoadElements = elements;
    this.demoGroup.add(elements.group);
    this.vehicles = elements.vehicles;
    this.applyRingRoadTimeline(elements, this._progress);
  }

  private buildCombinedDemoSubtree() {
    const elements = buildCombined3D();
    this.combinedElements = elements;
    this.demoGroup.add(elements.group);
    this.vehicles = elements.vehicles;
    this.applyCombinedTimeline(elements, this._progress);
  }

  public setDemoPlan(plan: DemoPlanType): void {
    if (this.currentPlanType === plan && this.demoGroup.children.length > 0) return;
    this.currentPlanType = plan;

    // Clear previous demo subtree
    while (this.demoGroup.children.length > 0) {
      const child = this.demoGroup.children[0];
      this.demoGroup.remove(child);
    }
    if (this.smartSignalJunction) {
      this.smartSignalJunction.dispose();
      this.smartSignalJunction = null;
    }
    this.vehicles = [];
    this.animScene = null;
    this.flyoverElements = null;
    this.ringRoadElements = null;
    this.combinedElements = null;

    if (plan === 'four_lane') {
      this.buildFourLaneDemoSubtree();
      this.camCtrl.flyTo(new THREE.Vector3(26, 16, -32), new THREE.Vector3(0, 1.2, 0), 1.6);
    } else if (plan === 'flyover') {
      this.buildFlyoverDemoSubtree();
      this.camCtrl.flyTo(new THREE.Vector3(32, 16, -26), new THREE.Vector3(0, 6.2, 0), 1.6);
    } else if (plan === 'ring_road') {
      this.buildRingRoadDemoSubtree();
      this.camCtrl.flyTo(new THREE.Vector3(70, 68, 85), new THREE.Vector3(0, 2, 0), 1.6);
    } else if (plan === 'combined') {
      this.buildCombinedDemoSubtree();
      this.camCtrl.flyTo(new THREE.Vector3(75, 55, -60), new THREE.Vector3(0, 3, 0), 1.8);
    } else if (plan === 'road_sensor') {
      const junction = this.buildRoadSensorDemoSubtree();
      this.autoCam = false;
      junction.focusCamera(this.camCtrl, 'overview');
    }

    this.setProgress(this._progress);
  }

  private buildRoadSensorDemoSubtree(): SmartSignalJunctionHandle {
    const junction = buildSmartSignalJunction3D();
    this.smartSignalJunction = junction;
    this.demoGroup.add(junction.group);
    return junction;
  }

  public getDemoPlan(): DemoPlanType {
    return this.currentPlanType;
  }

  public focusRoadSensorCamera(preset: 'overview' | 'sensor_cutaway' | 'control_unit' | 'north_queue'): void {
    if (this.smartSignalJunction) {
      this.smartSignalJunction.focusCamera(this.camCtrl, preset);
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  setMode(mode: SceneMode): void {
    this.currentMode = mode;
    if (mode === 'demo') {
      this.demoGroup.visible = true;
      this.realLocationMgr.setVisible(false);
      this.analysisVis.setVisible(false);
      this.proposedMgr.setViewState('existing');
      if (this.currentPlanType === 'flyover') {
        this.camCtrl.flyTo(new THREE.Vector3(32, 16, -26), new THREE.Vector3(0, 6.2, 0), 1.8);
      } else if (this.currentPlanType === 'ring_road') {
        this.camCtrl.flyTo(new THREE.Vector3(70, 68, 85), new THREE.Vector3(0, 2, 0), 1.8);
      } else if (this.currentPlanType === 'combined') {
        this.camCtrl.flyTo(new THREE.Vector3(75, 55, -60), new THREE.Vector3(0, 3, 0), 1.8);
      } else {
        this.camCtrl.flyTo(new THREE.Vector3(26, 16, -32), new THREE.Vector3(0, 1.2, 0), 1.8);
      }
    } else {
      this.demoGroup.visible = false;
      this.realLocationMgr.setVisible(true);
      this.analysisVis.setVisible(true);

      const b = this.realLocationMgr.getBounds();
      if (b) {
        this.camCtrl.set3DView(b, 2.0);
      } else {
        this.camCtrl.flyTo(new THREE.Vector3(0, 220, 180), new THREE.Vector3(0, 0, 0), 2.2);
      }
    }
  }

  getMode(): SceneMode {
    return this.currentMode;
  }

  loadRealLocation(data: GeoAreaResponse): void {
    this.realLocationMgr.buildAreaScene(data);
    this.analysisVis.clear();
    this.proposedMgr.clear();
    if (this.realLocationMgr.coordSystem) {
      this.transformMgr.setCoordSystem(this.realLocationMgr.coordSystem);
      if (this.realLocationMgr.roadNetMgr) {
        this.transformMgr.setRoadNetworkManager(this.realLocationMgr.roadNetMgr);
      }
    }
    this.setMode('real_location');

    const b = this.realLocationMgr.getBounds();
    if (b) {
      this.camCtrl.set3DView(b, 2.0);
    }
  }

  setRealLayers(layers: LayerVisibility): void {
    this.realLocationMgr.setLayerVisibility(layers);
  }

  setAnalysisData(data: AnalysisResultResponse): void {
    const [centerLat, centerLon] = data.center;
    const coordSystem =
      this.realLocationMgr.coordSystem ||
      new GeoCoordinateSystem({ latitude: centerLat, longitude: centerLon });

    this.analysisVis.buildVisuals(data, coordSystem);
    this.analysisVis.setVisible(this.currentMode === 'real_location');
  }

  setAnalysisFilter(filter: AnalysisFilterType): void {
    this.analysisVis.applyFilter(filter);
  }

  // ── Whole-City Camera Views & GIS Navigation ───────────────────────────────
  fitWholeArea(): void {
    const b = this.realLocationMgr.getBounds();
    if (b) {
      this.camCtrl.fitWholeArea(b, 1.8);
    }
  }

  setTopDownView(): void {
    const b = this.realLocationMgr.getBounds();
    this.camCtrl.setTopDownView(b, 1.6);
  }

  set3DView(): void {
    const b = this.realLocationMgr.getBounds();
    this.camCtrl.set3DView(b, 1.6);
  }

  setCinematicView(): void {
    const b = this.realLocationMgr.getBounds();
    this.camCtrl.setCinematicView(b, 2.0);
  }

  setStreetView(): void {
    const b = this.realLocationMgr.getBounds();
    const cX = b ? b.centerX : 0;
    const cZ = b ? b.centerZ : 0;
    this.camCtrl.flyTo(
      new THREE.Vector3(cX, 28, cZ + 75),
      new THREE.Vector3(cX, 6, cZ),
      1.6
    );
  }

  zoom(direction: 'in' | 'out'): void {
    this.camCtrl.zoom(direction);
  }

  resetNorth(): void {
    this.camCtrl.resetNorth();
  }

  highlightRoad(roadId: string | null): void {
    this.realLocationMgr.highlightRoad(roadId);
  }

  // ── Phase 4: Proposed Infrastructure Controls ──────────────────────────────
  setCandidatePlan(plan: CandidatePlan | null): void {
    if (!plan || !this.realLocationMgr.coordSystem) {
      this.proposedMgr.clear();
      this.realLocationMgr.highlightRoad(null);
      return;
    }
    const bounds = this.proposedMgr.buildProposedScene(plan, this.realLocationMgr.coordSystem);
    if (plan.sourceRoadIds && plan.sourceRoadIds.length > 0) {
      this.realLocationMgr.highlightRoad(plan.sourceRoadIds[0]);
    }
    if (bounds) {
      this.camCtrl.fitToBounds(bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ, 1.8);
    }
  }

  setPlanningViewState(state: PlanningViewState): void {
    this.proposedMgr.setViewState(state);
    const s = state.toLowerCase();
    if (s === 'compare' || s === 'proposed' || s === 'strategy') {
      this.realLocationMgr.setVisible(true);
      this.analysisVis.setVisible(false);
    } else {
      this.realLocationMgr.setVisible(true);
      this.analysisVis.setVisible(true);
    }
  }

  // ── Phase 6: Strategy Infrastructure Controls ──────────────────────────────
  setStrategy(strategy: InfrastructureStrategy | null): void {
    if (!strategy || !this.realLocationMgr.coordSystem) {
      this.proposedMgr.clear();
      this.realLocationMgr.highlightRoad(null);
      return;
    }
    const bounds = this.proposedMgr.buildStrategyScene(
      strategy.combined_geometries || [],
      this.realLocationMgr.coordSystem
    );
    if (strategy.affected_road_ids && strategy.affected_road_ids.length > 0) {
      this.realLocationMgr.highlightRoad(strategy.affected_road_ids[0]);
    }
    if (bounds) {
      this.camCtrl.fitToBounds(bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ, 1.8);
    }
  }

  // ── Phase 7: Transformation Engine Controls ────────────────────────────────
  setTransformationContext(
    strategy: InfrastructureStrategy | null,
    plan: CandidatePlan | null,
    analysis: AnalysisResultResponse | null,
    forecast: ForecastResponse | null
  ): void {
    if (this.realLocationMgr.coordSystem) {
      this.transformMgr.setCoordSystem(this.realLocationMgr.coordSystem);
      if (this.realLocationMgr.roadNetMgr) {
        this.transformMgr.setRoadNetworkManager(this.realLocationMgr.roadNetMgr);
      }
      this.transformMgr.setContext(strategy, plan, analysis, forecast, this.realLocationMgr.coordSystem);
    }
  }

  setTransformationState(state: TransformationState): void {
    this.transformMgr.setTransformationState(state);
  }

  setTransformationProgress(p: number): void {
    this.transformMgr.setConstructionProgress(p);
  }

  setTransformationComparison(mode: ComparisonMode): void {
    this.transformMgr.setComparisonMode(mode);
  }

  setTransformationHorizon(year: number): void {
    this.transformMgr.setFutureHorizon(year);
  }

  setTransformationSpeed(speed: number): void {
    this.transformMgr.setSpeed(speed);
  }

  playTransformation(): void {
    this.transformMgr.play();
  }

  pauseTransformation(): void {
    this.transformMgr.pause();
  }

  resetTransformation(): void {
    this.transformMgr.reset();
  }

  stepTransformationForward(): void {
    this.transformMgr.stepForward();
  }

  stepTransformationBackward(): void {
    this.transformMgr.stepBackward();
  }

  focusTransformationCamera(preset: 'whole_city' | 'corridor' | 'intervention' | 'street' | 'cinematic'): void {
    switch (preset) {
      case 'whole_city': {
        const b = this.realLocationMgr.getBounds();
        this.transformMgr.focusWholeCity(b);
        break;
      }
      case 'corridor':
        this.transformMgr.focusCorridor();
        break;
      case 'intervention':
        this.transformMgr.focusIntervention();
        break;
      case 'street':
        this.transformMgr.focusStreetLevel();
        break;
      case 'cinematic':
        this.transformMgr.focusCinematic();
        break;
    }
  }

  // ── Smooth Cinematic Camera Focus on Infrastructure Elements ──────────────
  focusOnCoordinates(
    lat: number,
    lon: number,
    viewType: 'road' | 'junction' | 'bottleneck' | 'spine' | 'zone' = 'road'
  ): void {
    if (!this.realLocationMgr.coordSystem) return;
    const worldPos = this.realLocationMgr.coordSystem.geoToWorld(lat, lon, 0);
    this.camCtrl.focusElement(worldPos, viewType, 1.6);
  }

  // ── Route & Major Traffic Circle Planning ──────────────────────────────────
  setRoutePlaces(places: RealPlace[], fromId: string | null = null, toId: string | null = null): void {
    if (!this.realLocationMgr.coordSystem) return;
    this.routeVis.renderPlaces(places, this.realLocationMgr.coordSystem, fromId, toId);
  }

  setActiveRoute(route: RouteCalculationResult | null): void {
    if (route) {
      this.routeVis.renderRoute(route);
    } else {
      this.routeVis.clearRoute();
    }
  }

  focusActiveRoute(): void {
    const bounds = this.routeVis.getRouteBounds();
    if (!bounds) return;
    this.camCtrl.fitToBounds(bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ, 1.8);
  }

  // ── Raycasting Interactivity ────────────────────────────────────────────────
  handleCanvasClick(
    clientX: number,
    clientY: number
  ): {
    place?: RealPlace;
    issue?: InfrastructureIssue;
    road?: RoadAnalysisItem | RoadSegmentGeo;
    junction?: JunctionAnalysisItem;
  } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 0. Raycast against route places / location pins first
    const placeObjects = this.routeVis.getInteractivePlaceObjects();
    if (placeObjects.length > 0) {
      const placeIntersects = this.raycaster.intersectObjects(placeObjects, true);
      if (placeIntersects.length > 0) {
        let target: THREE.Object3D | null = placeIntersects[0].object;
        while (target && !target.userData?.place && target.parent) {
          target = target.parent;
        }
        if (target?.userData?.place) {
          return { place: target.userData.place as RealPlace };
        }
      }
    }

    // 1. Raycast against analysis interactive objects first (if analysis mode is active)
    if (this.analysisVis.interactiveObjects.length > 0) {
      const intersects = this.raycaster.intersectObjects(this.analysisVis.interactiveObjects, true);

      if (intersects.length > 0) {
        let target: THREE.Object3D | null = intersects[0].object;
        while (target && !target.userData?.type && target.parent) {
          target = target.parent;
        }
        if (target?.userData?.type === 'issue') {
          const issue = target.userData.issueData as InfrastructureIssue;
          if (issue.roadSegmentId) this.realLocationMgr.highlightRoad(issue.roadSegmentId);
          return { issue };
        }
        if (target?.userData?.type === 'road') {
          const road = target.userData.roadData as RoadAnalysisItem;
          this.realLocationMgr.highlightRoad(road.roadId);
          return { road };
        }
        if (target?.userData?.type === 'junction') {
          return { junction: target.userData.junctionData };
        }
      }
    }

    // 2. Fallback: Raycast against base real road network (allows inspecting any road in the whole city)
    if (this.realLocationMgr.rootGroup.visible) {
      const baseIntersects = this.raycaster.intersectObjects(this.realLocationMgr.rootGroup.children, true);
      for (const hit of baseIntersects) {
        let t: THREE.Object3D | null = hit.object;
        while (t && !t.userData?.type && t.parent) {
          t = t.parent;
        }
        if (t?.userData?.type === 'real_road') {
          const road = t.userData.road as RoadSegmentGeo;
          this.realLocationMgr.highlightRoad(road.id);
          return { road };
        }
      }
    }

    // Clicked empty ground - clear road selection highlight
    this.realLocationMgr.highlightRoad(null);
    return null;
  }

  private applyFlyoverTimeline(elem: FlyoverSceneElements, p: number) {
    elem.surfaceRoads.visible = true;
    if (elem.serviceRoads) {
      elem.serviceRoads.visible = true;
    }

    // When completed (p >= 0.88 or finished), the whole flyover is 100% complete with no temporary equipment
    const isCompleted = p >= 0.88;

    // Construction equipment progression
    if (elem.rebarCagesGroup) {
      elem.rebarCagesGroup.visible = p >= 0.12 && p < 0.40;
    }
    if (elem.pilingRigGroup) {
      elem.pilingRigGroup.visible = p >= 0.10 && p < 0.38;
    }
    if (elem.craneGroup) {
      elem.craneGroup.visible = p >= 0.32 && p < 0.72;
    }
    if (elem.constructionGroup) {
      elem.constructionGroup.visible = p >= 0.10 && p < 0.88;
    }

    // Permanent Flyover Viaduct Superstructure
    elem.piersGroup.visible = p >= 0.25 || isCompleted;
    elem.elevatedDeck.visible = p >= 0.42 || isCompleted;
    elem.approachRampSouth.visible = p >= 0.48 || isCompleted;
    elem.approachRampNorth.visible = p >= 0.48 || isCompleted;
    elem.barriersGroup.visible = p >= 0.65 || isCompleted;
    elem.medianGroup.visible = p >= 0.65 || isCompleted;
    elem.markingsGroup.visible = p >= 0.75 || isCompleted;
    elem.elevatedLights.visible = p >= 0.82 || isCompleted;
    if (elem.overheadGantry) {
      elem.overheadGantry.visible = p >= 0.82 || isCompleted;
    }
  }

  private applyRingRoadTimeline(elem: RingRoadSceneElements, p: number) {
    elem.buildings.visible = true;
    elem.radialRoads.visible = true;
    elem.roundabouts.visible = p >= 0.18;
    elem.orbitalRingPavement.visible = p >= 0.38;
    elem.orbitalMedian.visible = p >= 0.58;
    elem.orbitalBarriers.visible = p >= 0.68;
    elem.lights.visible = p >= 0.80;
    if (elem.overheadGantry) {
      elem.overheadGantry.visible = p >= 0.80;
    }
  }

  private applyCombinedTimeline(elem: CombinedSceneElements, p: number) {
    elem.ground4Lane.visible = true;
    elem.buildings.visible = true;
    elem.trees.visible = true;
    const isFinished = p >= 0.85;

    elem.interchangeConnectors.visible = p >= 0.22 || isFinished;
    elem.ringRoadExpressway.visible = p >= 0.38 || isFinished;
    elem.flyoverViaduct.visible = p >= 0.45 || isFinished;
    elem.lights.visible = p >= 0.78 || isFinished;
    elem.overheadGantries.visible = p >= 0.78 || isFinished;
  }

  private updateFlyoverVehicles(delta: number) {
    // ── Road geometry constants (must match PlanSceneBuilders.ts exactly) ────────
    const DECK_Y          = 7.0;   // viaduct slab top (y of bottom of asphalt)
    const DECK_SURFACE_Y  = 7.42;  // vehicle wheel contact on deck (DECK_Y + 0.42)
    const GROUND_SURFACE_Y = 0.16; // vehicle wheel contact at grade
    const RAMP_START      = 45.0;  // |z| where ramp meets deck (DECK_HALF)
    const RAMP_END        = 100.0; // |z| where ramp meets ground (DECK_HALF + RAMP_LEN)
    const RAMP_LEN        = RAMP_END - RAMP_START; // 55 m
    const RAMP_SLOPE      = (DECK_SURFACE_Y - GROUND_SURFACE_Y) / RAMP_LEN;
    const RAMP_PITCH      = Math.atan(RAMP_SLOPE);
    const WRAP_LEN        = 130;   // half-corridor wrap length

    // ── Elevated viaduct lane limits ─────────────────────────────────────────────
    // Deck is 15 m wide. Median barrier at x=0 (w=0.70m). Parapet at x=±7.5m (w=0.50m).
    // 2 lanes each side.  Lane centres at ±2.0 m (inner) and ±5.5 m (outer).
    // Hard limits: outer edge of outer lane is 7.0m from centre; inner edge of inner lane is 1.0m.
    const DECK_LANE_X: number[] = [-5.5, -2.0, 2.0, 5.5];
    const DECK_X_MIN  = -7.0;   // outer parapet inner edge
    const DECK_X_MAX  =  7.0;
    const DECK_MEDIAN_HALF = 0.65; // half-width of median barrier – inner boundary

    // ── Ground N-S surface road lane limits ──────────────────────────────────────
    // ROAD_W = 16 m. 2 lanes each direction (separated by double yellow at ±0.15 m).
    // Lane dashes at x = ±4.0 m.  Lane centres approx: inbound = -6.0, -2.5, outbound = 2.5, 6.0.
    // Keep vehicles well inside the curb (x ≤ ±7.8) and off the median (|x| > 1.5).
    const GND_LANE_X: number[] = [-6.0, -2.5, 2.5, 6.0]; // laneIndex mapped 0-3

    // ── Ground E-W cross traffic lane limits ─────────────────────────────────────
    // Cross road is also ROAD_W=16m but oriented along X axis.
    // Vehicles travel along X; their Z position is the lane offset.
    // Set z=±3.8 (clear of pier collars and central junction markings).
    const CROSS_LANE_Z: number[] = [-3.8, 3.8]; // for laneIndex 4,5

    // ── Intelligent car-following headway ────────────────────────────────────────
    const SAFE_HEADWAY = 20.0;
    const MIN_HEADWAY  = 8.0;

    const expressVehicles = this.vehicles.filter(v => v.config.laneIndex < 4);
    const crossVehicles   = this.vehicles.filter(v => v.config.laneIndex === 4 || v.config.laneIndex === 5);
    const serviceVehicles = this.vehicles.filter(v => v.config.laneIndex >= 6);

    // ── 1. Elevated viaduct express traffic ──────────────────────────────────────
    expressVehicles.forEach(v => {
      const visible = this._progress < 0.18 || this._progress >= 0.82;
      v.group.visible = visible;
      if (!visible) return;

      const dir  = v.config.direction;
      const lane = Math.min(v.config.laneIndex, 3);

      // Car-following: find nearest vehicle ahead on same lane & direction
      let closestDist = Infinity;
      let leadSpeed   = v.config.speed;
      expressVehicles.forEach(other => {
        if (other.config.id === v.config.id) return;
        if (other.config.direction !== dir || Math.min(other.config.laneIndex, 3) !== lane) return;
        let distAhead = (other.currentZ - v.currentZ) * dir;
        if (distAhead < 0) distAhead += 2 * WRAP_LEN;
        if (distAhead > 0.5 && distAhead < closestDist) {
          closestDist = distAhead;
          leadSpeed   = other.currentSpeed;
        }
      });

      let targetSpeed = v.config.speed;
      let braking     = false;
      if (closestDist < SAFE_HEADWAY) {
        braking = true;
        if (closestDist <= MIN_HEADWAY) {
          targetSpeed = 0.02;
        } else {
          const t = (closestDist - MIN_HEADWAY) / (SAFE_HEADWAY - MIN_HEADWAY);
          targetSpeed = leadSpeed * 0.7 + (v.config.speed - leadSpeed * 0.7) * t;
        }
      }
      v.currentSpeed += (targetSpeed - v.currentSpeed) * Math.min(1.0, delta * 4.0);
      v.isBraking = braking;

      // Advance Z; wrap at corridor ends
      v.currentZ += dir * v.currentSpeed * delta * 60;
      if (v.currentZ >  WRAP_LEN) v.currentZ = -WRAP_LEN;
      if (v.currentZ < -WRAP_LEN) v.currentZ =  WRAP_LEN;

      const z = v.currentZ;

      // ── Y elevation follows ramp profile exactly ──────────────────────────────
      let y     = GROUND_SURFACE_Y;
      let pitch = 0;
      if (z >= -RAMP_START && z <= RAMP_START) {
        // On elevated deck – snap to deck surface
        y = DECK_SURFACE_Y;
        pitch = 0;
      } else if (z > -RAMP_END && z < -RAMP_START) {
        // South ramp (ascending for dir=+1)
        const t = (z - (-RAMP_END)) / RAMP_LEN;         // 0 at ground end, 1 at deck end
        y       = GROUND_SURFACE_Y + t * (DECK_SURFACE_Y - GROUND_SURFACE_Y);
        pitch   = dir === 1 ? -RAMP_PITCH : RAMP_PITCH;
      } else if (z > RAMP_START && z < RAMP_END) {
        // North ramp (descending for dir=+1)
        const t = (z - RAMP_START) / RAMP_LEN;           // 0 at deck end, 1 at ground end
        y       = DECK_SURFACE_Y - t * (DECK_SURFACE_Y - GROUND_SURFACE_Y);
        pitch   = dir === 1 ? RAMP_PITCH : -RAMP_PITCH;
      } else {
        // Ground approach sections – snap to grade
        y = GROUND_SURFACE_Y;
        pitch = 0;
      }

      // ── X: hard clamp to lane centre ──────────────────────────────────────────
      // Determine which side of median the lane belongs to and enforce boundary.
      let laneX = DECK_LANE_X[lane];
      // Extra safety: clamp strictly inside deck edges and outside median barrier
      if (laneX < 0) {
        laneX = Math.max(DECK_X_MIN + 0.5, Math.min(-DECK_MEDIAN_HALF - 1.0, laneX));
      } else {
        laneX = Math.min(DECK_X_MAX - 0.5, Math.max(DECK_MEDIAN_HALF + 1.0, laneX));
      }

      v.group.position.set(laneX, y, z);
      v.group.rotation.set(pitch + (braking ? -0.015 : 0), dir === 1 ? 0 : Math.PI, 0);
    });

    // ── 2. Ground E-W cross-road traffic ─────────────────────────────────────────
    // These vehicles travel along the X axis under the viaduct.
    // Pierless zone under the deck (z=0 crossroad is fully open in updated geometry).
    crossVehicles.forEach(v => {
      const visible = this._progress < 0.18 || this._progress >= 0.82;
      v.group.visible = visible;
      if (!visible) return;

      const dir   = v.config.direction;
      const speed = v.config.speed * delta * 52;

      // Position X — advance along X axis, wrap at corridor edges
      let curX = v.group.position.x + dir * speed;
      if (curX >  85) curX = -85;
      if (curX < -85) curX =  85;

      // Z lane position — stay in assigned lane strip, never crossing the centre line
      const laneIdx = v.config.laneIndex - 4; // 0 or 1
      const crossZ  = CROSS_LANE_Z[Math.min(laneIdx, 1)];

      // Y — always ground surface (crossroad is at grade)
      v.group.position.set(curX, GROUND_SURFACE_Y, crossZ);
      v.group.rotation.set(0, dir === 1 ? Math.PI / 2 : -Math.PI / 2, 0);
    });

    // ── 3. Dedicated Service Road Traffic ────────────────────────────────────────
    // Cruises along flanking service roads at grade (x = ±11.15, y = 0.16)
    // Completely separated from flyover structure, ramps, and central piers.
    serviceVehicles.forEach(v => {
      const visible = this._progress < 0.18 || this._progress >= 0.82;
      v.group.visible = visible;
      if (!visible) return;

      const dir = v.config.direction;
      v.currentZ += dir * v.config.speed * delta * 52;
      if (v.currentZ >  WRAP_LEN) v.currentZ = -WRAP_LEN;
      if (v.currentZ < -WRAP_LEN) v.currentZ =  WRAP_LEN;

      // West service road for lane 6 (x = -11.15) | East service road for lane 7 (x = 11.15)
      const serviceX = v.config.laneIndex === 6 ? -11.15 : 11.15;
      v.group.position.set(serviceX, GROUND_SURFACE_Y, v.currentZ);
      v.group.rotation.set(0, dir === 1 ? 0 : Math.PI, 0);
    });
  }

  private updateRingRoadVehicles(delta: number) {
    const RING_LANE_RADII = [82.25, 78.50, 71.50, 67.75];
    const ROAD_SURFACE_Y = 0.14;

    const orbitalVehicles = this.vehicles.filter(v => v.config.laneIndex < 4);
    const feederVehicles  = this.vehicles.filter(v => v.config.laneIndex >= 4);

    // 1. Orbital Expressway Concentric Flow with Angular Headway Avoidance
    orbitalVehicles.forEach((v, idx) => {
      const visible = this._progress < 0.18 || this._progress >= 0.82;
      v.group.visible = visible;
      if (!visible) return;

      const anyV = v as unknown as { currentAngle?: number };
      const laneR = RING_LANE_RADII[Math.min(v.config.laneIndex, 3)];
      const dir = v.config.direction;

      if (anyV.currentAngle === undefined) {
        anyV.currentAngle = (idx / orbitalVehicles.length) * Math.PI * 2;
      }

      // Check angular headway to lead vehicle on same circular lane
      let minAngleGap = Infinity;
      let leadSpeed = v.config.speed;

      orbitalVehicles.forEach(other => {
        if (other.config.id === v.config.id) return;
        if (other.config.laneIndex !== v.config.laneIndex || other.config.direction !== dir) return;
        const otherAny = other as unknown as { currentAngle?: number };
        if (otherAny.currentAngle === undefined) return;

        let aGap = (otherAny.currentAngle - anyV.currentAngle!) * dir;
        if (aGap < 0) aGap += Math.PI * 2;

        if (aGap > 0.05 && aGap < minAngleGap) {
          minAngleGap = aGap;
          leadSpeed = other.currentSpeed;
        }
      });

      const arcDist = minAngleGap * laneR;
      let targetSpeed = v.config.speed;
      if (arcDist < 20.0) {
        if (arcDist <= 8.0) {
          targetSpeed = 0.02; // Stop behind lead
        } else {
          targetSpeed = Math.min(v.config.speed, leadSpeed * 0.85);
        }
      }

      v.currentSpeed += (targetSpeed - v.currentSpeed) * Math.min(1.0, delta * 3.5);
      const angularSpeed = (v.currentSpeed * delta * 28) / laneR;

      anyV.currentAngle += dir * angularSpeed;
      if (anyV.currentAngle > Math.PI * 2) anyV.currentAngle -= Math.PI * 2;
      if (anyV.currentAngle < 0)           anyV.currentAngle += Math.PI * 2;

      const a = anyV.currentAngle;
      const x = Math.cos(a) * laneR;
      const z = Math.sin(a) * laneR;

      v.group.position.set(x, ROAD_SURFACE_Y, z);
      const heading = dir === 1 ? -a : -a + Math.PI;
      v.group.rotation.set(0, heading, 0);
    });

    // 2. Feeder Avenue Traffic Joining the Outer Roundabout
    feederVehicles.forEach(v => {
      const visible = this._progress < 0.18 || this._progress >= 0.82;
      v.group.visible = visible;
      if (!visible) return;

      const anyV = v as unknown as { radialDist?: number };
      anyV.radialDist = (anyV.radialDist || 18) + v.config.speed * delta * 38;
      if (anyV.radialDist > 56) anyV.radialDist = 18;
      v.group.position.set(anyV.radialDist, ROAD_SURFACE_Y, 0);
      v.group.rotation.set(0, Math.PI / 2, 0);
    });
  }

  private updateCombinedVehicles(delta: number) {
    // ── Road geometry constants (mirror PlanSceneBuilders combined scene) ─────────
    const DECK_SURFACE_Y   = 7.42;
    const GROUND_SURFACE_Y = 0.16;
    const RAMP_START       = 45.0;    // Elevated deck from -45 to +45m (original flyover size)
    const RAMP_END         = 100.0;   // Ramps touch down between 45m and 100m from centre
    const RAMP_LEN         = RAMP_END - RAMP_START;
    const RAMP_SLOPE       = (DECK_SURFACE_Y - GROUND_SURFACE_Y) / RAMP_LEN;
    const RAMP_PITCH       = Math.atan(RAMP_SLOPE);
    const HALF_CORR_LEN    = 130.0;   // Vehicle corridor half-length matches CORR_LEN=260

    // Deck lane X (central pier at x=0, r=1.0m; inner lane ±2.0m, outer ±5.5m)
    const DECK_LANE_X: number[] = [-5.5, -2.0, 2.0, 5.5];
    const DECK_X_ABS_MAX   = 7.0;
    const DECK_MED_HALF    = 0.65;

    // Ground 4-lane corridor (ROAD_W=16m, median curb ±1.35m, outer curb ±7.9m)
    // Lane centres: (-6.0, -3.2) northbound | (3.2, 6.0) southbound
    const GND_LANE_X: number[] = [-6.0, -3.2, 3.2, 6.0];
    const GND_X_MAX  = 7.5;    // hard boundary (inside curb)
    const GND_MED_X  = 1.4;    // half-width of median – don't go closer than this

    // Ring road (RING_R=108m in combined builder — crosses z-axis at ±108m, past ramp end at ±100m)
    const RING_R        = 108.0;
    const RING_OFFSETS: number[] = [-4.5, -1.5, 1.5, 4.5];
    const RING_LANE_MAX = RING_R + 5.5;  // outer edge of outer lane
    const RING_LANE_MIN = RING_R - 5.5;  // inner edge of inner lane

    const visible = this._progress < 0.18 || this._progress >= 0.82;

    this.vehicles.forEach((v, idx) => {
      v.group.visible = visible;
      if (!visible) return;

      const anyV = v as unknown as { currentAngle?: number; currentZ?: number };
      const lane = v.config.laneIndex;
      const dir  = v.config.direction;

      if (lane < 4) {
        // ── TIER 1: Elevated Flyover Express Vehicles (Lanes 0-3) ─────────────
        if (anyV.currentZ === undefined) {
          anyV.currentZ = (idx * 50) % (2 * HALF_CORR_LEN) - HALF_CORR_LEN;
        }
        anyV.currentZ += dir * v.config.speed * delta * 60;
        if (anyV.currentZ >  HALF_CORR_LEN) anyV.currentZ = -HALF_CORR_LEN;
        if (anyV.currentZ < -HALF_CORR_LEN) anyV.currentZ =  HALF_CORR_LEN;

        const z = anyV.currentZ;
        let y = GROUND_SURFACE_Y, pitch = 0;
        if (z >= -RAMP_START && z <= RAMP_START) {
          y = DECK_SURFACE_Y; pitch = 0;
        } else if (z > -RAMP_END && z < -RAMP_START) {
          const t = (z - (-RAMP_END)) / RAMP_LEN;
          y     = GROUND_SURFACE_Y + t * (DECK_SURFACE_Y - GROUND_SURFACE_Y);
          pitch = dir === 1 ? -RAMP_PITCH : RAMP_PITCH;
        } else if (z > RAMP_START && z < RAMP_END) {
          const t = (z - RAMP_START) / RAMP_LEN;
          y     = DECK_SURFACE_Y - t * (DECK_SURFACE_Y - GROUND_SURFACE_Y);
          pitch = dir === 1 ? RAMP_PITCH : -RAMP_PITCH;
        } else {
          y = GROUND_SURFACE_Y; pitch = 0;
        }

        // Hard-clamp X to lane centre, away from median and parapet
        let lx = DECK_LANE_X[lane];
        if (lx < 0) lx = Math.max(-(DECK_X_ABS_MAX - 0.5), Math.min(-(DECK_MED_HALF + 1.0), lx));
        else         lx = Math.min(  DECK_X_ABS_MAX - 0.5,  Math.max(  DECK_MED_HALF + 1.0,  lx));

        v.group.position.set(lx, y, z);
        v.group.rotation.set(pitch, dir === 1 ? 0 : Math.PI, 0);

      } else if (lane < 8) {
        // ── TIER 2: Ground Flanking Service Road Vehicles (Lanes 4-7) ─────────────
        // Ground traffic routes along the outer frontage lanes (x = ±11.2, ±9.5)
        // so vehicles cruise smoothly at grade without clipping into flyover ramps (x in [-7.5, 7.5]).
        if (anyV.currentZ === undefined) {
          anyV.currentZ = (idx * 45) % (2 * HALF_CORR_LEN) - HALF_CORR_LEN;
        }
        anyV.currentZ += dir * v.config.speed * delta * 52;
        if (anyV.currentZ >  HALF_CORR_LEN) anyV.currentZ = -HALF_CORR_LEN;
        if (anyV.currentZ < -HALF_CORR_LEN) anyV.currentZ =  HALF_CORR_LEN;

        const GND_SERVICE_LANES = [-11.2, -9.5, 9.5, 11.2];
        const gx = GND_SERVICE_LANES[lane - 4];

        v.group.position.set(gx, GROUND_SURFACE_Y, anyV.currentZ);
        v.group.rotation.set(0, dir === 1 ? 0 : Math.PI, 0);

      } else {
        // ── TIER 3: Outer Orbital Ring Road Bypass (Lanes 8-11) ───────────────
        if (anyV.currentAngle === undefined) {
          anyV.currentAngle = ((idx - 8) / 4) * Math.PI * 2;
        }
        const laneR = RING_R + RING_OFFSETS[Math.min(lane - 8, 3)];
        // Clamp radius inside the lane band so vehicles never leave the paved ring
        const clampedR = Math.max(RING_LANE_MIN, Math.min(RING_LANE_MAX, laneR));
        const angularSpeed = (v.config.speed * delta * 26) / clampedR;

        anyV.currentAngle += dir * angularSpeed;
        if (anyV.currentAngle >  Math.PI * 2) anyV.currentAngle -= Math.PI * 2;
        if (anyV.currentAngle < 0)             anyV.currentAngle += Math.PI * 2;

        const a  = anyV.currentAngle;
        const rx = Math.cos(a) * clampedR;
        const rz = Math.sin(a) * clampedR;

        v.group.position.set(rx, GROUND_SURFACE_Y, rz);
        v.group.rotation.set(0, dir === 1 ? -a : -a + Math.PI, 0);
      }
    });
  }

  setProgress(p: number) {
    this._progress = Math.max(0, Math.min(1, p));
    if (this.currentMode === 'demo') {
      if (this.currentPlanType === 'four_lane' && this.animScene) {
        applyTimeline(this.animScene, this._progress);
      } else if (this.currentPlanType === 'flyover' && this.flyoverElements) {
        this.applyFlyoverTimeline(this.flyoverElements, this._progress);
      } else if (this.currentPlanType === 'ring_road' && this.ringRoadElements) {
        this.applyRingRoadTimeline(this.ringRoadElements, this._progress);
      } else if (this.currentPlanType === 'combined' && this.combinedElements) {
        this.applyCombinedTimeline(this.combinedElements, this._progress);
      }
    }
    if (!this.userLighting) {
      const isHero = this._progress >= 0.95 && this.currentMode === 'demo';
      if (isHero !== this.lastHeroLightingState) {
        this.lastHeroLightingState = isHero;
        if (isHero) {
          setHeroLighting(this.scene);
        } else {
          setNormalLighting(this.scene);
        }
      }
    }
  }

  get progress() { return this._progress; }

  setAutoCam(value: boolean) { this.autoCam = value; }
  setCameraMode(mode: Parameters<CameraController['setMode']>[0]) {
    this.autoCam = false;
    this.camCtrl.setMode(mode);
  }

  setLightingMode(mode: LightingMode) {
    this.userLighting = mode;
    setLightingPreset(this.scene, mode);
  }

  // ── Render loop ─────────────────────────────────────────────────────────────

  startLoop(onFrame?: (p: number) => void) {
    const loop = () => {
      this.rafId = requestAnimationFrame(loop);
      const delta = this.clock.getDelta();
      const time = this.clock.getElapsedTime();

      if (this.autoCam && this.currentMode === 'demo') {
        this.camCtrl.driveFromProgress(this._progress);
      }
      this.camCtrl.update(delta);

      // Animate 3D issue beacons and multi-agent traffic in real location mode
      if (this.currentMode === 'real_location') {
        this.analysisVis.updateAnimation(time);
        this.realLocationMgr.update(delta);
        this.routeVis.update(delta, time);
      }

      // Update demo vehicles when demo scene is active
      if (this.currentMode === 'demo') {
        if (this.currentPlanType === 'road_sensor' && this.smartSignalJunction) {
          this.smartSignalJunction.update(delta);
        } else if (this.vehicles.length) {
          if (this.currentPlanType === 'four_lane') {
            updateVehicles(
              this.vehicles,
              delta,
              this._progress,
              this.laneOffsets1,
              this.laneOffsets4,
              demoScenario.currentState.geometry.length
            );
          } else if (this.currentPlanType === 'flyover') {
            this.updateFlyoverVehicles(delta);
          } else if (this.currentPlanType === 'ring_road') {
            this.updateRingRoadVehicles(delta);
          } else if (this.currentPlanType === 'combined') {
            this.updateCombinedVehicles(delta);
          }
        }
      }

      this.renderer.render(this.scene, this.camera);
      onFrame?.(this._progress);
    };
    loop();
  }

  stopLoop() {
    cancelAnimationFrame(this.rafId);
  }

  public resize = (width?: number, height?: number) => {
    const canvas = this.renderer.domElement;
    if (!canvas) return;
    const w = width ?? canvas.clientWidth;
    const h = height ?? canvas.clientHeight;
    if (w <= 0 || h <= 0) return;
    this.renderer.setSize(w, h, false);
    this.camCtrl.resize(w, h);
  };

  private onResize = () => {
    this.resize();
  };

  dispose() {
    this.stopLoop();
    window.removeEventListener('resize', this.onResize);
    this.camCtrl.detachDomElement();
    this.realLocationMgr.clear();
    this.analysisVis.clear();
    this.transformMgr.dispose();
    this.renderer.dispose();
  }
}
