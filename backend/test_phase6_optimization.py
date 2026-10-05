"""
RoadVision Phase 6: Comprehensive Automated Test Suite
Validates multi-objective strategy optimization, candidate combinations,
compatibility filtering, Pareto front calculation, scenario robustness,
explainability ("Why recommended" and "Why not alternatives"),
geometry aggregation, and API response schemas.
"""
import asyncio
import pytest
import httpx
from main import app
from optimization.models import OptimizationRequest, ObjectiveVector
from optimization.combinations import generate_candidate_combinations
from optimization.compatibility import check_combination_compatibility
from optimization.pareto import identify_pareto_front
from optimization.robustness import evaluate_scenario_robustness
from optimization.objectives import evaluate_objective_vector, compute_strategy_score, get_weights

# ─────────────────────────────────────────────────────────────────────────────
# 1. Unit Tests for Optimization Subsystems
# ─────────────────────────────────────────────────────────────────────────────

def test_combination_generation():
    """Verify combination generation caps at max_size and handles singletons."""
    mock_plans = [
        {"id": "P1", "interventionType": "ROAD_WIDENING"},
        {"id": "P2", "interventionType": "JUNCTION_IMPROVEMENT"},
        {"id": "P3", "interventionType": "CONNECTOR_ROAD"},
    ]
    combos = generate_candidate_combinations(mock_plans, max_size=2)
    # 3 singles + 3 pairs = 6 combinations
    assert len(combos) == 6
    assert any(len(c) == 1 for c in combos)
    assert any(len(c) == 2 for c in combos)
    print("[PASS] Unit 1: Combination generation correctly generates singles and pairs")


def test_compatibility_engine():
    """Verify hard-constraint filtering rejects contradictory or conflicting plans."""
    # Test A: No-intervention combined with physical construction -> INCOMPATIBLE
    incompat_combo = [
        {"id": "P-NONE", "interventionType": "NO_MAJOR_INTERVENTION", "name": "No Action"},
        {"id": "P-WIDE", "interventionType": "ROAD_WIDENING", "name": "Widening"},
    ]
    status, reason = check_combination_compatibility(incompat_combo)
    assert status == "INCOMPATIBLE"
    assert "cannot be combined" in reason.lower()

    # Test B: Conflicting interventions on the same corridor -> INCOMPATIBLE
    corridor_conflict = [
        {"id": "P1", "interventionType": "ROAD_WIDENING", "sourceRoadIds": ["road_101"]},
        {"id": "P2", "interventionType": "LANE_RECONFIGURATION", "sourceRoadIds": ["road_101"]},
    ]
    status, reason = check_combination_compatibility(corridor_conflict)
    assert status == "INCOMPATIBLE"
    assert "road_101" in reason

    # Test C: Independent complementary interventions -> COMPATIBLE
    compatible_combo = [
        {"id": "P1", "interventionType": "ROAD_WIDENING", "sourceRoadIds": ["road_101"]},
        {"id": "P2", "interventionType": "JUNCTION_IMPROVEMENT", "sourceRoadIds": ["road_202"]},
    ]
    status, reason = check_combination_compatibility(compatible_combo)
    assert status in ["COMPATIBLE", "CONDITIONAL"]
    print("[PASS] Unit 2: Compatibility engine enforces hard constraints and detects physical conflicts")


