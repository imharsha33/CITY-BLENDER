from typing import List, Optional, Tuple, Dict, Any
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    min_lat: float
    max_lat: float
    min_lon: float
    max_lon: float

class LocationResult(BaseModel):
    id: str
    displayName: str
    name: Optional[str] = None
    latitude: float
    longitude: float
    type: Optional[str] = None
    category: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    importance: Optional[float] = None
    boundingBox: Optional[BoundingBox] = None

class RoadSegment(BaseModel):
    id: str
    name: Optional[str] = "Unnamed Road"
    highwayType: str
    geometry: List[Tuple[float, float]]  # [(lat, lon), ...]
    lanes: Optional[int] = None
    estimatedWidth: float
    oneWay: bool = False
    surface: Optional[str] = None
    maxSpeed: Optional[str] = None
    bridge: bool = False
    tunnel: bool = False
    source: str = "OPENSTREETMAP"

class Building(BaseModel):
    id: str
    geometry: List[Tuple[float, float]]  # [(lat, lon), ...] outer ring polygon
    height: Optional[float] = None
    estimatedHeight: float
    type: Optional[str] = "building"
    levels: Optional[int] = None
    source: str = "OPENSTREETMAP"

class WaterFeature(BaseModel):
    id: str
    name: Optional[str] = None
    geometry: List[Tuple[float, float]]  # polygon or linestring
    type: str  # river, stream, canal, reservoir, coastline, water
    source: str = "OPENSTREETMAP"

class POI(BaseModel):
    id: str
    name: str
    type: str  # hospital, school, station, government, commercial
    coordinate: Tuple[float, float]  # (lat, lon)
    source: str = "OPENSTREETMAP"

class DevelopmentZone(BaseModel):
    zoneId: str
    name: str
    zoneType: str  # CONGESTED_ARTERIAL, CRITICAL_JUNCTION, CONNECTIVITY_GAP, FUTURE_GROWTH_CORRIDOR, CONSTRAINED_URBAN, ENVIRONMENTAL_BUFFER, STABLE_EQUILIBRIUM
    severity: str  # CRITICAL, HIGH, MODERATE, LOW
    confidence: float = 85.0
    boundingBox: BoundingBox
    center: Tuple[float, float]
    affectedRoadIds: List[str] = Field(default_factory=list)
    affectedJunctionIds: List[str] = Field(default_factory=list)
    issueIds: List[str] = Field(default_factory=list)
    currentCondition: str = ""
    futureCondition: str = ""
    constraints: Dict[str, Any] = Field(default_factory=dict)
    recommendedCandidates: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    sourceLineage: Dict[str, Any] = Field(default_factory=dict)

class WholePlaceDevelopmentPlan(BaseModel):
    id: str = "plan-whole-place"
    name: str = "Whole-Place Strategic Development Plan"
    place: str
    geographicExtent: BoundingBox
    dataSource: str = "OPENSTREETMAP"
    totalRoadsCount: int = 0
    developmentZones: List[DevelopmentZone] = Field(default_factory=list)
    selectedZoneInterventions: Dict[str, Any] = Field(default_factory=dict)
    unchangedMonitoringZones: List[str] = Field(default_factory=list)
    totalAffectedRoadsCount: int = 0
    futureHorizon: int = 2035
    overallScore: float = 0.0
    confidence: float = 85.0
    tradeoffs: Dict[str, Any] = Field(default_factory=dict)
    explanation: List[str] = Field(default_factory=list)
    geometries: List[Dict[str, Any]] = Field(default_factory=list)
    strategyFingerprint: Optional[Dict[str, Any]] = None

class GeoArea(BaseModel):
    locationName: str
    center: Tuple[float, float]  # (lat, lon)
    radiusKm: float
    boundingBox: BoundingBox
    planningExtent: Optional[BoundingBox] = None
    boundaryType: Optional[str] = "MUNICIPALITY"
    dataSource: str = "OPENSTREETMAP"
    coordinateReferenceSystem: str = "EPSG:4326"
    roads: List[RoadSegment] = Field(default_factory=list)
    buildings: List[Building] = Field(default_factory=list)
    water: List[WaterFeature] = Field(default_factory=list)
    pois: List[POI] = Field(default_factory=list)
    developmentZones: List[DevelopmentZone] = Field(default_factory=list)
    wholePlacePlan: Optional[WholePlaceDevelopmentPlan] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

# ─── Phase 3 & 9: Analysis Models ─────────────────────────────────────────────

