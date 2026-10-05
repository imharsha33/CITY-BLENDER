from typing import Tuple, List
from models import RoadSegment
from analysis.analysis_config import BASE_LANE_CAPACITY, ROAD_TYPE_CAPACITY_FACTOR

# Default lane assumptions when OSM tag is missing
DEFAULT_LANES_BY_TYPE = {
    "motorway": 4,
    "trunk": 4,
    "primary": 2,
    "secondary": 2,
    "tertiary": 2,
    "residential": 1,
    "service": 1,
    "unclassified": 1,
    "default": 1,
}

def estimate_road_capacity(road: RoadSegment, is_near_major_junction: bool = False) -> Tuple[float, int, bool, List[str]]:
    """
    Transparent planning-level capacity estimation.
    Returns: (capacity_veh_per_hr, lanes_used, is_lanes_known, assumptions_list)
    """
    assumptions: List[str] = []

    # 1. Determine lane count
    if road.lanes and road.lanes > 0:
        lanes = road.lanes
        lanes_known = True
        assumptions.append(f"Field surveyed lane count from OpenStreetMap: {lanes} lanes")
    else:
        lanes = DEFAULT_LANES_BY_TYPE.get(road.highwayType, DEFAULT_LANES_BY_TYPE["default"])
        lanes_known = False
        assumptions.append(f"Modelled planning default: {lanes} lanes for '{road.highwayType}' road class")

    # 2. Road classification design factor
    hw_factor = ROAD_TYPE_CAPACITY_FACTOR.get(road.highwayType, ROAD_TYPE_CAPACITY_FACTOR["default"])
    assumptions.append(f"Road hierarchy factor {hw_factor:.2f} for '{road.highwayType}' classification")

    # 3. Directional flow factor
    flow_factor = 1.10 if road.oneWay else 1.00
    if road.oneWay:
        assumptions.append("One-way traffic operational efficiency factor +10%")

    # 4. Junction friction penalty
    junction_factor = 0.88 if is_near_major_junction else 1.00
    if is_near_major_junction:
        assumptions.append("Approach friction penalty -12% due to adjacent intersection conflict")

    capacity = lanes * BASE_LANE_CAPACITY * hw_factor * flow_factor * junction_factor
    return round(capacity, 1), lanes, lanes_known, assumptions