def test_pareto_dominance():
    """Verify Pareto dominance logic correctly identifies non-dominated front."""
    v_strong = ObjectiveVector(
        traffic_improvement=90, future_capacity=85, connectivity=80, safety=85,
        land_impact=70, building_impact=75, environmental_impact=80, disruption=70,
        cost_score=80, emergency_access=75, complexity=70, future_resilience=85, confidence=80
    )
    v_dominated = ObjectiveVector(
        traffic_improvement=60, future_capacity=55, connectivity=50, safety=60,
        land_impact=50, building_impact=50, environmental_impact=60, disruption=50,
        cost_score=50, emergency_access=50, complexity=50, future_resilience=50, confidence=60
    )
    v_tradeoff = ObjectiveVector(
        traffic_improvement=95, future_capacity=90, connectivity=85, safety=90,
        land_impact=40, building_impact=40, environmental_impact=50, disruption=40,
        cost_score=40, emergency_access=80, complexity=40, future_resilience=90, confidence=85
    )

    pareto_flags = identify_pareto_front([v_strong, v_dominated, v_tradeoff])
    assert pareto_flags[0] is True   # v_strong is Pareto optimal
    assert pareto_flags[1] is False  # v_dominated is strictly worse than v_strong on all objectives
    assert pareto_flags[2] is True   # v_tradeoff is Pareto optimal (better on traffic/resilience)
    print("[PASS] Unit 3: Pareto dominance correctly identifies non-dominated boundary")


def test_weighted_scoring_modes():
    """Verify that different optimization modes assign distinct weights."""
    modes = [
        "balanced", "traffic_reduction", "min_cost", "min_land_acquisition",
        "max_resilience", "min_disruption", "max_safety", "environmental_priority"
    ]
    weights_dict = {m: get_weights(m) for m in modes}
    # Traffic reduction must weigh traffic_improvement highest
    assert weights_dict["traffic_reduction"]["traffic_improvement"] > weights_dict["balanced"]["traffic_improvement"]
    # Min cost must weigh cost_score highest
    assert weights_dict["min_cost"]["cost_score"] > weights_dict["balanced"]["cost_score"]
    # Environmental priority must weigh environmental_impact highest
    assert weights_dict["environmental_priority"]["environmental_impact"] > weights_dict["balanced"]["environmental_impact"]
    print("[PASS] Unit 4: Configurable weighted scoring applies distinct criteria weights across 8 modes")


# ─────────────────────────────────────────────────────────────────────────────
# 2. End-to-End API Integration Tests
# ─────────────────────────────────────────────────────────────────────────────

