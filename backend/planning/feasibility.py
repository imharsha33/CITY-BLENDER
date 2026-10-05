from typing import Dict, Any, List, Tuple
from planning.models import ProposedRoadSegment

def evaluate_plan_feasibility(
    intervention_type: str,
    proposed_geometry: List[ProposedRoadSegment],
    building_conflicts: int,
    water_conflicts: int,
    corridor_length_m: float,
    data_confidence: float = 85.0
) -> Tuple[str, str]:
    """
    Evaluates civil engineering spatial feasibility for a candidate plan.
    Returns (status: 'FEASIBLE' | 'CONDITIONAL' | 'INFEASIBLE', reason: str).
    """
    if intervention_type == "NO_MAJOR_INTERVENTION":
        return "FEASIBLE", "Preserves existing infrastructure alignment; requires no capital construction or land acquisition."

    if not proposed_geometry:
        return "INFEASIBLE", "Geometric alignment could not be resolved from active network constraints."

    # Check for invalid geometry
    total_pts = sum(len(seg.geometry) for seg in proposed_geometry)
    if total_pts < 2 or corridor_length_m <= 10.0:
        return "INFEASIBLE", "Corridor alignment is too short or topologically degenerate to form a functional roadway."

    # Water constraints
    if water_conflicts > 0:
        if intervention_type in ["GRADE_SEPARATION", "BYPASS", "CONNECTOR_ROAD"]:
            if water_conflicts > 3:
                return "INFEASIBLE", f"Corridor crosses {water_conflicts} mapped water bodies / environmental protection zones; prohibitive permitting and structural span required."
            return "CONDITIONAL", f"Crosses {water_conflicts} mapped drainage/water feature(s); requires dedicated civil bridge structure or culvert engineering."
        else:
            return "CONDITIONAL", "Adjacent to mapped water feature; requires drainage offset and slope stabilization."

    # Building conflicts
    if building_conflicts > 15:
        if intervention_type == "ROAD_WIDENING":
            return "CONDITIONAL", f"Severe right-of-way constraint: corridor widening infringes upon {building_conflicts} building footprints. Significant land acquisition and compensation required."
        elif intervention_type in ["BYPASS", "CONNECTOR_ROAD"]:
            return "INFEASIBLE", f"Proposed bypass route penetrates dense urban cluster ({building_conflicts} building conflicts). Alignment is infeasible without extensive structural demolition."
    elif building_conflicts > 5:
        return "CONDITIONAL", f"Moderate right-of-way constraint: affects {building_conflicts} adjacent building setbacks; manageable with minor frontage realignment."

    # Grade separation complexity
    if intervention_type == "GRADE_SEPARATION":
        if corridor_length_m < 150.0:
            return "CONDITIONAL", "Limited corridor approach length: vertical ramp grade would exceed 4.5% standard IRC/AASHTO design limits."
        if building_conflicts > 10:
            return "CONDITIONAL", f"Ramp touchdown envelope touches {building_conflicts} frontage structures; requires pier alignment adjustment."
        return "FEASIBLE", "Feasible: vertical clearance and elevated deck fit within existing arterial right-of-way."

    # Roundabout feasibility
    if intervention_type in ["ROUNDABOUT", "INTERSECTION_REDESIGN"]:
        if corridor_length_m < 20.0:
            return "INFEASIBLE", "Spatial envelope insufficient for minimum 30m diameter circulating roadway."
        if building_conflicts > 12:
            return "CONDITIONAL", f"Circulating geometry encroaches on {building_conflicts} corner property boundaries; minor land acquisition required."
        return "FEASIBLE", "Feasible: circulating geometry fits node right-of-way envelope with adequate sight triangles."

    # Lane reconfiguration feasibility
    if intervention_type in ["LANE_RECONFIGURATION", "MEDIAN_MODIFICATION"]:
        return "FEASIBLE", "Feasible: 100% contained within existing carriageway curb lines; zero setback impact."

    # Connector / Bypass length checks
    if intervention_type in ["BYPASS", "RING_ROAD_SEGMENT", "CONNECTOR_ROAD", "PARALLEL_RELIEF"]:
        if corridor_length_m > 8000.0:
            return "CONDITIONAL", f"Very long corridor ({corridor_length_m / 1000.0:.1f} km); phase-wise construction recommended."
        if building_conflicts > 20:
            return "INFEASIBLE", f"Proposed bypass route penetrates dense urban cluster ({building_conflicts} building conflicts). Prohibitive demolition required."

    # Standard feasible
    return "FEASIBLE", "Feasible: alignment maintains standard engineering geometric clearances and integrates with existing junction nodes."

