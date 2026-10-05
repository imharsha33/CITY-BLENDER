from typing import Tuple, List
from models import RoadSegment
from analysis.analysis_config import (
    BOTTLENECK_WEIGHTS,
    BOTTLENECK_SEVERITY,
    VC_LOW,
    VC_MODERATE,
    VC_HIGH,
    VC_NEAR_CAPACITY,
)

def evaluate_bottleneck_and_vc(
    road: RoadSegment,
    vc_ratio: float,
    betweenness_score: float,
    max_adjacent_junction_score: float,
    nearby_poi_count: int,
) -> Tuple[float, str, str, List[str]]:
    """
    Evaluates Volume/Capacity utilization status and computes composite Bottleneck Score (0-100).
    Returns: (bottleneck_score, bottleneck_category, utilization_status, reasons_list)
    """
    reasons: List[str] = []

    # 1. Utilization status from V/C
    if vc_ratio > VC_NEAR_CAPACITY:
        utilization_status = "CAPACITY_DEFICIENCY"
        reasons.append(f"Estimated demand exceeds designed throughput (V/C = {vc_ratio:.2f})")
    elif vc_ratio >= VC_HIGH:
        utilization_status = "NEAR_CAPACITY"
        reasons.append(f"Corridor operating near saturation limit (V/C = {vc_ratio:.2f})")
    elif vc_ratio >= VC_MODERATE:
        utilization_status = "HIGH"
        reasons.append(f"High traffic demand relative to roadway capacity (V/C = {vc_ratio:.2f})")
    elif vc_ratio >= VC_LOW:
        utilization_status = "MODERATE"
    else:
        utilization_status = "LOW"

    # 2. Score factors (normalized 0 to 100)
    # V/C score: 0.50 -> 30, 0.85 -> 70, 1.0 -> 85, 1.25+ -> 100
    vc_component = min(100.0, max(0.0, (vc_ratio / 1.20) * 100.0))
    junc_component = max_adjacent_junction_score
    centrality_component = betweenness_score * 100.0
    poi_component = min(100.0, nearby_poi_count * 30.0)

    # Lane drop / constriction check
    lane_drop_component = 0.0
    if road.lanes == 1 and road.highwayType in {"primary", "secondary", "trunk"}:
        lane_drop_component = 80.0
        reasons.append("Constricted cross-section: single-lane road carrying arterial functional classification")

    if betweenness_score > 0.4:
        reasons.append("Critical network bridge corridor with limited alternative parallel bypass routes")

    if max_adjacent_junction_score >= 65.0:
        reasons.append("Downstream flow restricted by complex multi-phase high-conflict junction")

    # Weighted composite bottleneck score
    raw_bottleneck = (
        vc_component * BOTTLENECK_WEIGHTS["vc_ratio"] +
        junc_component * BOTTLENECK_WEIGHTS["junction_proximity"] +
        centrality_component * BOTTLENECK_WEIGHTS["betweenness_centrality"] +
        poi_component * BOTTLENECK_WEIGHTS["poi_density"] +
        lane_drop_component * BOTTLENECK_WEIGHTS["lane_transition"]
    )
    bottleneck_score = round(min(100.0, max(5.0, raw_bottleneck)), 1)

    # Categorization
    if bottleneck_score >= BOTTLENECK_SEVERITY["CRITICAL"]:
        category = "CRITICAL"
    elif bottleneck_score >= BOTTLENECK_SEVERITY["HIGH"]:
        category = "HIGH"
    elif bottleneck_score >= BOTTLENECK_SEVERITY["POTENTIAL"]:
        category = "POTENTIAL"
    else:
        category = "NORMAL"

    return bottleneck_score, category, utilization_status, reasons
