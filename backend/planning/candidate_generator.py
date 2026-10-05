from typing import List, Dict, Any, Tuple, Optional
import math
from planning.models import (
    CandidatePlan,
    ProposedRoadSegment,
    ProblemSummary,
    PlanMetrics,
    RejectedAlternative,
)
from planning.geometry import (
    calculate_corridor_length_meters,
    check_building_conflicts,
    check_water_conflicts,
    generate_elevated_flyover_segments,
    interpolate_curved_connector,
    haversine_meters,
)
from planning.feasibility import evaluate_plan_feasibility
from planning.scoring import evaluate_plan_metrics
from planning.explainability import (
    generate_plan_explanation,
    generate_engineering_why_selected,
    generate_rejected_alternatives,
)

def build_candidate_evidence(
    intervention_type: str,
    target_road: Optional[Dict[str, Any]],
    target_junction: Optional[Dict[str, Any]],
    affected_road_ids: List[str],
    affected_junction_ids: List[str],
    corridor_length_m: float,
    building_conflicts: int,
    nearby_buildings: int,
    water_conflicts: int,
    min_water_dist: float,
    current_vc: float,
    estimated_demand: float,
    estimated_capacity: float,
    centrality: float = 75.0,
    junction_conflict_score: float = 70.0,
    confidence: float = 88.0,
) -> Dict[str, Any]:
    """
    Phase 9 Objective 1: Calculates and retains comprehensive, explicit evidence attributes
    for each candidate intervention.
    """
    hw_type = target_road.get("highwayType", "primary") if target_road else "primary"
    width = target_road.get("estimatedWidth", 8.5) if target_road else 8.5
    lanes = target_road.get("lanes", 2) if target_road else 2

    # Curvature calculation: ratio of corridor length to Euclidean start-to-end line
    curvature = 1.05
    if target_road and len(target_road.get("geometry", [])) >= 2:
        pts = target_road["geometry"]
        straight_d = haversine_meters(pts[0], pts[-1])
        if straight_d > 10.0:
            curvature = round(max(1.0, corridor_length_m / straight_d), 2)

    available_space = max(2.0, 16.0 - width)
    emer_req = "HIGH" if hw_type in ["primary", "trunk", "secondary"] else "MODERATE"
    future_dem = round(estimated_demand * 1.35)
    future_vc = round(current_vc * 1.25, 2)

    disruption_map = {
        "GRADE_SEPARATION": 75.0,
        "ROAD_WIDENING": 65.0,
        "CONNECTOR_ROAD": 40.0,
        "ROUNDABOUT": 35.0,
        "INTERSECTION_REDESIGN": 35.0,
        "LANE_RECONFIGURATION": 15.0,
        "NO_MAJOR_INTERVENTION": 0.0,
    }

    land_impact_map = {
        "ROAD_WIDENING": min(95.0, 20.0 + building_conflicts * 2.5),
        "GRADE_SEPARATION": 25.0,
        "CONNECTOR_ROAD": 55.0,
        "ROUNDABOUT": 30.0,
        "INTERSECTION_REDESIGN": 25.0,
        "LANE_RECONFIGURATION": 5.0,
        "NO_MAJOR_INTERVENTION": 0.0,
    }

    complexity_map = {
        "GRADE_SEPARATION": 85.0,
        "ROAD_WIDENING": 60.0,
        "CONNECTOR_ROAD": 50.0,
        "ROUNDABOUT": 40.0,
        "INTERSECTION_REDESIGN": 35.0,
        "LANE_RECONFIGURATION": 20.0,
        "NO_MAJOR_INTERVENTION": 0.0,
    }

    env_desc = "No surface water conflict within 300m buffer" if min_water_dist > 300 else f"Proximity to mapped water feature: {min_water_dist:.0f}m"

    provenance = {
        "road_hierarchy": "REAL_OBSERVED",
        "road_width": "REAL_GEOGRAPHIC",
        "surrounding_building_density": "REAL_GEOGRAPHIC",
        "building_encroachment": "REAL_GEOGRAPHIC",
        "water_body_proximity": "REAL_GEOGRAPHIC",
        "estimated_demand": "MODELED_ESTIMATE",
        "capacity": "MODELED_ESTIMATE",
        "vc_ratio": "MODELED_ESTIMATE",
        "future_demand_2035": "FORECAST",
        "future_vc_2035": "FORECAST",
        "construction_disruption": "SIMULATED",
        "proposed_geometry": "PROPOSED",
    }

    return {
        "affected_road_ids": affected_road_ids,
        "affected_junction_ids": affected_junction_ids,
        "road_hierarchy": hw_type,
        "road_width": width,
        "lane_estimate": lanes,
        "estimated_demand": estimated_demand,
        "capacity": estimated_capacity,
        "vc_ratio": current_vc,
        "centrality": centrality,
        "connectivity_contribution": round(min(95.0, centrality * 0.95), 1),
        "intersection_conflict": junction_conflict_score,
        "surrounding_building_density": nearby_buildings,
        "building_encroachment": building_conflicts,
        "water_body_proximity": round(min_water_dist, 1),
        "environmental_constraint": env_desc,
        "corridor_geometry": {
            "length_m": round(corridor_length_m, 1),
            "curvature": curvature,
        },
        "curvature": curvature,
        "available_corridor_space": round(available_space, 1),
        "emergency_access_requirement": emer_req,
        "future_demand": future_dem,
        "future_demand_2035": future_dem,
        "future_vc_2035": future_vc,
        "construction_disruption": disruption_map.get(intervention_type, 40.0),
        "estimated_land_impact": land_impact_map.get(intervention_type, 30.0),
        "implementation_complexity": complexity_map.get(intervention_type, 40.0),
        "confidence": confidence,
        "data_provenance": provenance,
    }


