export type OptimizationMode =
  | 'balanced'
  | 'traffic_reduction'
  | 'min_cost'
  | 'min_land_acquisition'
  | 'max_resilience'
  | 'min_disruption'
  | 'max_safety'
  | 'environmental_priority';

export interface ObjectiveVector {
  traffic_improvement: number;
  future_capacity: number;
  connectivity: number;
  safety: number;
  land_impact: number;
  building_impact: number;
  environmental_impact: number;
  disruption: number;
  cost_score: number;
  emergency_access: number;
  complexity: number;
  future_resilience: number;
  confidence: number;
}

export interface ScenarioPerformanceCell {
  scenario_id: string;
  scenario_name: string;
  score: number;
  network_avg_vc_2035: number;
  bottlenecks_remaining: number;
  is_resilient: boolean;
}

export interface InfrastructureStrategy {
  id: string;
  name: string;
  intervention_ids: string[];
  intervention_names: string[];
  intervention_types: string[];
  feasibility: 'COMPATIBLE' | 'CONDITIONAL' | 'INCOMPATIBLE' | string;
  compatibility_reason: string;
  is_pareto_optimal: boolean;
  combined_geometries: any[];
  affected_road_ids: string[];
  affected_junction_ids: string[];
  zone_interventions?: Record<string, string>;
  development_zones_covered?: string[];
  objective_scores: ObjectiveVector;
  overall_score: number;
  robustness_score: number;
  worst_case_score: number;
  effective_planning_horizon: number;
  cost_category: string;
  land_impact_category: string;
  environmental_impact_category: string;
  disruption_category: string;
  confidence: string;
  confidence_score: number;
  key_tradeoffs: string[];
  rejection_reasons: string[];
  scenario_matrix: ScenarioPerformanceCell[];
}

export interface OptimizationResponse {
  location_name: string;
  optimization_mode: string;
  mode_description: string;
  objective_weights: Record<string, number>;
  total_strategies_evaluated: int;
  feasible_strategies_count: int;
  pareto_strategies: InfrastructureStrategy[];
  all_strategies: InfrastructureStrategy[];
  recommended_strategy: InfrastructureStrategy;
  whole_place_plan?: any | null;
  development_zones?: any[];
  why_recommended: string[];
  why_not_alternatives: Record<string, string[]>;
  scenario_comparison_matrix: Record<string, Record<string, number>>;
  strategy_fingerprint?: Record<string, any>;
  data_provenance: Record<string, string>;
  disclaimer: string;
}


type int = number;
