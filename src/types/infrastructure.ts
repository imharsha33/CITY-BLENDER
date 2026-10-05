// ============================================================
// Phase 1: Infrastructure Types
// Designed for extensibility into Phase 2+ real-world data
// ============================================================

export type RoadType =
  | 'local'
  | 'collector'
  | 'arterial'
  | 'highway'
  | 'expressway';

export type UpgradeType =
  | 'road_widening'
  | '2_to_4_lane'
  | '4_to_6_lane'
  | 'flyover'
  | 'underpass'
  | 'junction_redesign'
  | 'bypass'
  | 'ring_road'
  | 'connector_road'
  | 'service_road'
  | 'combination';

export type InterventionReason =
  | 'traffic_congestion'
  | 'capacity_upgrade'
  | 'safety'
  | 'connectivity'
  | 'development_growth'
  | 'junction_improvement';

export type ConstructionPhaseId =
  | 'existing'
  | 'survey'
  | 'preparation'
  | 'modification'
  | 'earthwork'
  | 'drainage'
  | 'road_base'
  | 'pavement'
  | 'median'
  | 'markings'
  | 'streetlights'
  | 'landscaping'
  | 'completed';

export type CameraMode =
  | 'overview'
  | 'road_level'
  | 'follow'
  | 'flyover'
  | 'hero'
  | 'top'
  | 'whole_area'
  | 'view_3d'
  | 'selected_road'
  | 'selected_problem'
  | 'selected_strategy';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface RoadGeometryConfig {
  lanes: number;
  laneWidth: number;       // meters
  length: number;          // meters
  hasShoulder?: boolean;
  shoulderWidth?: number;
  hasMedian?: boolean;
  medianWidth?: number;
  hasMarkings?: boolean;
  hasDrainage?: boolean;
  hasSidewalk?: boolean;
  sidewalkWidth?: number;
}

export interface RoadSegment {
  id: string;
  name: string;
  geometry: RoadGeometryConfig;
  roadType: RoadType;
  // For future Phase 2: real-world coordinates
  startPoint?: GeoPoint;
  endPoint?: GeoPoint;
  existingCondition?: 'poor' | 'fair' | 'good';
  yearBuilt?: number;
}

export interface RoadUpgrade {
  type: UpgradeType;
  existingLanes: number;
  proposedLanes: number;
  reason: InterventionReason[];
  confidence?: number;        // 0-1, for Phase 4 AI recommendations
  estimatedCost?: number;     // For Phase 4+
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConstructionPhase {
  id: ConstructionPhaseId;
  name: string;
  description: string;
  timelineStart: number;    // 0-1 normalized
  timelineEnd: number;      // 0-1 normalized
  year?: number;
  icon?: string;
}

export interface BuildingConfig {
  id: string;
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  color: string;
  roofType: 'flat' | 'sloped' | 'hip';
  side: 'left' | 'right';
}

export interface VehicleConfig {
  id: string;
  type: 'car' | 'bus' | 'truck';
  color: string;
  speed: number;
  laneIndex: number;
  direction: 1 | -1;
  initialOffset: number;
}

export interface TreeConfig {
  id: string;
  position: [number, number, number];
  scale: number;
  type: 'round' | 'tall' | 'bush';
}

export interface StreetLightConfig {
  id: string;
  position: [number, number, number];
  side: 'left' | 'right' | 'median';
}

export interface ConstructionEquipmentConfig {
  id: string;
  type: 'excavator' | 'dump_truck' | 'roller' | 'crane' | 'concrete_mixer';
  position: [number, number, number];
  activePhases: ConstructionPhaseId[];
}

export interface InfrastructureScenario {
  id: string;
  name: string;
  description: string;
  location: string;         // Phase 2: real address
  currentState: RoadSegment;
  proposedState: RoadSegment;
  upgrade: RoadUpgrade;
  constructionPhases: ConstructionPhase[];
  buildings: BuildingConfig[];
  trees: TreeConfig[];
  vehicles: VehicleConfig[];
  streetLights: StreetLightConfig[];
  constructionEquipment: ConstructionEquipmentConfig[];
  timeline: {
    startYear: number;
    endYear: number;
  };
  // Future Phase 2+
  geographicData?: {
    center: GeoPoint;
    bounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
}

// For future AI recommendation engine (Phase 4+)
export interface PlanningRecommendation {
  scenarioId: string;
  recommendedUpgrade: RoadUpgrade;
  alternativeUpgrades: RoadUpgrade[];
  reasoning: string[];
  confidence: number;
  dataInputs: {
    trafficVolume?: number;
    populationGrowth?: number;
    landUse?: string;
    junctionCount?: number;
  };
}

// Timeline state interface
export interface TimelineState {
  progress: number;         // 0-1
  currentPhase: ConstructionPhaseId;
  isPlaying: boolean;
  playbackSpeed: number;
}

// Scene state
export interface SceneState {
  initialized: boolean;
  cameraMode: CameraMode;
  timeline: TimelineState;
  showGrid: boolean;
  showLabels: boolean;
}
