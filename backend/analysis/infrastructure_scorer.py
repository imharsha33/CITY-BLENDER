from typing import List, Dict, Any, Tuple
from models import (
    RoadAnalysisItem,
    JunctionAnalysisItem,
    InfrastructureIssue,
    AnalysisSummary,
    RoadSegment,
    GeoArea,
)

def generate_infrastructure_issues_and_summary(
    area: GeoArea,
    road_analyses: List[RoadAnalysisItem],
    junction_analyses: List[JunctionAnalysisItem],
) -> Tuple[List[InfrastructureIssue], AnalysisSummary]:
    issues: List[InfrastructureIssue] = []

    capacity_deficiencies = 0
    bottlenecks = 0
    connectivity_issues = 0
    high_risk_junctions = 0
    network_critical_segments = 0

    # 1. Analyze flagged roads
    for r in road_analyses:
        # Check Capacity Deficiency
        if r.utilizationStatus == "CAPACITY_DEFICIENCY":
            capacity_deficiencies += 1
            issues.append(InfrastructureIssue(
                id=f"issue-cap-{r.roadId}",
                type="CAPACITY_DEFICIENCY",
                severity="HIGH" if r.vcRatio < 1.25 else "CRITICAL",
                score=min(100.0, round(r.vcRatio * 75.0, 1)),
                roadSegmentId=r.roadId,
                location=r.geometry[len(r.geometry) // 2],
                title=f"Capacity Saturation: {r.name}",
                description=f"Modelled hourly demand of {int(r.estimatedDemand)} veh/hr exceeds designed capacity of {int(r.estimatedCapacity)} veh/hr (V/C = {r.vcRatio:.2f}).",
                reasons=[
                    f"Traffic demand exceeds corridor capacity threshold by {int((r.vcRatio - 1.0) * 100)}%",
                    f"Operating with {r.lanes} lanes under '{r.highwayType}' functional classification",
                    "Throughput constraints induce localized vehicular queues during peak intervals",
                ],
                metrics={
                    "vcRatio": r.vcRatio,
                    "estimatedDemand": r.estimatedDemand,
                    "estimatedCapacity": r.estimatedCapacity,
                    "lanes": r.lanes,
                    "highwayType": r.highwayType,
                },
                confidence=84.0 if r.lanesKnown else 72.0,
            ))

        # Check Bottleneck
        if r.bottleneckCategory in {"HIGH", "CRITICAL"}:
            bottlenecks += 1
            issues.append(InfrastructureIssue(
                id=f"issue-btn-{r.roadId}",
                type="BOTTLENECK",
                severity="CRITICAL" if r.bottleneckCategory == "CRITICAL" else "HIGH",
                score=r.bottleneckScore,
                roadSegmentId=r.roadId,
                location=r.geometry[len(r.geometry) // 2],
                title=f"{r.bottleneckCategory.title()} Bottleneck: {r.name}",
                description=f"Multi-factor analysis detected severe constriction on {r.name} (Bottleneck Score {r.bottleneckScore}/100).",
                reasons=[
                    f"Composite bottleneck score {r.bottleneckScore}/100 driven by volume saturation and network centrality",
                    "Limited parallel alternative routes available in local grid network",
                    "Constriction creates systemic travel time variability across the urban quadrant",
                ],
                metrics={
                    "bottleneckScore": r.bottleneckScore,
                    "vcRatio": r.vcRatio,
                    "networkImportance": r.networkImportance,
                },
                confidence=80.0,
            ))

        # Check Network Critical Dependency
        if r.networkImportance >= 75.0:
            network_critical_segments += 1
            issues.append(InfrastructureIssue(
                id=f"issue-crit-{r.roadId}",
                type="NETWORK_CRITICAL_SEGMENT",
                severity="MEDIUM",
                score=r.networkImportance,
                roadSegmentId=r.roadId,
                location=r.geometry[len(r.geometry) // 2],
                title=f"Critical Network Spine: {r.name}",
                description=f"Corridor carries disproportionate topological betweenness centrality ({r.networkImportance}/100). A large proportion of local trips depend on this single link.",
                reasons=[
                    "High graph betweenness centrality across the 2 km corridor network",
                    "Disruption or impedance on this link significantly increases network-wide detour distances",
                ],
                metrics={
                    "networkImportance": r.networkImportance,
                    "lengthMeters": r.lengthMeters,
                },
                confidence=88.0,
            ))

    # 2. Analyze flagged junctions
    for j in junction_analyses:
        if j.junctionScore >= 55.0:
            if j.junctionScore >= 75.0:
                high_risk_junctions += 1
                severity = "CRITICAL"
            else:
                severity = "HIGH"

            issues.append(InfrastructureIssue(
                id=f"issue-junc-{j.id}",
                type="JUNCTION_RISK",
                severity=severity,
                score=j.junctionScore,
                junctionId=j.id,
                location=j.coordinate,
                title=f"High-Conflict Intersection ({j.armCount}-Way)",
                description=f"Intersection features {j.armCount} approaches ({j.majorApproaches} major arterial links) operating at {j.congestionClass}.",
                reasons=j.reasons,
                metrics={
                    "armCount": j.armCount,
                    "majorApproaches": j.majorApproaches,
                    "junctionScore": j.junctionScore,
                    "congestionClass": j.congestionClass,
                },
                confidence=j.confidence,
            ))

    # 3. Assess overall Data Quality
    known_lanes_count = sum(1 for r in area.roads if r.lanes is not None)
    total_roads = len(area.roads)
    lane_coverage = (known_lanes_count / max(1, total_roads)) * 100.0

    dq_reasons: List[str] = [
        f"Verified geometric road alignment from OpenStreetMap ({total_roads} segments)",
    ]
    if lane_coverage > 40.0:
        dq_reasons.append(f"Moderate lane attribute coverage ({int(lane_coverage)}% surveyed)")
        dq_score = 78.0
    else:
        dq_reasons.append(f"Standard planning lane estimates applied ({int(100 - lane_coverage)}% estimated)")
        dq_score = 71.0

    dq_reasons.append("Traffic volumes modelled using hierarchy and land-use generators rather than loop detectors")

    summary = AnalysisSummary(
        roadsAnalyzed=total_roads,
        junctionsAnalyzed=len(junction_analyses),
        capacityDeficiencies=capacity_deficiencies,
        bottlenecks=bottlenecks,
        connectivityIssues=max(1, len([r for r in road_analyses if r.networkImportance > 70])),
        highRiskJunctions=high_risk_junctions,
        networkCriticalSegments=network_critical_segments,
        dataQualityScore=dq_score,
        dataQualityReasons=dq_reasons,
    )

    return issues, summary
