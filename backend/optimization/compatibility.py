"""
RoadVision Phase 6: Strategy Compatibility & Physical Conflict Engine
"""
from typing import List, Dict, Any, Tuple

def check_combination_compatibility(
    plans: List[Dict[str, Any]]
) -> Tuple[str, str]:
    """
    Evaluates physical, spatial, and operational compatibility between
    multiple Phase 4 candidate interventions proposed together.
    """
    if len(plans) == 1:
        # Single intervention is trivially self-compatible
        return "COMPATIBLE", "Independent single-intervention strategy."

    plan_types = [p.get("interventionType") or p.get("type") or "" for p in plans]
    plan_names = [p.get("name", "Plan") for p in plans]

    # Rule 1: No-Intervention logic
    # In single-place mode (no zoneId), No-Intervention cannot be paired with capital construction.
    # In multi-zone mode, a zone cannot have both No-Intervention and capital construction.
    global_no_build = any(p.get("interventionType") == "NO_MAJOR_INTERVENTION" and not p.get("zoneId") for p in plans)
    has_capital_build = any((p.get("interventionType") or p.get("type")) != "NO_MAJOR_INTERVENTION" for p in plans)

    if global_no_build and has_capital_build:
        return (
            "INCOMPATIBLE",
            "Contradictory planning logic: Global 'No Major Intervention' cannot be combined with capital construction projects."
        )

    # Check for same-zone conflict (cannot select two different interventions for the same zone)
    zone_ids_seen = set()
    for p in plans:
        zid = p.get("zoneId")
        if zid:
            if zid in zone_ids_seen:
                return (
                    "INCOMPATIBLE",
                    f"Zone intervention conflict: Multiple competing interventions proposed for the same Development Zone '{zid}'."
                )
            zone_ids_seen.add(zid)

    # Rule 2: Physical corridor conflict (same source road modified in conflicting ways by active builds)
    all_source_roads: List[str] = []
    for p in plans:
        ptype = p.get("interventionType") or p.get("type") or ""
        if ptype == "NO_MAJOR_INTERVENTION":
            continue
        r_ids = p.get("sourceRoadIds", [])
        for rid in r_ids:
            if rid and rid in all_source_roads:
                # Same road segment is touched by more than one active intervention
                types_on_road = [p.get("interventionType") or p.get("type") for p in plans if rid in p.get("sourceRoadIds", []) and (p.get("interventionType") or p.get("type")) != "NO_MAJOR_INTERVENTION"]
                if len(set(types_on_road)) > 1:
                    return (
                        "INCOMPATIBLE",
                        f"Physical corridor overlap conflict: Road '{rid}' is concurrently targeted by conflicting interventions ({', '.join(types_on_road)})."
                    )
            if rid:
                all_source_roads.append(rid)

    # Rule 3: Junction conflict (e.g. multiple flyovers on the exact same junction)
    all_junctions: List[str] = []
    for p in plans:
        j_ids = p.get("affectedJunctionIds", [])
        for jid in j_ids:
            if jid and jid in all_junctions:
                # Check if multiple grade separations at same junction
                grade_sep_count = sum(1 for p in plans if (p.get("interventionType") == "GRADE_SEPARATION" and jid in p.get("affectedJunctionIds", [])))
                if grade_sep_count > 1:
                    return (
                        "INCOMPATIBLE",
                        f"Structural conflict: Multiple grade-separated flyovers converging at the same junction '{jid}'."
                    )
            if jid:
                all_junctions.append(jid)

    # Rule 4: Construction sequencing conditional check
    has_heavy_civil = any(t in ["GRADE_SEPARATION", "ROAD_WIDENING", "CONNECTOR_ROAD"] for t in plan_types)
    has_light_civil = any(t in ["LANE_RECONFIGURATION", "JUNCTION_IMPROVEMENT"] for t in plan_types)

    if has_heavy_civil and has_light_civil and len(plans) >= 3:
        return (
            "CONDITIONAL",
            "High construction sequencing complexity: Work-zone phasing required to prevent localized detour gridlock during concurrent execution."
        )

    return (
        "COMPATIBLE",
        f"Spatially and operationally complementary: {len(plans)} distinct interventions address independent corridors and nodes without direct physical conflict."
    )