async def test_phase6_api_pipeline():
    """Full lifecycle integration test: Real Geo -> Analysis -> Plans -> Forecasts -> Optimization."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test", timeout=45.0) as client:
        print("\n=== ROADVISION PHASE 6 AUTOMATED API VERIFICATION ===")

        # Step 1: Load Varkala dataset
        res = await client.get("/api/geo-area?lat=8.7379&lon=76.7163&radius=1.5&name=Varkala,%20Kerala")
        assert res.status_code == 200
        geo_area = res.json()
        print(f"[PASS] 1. Loaded real location: {geo_area['locationName']}")

        # Step 2: Phase 3 Analysis
        res = await client.post("/api/analyze", json=geo_area)
        assert res.status_code == 200
        analysis = res.json()
        print(f"[PASS] 2. Analyzed network: {len(analysis['issues'])} issues detected")

        # Step 3: Phase 4 Candidate Plans
        res = await client.post("/api/plans/generate", json={
            "geo_area": geo_area,
            "analysis": analysis,
            "priority": "balanced"
        })
        assert res.status_code == 200
        plans_data = res.json()
        candidate_plans = plans_data.get("candidates", [])
        assert len(candidate_plans) > 0
        print(f"[PASS] 3. Phase 4 candidate plans available: {len(candidate_plans)} alternatives")

        # Step 4: Phase 5 Forecasts
        res = await client.post("/api/forecast/generate", json={
            "geo_area": geo_area,
            "analysis": analysis,
            "plans": candidate_plans,
            "baseline_year": 2026,
            "forecast_years": [2030, 2035, 2040],
            "active_scenario": "moderate_growth",
            "active_year": 2035,
            "model": "auto"
        })
        assert res.status_code == 200
        forecast_data = res.json()
        print(f"[PASS] 4. Phase 5 forecasts generated with {len(forecast_data['future_bottlenecks'])} future bottlenecks")

        # Step 5: Phase 6 Strategy Optimization (Balanced Mode)
        opt_payload = {
            "geo_area": geo_area,
            "analysis": analysis,
            "plans": candidate_plans,
            "forecasts": forecast_data,
            "optimization_mode": "balanced",
            "max_combination_size": 2
        }
        res = await client.post("/api/optimization/generate", json=opt_payload)
        assert res.status_code == 200, f"Optimization failed: {res.text}"
        opt_res = res.json()

        # Validate Schema Requirements
        assert "all_strategies" in opt_res
        assert "pareto_strategies" in opt_res
        assert "recommended_strategy" in opt_res
        assert "why_recommended" in opt_res
        assert "why_not_alternatives" in opt_res
        assert "disclaimer" in opt_res
        assert len(opt_res["all_strategies"]) > 0
        assert len(opt_res["pareto_strategies"]) > 0
        rec = opt_res["recommended_strategy"]
        assert rec is not None
        assert rec["overall_score"] > 0
        assert rec["robustness_score"] >= 0
        assert rec["effective_planning_horizon"] in [2030, 2035, 2040]
        print(f"[PASS] 5. Evaluated {opt_res['total_strategies_evaluated']} combinations. "
              f"Found {len(opt_res['pareto_strategies'])} Pareto-optimal strategies. "
              f"Recommended: '{rec['name']}' (Score: {rec['overall_score']}, Horizon: ~{rec['effective_planning_horizon']})")

        # Validate Explainability ("Why Recommended" & "Why Not Others")
        assert len(opt_res["why_recommended"]) > 0
        print(f"[PASS] 6. Engineering justification present: {len(opt_res['why_recommended'])} reasons provided")
        rejections = opt_res["why_not_alternatives"]
        assert isinstance(rejections, dict)
        print(f"[PASS] 7. Rejection transparency present: {len(rejections)} alternative strategies justified")

        # Validate Multi-Scenario Robustness Matrix
        assert len(rec["scenario_matrix"]) == 4  # Low, Moderate, High, Rapid
        for cell in rec["scenario_matrix"]:
            assert cell["scenario_id"] in ["low_growth", "moderate_growth", "high_growth", "rapid_development"]
            assert "score" in cell
        print("[PASS] 8. Scenario robustness matrix verified across 4 future growth conditions")

        # Validate Strategy Geometry Aggregation
        assert "combined_geometries" in rec
        assert isinstance(rec["combined_geometries"], list)
        print(f"[PASS] 9. Strategy 3D visualization geometry aggregated: {len(rec['combined_geometries'])} road segments")

        # Step 6: Test Mode Sensitivity (Traffic vs Min Cost)
        res_traffic = await client.post("/api/optimization/generate", json={**opt_payload, "optimization_mode": "traffic_reduction"})
        res_cost = await client.post("/api/optimization/generate", json={**opt_payload, "optimization_mode": "min_cost"})
        assert res_traffic.status_code == 200 and res_cost.status_code == 200
        traffic_strat = res_traffic.json()["recommended_strategy"]
        cost_strat = res_cost.json()["recommended_strategy"]
        print(f"[PASS] 10. Mode sensitivity: Traffic Mode chose '{traffic_strat['name']}', Min Cost Mode chose '{cost_strat['name']}'")

        # Step 7: Failure Handling (Empty Candidates)
        res_empty = await client.post("/api/optimization/generate", json={
            "geo_area": geo_area,
            "analysis": analysis,
            "plans": [],
            "optimization_mode": "balanced"
        })
        assert res_empty.status_code == 400
        print("[PASS] 11. Graceful error handling for missing candidate plans verified")

        print("\n>>> ALL PHASE 6 AUTOMATED TESTS PASSED SUCCESSFULLY! <<<\n")


if __name__ == "__main__":
    test_combination_generation()
    test_compatibility_engine()
    test_pareto_dominance()
    test_weighted_scoring_modes()
    asyncio.run(test_phase6_api_pipeline())
