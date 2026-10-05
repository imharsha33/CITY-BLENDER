"""
RoadVision Phase 9: Strategy Fingerprint Generation
Captures the complete CAUSE -> EVIDENCE -> DECISION footprint of a selected infrastructure strategy.
"""
from typing import Dict, Any, List
import hashlib
import json

def generate_strategy_fingerprint(
    place_name: str,
    selected_strategy: Any,
    development_zones: List[Any],
    geo_area: Dict[str, Any],
    candidate_plans: List[Any],
) -> Dict[str, Any]:
    """
    Constructs a comprehensive, immutable evidence fingerprint for the selected strategy.
    Enables cross-city anti-template audits and rigorous similarity verification.
    """
    strat_dict = selected_strategy if isinstance(selected_strategy, dict) else (
        selected_strategy.model_dump() if hasattr(selected_strategy, "model_dump") else selected_strategy.__dict__
    )

    intervention_types = strat_dict.get("intervention_types", [])
    affected_roads = strat_dict.get("affected_road_ids", [])
    affected_junctions = strat_dict.get("affected_junction_ids", [])

    # Extract zone IDs
    zone_ids = []
    zone_types = []
    for z in development_zones:
        zd = z if isinstance(z, dict) else (z.model_dump() if hasattr(z, "model_dump") else z.__dict__)
        zid = zd.get("zoneId")
        if zid:
            zone_ids.append(zid)
            zone_types.append(zd.get("zoneType", "UNKNOWN"))

    # Synthesize evidence metrics from winning plans
    plans_by_id = {}
    for p in candidate_plans:
        pd = p if isinstance(p, dict) else (p.model_dump() if hasattr(p, "model_dump") else p.__dict__)
        plans_by_id[pd.get("id")] = pd

    winning_plans = []
    for pid in strat_dict.get("intervention_ids", []):
        if pid in plans_by_id:
            winning_plans.append(plans_by_id[pid])

    total_demand = 0.0
    total_capacity = 0.0
    vc_values = []
    building_conflicts = 0
    water_conflicts = 0
    total_length_m = 0.0

    rejected_candidates = []

    for wp in winning_plans:
        ev = wp.get("evidence", {})
        total_demand += ev.get("estimated_demand", 0.0)
        total_capacity += ev.get("capacity", 0.0)
        vc = ev.get("vc_ratio")
        if vc:
            vc_values.append(vc)
        building_conflicts += wp.get("buildingConflictsCount", 0)
        water_conflicts += wp.get("waterIntersectsCount", 0)
        total_length_m += wp.get("proposedLengthMeters", 0.0)

        for rej in wp.get("rejectedAlternatives", []):
            rej_dict = rej if isinstance(rej, dict) else (rej.model_dump() if hasattr(rej, "model_dump") else rej.__dict__)
            rejected_candidates.append({
                "type": rej_dict.get("interventionType"),
                "reason": rej_dict.get("reasonForRejection"),
                "major_constraint": rej_dict.get("majorConstraint"),
            })

    avg_vc = round(sum(vc_values) / max(1, len(vc_values)), 2) if vc_values else 1.10
    max_vc = round(max(vc_values), 2) if vc_values else 1.25

    # Real geographic coordinates hash
    geoms = strat_dict.get("combined_geometries", [])
    geom_pts = []
    for g in geoms:
        for pt in g.get("geometry", []):
            geom_pts.append(f"{pt[0]:.5f},{pt[1]:.5f}")
    geom_str = "|".join(geom_pts)
    geom_hash = hashlib.sha256(geom_str.encode("utf-8")).hexdigest()[:16] if geom_str else "no_construction"

    center = geo_area.get("center", (0.0, 0.0))
    center_str = f"{center[0]:.4f},{center[1]:.4f}"

    fingerprint = {
        "place": place_name,
        "center_coordinates": center_str,
        "zone_ids": zone_ids,
        "zone_types": zone_types,
        "road_ids": affected_roads,
        "junction_ids": affected_junctions,
        "intervention_types": intervention_types,
        "evidence_metrics": {
            "average_vc_ratio": avg_vc,
            "max_vc_ratio": max_vc,
            "aggregate_peak_demand_veh_hr": round(total_demand, 0),
            "aggregate_capacity_veh_hr": round(total_capacity, 0),
            "building_encroachment_conflicts": building_conflicts,
            "water_feature_conflicts": water_conflicts,
            "total_corridor_length_meters": round(total_length_m, 1),
            "overall_score": strat_dict.get("overall_score", 0.0),
        },
        "constraints": {
            "cost_category": strat_dict.get("cost_category", "LOW"),
            "land_impact_category": strat_dict.get("land_impact_category", "LOW"),
            "disruption_category": strat_dict.get("disruption_category", "LOW"),
        },
        "selected_geometry_hash": geom_hash,
        "future_demand": {
            "effective_planning_horizon": strat_dict.get("effective_planning_horizon", 2038),
            "robustness_score": strat_dict.get("robustness_score", 85.0),
        },
        "rejected_candidates": rejected_candidates[:6],
    }

    return fingerprint
