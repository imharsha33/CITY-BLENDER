import * as THREE from 'three';
import { GeoCoordinateSystem } from './GeoCoordinateSystem';
import type { RoadNetworkManager } from './RoadNetworkManager';
import type { ProposedInfrastructureManager } from './ProposedInfrastructureManager';
import type { CameraController } from './cameraController';
import type {
  TransformationState,
  ComparisonMode,
  ConstructionPhaseDefinition,
  InterventionCategory,
} from '../types/transformation';
import { CONSTRUCTION_PHASES } from '../types/transformation';
import type { InfrastructureStrategy } from '../types/optimization';
import type { CandidatePlan, ProposedRoadSegment } from '../types/planning';
import type { ForecastResponse } from '../types/forecasting';
import type { AnalysisResultResponse } from '../types/analysis';
import {
  createCone,
  createBarrier,
  createSurveyMarker,
  createExcavator,
  createDumpTruck,
  createRoller,
  createConcreteMixer,
} from '../components/Scene/ConstructionObjects';

// Engineering Material Palette (Subtle, Muted, Technical)
const BASE_AGGREGATE_MAT = new THREE.MeshLambertMaterial({ color: 0x8a8479 }); // Crushed stone base
const DRAINAGE_CONCRETE_MAT = new THREE.MeshLambertMaterial({ color: 0x717780 }); // Precast concrete channel
const PIER_CONCRETE_MAT = new THREE.MeshLambertMaterial({ color: 0x7c828d });
const FUTURE_RELIEF_MAT = new THREE.MeshBasicMaterial({
  color: 0x10b981, // Emerald flow relief
  transparent: true,
  opacity: 0.85,
});
const SENSOR_BEACON_MAT = new THREE.MeshBasicMaterial({
  color: 0x00e5ff, // Cyan IoT / sensor telemetry
});
const MAINTENANCE_VAN_MAT = new THREE.MeshLambertMaterial({ color: 0xf59e0b }); // Amber utility truck

export class TransformationManager {
  rootGroup: THREE.Group;
  private scene: THREE.Scene;
  private coordSystem: GeoCoordinateSystem | null = null;
  private proposedMgr: ProposedInfrastructureManager;
  private roadNetworkMgr: RoadNetworkManager | null = null;
  private camCtrl: CameraController;

  // State
  private state: TransformationState = 'EXISTING';
  private comparisonMode: ComparisonMode = 'PROPOSED';
  private strategy: InfrastructureStrategy | null = null;
  private plan: CandidatePlan | null = null;
  private forecast: ForecastResponse | null = null;
  private analysis: AnalysisResultResponse | null = null;
  private progress: number = 0.0;
  private futureHorizon: number = 2035;
  private playSpeed: number = 1.0;
  private isPlaying: boolean = false;
  private rafId: number = 0;
  private lastTime: number = 0;

  // Sub-groups for 13-stage engineering construction
  private surveyGroup: THREE.Group = new THREE.Group();
  private trafficControlGroup: THREE.Group = new THREE.Group();
  private earthworkGroup: THREE.Group = new THREE.Group();
  private drainageGroup: THREE.Group = new THREE.Group();
  private foundationGroup: THREE.Group = new THREE.Group();
  private structureGroup: THREE.Group = new THREE.Group();
  private roadBaseGroup: THREE.Group = new THREE.Group();
  private pavementGroup: THREE.Group = new THREE.Group();
  private lanesMedianGroup: THREE.Group = new THREE.Group();
  private lightingGroup: THREE.Group = new THREE.Group();
  private landscapingGroup: THREE.Group = new THREE.Group();
  private maintenanceGroup: THREE.Group = new THREE.Group();
  private futureOverlayGroup: THREE.Group = new THREE.Group();

  // Cached corridor coordinates for construction staging
  private corridorPoints: THREE.Vector3[] = [];
  private corridorBounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null = null;
  private interventionCategory: InterventionCategory = 'ROAD_WIDENING';

