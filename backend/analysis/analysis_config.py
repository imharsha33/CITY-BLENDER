"""
Phase 3 Analysis Configuration: Planning-level parameters, capacities, weights, and thresholds.
All constants and assumptions are exposed transparently.
"""

# Base lane capacity in urban/semi-urban planning context (veh/hr/lane)
BASE_LANE_CAPACITY = 1500

# Capacity adjustment factors by road classification
ROAD_TYPE_CAPACITY_FACTOR = {
    "motorway": 1.30,      # Grade-separated, high design speed ~ 1950 veh/hr/lane
    "trunk": 1.20,         # High-standard arterial ~ 1800 veh/hr/lane
    "primary": 1.00,       # Standard major arterial ~ 1500 veh/hr/lane
    "secondary": 0.85,     # Sub-arterial with side friction ~ 1275 veh/hr/lane
    "tertiary": 0.70,      # Collector with roadside parking/access ~ 1050 veh/hr/lane
    "residential": 0.55,   # Local neighborhood street ~ 825 veh/hr/lane
    "service": 0.40,       # Low-speed service/access road ~ 600 veh/hr/lane
    "unclassified": 0.60,  # Mixed rural/semi-urban ~ 900 veh/hr/lane
    "default": 0.65,
}

# Base traffic demand estimation priors (veh/hr) based on functional hierarchy
BASE_DEMAND_BY_TYPE = {
    "motorway": 2800,
    "trunk": 2400,
    "primary": 1800,
    "secondary": 1100,
    "tertiary": 700,
    "residential": 350,
    "service": 180,
    "unclassified": 450,
    "default": 400,
}

# Volume/Capacity (V/C) Thresholds
VC_LOW = 0.50          # Low utilization
VC_MODERATE = 0.70     # Moderate utilization
VC_HIGH = 0.85         # High utilization
VC_NEAR_CAPACITY = 1.0 # Near capacity
# V/C > 1.0: Potential Capacity Deficiency

# Bottleneck score multi-factor weights (Total = 1.0)
BOTTLENECK_WEIGHTS = {
    "vc_ratio": 0.35,              # Weight of volume/capacity saturation
    "junction_proximity": 0.25,    # Proximity to high-conflict intersection
    "betweenness_centrality": 0.20,# Role in connecting shortest network paths
    "poi_density": 0.10,           # Nearby trip generators (hospitals, stations, commercial)
    "lane_transition": 0.10,       # Sudden constriction / hierarchy drop
}

# Junction conflict score weights (Total = 1.0)
JUNCTION_WEIGHTS = {
    "arm_count": 0.30,             # 3-way, 4-way, multi-arm conflict points
    "major_road_ratio": 0.35,      # Crossing of primary/trunk arteries
    "demand_pressure": 0.20,       # Aggregate incoming corridor demand
    "poi_proximity": 0.15,         # Transit/hospital/school nearby
}

# Bottleneck severity classification thresholds
BOTTLENECK_SEVERITY = {
    "CRITICAL": 75.0,  # Red (Bottleneck Score >= 75)
    "HIGH": 55.0,      # Orange (55 <= Score < 75)
    "POTENTIAL": 35.0, # Yellow (35 <= Score < 55)
    "NORMAL": 0.0,     # Green (< 35)
}

# Junction congestion class mapping
JUNCTION_CLASSES = [
    (80.0, "Critical", "F"),
    (65.0, "Severe", "E"),
    (50.0, "High", "D"),
    (35.0, "Moderate", "C"),
    (20.0, "Low", "B"),
    (0.0,  "Free-flow", "A"),
]
