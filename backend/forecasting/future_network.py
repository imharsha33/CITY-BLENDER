"""
RoadVision Phase 5: Future Network Analysis & Bottleneck Identification Engine
"""
from typing import List, Dict, Any, Tuple
from .models import ForecastRoadResult, FutureBottleneck, HorizonSummary, ForecastScenario

def analyze_future_network(
    road_forecasts: List[ForecastRoadResult],
    roads: List[Dict[str, Any]],
    junctions: List[Dict[str, Any]],
    scenario: ForecastScenario,
    year: int
) -> Tuple[List[FutureBottleneck], HorizonSummary]:
    """
    Evaluates network-wide V/C pressure and extracts critical future bottlenecks.
    """
    road_geom_map = {r["id"]: r.get("geometry", []) for r in roads}
    road_name_map = {r["id"]: r.get("name", "Unnamed Corridor") for r in roads}

    bottlenecks: List[FutureBottleneck] = []

    total_base_demand = sum(rf.current_demand for rf in road_forecasts)
    total_forecast_demand = sum(rf.forecast_demand for rf in road_forecasts)
    demand_growth_pct = round(((total_forecast_demand / max(1.0, total_base_demand)) - 1.0) * 100.0, 1)

    avg_vc = round(sum(rf.forecast_vc for rf in road_forecasts) / max(1, len(road_forecasts)), 3)

    critical_count = 0
    watch_count = 0

    for idx, rf in enumerate(road_forecasts):
        if rf.status == "CRITICAL_CAPACITY_PRESSURE":
            critical_count += 1
            severity = "CRITICAL"
        elif rf.status == "CONGESTION_RISK":
            critical_count += 1
            severity = "HIGH"
        elif rf.status == "WATCH":
            watch_count += 1
            severity = "WATCH"
        else:
            continue

        geom = road_geom_map.get(rf.road_id, [])
        if geom and len(geom) > 0:
            mid_idx = len(geom) // 2
            loc = [geom[mid_idx][0], geom[mid_idx][1]]
        else:
            loc = [0.0, 0.0]

        # Recommend intervention based on V/C severity
        if rf.forecast_vc >= 1.25:
            rec_type = "GRADE_SEPARATION"
            rec_reason = "Severe capacity breach (V/C > 1.25); grade-separated flyover required to eliminate surface intersection conflicts."
        elif rf.forecast_vc >= 1.10:
            rec_type = "CONNECTOR_ROAD"
            rec_reason = "Corridor overload; parallel relief connector road recommended to bypass choked sections."
        elif rf.forecast_vc >= 1.00:
            rec_type = "ROAD_WIDENING"
            rec_reason = "Corridor approaching saturated flow; widening by +1 or +2 lanes recommended."
        else:
            rec_type = "LANE_RECONFIGURATION"
            rec_reason = "Approaching capacity limits; lane restriping, turning bays, and signal optimization recommended."

        evidence = [
            f"Baseline V/C: {rf.current_vc} → Horizon {year} Forecast V/C: {rf.forecast_vc}",
            f"Under {scenario.name} assumption (+{rf.growth_percentage}% trip increase)",
            rec_reason
        ]

        bottlenecks.append(FutureBottleneck(
            id=f"future-bn-{year}-{idx+1}",
            road_id=rf.road_id,
            road_name=road_name_map.get(rf.road_id, rf.name),
            junction_id=None,
            year=year,
            scenario=scenario.id,
            severity=severity,
            current_vc=rf.current_vc,
            forecast_vc=rf.forecast_vc,
            location=loc,
            confidence=rf.confidence,
            evidence=evidence,
            recommended_intervention_type=rec_type
        ))

    # Sort bottlenecks by V/C descending
    bottlenecks.sort(key=lambda b: b.forecast_vc, reverse=True)

    summary = HorizonSummary(
        year=year,
        scenario=scenario.id,
        total_demand=round(total_forecast_demand, 1),
        demand_growth_pct=demand_growth_pct,
        network_avg_vc=avg_vc,
        critical_bottlenecks_count=critical_count,
        watch_roads_count=watch_count
    )

    return bottlenecks, summary
