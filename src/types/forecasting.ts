export interface ForecastScenario {
  id: string;
  name: string;
  description: string;
  annual_growth_rate: number;
  development_multiplier: number;
  assumptions: string[];
}

export interface UncertaintyRange {
  lower: number;
  central: number;
  upper: number;
}

export interface ForecastRoadResult {
  road_id: string;
  name: string;
  year: number;
  scenario: string;
  current_demand: number;
  forecast_demand: number;
  current_capacity: number;
  forecast_capacity: number;
  current_vc: number;
  forecast_vc: number;
  growth_percentage: number;
  status: 'NORMAL' | 'WATCH' | 'CONGESTION_RISK' | 'CRITICAL_CAPACITY_PRESSURE' | string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  uncertainty_range: UncertaintyRange;
  model_used: string;
  explanation: string;
}

export interface FutureBottleneck {
  id: string;
  road_id: string;
  road_name: string;
  junction_id?: string | null;
  year: number;
  scenario: string;
  severity: 'WATCH' | 'HIGH' | 'CRITICAL' | string;
  current_vc: number;
  forecast_vc: number;
  location: [number, number]; // [lat, lon]
  confidence: string;
  evidence: string[];
  recommended_intervention_type: string;
}

export interface DevelopmentPressureArea {
  area_id: string;
  name: string;
  center: [number, number]; // [lat, lon]
  radius_meters: number;
  pressure_level: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  indicators: string[];
  building_density_sqkm: number;
  poi_count: number;
  confidence: number;
  explanation: string;
}

export interface PlanScenarioPerformance {
  plan_id: string;
  plan_name: string;
  intervention_type: string;
  year: number;
  scenario: string;
  baseline_network_avg_vc: number;
  post_intervention_avg_vc: number;
  vc_reduction_pct: number;
  bottlenecks_resolved_count: number;
  bottlenecks_remaining_count: number;
  effective_planning_horizon: number;
  is_effective: boolean;
  simulated_metrics: Record<string, number>;
  status_label: string;
}

export interface HorizonSummary {
  year: number;
  scenario: string;
  total_demand: number;
  demand_growth_pct: number;
  network_avg_vc: number;
  critical_bottlenecks_count: number;
  watch_roads_count: number;
  recommended_plan_id?: string | null;
  recommended_plan_name?: string | null;
  recommended_plan_reason?: string | null;
}

export interface ForecastResponse {
  location_name: string;
  baseline_year: number;
  forecast_years: number[];
  active_scenario: string;
  active_year: number;
  available_scenarios: ForecastScenario[];
  model_selected: string;
  model_selection_reason: string;
  horizon_summaries: HorizonSummary[];
  road_forecasts: ForecastRoadResult[];
  future_bottlenecks: FutureBottleneck[];
  development_pressure_areas: DevelopmentPressureArea[];
  plan_performances: PlanScenarioPerformance[];
  confidence: {
    overall_confidence: string;
    score: number;
    empirical_traffic_data_available: boolean;
    spatial_features_count: number;
    notes: string;
  };
  data_provenance: Record<string, string>;
  disclaimer: string;
}
