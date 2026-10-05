"""
RoadVision Phase 5: Comprehensive Automated Test Suite
Validates future demand forecasting, multi-scenario simulation, bottleneck detection,
urban development pressure, and Phase 4 plan resilience.
"""
import asyncio
from pathlib import Path
import httpx
from main import app

async def test_phase5():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test", timeout=45.0) as client:
        print("\n=== ROADVISION PHASE 5 AUTOMATED VERIFICATION ===")

        # 1. Load active geographic data for Varkala
        res = await client.get("/api/geo-area?lat=8.7379&lon=76.7163&radius=1.5&name=Varkala,%20Kerala")
        assert res.status_code == 200
        varkala_geo = res.json()
        print(f"[PASS] 1. Loaded Varkala GeoArea: {len(varkala_geo['roads'])} roads, {len(varkala_geo['buildings'])} buildings")

        # 2. Run Phase 3 analysis
        res = await client.post("/api/analyze", json=varkala_geo)
        assert res.status_code == 200
        varkala_analysis = res.json()
        print(f"[PASS] 2. Phase 3 Analysis completed: {len(varkala_analysis['issues'])} issues detected")

        # 3. Generate Phase 4 candidate plans
        res = await client.post("/api/plans/generate", json={
            "geo_area": varkala_geo,
            "analysis": varkala_analysis,
            "priority": "balanced"
        })
        assert res.status_code == 200
        plans_data = res.json()
        plans = plans_data.get("candidates", [])
        print(f"[PASS] 3. Phase 4 Plans generated: {len(plans)} alternatives available for future testing")

        # 4. Phase 5 Forecast Generation (Moderate Growth 2035)
        forecast_payload = {
            "geo_area": varkala_geo,
            "analysis": varkala_analysis,
            "plans": plans,
            "baseline_year": 2026,
            "forecast_years": [2030, 2035, 2040],
            "active_scenario": "moderate_growth",
            "active_year": 2035,
            "model": "auto"
        }
        res = await client.post("/api/forecast/generate", json=forecast_payload)
        assert res.status_code == 200, f"Forecast error: {res.text}"
        forecast = res.json()

        # Check multi-horizon summaries
        summaries = forecast["horizon_summaries"]
        assert len(summaries) == 3, f"Expected 3 horizon summaries, got {len(summaries)}"
        assert summaries[0]["year"] == 2030
        assert summaries[1]["year"] == 2035
        assert summaries[2]["year"] == 2040

        # Demand growth monotonicity: 2040 > 2035 > 2030
        assert summaries[2]["total_demand"] > summaries[1]["total_demand"] > summaries[0]["total_demand"], \
            "Total demand should increase monotonically over time"
        print(f"[PASS] 4. Multi-Horizon Demand: 2030: {summaries[0]['total_demand']} (+{summaries[0]['demand_growth_pct']}%), "
              f"2035: {summaries[1]['total_demand']} (+{summaries[1]['demand_growth_pct']}%), "
              f"2040: {summaries[2]['total_demand']} (+{summaries[2]['demand_growth_pct']}%)")

        # 5. Future Bottleneck Detection
        bns = forecast["future_bottlenecks"]
        assert len(bns) > 0, "Expected future bottlenecks to be detected in 2035"
        top_bn = bns[0]
        assert top_bn["forecast_vc"] >= 0.80, f"Top bottleneck should have V/C >= 0.80, got {top_bn['forecast_vc']}"
        assert len(top_bn["evidence"]) > 0, "Bottleneck evidence points must be present"
        assert top_bn["recommended_intervention_type"], "Bottleneck must link to recommended intervention"
        print(f"[PASS] 5. Future Bottleneck Detection: {len(bns)} bottlenecks identified in 2035. "
              f"Top: {top_bn['road_name']} (V/C {top_bn['current_vc']} -> {top_bn['forecast_vc']}, Rec: {top_bn['recommended_intervention_type']})")

        # 6. Urban Development Pressure
        dev_areas = forecast["development_pressure_areas"]
        assert len(dev_areas) > 0, "Expected urban development pressure areas"
        assert any(a["pressure_level"] in ["HIGH", "MEDIUM"] for a in dev_areas)
        print(f"[PASS] 6. Development Pressure: {len(dev_areas)} spatial sectors analyzed. "
              f"Primary: {dev_areas[0]['name']} ({dev_areas[0]['pressure_level']} Pressure, {dev_areas[0]['building_density_sqkm']} bldgs/sq km)")

        # 7. Phase 4 Plan Performance Under Future Conditions
        plan_perfs = forecast["plan_performances"]
        assert len(plan_perfs) == len(plans), f"Expected {len(plans)} simulated plans, got {len(plan_perfs)}"
        for perf in plan_perfs:
            assert "effective_planning_horizon" in perf
            assert "vc_reduction_pct" in perf
            assert perf["vc_reduction_pct"] >= 0.0
        best_plan = min(plan_perfs, key=lambda p: p["post_intervention_avg_vc"])
        print(f"[PASS] 7. Phase 4 Plan Simulation in 2035: Best performer is '{best_plan['plan_name']}' "
              f"(V/C reduced by {best_plan['vc_reduction_pct']}%, effective through ~{best_plan['effective_planning_horizon']})")

        # 8. Scenario Sensitivity (Low vs High Growth)
        res_low = await client.post("/api/forecast/generate", json={**forecast_payload, "active_scenario": "low_growth"})
        res_high = await client.post("/api/forecast/generate", json={**forecast_payload, "active_scenario": "high_growth"})
        assert res_low.status_code == 200 and res_high.status_code == 200
        low_data = res_low.json()
        high_data = res_high.json()

        low_2035_demand = [s for s in low_data["horizon_summaries"] if s["year"] == 2035][0]["total_demand"]
        high_2035_demand = [s for s in high_data["horizon_summaries"] if s["year"] == 2035][0]["total_demand"]
        assert high_2035_demand > low_2035_demand, "High growth scenario must produce greater demand than low growth"
        print(f"[PASS] 8. Scenario Sensitivity: Low Growth 2035 Demand = {low_2035_demand} vs High Growth = {high_2035_demand}")

        # 9. Model Selection Check (Graceful fallback on insufficient data)
        assert forecast["model_selected"] == "Scenario Baseline"
        assert "Insufficient historical observations" in forecast["model_selection_reason"] or "No historical" in forecast["model_selection_reason"]
        print(f"[PASS] 9. Model Selection Integrity: '{forecast['model_selected']}' selected with reason: {forecast['model_selection_reason'][:70]}...")

        # 10. Data Provenance & Statutory Disclaimer
        assert "disclaimer" in forecast and "RoadVision future forecasts are planning-level scenario estimates" in forecast["disclaimer"]
        assert "source" in forecast["data_provenance"]
        print("[PASS] 10. Data Provenance and Statutory Engineering Disclaimer verified")

        print("\nALL PHASE 5 ACCEPTANCE TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_phase5())
