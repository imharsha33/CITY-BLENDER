export type PlanningPriority =
  | 'balanced'
  | 'traffic_reduction'
  | 'min_land_acquisition'
  | 'min_cost'
  | 'max_capacity'
  | 'min_disruption';

export type PlanningViewState = 'EXISTING' | 'PROPOSED' | 'COMPARE' | 'STRATEGY' | 'existing' | 'proposed' | 'compare' | 'strategy';

export type InterventionType =
  | 'ROAD_WIDENING'
  | 'LANE_RECONFIGURATION'
  | 'MEDIAN_MODIFICATION'
  | 'JUNCTION_IMPROVEMENT'
  | 'INTERSECTION_REDESIGN'
  | 'GRADE_SEPARATION'
  | 'UNDERPASS'
  | 'BYPASS'
  | 'RING_ROAD_SEGMENT'
  | 'CONNECTOR_ROAD'
  | 'PARALLEL_RELIEF'
  | 'COMBINED_INTERVENTION'
  | 'NO_MAJOR_INTERVENTION';

export interface ProposedRoadSegment {
  id: string;
  name: string;
  type: string;
  geometry: [number, number][]; // [[lat, lon], ...]
  lanes: number;
  widthMeters: float;
  isElevated: boolean;
  isDepressed: boolean;
  elevationMeters: number;
  sourceRoadId?: string | null;
  curbType: string;
  hasMedian: boolean;
  medianWidth: number;
}

type float = number;

export interface PlanMetrics {
  trafficImprovement: number;
  futureCapacityGain: number;
  capacityGain?: number;
  connectivityGain: number;
  safetyPotential: number;
  safetyScore?: number;
  landImpact: number;
  buildingImpact: number;
  environmentalImpact: number;
  constructionDisruption: number;
  disruption?: number;
  planningCostLevel: string;
  costScore: number;
  emergencyAccessibility: number;
  implementationComplexity: number;
  dataConfidence: number;
  overallScore: number;
}

export interface RejectedAlternative {
  interventionType: string;
  name: string;
  feasibility: 'FEASIBLE' | 'CONDITIONAL' | 'INFEASIBLE' | string;
  score: number;
  majorConstraint: string;
  reasonForRejection: string;
  evidenceSummary: string;
}

export interface CandidatePlan {
  id: string;
  name: string;
  interventionType: InterventionType | string;
  type?: string;
  status: 'FEASIBLE' | 'CONDITIONAL' | 'INFEASIBLE';
  feasibilityReason: string;
  problemAddressed: string;
  whyThisLocation: string;
  proposedGeometry: ProposedRoadSegment[];
  sourceRoadIds: string[];
  affectedJunctionIds: string[];
  targetedIssueIds: string[];
  zoneId?: string;
  zoneName?: string;
  metrics: PlanMetrics;
  keyBenefits: string[];
  benefits?: string[];
  majorTradeoffs: string[];
  tradeoffs?: string[];
  constraintsAvoided: string[];
  constraints?: string[];
  buildingConflictsCount: number;
  waterIntersectsCount: number;
  proposedLengthMeters: number;
  corridorLengthMeters?: number;
  proposedLanes?: number;
  costCategory: string;
  confidence: number;
  explanation: string | string[];
  // Phase 9: Evidence-driven intelligence
  evidence?: Record<string, any>;
  rejectedAlternatives?: RejectedAlternative[];
  whyThisIntervention?: string;
  reasoning?: string;
  geographicFeasibility?: Record<string, any>;
  dataProvenance?: Record<string, string>;
}


export interface ProblemSummary {
  primaryDeficiency: string;
  mainProblem?: string;
  severity: string;
  evidencePoints: string[];
  criticalCorridors: string[];
  criticalJunctions: string[];
  keyConstraints: string[];
  planningRequirement: string;
  interventionRecommended: boolean;
}

export interface PlanningResponse {
  locationName: string;
  center: [number, number];
  selectedPriority: PlanningPriority;
  priorityWeights: Record<string, number>;
  problemSummary: ProblemSummary;
  candidates: CandidatePlan[];
  recommendedPlanId: string;
  recommendedPlan?: CandidatePlan | null;
  developmentZones?: any[];
  wholePlacePlan?: any | null;
  confidence: number;
  dataProvenance: Record<string, string>;
  provenance?: { source: string };
  disclaimer: string;
}
