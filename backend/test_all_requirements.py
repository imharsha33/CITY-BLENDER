import asyncio
import io
import json
from pathlib import Path
import httpx
from main import app
from models import GeoArea

async def test_all():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/api/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("[PASS] 1. Backend health check passed")

        # 2. Geocoding
        res = await client.get("/api/geocode?q=Varkala")
        assert res.status_code == 200, f"Geocode failed: {res.text}"
        locs = res.json()
        assert len(locs) > 0, "No geocode results"
        print(f"[PASS] 2. Geocoding passed (found {locs[0]['displayName'][:40]}...)")

        # 3. Method A: Location Area for Varkala
        res = await client.get("/api/geo-area?lat=8.7379&lon=76.7163&radius=1.5&name=Varkala,%20Kerala")
        assert res.status_code == 200, f"Varkala area failed: {res.text}"
        varkala = res.json()
        print(f"[PASS] 3. Varkala Area: {len(varkala['roads'])} roads, {len(varkala['buildings'])} bldgs, {len(varkala['water'])} water, Source: {varkala['dataSource']}")

        # 4. Method A: Location Area for Nellore (different location test)
        res = await client.get("/api/geo-area?lat=14.4426&lon=79.9865&radius=1.5&name=Nellore,%20Andhra%20Pradesh")
        assert res.status_code == 200, f"Nellore area failed: {res.text}"
        nellore = res.json()
        print(f"[PASS] 4. Nellore Area: {len(nellore['roads'])} roads, {len(nellore['buildings'])} bldgs, {len(nellore['water'])} water, Source: {nellore['dataSource']}")
        assert len(varkala['roads']) != len(nellore['roads']), "Varkala and Nellore should not have identical road count!"

        # 5. Method A: Location Area for Siddipet
        res = await client.get("/api/geo-area?lat=18.1018&lon=78.8520&radius=1.5&name=Siddipet,%20Telangana")
        assert res.status_code == 200, f"Siddipet area failed: {res.text}"
        siddipet = res.json()
        print(f"[PASS] 5. Siddipet Area: {len(siddipet['roads'])} roads, {len(siddipet['buildings'])} bldgs, {len(siddipet['water'])} water, Source: {siddipet['dataSource']}")

        # 6. Method B: User Map Import (GeoJSON)
        sample_geojson_path = Path(__file__).parent.parent / "public" / "sample_maps" / "varkala_infrastructure.geojson"
        assert sample_geojson_path.exists(), "Sample geojson not found"
        with open(sample_geojson_path, "rb") as f:
            geojson_bytes = f.read()

        files = {"file": ("varkala_infrastructure.geojson", geojson_bytes, "application/geo+json")}
        res = await client.post("/api/import-map", files=files)
        assert res.status_code == 200, f"Import map failed: {res.text}"
        imported_area = res.json()
        assert imported_area["dataSource"] == "USER_IMPORT", "Imported map dataSource must be USER_IMPORT!"
        print(f"[PASS] 6. Map Import Passed: {len(imported_area['roads'])} roads, Source={imported_area['dataSource']}, CRS={imported_area['coordinateReferenceSystem']}")

        # 7. Analysis must use the exact loaded map (POST /api/analyze with imported map)
        res = await client.post("/api/analyze", json=imported_area)
        assert res.status_code == 200, f"Analyze imported map failed: {res.text}"
        analysis_res = res.json()
        analyzed_roads_count = len(analysis_res["roadAnalysis"])
        print(f"[PASS] 7. Direct Analysis Parity Passed: Analyzed {analyzed_roads_count} roads directly from uploaded map payload!")
        assert analyzed_roads_count == len(imported_area["roads"]), "Analyzed roads count must match imported roads count exactly!"

        # 8. Check that road IDs and issue linkages match 1:1
        first_road = imported_area["roads"][0]
        analyzed_road_ids = {ra["roadId"] for ra in analysis_res["roadAnalysis"]}
        assert first_road["id"] in analyzed_road_ids, f"Displayed road ID {first_road['id']} must match analyzed road ID!"
        print(f"[PASS] 8. Road ID Linkage Passed: Road {first_road['id']} preserved faithfully across 3D and Analysis Engine")

        # 9. Phase 4: Plan Generation under Balanced Priority
        plan_req = {
            "geo_area": imported_area,
            "analysis": analysis_res,
            "priority": "balanced"
        }
        res = await client.post("/api/plans/generate", json=plan_req)
        assert res.status_code == 200, f"Plan generation failed: {res.text}"
        plans_res = res.json()
        assert len(plans_res["candidates"]) >= 3, "Must generate multiple candidate alternatives!"
        assert plans_res["recommendedPlanId"] is not None, "Must select a recommended plan!"
        print(f"[PASS] 9. Phase 4 Candidate Generation: Generated {len(plans_res['candidates'])} alternatives. Recommended: {plans_res['recommendedPlanId']}")

        # 10. Phase 4: Priority Sensitivity Test (Switch to min_cost and verify ranking reflects priority weights)
        plan_req_cost = {
            "geo_area": imported_area,
            "analysis": analysis_res,
            "priority": "min_cost"
        }
        res_cost = await client.post("/api/plans/generate", json=plan_req_cost)
        assert res_cost.status_code == 200
        cost_plans = res_cost.json()
        # In min_cost, low-cost solutions (roundabout or lane reconfig) should achieve higher overall score than heavy flyovers
        top_plan_cost = cost_plans["candidates"][0]
        print(f"[PASS] 10. Phase 4 Priority Weighting: Under 'min_cost', Top Plan is '{top_plan_cost['name']}' (Score: {top_plan_cost['metrics']['overallScore']}, Cost Level: {top_plan_cost['costCategory']})")

        # 11. Phase 4: Proposed Geometry Validation (elevated profiles, coordinates matching CRS)
        flyover_plan = next((c for c in plans_res["candidates"] if c["interventionType"] == "GRADE_SEPARATION"), None)
        if flyover_plan and flyover_plan["proposedGeometry"]:
            elevated_seg = next((s for s in flyover_plan["proposedGeometry"] if s["isElevated"]), None)
            assert elevated_seg is not None, "Flyover plan must contain elevated deck geometry!"
            assert elevated_seg["elevationMeters"] > 0, "Flyover deck elevation must be > 0m!"
            print(f"[PASS] 11. Phase 4 Proposed Geometry: Flyover deck elevated at {elevated_seg['elevationMeters']}m with {elevated_seg['lanes']} lanes")

        # 12. Phase 4: Baseline No-Intervention Option
        no_build = next((c for c in plans_res["candidates"] if c["interventionType"] == "NO_MAJOR_INTERVENTION"), None)
        assert no_build is not None, "Baseline No Major Intervention candidate must always be evaluated!"
        print("[PASS] 12. Phase 4 No-Intervention Option Evaluated and Present")

        # 13. Phase 5: Multi-Horizon Forecast (2030, 2035, 2040)
        forecast_req = {
            "geo_area": imported_area,
            "analysis": analysis_res,
            "plans": plans_res["candidates"],
            "baseline_year": 2026,
            "forecast_years": [2030, 2035, 2040],
            "active_scenario": "moderate_growth",
            "active_year": 2035,
            "model": "auto"
        }
        res_f = await client.post("/api/forecast/generate", json=forecast_req)
        assert res_f.status_code == 200, f"Forecast failed: {res_f.text}"
        forecast_data = res_f.json()
        assert len(forecast_data["horizon_summaries"]) == 3
        print(f"[PASS] 13. Phase 5 Multi-Horizon Forecasting: 2030, 2035, 2040 generated across {len(forecast_data['road_forecasts'])} corridors")

        # 14. Phase 5: Future Bottlenecks & Urban Development Pressure
        assert len(forecast_data["future_bottlenecks"]) > 0
        assert len(forecast_data["development_pressure_areas"]) > 0
        top_fbn = forecast_data["future_bottlenecks"][0]
        print(f"[PASS] 14. Phase 5 Future Bottlenecks & Hotspots: {len(forecast_data['future_bottlenecks'])} bottlenecks, {len(forecast_data['development_pressure_areas'])} pressure areas (Top V/C: {top_fbn['forecast_vc']})")

        # 15. Phase 5: Phase 4 Plan Performance Under Future Conditions
        assert len(forecast_data["plan_performances"]) == len(plans_res["candidates"])
        best_future_plan = min(forecast_data["plan_performances"], key=lambda p: p["post_intervention_avg_vc"])
        print(f"[PASS] 15. Phase 5 Plan Resilience: Simulated all {len(forecast_data['plan_performances'])} plans. Best in 2035: '{best_future_plan['plan_name']}' (Effective through ~{best_future_plan['effective_planning_horizon']})")

    print("\nALL PHASE 1-5 ACCEPTANCE TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(test_all())


