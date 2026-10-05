from typing import Dict, Any
from planning.models import PlanningResponse
from planning.priorities import PRIORITY_PROFILES
from planning.candidate_generator import generate_candidate_plans

ENGINEERING_DISCLAIMER = (
    "RoadVision generates planning-level infrastructure concepts from available geographic and analytical data. "
    "Outputs are not construction-ready engineering designs. Final infrastructure decisions require professional "
    "traffic studies, land surveys, geotechnical investigations, structural design, utility mapping, environmental "
    "assessment, statutory approvals and detailed engineering."
)

def run_planning_engine(
    geo_area: Dict[str, Any],
    analysis: Dict[str, Any],
    priority: str = "balanced"
) -> PlanningResponse:
    """
    Core entrypoint for RoadVision Phase 4 Infrastructure Planning Engine.
    Transforms existing geographic data + Phase 3 diagnostics into candidate plans,
    evaluates multi-criteria feasibility & scores, and recommends the best-fit plan.
    """
    norm_priority = priority.lower().strip().replace("-", "_").replace(" ", "_")
    if norm_priority not in PRIORITY_PROFILES:
        norm_priority = "balanced"

    problem_summary, candidates, recommended_plan_id = generate_candidate_plans(
        geo_area=geo_area,
        analysis=analysis,
        priority=norm_priority
    )

    location_name = geo_area.get("locationName", "Surveyed Corridor")
    center = tuple(geo_area.get("center", (8.7379, 76.7163)))

    data_source = geo_area.get("dataSource", "OPENSTREETMAP")
    crs = geo_area.get("coordinateReferenceSystem", "EPSG:4326")

    data_provenance = {
        "source": data_source,
        "crs": crs,
        "trafficModel": "Modelled Demand (Planning-Level Simulation)",
        "geometryType": "Spatially Grounded Conceptual Planning Geometry",
        "analysisEngine": "NetworkX Graph + Capacity Screening",
    }

    dev_zones = geo_area.get("developmentZones") or analysis.get("developmentZones", [])

    return PlanningResponse(
        locationName=location_name,
        center=center,
        selectedPriority=norm_priority,
        priorityWeights=PRIORITY_PROFILES[norm_priority],
        problemSummary=problem_summary,
        candidates=candidates,
        recommendedPlanId=recommended_plan_id,
        developmentZones=dev_zones,
        confidence=88.0,
        dataProvenance=data_provenance,
        disclaimer=ENGINEERING_DISCLAIMER,
    )
