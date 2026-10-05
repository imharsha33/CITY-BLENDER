// Phase 7 — RoadVision Digital Twin & Construction Transformation Types

import type { GeoAreaResponse, LocationResult } from './geo';
import type { AnalysisResultResponse } from './analysis';
import type { CandidatePlan } from './planning';
import type { ForecastResponse } from './forecasting';
import type { InfrastructureStrategy, OptimizationResponse } from './optimization';

export type TransformationState =
  | 'EXISTING'
  | 'ANALYSIS'
  | 'PROPOSED'
  | 'CONSTRUCTION'
  | 'COMPLETED'
  | 'FUTURE';

export type ComparisonMode = 'EXISTING' | 'PROPOSED' | 'COMPARE';

export type InterventionCategory =
  | 'ROAD_WIDENING'
  | 'JUNCTION_IMPROVEMENT'
  | 'GRADE_SEPARATION'
  | 'CONNECTOR_ROAD'
  | 'LANE_RECONFIGURATION'
  | 'NO_MAJOR_INTERVENTION'
  | 'COMBINED';

export interface ConstructionPhaseDefinition {
  id: string;
  step: number; // 1 to 13
  name: string;
  action: string;
  equipment: string[];
  startProgress: number; // 0.0 to 1.0
  endProgress: number;   // 0.0 to 1.0
}

export const CONSTRUCTION_PHASES: ConstructionPhaseDefinition[] = [
  {
    id: 'survey',
    step: 1,
    name: 'SURVEY & STAKING',
    action: 'Geodetic survey markers placed along affected alignment boundaries.',
    equipment: ['Survey stakes', 'Theodolite / Total station markers'],
    startProgress: 0.0,
    endProgress: 0.08,
  },
  {
    id: 'preparation',
    step: 2,
    name: 'SITE PREPARATION',
    action: 'Work-zone demarcation, safety cones, and traffic segregation barriers installed.',
    equipment: ['Traffic cones', 'Jersey safety barriers', 'Traffic control signage'],
    startProgress: 0.08,
    endProgress: 0.16,
  },
  {
    id: 'utility',
    step: 3,
    name: 'UTILITY / CLEARANCE CONCEPT',
    action: 'Subsurface utility clearance corridor established and exploratory trenching.',
    equipment: ['Excavator', 'Utility marker flags'],
    startProgress: 0.16,
    endProgress: 0.24,
  },
  {
    id: 'earthwork',
    step: 4,
    name: 'EARTHWORK & EMBANKMENT',
    action: 'Grading, cut-and-fill slope formation, and spoil mound stockpiling.',
    equipment: ['Heavy excavator', 'Dump trucks', 'Earth stockpiles'],
    startProgress: 0.24,
    endProgress: 0.32,
  },
  {
    id: 'drainage',
    step: 5,
    name: 'DRAINAGE & CULVERTS',
    action: 'Longitudinal storm-water drains and cross-drainage culverts constructed.',
    equipment: ['Precast culverts', 'Drainage channels'],
    startProgress: 0.32,
    endProgress: 0.40,
  },
  {
    id: 'foundation',
    step: 6,
    name: 'FOUNDATION',
    action: 'Subgrade stabilization or pier deep foundations/piles positioned.',
    equipment: ['Concrete mixer', 'Drilled shaft / foundation pads'],
    startProgress: 0.40,
    endProgress: 0.48,
  },
  {
    id: 'structure',
    step: 7,
    name: 'STRUCTURE',
    action: 'Structural pier columns, flyover deck segments, or widened sub-base installed.',
    equipment: ['Support piers', 'Girder deck spans / road sub-grade'],
    startProgress: 0.48,
    endProgress: 0.56,
  },
  {
    id: 'road_base',
    step: 8,
    name: 'ROAD BASE (AGGREGATE)',
    action: 'Granular sub-base (GSB) and wet mix macadam compacted over corridor.',
    equipment: ['Compaction roller', 'Crushed rock aggregate layer'],
    startProgress: 0.56,
    endProgress: 0.64,
  },
  {
    id: 'pavement',
    step: 9,
    name: 'PAVEMENT (ASPHALT)',
    action: 'Dense bituminous macadam and asphalt concrete surface wearing course laid.',
    equipment: ['Asphalt paving roller', 'Bituminous wearing course'],
    startProgress: 0.64,
    endProgress: 0.72,
  },
  {
    id: 'lanes_median',
    step: 10,
    name: 'LANES & MEDIAN',
    action: 'Concrete crash barrier median and thermoplastic reflective lane striping.',
    equipment: ['Raised concrete median', 'Road striping applicator'],
    startProgress: 0.72,
    endProgress: 0.80,
  },
  {
    id: 'lighting',
    step: 11,
    name: 'STREETLIGHTS & SIGNAGE',
    action: 'Illumination luminaires, gantry road signs, and electrical conduits mounted.',
    equipment: ['Median luminaires', 'Road safety signs'],
    startProgress: 0.80,
    endProgress: 0.88,
  },
  {
    id: 'landscaping',
    step: 12,
    name: 'LANDSCAPING & VERGES',
    action: 'Erosion control vegetation, green medians, and curbside tree planting.',
    equipment: ['Median greenery', 'Roadside verge landscaping'],
    startProgress: 0.88,
    endProgress: 0.96,
  },
  {
    id: 'completed',
    step: 13,
    name: 'COMPLETION & HANDOVER',
    action: 'Machinery demobilized, work zones demarked, infrastructure operational.',
    equipment: ['Operational roadway', 'Finished infrastructure'],
    startProgress: 0.96,
    endProgress: 1.0,
  },
];

export interface RoadVisionTransformationContext {
  location: LocationResult | null;
  geoArea: GeoAreaResponse | null;
  source: string;
  analysis: AnalysisResultResponse | null;
  selectedPlan: CandidatePlan | null;
  forecast: ForecastResponse | null;
  optimization: OptimizationResponse | null;
  selectedStrategy: InfrastructureStrategy | null;
  transformationState: TransformationState;
  constructionPhaseIndex: number;
  constructionProgress: number;
  futureHorizon: number; // 2030, 2035, 2040
  comparisonMode: ComparisonMode;
}
