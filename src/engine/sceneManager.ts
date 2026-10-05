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
  type FlyoverSceneElements,
  type RingRoadSceneElements,
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
  public  transformMgr!:   TransformationManager;
  private currentMode:     SceneMode = 'demo';

  private clock      = new THREE.Clock();
  private rafId      = 0;
  private _progress  = 0;
  private autoCam    = true;
  private userLighting: LightingMode | null = null;
  private lastHeroLightingState = false;

  private laneOffsets1 = [-1.0, 1.0];
  private laneOffsets4 = [-6.75, -3.75, 3.75, 6.75, -5.25, 5.25];

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private currentPlanType: DemoPlanType = 'four_lane';
  private flyoverElements: FlyoverSceneElements | null = null;
  private ringRoadElements: RingRoadSceneElements | null = null;
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
    this.demoGroup.add(createTerrain());
    const elements = buildFlyover3D();
    this.flyoverElements = elements;
    this.demoGroup.add(elements.group);
    this.demoGroup.add(createAllBuildings(flyoverScenario.buildings));
    this.demoGroup.add(createAllTrees(flyoverScenario.trees));
    this.vehicles = elements.vehicles;
    this.applyFlyoverTimeline(elements, 0);
  }

  private buildRingRoadDemoSubtree() {
    this.demoGroup.add(createTerrain());
    const elements = buildRingRoad3D();
    this.ringRoadElements = elements;
    this.demoGroup.add(elements.group);
    this.vehicles = elements.vehicles;
    this.applyRingRoadTimeline(elements, 0);
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

    if (plan === 'four_lane') {
      this.buildFourLaneDemoSubtree();
      this.camCtrl.flyTo(new THREE.Vector3(0, 80, 60), new THREE.Vector3(0, 0, 0), 1.5);
    } else if (plan === 'flyover') {
      this.buildFlyoverDemoSubtree();
      this.camCtrl.flyTo(new THREE.Vector3(36, 32, -60), new THREE.Vector3(0, 5, 0), 1.6);
    } else if (plan === 'ring_road') {
      this.buildRingRoadDemoSubtree();
      this.camCtrl.flyTo(new THREE.Vector3(0, 130, 90), new THREE.Vector3(0, 0, -20), 1.6);
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
      this.camCtrl.flyTo(new THREE.Vector3(0, 80, 60), new THREE.Vector3(0, 0, 0), 1.8);
    } else {
      this.demoGroup.visible = false;
      this.realLocationMgr.setVisible(true);
      this.analysisVis.setVisible(true);

      const b = this.realLocationMgr.getBounds();
      if (b) {
        this.camCtrl.fitWholeArea(b, 2.0);
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
      this.camCtrl.fitWholeArea(b, 2.0);
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

  // ── Raycasting Interactivity ────────────────────────────────────────────────
  handleCanvasClick(
    clientX: number,
    clientY: number
  ): {
    issue?: InfrastructureIssue;
    road?: RoadAnalysisItem | RoadSegmentGeo;
    junction?: JunctionAnalysisItem;
  } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

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
    elem.piersGroup.visible = p >= 0.28;
    elem.approachRampSouth.visible = p >= 0.48;
    elem.approachRampNorth.visible = p >= 0.48;
    elem.elevatedDeck.visible = p >= 0.52;
    elem.barriersGroup.visible = p >= 0.72;
    elem.medianGroup.visible = p >= 0.78;
    elem.markingsGroup.visible = p >= 0.84;
    elem.elevatedLights.visible = p >= 0.90;
  }

  private applyRingRoadTimeline(elem: RingRoadSceneElements, p: number) {
    elem.buildings.visible = true;
    elem.radialRoads.visible = true;
    elem.roundabouts.visible = p >= 0.35;
    elem.orbitalRingPavement.visible = p >= 0.55;
    elem.orbitalMedian.visible = p >= 0.75;
    elem.orbitalBarriers.visible = p >= 0.80;
    elem.lights.visible = p >= 0.88;
  }

  private updateFlyoverVehicles(delta: number) {
    const DECK_ELEVATION = 6.8;
    const HALF_LEN = 110;

    this.vehicles.forEach(v => {
      const visible = this._progress < 0.18 || this._progress >= 0.84;
      v.group.visible = visible;
      if (!visible) return;

      if (v.config.laneIndex >= 4) {
        // Surface crossroad traffic along X axis
        const speed = v.config.speed * delta * 60;
        const dir = v.config.direction;
        let curX = v.group.position.x + dir * speed;
        if (curX > 60) curX = -60;
        if (curX < -60) curX = 60;
        v.group.position.set(curX, 0.15, v.config.laneIndex === 4 ? -4 : 4);
        v.group.rotation.y = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        // Elevated express flyover traffic along Z axis
        const speed = v.config.speed * delta * 60;
        const dir = v.config.direction;
        v.currentZ += dir * speed;
        if (v.currentZ > HALF_LEN) v.currentZ = -HALF_LEN;
        if (v.currentZ < -HALF_LEN) v.currentZ = HALF_LEN;

        let y = 0.2;
        let pitch = 0;
        const z = v.currentZ;

        if (z >= -36 && z <= 36) {
          y = DECK_ELEVATION + 0.35;
          pitch = 0;
        } else if (z > -90 && z < -36) {
          const t = (z - (-90)) / 54;
          y = 0.2 + t * DECK_ELEVATION;
          pitch = Math.atan2(DECK_ELEVATION, 54) * (dir === 1 ? -1 : 1);
        } else if (z > 36 && z < 90) {
          const t = (z - 36) / 54;
          y = DECK_ELEVATION + 0.35 - t * DECK_ELEVATION;
          pitch = Math.atan2(DECK_ELEVATION, 54) * (dir === 1 ? 1 : -1);
        }

        const laneXOffsets = [-3.8, -1.8, 1.8, 3.8];
        const laneX = laneXOffsets[Math.min(v.config.laneIndex, 3)];

        v.group.position.set(laneX, y, z);
        v.group.rotation.y = dir === 1 ? 0 : Math.PI;
        v.group.rotation.x = pitch;
      }
    });
  }

  private updateRingRoadVehicles(delta: number) {
    const RADIUS = 68.0;
    const START_ANGLE = -Math.PI * 0.85;
    const END_ANGLE = Math.PI * 0.25;
    const ARC_SPAN = END_ANGLE - START_ANGLE;

    this.vehicles.forEach((v, idx) => {
      const visible = this._progress < 0.18 || this._progress >= 0.82;
      v.group.visible = visible;
      if (!visible) return;

      if (v.config.laneIndex === 4) {
        // Feeder road traffic heading towards roundabout
        const speed = v.config.speed * delta * 45;
        v.currentZ += speed;
        if (v.currentZ > 45) v.currentZ = -10;
        v.group.position.set(-v.currentZ * 0.6, 0.15, -v.currentZ * 0.8);
        v.group.rotation.y = Math.PI * 0.6;
      } else {
        const laneOffsets = [-4.5, -1.5, 1.5, 4.5];
        const laneR = RADIUS + laneOffsets[Math.min(v.config.laneIndex, 3)];
        const dir = v.config.direction;
        const speed = v.config.speed * delta * 0.75;

        const anyV = v as unknown as { currentAngle?: number };
        if (anyV.currentAngle === undefined) {
          anyV.currentAngle = START_ANGLE + ((idx * 0.22) % ARC_SPAN);
        }

        anyV.currentAngle += (dir * speed);
        if (anyV.currentAngle > END_ANGLE) anyV.currentAngle = START_ANGLE;
        if (anyV.currentAngle < START_ANGLE) anyV.currentAngle = END_ANGLE;

        const a = anyV.currentAngle;
        const x = Math.cos(a) * laneR;
        const z = Math.sin(a) * laneR;

        v.group.position.set(x, 0.2, z);
        const tangentAngle = dir === 1 ? -a : -a + Math.PI;
        v.group.rotation.y = tangentAngle;
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
