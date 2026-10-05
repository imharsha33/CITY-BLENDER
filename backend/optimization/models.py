"""
RoadVision Phase 6: Infrastructure Strategy Optimization Data Models
"""
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class ObjectiveVector(BaseModel):
    traffic_improvement: float # 0 - 100
    future_capacity: float # 0 - 100
    connectivity: float # 0 - 100
    safety: float # 0 - 100
    land_impact: float # 0 - 100 (lower impact is better, normalized)
    building_impact: float # 0 - 100 (lower impact is better, normalized)
    environmental_impact: float # 0 - 100 (lower impact is better, normalized)
    disruption: float # 0 - 100 (lower disruption is better, normalized)
    cost_score: float # 0 - 100 (lower cost is better, normalized)
    emergency_access: float # 0 - 100
    complexity: float # 0 - 100 (lower complexity is better, normalized)
    future_resilience: float # 0 - 100
    confidence: float # 0 - 100

class ScenarioPerformanceCell(BaseModel):
    scenario_id: str
    scenario_name: str
    score: float # 0 - 100
    network_avg_vc_2035: float
    bottlenecks_remaining: int
    is_resilient: bool

class InfrastructureStrategy(BaseModel):
    id: str
    name: str
    intervention_ids: List[str]
    intervention_names: List[str]
    intervention_types: List[str]
    feasibility: str # COMPATIBLE, CONDITIONAL, INCOMPATIBLE
    compatibility_reason: str
    is_pareto_optimal: bool
    combined_geometries: List[Dict[str, Any]]
    affected_road_ids: List[str]
    affected_junction_ids: List[str]
    zone_interventions: Dict[str, str] = Field(default_factory=dict)
    development_zones_covered: List[str] = Field(default_factory=list)
    objective_scores: ObjectiveVector
    overall_score: float # 0 - 100 weighted by selected mode
    robustness_score: float # 0 - 100 across scenarios
    worst_case_score: float # min score across all scenarios
    effective_planning_horizon: int # estimated resilient year e.g. 2038
    cost_category: str # VERY_LOW, LOW, MEDIUM, HIGH, VERY_HIGH
    land_impact_category: str # LOW, MEDIUM, HIGH, VERY_HIGH
    environmental_impact_category: str # LOW, MEDIUM, HIGH, VERY_HIGH
    disruption_category: str # LOW, MEDIUM, HIGH, VERY_HIGH
    confidence: str # LOW, MEDIUM, HIGH
    confidence_score: float
    key_tradeoffs: List[str]
    rejection_reasons: List[str] # Why this strategy wasn't chosen if not recommended
    scenario_matrix: List[ScenarioPerformanceCell]

class OptimizationRequest(BaseModel):
    geo_area: Dict[str, Any]
    analysis: Dict[str, Any]
    plans: List[Dict[str, Any]] = Field(default_factory=list)
    forecasts: Optional[Dict[str, Any]] = None
    optimization_mode: str = "balanced" # balanced, traffic_reduction, min_cost, min_land_acquisition, max_resilience, min_disruption, max_safety, environmental_priority
    max_combination_size: int = 4
    budget_constraint: Optional[str] = None

class OptimizationResponse(BaseModel):
    location_name: str
    optimization_mode: str
    mode_description: str
    objective_weights: Dict[str, float]
    total_strategies_evaluated: int
    feasible_strategies_count: int
    pareto_strategies: List[InfrastructureStrategy]
    all_strategies: List[InfrastructureStrategy]
    recommended_strategy: InfrastructureStrategy
    whole_place_plan: Optional[Dict[str, Any]] = None
    development_zones: List[Dict[str, Any]] = Field(default_factory=list)
    why_recommended: List[str]
    why_not_alternatives: Dict[str, List[str]] # strategy_id -> list of why not
    scenario_comparison_matrix: Dict[str, Dict[str, float]] # strategy_id -> {scenario_id: score}
    strategy_fingerprint: Optional[Dict[str, Any]] = None
    data_provenance: Dict[str, str]
    disclaimer: str