  // Listeners
  public onStateChange?: (state: TransformationState) => void;
  public onProgressChange?: (progress: number, phase: ConstructionPhaseDefinition) => void;
  public onComplete?: () => void;

  constructor(
    scene: THREE.Scene,
    proposedMgr: ProposedInfrastructureManager,
    camCtrl: CameraController
  ) {
    this.scene = scene;
    this.proposedMgr = proposedMgr;
    this.camCtrl = camCtrl;

    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'transformation-manager-root';

    // Assemble construction sub-groups
    this.rootGroup.add(this.surveyGroup);
    this.rootGroup.add(this.trafficControlGroup);
    this.rootGroup.add(this.earthworkGroup);
    this.rootGroup.add(this.drainageGroup);
    this.rootGroup.add(this.foundationGroup);
    this.rootGroup.add(this.structureGroup);
    this.rootGroup.add(this.roadBaseGroup);
    this.rootGroup.add(this.pavementGroup);
    this.rootGroup.add(this.lanesMedianGroup);
    this.rootGroup.add(this.lightingGroup);
    this.rootGroup.add(this.landscapingGroup);
    this.rootGroup.add(this.maintenanceGroup);
    this.rootGroup.add(this.futureOverlayGroup);

    this.scene.add(this.rootGroup);
    this.rootGroup.visible = false;
  }

  setRoadNetworkManager(mgr: RoadNetworkManager): void {
    this.roadNetworkMgr = mgr;
  }

  setCoordSystem(coordSystem: GeoCoordinateSystem): void {
    this.coordSystem = coordSystem;
  }

  // ── Setup Transformation Context ───────────────────────────────────────────

  setContext(
    strategy: InfrastructureStrategy | null,
    plan: CandidatePlan | null,
    analysis: AnalysisResultResponse | null,
    forecast: ForecastResponse | null,
    coordSystem: GeoCoordinateSystem
  ): void {
    this.strategy = strategy;
    this.plan = plan;
    this.analysis = analysis;
    this.forecast = forecast;
    this.coordSystem = coordSystem;

    this.determineInterventionCategory();
    this.rebuildConstructionAssets();
    this.applyState(this.state);
  }

  private determineInterventionCategory(): void {
    if (this.strategy) {
      const typeStr = (this.strategy.name || '').toUpperCase();
      const types: string[] = this.strategy.intervention_types || [];
      const hasFlyover = types.some(
        t => t.toUpperCase().includes('FLYOVER') || t.toUpperCase().includes('GRADE_SEPARATION')
      );
      const hasRoundabout = types.some(
        t => t.toUpperCase().includes('JUNCTION') || t.toUpperCase().includes('ROUNDABOUT')
      );
      const hasConnector = types.some(
        t => t.toUpperCase().includes('CONNECTOR') || t.toUpperCase().includes('RELIEF')
      );
      const isNoMajor = types.some(
        t => t.toUpperCase().includes('NO_MAJOR')
      ) || (this.strategy.intervention_ids || []).includes('plan-no-major-intervention');

      if (isNoMajor) {
        this.interventionCategory = 'NO_MAJOR_INTERVENTION';
      } else if (hasFlyover && (hasRoundabout || hasConnector)) {
        this.interventionCategory = 'COMBINED';
      } else if (hasFlyover) {
        this.interventionCategory = 'GRADE_SEPARATION';
      } else if (hasRoundabout) {
        this.interventionCategory = 'JUNCTION_IMPROVEMENT';
      } else if (hasConnector) {
        this.interventionCategory = 'CONNECTOR_ROAD';
      } else if (typeStr.includes('LANE') || typeStr.includes('RECONFIG')) {
        this.interventionCategory = 'LANE_RECONFIGURATION';
      } else {
        this.interventionCategory = 'ROAD_WIDENING';
      }
    } else if (this.plan) {
      const pType = (this.plan.type || '').toUpperCase();
      if (pType.includes('FLYOVER') || pType.includes('GRADE_SEPARATION')) {
        this.interventionCategory = 'GRADE_SEPARATION';
      } else if (pType.includes('JUNCTION') || pType.includes('ROUNDABOUT')) {
        this.interventionCategory = 'JUNCTION_IMPROVEMENT';
      } else if (pType.includes('CONNECTOR')) {
        this.interventionCategory = 'CONNECTOR_ROAD';
      } else if (pType.includes('NO_MAJOR')) {
        this.interventionCategory = 'NO_MAJOR_INTERVENTION';
      } else if (pType.includes('LANE')) {
        this.interventionCategory = 'LANE_RECONFIGURATION';
      } else {
        this.interventionCategory = 'ROAD_WIDENING';
      }
    } else {
      this.interventionCategory = 'ROAD_WIDENING';
    }
  }

