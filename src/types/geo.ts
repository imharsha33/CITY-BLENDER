export interface BoundingBox {
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
}

export interface LocationResult {
  id: string;
  displayName: string;
  name?: string;
  latitude: number;
  longitude: number;
  type?: string;
  category?: string;
  address?: Record<string, any>;
  importance?: number;
  boundingBox?: BoundingBox;
}

export interface RoadSegmentGeo {
  id: string;
  name?: string;
  highwayType: string;
  geometry: [number, number][]; // [lat, lon]
  lanes?: number | null;
  estimatedWidth: number;
  oneWay: boolean;
  surface?: string | null;
  maxSpeed?: string | null;
  bridge: boolean;
  tunnel: boolean;
}

export interface BuildingGeo {
  id: string;
  geometry: [number, number][]; // [lat, lon]
  height?: number | null;
  estimatedHeight: number;
  type?: string;
  levels?: number | null;
}

export interface WaterFeatureGeo {
  id: string;
  name?: string | null;
  geometry: [number, number][]; // [lat, lon]
  type: string;
}

export interface POIGeo {
  id: string;
  name: string;
  type: string;
  coordinate: [number, number]; // [lat, lon]
}

export interface DevelopmentZone {
  zoneId: string;
  name: string;
  zoneType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | string;
  confidence: number;
  boundingBox: BoundingBox;
  center: [number, number];
  affectedRoadIds: string[];
  affectedJunctionIds: string[];
  issueIds: string[];
  currentCondition: string;
  futureCondition: string;
  constraints: Record<string, any>;
  recommendedCandidates: string[];
  evidence: string[];
  sourceLineage: Record<string, any>;
}

export interface WholePlaceDevelopmentPlan {
  id: string;
  name: string;
  place: string;
  geographicExtent: BoundingBox;
  dataSource: string;
  totalRoadsCount: number;
  developmentZones: DevelopmentZone[];
  selectedZoneInterventions: Record<string, any>;
  unchangedMonitoringZones: string[];
  totalAffectedRoadsCount: number;
  futureHorizon: number;
  overallScore: number;
  confidence: number;
  tradeoffs: Record<string, any>;
  explanation: string[];
  geometries: any[];
}

export interface GeoAreaResponse {
  locationName: string;
  center: [number, number];
  radiusKm: number;
  boundingBox: BoundingBox;
  planningExtent?: BoundingBox;
  boundaryType?: string;
  dataSource: string;
  coordinateReferenceSystem?: string;
  roads: RoadSegmentGeo[];
  buildings: BuildingGeo[];
  water: WaterFeatureGeo[];
  pois: POIGeo[];
  developmentZones?: DevelopmentZone[];
  wholePlacePlan?: WholePlaceDevelopmentPlan | null;
  metadata?: Record<string, unknown>;
}

export type SceneMode = 'demo' | 'real_location';

export interface LayerVisibility {
  roads: boolean;
  buildings: boolean;
  water: boolean;
  pois: boolean;
}
