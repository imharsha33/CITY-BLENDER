from typing import Tuple, List, Dict, Any
from models import RoadSegment, POI, Building
from analysis.analysis_config import BASE_DEMAND_BY_TYPE
from analysis.network_builder import haversine_distance

def estimate_traffic_demand(
    road: RoadSegment,
    betweenness_score: float,
    all_pois: List[POI],
    all_buildings: List[Building],
) -> Tuple[float, float, List[str]]:
    """
    Transparent traffic demand estimation model based on road functional class,
    network centrality, and surrounding land-use density (POIs, buildings).
    Returns: (estimated_demand_veh_hr, demand_score_0_100, assumptions_list)
    """
    assumptions: List[str] = []

    # 1. Base demand by road hierarchy
    base_demand = BASE_DEMAND_BY_TYPE.get(road.highwayType, BASE_DEMAND_BY_TYPE["default"])
    assumptions.append(f"Baseline arterial class demand: {base_demand} veh/hr for '{road.highwayType}'")

    # 2. Network betweenness multiplier (through-traffic routing demand)
    centrality_multiplier = 1.0 + (betweenness_score * 0.8)
    if betweenness_score > 0.3:
        assumptions.append(f"Network routing centrality multiplier {centrality_multiplier:.2f}x (corridor connects critical origin-destinations)")

    # 3. Surrounding land-use & trip generators (POIs within 250m)
    mid_idx = len(road.geometry) // 2
    road_center = road.geometry[mid_idx]

    nearby_poi_count = 0
    for p in all_pois:
        if haversine_distance(road_center, p.coordinate) <= 250.0:
            nearby_poi_count += 1

    poi_factor = 1.0 + min(0.35, nearby_poi_count * 0.08)
    if nearby_poi_count > 0:
        assumptions.append(f"Local trip generation factor +{int((poi_factor - 1.0)*100)}% ({nearby_poi_count} nearby public/commercial facilities)")

    # 4. Building development density factor
    nearby_bldg_count = 0
    for b in all_buildings:
        if b.geometry and haversine_distance(road_center, b.geometry[0]) <= 200.0:
            nearby_bldg_count += 1

    bldg_factor = 1.0 + min(0.25, nearby_bldg_count * 0.02)

    total_demand = base_demand * centrality_multiplier * poi_factor * bldg_factor

    # Demand score (0 to 100)
    # 0 = 0 veh/hr, 100 = 4000+ veh/hr
    demand_score = min(100.0, max(0.0, (total_demand / 3600.0) * 100.0))

    return round(total_demand, 1), round(demand_score, 1), assumptions
