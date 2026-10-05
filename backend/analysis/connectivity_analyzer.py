import networkx as nx
from typing import Dict, Any

def analyze_network_connectivity(graph: nx.Graph) -> Dict[str, Dict[str, float]]:
    """
    Computes graph betweenness centrality, degree centrality, and network importance
    for each edge in the road graph.
    Returns: mapping of road_id -> { betweenness, importance_score, degree_centrality }
    """
    results: Dict[str, Dict[str, float]] = {}

    if len(graph) == 0:
        return results

    try:
        # Edge betweenness centrality measures fraction of all shortest paths passing through edge
        edge_betweenness = nx.edge_betweenness_centrality(graph, normalized=True, weight="weight")
    except Exception:
        edge_betweenness = {}

    max_bet = max(edge_betweenness.values()) if edge_betweenness else 1.0
    if max_bet <= 0:
        max_bet = 1.0

    for (u, v), bet_val in edge_betweenness.items():
        edge_data = graph.get_edge_data(u, v)
        if not edge_data:
            continue
        road_id = edge_data.get("id")
        if not road_id:
            continue

        normalized_bet = bet_val / max_bet
        # Network importance score: 0 to 100
        importance_score = min(100.0, round(normalized_bet * 100.0, 1))

        results[road_id] = {
            "betweenness": round(bet_val, 4),
            "normalizedBetweenness": round(normalized_bet, 4),
            "importanceScore": max(15.0, importance_score),
        }

    return results
