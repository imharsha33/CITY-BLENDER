import math
from typing import List, Tuple, Dict, Any, Optional
from shapely.geometry import LineString, Polygon, MultiPolygon, Point
from shapely.ops import nearest_points

EARTH_RADIUS_METERS = 6378137.0

def haversine_meters(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_METERS * c

def calculate_corridor_length_meters(coords: List[Tuple[float, float]]) -> float:
    if len(coords) < 2:
        return 0.0
    total = 0.0
    for i in range(len(coords) - 1):
        total += haversine_meters(coords[i], coords[i + 1])
    return round(total, 1)

def meters_to_degree_lat(meters: float) -> float:
    return meters / 111320.0

def meters_to_degree_lon(meters: float, lat: float) -> float:
    cos_lat = math.cos(math.radians(lat))
    return meters / (111320.0 * max(0.1, cos_lat))

def check_building_conflicts(
    road_geometry: List[Tuple[float, float]],
    corridor_half_width_meters: float,
    buildings: List[Any]
) -> Tuple[int, List[str]]:
    """
    Checks if a proposed road corridor intersects or infringes upon building footprints.
    Returns (conflict_count, list_of_conflicted_building_ids).
    """
    if len(road_geometry) < 2 or not buildings:
        return 0, []

    # Use center latitude for conversion
    ref_lat = road_geometry[0][0]
    buffer_deg = meters_to_degree_lat(corridor_half_width_meters)

    # Note: Shapely coordinates as (lon, lat)
    road_line = LineString([(p[1], p[0]) for p in road_geometry])
    buffered_road = road_line.buffer(buffer_deg)

    conflicted_ids = []
    for b in buildings:
        # Building geometry as [(lat, lon), ...]
        b_geom = getattr(b, "geometry", None) or b.get("geometry", [])
        if len(b_geom) < 3:
            continue
        try:
            poly = Polygon([(p[1], p[0]) for p in b_geom])
            if poly.is_valid and buffered_road.intersects(poly):
                b_id = getattr(b, "id", None) or b.get("id", "bldg")
                conflicted_ids.append(b_id)
        except Exception:
            continue

    return len(conflicted_ids), conflicted_ids[:10]

def check_water_conflicts(
    road_geometry: List[Tuple[float, float]],
    corridor_half_width_meters: float,
    water_features: List[Any]
) -> Tuple[int, List[str]]:
    """
    Checks if a proposed road corridor crosses or infringes upon water bodies or coastlines.
    Returns (conflict_count, list_of_conflicted_water_feature_ids).
    """
    if len(road_geometry) < 2 or not water_features:
        return 0, []

    ref_lat = road_geometry[0][0]
    buffer_deg = meters_to_degree_lat(corridor_half_width_meters)
    road_line = LineString([(p[1], p[0]) for p in road_geometry])
    buffered_road = road_line.buffer(buffer_deg)

    conflicted_water_ids = []
    for wf in water_features:
        w_geom = getattr(wf, "geometry", None) or wf.get("geometry", [])
        if len(w_geom) < 2:
            continue
        try:
            if len(w_geom) >= 3:
                poly = Polygon([(p[1], p[0]) for p in w_geom])
                if poly.is_valid and buffered_road.intersects(poly):
                    w_id = getattr(wf, "id", None) or wf.get("id", "water")
                    conflicted_water_ids.append(w_id)
            else:
                line = LineString([(p[1], p[0]) for p in w_geom])
                if buffered_road.intersects(line):
                    w_id = getattr(wf, "id", None) or wf.get("id", "water")
                    conflicted_water_ids.append(w_id)
        except Exception:
            continue

    return len(conflicted_water_ids), conflicted_water_ids[:5]

def generate_elevated_flyover_segments(
    source_geometry: List[Tuple[float, float]],
    deck_height_meters: float = 6.5,
    deck_lanes: int = 4,
    deck_width_meters: float = 14.0,
) -> List[Dict[str, Any]]:
    """
    Generates realistic civil engineering grade-separated flyover segments:
    - Approach ramp up (0m -> 6.5m)
    - Elevated continuous deck (6.5m)
    - Approach ramp down (6.5m -> 0m)
    """
    if len(source_geometry) < 2:
        return []

    pts = source_geometry
    n = len(pts)

    if n < 4:
        # Subdivide for smooth ramp transitions
        mid1 = (
            pts[0][0] * 0.66 + pts[-1][0] * 0.34,
            pts[0][1] * 0.66 + pts[-1][1] * 0.34,
        )
        mid2 = (
            pts[0][0] * 0.34 + pts[-1][0] * 0.66,
            pts[0][1] * 0.34 + pts[-1][1] * 0.66,
        )
        pts = [pts[0], mid1, mid2, pts[-1]]
        n = 4

    ramp_len = max(1, n // 4)
    ramp1_pts = pts[:ramp_len + 1]
    deck_pts = pts[ramp_len : n - ramp_len]
    if len(deck_pts) < 2:
        deck_pts = pts[max(0, ramp_len - 1) : min(n, n - ramp_len + 1)]
    ramp2_pts = pts[n - ramp_len - 1 :]

    return [
        {
            "subType": "flyover_ramp_up",
            "geometry": ramp1_pts,
            "lanes": deck_lanes,
            "widthMeters": deck_width_meters,
            "isElevated": True,
            "elevationMeters": deck_height_meters / 2.0,
            "curbType": "concrete_barrier",
        },
        {
            "subType": "flyover_deck",
            "geometry": deck_pts,
            "lanes": deck_lanes,
            "widthMeters": deck_width_meters,
            "isElevated": True,
            "elevationMeters": deck_height_meters,
            "curbType": "parapet_barrier",
        },
        {
            "subType": "flyover_ramp_down",
            "geometry": ramp2_pts,
            "lanes": deck_lanes,
            "widthMeters": deck_width_meters,
            "isElevated": True,
            "elevationMeters": deck_height_meters / 2.0,
            "curbType": "concrete_barrier",
        },
    ]

def interpolate_curved_connector(
    start_pt: Tuple[float, float],
    end_pt: Tuple[float, float],
    waypoints: Optional[List[Tuple[float, float]]] = None,
    num_steps: int = 12
) -> List[Tuple[float, float]]:
    """
    Interpolates a geometrically smooth connector alignment between two real network nodes.
    """
    control_points = [start_pt]
    if waypoints:
        control_points.extend(waypoints)
    else:
        # Slight natural curve offset perpendicular to straight vector
        dlat = end_pt[0] - start_pt[0]
        dlon = end_pt[1] - start_pt[1]
        mid_lat = (start_pt[0] + end_pt[0]) / 2.0 + (-dlon * 0.12)
        mid_lon = (start_pt[1] + end_pt[1]) / 2.0 + (dlat * 0.12)
        control_points.append((mid_lat, mid_lon))
    control_points.append(end_pt)

    # Catmull-Rom or Quadratic Bezier interpolation
    result: List[Tuple[float, float]] = []
    for step in range(num_steps + 1):
        t = step / float(num_steps)
        # De Casteljau for control points
        pts = list(control_points)
        while len(pts) > 1:
            next_pts = []
            for i in range(len(pts) - 1):
                lat = (1 - t) * pts[i][0] + t * pts[i + 1][0]
                lon = (1 - t) * pts[i][1] + t * pts[i + 1][1]
                next_pts.append((lat, lon))
            pts = next_pts
        result.append((round(pts[0][0], 6), round(pts[0][1], 6)))

    return result
