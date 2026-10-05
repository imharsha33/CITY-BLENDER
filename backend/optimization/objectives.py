"""
RoadVision Phase 6: Multi-Objective Evaluation & Optimization Weights
"""
from typing import Dict, List, Any
from .models import ObjectiveVector

OPTIMIZATION_WEIGHTS: Dict[str, Dict[str, float]] = {
    "balanced": {
        "traffic_improvement": 0.15,
        "future_capacity": 0.12,
        "future_resilience": 0.12,
        "connectivity": 0.10,
        "safety": 0.10,
        "land_impact": 0.08,
        "building_impact": 0.07,
        "environmental_impact": 0.07,
        "cost_score": 0.07,
        "disruption": 0.05,
        "emergency_access": 0.04,
        "complexity": 0.02,
        "confidence": 0.01
    },
    "traffic_reduction": {
        "traffic_improvement": 0.35,
        "future_capacity": 0.20,
        "future_resilience": 0.15,
        "connectivity": 0.10,
        "safety": 0.06,
        "land_impact": 0.03,
        "building_impact": 0.03,
        "environmental_impact": 0.02,
        "cost_score": 0.02,
        "disruption": 0.01,
        "emergency_access": 0.01,
        "complexity": 0.01,
        "confidence": 0.01
    },
    "min_cost": {
        "cost_score": 0.35,
        "disruption": 0.15,
        "traffic_improvement": 0.10,
        "complexity": 0.10,
        "land_impact": 0.08,
        "building_impact": 0.08,
        "environmental_impact": 0.05,
        "safety": 0.04,
        "future_resilience": 0.02,
        "future_capacity": 0.01,
        "connectivity": 0.01,
        "emergency_access": 0.005,
        "confidence": 0.005
    },
    "min_land_acquisition": {
        "land_impact": 0.30,
        "building_impact": 0.25,
        "environmental_impact": 0.15,
        "traffic_improvement": 0.10,
        "cost_score": 0.06,
        "safety": 0.05,
        "disruption": 0.03,
        "connectivity": 0.02,
        "future_capacity": 0.02,
        "future_resilience": 0.01,
        "emergency_access": 0.005,
        "complexity": 0.003,
        "confidence": 0.002
    },
    "max_resilience": {
        "future_resilience": 0.30,
        "future_capacity": 0.22,
        "traffic_improvement": 0.16,
        "connectivity": 0.12,
        "safety": 0.08,
        "emergency_access": 0.04,
        "cost_score": 0.03,
        "disruption": 0.02,
        "land_impact": 0.01,
        "building_impact": 0.01,
        "environmental_impact": 0.005,
        "complexity": 0.003,
        "confidence": 0.002
    },
    "min_disruption": {
        "disruption": 0.35,
        "cost_score": 0.15,
        "complexity": 0.15,
        "traffic_improvement": 0.12,
        "safety": 0.08,
        "building_impact": 0.05,
        "land_impact": 0.04,
        "environmental_impact": 0.03,
        "connectivity": 0.01,
        "future_capacity": 0.01,
        "future_resilience": 0.005,
        "emergency_access": 0.003,
        "confidence": 0.002
    },
    "max_safety": {
        "safety": 0.35,
        "traffic_improvement": 0.15,
        "connectivity": 0.12,
        "future_capacity": 0.10,
        "emergency_access": 0.10,
        "future_resilience": 0.08,
        "cost_score": 0.03,
        "disruption": 0.02,
        "land_impact": 0.02,
        "building_impact": 0.01,
        "environmental_impact": 0.01,
        "complexity": 0.005,
        "confidence": 0.005
    },
    "environmental_priority": {
        "environmental_impact": 0.35,
        "land_impact": 0.25,
        "building_impact": 0.15,
        "disruption": 0.08,
        "traffic_improvement": 0.06,
        "cost_score": 0.04,
        "safety": 0.03,
        "connectivity": 0.02,
        "emergency_access": 0.01,
        "future_capacity": 0.005,
        "future_resilience": 0.003,
        "complexity": 0.001,
        "confidence": 0.001
    }
}

def get_weights(mode: str) -> Dict[str, float]:
    return OPTIMIZATION_WEIGHTS.get(mode.lower(), OPTIMIZATION_WEIGHTS["balanced"])

