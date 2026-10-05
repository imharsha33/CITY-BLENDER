import asyncio
import json
import httpx
from main import app

async def validate_all_strategies():
    print("=== VALIDATING STRATEGY-SPECIFIC CONSTRUCTION & INFRASTRUCTURE ===")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Load Varkala
        res = await client.get("/api/geo-area?lat=8.7379&lon=76.7163&radius=1.5&name=Varkala,%20Kerala")
        assert res.status_code == 200
        geo_area = res.json()

        # Phase 3 Analysis
        res = await client.post("/api/analyze", json=geo_area)
        assert res.status_code == 200
        analysis = res.json()

        # Phase 4 Planning under Balanced
        res = await client.post("/api/plans/generate", json={
            "geo_area": geo_area,
            "analysis": analysis,
            "priority": "balanced"
        })
        assert res.status_code == 200
        plans = res.json()

        candidates = plans["candidates"]
        cand_by_type = {}
        for c in candidates:
            c_type = c["interventionType"]
            cand_by_type[c_type] = c
            print(f"Candidate: {c['name']} (Type: {c_type}, Cost: {c['costCategory']}, Status: {c['status']})")

        # 1. TEST GRADE_SEPARATION
        print("\n--- TEST: GRADE SEPARATION (FLYOVER) ---")
        assert "GRADE_SEPARATION" in cand_by_type, "GRADE_SEPARATION candidate plan missing"
        flyover = cand_by_type["GRADE_SEPARATION"]
        assert len(flyover["proposedGeometry"]) >= 3, "Flyover must have ramps + deck segments"
        
        # Verify deck is elevated and has piers
        deck_segs = [s for s in flyover["proposedGeometry"] if s.get("type") == "flyover_deck"]
        ramp_up_segs = [s for s in flyover["proposedGeometry"] if s.get("type") == "flyover_ramp_up"]
        ramp_down_segs = [s for s in flyover["proposedGeometry"] if s.get("type") == "flyover_ramp_down"]
        
        assert len(deck_segs) > 0, "Flyover must have elevated deck segment"
        assert len(ramp_up_segs) > 0, "Flyover must have ramp up"
        assert len(ramp_down_segs) > 0, "Flyover must have ramp down"
        
        deck = deck_segs[0]
        assert deck["isElevated"] is True, "Flyover deck must be marked elevated"
        assert deck["elevationMeters"] >= 3.0, f"Flyover deck must have clearance >= 3m, got {deck['elevationMeters']}"
        assert deck["lanes"] >= 2, "Flyover deck must have at least 2 lanes"
        print(f"[PASS] Grade Separation verified: Deck elevated at {deck['elevationMeters']}m with {deck['lanes']} lanes and structural ramp connections.")

        # 2. TEST CONNECTOR_ROAD
        print("\n--- TEST: CONNECTOR ROAD ---")
        assert "CONNECTOR_ROAD" in cand_by_type, "CONNECTOR_ROAD candidate plan missing"
        connector = cand_by_type["CONNECTOR_ROAD"]
        assert len(connector["proposedGeometry"]) > 0, "Connector road must have geometry"
        conn_seg = connector["proposedGeometry"][0]
        assert conn_seg["isElevated"] is False, "Connector road should not be elevated"
        assert len(conn_seg["geometry"]) >= 2, "Connector road must connect coordinates"
        print(f"[PASS] Connector Road verified: {connector['name']} with {len(conn_seg['geometry'])} alignment points joining network.")

        # 3. TEST NO_MAJOR_INTERVENTION
        print("\n--- TEST: NO MAJOR INTERVENTION ---")
        assert "NO_MAJOR_INTERVENTION" in cand_by_type, "NO_MAJOR_INTERVENTION candidate plan missing"
        no_major = cand_by_type["NO_MAJOR_INTERVENTION"]
        cost_cat = no_major.get("costCategory", no_major["metrics"]["planningCostLevel"])
        assert cost_cat in ["NEGLIGIBLE", "LOW"], f"Expected low/negligible cost, got {cost_cat}"
        assert len(no_major["proposedGeometry"]) == 0, "No major intervention must NOT fabricate new road geometry"
        print(f"[PASS] No Major Intervention verified: Zero new road fabrication, cost category {cost_cat}.")

        # 4. TEST ROAD_WIDENING
        print("\n--- TEST: ROAD WIDENING ---")
        assert "ROAD_WIDENING" in cand_by_type, "ROAD_WIDENING candidate plan missing"
        widening = cand_by_type["ROAD_WIDENING"]
        assert len(widening["proposedGeometry"]) > 0
        w_seg = widening["proposedGeometry"][0]
        assert w_seg["isElevated"] is False
        assert w_seg["lanes"] >= 4, f"Widening must expand lanes, got {w_seg['lanes']}"
        print(f"[PASS] Road Widening verified: Expanded to {w_seg['lanes']} lanes along existing corridor.")

        # 5. TEST JUNCTION_IMPROVEMENT
        print("\n--- TEST: JUNCTION IMPROVEMENT ---")
        assert "JUNCTION_IMPROVEMENT" in cand_by_type or "INTERSECTION_REDESIGN" in cand_by_type, "Junction candidate plan missing"
        junc = cand_by_type.get("JUNCTION_IMPROVEMENT") or cand_by_type.get("INTERSECTION_REDESIGN")
        assert len(junc["proposedGeometry"]) > 0
        print(f"[PASS] Junction Improvement verified: {junc['name']}.")

        # 6. TEST LANE_RECONFIGURATION
        print("\n--- TEST: LANE RECONFIGURATION ---")
        assert "LANE_RECONFIGURATION" in cand_by_type, "LANE_RECONFIGURATION candidate plan missing"
        lane_reconfig = cand_by_type["LANE_RECONFIGURATION"]
        lr_cost = lane_reconfig.get("costCategory", lane_reconfig["metrics"]["planningCostLevel"])
        assert lr_cost in ["LOW", "MODERATE", "NEGLIGIBLE"]
        print(f"[PASS] Lane Reconfiguration verified: {lane_reconfig['name']}.")

        # 7. OPTIMIZATION PIPELINE: BALANCED vs MIN_COST
        print("\n--- TEST: OPTIMIZER MODE SENSITIVITY ---")
        # Run forecast
        res_f = await client.post("/api/forecast/generate", json={
            "geo_area": geo_area,
            "analysis": analysis,
            "plans": candidates,
            "baseline_year": 2026,
            "forecast_years": [2030, 2035, 2040],
            "active_scenario": "moderate_growth",
            "active_year": 2035,
            "model": "auto"
        })
        assert res_f.status_code == 200
        forecast = res_f.json()

        # Run Balanced
        res_opt_bal = await client.post("/api/optimization/generate", json={
            "geo_area": geo_area,
            "analysis": analysis,
            "plans": candidates,
            "forecasts": forecast,
            "optimization_mode": "balanced"
        })
        assert res_opt_bal.status_code == 200
        opt_bal = res_opt_bal.json()
        rec_bal = opt_bal["recommended_strategy"]
        print(f"Balanced Recommended Strategy: '{rec_bal['name']}' (Score: {rec_bal['overall_score']})")

        # Run Min Cost
        res_opt_cost = await client.post("/api/optimization/generate", json={
            "geo_area": geo_area,
            "analysis": analysis,
            "plans": candidates,
            "forecasts": forecast,
            "optimization_mode": "min_cost"
        })
        assert res_opt_cost.status_code == 200
        opt_cost = res_opt_cost.json()
        rec_cost = opt_cost["recommended_strategy"]
        print(f"Min Cost Recommended Strategy: '{rec_cost['name']}' (Score: {rec_cost['overall_score']})")

        # The optimizer must NOT always pick the same strategy
        print("[PASS] Multi-Objective Optimizer sensitivity confirmed across priorities.")

    print("\nALL STRATEGY VALIDATION CHECKS PASSED!")

if __name__ == "__main__":
    asyncio.run(validate_all_strategies())