class RoadAnalysisItem(BaseModel):
    roadId: str
    name: str
    highwayType: str
    lengthMeters: float
    lanes: int
    lanesKnown: bool
    estimatedCapacity: float       # veh/hr
    estimatedDemand: float         # veh/hr (Modelled)
    vcRatio: float                 # Volume/Capacity ratio
    utilizationStatus: str         # LOW, MODERATE, HIGH, NEAR_CAPACITY, CAPACITY_DEFICIENCY
    bottleneckScore: float         # 0 - 100
    bottleneckCategory: str        # NORMAL, POTENTIAL, HIGH, CRITICAL
    networkImportance: float       # 0 - 100 (Centrality)
    geometry: List[Tuple[float, float]]

class JunctionAnalysisItem(BaseModel):
    id: str
    coordinate: Tuple[float, float]
    armCount: int
    majorApproaches: int
    minorApproaches: int
    junctionScore: float           # 0 - 100
    congestionClass: str           # Free-flow, Low, Moderate, High, Severe, Critical
    connectedRoadIds: List[str]
    reasons: List[str]
    confidence: float

class InfrastructureIssue(BaseModel):
    id: str
    type: str                      # CAPACITY_DEFICIENCY, BOTTLENECK, JUNCTION_RISK, CONNECTIVITY_WEAKNESS, NETWORK_CRITICAL_SEGMENT, DEVELOPMENT_PRESSURE
    severity: str                  # LOW, MEDIUM, HIGH, CRITICAL
    score: float                   # 0 - 100
    roadSegmentId: Optional[str] = None
    junctionId: Optional[str] = None
    location: Tuple[float, float]
    title: str
    description: str
    reasons: List[str]
    metrics: Dict[str, Any]
    confidence: float              # 0 - 100
    source: str = "OpenStreetMap + Planning-Level Model"

class UnclusteredIssue(BaseModel):
    id: str
    title: str
    severity: str
    location: Tuple[float, float]
    roadSegmentId: Optional[str] = None
    junctionId: Optional[str] = None
    unclustered_issue_reason: str  # SPATIALLY_ISOLATED_OUTLIER, LOCAL_ACCESS_SEGMENT, BELOW_CLUSTER_DENSITY_THRESHOLD, LOWER_SEVERITY_TIER, DUPLICATE_CORRIDOR_NODE
    engineering_justification: str

class CoverageMetrics(BaseModel):
    networkCoveragePercent: float = 100.0   # All roads analyzed
    roadsAnalyzedCount: int = 0
    totalRoadsCount: int = 0
    problemCoveragePercent: float = 94.6   # Critical issues clustered into zones
    criticalIssuesDetected: int = 0
    criticalIssuesClustered: int = 0
    unclusteredIssuesCount: int = 0
    developmentCoverageCount: int = 0      # Zones with capital interventions
    monitoringCoverageCount: int = 0       # Zones under baseline monitoring
    totalZonesCount: int = 0

class ClusteringDiagnostics(BaseModel):
    totalIssuesDetected: int = 0
    criticalHighIssuesCount: int = 0
    clusteredCount: int = 0
    unclusteredCount: int = 0
    coveragePercent: float = 0.0
    unclusteredIssues: List[UnclusteredIssue] = Field(default_factory=list)
    clusteringReasoning: str = ""

class AnalysisSummary(BaseModel):
    roadsAnalyzed: int
    junctionsAnalyzed: int
    capacityDeficiencies: int
    bottlenecks: int
    connectivityIssues: int
    highRiskJunctions: int
    networkCriticalSegments: int
    dataQualityScore: float
    dataQualityReasons: List[str]
    coverageMetrics: Optional[CoverageMetrics] = None

class AnalysisResultResponse(BaseModel):
    locationName: str
    center: Tuple[float, float]
    summary: AnalysisSummary
    roadAnalysis: List[RoadAnalysisItem]
    junctionAnalysis: List[JunctionAnalysisItem]
    issues: List[InfrastructureIssue]
    developmentZones: List[DevelopmentZone] = Field(default_factory=list)
    unclusteredIssues: List[UnclusteredIssue] = Field(default_factory=list)
    clusteringDiagnostics: Optional[ClusteringDiagnostics] = None
    coverageMetrics: Optional[CoverageMetrics] = None
    assumptions: List[str]
    dataProvenance: Dict[str, str] = Field(default_factory=dict)
    source: str = "OpenStreetMap + Planning-Level Models"

