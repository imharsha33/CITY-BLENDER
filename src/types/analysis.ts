import type { DevelopmentZone } from './geo';
export interface RoadAnalysisItem {
  roadId: string;
  name: string;
  highwayType: string;
  lengthMeters: number;
  lanes: number;
  lanesKnown: boolean;
  estimatedCapacity: number;
  estimatedDemand: number;
  vcRatio: number;
  utilizationStatus: 'LOW' | 'MODERATE' | 'HIGH' | 'NEAR_CAPACITY' | 'CAPACITY_DEFICIENCY';
  bottleneckScore: number;
  bottleneckCategory: 'NORMAL' | 'POTENTIAL' | 'HIGH' | 'CRITICAL';
  networkImportance: number;
  geometry: [number, number][];
}

export interface JunctionAnalysisItem {
  id: string;
  coordinate: [number, number];
  armCount: number;
  majorApproaches: number;
  minorApproaches: number;
  junctionScore: number;
  congestionClass: string;
  connectedRoadIds: string[];
  reasons: string[];
  confidence: number;
}

export type IssueType =
  | 'CAPACITY_DEFICIENCY'
  | 'BOTTLENECK'
  | 'JUNCTION_RISK'
  | 'CONNECTIVITY_WEAKNESS'
  | 'NETWORK_CRITICAL_SEGMENT'
  | 'DEVELOPMENT_PRESSURE';

export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface InfrastructureIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  score: number;
  roadSegmentId?: string | null;
  junctionId?: string | null;
  location: [number, number]; // [lat, lon]
  title: string;
  description: string;
  reasons: string[];
  metrics: {
    vcRatio?: number;
    estimatedDemand?: number;
    estimatedCapacity?: number;
    lanes?: number;
    bottleneckScore?: number;
    networkImportance?: number;
    armCount?: number;
    junctionScore?: number;
    congestionClass?: string;
    [key: string]: unknown;
  };
  confidence: number;
  source: string;
}

export interface UnclusteredIssue {
  id: string;
  title: string;
  severity: string;
  location: [number, number];
  roadSegmentId?: string | null;
  junctionId?: string | null;
  unclustered_issue_reason: string;
  engineering_justification: string;
}

export interface CoverageMetrics {
  networkCoveragePercent: number;
  roadsAnalyzedCount: number;
  totalRoadsCount: number;
  problemCoveragePercent: number;
  criticalIssuesDetected: number;
  criticalIssuesClustered: number;
  unclusteredIssuesCount: number;
  developmentCoverageCount: number;
  monitoringCoverageCount: number;
  totalZonesCount: number;
}

export interface ClusteringDiagnostics {
  totalIssuesDetected: number;
  criticalHighIssuesCount: number;
  clusteredCount: number;
  unclusteredCount: number;
  coveragePercent: number;
  unclusteredIssues: UnclusteredIssue[];
  clusteringReasoning: string;
}

export interface AnalysisSummary {
  roadsAnalyzed: number;
  junctionsAnalyzed: number;
  capacityDeficiencies: number;
  bottlenecks: number;
  connectivityIssues: number;
  highRiskJunctions: number;
  networkCriticalSegments: number;
  dataQualityScore: number;
  dataQualityReasons: string[];
  coverageMetrics?: CoverageMetrics;
}

export interface AnalysisResultResponse {
  locationName: string;
  center: [number, number];
  summary: AnalysisSummary;
  roadAnalysis: RoadAnalysisItem[];
  junctionAnalysis: JunctionAnalysisItem[];
  issues: InfrastructureIssue[];
  developmentZones?: DevelopmentZone[];
  unclusteredIssues?: UnclusteredIssue[];
  clusteringDiagnostics?: ClusteringDiagnostics;
  coverageMetrics?: CoverageMetrics;
  assumptions: string[];
  dataProvenance?: Record<string, string>;
  source: string;
}

export type AnalysisFilterType = 'ALL' | 'BOTTLENECK' | 'CAPACITY' | 'JUNCTION' | 'CONNECTIVITY';

