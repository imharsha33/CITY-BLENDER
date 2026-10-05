import asyncio
import httpx

async def test_madurai():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=60.0) as client:
        # 1. Geocode search tests
        for q in ["mad", "madu", "madur", "madurai"]:
            res = await client.get(f"/api/geocode?q={q}")
            assert res.status_code == 200, f"Geocode failed for {q}"
            data = res.json()
            assert len(data) > 0, f"No results for {q}"
            top_loc = data[0]["displayName"]
            assert "Madurai" in top_loc, f"Top result for '{q}' should be Madurai, got: '{top_loc}'"
            print(f"[PASS] Geocode '{q}' -> Top #1: {top_loc}")

        # 2. Other locations partial search
        for q, expected in [("nel", "Nellore"), ("var", "Varkala"), ("sid", "Siddipet")]:
            res = await client.get(f"/api/geocode?q={q}")
            assert res.status_code == 200
            data = res.json()
            assert any(expected.lower() in loc["displayName"].lower() for loc in data), f"'{q}' should include {expected}"
            print(f"[PASS] Geocode '{q}' -> Contains {expected}")

        # 3. GeoArea for Madurai
        res = await client.get("/api/geo-area?lat=9.9261&lon=78.1141&radius=2.0&name=Madurai%2C%20Tamil%20Nadu%2C%20India")
        assert res.status_code == 200
        geo_area = res.json()
        roads_count = len(geo_area.get("roads", []))
        buildings_count = len(geo_area.get("buildings", []))
        water_count = len(geo_area.get("water", []))
        assert roads_count >= 1000, f"Madurai must have rich road network, got {roads_count}"
        print(f"[PASS] Madurai GeoArea: {roads_count} roads, {buildings_count} buildings, {water_count} water features")

        # 4. Phase 3 Analysis
        res = await client.post("/api/analyze", json=geo_area)
        assert res.status_code == 200
        analysis = res.json()
        print(f"[PASS] Phase 3 Analysis: {len(analysis.get('issues', []))} issues, {len(analysis.get('roadAnalysis', []))} roads analyzed")

        # 5. Phase 4 Planning
        res = await client.post("/api/plans/generate", json={
            "geo_area": geo_area,
            "analysis": analysis,
            "priority": "balanced"
        })
        if res.status_code != 200:
            print("PLANS ERROR:", res.status_code, res.text)
        assert res.status_code == 200
        plans_data = res.json()
        candidates = plans_data["candidates"]
        assert len(candidates) >= 3
        print(f"[PASS] Phase 4 Plans: {len(candidates)} candidates generated, recommended: {plans_data['recommendedPlanId']}")

        # 6. Phase 5 Forecast
        res = await client.post("/api/forecast/generate", json={
            "geo_area": geo_area,
            "analysis": analysis,
            "plans": candidates,
            "baseline_year": 2026,
            "forecast_years": [2030, 2035, 2040],
            "active_scenario": "moderate_growth",
            "active_year": 2035,
            "model": "auto"
        })
        assert res.status_code == 200
        forecast = res.json()
        print(f"[PASS] Phase 5 Forecast: {len(forecast['future_bottlenecks'])} future bottlenecks detected")

        # 7. Phase 6 Optimization
        res = await client.post("/api/optimization/generate", json={
            "geo_area": geo_area,
            "analysis": analysis,
            "plans": candidates,
            "forecasts": forecast,
            "optimization_mode": "balanced",
            "max_combination_size": 2
        })
        assert res.status_code == 200
        opt = res.json()
        strategies = opt.get('pareto_strategies', opt.get('all_strategies', []))
        assert len(strategies) > 0, "No Pareto strategies found"
        rec_id = opt.get('recommended_strategy', {}).get('id', 'N/A')
        print(f"[PASS] Phase 6 Optimization: {len(strategies)} Pareto-optimal strategies found, recommended: {rec_id}")
        print("\nALL MADURAI BACKEND PIPELINE TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(test_madurai())
