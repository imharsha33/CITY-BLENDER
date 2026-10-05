"""
RoadVision Phase 5: Feature Engineering Pipeline for Road Segments & Corridors
"""
import math
from typing import Dict, List, Any, Tuple

def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Distance in meters between two lat/lon coordinates."""
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    R = 6371000.0 # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def extract_road_features(
    roads: List[Dict[str, Any]],
    buildings: List[Dict[str, Any]],
    pois: List[Dict[str, Any]],
    analysis_data: Dict[str, Any]
) -> Dict[str, Dict[str, Any]]:
    """
    Extracts spatial, analytical, and structural features for every road segment.
    """
    raw_analysis_roads = analysis_data.get("roadAnalysis") or analysis_data.get("roads", [])
    analysis_roads = {
        (r.get("roadId") or r.get("id", "")): r
        for r in raw_analysis_roads
    }
    issues = analysis_data.get("issues", [])
    bottleneck_road_ids = {
        issue.get("roadId", issue.get("road_id", "")): issue.get("severity", "HIGH")
        for issue in issues
        if issue.get("type") in ["BOTTLENECK", "CAPACITY_DEFICIENCY"] and (issue.get("roadId") or issue.get("road_id"))
    }

    # Pre-extract POI coordinates
    poi_coords = [
        (p.get("latitude") or p.get("location", [0, 0])[0],
         p.get("longitude") or p.get("location", [0, 0])[1])
        for p in pois
        if (p.get("latitude") or p.get("location"))
    ]

    # Pre-extract building centroids (sample up to 400 for rapid bounding)
    bldg_sample = buildings[:400]
    bldg_coords = []
    for b in bldg_sample:
        poly = b.get("coordinates") or b.get("geometry") or []
        if poly and len(poly) > 0:
            avg_lat = sum(pt[0] for pt in poly) / len(poly)
            avg_lon = sum(pt[1] for pt in poly) / len(poly)
            bldg_coords.append((avg_lat, avg_lon))

    features_map: Dict[str, Dict[str, Any]] = {}

    for road in roads:
        r_id = road.get("id", "")
        geom = road.get("geometry", [])
        if not geom:
            continue

        mid_idx = len(geom) // 2
        mid_pt = (geom[mid_idx][0], geom[mid_idx][1])

        # Analytical metrics from Phase 3 (Real road-specific calculations)
        ar = analysis_roads.get(r_id, {})
        cap = float(ar.get("estimatedCapacity") or ar.get("capacity") or road.get("capacity") or 1800.0)
        dem = float(ar.get("estimatedDemand") or road.get("estimatedDemand") or (cap * 0.72))
        vc = float(ar.get("vcRatio") or (dem / max(1.0, cap)))
        centrality = float(ar.get("networkImportance", 30.0)) / 100.0 if "networkImportance" in ar else float(ar.get("centrality", 0.3))
        connectivity = float(ar.get("bottleneckScore", 50.0)) / 100.0 if "bottleneckScore" in ar else float(ar.get("connectivityScore", 0.5))

        # Spatial density features within 300m
        nearby_bldgs = sum(1 for bc in bldg_coords if haversine_distance(mid_pt, bc) <= 300.0)
        nearby_pois = sum(1 for pc in poi_coords if haversine_distance(mid_pt, pc) <= 300.0)

        # Built-up intensity ratio
        built_up_intensity = min(1.0, (nearby_bldgs * 0.05) + (nearby_pois * 0.1))

        # Hierarchy weight
        road_type = road.get("type", "secondary").lower()
        if any(k in road_type for k in ["motorway", "trunk", "primary"]):
            hierarchy_weight = 1.35
        elif "secondary" in road_type:
            hierarchy_weight = 1.15
        elif "tertiary" in road_type:
            hierarchy_weight = 1.0
        else:
            hierarchy_weight = 0.85

        features_map[r_id] = {
            "road_id": r_id,
            "name": road.get("name", "Unnamed Road"),
            "mid_point": mid_pt,
            "road_type": road_type,
            "lanes": road.get("lanes", 2),
            "capacity": cap,
            "estimated_demand": dem,
            "current_vc": round(vc, 3),
            "centrality": centrality,
            "connectivity": connectivity,
            "nearby_buildings_count": nearby_bldgs,
            "nearby_pois_count": nearby_pois,
            "built_up_intensity": built_up_intensity,
            "hierarchy_weight": hierarchy_weight,
            "is_current_bottleneck": r_id in bottleneck_road_ids,
            "bottleneck_severity": bottleneck_road_ids.get(r_id, "NONE")
        }

    return features_map
