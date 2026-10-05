import math
import networkx as nx
from typing import List, Tuple, Dict, Any
from models import RoadSegment

def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Distance in meters between two (lat, lon) coordinates."""
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return 6378137.0 * c

def calculate_linestring_length(geometry: List[Tuple[float, float]]) -> float:
    total = 0.0
    for i in range(len(geometry) - 1):
        total += haversine_distance(geometry[i], geometry[i + 1])
    return total

class RoadNetworkGraph:
    def __init__(self, roads: List[RoadSegment]):
        self.roads = roads
        self.graph = nx.Graph()
        self.node_positions: Dict[str, Tuple[float, float]] = {}
        self.junction_nodes: Dict[str, Dict[str, Any]] = {}
        self.build()

    def _get_or_create_node(self, coord: Tuple[float, float], snap_tolerance_m: float = 12.0) -> str:
        # Snap to existing node if within tolerance
        for node_id, pos in self.node_positions.items():
            if haversine_distance(coord, pos) <= snap_tolerance_m:
                return node_id

        new_id = f"node_{len(self.node_positions) + 1}"
        self.node_positions[new_id] = coord
        self.graph.add_node(new_id, pos=coord)
        return new_id

    def build(self):
        for road in self.roads:
            if len(road.geometry) < 2:
                continue

            length_m = calculate_linestring_length(road.geometry)
            u = self._get_or_create_node(road.geometry[0])
            v = self._get_or_create_node(road.geometry[-1])

            # Store edge with metadata
            self.graph.add_edge(
                u, v,
                id=road.id,
                name=road.name,
                highwayType=road.highwayType,
                lanes=road.lanes,
                lengthMeters=length_m,
                geometry=road.geometry,
                weight=max(1.0, length_m),
            )

        # Detect junction nodes (degree >= 3)
        for node_id in self.graph.nodes:
            deg = self.graph.degree(node_id)
            if deg >= 3:
                pos = self.node_positions[node_id]
                incident_edges = list(self.graph.edges(node_id, data=True))
                self.junction_nodes[node_id] = {
                    "id": f"junc_{node_id}",
                    "nodeId": node_id,
                    "coordinate": pos,
                    "degree": deg,
                    "edges": incident_edges,
                }
