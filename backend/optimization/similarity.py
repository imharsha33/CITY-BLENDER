"""
RoadVision Phase 9: Plan Similarity & Anti-Template Validation Engine
Compares strategy fingerprints across cities to verify CAUSE -> EVIDENCE -> DECISION traceability.
"""
from typing import Dict, Any, List

def compare_strategy_fingerprints(fp1: Dict[str, Any], fp2: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compares two strategy fingerprints to ensure non-generic planning and honest differentiation.
    Does not artificially penalize valid engineering convergence if evidence independently supports it.
    """
    place1 = fp1.get("place", "Place A")
    place2 = fp2.get("place", "Place B")

    coords1 = fp1.get("center_coordinates", "")
    coords2 = fp2.get("center_coordinates", "")
    coords_differ = coords1 != coords2

    roads1 = set(fp1.get("road_ids", []))
    roads2 = set(fp2.get("road_ids", []))
    roads_overlap = roads1.intersection(roads2)

    juncs1 = set(fp1.get("junction_ids", []))
    juncs2 = set(fp2.get("junction_ids", []))
    juncs_overlap = juncs1.intersection(juncs2)

    types1 = set(fp1.get("intervention_types", []))
    types2 = set(fp2.get("intervention_types", []))
    types_overlap = types1.intersection(types2)

    geom_hash1 = fp1.get("selected_geometry_hash", "")
    geom_hash2 = fp2.get("selected_geometry_hash", "")
    geom_differs = geom_hash1 != geom_hash2

    ev1 = fp1.get("evidence_metrics", {})
    ev2 = fp2.get("evidence_metrics", {})

    vc1 = ev1.get("average_vc_ratio", 1.0)
    vc2 = ev2.get("average_vc_ratio", 1.0)
    bldg1 = ev1.get("building_encroachment_conflicts", 0)
    bldg2 = ev2.get("building_encroachment_conflicts", 0)
    len1 = ev1.get("total_corridor_length_meters", 0.0)
    len2 = ev2.get("total_corridor_length_meters", 0.0)

    # Determine similarity verdict
    if not coords_differ and place1 != place2:
        verdict = "SIMILAR STRATEGY — POSSIBLE TEMPLATE BEHAVIOR"
        audit_note = "Coordinates failed to differ between separate named cities."
    elif roads_overlap and place1 != place2:
        verdict = "SIMILAR STRATEGY — POSSIBLE TEMPLATE BEHAVIOR"
        audit_note = f"Shared road IDs detected between {place1} and {place2}: {list(roads_overlap)[:3]}."
    elif types_overlap == types1 and types_overlap == types2 and len(types1) > 0:
        # Same intervention types selected
        # Test whether evidence independently justifies it
        both_saturated = (vc1 >= 1.0 and vc2 >= 1.0)
        both_constrained = (bldg1 > 5 and bldg2 > 5)
        if both_saturated or both_constrained:
            verdict = "SIMILAR STRATEGY — JUSTIFIED"
            audit_note = (
                f"Both {place1} and {place2} legitimately selected {list(types_overlap)} because both independently "
                f"exhibited analytical saturation (V/C {vc1:.2f} vs {vc2:.2f}) and corridor constraints "
                f"({bldg1} vs {bldg2} building conflicts) supporting the intervention."
            )
        else:
            verdict = "SIMILAR STRATEGY — POSSIBLE TEMPLATE BEHAVIOR"
            audit_note = (
                f"Identical intervention package ({list(types_overlap)}) assigned without equivalent "
                f"underlying evidence metrics between {place1} and {place2}."
            )
    else:
        verdict = "DISTINCT STRATEGIES — LOCALLY GROUNDED"
        audit_note = (
            f"Strategies diverge organically: {place1} selected {list(types1)} (V/C {vc1:.2f}, {bldg1} conflicts) "
            f"while {place2} selected {list(types2)} (V/C {vc2:.2f}, {bldg2} conflicts), reflecting true geographic uniqueness."
        )

    return {
        "placeA": place1,
        "placeB": place2,
        "verdict": verdict,
        "coordinatesDiffer": coords_differ,
        "roadsOverlapCount": len(roads_overlap),
        "junctionsOverlapCount": len(juncs_overlap),
        "geometriesDiffer": geom_differs,
        "sharedInterventionTypes": list(types_overlap),
        "evidenceComparison": {
            place1: {"avg_vc": vc1, "building_conflicts": bldg1, "length_m": len1},
            place2: {"avg_vc": vc2, "building_conflicts": bldg2, "length_m": len2},
        },
        "auditNote": audit_note,
        "causeEvidenceDecisionGrounded": verdict in ["SIMILAR STRATEGY — JUSTIFIED", "DISTINCT STRATEGIES — LOCALLY GROUNDED"],
    }
