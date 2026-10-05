"""
RoadVision Phase 5: Master Future Forecasting & Infrastructure Planning Engine
"""
from typing import Dict, Any, List
from .models import (
    ForecastRequest,
    ForecastResponse,
    ForecastRoadResult,
    FutureBottleneck,
    HorizonSummary,
    PlanScenarioPerformance
)
from .scenarios import get_scenario, get_all_scenarios
from .features import extract_road_features
from .baseline import forecast_road_baseline
from .ml_forecasting import check_model_suitability
from .development_pressure import compute_development_pressure
from .future_network import analyze_future_network
from .plan_simulation import simulate_plan_future_performance

STATUTORY_DISCLAIMER = (
    "RoadVision future forecasts are planning-level scenario estimates, not guaranteed predictions. "
    "Results depend on the quality of geographic, demographic, traffic and development data and should "
    "not replace professional transportation forecasting, traffic studies, land-use planning, "
    "engineering analysis or statutory planning processes."
)

def run_forecasting_pipeline(request: ForecastRequest) -> ForecastResponse:
    """
    Executes end-to-end future traffic demand, bottleneck prediction, development pressure,
    and plan simulation across all configured horizons and scenarios.
    """
    geo_area = request.geo_area
    analysis = request.analysis
    plans = request.plans or []

    location_name = geo_area.get("locationName", "Selected Geographic Area")
    center = geo_area.get("center", [8.7379, 76.7163])
    roads = geo_area.get("roads", [])
    buildings = geo_area.get("buildings", [])
    pois = geo_area.get("pois", [])
    junctions = geo_area.get("junctions", [])

    baseline_year = request.baseline_year
    forecast_years = request.forecast_years or [2030, 2035, 2040]
    active_scenario_id = request.active_scenario or "moderate_growth"
    active_year = request.active_year or 2035

    scenario = get_scenario(active_scenario_id)
    all_scenarios = get_all_scenarios()

    # 1. Feature Engineering
    features_map = extract_road_features(roads, buildings, pois, analysis)

    # 2. Model Selection check
    model_name, model_reason = check_model_suitability(request.historical_data)

    # 3. Multi-horizon forecasting
    horizon_summaries: List[HorizonSummary] = []
    horizon_road_forecasts: Dict[int, List[ForecastRoadResult]] = {}
    horizon_bottlenecks: Dict[int, List[FutureBottleneck]] = {}

    for year in forecast_years:
        rf_list: List[ForecastRoadResult] = []
        for r_id, feat in features_map.items():
            rf = forecast_road_baseline(feat, scenario, baseline_year, year)
            rf_list.append(rf)

        horizon_road_forecasts[year] = rf_list

        # Network analysis & bottleneck detection
        bns, summary = analyze_future_network(rf_list, roads, junctions, scenario, year)
        horizon_bottlenecks[year] = bns

        # Determine best Phase 4 plan for this horizon
        if plans:
            sims = [
                simulate_plan_future_performance(p, rf_list, scenario, year, baseline_year)
                for p in plans
            ]
            # Best plan minimizes post-intervention average V/C
            sims.sort(key=lambda s: s.post_intervention_avg_vc)
            best_sim = sims[0]
            summary.recommended_plan_id = best_sim.plan_id
            summary.recommended_plan_name = best_sim.plan_name
            summary.recommended_plan_reason = (
                f"Maintains lowest network V/C ({best_sim.post_intervention_avg_vc}) "
                f"and resolves {best_sim.bottlenecks_resolved_count} bottlenecks in {year}."
            )

        horizon_summaries.append(summary)

    # 4. Urban Development Pressure & Spatial Hotspots
    dev_areas = compute_development_pressure(roads, buildings, pois, center)

    # 5. Active Year Detailed Outputs
    active_rf = horizon_road_forecasts.get(active_year, horizon_road_forecasts.get(forecast_years[0], []))
    active_bns = horizon_bottlenecks.get(active_year, horizon_bottlenecks.get(forecast_years[0], []))

    # 6. Simulate All Candidate Plans across Active Horizon
    plan_performances: List[PlanScenarioPerformance] = []
    if plans:
        for p in plans:
            perf = simulate_plan_future_performance(p, active_rf, scenario, active_year, baseline_year)
            plan_performances.append(perf)

    # 7. Data Provenance & Confidence Rating
    provenance = {
        "source": geo_area.get("dataSource", "OpenStreetMap / Real Geographic Data"),
        "demand_baseline": "Phase 3 Modelled Capacity & Demand Diagnostics",
        "scenario_assumptions": f"{scenario.name} ({round(scenario.annual_growth_rate*100, 1)}%/year)",
        "prediction_type": "Planning-Level Scenario Simulation"
    }

    confidence = {
        "overall_confidence": "MEDIUM",
        "score": 0.76,
        "empirical_traffic_data_available": bool(request.historical_data),
        "spatial_features_count": len(features_map),
        "notes": "Model outputs represent planning-level scenario projections. Use for alternative evaluation."
    }

    return ForecastResponse(
        location_name=location_name,
        baseline_year=baseline_year,
        forecast_years=forecast_years,
        active_scenario=active_scenario_id,
        active_year=active_year,
        available_scenarios=all_scenarios,
        model_selected=model_name,
        model_selection_reason=model_reason,
        horizon_summaries=horizon_summaries,
        road_forecasts=active_rf,
        future_bottlenecks=active_bns,
        development_pressure_areas=dev_areas,
        plan_performances=plan_performances,
        confidence=confidence,
        data_provenance=provenance,
        disclaimer=STATUTORY_DISCLAIMER
    )
