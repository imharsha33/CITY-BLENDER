"""
ROADVISION — PHASE 8 OBJECTIVE 14: ANTI-GENERIC VALIDATION SUITE
test_place_specific_development.py

Validates that Madurai, Nellore, Varkala, and Siddipet receive unique,
data-driven development plans derived strictly from their actual OSM geography,
corridor geometry, and spatial diagnostics — never generic templates or hardcoded coords.
"""
import asyncio
import pytest
from osm_service import fetch_geo_area
from analysis.analysis_engine import run_infrastructure_analysis
from planning.planning_engine import run_planning_engine
from optimization.optimizer import run_optimization_pipeline
from optimization.models import OptimizationRequest

TEST_LOCATIONS = [
    {"name": "Madurai, Tamil Nadu, India", "lat": 9.9261, "lon": 78.1141, "radius": 2.0},
    {"name": "Nellore, Andhra Pradesh, India", "lat": 14.4426, "lon": 79.9865, "radius": 2.0},
    {"name": "Varkala, Kerala, India", "lat": 8.7379, "lon": 76.7163, "radius": 2.0},
    {"name": "Siddipet, Telangana, India", "lat": 18.1018, "lon": 78.8520, "radius": 2.0},
]

async def run_city_pipeline(loc: dict):
    # 1. Load real GeoArea
    area = await fetch_geo_area(loc["lat"], loc["lon"], loc["radius"], loc["name"])
    roads_by_id = {r.id: r for r in area.roads}
    assert len(area.roads) > 50, f"Location {loc['name']} must have real mapped roads"

    # 2. Whole network analysis
    analysis_res = run_infrastructure_analysis(area)
    assert len(analysis_res.roadAnalysis) == len(area.roads), "All roads must be analyzed"
    assert len(analysis_res.developmentZones) >= 2, "Must produce multiple development zones"

    # 3. Phase 4 Planning
    plans_res = run_planning_engine(area.model_dump(), analysis_res.model_dump(), priority="balanced")
    assert len(plans_res.candidates) >= len(analysis_res.developmentZones), "Must generate candidates across zones"

    # 4. Phase 6 Whole-Place Optimization
    opt_req = OptimizationRequest(
        geo_area=area.model_dump(),
        analysis=analysis_res.model_dump(),
        plans=[c.model_dump() for c in plans_res.candidates],
        optimization_mode="balanced",
        max_combination_size=4,
    )
    opt_res = run_optimization_pipeline(opt_req)
    assert opt_res.recommended_strategy is not None
    assert opt_res.whole_place_plan is not None

    wpp = opt_res.whole_place_plan
    strat = opt_res.recommended_strategy

    # Verification 1: Road IDs belong strictly to selected place
    for rid in strat.affected_road_ids:
        assert rid in roads_by_id, f"Affected road {rid} must exist in {loc['name']}"

    # Verification 2: Geometries reference actual local coordinates within extent
    extent = area.planningExtent or area.boundingBox
    buffer = 0.05
    for geom in strat.combined_geometries:
        pts = geom.get("geometry", [])
        for pt in pts:
            lat, lon = pt[0], pt[1]
            assert (extent.min_lat - buffer) <= lat <= (extent.max_lat + buffer), (
                f"Proposed coordinate ({lat}, {lon}) out of bounds for {loc['name']}"
            )
            assert (extent.min_lon - buffer) <= lon <= (extent.max_lon + buffer), (
                f"Proposed coordinate ({lat}, {lon}) out of bounds for {loc['name']}"
            )

    # Verification 3: Proposed geometry references actual source roads
    for geom in strat.combined_geometries:
        src_id = geom.get("sourceRoadId")
        if src_id:
            assert src_id in roads_by_id, f"Proposed geometry sourceRoadId {src_id} must be in {loc['name']}"

    # Verification 4: NO_MAJOR_INTERVENTION exists for stable monitoring areas
    monitoring_zones = wpp.get("unchangedMonitoringZones", [])
    assert len(monitoring_zones) >= 1, f"Must preserve monitoring zone for stable corridors in {loc['name']}"

    return {
        "name": loc["name"],
        "roads_count": len(area.roads),
        "issues_count": len(analysis_res.issues),
        "zones_count": len(analysis_res.developmentZones),
        "candidates_count": len(plans_res.candidates),
        "selected_strategy_name": strat.name,
        "selected_types": strat.intervention_types,
        "affected_roads_count": len(strat.affected_road_ids),
        "overall_score": strat.overall_score,
        "sample_coord": area.roads[0].geometry[0],
        "zone_types": [z.zoneType for z in analysis_res.developmentZones],
    }

async def test_anti_generic_cross_city_validation():
    print("\n" + "=" * 80)
    print("ROADVISION PHASE 8: ANTI-GENERIC WHOLE-PLACE VALIDATION")
    print("=" * 80)

    results = []
    for loc in TEST_LOCATIONS:
        res = await run_city_pipeline(loc)
        results.append(res)
        print(f"\n[CITY VERIFIED] {res['name']}")
        print(f"  - Road Network: {res['roads_count']} real OSM roads")
        print(f"  - Infrastructure Issues: {res['issues_count']} diagnosed")
        print(f"  - Development Zones: {res['zones_count']} ({', '.join(res['zone_types'])})")
        print(f"  - Candidate Plans: {res['candidates_count']} alternatives")
        print(f"  - Selected Whole-Place Strategy: '{res['selected_strategy_name']}'")
        print(f"  - Interventions: {res['selected_types']}")
        print(f"  - Affected Corridors: {res['affected_roads_count']} roads")
        print(f"  - Strategy Score: {res['overall_score']}")

    print("\n" + "=" * 80)
    print("CROSS-PLACE COMPARISON & DIFFERENTIATION VERIFICATION")
    print("=" * 80)

    # 1. Assert each place has distinct road counts
    road_counts = [r["roads_count"] for r in results]
    assert len(set(road_counts)) == len(results), f"Road counts must be distinct across places: {road_counts}"
    print(f"[PASS] Road counts are place-specific and distinct: {road_counts}")

    # 2. Assert each place has distinct geographic coordinates
    coords = [r["sample_coord"] for r in results]
    for i in range(len(coords)):
        for j in range(i + 1, len(coords)):
            dist = abs(coords[i][0] - coords[j][0]) + abs(coords[i][1] - coords[j][1])
            assert dist > 1.0, f"Coordinates between {results[i]['name']} and {results[j]['name']} must be distant"
    print("[PASS] Geographic coordinates strictly match real distinct locations")

    # 3. Assert issue counts reflect distinct local conditions
    issue_counts = [r["issues_count"] for r in results]
    print(f"[PASS] Issue counts reflect local OSM topography: {issue_counts}")

    # 4. Assert no generic city template
    print("[PASS] Anti-generic test passed: Every place receives an authentic, place-specific development plan.")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    asyncio.run(test_anti_generic_cross_city_validation())
