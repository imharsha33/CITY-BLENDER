"""
RoadVision Phase 6: Master Infrastructure Strategy Optimization Engine
"""
from typing import List, Dict, Any
from .models import (
    OptimizationRequest,
    OptimizationResponse,
    InfrastructureStrategy,
    ObjectiveVector
)
from .combinations import generate_candidate_combinations
from .compatibility import check_combination_compatibility
from .objectives import evaluate_objective_vector, compute_strategy_score, get_weights
from .pareto import identify_pareto_front
from .robustness import evaluate_scenario_robustness
from .explainability import explain_recommendation, explain_alternative_rejections
from .fingerprint import generate_strategy_fingerprint


OPTIMIZATION_DISCLAIMER = (
    "RoadVision optimization produces planning-level infrastructure strategies based on available geographic, "
    "analytical and scenario data. Results are not construction-ready engineering designs or statutory "
    "recommendations. Final decisions require professional traffic studies, land surveys, geotechnical and "
    "structural investigations, utility mapping, environmental assessment, economic evaluation and statutory approvals."
)

MODE_DESCRIPTIONS: Dict[str, str] = {
    "balanced": "Holistic 13-criterion trade-off optimization balancing traffic, cost, land take, and future resilience.",
    "traffic_reduction": "Heavily prioritizes immediate congestion relief and corridor volume-to-capacity (V/C) reduction.",
    "min_cost": "Maximizes economic return while strictly constraining capital expenditure and operational disruption.",
    "min_land_acquisition": "Penalizes building demolition and environmental encroachment to preserve existing urban fabric.",
    "max_resilience": "Prioritizes long-term capacity reserves across 2035-2040 and rapid urbanization scenarios.",
    "min_disruption": "Minimizes work-zone traffic interference, construction duration, and detour complications.",
    "max_safety": "Focuses on grade separation and junction redesign to eliminate high-risk conflict points.",
    "environmental_priority": "Enforces strict avoidance of water bodies, open greenspaces, and ecological buffers."
}

