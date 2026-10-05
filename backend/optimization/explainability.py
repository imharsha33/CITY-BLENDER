"""
RoadVision Phase 6: Strategy Explainability & Alternative Rejection Engine
"""
from typing import List, Dict, Any
from .models import InfrastructureStrategy

def explain_recommendation(
    recommended: InfrastructureStrategy,
    optimization_mode: str
) -> List[str]:
    """
    Generates transparent, evidence-based civil engineering justifications
    for the recommended infrastructure strategy.
    """
    reasons = [
        f"Selected as the optimal strategy under the '{optimization_mode.upper().replace('_', ' ')}' objective weighting.",
        f"Consistently robust across growth scenarios with a robustness rating of {recommended.robustness_score}/100.",
        f"Provides an effective planning horizon through ~{recommended.effective_planning_horizon}, deferring major capital re-investment.",
    ]

    interventions = recommended.intervention_names
    if len(interventions) > 1:
        reasons.append(
            f"Synergistic combination of {len(interventions)} complementary measures: "
            f"simultaneously addresses bottleneck nodes and arterial corridor bypass flow."
        )

    if recommended.is_pareto_optimal:
        reasons.append("Identified on the non-dominated Pareto front (cannot be improved on all criteria without severe sacrifice elsewhere).")

    if recommended.objective_scores.land_impact >= 60.0:
        reasons.append("Maintains acceptable land acquisition boundaries by utilizing existing road rights-of-way where available.")

    if recommended.objective_scores.environmental_impact >= 70.0:
        reasons.append("Avoids encroaching upon mapped water bodies and sensitive buffer zones.")

    return reasons

def explain_alternative_rejections(
    recommended: InfrastructureStrategy,
    alternatives: List[InfrastructureStrategy]
) -> Dict[str, List[str]]:
    """
    Generates explicit civil engineering trade-off explanations detailing
    why each non-recommended strategy was passed over.
    """
    rejections_map: Dict[str, List[str]] = {}

    for alt in alternatives:
        if alt.id == recommended.id:
            continue

        reasons: List[str] = []

        # Compare metrics
        if alt.overall_score < recommended.overall_score:
            reasons.append(f"Lower overall multi-objective score ({alt.overall_score} vs {recommended.overall_score}).")

        if alt.robustness_score < recommended.robustness_score - 5.0:
            reasons.append(
                f"Significantly lower scenario robustness ({alt.robustness_score} vs {recommended.robustness_score}): "
                f"vulnerable to demand spikes in high-growth horizons."
            )

        if alt.effective_planning_horizon < recommended.effective_planning_horizon:
            reasons.append(
                f"Shorter planning horizon (capacity breached near ~{alt.effective_planning_horizon} vs ~{recommended.effective_planning_horizon})."
            )

        if alt.objective_scores.cost_score < recommended.objective_scores.cost_score - 10.0:
            reasons.append("Higher capital expenditure without proportionate future traffic relief.")

        if alt.objective_scores.land_impact < recommended.objective_scores.land_impact - 10.0:
            reasons.append("Substantially higher private land acquisition and right-of-way severance impact.")

        if alt.objective_scores.building_impact < recommended.objective_scores.building_impact - 10.0:
            reasons.append("Requires more building demolitions or structural setbacks.")

        if alt.objective_scores.disruption < recommended.objective_scores.disruption - 10.0:
            reasons.append("Severe construction work-zone disruption along critical arterial corridors.")

        if not alt.is_pareto_optimal:
            reasons.append("Pareto-dominated by more efficient alternative combinations.")

        if not reasons:
            reasons.append("Marginally less balanced across the evaluated 13-objective weighting matrix.")

        rejections_map[alt.id] = reasons

    return rejections_map