def generate_candidate_plans(
    geo_area: Dict[str, Any],
    analysis: Dict[str, Any],
    priority: str = "balanced"
) -> Tuple[ProblemSummary, List[CandidatePlan], str]:

    """
    Generates, evaluates, and ranks spatially grounded infrastructure intervention candidates
    based on the active geographic area and Phase 3 analytical diagnostics.
    Returns (problem_summary, candidate_plans_list, recommended_plan_id).
    """
    if hasattr(geo_area, "model_dump"):
        geo_area = geo_area.model_dump()
    elif hasattr(geo_area, "dict"):
        geo_area = geo_area.dict()

    if hasattr(analysis, "model_dump"):
        analysis = analysis.model_dump()
    elif hasattr(analysis, "dict"):
        analysis = analysis.dict()

    roads = geo_area.get("roads", [])
    buildings = geo_area.get("buildings", [])
    water = geo_area.get("water", [])
    issues = analysis.get("issues", [])
    road_analyses = analysis.get("roadAnalysis", [])
    junction_analyses = analysis.get("junctionAnalysis", [])
    summary = analysis.get("summary", {})

    # 1. Identify primary deficiency and critical corridors
    critical_issues = [iss for iss in issues if iss.get("severity") in ["CRITICAL", "HIGH"]]
    if not critical_issues and issues:
        critical_issues = issues[:3]

    primary_issue = critical_issues[0] if critical_issues else None

    # Check if network is already operating with low stress
    is_adequate = len(critical_issues) == 0 and summary.get("bottlenecks", 0) == 0 and summary.get("capacityDeficiencies", 0) == 0

    evidence_points: List[str] = []
    critical_corridors: List[str] = []
    critical_junctions: List[str] = []

    if primary_issue:
        iss_type = primary_issue.get("type", "BOTTLENECK")
        title = primary_issue.get("title", "Infrastructure Bottleneck")
        evidence_points = primary_issue.get("reasons", [])
        if "metrics" in primary_issue:
            m = primary_issue["metrics"]
            if "vcRatio" in m:
                evidence_points.append(f"Modelled Volume-to-Capacity ratio: {m['vcRatio']:.2f}")
            if "estimatedDemandVehHr" in m:
                evidence_points.append(f"Estimated Peak Demand: {m['estimatedDemandVehHr']} veh/hr")

        if primary_issue.get("roadSegmentId"):
            critical_corridors.append(primary_issue["roadSegmentId"])
        if primary_issue.get("junctionId"):
            critical_junctions.append(primary_issue["junctionId"])
    else:
        title = "Baseline Network Equilibrium"
        evidence_points = ["Road network volume/capacity ratios operate within stable free-flow thresholds (V/C < 0.70)."]

    # Key geographic constraints summary
    key_constraints = []
    if len(buildings) > 200:
        key_constraints.append(f"High surrounding structural density ({len(buildings)} buildings surveyed).")
    if len(water) > 0:
        key_constraints.append(f"Mapped water bodies/coastal features present ({len(water)} water boundaries).")
    if not key_constraints:
        key_constraints.append("Open peripheral land available for planned connectivity improvements.")

    problem_summary = ProblemSummary(
        primaryDeficiency=title,
        severity=primary_issue.get("severity", "LOW") if primary_issue else "LOW",
        evidencePoints=evidence_points[:5],
        criticalCorridors=critical_corridors,
        criticalJunctions=critical_junctions,
        keyConstraints=key_constraints,
        planningRequirement=(
            "Mitigate corridor bottleneck and intersection friction while minimizing land acquisition and water impact."
            if not is_adequate else "Preserve existing operating Level of Service through routine preventative maintenance."
        ),
        interventionRecommended=not is_adequate,
    )

    # 2. Find target geometry for candidate generation
    target_road = None
    target_road_id = primary_issue.get("roadSegmentId") if primary_issue else None
    if target_road_id:
        for r in roads:
            if r.get("id") == target_road_id:
                target_road = r
                break

    if not target_road and roads:
        # Fallback to road with highest demand / length
        target_road = roads[0]
        for r in roads:
            if len(r.get("geometry", [])) > len(target_road.get("geometry", [])):
                target_road = r

    target_geom = target_road.get("geometry", []) if target_road else []
    target_name = target_road.get("name", "Primary Corridor") if target_road else "Corridor"
    target_vc = primary_issue.get("metrics", {}).get("vcRatio", 1.1) if primary_issue else 0.65
    target_demand = float(primary_issue.get("metrics", {}).get("estimatedDemandVehHr", 1650.0)) if primary_issue else 800.0
    target_capacity = float(primary_issue.get("metrics", {}).get("estimatedCapacityVehHr", 1400.0)) if primary_issue else 1500.0
    target_junc_conflict = 75.0


    target_junction = None
    target_junc_id = primary_issue.get("junctionId") if primary_issue else None
    if target_junc_id:
        for j in junction_analyses:
            if j.get("id") == target_junc_id:
                target_junction = j
                break
    if not target_junction and junction_analyses:
        target_junction = junction_analyses[0]

    junc_coord = target_junction.get("coordinate") if target_junction else None

    candidates: List[CandidatePlan] = []

    # ─────────────────────────────────────────────────────────────────────────────
    # CANDIDATE A: GRADE SEPARATION / FLYOVER
    # ─────────────────────────────────────────────────────────────────────────────
    if len(target_geom) >= 2 and not is_adequate:
        flyover_parts = generate_elevated_flyover_segments(
            target_geom,
            deck_height_meters=6.5,
            deck_lanes=4,
            deck_width_meters=14.0
        )
        flyover_segments = []
        for idx, part in enumerate(flyover_parts):
            flyover_segments.append(ProposedRoadSegment(
                id=f"prop-flyover-{idx+1}",
                name=f"{target_name} Flyover {part['subType'].replace('_', ' ').title()}",
                type=part["subType"],
                geometry=part["geometry"],
                lanes=part["lanes"],
                widthMeters=part["widthMeters"],
                isElevated=part["isElevated"],
                elevationMeters=part["elevationMeters"],
                sourceRoadId=target_road.get("id"),
                curbType=part["curbType"],
                hasMedian=True,
                medianWidth=1.5,
            ))

        length_m = calculate_corridor_length_meters(target_geom)
        bldg_conflicts, _ = check_building_conflicts(target_geom, 8.0, buildings)
        water_conflicts, _ = check_water_conflicts(target_geom, 8.0, water)

        feas_status, feas_reason = evaluate_plan_feasibility(
            "GRADE_SEPARATION", flyover_segments, bldg_conflicts, water_conflicts, length_m
        )

        metrics = evaluate_plan_metrics(
            "GRADE_SEPARATION",
            [primary_issue] if primary_issue else [],
            bldg_conflicts,
            water_conflicts,
            length_m,
            current_vc=target_vc,
            priority=priority
        )

        explanation = generate_plan_explanation(
            "Grade-Separated Flyover Corridor",
            "GRADE_SEPARATION",
            title,
            primary_issue or {},
            bldg_conflicts,
            water_conflicts,
            length_m,
            metrics.model_dump(),
            priority=priority
        )
        ev_a = build_candidate_evidence(
            "GRADE_SEPARATION",
            target_road,
            target_junction,
            [target_road.get("id")] if target_road else [],
            [target_junction.get("id")] if target_junction else [],
            length_m,
            bldg_conflicts,
            len(buildings),
            water_conflicts,
            1000.0,
            target_vc,
            target_demand,
            target_capacity,
            centrality=82.0,
            junction_conflict_score=target_junc_conflict,
        )
        why_a = generate_engineering_why_selected("GRADE_SEPARATION", ev_a, target_name)
        rej_a = [RejectedAlternative(**r) for r in generate_rejected_alternatives("GRADE_SEPARATION", ev_a)]

        candidates.append(CandidatePlan(
            id="plan-opt-grade-separation",
            name=f"{target_name} Grade-Separated Flyover",
            interventionType="GRADE_SEPARATION",
            status=feas_status,
            feasibilityReason=feas_reason,
            problemAddressed=f"Eliminates bottleneck saturation on {target_name} and grades over conflict junction.",
            whyThisLocation=f"Arterial spine corridor carrying peak modelled volume ({target_name}).",
            proposedGeometry=flyover_segments,
            sourceRoadIds=[target_road.get("id")] if target_road else [],
            affectedJunctionIds=[target_junction.get("id")] if target_junction else [],
            targetedIssueIds=[primary_issue.get("id")] if primary_issue else [],
            metrics=metrics,
            keyBenefits=[
                "Eliminates cross-traffic stopping delays on through-corridor",
                "Substantially reduces vehicular conflict index at intersection",
                "Requires minimal lateral right-of-way expansion (stays within median)",
                "Preserves ground-level carriageways for local commercial access",
            ],
            majorTradeoffs=[
                "High structural capital expenditure",
                "Construction disruption during pier foundation drilling",
                "Requires 150m ramp transition zones at corridor terminals",
            ],
            constraintsAvoided=[
                "Avoids direct building frontage demolition",
                "Preserves adjacent mapped water bodies / drainage paths",
            ],
            buildingConflictsCount=bldg_conflicts,
            waterIntersectsCount=water_conflicts,
            proposedLengthMeters=length_m,
            costCategory="HIGH",
            confidence=88.0,
            explanation=explanation,
            evidence=ev_a,
            rejectedAlternatives=rej_a,
            whyThisIntervention=why_a,
            reasoning=why_a,
            geographicFeasibility={"status": feas_status, "reason": feas_reason},
            dataProvenance=ev_a["data_provenance"],
        ))


    # ─────────────────────────────────────────────────────────────────────────────
    # CANDIDATE B: ROAD WIDENING (2-Lane to 4-Lane Divided Carriageway)
    # ─────────────────────────────────────────────────────────────────────────────
    if len(target_geom) >= 2 and not is_adequate:
        widened_segments = [ProposedRoadSegment(
            id="prop-widened-corridor",
            name=f"{target_name} (Widened 4-Lane Divided)",
            type="existing_widened",
            geometry=target_geom,
            lanes=4,
            widthMeters=15.0,
            isElevated=False,
            elevationMeters=0.0,
            sourceRoadId=target_road.get("id"),
            curbType="concrete_curb",
            hasMedian=True,
            medianWidth=2.0,
        )]

        length_m = calculate_corridor_length_meters(target_geom)
        bldg_conflicts, _ = check_building_conflicts(target_geom, 10.0, buildings)
        water_conflicts, _ = check_water_conflicts(target_geom, 10.0, water)

        feas_status, feas_reason = evaluate_plan_feasibility(
            "ROAD_WIDENING", widened_segments, bldg_conflicts, water_conflicts, length_m
        )

        metrics = evaluate_plan_metrics(
            "ROAD_WIDENING",
            [primary_issue] if primary_issue else [],
            bldg_conflicts,
            water_conflicts,
            length_m,
            current_vc=target_vc,
            priority=priority
        )

        explanation = generate_plan_explanation(
            "Corridor Widening (4-Lane Divided)",
            "ROAD_WIDENING",
            title,
            primary_issue or {},
            bldg_conflicts,
            water_conflicts,
            length_m,
            metrics.model_dump(),
            priority=priority
        )
        ev_b = build_candidate_evidence(
            "ROAD_WIDENING",
            target_road,
            target_junction,
            [target_road.get("id")] if target_road else [],
            [target_junction.get("id")] if target_junction else [],
            length_m,
            bldg_conflicts,
            len(buildings),
            water_conflicts,
            1000.0,
            target_vc,
            target_demand,
            target_capacity,
            centrality=82.0,
            junction_conflict_score=target_junc_conflict,
        )
        why_b = generate_engineering_why_selected("ROAD_WIDENING", ev_b, target_name)
        rej_b = [RejectedAlternative(**r) for r in generate_rejected_alternatives("ROAD_WIDENING", ev_b)]

        candidates.append(CandidatePlan(
            id="plan-opt-road-widening",
            name=f"{target_name} 4-Lane Carriageway Widening",
            interventionType="ROAD_WIDENING",
            status=feas_status,
            feasibilityReason=feas_reason,
            problemAddressed=f"Resolves capacity deficit and high V/C ratio on {target_name}.",
            whyThisLocation=f"Primary arterial link carrying high inter-district traffic demand.",
            proposedGeometry=widened_segments,
            sourceRoadIds=[target_road.get("id")] if target_road else [],
            affectedJunctionIds=[target_junction.get("id")] if target_junction else [],
            targetedIssueIds=[primary_issue.get("id")] if primary_issue else [],
            metrics=metrics,
            keyBenefits=[
                "Doubles structural throughput capacity (estimated +88% capacity gain)",
                "Physical median barrier eliminates head-on collision hazard",
                "Accommodates anticipated 15-year traffic growth",
                "Improves emergency vehicle response times",
            ],
            majorTradeoffs=[
                f"Infringes upon {bldg_conflicts} structural setbacks / building footprints",
                "Significant land acquisition compensation required",
                "Extended lane closures and traffic disruption during construction",
            ],
            constraintsAvoided=["Engineered within existing general corridor alignment"],
            buildingConflictsCount=bldg_conflicts,
            waterIntersectsCount=water_conflicts,
            proposedLengthMeters=length_m,
            costCategory="HIGH" if bldg_conflicts > 5 else "MODERATE",
            confidence=85.0,
            explanation=explanation,
            evidence=ev_b,
            rejectedAlternatives=rej_b,
            whyThisIntervention=why_b,
            reasoning=why_b,
            geographicFeasibility={"status": feas_status, "reason": feas_reason},
            dataProvenance=ev_b["data_provenance"],
        ))


    # ─────────────────────────────────────────────────────────────────────────────
    # CANDIDATE C: JUNCTION IMPROVEMENT / MODERN ROUNDABOUT
    # ─────────────────────────────────────────────────────────────────────────────
    if junc_coord and not is_adequate:
        # Generate roundabout circular geometry around intersection
        radius_m = 25.0
        r_deg_lat = radius_m / 111320.0
        r_deg_lon = radius_m / (111320.0 * math.cos(math.radians(junc_coord[0])))
        circle_pts = []
        for a in range(0, 361, 30):
            rad = math.radians(a)
            circle_pts.append((
                round(junc_coord[0] + math.sin(rad) * r_deg_lat, 6),
                round(junc_coord[1] + math.cos(rad) * r_deg_lon, 6)
            ))

        roundabout_segments = [ProposedRoadSegment(
            id="prop-roundabout-circ",
            name="Modern Circulating Roundabout",
            type="roundabout",
            geometry=circle_pts,
            lanes=2,
            widthMeters=9.5,
            isElevated=False,
            elevationMeters=0.0,
            curbType="mountable_truck_apron",
            hasMedian=True,
            medianWidth=12.0,
        )]

        length_m = calculate_corridor_length_meters(circle_pts)
        bldg_conflicts, _ = check_building_conflicts(circle_pts, 8.0, buildings)
        water_conflicts, _ = check_water_conflicts(circle_pts, 8.0, water)

        feas_status, feas_reason = evaluate_plan_feasibility(
            "INTERSECTION_REDESIGN", roundabout_segments, bldg_conflicts, water_conflicts, length_m
        )

        metrics = evaluate_plan_metrics(
            "INTERSECTION_REDESIGN",
            [primary_issue] if primary_issue else [],
            bldg_conflicts,
            water_conflicts,
            length_m,
            current_vc=target_vc,
            priority=priority
        )

        explanation = generate_plan_explanation(
            "Modern Channelized Roundabout",
            "INTERSECTION_REDESIGN",
            title,
            primary_issue or {},
            bldg_conflicts,
            water_conflicts,
            length_m,
            metrics.model_dump(),
            priority=priority
        )
        ev_c = build_candidate_evidence(
            "ROUNDABOUT",
            target_road,
            target_junction,
            target_junction.get("connectedRoadIds", []),
            [target_junction.get("id")],
            length_m,
            bldg_conflicts,
            len(buildings),
            water_conflicts,
            1000.0,
            target_vc,
            target_demand,
            target_capacity,
            centrality=78.0,
            junction_conflict_score=target_junc_conflict,
        )
        why_c = generate_engineering_why_selected("ROUNDABOUT", ev_c, "Intersection Node")
        rej_c = [RejectedAlternative(**r) for r in generate_rejected_alternatives("ROUNDABOUT", ev_c)]

        candidates.append(CandidatePlan(
            id="plan-opt-junction-redesign",
            name="Modern Roundabout & Channelization",
            interventionType="INTERSECTION_REDESIGN",
            status=feas_status,
            feasibilityReason=feas_reason,
            problemAddressed=f"Eliminates high vehicular conflict index at junction ({target_junction.get('armCount', 4)} approaches).",
            whyThisLocation=f"Primary node intersection with multiple competing approaches.",
            proposedGeometry=roundabout_segments,
            sourceRoadIds=target_junction.get("connectedRoadIds", []),
            affectedJunctionIds=[target_junction.get("id")],
            targetedIssueIds=[primary_issue.get("id")] if primary_issue else [],
            metrics=metrics,
            keyBenefits=[
                "Eliminates 32 vehicular conflict points to 8 yield merging points",
                "High safety index (+92/100 potential safety gain)",
                "Low capital cost compared to grade separation",
                "Continuous low-speed circulating flow without signal maintenance",
            ],
            majorTradeoffs=[
                "Requires circular right-of-way diameter of ~50 meters",
                "Slightly lower ultimate capacity than a multi-lane grade separation",
            ],
            constraintsAvoided=["Avoids structural elevated bridge components"],
            buildingConflictsCount=bldg_conflicts,
            waterIntersectsCount=water_conflicts,
            proposedLengthMeters=length_m,
            costCategory="LOW",
            confidence=90.0,
            explanation=explanation,
            evidence=ev_c,
            rejectedAlternatives=rej_c,
            whyThisIntervention=why_c,
            reasoning=why_c,
            geographicFeasibility={"status": feas_status, "reason": feas_reason},
            dataProvenance=ev_c["data_provenance"],
        ))


    # ─────────────────────────────────────────────────────────────────────────────
    # CANDIDATE D: CONNECTOR / PARALLEL RELIEF ROAD
    # ─────────────────────────────────────────────────────────────────────────────
    if len(roads) >= 2 and not is_adequate:
        # Find two disconnected or distant nodes across the network to provide relief
        road_a = roads[0]
        road_b = roads[min(len(roads) - 1, 3)]
        p_start = road_a["geometry"][0]
        p_end = road_b["geometry"][-1]

        # Interpolate a smooth natural bypass curve
        connector_pts = interpolate_curved_connector(p_start, p_end, num_steps=10)
        conn_len_m = calculate_corridor_length_meters(connector_pts)

        if conn_len_m >= 150.0 and conn_len_m <= 6000.0:
            bldg_conflicts, _ = check_building_conflicts(connector_pts, 8.0, buildings)
            water_conflicts, _ = check_water_conflicts(connector_pts, 8.0, water)

            connector_segments = [ProposedRoadSegment(
                id="prop-connector-relief",
                name="Peripheral Relief Connector Road",
                type="connector",
                geometry=connector_pts,
                lanes=2,
                widthMeters=8.5,
                isElevated=False,
                elevationMeters=0.0,
                curbType="standard",
                hasMedian=False,
            )]

            feas_status, feas_reason = evaluate_plan_feasibility(
                "CONNECTOR_ROAD", connector_segments, bldg_conflicts, water_conflicts, conn_len_m
            )

            metrics = evaluate_plan_metrics(
                "CONNECTOR_ROAD",
                [primary_issue] if primary_issue else [],
                bldg_conflicts,
                water_conflicts,
                conn_len_m,
                current_vc=target_vc,
                priority=priority
            )

            explanation = generate_plan_explanation(
                "Peripheral Relief Connector Road",
                "CONNECTOR_ROAD",
                title,
                primary_issue or {},
                bldg_conflicts,
                water_conflicts,
                conn_len_m,
                metrics.model_dump(),
                priority=priority
            )

            ev_d = build_candidate_evidence(
                "CONNECTOR_ROAD",
                road_a,
                None,
                [road_a.get("id"), road_b.get("id")],
                [],
                conn_len_m,
                bldg_conflicts,
                len(buildings),
                water_conflicts,
                1000.0,
                target_vc,
                target_demand,
                target_capacity,
                centrality=85.0,
                junction_conflict_score=50.0,
            )
            why_d = generate_engineering_why_selected("CONNECTOR_ROAD", ev_d, "Peripheral Corridor")
            rej_d = [RejectedAlternative(**r) for r in generate_rejected_alternatives("CONNECTOR_ROAD", ev_d)]

            candidates.append(CandidatePlan(
                id="plan-opt-connector-relief",
                name="Peripheral Relief Connector Road",
                interventionType="CONNECTOR_ROAD",
                status=feas_status,
                feasibilityReason=feas_reason,
                problemAddressed=f"Diverts through-traffic away from congested town core corridor.",
                whyThisLocation="Connects peripheral arterial nodes to create redundant alternative routing.",
                proposedGeometry=connector_segments,
                sourceRoadIds=[road_a.get("id"), road_b.get("id")],
                affectedJunctionIds=[],
                targetedIssueIds=[primary_issue.get("id")] if primary_issue else [],
                metrics=metrics,
                keyBenefits=[
                    "Provides secondary redundant corridor (+90/100 connectivity gain)",
                    "Diverts 25-35% of freight and through-traffic from congested center",
                    "Built offline without obstructing current traffic flow",
                ],
                majorTradeoffs=[
                    "Requires greenfield / peripheral right-of-way acquisition",
                    "Higher environmental footprint than reconfiguring existing pavement",
                ],
                constraintsAvoided=["Avoids existing dense city core congestion"],
                buildingConflictsCount=bldg_conflicts,
                waterIntersectsCount=water_conflicts,
                proposedLengthMeters=conn_len_m,
                costCategory="HIGH" if conn_len_m > 2000.0 else "MODERATE",
                confidence=82.0,
                explanation=explanation,
                evidence=ev_d,
                rejectedAlternatives=rej_d,
                whyThisIntervention=why_d,
                reasoning=why_d,
                geographicFeasibility={"status": feas_status, "reason": feas_reason},
                dataProvenance=ev_d["data_provenance"],
            ))


    # ─────────────────────────────────────────────────────────────────────────────
    # CANDIDATE E: LANE RECONFIGURATION & MEDIAN BARRIER
    # ─────────────────────────────────────────────────────────────────────────────
    if len(target_geom) >= 2 and not is_adequate:
        reconfigured_segments = [ProposedRoadSegment(
            id="prop-reconfigured-pavement",
            name=f"{target_name} Operational Reconfiguration",
            type="reconfigured_lane",
            geometry=target_geom,
            lanes=3,  # 2 travel + 1 dedicated tidal/turning pocket
            widthMeters=target_road.get("estimatedWidth", 8.0),
            isElevated=False,
            elevationMeters=0.0,
            sourceRoadId=target_road.get("id"),
            curbType="standard",
            hasMedian=True,
            medianWidth=0.8,
        )]

        length_m = calculate_corridor_length_meters(target_geom)
        feas_status, feas_reason = evaluate_plan_feasibility(
            "LANE_RECONFIGURATION", reconfigured_segments, 0, 0, length_m
        )

        metrics = evaluate_plan_metrics(
            "LANE_RECONFIGURATION",
            [primary_issue] if primary_issue else [],
            0,
            0,
            length_m,
            current_vc=target_vc,
            priority=priority
        )

        explanation = generate_plan_explanation(
            "Operational Lane Reconfiguration",
            "LANE_RECONFIGURATION",
            title,
            primary_issue or {},
            0,
            0,
            length_m,
            metrics.model_dump(),
            priority=priority
        )

        ev_e = build_candidate_evidence(
            "LANE_RECONFIGURATION",
            target_road,
            None,
            [target_road.get("id")] if target_road else [],
            [],
            length_m,
            0,
            len(buildings),
            0,
            1000.0,
            target_vc,
            target_demand,
            target_capacity,
            centrality=78.0,
            junction_conflict_score=45.0,
        )
        why_e = generate_engineering_why_selected("LANE_RECONFIGURATION", ev_e, target_name)
        rej_e = [RejectedAlternative(**r) for r in generate_rejected_alternatives("LANE_RECONFIGURATION", ev_e)]

        candidates.append(CandidatePlan(
            id="plan-opt-lane-reconfig",
            name=f"{target_name} Operational Re-Striping & Median",
            interventionType="LANE_RECONFIGURATION",
            status="FEASIBLE",
            feasibilityReason="Executed entirely within existing carriageway boundary; zero land or building impact.",
            problemAddressed="Removes turning friction and mid-block interference with low capital outlay.",
            whyThisLocation="Immediate short-term operational fix for corridor friction.",
            proposedGeometry=reconfigured_segments,
            sourceRoadIds=[target_road.get("id")] if target_road else [],
            affectedJunctionIds=[],
            targetedIssueIds=[primary_issue.get("id")] if primary_issue else [],
            metrics=metrics,
            keyBenefits=[
                "Rapid implementation (re-striping, signages, and precast median barrier)",
                "Zero land acquisition and zero structural building demolition",
                "Extremely low cost (Cost Category: LOW)",
                "Minimal construction disruption (overnight lane execution)",
            ],
            majorTradeoffs=[
                "Modest long-term capacity gain (+42% vs +88% for widening)",
                "Does not physically increase the right-of-way footprint",
            ],
            constraintsAvoided=["100% contained within existing pavement"],
            buildingConflictsCount=0,
            waterIntersectsCount=0,
            proposedLengthMeters=length_m,
            costCategory="LOW",
            confidence=92.0,
            explanation=explanation,
            evidence=ev_e,
            rejectedAlternatives=rej_e,
            whyThisIntervention=why_e,
            reasoning=why_e,
            geographicFeasibility={"status": "FEASIBLE", "reason": feas_reason},
            dataProvenance=ev_e["data_provenance"],
        ))

    # ─────────────────────────────────────────────────────────────────────────────
    # CANDIDATE F: NO MAJOR INTERVENTION (Baseline Option)
    # ─────────────────────────────────────────────────────────────────────────────
    no_build_metrics = evaluate_plan_metrics(
        "NO_MAJOR_INTERVENTION",
        [],
        0,
        0,
        0.0,
        current_vc=target_vc,
        priority=priority
    )

    no_build_explanation = (
        "Baseline No-Intervention Strategy:\n\n"
        "1. Preserves existing infrastructure layout without capital allocation.\n"
        "2. Avoids construction disruption, commercial loss, and right-of-way acquisition.\n"
        "3. Recommended only when existing level-of-service is adequate or under extreme budgetary constraints."
    )

    ev_f = build_candidate_evidence(
        "NO_MAJOR_INTERVENTION",
        target_road,
        None,
        [],
        [],
        0.0,
        0,
        len(buildings),
        0,
        1000.0,
        target_vc,
        target_demand,
        target_capacity,
        centrality=60.0,
        junction_conflict_score=30.0,
    )
    why_f = generate_engineering_why_selected("NO_MAJOR_INTERVENTION", ev_f, target_name)
    rej_f = [RejectedAlternative(**r) for r in generate_rejected_alternatives("NO_MAJOR_INTERVENTION", ev_f)]

    candidates.append(CandidatePlan(
        id="plan-opt-no-intervention",
        name="No Major Intervention (Routine Maintenance)",
        interventionType="NO_MAJOR_INTERVENTION",
        status="FEASIBLE",
        feasibilityReason="Requires no capital construction or permits.",
        problemAddressed="Maintains baseline operational state.",
        whyThisLocation="Preserves natural and built environment without construction friction.",
        proposedGeometry=[],
        sourceRoadIds=[],
        affectedJunctionIds=[],
        targetedIssueIds=[],
        metrics=no_build_metrics,
        keyBenefits=[
            "Zero capital cost expenditure",
            "Zero land acquisition and zero building displacement",
            "Zero environmental and drainage disruption",
        ],
        majorTradeoffs=[
            "Leaves existing corridor bottlenecks and peak-hour queueing unmitigated",
            "No capacity buffer for future population or vehicular growth",
        ],
        constraintsAvoided=["All physical and environmental constraints avoided"],
        buildingConflictsCount=0,
        waterIntersectsCount=0,
        proposedLengthMeters=0.0,
        costCategory="NEGLIGIBLE",
        confidence=95.0,
        explanation=no_build_explanation,
        evidence=ev_f,
        rejectedAlternatives=rej_f,
        whyThisIntervention=why_f,
        reasoning=why_f,
        geographicFeasibility={"status": "FEASIBLE", "reason": "Requires no capital construction or permits."},
        dataProvenance=ev_f["data_provenance"],
    ))


    # 3. Phase 8: Generate spatially grounded candidate options for each Development Zone
    dev_candidates = _generate_zone_specific_candidates(geo_area, analysis, priority=priority)
    if dev_candidates:
        candidates.extend(dev_candidates)

    # 4. Sort candidates according to overallScore under selected priority
    candidates.sort(key=lambda c: c.metrics.overallScore, reverse=True)

    # 5. Determine Recommended Best-Fit Plan
    # Highest ranked FEASIBLE plan (or CONDITIONAL if no FEASIBLE)
    recommended_id = candidates[0].id
    for c in candidates:
        if c.status == "FEASIBLE" and c.interventionType != "NO_MAJOR_INTERVENTION":
            recommended_id = c.id
            break

    # If is_adequate was True, No-Intervention is the true recommendation
    if is_adequate:
        recommended_id = "plan-opt-no-intervention"

    return problem_summary, candidates, recommended_id


