from typing import Dict, Any

# Section 9: Configurable Planning Priority Weights
# Weights sum to 1.0 (100%)
PRIORITY_PROFILES: Dict[str, Dict[str, float]] = {
    "balanced": {
        "trafficImprovement": 0.20,
        "connectivityGain": 0.12,
        "futureCapacityGain": 0.10,
        "safetyPotential": 0.10,
        "landPreservation": 0.08,        # 100 - landImpact
        "buildingPreservation": 0.08,    # 100 - buildingImpact
        "environmentalPreservation": 0.08, # 100 - environmentalImpact
        "lowDisruption": 0.07,          # 100 - constructionDisruption
        "costEconomy": 0.07,            # 100 - costScore
        "emergencyAccessibility": 0.05,
        "lowComplexity": 0.03,          # 100 - implementationComplexity
        "dataConfidence": 0.02,
    },
    "traffic_reduction": {
        "trafficImprovement": 0.35,
        "futureCapacityGain": 0.16,
        "connectivityGain": 0.14,
        "safetyPotential": 0.10,
        "emergencyAccessibility": 0.07,
        "lowDisruption": 0.05,
        "landPreservation": 0.04,
        "buildingPreservation": 0.03,
        "environmentalPreservation": 0.03,
        "costEconomy": 0.01,
        "lowComplexity": 0.01,
        "dataConfidence": 0.01,
    },
    "min_land_acquisition": {
        "buildingPreservation": 0.25,
        "landPreservation": 0.23,
        "environmentalPreservation": 0.16,
        "trafficImprovement": 0.10,
        "costEconomy": 0.08,
        "lowDisruption": 0.06,
        "safetyPotential": 0.04,
        "connectivityGain": 0.03,
        "futureCapacityGain": 0.02,
        "emergencyAccessibility": 0.01,
        "lowComplexity": 0.01,
        "dataConfidence": 0.01,
    },
    "min_cost": {
        "costEconomy": 0.32,
        "lowComplexity": 0.16,
        "landPreservation": 0.14,
        "buildingPreservation": 0.10,
        "lowDisruption": 0.08,
        "trafficImprovement": 0.08,
        "environmentalPreservation": 0.04,
        "safetyPotential": 0.03,
        "connectivityGain": 0.02,
        "futureCapacityGain": 0.01,
        "emergencyAccessibility": 0.01,
        "dataConfidence": 0.01,
    },
    "max_capacity": {
        "futureCapacityGain": 0.30,
        "trafficImprovement": 0.25,
        "connectivityGain": 0.15,
        "safetyPotential": 0.08,
        "emergencyAccessibility": 0.06,
        "costEconomy": 0.04,
        "landPreservation": 0.03,
        "buildingPreservation": 0.03,
        "lowDisruption": 0.02,
        "environmentalPreservation": 0.02,
        "lowComplexity": 0.01,
        "dataConfidence": 0.01,
    },
    "min_disruption": {
        "lowDisruption": 0.30,
        "lowComplexity": 0.18,
        "buildingPreservation": 0.14,
        "costEconomy": 0.12,
        "landPreservation": 0.10,
        "trafficImprovement": 0.06,
        "safetyPotential": 0.04,
        "environmentalPreservation": 0.03,
        "connectivityGain": 0.01,
        "futureCapacityGain": 0.01,
        "emergencyAccessibility": 0.005,
        "dataConfidence": 0.005,
    },
}

PRIORITY_DESCRIPTIONS: Dict[str, str] = {
    "balanced": "Holistic engineering balance between traffic performance, environmental preservation, and capital cost.",
    "traffic_reduction": "Maximizes flow velocity, bottleneck throughput, and queue dissipation regardless of construction scope.",
    "min_land_acquisition": "Prioritizes minimal right-of-way expansion, protecting residential structures and existing building footprints.",
    "min_cost": "Focuses on capital efficiency, favoring high-yield low-capex improvements (re-striping, junction geometry, signals).",
    "max_capacity": "Engineered for maximum 20-year structural capacity, multi-lane divided corridors, and arterial spines.",
    "min_disruption": "Minimizes construction timeline and traffic diversion friction during implementation.",
}

def compute_overall_plan_score(metrics_dict: Dict[str, Any], priority: str = "balanced") -> float:
    weights = PRIORITY_PROFILES.get(priority, PRIORITY_PROFILES["balanced"])
    
    score = (
        metrics_dict.get("trafficImprovement", 50.0) * weights.get("trafficImprovement", 0.0) +
        metrics_dict.get("connectivityGain", 50.0) * weights.get("connectivityGain", 0.0) +
        metrics_dict.get("futureCapacityGain", 50.0) * weights.get("futureCapacityGain", 0.0) +
        metrics_dict.get("safetyPotential", 50.0) * weights.get("safetyPotential", 0.0) +
        (100.0 - metrics_dict.get("landImpact", 30.0)) * weights.get("landPreservation", 0.0) +
        (100.0 - metrics_dict.get("buildingImpact", 20.0)) * weights.get("buildingPreservation", 0.0) +
        (100.0 - metrics_dict.get("environmentalImpact", 10.0)) * weights.get("environmentalPreservation", 0.0) +
        (100.0 - metrics_dict.get("constructionDisruption", 40.0)) * weights.get("lowDisruption", 0.0) +
        (100.0 - metrics_dict.get("costScore", 50.0)) * weights.get("costEconomy", 0.0) +
        metrics_dict.get("emergencyAccessibility", 50.0) * weights.get("emergencyAccessibility", 0.0) +
        (100.0 - metrics_dict.get("implementationComplexity", 40.0)) * weights.get("lowComplexity", 0.0) +
        metrics_dict.get("dataConfidence", 80.0) * weights.get("dataConfidence", 0.0)
    )
    return round(max(0.0, min(100.0, score)), 1)
