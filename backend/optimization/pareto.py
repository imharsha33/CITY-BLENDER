"""
RoadVision Phase 6: Pareto Optimization & Non-Dominated Front Analyzer
"""
from typing import List
from .models import ObjectiveVector

def dominates(vec_a: ObjectiveVector, vec_b: ObjectiveVector, epsilon: float = 1e-3) -> bool:
    """
    Returns True if vec_a Pareto-dominates vec_b:
    No worse on any objective, and strictly better on at least one.
    """
    dict_a = vec_a.model_dump()
    dict_b = vec_b.model_dump()

    better_count = 0
    worse_count = 0

    for key, val_a in dict_a.items():
        val_b = dict_b.get(key, 0.0)
        if val_a > val_b + epsilon:
            better_count += 1
        elif val_a < val_b - epsilon:
            worse_count += 1

    return better_count > 0 and worse_count == 0

def identify_pareto_front(strategies_vectors: List[ObjectiveVector]) -> List[bool]:
    """
    Computes which strategies belong to the non-dominated Pareto optimal front.
    Returns a list of booleans corresponding to each input vector.
    """
    n = len(strategies_vectors)
    is_pareto = [True] * n

    for i in range(n):
        for j in range(n):
            if i != j and is_pareto[i]:
                if dominates(strategies_vectors[j], strategies_vectors[i]):
                    is_pareto[i] = False
                    break

    return is_pareto