def run_optimization_pipeline(request: OptimizationRequest) -> OptimizationResponse:
    """
    Executes multi-objective strategy optimization, Pareto analysis, scenario robustness,
    and explainable trade-off identification.
    """
    geo_area = request.geo_area
    analysis = request.analysis
    candidate_plans = request.plans or []
    optimization_mode = request.optimization_mode or "balanced"
    max_size = min(4, max(1, request.max_combination_size or 3))

    location_name = geo_area.get("locationName", "Active Geographic Area")
    mode_desc = MODE_DESCRIPTIONS.get(optimization_mode, MODE_DESCRIPTIONS["balanced"])
    weights = get_weights(optimization_mode)

    # 1. Generate candidate combinations
    combinations = generate_candidate_combinations(candidate_plans, max_size=max_size)

    evaluated_strategies: List[InfrastructureStrategy] = []
    objective_vectors: List[ObjectiveVector] = []

    strategy_counter = 1
    for combo in combinations:
        compat_status, compat_reason = check_combination_compatibility(combo)
        if compat_status == "INCOMPATIBLE":
            continue

        # Extract names & types
        names = [p.get("name", "Plan") for p in combo]
        types = [p.get("interventionType") or p.get("type") or "" for p in combo]
        ids = [p.get("id", f"p-{i}") for i, p in enumerate(combo)]

        # Consolidate geometries
        combined_geoms: List[Dict[str, Any]] = []
        all_roads: List[str] = []
        all_junctions: List[str] = []

        for p in combo:
            for seg in p.get("proposedGeometry", []):
                combined_geoms.append(seg)
            for rid in p.get("sourceRoadIds", []):
                if rid and rid not in all_roads:
                    all_roads.append(rid)
            for jid in p.get("affectedJunctionIds", []):
                if jid and jid not in all_junctions:
                    all_junctions.append(jid)

        # Name strategy intelligently
        if len(combo) == 1:
            strat_name = f"Single: {combo[0].get('name', 'Intervention')}"
        elif len(combo) == 2:
            strat_name = f"Combined: {combo[0].get('name', '').split('(')[0].strip()} + {combo[1].get('name', '').split('(')[0].strip()}"
        else:
            strat_name = f"Integrated Multi-Project Package ({len(combo)} Interventions)"

        # 2. Objective Vector
        vector = evaluate_objective_vector(combo)
        objective_vectors.append(vector)

        # 3. Overall Score
        overall = compute_strategy_score(vector, optimization_mode)

        # 4. Scenario Robustness & Planning Horizon
        robustness, worst_case, horizon_year, sc_matrix = evaluate_scenario_robustness(
            combo, vector, baseline_year=2026
        )

        # Cost & Impact Categories
        if vector.cost_score >= 85.0:
            cost_cat = "VERY_LOW"
        elif vector.cost_score >= 65.0:
            cost_cat = "LOW"
        elif vector.cost_score >= 45.0:
            cost_cat = "MEDIUM"
        elif vector.cost_score >= 25.0:
            cost_cat = "HIGH"
        else:
            cost_cat = "VERY_HIGH"

        land_cat = "LOW" if vector.land_impact >= 70.0 else ("MEDIUM" if vector.land_impact >= 45.0 else "HIGH")
        env_cat = "LOW" if vector.environmental_impact >= 75.0 else ("MEDIUM" if vector.environmental_impact >= 50.0 else "HIGH")
        disrupt_cat = "LOW" if vector.disruption >= 70.0 else ("MEDIUM" if vector.disruption >= 45.0 else "HIGH")

        # Confidence
        conf_label = "HIGH" if vector.confidence >= 80.0 else ("MEDIUM" if vector.confidence >= 60.0 else "LOW")

        # Tradeoffs
        tradeoffs: List[str] = []
        if cost_cat in ["HIGH", "VERY_HIGH"]:
            tradeoffs.append("Significant capital expenditure allocation required.")
        if disrupt_cat in ["HIGH", "VERY_HIGH"]:
            tradeoffs.append("Elevated work-zone traffic disruption during construction phase.")
        if land_cat in ["HIGH", "VERY_HIGH"]:
            tradeoffs.append("Requires active right-of-way acquisition and setback adjustments.")
        if not tradeoffs:
            tradeoffs.append("Balanced profile with manageable operational trade-offs.")

        # Phase 8: Extract Development Zones covered by this combination
        zone_map: Dict[str, str] = {}
        for p in combo:
            zid = p.get("zoneId")
            if zid:
                zone_map[zid] = p.get("interventionType") or p.get("type") or ""
        zones_covered = list(zone_map.keys())

        strat = InfrastructureStrategy(
            id=f"strat-{strategy_counter:02d}",
            name=strat_name,
            intervention_ids=ids,
            intervention_names=names,
            intervention_types=types,
            feasibility=compat_status,
            compatibility_reason=compat_reason,
            is_pareto_optimal=False, # to be set below
            combined_geometries=combined_geoms,
            affected_road_ids=all_roads,
            affected_junction_ids=all_junctions,
            zone_interventions=zone_map,
            development_zones_covered=zones_covered,
            objective_scores=vector,
            overall_score=overall,
            robustness_score=robustness,
            worst_case_score=worst_case,
            effective_planning_horizon=horizon_year,
            cost_category=cost_cat,
            land_impact_category=land_cat,
            environmental_impact_category=env_cat,
            disruption_category=disrupt_cat,
            confidence=conf_label,
            confidence_score=round(vector.confidence / 100.0, 2),
            key_tradeoffs=tradeoffs,
            rejection_reasons=[],
            scenario_matrix=sc_matrix
        )

        evaluated_strategies.append(strat)
        strategy_counter += 1

    # 5. Pareto Dominance Analysis
    if evaluated_strategies:
        pareto_flags = identify_pareto_front(objective_vectors)
        for idx, flag in enumerate(pareto_flags):
            evaluated_strategies[idx].is_pareto_optimal = flag

    # 6. Sort by Overall Score Descending
    evaluated_strategies.sort(key=lambda s: s.overall_score, reverse=True)

    # 7. Select Recommended Strategy (Prefer highest scoring Pareto strategy)
    pareto_strats = [s for s in evaluated_strategies if s.is_pareto_optimal]
    if pareto_strats:
        recommended = pareto_strats[0]
    elif evaluated_strategies:
        recommended = evaluated_strategies[0]
    else:
        recommended = None

    why_rec: List[str] = []
    why_not: Dict[str, List[str]] = {}
    scenario_matrix_dict: Dict[str, Dict[str, float]] = {}

    if recommended:
        why_rec = explain_recommendation(recommended, optimization_mode)
        why_not = explain_alternative_rejections(recommended, evaluated_strategies)
        for s in evaluated_strategies:
            s.rejection_reasons = why_not.get(s.id, [])
            scenario_matrix_dict[s.id] = {c.scenario_id: c.score for c in s.scenario_matrix}

    # Phase 8: Assemble WholePlaceDevelopmentPlan
    dev_zones = geo_area.get("developmentZones") or analysis.get("developmentZones") or []
    whole_place_plan: Dict[str, Any] = None

    if dev_zones and recommended:
        winning_combo = []
        for combo in combinations:
            ids = [p.get("id", f"p-{i}") for i, p in enumerate(combo)]
            if ids == recommended.intervention_ids:
                winning_combo = combo
                break

        selected_zone_interventions: Dict[str, Any] = {}
        unchanged_zones: List[str] = []

        for z in dev_zones:
            z_dict = z.model_dump() if hasattr(z, "model_dump") else (z.dict() if hasattr(z, "dict") else z)
            zid = z_dict.get("zoneId")
            zname = z_dict.get("name", "Zone")
            
            chosen_plan = None
            for p in winning_combo:
                if p.get("zoneId") == zid:
                    chosen_plan = p
                    break

            if chosen_plan:
                selected_zone_interventions[zid] = {
                    "candidatePlanId": chosen_plan.get("id"),
                    "name": chosen_plan.get("name"),
                    "interventionType": chosen_plan.get("interventionType") or chosen_plan.get("type"),
                    "costCategory": chosen_plan.get("costCategory", "LOW"),
                    "status": chosen_plan.get("status", "FEASIBLE"),
                }
                if (chosen_plan.get("interventionType") or chosen_plan.get("type")) == "NO_MAJOR_INTERVENTION":
                    unchanged_zones.append(zid)
            else:
                selected_zone_interventions[zid] = {
                    "candidatePlanId": f"{zid}-monitoring",
                    "name": f"{zname} — Baseline Monitoring & Maintenance",
                    "interventionType": "NO_MAJOR_INTERVENTION",
                    "costCategory": "NEGLIGIBLE",
                    "status": "FEASIBLE",
                }
                unchanged_zones.append(zid)

        extent = geo_area.get("planningExtent") or geo_area.get("boundingBox") or {
            "min_lat": geo_area.get("center", [0, 0])[0] - 0.02,
            "max_lat": geo_area.get("center", [0, 0])[0] + 0.02,
            "min_lon": geo_area.get("center", [0, 0])[1] - 0.02,
            "max_lon": geo_area.get("center", [0, 0])[1] + 0.02,
        }
        if hasattr(extent, "model_dump"):
            extent = extent.model_dump()
        elif hasattr(extent, "dict"):
            extent = extent.dict()

        whole_place_plan = {
            "id": "plan-whole-place",
            "name": f"{location_name} Strategic Infrastructure Master Plan",
            "place": location_name,
            "geographicExtent": extent,
            "dataSource": geo_area.get("dataSource", "OPENSTREETMAP"),
            "totalRoadsCount": len(geo_area.get("roads", [])),
            "developmentZones": [z.model_dump() if hasattr(z, "model_dump") else (z.dict() if hasattr(z, "dict") else z) for z in dev_zones],
            "selectedZoneInterventions": selected_zone_interventions,
            "unchangedMonitoringZones": unchanged_zones,
            "totalAffectedRoadsCount": len(recommended.affected_road_ids),
            "futureHorizon": recommended.effective_planning_horizon,
            "overallScore": recommended.overall_score,
            "confidence": round(recommended.confidence_score * 100.0, 1),
            "tradeoffs": {
                "keyTradeoffs": recommended.key_tradeoffs,
                "costCategory": recommended.cost_category,
                "landCategory": recommended.land_impact_category,
                "environmentalCategory": recommended.environmental_impact_category,
                "disruptionCategory": recommended.disruption_category,
            },
            "explanation": why_rec,
            "geometries": recommended.combined_geometries,
        }

    # Phase 9: Compute Strategy Fingerprint for CAUSE -> EVIDENCE -> DECISION traceability
    strat_fingerprint = None
    if recommended:
        strat_fingerprint = generate_strategy_fingerprint(
            location_name,
            recommended,
            dev_zones,
            geo_area,
            candidate_plans
        )
        if whole_place_plan:
            whole_place_plan["strategyFingerprint"] = strat_fingerprint

    # Data provenance
    provenance = {
        "osm_road_geometry": "REAL_GEOGRAPHIC",
        "building_footprints": "REAL_GEOGRAPHIC",
        "water_features": "REAL_GEOGRAPHIC",
        "osm_road_classification": "REAL_OBSERVED",
        "traffic_demand_estimate": "MODELED_ESTIMATE",
        "capacity_estimate": "MODELED_ESTIMATE",
        "growth_rate_assumed": "PLANNING_ASSUMPTION",
        "2035_horizon_forecast": "FORECAST",
        "proposed_interventions": "PROPOSED",
        "construction_sequence": "SIMULATED",
        "optimization_engine": f"Phase 6 & 9 Multi-Objective Optimizer ({optimization_mode.upper()})"
    }

    return OptimizationResponse(
        location_name=location_name,
        optimization_mode=optimization_mode,
        mode_description=mode_desc,
        objective_weights=weights,
        total_strategies_evaluated=len(combinations),
        feasible_strategies_count=len(evaluated_strategies),
        pareto_strategies=pareto_strats,
        all_strategies=evaluated_strategies,
        recommended_strategy=recommended,
        whole_place_plan=whole_place_plan,
        development_zones=[z.model_dump() if hasattr(z, "model_dump") else (z.dict() if hasattr(z, "dict") else z) for z in dev_zones],
        why_recommended=why_rec,
        why_not_alternatives=why_not,
        scenario_comparison_matrix=scenario_matrix_dict,
        strategy_fingerprint=strat_fingerprint,
        data_provenance=provenance,
        disclaimer=OPTIMIZATION_DISCLAIMER
    )

