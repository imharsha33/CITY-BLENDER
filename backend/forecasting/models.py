"""
RoadVision Phase 5: Future Demand & Infrastructure Forecasting Data Models
"""
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class ForecastScenario(BaseModel):
    id: str
    name: str
    description: str
    annual_growth_rate: float # e.g. 0.025 for 2.5% per annum
    development_multiplier: float # multiplier for high-density areas
    assumptions: List[str]

class UncertaintyRange(BaseModel):
    lower: float
    central: float
    upper: float

class ForecastRoadResult(BaseModel):
    road_id: str
    name: str
    year: int
    scenario: str
    current_demand: float
    forecast_demand: float
    current_capacity: float
    forecast_capacity: float
    current_vc: float
    forecast_vc: float
    growth_percentage: float
    status: str # NORMAL, WATCH, CONGESTION_RISK, CRITICAL_CAPACITY_PRESSURE
    confidence: str # LOW, MEDIUM, HIGH
    uncertainty_range: UncertaintyRange
    model_used: str
    explanation: str

class FutureBottleneck(BaseModel):
    id: str
    road_id: str
    road_name: str
    junction_id: Optional[str] = None
    year: int
    scenario: str
    severity: str # WATCH, HIGH, CRITICAL
    current_vc: float
    forecast_vc: float
    location: List[float] # [lat, lon]
    confidence: str
    evidence: List[str]
    recommended_intervention_type: str

class DevelopmentPressureArea(BaseModel):
    area_id: str
    name: str
    center: List[float] # [lat, lon]
    radius_meters: float
    pressure_level: str # LOW, MEDIUM, HIGH
    indicators: List[str]
    building_density_sqkm: float
    poi_count: int
    confidence: float
    explanation: str

class PlanScenarioPerformance(BaseModel):
    plan_id: str
    plan_name: str
    intervention_type: str
    year: int
    scenario: str
    baseline_network_avg_vc: float
    post_intervention_avg_vc: float
    vc_reduction_pct: float
    bottlenecks_resolved_count: int
    bottlenecks_remaining_count: int
    effective_planning_horizon: int # estimated year when V/C reaches congestion threshold
    is_effective: bool
    simulated_metrics: Dict[str, float]
    status_label: str

class HorizonSummary(BaseModel):
    year: int
    scenario: str
    total_demand: float
    demand_growth_pct: float
    network_avg_vc: float
    critical_bottlenecks_count: int
    watch_roads_count: int
    recommended_plan_id: Optional[str] = None
    recommended_plan_name: Optional[str] = None
    recommended_plan_reason: Optional[str] = None

class ForecastRequest(BaseModel):
    geo_area: Dict[str, Any]
    analysis: Dict[str, Any]
    plans: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    baseline_year: int = 2026
    forecast_years: List[int] = Field(default_factory=lambda: [2030, 2035, 2040])
    scenarios: Optional[List[str]] = Field(default_factory=lambda: ['low_growth', 'moderate_growth', 'high_growth', 'rapid_development'])
    active_scenario: str = 'moderate_growth'
    active_year: int = 2035
    model: str = 'auto'
    historical_data: Optional[List[Dict[str, Any]]] = None

class ForecastResponse(BaseModel):
    location_name: str
    baseline_year: int
    forecast_years: List[int]
    active_scenario: str
    active_year: int
    available_scenarios: List[ForecastScenario]
    model_selected: str
    model_selection_reason: str
    horizon_summaries: List[HorizonSummary]
    road_forecasts: List[ForecastRoadResult]
    future_bottlenecks: List[FutureBottleneck]
    development_pressure_areas: List[DevelopmentPressureArea]
    plan_performances: List[PlanScenarioPerformance]
    confidence: Dict[str, Any]
    data_provenance: Dict[str, str]
    disclaimer: str
