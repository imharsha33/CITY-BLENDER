"""
RoadVision Phase 5: Phase 4 Plan Performance Under Future Scenarios & Horizons
"""
from typing import List, Dict, Any
from .models import PlanScenarioPerformance, ForecastRoadResult, ForecastScenario

def simulate_plan_future_performance(
    plan: Dict[str, Any],
    road_forecasts: List[ForecastRoadResult],
    scenario: ForecastScenario,
    year: int,
    baseline_year: int = 2026
) -> PlanScenarioPerformance:
    """
    Simulates the impact of a Phase 4 candidate plan against future horizon traffic demand.
    Computes post-intervention V/C, percentage reduction, remaining bottlenecks,
    and effective planning horizon (resilience year).
    """
    plan_id = plan.get("id", "plan-unknown")
    plan_name = plan.get("name", "Intervention Plan")
    intervention_type = plan.get("interventionType") or plan.get("type") or "CIVIL_INTERVENTION"
    source_road_ids = set(plan.get("sourceRoadIds", []))

    # Base network average V/C for this horizon
    base_avg_vc = sum(rf.forecast_vc for rf in road_forecasts) / max(1, len(road_forecasts))

    # Calculate intervention capacity injection
    # e.g. Widening adds 1200-2400 cap to source roads; Flyover adds 2800 cap; Connector distributes flow
    if intervention_type == "GRADE_SEPARATION":
        capacity_boost = 0.42 # 42% capacity/flow relief along bottleneck corridor
        bottleneck_resolution_factor = 0.85
        horizon_years_effective = 15 # robust up to ~2041
    elif intervention_type == "CONNECTOR_ROAD" or intervention_type == "PARALLEL_RELIEF":
        capacity_boost = 0.35 # 35% relief by providing alternate routing
        bottleneck_resolution_factor = 0.75
        horizon_years_effective = 12 # robust up to ~2038
    elif intervention_type == "ROAD_WIDENING":
        capacity_boost = 0.28 # 28% capacity expansion
        bottleneck_resolution_factor = 0.65
        horizon_years_effective = 8 # robust up to ~2034
    elif intervention_type == "LANE_RECONFIGURATION":
        capacity_boost = 0.14 # 14% operational efficiency
        bottleneck_resolution_factor = 0.40
        horizon_years_effective = 4 # robust up to ~2030
    elif intervention_type == "NO_MAJOR_INTERVENTION":
        capacity_boost = 0.0
        bottleneck_resolution_factor = 0.0
        horizon_years_effective = 0
    else:
        capacity_boost = 0.20
        bottleneck_resolution_factor = 0.50
        horizon_years_effective = 6

    # Apply capacity boost specifically to affected road forecasts
    simulated_vcs: List[float] = []
    base_bottlenecks = 0
    post_bottlenecks = 0

    for rf in road_forecasts:
        is_affected = rf.road_id in source_road_ids or not source_road_ids # general relief if connector
        if is_affected:
            adj_vc = rf.forecast_vc / (1.0 + capacity_boost)
        else:
            adj_vc = rf.forecast_vc
        simulated_vcs.append(adj_vc)

        if rf.forecast_vc >= 1.0:
            base_bottlenecks += 1
            if adj_vc >= 1.0:
                post_bottlenecks += 1

    post_avg_vc = round(sum(simulated_vcs) / max(1, len(simulated_vcs)), 3)
    vc_reduction_pct = round(((base_avg_vc - post_avg_vc) / max(0.01, base_avg_vc)) * 100.0, 1)

    resolved_count = max(0, int(base_bottlenecks * bottleneck_resolution_factor))
    remaining_count = max(0, base_bottlenecks - resolved_count)

    resilience_year = baseline_year + horizon_years_effective

    is_effective = post_avg_vc < 1.00 and remaining_count <= max(1, int(base_bottlenecks * 0.3))

    if is_effective and year <= resilience_year:
        status_label = f"HIGHLY EFFECTIVE through ~{resilience_year}"
    elif year <= resilience_year + 3:
        status_label = f"MODERATE CAPACITY RESERVES (Exceeds baseline threshold near ~{resilience_year})"
    else:
        status_label = f"CAPACITY EXHAUSTED by {year} (Planning horizon expired)"

    simulated_metrics = {
        "future_v_c": post_avg_vc,
        "bottlenecks_remaining": remaining_count,
        "capacity_resilience_year": resilience_year,
        "demand_served_ratio": round(min(1.0, 1.0 / max(0.01, post_avg_vc)), 2)
    }

    return PlanScenarioPerformance(
        plan_id=plan_id,
        plan_name=plan_name,
        intervention_type=intervention_type,
        year=year,
        scenario=scenario.id,
        baseline_network_avg_vc=round(base_avg_vc, 3),
        post_intervention_avg_vc=post_avg_vc,
        vc_reduction_pct=vc_reduction_pct,
        bottlenecks_resolved_count=resolved_count,
        bottlenecks_remaining_count=remaining_count,
        effective_planning_horizon=resilience_year,
        is_effective=is_effective,
        simulated_metrics=simulated_metrics,
        status_label=status_label
    )
