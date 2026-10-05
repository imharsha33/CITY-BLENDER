from typing import List, Dict, Any
from models import JunctionAnalysisItem, POI
from analysis.analysis_config import JUNCTION_WEIGHTS, JUNCTION_CLASSES
from analysis.network_builder import haversine_distance

MAJOR_HIGHWAYS = {"motorway", "trunk", "primary", "secondary"}

def analyze_junctions(
    junction_nodes: Dict[str, Dict[str, Any]],
    all_pois: List[POI],
) -> List[JunctionAnalysisItem]:
    """
    Evaluates topological conflict complexity, approach road hierarchy,
    and planning-level congestion class for all graph intersection nodes.
    """
    results: List[JunctionAnalysisItem] = []

    for junc_id, data in junction_nodes.items():
        coord = data["coordinate"]
        degree = data["degree"]
        edges = data["edges"]

        major_approaches = 0
        minor_approaches = 0
        connected_ids: List[str] = []
        reasons: List[str] = []

        for u, v, edge_data in edges:
            connected_ids.append(edge_data.get("id", ""))
            hw = edge_data.get("highwayType", "")
            if hw in MAJOR_HIGHWAYS:
                major_approaches += 1
            else:
                minor_approaches += 1

        # Check nearby critical POIs (transit station, hospital, etc.)
        nearby_poi_names = []
        for p in all_pois:
            if haversine_distance(coord, p.coordinate) <= 200.0:
                nearby_poi_names.append(f"{p.name} ({p.type})")

        # Approach score (0 to 100): 3-way=40, 4-way=70, 5+=90+
        arm_score = min(100.0, max(20.0, (degree - 2) * 35.0))
        if degree >= 4:
            reasons.append(f"High geometric conflict: {degree}-way intersection approach points")
        else:
            reasons.append(f"Standard {degree}-way T/Y intersection junction")

        # Major artery conflict score
        major_ratio = major_approaches / max(1, degree)
        major_score = major_ratio * 100.0
        if major_approaches >= 2:
            reasons.append(f"Intersection connects {major_approaches} major arterial corridors without grade separation")

        # Nearby generator pressure
        poi_score = min(100.0, len(nearby_poi_names) * 35.0)
        if nearby_poi_names:
            reasons.append(f"Heavy local turning friction from adjacent facilities: {', '.join(nearby_poi_names[:2])}")

        # Weighted composite junction score
        raw_score = (
            arm_score * JUNCTION_WEIGHTS["arm_count"] +
            major_score * JUNCTION_WEIGHTS["major_road_ratio"] +
            poi_score * JUNCTION_WEIGHTS["poi_proximity"] +
            (min(100.0, degree * 18.0)) * JUNCTION_WEIGHTS["demand_pressure"]
        )
        final_score = round(min(100.0, max(10.0, raw_score)), 1)

        # Planning-level congestion class
        congestion_class = "A"
        for threshold, label, letter in JUNCTION_CLASSES:
            if final_score >= threshold:
                congestion_class = f"Class {letter} ({label})"
                break

        confidence = 85.0 if major_approaches > 0 else 72.0

        results.append(JunctionAnalysisItem(
            id=data["id"],
            coordinate=coord,
            armCount=degree,
            majorApproaches=major_approaches,
            minorApproaches=minor_approaches,
            junctionScore=final_score,
            congestionClass=congestion_class,
            connectedRoadIds=connected_ids,
            reasons=reasons,
            confidence=confidence,
        ))

    return results
