from typing import Dict, List, Any
from models import (
    GeoArea,
    AnalysisResultResponse,
    RoadAnalysisItem,
    JunctionAnalysisItem,
)
from analysis.network_builder import RoadNetworkGraph, calculate_linestring_length, haversine_distance
from analysis.capacity_model import estimate_road_capacity
from analysis.traffic_model import estimate_traffic_demand
from analysis.junction_analyzer import analyze_junctions
from analysis.connectivity_analyzer import analyze_network_connectivity
from analysis.bottleneck_detector import evaluate_bottleneck_and_vc
from analysis.infrastructure_scorer import generate_infrastructure_issues_and_summary
from analysis.development_zones import synthesize_development_zones, synthesize_development_zones_with_diagnostics


# Analysis result cache
ANALYSIS_CACHE: Dict[str, AnalysisResultResponse] = {}

def run_infrastructure_analysis(area: GeoArea) -> AnalysisResultResponse:
    cache_key = f"{round(area.center[0], 4)}_{round(area.center[1], 4)}_{round(area.radiusKm, 2)}"
    if cache_key in ANALYSIS_CACHE:
        return ANALYSIS_CACHE[cache_key]

    # 1. Build topological road network graph
    net_graph = RoadNetworkGraph(area.roads)

    # 2. Analyze network connectivity and betweenness centrality
    connectivity_map = analyze_network_connectivity(net_graph.graph)

    # 3. Analyze intersections / junctions
    junction_analyses = analyze_junctions(net_graph.junction_nodes, area.pois)

    # Mapping of road ID to max adjacent junction score
    road_to_junc_score: Dict[str, float] = {}
    for j in junction_analyses:
        for r_id in j.connectedRoadIds:
            road_to_junc_score[r_id] = max(road_to_junc_score.get(r_id, 0.0), j.junctionScore)

    # 4. Analyze each individual road segment
    road_analyses: List[RoadAnalysisItem] = []
    for road in area.roads:
        if len(road.geometry) < 2:
            continue

        length_m = calculate_linestring_length(road.geometry)
        max_adj_junc = road_to_junc_score.get(road.id, 0.0)
        is_near_major_junc = max_adj_junc >= 50.0

        # Capacity
        capacity_val, lanes, lanes_known, _ = estimate_road_capacity(road, is_near_major_junc)

        # Connectivity stats
        conn_info = connectivity_map.get(road.id, {"normalizedBetweenness": 0.15, "importanceScore": 25.0})
        betweenness = conn_info.get("normalizedBetweenness", 0.15)
        importance = conn_info.get("importanceScore", 25.0)

        # Traffic demand
        demand_val, _, _ = estimate_traffic_demand(road, betweenness, area.pois, area.buildings)

        # V/C ratio
        vc_ratio = round(demand_val / max(1.0, capacity_val), 2)

        # POI count nearby
        mid_pt = road.geometry[len(road.geometry) // 2]
        nearby_poi_cnt = sum(1 for p in area.pois if haversine_distance(mid_pt, p.coordinate) <= 250.0)

        # Bottleneck detection
        btn_score, btn_cat, util_status, _ = evaluate_bottleneck_and_vc(
            road, vc_ratio, betweenness, max_adj_junc, nearby_poi_cnt
        )

        road_analyses.append(RoadAnalysisItem(
            roadId=road.id,
            name=road.name or "Unnamed Road",
            highwayType=road.highwayType,
            lengthMeters=round(length_m, 1),
            lanes=lanes,
            lanesKnown=lanes_known,
            estimatedCapacity=capacity_val,
            estimatedDemand=demand_val,
            vcRatio=vc_ratio,
            utilizationStatus=util_status,
            bottleneckScore=btn_score,
            bottleneckCategory=btn_cat,
            networkImportance=importance,
            geometry=road.geometry,
        ))

    # 5. Generate structured explainable issues and summary
    issues, summary = generate_infrastructure_issues_and_summary(area, road_analyses, junction_analyses)

    # 6. Phase 8 & 9: Synthesize spatial development zones across whole place with unclustered diagnostics
    development_zones, unclustered_issues, clustering_diag, coverage_metrics = synthesize_development_zones_with_diagnostics(
        area, road_analyses, junction_analyses, issues
    )
    area.developmentZones = development_zones
    summary.coverageMetrics = coverage_metrics

    assumptions = [
        "Base urban lane capacity assumed at 1,500 veh/hr/lane with classification adjustment factors [PLANNING_ASSUMPTION].",
        "Traffic demand is estimated using functional road hierarchy, network centrality, and trip generators [MODELED_ESTIMATE].",
        "Junction conflict scores evaluate approach geometry, arterial crossings, and adjacent facility friction [MODELED_ESTIMATE].",
        "Bottleneck severity combines volume/capacity saturation, junction delays, and alternative route deficit [MODELED_ESTIMATE].",
        "Findings represent planning-level screening diagnostics rather than certified micro-simulation [PLANNING_ASSUMPTION].",
    ]

    provenance = {
        "osm_road_geometry": "REAL_GEOGRAPHIC",
        "building_footprints": "REAL_GEOGRAPHIC",
        "water_features": "REAL_GEOGRAPHIC",
        "osm_road_classification": "REAL_OBSERVED",
        "estimated_traffic_demand": "MODELED_ESTIMATE",
        "road_capacity_estimate": "MODELED_ESTIMATE",
        "vc_ratio": "MODELED_ESTIMATE",
        "junction_conflict_score": "MODELED_ESTIMATE",
        "forecast_growth_rate": "PLANNING_ASSUMPTION",
        "2035_future_demand": "FORECAST",
        "proposed_interventions": "PROPOSED",
        "construction_transformation": "SIMULATED",
    }

    response = AnalysisResultResponse(
        locationName=area.locationName,
        center=area.center,
        summary=summary,
        roadAnalysis=road_analyses,
        junctionAnalysis=junction_analyses,
        issues=issues,
        developmentZones=development_zones,
        unclusteredIssues=unclustered_issues,
        clusteringDiagnostics=clustering_diag,
        coverageMetrics=coverage_metrics,
        assumptions=assumptions,
        dataProvenance=provenance,
        source="OpenStreetMap + Planning-Level Analytical Models",
    )

    ANALYSIS_CACHE[cache_key] = response
    return response