def evaluate_objective_vector(plans: List[Dict[str, Any]]) -> ObjectiveVector:
    """
    Computes a normalized 13-dimensional objective vector for a combination of interventions.
    All metrics are normalized to [0, 100], where higher is ALWAYS better for optimization ranking.
    """
    if len(plans) == 1 and (plans[0].get("interventionType") == "NO_MAJOR_INTERVENTION" or plans[0].get("type") == "NO_MAJOR_INTERVENTION"):
        return ObjectiveVector(
            traffic_improvement=5.0,
            future_capacity=5.0,
            connectivity=10.0,
            safety=20.0,
            land_impact=100.0, # zero land impact = perfect score
            building_impact=100.0, # zero building conflicts = perfect score
            environmental_impact=100.0,
            disruption=100.0, # zero construction disruption = perfect score
            cost_score=100.0, # zero capex = perfect score
            emergency_access=15.0,
            complexity=100.0, # zero complexity
            future_resilience=10.0, # expires quickly under future growth
            confidence=95.0
        )

    # Base metric aggregation with diminishing marginal returns
    m_traffic: List[float] = []
    m_capacity: List[float] = []
    m_connect: List[float] = []
    m_safety: List[float] = []
    m_land: List[float] = []
    m_bldg: List[float] = []
    m_env: List[float] = []
    m_disrupt: List[float] = []
    m_cost: List[float] = []
    m_emerg: List[float] = []
    m_complex: List[float] = []
    m_conf: List[float] = []

    for p in plans:
        pm = p.get("metrics", {})
        m_traffic.append(float(pm.get("trafficImprovement", 50.0)))
        m_capacity.append(float(pm.get("futureCapacityGain") or pm.get("capacityGain") or 50.0))
        m_connect.append(float(pm.get("connectivityGain", 45.0)))
        m_safety.append(float(pm.get("safetyPotential") or pm.get("safetyScore") or 50.0))

        # Raw impacts (where originally high was worse, we normalize so 100 = best)
        raw_land = float(pm.get("landImpact", 40.0))
        m_land.append(max(0.0, 100.0 - raw_land))

        raw_bldg = float(pm.get("buildingImpact", 30.0))
        m_bldg.append(max(0.0, 100.0 - raw_bldg))

        raw_env = float(pm.get("environmentalImpact", 20.0))
        m_env.append(max(0.0, 100.0 - raw_env))

        raw_disrupt = float(pm.get("constructionDisruption") or pm.get("disruption") or 40.0)
        m_disrupt.append(max(0.0, 100.0 - raw_disrupt))

        raw_cost = float(pm.get("costScore", 50.0))
        m_cost.append(raw_cost)

        m_emerg.append(float(pm.get("emergencyAccessibility", 40.0)))
        raw_comp = float(pm.get("implementationComplexity", 35.0))
        m_complex.append(max(0.0, 100.0 - raw_comp))

        m_conf.append(float(p.get("confidence", 0.75)) * 100.0)

    # Multi-project synergy for benefits: Diminishing returns combination: 1 - prod(1 - x/100)
    def combine_benefits(vals: List[float]) -> float:
        remaining = 1.0
        for v in vals:
            remaining *= (1.0 - min(0.95, v / 100.0))
        return round((1.0 - remaining) * 100.0, 1)

    # Multi-project compounding for costs/impacts: minimum / weighted average
    def combine_costs(vals: List[float]) -> float:
        # Multiple projects compound disruption and cost (score goes down)
        avg = sum(vals) / len(vals)
        penalty = (len(vals) - 1) * 8.0 # multi-project coordination friction
        return max(5.0, round(avg - penalty, 1))

    traffic = combine_benefits(m_traffic)
    capacity = combine_benefits(m_capacity)
    connect = combine_benefits(m_connect)
    safety = combine_benefits(m_safety)
    emerg = combine_benefits(m_emerg)

    land = combine_costs(m_land)
    bldg = combine_costs(m_bldg)
    env = combine_costs(m_env)
    disrupt = combine_costs(m_disrupt)
    cost = combine_costs(m_cost)
    complex_score = combine_costs(m_complex)
    conf = round(sum(m_conf) / len(m_conf), 1)

    # Resilience: combinations that pair capacity with relief or flyover achieve very high future resilience
    types = [p.get("interventionType") or p.get("type") for p in plans]
    has_relief = any("CONNECTOR" in t or "RELIEF" in t for t in types)
    has_structural = any("GRADE_SEPARATION" in t or "WIDENING" in t for t in types)
    if has_relief and has_structural:
        resilience = 92.0
    elif has_structural:
        resilience = 82.0
    elif has_relief:
        resilience = 78.0
    else:
        resilience = 58.0

    return ObjectiveVector(
        traffic_improvement=traffic,
        future_capacity=capacity,
        connectivity=connect,
        safety=safety,
        land_impact=land,
        building_impact=bldg,
        environmental_impact=env,
        disruption=disrupt,
        cost_score=cost,
        emergency_access=emerg,
        complexity=complex_score,
        future_resilience=resilience,
        confidence=conf
    )

def compute_strategy_score(vector: ObjectiveVector, mode: str) -> float:
    weights = get_weights(mode)
    vec_dict = vector.model_dump()
    score = sum(vec_dict.get(k, 50.0) * w for k, w in weights.items())
    return round(score, 1)
