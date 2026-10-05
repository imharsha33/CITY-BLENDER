"""
RoadVision Phase 5: Transparent Deterministic Baseline Forecasting Engine
"""
from typing import Dict, List, Any
from .models import ForecastRoadResult, UncertaintyRange, ForecastScenario

def forecast_road_baseline(
    features: Dict[str, Any],
    scenario: ForecastScenario,
    baseline_year: int,
    forecast_year: int
) -> ForecastRoadResult:
    """
    Computes deterministic planning-level forecast demand and V/C for a road segment.
    """
    dt = max(0, forecast_year - baseline_year)
    base_rate = scenario.annual_growth_rate

    # Local amplification derived from network centrality and spatial built-up intensity
    centrality = features.get("centrality", 0.3)
    built_up = features.get("built_up_intensity", 0.2)
    hierarchy = features.get("hierarchy_weight", 1.0)

    # Amplification multiplier: high-centrality primary corridors attract higher trip growth
    amplification = 1.0 + (centrality * 0.22) + (built_up * 0.18) + ((hierarchy - 1.0) * 0.15)
    effective_rate = base_rate * amplification

    # Compound growth formula
    growth_multiplier = (1.0 + effective_rate) ** dt
    current_demand = features.get("estimated_demand", 1000.0)
    current_capacity = features.get("capacity", 1800.0)
    current_vc = features.get("current_vc", current_demand / max(1.0, current_capacity))

    forecast_demand = round(current_demand * growth_multiplier, 1)
    forecast_capacity = current_capacity # baseline capacity remains constant unless intervened
    forecast_vc = round(forecast_demand / max(1.0, forecast_capacity), 3)

    growth_percentage = round((growth_multiplier - 1.0) * 100.0, 1)

    # Status classification against civil engineering thresholds
    if forecast_vc >= 1.20:
        status = "CRITICAL_CAPACITY_PRESSURE"
    elif forecast_vc >= 1.00:
        status = "CONGESTION_RISK"
    elif forecast_vc >= 0.80:
        status = "WATCH"
    else:
        status = "NORMAL"

    # Uncertainty range (diverges over forecast horizon)
    uncertainty_spread = (dt * 0.012) * current_vc
    lower_vc = max(0.1, round(forecast_vc - uncertainty_spread, 3))
    upper_vc = round(forecast_vc + uncertainty_spread, 3)

    # Confidence rating based on data depth
    if features.get("is_current_bottleneck"):
        confidence = "HIGH"
    elif features.get("nearby_buildings_count", 0) > 10:
        confidence = "MEDIUM"
    else:
        confidence = "MEDIUM"

    explanation = (
        f"Demand projected to grow by {growth_percentage}% from {baseline_year} to {forecast_year} "
        f"under the {scenario.name} assumption (base rate {round(base_rate*100, 1)}%/yr, "
        f"amplified to {round(effective_rate*100, 2)}%/yr by centrality {round(centrality, 2)} "
        f"and surrounding built-up intensity {round(built_up, 2)})."
    )

    return ForecastRoadResult(
        road_id=features["road_id"],
        name=features["name"],
        year=forecast_year,
        scenario=scenario.id,
        current_demand=current_demand,
        forecast_demand=forecast_demand,
        current_capacity=current_capacity,
        forecast_capacity=forecast_capacity,
        current_vc=current_vc,
        forecast_vc=forecast_vc,
        growth_percentage=growth_percentage,
        status=status,
        confidence=confidence,
        uncertainty_range=UncertaintyRange(lower=lower_vc, central=forecast_vc, upper=upper_vc),
        model_used="Scenario Baseline (Deterministic Compound Growth)",
        explanation=explanation
    )
