from typing import List, Optional, Tuple, Dict, Any
from pydantic import BaseModel, Field

class ProposedRoadSegment(BaseModel):
    id: str
    name: str
    type: str  # existing_widened, flyover_deck, flyover_ramp, roundabout, connector, underpass, reconfigured_lane
    geometry: List[Tuple[float, float]]  # [[lat, lon], ...]
    lanes: int
    widthMeters: float
    isElevated: bool = False
    isDepressed: bool = False
    elevationMeters: float = 0.0  # deck elevation or depression
    sourceRoadId: Optional[str] = None
    curbType: str = "standard"
    hasMedian: bool = False
    medianWidth: float = 0.0

class PlanMetrics(BaseModel):
    trafficImprovement: float      # 0 - 100
    futureCapacityGain: float      # 0 - 100
    connectivityGain: float        # 0 - 100
    safetyPotential: float         # 0 - 100
    landImpact: float              # 0 - 100 (lower score = less impact / better)
    buildingImpact: float          # 0 - 100 (lower score = fewer building conflicts / better)
    environmentalImpact: float     # 0 - 100 (lower score = less eco conflict / better)
    constructionDisruption: float  # 0 - 100 (lower score = less disruption / better)
    planningCostLevel: str         # NEGLIGIBLE, LOW, MODERATE, HIGH, VERY_HIGH
    costScore: float               # 0 - 100 (lower score = cheaper / better)
    emergencyAccessibility: float  # 0 - 100
    implementationComplexity: float# 0 - 100 (lower score = simpler / better)
    dataConfidence: float          # 0 - 100
    overallScore: float            # 0 - 100 (weighted sum based on active priority)

from models import DevelopmentZone, WholePlaceDevelopmentPlan

class RejectedAlternative(BaseModel):
    interventionType: str
    name: str
    feasibility: str                 # FEASIBLE, CONDITIONAL, INFEASIBLE
    score: float
    majorConstraint: str
    reasonForRejection: str
    evidenceSummary: str

class CandidatePlan(BaseModel):
    id: str
    name: str
    interventionType: str          # ROAD_WIDENING, LANE_RECONFIGURATION, MEDIAN_MODIFICATION, JUNCTION_IMPROVEMENT, INTERSECTION_REDESIGN, GRADE_SEPARATION, UNDERPASS, BYPASS, CONNECTOR_ROAD, PARALLEL_RELIEF, COMBINED_INTERVENTION, NO_MAJOR_INTERVENTION
    status: str                    # FEASIBLE, CONDITIONAL, INFEASIBLE
    feasibilityReason: str
    problemAddressed: str
    whyThisLocation: str
    proposedGeometry: List[ProposedRoadSegment] = Field(default_factory=list)
    sourceRoadIds: List[str] = Field(default_factory=list)
    affectedJunctionIds: List[str] = Field(default_factory=list)
    targetedIssueIds: List[str] = Field(default_factory=list)
    zoneId: Optional[str] = None
    zoneName: Optional[str] = None
    metrics: PlanMetrics
    keyBenefits: List[str] = Field(default_factory=list)
    majorTradeoffs: List[str] = Field(default_factory=list)
    constraintsAvoided: List[str] = Field(default_factory=list)
    buildingConflictsCount: int = 0
    waterIntersectsCount: int = 0
    proposedLengthMeters: float = 0.0
    costCategory: str = "MODERATE"
    confidence: float = 85.0
    explanation: str
    # Phase 9: Evidence-driven intelligence
    evidence: Dict[str, Any] = Field(default_factory=dict)
    rejectedAlternatives: List[RejectedAlternative] = Field(default_factory=list)
    whyThisIntervention: str = ""
    reasoning: str = ""
    geographicFeasibility: Dict[str, Any] = Field(default_factory=dict)
    dataProvenance: Dict[str, str] = Field(default_factory=dict)


class ProblemSummary(BaseModel):
    primaryDeficiency: str
    severity: str
    evidencePoints: List[str]
    criticalCorridors: List[str]
    criticalJunctions: List[str]
    keyConstraints: List[str]
    planningRequirement: str
    interventionRecommended: bool

class PlanningRequest(BaseModel):
    geo_area: Dict[str, Any]
    analysis: Dict[str, Any]
    priority: str = "balanced"  # balanced, traffic_reduction, min_land_acquisition, min_cost, max_capacity, min_disruption

class PlanningResponse(BaseModel):
    locationName: str
    center: Tuple[float, float]
    selectedPriority: str
    priorityWeights: Dict[str, float]
    problemSummary: ProblemSummary
    candidates: List[CandidatePlan]
    recommendedPlanId: str
    developmentZones: List[DevelopmentZone] = Field(default_factory=list)
    wholePlacePlan: Optional[WholePlaceDevelopmentPlan] = None
    confidence: float
    dataProvenance: Dict[str, str]
    disclaimer: str
