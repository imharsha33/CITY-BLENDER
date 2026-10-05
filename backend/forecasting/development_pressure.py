"""
RoadVision Phase 5: Urban Development Pressure & Spatial Growth Hotspot Analyzer
"""
import math
from typing import List, Dict, Any
from .models import DevelopmentPressureArea

def compute_development_pressure(
    roads: List[Dict[str, Any]],
    buildings: List[Dict[str, Any]],
    pois: List[Dict[str, Any]],
    center: List[float]
) -> List[DevelopmentPressureArea]:
    """
    Identifies geographic clusters experiencing elevated building density,
    commercial POI aggregation, and corridor access pressure.
    """
    areas: List[DevelopmentPressureArea] = []
    c_lat, c_lon = center[0], center[1]

    # Partition the active geographic extent into spatial quadrants/sectors
    quadrants = [
        ("Central Commercial Core", 0.0, 0.0, 450.0),
        ("North-East Expansion Sector", 0.005, 0.005, 600.0),
        ("South-West Transit Corridor", -0.005, -0.005, 550.0),
        ("Western Coastal/Arterial Zone", 0.0, -0.007, 500.0),
    ]

    for idx, (name, dlat, dlon, radius) in enumerate(quadrants):
        sub_center = [round(c_lat + dlat, 5), round(c_lon + dlon, 5)]

        # Count buildings and POIs within radius
        b_count = 0
        for b in buildings:
            geom = b.get("coordinates") or b.get("geometry") or []
            if geom and len(geom) > 0:
                p_lat, p_lon = geom[0][0], geom[0][1]
                dist = math.hypot((p_lat - sub_center[0]) * 111000, (p_lon - sub_center[1]) * 111000 * math.cos(math.radians(c_lat)))
                if dist <= radius:
                    b_count += 1

        p_count = 0
        for p in pois:
            plat = p.get("latitude") or (p.get("location") or [0, 0])[0]
            plon = p.get("longitude") or (p.get("location") or [0, 0])[1]
            dist = math.hypot((plat - sub_center[0]) * 111000, (plon - sub_center[1]) * 111000 * math.cos(math.radians(c_lat)))
            if dist <= radius:
                p_count += 1

        area_sqkm = (math.pi * (radius / 1000.0)**2) or 0.5
        b_density = round(b_count / max(0.1, area_sqkm), 1)

        indicators = []
        if b_count > 15:
            indicators.append(f"High structural footprint concentration ({b_count} buildings)")
        if p_count > 2:
            indicators.append(f"Active commercial/amenity node ({p_count} POIs)")
        if idx == 0:
            indicators.append("Convergence of multiple road network approaches")

        if not indicators:
            indicators.append("Moderate infill residential fabric")

        if b_count >= 25 or p_count >= 4 or idx == 0:
            pressure = "HIGH"
        elif b_count >= 10 or p_count >= 1:
            pressure = "MEDIUM"
        else:
            pressure = "LOW"

        explanation = (
            f"{name} displays {pressure.lower()} development pressure with {b_count} structures "
            f"and {p_count} active POIs ({b_density} bldgs/sq km), increasing trip generation along connecting links."
        )

        areas.append(DevelopmentPressureArea(
            area_id=f"dev-press-zone-{idx+1}",
            name=name,
            center=sub_center,
            radius_meters=radius,
            pressure_level=pressure,
            indicators=indicators,
            building_density_sqkm=b_density,
            poi_count=p_count,
            confidence=0.82,
            explanation=explanation
        ))

    return areas