  // ── Build Geographic Construction Assets along Real Corridor ───────────────

  private rebuildConstructionAssets(): void {
    this.clearConstructionGroups();
    if (!this.coordSystem) return;

    // 1. Gather geometries
    let segments: ProposedRoadSegment[] = [];
    if (this.strategy && this.strategy.combined_geometries && this.strategy.combined_geometries.length > 0) {
      segments = this.strategy.combined_geometries;
    } else if (this.plan && this.plan.proposedGeometry && this.plan.proposedGeometry.length > 0) {
      segments = this.plan.proposedGeometry;
    }

    if (segments.length === 0) {
      // In NO_MAJOR_INTERVENTION, find the primary analyzed bottleneck issue to place monitoring
      if (this.interventionCategory === 'NO_MAJOR_INTERVENTION') {
        let w = new THREE.Vector3(0, 0.1, 0);
        if (this.analysis && this.analysis.issues.length > 0) {
          const bn = this.analysis.issues[0];
          w = this.coordSystem.geoToWorld(bn.location[0], bn.location[1], 0.1);
        }
        this.corridorPoints = [
          new THREE.Vector3(w.x - 30, 0.1, w.z - 30),
          w,
          new THREE.Vector3(w.x + 30, 0.1, w.z + 30),
        ];
        this.corridorBounds = {
          minX: w.x - 30,
          maxX: w.x + 30,
          minZ: w.z - 30,
          maxZ: w.z + 30,
        };
        this.buildMaintenanceObjects(this.corridorPoints);
        return;
      }
      return;
    }

    // Convert segments to world points
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    const allPoints: THREE.Vector3[] = [];

    segments.forEach(seg => {
      if (!seg.geometry || seg.geometry.length < 2) return;
      seg.geometry.forEach(([lat, lon], idx) => {
        let elev = 0.1;
        if (seg.isElevated) {
          elev = seg.elevationMeters || 6.5;
        }
        const pt = this.coordSystem!.geoToWorld(lat, lon, elev);
        allPoints.push(pt);
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.z < minZ) minZ = pt.z;
        if (pt.z > maxZ) maxZ = pt.z;
      });
    });

    this.corridorPoints = allPoints;
    if (isFinite(minX)) {
      this.corridorBounds = { minX, maxX, minZ, maxZ };
    }

    if (this.corridorPoints.length < 2) return;

    // Handle NO_MAJOR_INTERVENTION specifically
    if (this.interventionCategory === 'NO_MAJOR_INTERVENTION') {
      this.buildMaintenanceObjects(this.corridorPoints);
      return;
    }

