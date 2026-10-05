from typing import Dict, Any, List
from planning.models import PlanMetrics
from planning.priorities import compute_overall_plan_score

def evaluate_plan_metrics(
    intervention_type: str,
    target_issues: List[Any],
    building_conflicts: int,
    water_conflicts: int,
    corridor_length_m: float,
    current_vc: float = 1.0,
    priority: str = "balanced",
    data_confidence: float = 85.0
) -> PlanMetrics:
    """
    Computes planning-level multi-criteria scores for a candidate plan.
    Scores reflect realistic civil engineering tradeoffs across intervention categories.
    """
    # Baseline metric dictionary
    m = {
        "trafficImprovement": 50.0,
        "futureCapacityGain": 50.0,
        "connectivityGain": 50.0,
        "safetyPotential": 50.0,
        "landImpact": 30.0,
        "buildingImpact": 20.0,
        "environmentalImpact": 15.0,
        "constructionDisruption": 40.0,
        "costScore": 50.0,
        "planningCostLevel": "MODERATE",
        "emergencyAccessibility": 50.0,
        "implementationComplexity": 40.0,
        "dataConfidence": data_confidence,
    }

    if intervention_type == "ROAD_WIDENING":
        # 1-to-2 or 2-to-4 lane expansion: high capacity and traffic relief, but higher land & building impact
        m["trafficImprovement"] = min(92.0, 68.0 + current_vc * 14.0)
        m["futureCapacityGain"] = 88.0
        m["connectivityGain"] = 62.0
        m["safetyPotential"] = 74.0
        m["landImpact"] = min(90.0, 35.0 + (corridor_length_m / 1000.0) * 15.0)
        m["buildingImpact"] = min(95.0, 25.0 + building_conflicts * 8.0)
        m["environmentalImpact"] = 25.0 + water_conflicts * 20.0
        m["constructionDisruption"] = 72.0  # Prolonged lane closures
        m["costScore"] = min(85.0, 45.0 + (corridor_length_m / 1000.0) * 12.0)
        m["planningCostLevel"] = "HIGH" if m["costScore"] > 60 else "MODERATE"
        m["emergencyAccessibility"] = 80.0
        m["implementationComplexity"] = 58.0

    elif intervention_type == "GRADE_SEPARATION":
        # Flyover / Elevated deck: maximum bottleneck resolution, low land impact, high capital cost
        m["trafficImprovement"] = min(96.0, 80.0 + current_vc * 12.0)
        m["futureCapacityGain"] = 82.0
        m["connectivityGain"] = 70.0
        m["safetyPotential"] = 88.0  # Grade-separated conflict elimination
        m["landImpact"] = 18.0       # Stays within central arterial median/ROW
        m["buildingImpact"] = min(40.0, 10.0 + building_conflicts * 3.0)
        m["environmentalImpact"] = 18.0 + water_conflicts * 12.0
        m["constructionDisruption"] = 68.0
        m["costScore"] = 78.0        # Structural steel/concrete pier construction
        m["planningCostLevel"] = "HIGH"
        m["emergencyAccessibility"] = 86.0
        m["implementationComplexity"] = 74.0

    elif intervention_type in ["JUNCTION_IMPROVEMENT", "INTERSECTION_REDESIGN"]:
        # Roundabout / channelized turning geometry: high safety, moderate cost, low disruption
        m["trafficImprovement"] = 66.0
        m["futureCapacityGain"] = 55.0
        m["connectivityGain"] = 68.0
        m["safetyPotential"] = 92.0  # Reduces vehicular angle collision points by 70%
        m["landImpact"] = 15.0
        m["buildingImpact"] = min(35.0, 5.0 + building_conflicts * 4.0)
        m["environmentalImpact"] = 10.0
        m["constructionDisruption"] = 35.0
        m["costScore"] = 28.0
        m["planningCostLevel"] = "LOW"
        m["emergencyAccessibility"] = 70.0
        m["implementationComplexity"] = 32.0

    elif intervention_type in ["LANE_RECONFIGURATION", "MEDIAN_MODIFICATION"]:
        # Tidal lanes, turn pockets, concrete barriers within existing pavement
        m["trafficImprovement"] = 52.0
        m["futureCapacityGain"] = 42.0
        m["connectivityGain"] = 48.0
        m["safetyPotential"] = 78.0  # Median barrier prevents head-on crashes
        m["landImpact"] = 2.0        # Zero land acquisition
        m["buildingImpact"] = 0.0    # Zero building impact
        m["environmentalImpact"] = 5.0
        m["constructionDisruption"] = 18.0
        m["costScore"] = 12.0
        m["planningCostLevel"] = "LOW"
        m["emergencyAccessibility"] = 60.0
        m["implementationComplexity"] = 15.0

    elif intervention_type in ["BYPASS", "PARALLEL_RELIEF", "CONNECTOR_ROAD"]:
        # Outer relief road diverting regional through-traffic around town center
        m["trafficImprovement"] = 85.0
        m["futureCapacityGain"] = 92.0
        m["connectivityGain"] = 90.0
        m["safetyPotential"] = 82.0
        m["landImpact"] = min(92.0, 50.0 + (corridor_length_m / 1000.0) * 10.0)
        m["buildingImpact"] = min(80.0, 15.0 + building_conflicts * 6.0)
        m["environmentalImpact"] = min(85.0, 20.0 + water_conflicts * 25.0)
        m["constructionDisruption"] = 25.0  # Built offline away from active traffic
        m["costScore"] = min(92.0, 60.0 + (corridor_length_m / 1000.0) * 8.0)
        m["planningCostLevel"] = "VERY_HIGH" if m["costScore"] > 80 else "HIGH"
        m["emergencyAccessibility"] = 88.0
        m["implementationComplexity"] = 65.0

    elif intervention_type == "COMBINED_INTERVENTION":
        # Widening + junction redesign
        m["trafficImprovement"] = 89.0
        m["futureCapacityGain"] = 84.0
        m["connectivityGain"] = 78.0
        m["safetyPotential"] = 86.0
        m["landImpact"] = min(75.0, 28.0 + (corridor_length_m / 1000.0) * 10.0)
        m["buildingImpact"] = min(80.0, 18.0 + building_conflicts * 6.0)
        m["environmentalImpact"] = 20.0 + water_conflicts * 15.0
        m["constructionDisruption"] = 60.0
        m["costScore"] = 58.0
        m["planningCostLevel"] = "HIGH"
        m["emergencyAccessibility"] = 84.0
        m["implementationComplexity"] = 55.0

    elif intervention_type == "NO_MAJOR_INTERVENTION":
        # Baseline no-build scenario
        m["trafficImprovement"] = 0.0
        m["futureCapacityGain"] = 0.0
        m["connectivityGain"] = 0.0
        m["safetyPotential"] = 20.0
        m["landImpact"] = 0.0
        m["buildingImpact"] = 0.0
        m["environmentalImpact"] = 0.0
        m["constructionDisruption"] = 0.0
        m["costScore"] = 0.0
        m["planningCostLevel"] = "NEGLIGIBLE"
        m["emergencyAccessibility"] = 35.0
        m["implementationComplexity"] = 0.0

    # Calculate overall score dynamically using selected priority profile
    overall = compute_overall_plan_score(m, priority=priority)

    return PlanMetrics(
        trafficImprovement=round(m["trafficImprovement"], 1),
        futureCapacityGain=round(m["futureCapacityGain"], 1),
        connectivityGain=round(m["connectivityGain"], 1),
        safetyPotential=round(m["safetyPotential"], 1),
        landImpact=round(m["landImpact"], 1),
        buildingImpact=round(m["buildingImpact"], 1),
        environmentalImpact=round(m["environmentalImpact"], 1),
        constructionDisruption=round(m["constructionDisruption"], 1),
        planningCostLevel=m["planningCostLevel"],
        costScore=round(m["costScore"], 1),
        emergencyAccessibility=round(m["emergencyAccessibility"], 1),
        implementationComplexity=round(m["implementationComplexity"], 1),
        dataConfidence=round(m["dataConfidence"], 1),
        overallScore=overall,
    )