def _generate_zone_specific_candidates(
    geo_area: Dict[str, Any],
    analysis: Dict[str, Any],
    priority: str = "balanced"
) -> List[CandidatePlan]:
    """
    Phase 8: Synthesizes spatially grounded infrastructure intervention options
    tailored to each individual Development Zone across the whole place.
    """
    if hasattr(geo_area, "model_dump"):
        geo_area = geo_area.model_dump()
    elif hasattr(geo_area, "dict"):
        geo_area = geo_area.dict()

    if hasattr(analysis, "model_dump"):
        analysis = analysis.model_dump()
    elif hasattr(analysis, "dict"):
        analysis = analysis.dict()

    dev_zones = geo_area.get("developmentZones") or analysis.get("developmentZones") or []
    if not dev_zones:
        return []

    roads = geo_area.get("roads", [])
    roads_by_id = {r.get("id"): r for r in roads}
    buildings = geo_area.get("buildings", [])
    water = geo_area.get("water", [])
    issues = analysis.get("issues", [])
    issues_by_id = {iss.get("id"): iss for iss in issues}
    junction_analyses = analysis.get("junctionAnalysis", [])
    junctions_by_id = {j.get("id"): j for j in junction_analyses}

    zone_candidates: List[CandidatePlan] = []

    for z in dev_zones:
        z_dict = z.model_dump() if hasattr(z, "model_dump") else (z.dict() if hasattr(z, "dict") else z)
        z_id = z_dict.get("zoneId", "zone-01")
        z_name = z_dict.get("name", "Development Zone")
        z_type = z_dict.get("zoneType", "CONGESTED_ARTERIAL")
        aff_roads = z_dict.get("affectedRoadIds", [])
        aff_juncs = z_dict.get("affectedJunctionIds", [])
        iss_ids = z_dict.get("issueIds", [])
        rec_types = z_dict.get("recommendedCandidates", [])
        constraints = z_dict.get("constraints", {})

        zone_issues = [issues_by_id[iid] for iid in iss_ids if iid in issues_by_id]

        target_road = None
        for rid in aff_roads:
            if rid in roads_by_id and len(roads_by_id[rid].get("geometry", [])) >= 2:
                target_road = roads_by_id[rid]
                break

        target_junc = None
        for jid in aff_juncs:
            if jid in junctions_by_id:
                target_junc = junctions_by_id[jid]
                break

        nearby_bldgs = constraints.get("buildingCount", 0)
        water_dist = constraints.get("waterProximityMeters", 1000.0)
        avg_w = constraints.get("averageWidthMeters", 8.0)

        # Baseline monitoring for stable equilibrium zones
        if z_type == "STABLE_EQUILIBRIUM" or rec_types == ["NO_MAJOR_INTERVENTION"]:
            no_build_metrics = evaluate_plan_metrics(
                "NO_MAJOR_INTERVENTION", zone_issues, 0, 0, 0.0, current_vc=0.50, priority=priority
            )
            ev_stable = build_candidate_evidence(
                "NO_MAJOR_INTERVENTION",
                target_road,
                None,
                aff_roads[:10],
                [],
                0.0,
                0,
                0,
                0,
                water_dist,
                0.50,
                750.0,
                1400.0,
                centrality=50.0,
                junction_conflict_score=20.0,
            )
            why_stable = generate_engineering_why_selected("NO_MAJOR_INTERVENTION", ev_stable, z_name)
            rej_stable = [RejectedAlternative(**r) for r in generate_rejected_alternatives("NO_MAJOR_INTERVENTION", ev_stable)]

            zone_candidates.append(CandidatePlan(
                id=f"{z_id}-no-intervention",
                name=f"{z_name} (Baseline Monitoring)",
                interventionType="NO_MAJOR_INTERVENTION",
                status="FEASIBLE",
                feasibilityReason="Preserves baseline asset functionality with zero capital expenditure.",
                problemAddressed="Corridor network operating within stable capacity thresholds.",
                whyThisLocation=f"V/C ratio < 0.65 across {len(aff_roads)} surveyed roads; capital intervention unjustified.",
                proposedGeometry=[],
                sourceRoadIds=aff_roads[:10],
                affectedJunctionIds=[],
                targetedIssueIds=[],
                zoneId=z_id,
                zoneName=z_name,
                metrics=no_build_metrics,
                keyBenefits=["Zero capital budget expenditure", "Preserves existing traffic flow equilibrium"],
                majorTradeoffs=["No long-term structural capacity additions"],
                constraintsAvoided=["No land take or utility relocation"],
                buildingConflictsCount=0,
                waterIntersectsCount=0,
                proposedLengthMeters=0.0,
                costCategory="NEGLIGIBLE",
                confidence=92.0,
                explanation="Baseline Monitoring: Traffic demand operating stably within designed capacity limits.",
                evidence=ev_stable,
                rejectedAlternatives=rej_stable,
                whyThisIntervention=why_stable,
                reasoning=why_stable,
                geographicFeasibility={"status": "FEASIBLE", "reason": "Preserves baseline asset functionality with zero capital expenditure."},
                dataProvenance=ev_stable["data_provenance"],
            ))
            continue

        # For problem zones, generate candidates matching recommendedCandidates
        for rec in rec_types:
            if rec == "ROAD_WIDENING" and target_road:
                geom = target_road.get("geometry", [])
                length_m = calculate_corridor_length_meters(geom)
                bldg_c, _ = check_building_conflicts(geom, 10.0, buildings)
                water_c, _ = check_water_conflicts(geom, 10.0, water)
                segs = [ProposedRoadSegment(
                    id=f"prop-{z_id}-widening",
                    name=f"{target_road.get('name', 'Corridor')} (Widened 4-Lane)",
                    type="existing_widened",
                    geometry=geom,
                    lanes=4,
                    widthMeters=15.0,
                    isElevated=False,
                    elevationMeters=0.0,
                    sourceRoadId=target_road.get("id"),
                    curbType="concrete_curb",
                    hasMedian=True,
                    medianWidth=2.0,
                )]
                feas_status, feas_reason = evaluate_plan_feasibility("ROAD_WIDENING", segs, bldg_c, water_c, length_m)
                if constraints.get("wideningConstrained") and bldg_c > 15:
                    feas_status = "CONDITIONAL"
                    feas_reason = f"Constrained urban corridor: {bldg_c} structural setbacks impacted. Requires setback acquisition."
                metrics = evaluate_plan_metrics("ROAD_WIDENING", zone_issues, bldg_c, water_c, length_m, current_vc=1.05, priority=priority)

                ev_widening = build_candidate_evidence(
                    "ROAD_WIDENING",
                    target_road,
                    target_junc,
                    [target_road.get("id")],
                    aff_juncs[:2],
                    length_m,
                    bldg_c,
                    nearby_bldgs,
                    water_c,
                    water_dist,
                    1.05,
                    1700.0,
                    1400.0,
                    centrality=80.0,
                    junction_conflict_score=70.0,
                )
                why_widening = generate_engineering_why_selected("ROAD_WIDENING", ev_widening, z_name)
                rej_widening = [RejectedAlternative(**r) for r in generate_rejected_alternatives("ROAD_WIDENING", ev_widening)]

                zone_candidates.append(CandidatePlan(
                    id=f"{z_id}-widening",
                    name=f"{z_name} — 4-Lane Divided Widening",
                    interventionType="ROAD_WIDENING",
                    status=feas_status,
                    feasibilityReason=feas_reason,
                    problemAddressed=f"Eliminates bottleneck saturation along {target_road.get('name', 'primary corridor')}.",
                    whyThisLocation=f"Arterial spine in {z_name} with heavy directional peak demand.",
                    proposedGeometry=segs,
                    sourceRoadIds=[target_road.get("id")],
                    affectedJunctionIds=aff_juncs[:2],
                    targetedIssueIds=iss_ids,
                    zoneId=z_id,
                    zoneName=z_name,
                    metrics=metrics,
                    keyBenefits=["Doubles vehicular carrying capacity (+88%)", "Median barrier prevents head-on conflicts"],
                    majorTradeoffs=[f"Demands structural setback buffer impacting {bldg_c} surveyed buildings"],
                    constraintsAvoided=["Engineered within existing alignment"],
                    buildingConflictsCount=bldg_c,
                    waterIntersectsCount=water_c,
                    proposedLengthMeters=length_m,
                    costCategory="HIGH" if bldg_c > 10 else "MODERATE",
                    confidence=86.0,
                    explanation=f"Widening strategy for {z_name}: Expands to 4-lane divided cross-section.",
                    evidence=ev_widening,
                    rejectedAlternatives=rej_widening,
                    whyThisIntervention=why_widening,
                    reasoning=why_widening,
                    geographicFeasibility={"status": feas_status, "reason": feas_reason},
                    dataProvenance=ev_widening["data_provenance"],
                ))


            elif rec == "LANE_RECONFIGURATION" and target_road:
                geom = target_road.get("geometry", [])
                length_m = calculate_corridor_length_meters(geom)
                segs = [ProposedRoadSegment(
                    id=f"prop-{z_id}-reconfig",
                    name=f"{target_road.get('name', 'Corridor')} (Operational Reconfiguration)",
                    type="existing_reconfigured",
                    geometry=geom,
                    lanes=3,
                    widthMeters=target_road.get("estimatedWidth", 9.0),
                    isElevated=False,
                    elevationMeters=0.0,
                    sourceRoadId=target_road.get("id"),
                    curbType="standard",
                    hasMedian=False,
                )]
                metrics = evaluate_plan_metrics("LANE_RECONFIGURATION", zone_issues, 0, 0, length_m, current_vc=0.92, priority=priority)

                ev_reconfig = build_candidate_evidence(
                    "LANE_RECONFIGURATION",
                    target_road,
                    target_junc,
                    [target_road.get("id")],
                    aff_juncs[:2],
                    length_m,
                    0,
                    nearby_bldgs,
                    0,
                    water_dist,
                    0.92,
                    1600.0,
                    1400.0,
                    centrality=75.0,
                    junction_conflict_score=65.0,
                )
                why_reconfig = generate_engineering_why_selected("LANE_RECONFIGURATION", ev_reconfig, z_name)
                rej_reconfig = [RejectedAlternative(**r) for r in generate_rejected_alternatives("LANE_RECONFIGURATION", ev_reconfig)]

                zone_candidates.append(CandidatePlan(
                    id=f"{z_id}-reconfig",
                    name=f"{z_name} — Cross-Section Reconfiguration",
                    interventionType="LANE_RECONFIGURATION",
                    status="FEASIBLE",
                    feasibilityReason="100% contained within existing pavement edge. Zero land acquisition.",
                    problemAddressed=f"Relieves queuing without structural building demolition in {z_name}.",
                    whyThisLocation=f"Dense urban corridor in {z_name} with zero lateral setback buffer.",
                    proposedGeometry=segs,
                    sourceRoadIds=[target_road.get("id")],
                    affectedJunctionIds=aff_juncs[:2],
                    targetedIssueIds=iss_ids,
                    zoneId=z_id,
                    zoneName=z_name,
                    metrics=metrics,
                    keyBenefits=["Zero building demolition", "Rapid implementation and low capital expenditure"],
                    majorTradeoffs=["Moderate capacity headroom gain (+42%)"],
                    constraintsAvoided=["100% building and water avoidance"],
                    buildingConflictsCount=0,
                    waterIntersectsCount=0,
                    proposedLengthMeters=length_m,
                    costCategory="LOW",
                    confidence=90.0,
                    explanation=f"Operational cross-section reconfiguration in {z_name}: Maximizes throughput within existing carriageway.",
                    evidence=ev_reconfig,
                    rejectedAlternatives=rej_reconfig,
                    whyThisIntervention=why_reconfig,
                    reasoning=why_reconfig,
                    geographicFeasibility={"status": "FEASIBLE", "reason": "100% contained within existing pavement edge. Zero land acquisition."},
                    dataProvenance=ev_reconfig["data_provenance"],
                ))

            elif rec == "GRADE_SEPARATION" and target_road:
                geom = target_road.get("geometry", [])
                length_m = calculate_corridor_length_meters(geom)
                parts = generate_elevated_flyover_segments(geom, deck_height_meters=6.5, deck_lanes=4, deck_width_meters=14.0)
                segs = []
                for idx, part in enumerate(parts):
                    segs.append(ProposedRoadSegment(
                        id=f"prop-{z_id}-flyover-{idx+1}",
                        name=f"{target_road.get('name', 'Corridor')} Flyover {part['subType']}",
                        type=part["subType"],
                        geometry=part["geometry"],
                        lanes=part["lanes"],
                        widthMeters=part["widthMeters"],
                        isElevated=part["isElevated"],
                        elevationMeters=part["elevationMeters"],
                        sourceRoadId=target_road.get("id"),
                        curbType=part["curbType"],
                        hasMedian=True,
                        medianWidth=1.5,
                    ))
                bldg_c, _ = check_building_conflicts(geom, 8.0, buildings)
                water_c, _ = check_water_conflicts(geom, 8.0, water)
                metrics = evaluate_plan_metrics("GRADE_SEPARATION", zone_issues, bldg_c, water_c, length_m, current_vc=1.15, priority=priority)

                ev_flyover = build_candidate_evidence(
                    "GRADE_SEPARATION",
                    target_road,
                    target_junc,
                    [target_road.get("id")],
                    aff_juncs,
                    length_m,
                    bldg_c,
                    nearby_bldgs,
                    water_c,
                    water_dist,
                    1.15,
                    1850.0,
                    1400.0,
                    centrality=85.0,
                    junction_conflict_score=85.0,
                )
                why_flyover = generate_engineering_why_selected("GRADE_SEPARATION", ev_flyover, z_name)
                rej_flyover = [RejectedAlternative(**r) for r in generate_rejected_alternatives("GRADE_SEPARATION", ev_flyover)]

                zone_candidates.append(CandidatePlan(
                    id=f"{z_id}-flyover",
                    name=f"{z_name} — Elevated Flyover Corridor",
                    interventionType="GRADE_SEPARATION",
                    status="FEASIBLE",
                    feasibilityReason="Elevated structure fits within arterial right-of-way corridor.",
                    problemAddressed=f"Separates through-traffic from congested conflict nodes in {z_name}.",
                    whyThisLocation=f"Critical arterial node convergence carrying regional through-traffic in {z_name}.",
                    proposedGeometry=segs,
                    sourceRoadIds=[target_road.get("id")],
                    affectedJunctionIds=aff_juncs,
                    targetedIssueIds=iss_ids,
                    zoneId=z_id,
                    zoneName=z_name,
                    metrics=metrics,
                    keyBenefits=["Eliminates intersection conflict friction for through-traffic", "Maximum Level of Service improvement"],
                    majorTradeoffs=["High structural capital cost", "Pier foundation work-zone disruption"],
                    constraintsAvoided=["Preserves surface carriageway for local commercial access"],
                    buildingConflictsCount=bldg_c,
                    waterIntersectsCount=water_c,
                    proposedLengthMeters=length_m,
                    costCategory="HIGH",
                    confidence=87.0,
                    explanation=f"Grade-separated flyover structure in {z_name}: Completely segregates heavy through-traffic.",
                    evidence=ev_flyover,
                    rejectedAlternatives=rej_flyover,
                    whyThisIntervention=why_flyover,
                    reasoning=why_flyover,
                    geographicFeasibility={"status": "FEASIBLE", "reason": "Elevated structure fits within arterial right-of-way corridor."},
                    dataProvenance=ev_flyover["data_provenance"],
                ))


            elif rec in ["INTERSECTION_REDESIGN", "ROUNDABOUT"]:
                j_coord = target_junc.get("coordinate") if target_junc else z_dict.get("center")
                if j_coord:
                    radius_m = 25.0
                    r_deg_lat = radius_m / 111320.0
                    r_deg_lon = radius_m / (111320.0 * math.cos(math.radians(j_coord[0])))
                    circle_pts = []
                    for a in range(0, 361, 30):
                        rad = math.radians(a)
                        circle_pts.append((
                            round(j_coord[0] + math.sin(rad) * r_deg_lat, 6),
                            round(j_coord[1] + math.cos(rad) * r_deg_lon, 6)
                        ))
                    segs = [ProposedRoadSegment(
                        id=f"prop-{z_id}-roundabout",
                        name=f"{z_name} Modern Roundabout",
                        type="roundabout",
                        geometry=circle_pts,
                        lanes=2,
                        widthMeters=9.5,
                        isElevated=False,
                        elevationMeters=0.0,
                        curbType="mountable_truck_apron",
                        hasMedian=True,
                        medianWidth=12.0,
                    )]
                    length_m = calculate_corridor_length_meters(circle_pts)
                    bldg_c, _ = check_building_conflicts(circle_pts, 8.0, buildings)
                    water_c, _ = check_water_conflicts(circle_pts, 8.0, water)
                    metrics = evaluate_plan_metrics("INTERSECTION_REDESIGN", zone_issues, bldg_c, water_c, length_m, current_vc=0.95, priority=priority)
                    ev_roundabout = build_candidate_evidence(
                        "ROUNDABOUT",
                        target_road,
                        target_junc,
                        target_junc.get("connectedRoadIds", aff_roads[:3]) if target_junc else aff_roads[:3],
                        [target_junc.get("id")] if target_junc else aff_juncs[:1],
                        length_m,
                        bldg_c,
                        nearby_bldgs,
                        water_c,
                        water_dist,
                        0.95,
                        1550.0,
                        1400.0,
                        centrality=78.0,
                        junction_conflict_score=80.0,
                    )
                    why_roundabout = generate_engineering_why_selected("ROUNDABOUT", ev_roundabout, z_name)
                    rej_roundabout = [RejectedAlternative(**r) for r in generate_rejected_alternatives("ROUNDABOUT", ev_roundabout)]

                    zone_candidates.append(CandidatePlan(
                        id=f"{z_id}-roundabout",
                        name=f"{z_name} — Channelized Modern Roundabout",
                        interventionType="INTERSECTION_REDESIGN",
                        status="FEASIBLE",
                        feasibilityReason="Circulating geometry fits node right-of-way envelope.",
                        problemAddressed=f"Replaces high-friction multi-leg junction with continuous circulating flow in {z_name}.",
                        whyThisLocation=f"Multi-approach intersection node exhibiting high delay and conflict points.",
                        proposedGeometry=segs,
                        sourceRoadIds=target_junc.get("connectedRoadIds", aff_roads[:3]) if target_junc else aff_roads[:3],
                        affectedJunctionIds=[target_junc.get("id")] if target_junc else aff_juncs[:1],
                        targetedIssueIds=iss_ids,
                        zoneId=z_id,
                        zoneName=z_name,
                        metrics=metrics,
                        keyBenefits=["Converts 32 vehicular conflict points to 8 yield merges", "Substantial safety index boost"],
                        majorTradeoffs=["Requires 50m diameter circular spatial footprint"],
                        constraintsAvoided=["No complex elevated structures"],
                        buildingConflictsCount=bldg_c,
                        waterIntersectsCount=water_c,
                        proposedLengthMeters=length_m,
                        costCategory="LOW",
                        confidence=89.0,
                        explanation=f"Roundabout and channelization redesign in {z_name}: Continuous circulating flow eliminating signal delay.",
                        evidence=ev_roundabout,
                        rejectedAlternatives=rej_roundabout,
                        whyThisIntervention=why_roundabout,
                        reasoning=why_roundabout,
                        geographicFeasibility={"status": "FEASIBLE", "reason": "Circulating geometry fits node right-of-way envelope."},
                        dataProvenance=ev_roundabout["data_provenance"],
                    ))

            elif rec in ["CONNECTOR_ROAD", "PARALLEL_RELIEF"]:
                road_a = target_road or (roads[0] if roads else None)
                road_b = None
                for r in roads:
                    if road_a and r.get("id") != road_a.get("id") and len(r.get("geometry", [])) >= 2:
                        road_b = r
                        break
                if road_a and road_b:
                    p1 = road_a["geometry"][0]
                    p2 = road_b["geometry"][-1]
                    conn_pts = interpolate_curved_connector(p1, p2, num_steps=10)
                    conn_len = calculate_corridor_length_meters(conn_pts)
                    bldg_c, _ = check_building_conflicts(conn_pts, 8.0, buildings)
                    water_c, _ = check_water_conflicts(conn_pts, 8.0, water)
                    segs = [ProposedRoadSegment(
                        id=f"prop-{z_id}-connector",
                        name=f"{z_name} Strategic Relief Connector",
                        type="connector",
                        geometry=conn_pts,
                        lanes=2,
                        widthMeters=8.5,
                        isElevated=False,
                        elevationMeters=0.0,
                        curbType="standard",
                        hasMedian=False,
                    )]
                    metrics = evaluate_plan_metrics("CONNECTOR_ROAD", zone_issues, bldg_c, water_c, conn_len, current_vc=0.88, priority=priority)

                    ev_connector = build_candidate_evidence(
                        "CONNECTOR_ROAD",
                        road_a,
                        None,
                        [road_a.get("id"), road_b.get("id")],
                        aff_juncs[:1],
                        conn_len,
                        bldg_c,
                        nearby_bldgs,
                        water_c,
                        water_dist,
                        0.88,
                        1400.0,
                        1400.0,
                        centrality=80.0,
                        junction_conflict_score=50.0,
                    )
                    why_connector = generate_engineering_why_selected("CONNECTOR_ROAD", ev_connector, z_name)
                    rej_connector = [RejectedAlternative(**r) for r in generate_rejected_alternatives("CONNECTOR_ROAD", ev_connector)]

                    zone_candidates.append(CandidatePlan(
                        id=f"{z_id}-connector",
                        name=f"{z_name} — Peripheral Relief Connector",
                        interventionType="CONNECTOR_ROAD",
                        status="FEASIBLE",
                        feasibilityReason="Feasible open corridor alignment connecting disconnected network branches.",
                        problemAddressed=f"Provides strategic alternative bypass route bypassing bottleneck core in {z_name}.",
                        whyThisLocation=f"Directly links disconnected sectors to relieve arterial pressure in {z_name}.",
                        proposedGeometry=segs,
                        sourceRoadIds=[road_a.get("id"), road_b.get("id")],
                        affectedJunctionIds=aff_juncs[:1],
                        targetedIssueIds=iss_ids,
                        zoneId=z_id,
                        zoneName=z_name,
                        metrics=metrics,
                        keyBenefits=["Adds redundant network connectivity", "Redistributes up to 25% of corridor through-traffic"],
                        majorTradeoffs=["Requires new right-of-way alignment across open land"],
                        constraintsAvoided=["Bypasses congested commercial street fronts"],
                        buildingConflictsCount=bldg_c,
                        waterIntersectsCount=water_c,
                        proposedLengthMeters=conn_len,
                        costCategory="MODERATE",
                        confidence=85.0,
                        explanation=f"New connector bypass alignment in {z_name}: Creates secondary link to divert through-traffic.",
                        evidence=ev_connector,
                        rejectedAlternatives=rej_connector,
                        whyThisIntervention=why_connector,
                        reasoning=why_connector,
                        geographicFeasibility={"status": "FEASIBLE", "reason": "Feasible open corridor alignment connecting disconnected network branches."},
                        dataProvenance=ev_connector["data_provenance"],
                    ))

        # Always add a Defer / No-Intervention candidate for each problem zone
        zone_no_build = evaluate_plan_metrics("NO_MAJOR_INTERVENTION", zone_issues, 0, 0, 0.0, current_vc=0.90, priority=priority)
        ev_defer = build_candidate_evidence(
            "NO_MAJOR_INTERVENTION",
            target_road,
            None,
            aff_roads[:5],
            [],
            0.0,
            0,
            nearby_bldgs,
            0,
            water_dist,
            0.90,
            1500.0,
            1400.0,
            centrality=60.0,
            junction_conflict_score=35.0,
        )
        why_defer = generate_engineering_why_selected("NO_MAJOR_INTERVENTION", ev_defer, z_name)
        rej_defer = [RejectedAlternative(**r) for r in generate_rejected_alternatives("NO_MAJOR_INTERVENTION", ev_defer)]

        zone_candidates.append(CandidatePlan(
            id=f"{z_id}-defer",
            name=f"{z_name} — Defer Capital Construction",
            interventionType="NO_MAJOR_INTERVENTION",
            status="FEASIBLE",
            feasibilityReason="Zero capital budget requirement.",
            problemAddressed=f"Preserves existing layout in {z_name} without work-zone disruption.",
            whyThisLocation=f"Alternative option prioritizing capital preservation in {z_name}.",
            proposedGeometry=[],
            sourceRoadIds=aff_roads[:5],
            affectedJunctionIds=[],
            targetedIssueIds=[],
            zoneId=z_id,
            zoneName=z_name,
            metrics=zone_no_build,
            keyBenefits=["Zero capital budget expenditure", "Avoids construction disruptions"],
            majorTradeoffs=["Leaves existing corridor friction and peak queues unmitigated"],
            constraintsAvoided=["All physical and environmental impacts avoided"],
            buildingConflictsCount=0,
            waterIntersectsCount=0,
            proposedLengthMeters=0.0,
            costCategory="NEGLIGIBLE",
            confidence=95.0,
            explanation=f"Defer option for {z_name}: Retains existing pavement geometry.",
            evidence=ev_defer,
            rejectedAlternatives=rej_defer,
            whyThisIntervention=why_defer,
            reasoning=why_defer,
            geographicFeasibility={"status": "FEASIBLE", "reason": "Zero capital budget requirement."},
            dataProvenance=ev_defer["data_provenance"],
        ))


    return zone_candidates