    // Build standard or strategy-specific construction elements
    this.buildSurveyObjects(this.corridorPoints);
    this.buildTrafficControlObjects(this.corridorPoints);
    this.buildEarthworkObjects(this.corridorPoints);
    this.buildDrainageObjects(this.corridorPoints);
    this.buildFoundationObjects(this.corridorPoints, this.interventionCategory);
    this.buildStructureObjects(this.corridorPoints, this.interventionCategory);
    this.buildRoadBaseObjects(this.corridorPoints);
    this.buildPavementObjects(this.corridorPoints);
    this.buildLanesMedianObjects(this.corridorPoints);
    this.buildLightingObjects(this.corridorPoints);
    this.buildLandscapingObjects(this.corridorPoints);
    this.buildFutureOverlayObjects(this.corridorPoints);
  }

  private clearConstructionGroups(): void {
    const groups = [
      this.surveyGroup,
      this.trafficControlGroup,
      this.earthworkGroup,
      this.drainageGroup,
      this.foundationGroup,
      this.structureGroup,
      this.roadBaseGroup,
      this.pavementGroup,
      this.lanesMedianGroup,
      this.lightingGroup,
      this.landscapingGroup,
      this.maintenanceGroup,
      this.futureOverlayGroup,
    ];

    groups.forEach(g => {
      while (g.children.length > 0) {
        const obj = g.children[0];
        g.remove(obj);
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      }
      g.visible = false;
    });
  }

  // ── Specific Stage Asset Builders ──────────────────────────────────────────

  private buildSurveyObjects(points: THREE.Vector3[]): void {
    const step = Math.max(1, Math.floor(points.length / 8));
    for (let i = 0; i < points.length; i += step) {
      const p = points[i];
      // Left and right survey stakes
      const m1 = createSurveyMarker();
      m1.position.set(p.x - 7, p.y, p.z - 7);
      this.surveyGroup.add(m1);

      const m2 = createSurveyMarker();
      m2.position.set(p.x + 7, p.y, p.z + 7);
      this.surveyGroup.add(m2);
    }
  }

  private buildTrafficControlObjects(points: THREE.Vector3[]): void {
    const step = Math.max(1, Math.floor(points.length / 10));
    for (let i = 0; i < points.length; i += step) {
      const p = points[i];
      const cone = createCone();
      cone.position.set(p.x - 8, p.y, p.z - 8);
      this.trafficControlGroup.add(cone);

      const barrier = createBarrier();
      barrier.position.set(p.x + 8, p.y, p.z + 8);
      this.trafficControlGroup.add(barrier);
    }
  }

  private buildEarthworkObjects(points: THREE.Vector3[]): void {
    const midIdx = Math.floor(points.length / 2);
    const mid = points[midIdx];

    const excavator = createExcavator();
    excavator.position.set(mid.x - 6, mid.y, mid.z + 4);
    excavator.rotation.y = 0.5;
    this.earthworkGroup.add(excavator);

    const dumpTruck = createDumpTruck();
    dumpTruck.position.set(mid.x + 6, mid.y, mid.z - 6);
    dumpTruck.rotation.y = -0.3;
    this.earthworkGroup.add(dumpTruck);

    // Spoil mounds
    const earthMat = new THREE.MeshLambertMaterial({ color: 0x78552b });
    [-12, 12].forEach(offset => {
      const mound = new THREE.Mesh(new THREE.SphereGeometry(2.0, 8, 5), earthMat);
      mound.scale.y = 0.45;
      mound.position.set(mid.x + offset, mid.y + 0.5, mid.z + offset);
      this.earthworkGroup.add(mound);
    });
  }

  private buildDrainageObjects(points: THREE.Vector3[]): void {
    const step = Math.max(1, Math.floor(points.length / 6));
    const channelGeo = new THREE.BoxGeometry(0.8, 0.4, 6.0);
    for (let i = 0; i < points.length; i += step) {
      const p = points[i];
      const ch1 = new THREE.Mesh(channelGeo, DRAINAGE_CONCRETE_MAT);
      ch1.position.set(p.x - 7.5, p.y + 0.1, p.z);
      this.drainageGroup.add(ch1);

      const ch2 = new THREE.Mesh(channelGeo, DRAINAGE_CONCRETE_MAT);
      ch2.position.set(p.x + 7.5, p.y + 0.1, p.z);
      this.drainageGroup.add(ch2);
    }
  }

  private buildFoundationObjects(points: THREE.Vector3[], category: InterventionCategory): void {
    const step = Math.max(1, Math.floor(points.length / 5));
    if (category === 'GRADE_SEPARATION' || category === 'COMBINED') {
      // Pier foundation pads
      const padGeo = new THREE.BoxGeometry(3.5, 0.8, 3.5);
      for (let i = 0; i < points.length; i += step) {
        const p = points[i];
        const pad = new THREE.Mesh(padGeo, PIER_CONCRETE_MAT);
        pad.position.set(p.x, 0.4, p.z);
        this.foundationGroup.add(pad);
      }
    } else {
      // Subgrade compaction layer pads
      const padGeo = new THREE.BoxGeometry(6.0, 0.2, 8.0);
      for (let i = 0; i < points.length; i += step) {
        const p = points[i];
        const pad = new THREE.Mesh(padGeo, BASE_AGGREGATE_MAT);
        pad.position.set(p.x, 0.1, p.z);
        this.foundationGroup.add(pad);
      }
    }

    const mixer = createConcreteMixer();
    const p0 = points[0];
    mixer.position.set(p0.x + 7, 0, p0.z - 7);
    this.foundationGroup.add(mixer);
  }

  private buildStructureObjects(points: THREE.Vector3[], category: InterventionCategory): void {
    if (category === 'GRADE_SEPARATION' || category === 'COMBINED') {
      const step = Math.max(1, Math.floor(points.length / 5));
      const pierGeo = new THREE.CylinderGeometry(1.2, 1.4, 6.0, 12);
      pierGeo.translate(0, 3.0, 0);

      for (let i = 0; i < points.length; i += step) {
        const p = points[i];
        const pier = new THREE.Mesh(pierGeo, PIER_CONCRETE_MAT);
        pier.position.set(p.x, 0, p.z);
        this.structureGroup.add(pier);
      }
    }
  }

  private buildRoadBaseObjects(points: THREE.Vector3[]): void {
    // Crushed stone sub-base ribbons
    const step = Math.max(1, Math.floor(points.length / 8));
    const baseGeo = new THREE.BoxGeometry(10.0, 0.25, 12.0);
    for (let i = 0; i < points.length; i += step) {
      const p = points[i];
      const mesh = new THREE.Mesh(baseGeo, BASE_AGGREGATE_MAT);
      mesh.position.set(p.x, p.y + 0.12, p.z);
      this.roadBaseGroup.add(mesh);
    }
  }

  private buildPavementObjects(points: THREE.Vector3[]): void {
    const roller = createRoller();
    const midIdx = Math.floor(points.length / 2);
    const mid = points[midIdx];
    roller.position.set(mid.x, mid.y, mid.z);
    this.pavementGroup.add(roller);
  }

  private buildLanesMedianObjects(points: THREE.Vector3[]): void {
    const step = Math.max(1, Math.floor(points.length / 6));
    const medianGeo = new THREE.BoxGeometry(1.4, 0.4, 8.0);
    const medianMat = new THREE.MeshLambertMaterial({ color: 0x8a929e });
    for (let i = 0; i < points.length; i += step) {
      const p = points[i];
      const med = new THREE.Mesh(medianGeo, medianMat);
      med.position.set(p.x, p.y + 0.2, p.z);
      this.lanesMedianGroup.add(med);
    }
  }

  private buildLightingObjects(points: THREE.Vector3[]): void {
    const step = Math.max(1, Math.floor(points.length / 5));
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.15, 6.0, 8);
    poleGeo.translate(0, 3.0, 0);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x4a4d52 });

    for (let i = 0; i < points.length; i += step) {
      const p = points[i];
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(p.x, p.y, p.z);
      this.lightingGroup.add(pole);
    }
  }

  private buildLandscapingObjects(points: THREE.Vector3[]): void {
    const step = Math.max(1, Math.floor(points.length / 4));
    const treeMat = new THREE.MeshLambertMaterial({ color: 0x2e6b36 });
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3525 });

    for (let i = 0; i < points.length; i += step) {
      const p = points[i];
      [-10, 10].forEach(off => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.8, 6), trunkMat);
        trunk.position.y = 0.9;
        const foliage = new THREE.Mesh(new THREE.SphereGeometry(1.4, 7, 5), treeMat);
        foliage.position.y = 2.4;
        tree.add(trunk);
        tree.add(foliage);
        tree.position.set(p.x + off, p.y, p.z + off);
        this.landscapingGroup.add(tree);
      });
    }
  }

  private buildMaintenanceObjects(points: THREE.Vector3[]): void {
    // Specifically for NO_MAJOR_INTERVENTION
    const midIdx = Math.floor(points.length / 2);
    const mid = points[midIdx];

    // Inspection / Monitoring Utility Van
    const van = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 4.2), MAINTENANCE_VAN_MAT);
    body.position.y = 1.0;
    van.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 1.8), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    cab.position.set(0, 1.8, 0.6);
    van.add(cab);
    van.position.set(mid.x + 4, mid.y, mid.z);
    van.rotation.y = 0.4;
    this.maintenanceGroup.add(van);

    // Monitoring Sensor Beacons
    points.forEach((p, idx) => {
      if (idx % 2 === 0) {
        const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8), SENSOR_BEACON_MAT);
        beacon.position.set(p.x - 4, p.y + 1.25, p.z);
        this.maintenanceGroup.add(beacon);
      }
    });

    this.maintenanceGroup.visible = true;
  }

  private buildFutureOverlayObjects(points: THREE.Vector3[]): void {
    // Emerald flow ribbons along upgraded alignment representing relieved capacity
    const step = Math.max(1, Math.floor(points.length / 6));
    const flowGeo = new THREE.BoxGeometry(4.0, 0.1, 10.0);
    for (let i = 0; i < points.length; i += step) {
      const p = points[i];
      const flow = new THREE.Mesh(flowGeo, FUTURE_RELIEF_MAT);
      flow.position.set(p.x, p.y + 0.35, p.z);
      this.futureOverlayGroup.add(flow);
    }
  }

  // ── State Transitions ──────────────────────────────────────────────────────

  setTransformationState(newState: TransformationState): void {
    this.state = newState;
    this.applyState(newState);
    this.onStateChange?.(newState);
  }

  getTransformationState(): TransformationState {
    return this.state;
  }

  private applyState(state: TransformationState): void {
    switch (state) {
      case 'EXISTING':
        this.pause();
        this.rootGroup.visible = false;
        this.proposedMgr.setViewState('existing');
        if (this.roadNetworkMgr) {
          this.roadNetworkMgr.highlightRoad(null);
        }
        break;

      case 'ANALYSIS':
        this.pause();
        this.rootGroup.visible = false;
        this.proposedMgr.setViewState('existing');
        // Corridor road highlighted
        if (this.strategy?.affected_road_ids?.[0] && this.roadNetworkMgr) {
          this.roadNetworkMgr.highlightRoad(this.strategy.affected_road_ids[0]);
        }
        break;

      case 'PROPOSED':
        this.pause();
        this.rootGroup.visible = false;
        this.proposedMgr.setViewState(this.comparisonMode === 'COMPARE' ? 'compare' : 'proposed');
        if (this.strategy?.affected_road_ids?.[0] && this.roadNetworkMgr) {
          this.roadNetworkMgr.highlightRoad(this.strategy.affected_road_ids[0]);
        }
        break;

      case 'CONSTRUCTION':
        this.rootGroup.visible = true;
        this.maintenanceGroup.visible = this.interventionCategory === 'NO_MAJOR_INTERVENTION';
        this.futureOverlayGroup.visible = false;
        this.updateConstructionProgress(this.progress);
        break;

      case 'COMPLETED':
        this.pause();
        this.rootGroup.visible = false;
        this.proposedMgr.setViewState('proposed');
        break;

      case 'FUTURE':
        this.pause();
        this.rootGroup.visible = true;
        this.clearConstructionMachinery();
        this.futureOverlayGroup.visible = true;
        this.proposedMgr.setViewState('proposed');
        break;
    }
  }

  private clearConstructionMachinery(): void {
    this.surveyGroup.visible = false;
    this.trafficControlGroup.visible = false;
    this.earthworkGroup.visible = false;
    this.drainageGroup.visible = false;
    this.foundationGroup.visible = false;
    this.structureGroup.visible = false;
    this.roadBaseGroup.visible = false;
    this.pavementGroup.visible = false;
    this.lanesMedianGroup.visible = false;
    this.lightingGroup.visible = false;
    this.landscapingGroup.visible = false;
  }

  // ── Construction Progression (13 Stages) ───────────────────────────────────

  setConstructionProgress(progress: number): void {
    this.progress = Math.max(0.0, Math.min(1.0, progress));
    this.updateConstructionProgress(this.progress);
  }

  getConstructionProgress(): number {
    return this.progress;
  }

  getCurrentPhase(): ConstructionPhaseDefinition {
    const p = this.progress;
    const found = CONSTRUCTION_PHASES.find(ph => p >= ph.startProgress && p < ph.endProgress);
    return found || CONSTRUCTION_PHASES[CONSTRUCTION_PHASES.length - 1];
  }

  private updateConstructionProgress(p: number): void {
    const phase = this.getCurrentPhase();
    this.onProgressChange?.(p, phase);

    if (this.interventionCategory === 'NO_MAJOR_INTERVENTION') {
      this.maintenanceGroup.visible = true;
      this.proposedMgr.setViewState('existing');
      return;
    }

    // Stage 1: Survey
    this.surveyGroup.visible = p < 0.20;

    // Stage 2: Site Preparation (Cones & barriers stay active during active construction)
    this.trafficControlGroup.visible = p >= 0.08 && p < 0.96;

    // Stage 3 & 4: Clearance & Earthwork
    this.earthworkGroup.visible = p >= 0.16 && p < 0.48;

    // Stage 5: Drainage
    this.drainageGroup.visible = p >= 0.32 && p < 0.85;

    // Stage 6: Foundation
    this.foundationGroup.visible = p >= 0.40 && p < 0.70;

    // Stage 7: Structure (Elevated piers/deck)
    this.structureGroup.visible = p >= 0.48;

    // Stage 8: Road Base
    this.roadBaseGroup.visible = p >= 0.56 && p < 0.75;

    // Stage 9: Pavement (Roller & asphalt)
    this.pavementGroup.visible = p >= 0.64 && p < 0.88;

    // Stage 10: Lanes & Median
    this.lanesMedianGroup.visible = p >= 0.72;

    // Stage 11: Lighting
    this.lightingGroup.visible = p >= 0.80;

    // Stage 12: Landscaping
    this.landscapingGroup.visible = p >= 0.88;

    // Stage 13: Completed Proposed Geometry Reveal
    if (p >= 0.96) {
      this.clearConstructionMachinery();
      this.proposedMgr.setViewState('proposed');
    } else if (p >= 0.64) {
      // Partial reveal during paving
      this.proposedMgr.setViewState('proposed');
    } else {
      this.proposedMgr.setViewState('existing');
    }
  }

  // ── Playback Controls ───────────────────────────────────────────────────────

  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    if (this.state !== 'CONSTRUCTION') {
      this.setTransformationState('CONSTRUCTION');
    }
    this.lastTime = performance.now();
    this.animate();
  }

  pause(): void {
    this.isPlaying = false;
    cancelAnimationFrame(this.rafId);
  }

  reset(): void {
    this.pause();
    this.setConstructionProgress(0.0);
    this.setTransformationState('EXISTING');
  }

  setSpeed(speed: number): void {
    this.playSpeed = speed;
  }

  getSpeed(): number {
    return this.playSpeed;
  }

  stepForward(): void {
    const next = Math.min(1.0, this.progress + 1 / 13);
    this.setConstructionProgress(next);
    if (next >= 1.0) {
      this.setTransformationState('COMPLETED');
    }
  }

  stepBackward(): void {
    const prev = Math.max(0.0, this.progress - 1 / 13);
    this.setConstructionProgress(prev);
  }

  private animate = () => {
    if (!this.isPlaying) return;
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Progress through 13 stages in ~24s at 1x speed
    const baseRate = 1.0 / 24.0;
    const next = this.progress + baseRate * this.playSpeed * dt;

    if (next >= 1.0) {
      this.setConstructionProgress(1.0);
      this.pause();
      this.setTransformationState('COMPLETED');
      this.onComplete?.();
      return;
    }

    this.setConstructionProgress(next);
    this.rafId = requestAnimationFrame(this.animate);
  };

  // ── Comparison Mode ─────────────────────────────────────────────────────────

  setComparisonMode(mode: ComparisonMode): void {
    this.comparisonMode = mode;
    if (this.state === 'PROPOSED' || this.state === 'COMPLETED') {
      if (mode === 'EXISTING') {
        this.proposedMgr.setViewState('existing');
      } else if (mode === 'PROPOSED') {
        this.proposedMgr.setViewState('proposed');
      } else {
        this.proposedMgr.setViewState('compare');
      }
    }
  }

  getComparisonMode(): ComparisonMode {
    return this.comparisonMode;
  }

  // ── Future Horizon ──────────────────────────────────────────────────────────

  setFutureHorizon(year: number): void {
    this.futureHorizon = year;
    // Scale future flow opacity/pulse according to horizon
    const opacity = year === 2030 ? 0.65 : year === 2035 ? 0.85 : 1.0;
    FUTURE_RELIEF_MAT.opacity = opacity;
  }

  getFutureHorizon(): number {
    return this.futureHorizon;
  }

  // ── Cinematic Camera Preset Handlers ────────────────────────────────────────

  focusWholeCity(bounds: { minX: number; maxX: number; minZ: number; maxZ: number; centerX: number; centerZ: number; maxSpan: number } | null): void {
    if (bounds) {
      this.camCtrl.fitWholeArea(bounds, 2.0);
    }
  }

  focusCorridor(): void {
    if (this.corridorBounds) {
      this.camCtrl.fitToBounds(
        this.corridorBounds.minX,
        this.corridorBounds.maxX,
        this.corridorBounds.minZ,
        this.corridorBounds.maxZ,
        1.8
      );
    } else if (this.corridorPoints.length > 0) {
      this.focusIntervention();
    }
  }

  focusIntervention(): void {
    if (this.corridorPoints.length > 0) {
      const mid = this.corridorPoints[Math.floor(this.corridorPoints.length / 2)];
      this.camCtrl.focusElement(mid, 'road', 1.6);
    }
  }

  focusStreetLevel(): void {
    if (this.corridorPoints.length >= 2) {
      const p1 = this.corridorPoints[0];
      const p2 = this.corridorPoints[1];
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      const eyePos = p1.clone().add(new THREE.Vector3(0, 2.2, 0));
      const lookAt = eyePos.clone().add(dir.multiplyScalar(50));
      this.camCtrl.flyTo(eyePos, lookAt, 1.8);
    }
  }

  focusCinematic(): void {
    if (this.corridorBounds) {
      // Use fitToBounds since corridorBounds doesn't have full GeoBounds shape
      this.camCtrl.fitToBounds(
        this.corridorBounds.minX,
        this.corridorBounds.maxX,
        this.corridorBounds.minZ,
        this.corridorBounds.maxZ,
        2.0
      );
    } else if (this.corridorPoints.length > 0) {
      this.focusIntervention();
    }
  }

  dispose(): void {
    this.pause();
    this.clearConstructionGroups();
    this.scene.remove(this.rootGroup);
  }
}
