"""
RoadVision Phase 6: Candidate Strategy Combination Generator
"""
from typing import List, Dict, Any
import itertools
from .compatibility import check_combination_compatibility

def generate_candidate_combinations(
    candidate_plans: List[Dict[str, Any]],
    max_size: int = 3
) -> List[List[Dict[str, Any]]]:
    """
    Generates intelligent, non-conflicting combinations of candidate interventions.
    Includes all feasible single interventions, compatible pairs, and selected high-impact triples.
    """
    valid_plans = [
        p for p in candidate_plans
        if p.get("status", "FEASIBLE") in ["FEASIBLE", "CONDITIONAL"]
    ]

    combinations: List[List[Dict[str, Any]]] = []

    # 1. Singles (Always included for baseline trade-off comparison)
    for plan in candidate_plans:
        combinations.append([plan])

    # 2. Pairs
    if max_size >= 2 and len(valid_plans) >= 2:
        for p1, p2 in itertools.combinations(valid_plans, 2):
            status, _ = check_combination_compatibility([p1, p2])
            if status != "INCOMPATIBLE":
                combinations.append([p1, p2])

    # 3. Selected Triples (Focus on high-synergy complementary sets: e.g. Junction + Widening + Relief)
    if max_size >= 3 and len(valid_plans) >= 3:
        for p1, p2, p3 in itertools.combinations(valid_plans, 3):
            types = {
                p1.get("interventionType") or p1.get("type"),
                p2.get("interventionType") or p2.get("type"),
                p3.get("interventionType") or p3.get("type"),
            }
            # Only evaluate triples that have diverse intervention categories (no 3 widening projects at once)
            if len(types) >= 2:
                status, _ = check_combination_compatibility([p1, p2, p3])
                if status != "INCOMPATIBLE":
                    combinations.append([p1, p2, p3])

    # 4. Quadruples (For comprehensive whole-place strategies across distinct zones)
    if max_size >= 4 and len(valid_plans) >= 4:
        for p1, p2, p3, p4 in itertools.combinations(valid_plans, 4):
            zids = [p.get("zoneId") for p in [p1, p2, p3, p4] if p.get("zoneId")]
            if len(set(zids)) >= 3:
                status, _ = check_combination_compatibility([p1, p2, p3, p4])
                if status != "INCOMPATIBLE":
                    combinations.append([p1, p2, p3, p4])
            if len(combinations) >= 60:
                break

    return combinations[:60]
