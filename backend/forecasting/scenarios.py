"""
RoadVision Phase 5: Future Scenario Definitions and Assumption Matrices
"""
from typing import Dict, List
from .models import ForecastScenario

DEFAULT_SCENARIOS: Dict[str, ForecastScenario] = {
    "low_growth": ForecastScenario(
        id="low_growth",
        name="Baseline / Low Growth",
        description="Subdued demographic expansion and moderate vehicle ownership growth.",
        annual_growth_rate=0.018, # 1.8% annual compound growth
        development_multiplier=1.10,
        assumptions=[
            "Low regional population growth rate (1.5% - 2.0% annually).",
            "Public transit and non-motorized transport mode share remains stable.",
            "Minimal new large-scale commercial or industrial zoning changes.",
            "Vehicle fleet growth limited by economic headwinds."
        ]
    ),
    "moderate_growth": ForecastScenario(
        id="moderate_growth",
        name="Moderate Growth (Central Planning Case)",
        description="Expected regional expansion aligned with master plan transport guidelines.",
        annual_growth_rate=0.035, # 3.5% annual compound growth
        development_multiplier=1.25,
        assumptions=[
            "Central planning demographic growth rate (3.0% - 4.0% annually).",
            "Gradual increase in private car and motorized two-wheeler modal split.",
            "Infill urban residential development and typical commercial growth.",
            "Infrastructure investments keep pace with statutory master plans."
        ]
    ),
    "high_growth": ForecastScenario(
        id="high_growth",
        name="High Growth",
        description="Accelerated urbanization, economic activation, and rising private mobility.",
        annual_growth_rate=0.055, # 5.5% annual compound growth
        development_multiplier=1.45,
        assumptions=[
            "Accelerated urban inward migration and commercial development (5.0% - 6.0% annually).",
            "Significant rise in vehicle ownership per household.",
            "Expanding peri-urban freight trips and intercity transport demand.",
            "Delays in public mass transit execution lead to higher private road reliance."
        ]
    ),
    "rapid_development": ForecastScenario(
        id="rapid_development",
        name="Rapid Development / Corridor Pressure",
        description="Intense spatial development along transit spines and commercial hubs.",
        annual_growth_rate=0.072, # 7.2% annual compound growth
        development_multiplier=1.75,
        assumptions=[
            "High-density commercial hubs, tech corridors, or logistics parks activated.",
            "Severe localized demand spikes around major arterial junctions.",
            "Trip generation rates double across primary distributor corridors.",
            "Heavy mixed freight and transit traffic concentrated on key relief corridors."
        ]
    )
}

def get_scenario(scenario_id: str) -> ForecastScenario:
    return DEFAULT_SCENARIOS.get(scenario_id, DEFAULT_SCENARIOS["moderate_growth"])

def get_all_scenarios() -> List[ForecastScenario]:
    return list(DEFAULT_SCENARIOS.values())
