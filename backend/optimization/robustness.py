"""
RoadVision Phase 6: Scenario Robustness & Resilience Analyzer
"""
from typing import List, Dict, Any, Tuple
from .models import ScenarioPerformanceCell, ObjectiveVector

SCENARIO_PROFILES = [
    ("low_growth", "Low Growth", 1.05, 0.018),
    ("moderate_growth", "Moderate Growth", 1.0, 0.035),
    ("high_growth", "High Growth", 0.90, 0.055),
    ("rapid_development", "Rapid Development", 0.78, 0.072),
]

def evaluate_scenario_robustness(
    plans: List[Dict[str, Any]],
    base_vector: ObjectiveVector,
    baseline_year: int = 2026
) -> Tuple[float, float, int, List[ScenarioPerformanceCell]]:
    """
    Evaluates how the intervention combination holds up across all 4 future growth scenarios.
    Returns:
    - robustness_score (0-100)
    - worst_case_score (0-100)
    - effective_planning_horizon (year e.g. 2038)
    - scenario_matrix cells
    """
    types = [p.get("interventionType") or p.get("type") for p in plans]
    is_no_build = "NO_MAJOR_INTERVENTION" in types

    if is_no_build:
        base_horizon = 2028
        capacity_resilience_factor = 0.4
    elif any("GRADE_SEPARATION" in t for t in types) and any("CONNECTOR" in t or "RELIEF" in t for t in types):
        base_horizon = 2042
        capacity_resilience_factor = 1.35
    elif any("GRADE_SEPARATION" in t for t in types):
        base_horizon = 2040
        capacity_resilience_factor = 1.2
    elif any("CONNECTOR" in t or "RELIEF" in t for t in types):
        base_horizon = 2038
        capacity_resilience_factor = 1.15
    elif any("WIDENING" in t for t in types):
        base_horizon = 2035
        capacity_resilience_factor = 1.0
    else:
        base_horizon = 2031
        capacity_resilience_factor = 0.7

    cells: List[ScenarioPerformanceCell] = []
    scores: List[float] = []

    base_score = (base_vector.traffic_improvement * 0.4 + base_vector.future_capacity * 0.3 + base_vector.future_resilience * 0.3)

    for sc_id, sc_name, multiplier, rate in SCENARIO_PROFILES:
        # High growth tests capacity limits
        adjusted_score = round(max(10.0, min(98.0, base_score * multiplier * capacity_resilience_factor)), 1)
        scores.append(adjusted_score)

        if adjusted_score >= 70.0:
            avg_vc = round(0.72 + (rate * 3.5), 2)
            rem_bn = 0 if len(plans) >= 2 else 1
            resilient = True
        elif adjusted_score >= 50.0:
            avg_vc = round(0.88 + (rate * 4.0), 2)
            rem_bn = 1
            resilient = True
        else:
            avg_vc = round(1.05 + (rate * 5.0), 2)
            rem_bn = 3
            resilient = False

        cells.append(ScenarioPerformanceCell(
            scenario_id=sc_id,
            scenario_name=sc_name,
            score=adjusted_score,
            network_avg_vc_2035=avg_vc,
            bottlenecks_remaining=rem_bn,
            is_resilient=resilient
        ))

    mean_score = sum(scores) / len(scores)
    worst_case = min(scores)

    # Variance penalty: strategy that drops off a cliff in High Growth loses robustness
    variance = max(scores) - min(scores)
    variance_penalty = variance * 0.25

    robustness = round(max(10.0, min(99.0, (mean_score * 0.6) + (worst_case * 0.4) - variance_penalty)), 1)

    return robustness, worst_case, base_horizon, cells
