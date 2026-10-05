import httpx
import logging
import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
from models import GeoArea, RoadSegment, Building, WaterFeature, POI, BoundingBox

logger = logging.getLogger(__name__)

# Cache directory on disk for reliability & fast re-loading
CACHE_DIR = Path(__file__).parent / "cache" / "osm"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# In-memory area cache
AREA_CACHE: Dict[str, GeoArea] = {}

# Highway estimated widths (meters) for visualization default when OSM lanes is missing
DEFAULT_ROAD_WIDTHS = {
    "motorway": 16.0,
    "trunk": 14.0,
    "primary": 10.5,
    "secondary": 8.0,
    "tertiary": 6.5,
    "residential": 5.5,
    "living_street": 4.5,
    "service": 4.0,
    "unclassified": 5.5,
    "track": 3.5,
    "motorway_link": 8.0,
    "trunk_link": 7.5,
    "primary_link": 7.0,
    "secondary_link": 6.5,
    "tertiary_link": 6.0,
}

OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

OVERPASS_HEADERS = {
    "User-Agent": "RoadVision/1.0 (civil-infrastructure-digital-twin; contact@roadvision.local)",
    "Accept": "application/json",
}

async def fetch_geo_area(
    lat: float,
    lon: float,
    radius_km: float = 1.5,
    location_name: str = ""
) -> GeoArea:
    cache_key = f"{round(lat, 4)}_{round(lon, 4)}_{round(radius_km, 2)}"
    
    # 1. Check in-memory cache
    if cache_key in AREA_CACHE:
        return AREA_CACHE[cache_key]

    # 2. Check disk cache
    disk_file = CACHE_DIR / f"{cache_key}.json"
    if disk_file.exists():
        try:
            with open(disk_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                area = GeoArea(**data)
                AREA_CACHE[cache_key] = area
                logger.info(f"Loaded {location_name or cache_key} from disk cache")
                return area
        except Exception as e:
            logger.warning(f"Failed reading disk cache for {cache_key}: {e}")

    radius_meters = int(radius_km * 1000)
    building_radius = min(radius_meters, 500)

    # Clean, targeted Overpass query for real roads, water bodies, buildings, and POIs
    query = f"""
    [out:json][timeout:25];
    (
      way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link"](around:{radius_meters},{lat},{lon});
      way["natural"="water"](around:{radius_meters},{lat},{lon});
      way["waterway"](around:{radius_meters},{lat},{lon});
      way["natural"="coastline"](around:{radius_meters},{lat},{lon});
      way["building"](around:{building_radius},{lat},{lon});
      node["amenity"~"hospital|school|police|bus_station"](around:{radius_meters},{lat},{lon});
      node["railway"="station"](around:{radius_meters},{lat},{lon});
    );
    out body;
    >;
    out skel qt;
    """

    last_error = None
    for server in OVERPASS_SERVERS:
        try:
            logger.info(f"Querying live OpenStreetMap Overpass: {server} for ({lat}, {lon})")
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(server, data={"data": query}, headers=OVERPASS_HEADERS)
                if resp.status_code == 200:
                    raw_json = resp.json()
                    area = parse_overpass_response(raw_json, lat, lon, radius_km, location_name)
                    if area.roads:
                        # Cache to memory
                        AREA_CACHE[cache_key] = area
                        # Cache to disk
                        try:
                            with open(disk_file, "w", encoding="utf-8") as f:
                                json.dump(area.model_dump(), f)
                        except Exception as ce:
                            logger.warning(f"Could not persist cache to disk: {ce}")
                        logger.info(f"Successfully retrieved real OSM data: {len(area.roads)} roads, {len(area.buildings)} buildings, {len(area.water)} water features")
                        return area
                    else:
                        logger.warning(f"Server {server} returned 0 roads within {radius_km}km")
                else:
                    logger.warning(f"Overpass server {server} returned status {resp.status_code}")
                    last_error = f"Server returned HTTP {resp.status_code}"
        except Exception as exc:
            logger.warning(f"Overpass request to {server} failed: {exc}")
            last_error = str(exc)

    # If all Overpass servers fail: DO NOT SILENTLY RETURN MOCK DATA!
    # Explicitly fail so user is informed and can import a map or retry
    raise RuntimeError(
        f"REAL DATA UNAVAILABLE: OpenStreetMap servers could not be reached ({last_error}). "
        "Please check your internet connection or use the [IMPORT MAP] option to upload a geospatial file."
    )

def parse_overpass_response(
    data: Dict[str, Any],
    center_lat: float,
    center_lon: float,
    radius_km: float,
    name: str
) -> GeoArea:
    nodes: Dict[int, Tuple[float, float]] = {}
    for elem in data.get("elements", []):
        if elem.get("type") == "node" and "lat" in elem and "lon" in elem:
            nodes[elem["id"]] = (float(elem["lat"]), float(elem["lon"]))

    roads: List[RoadSegment] = []
    buildings: List[Building] = []
    water: List[WaterFeature] = []
    pois: List[POI] = []

    min_lat, max_lat = center_lat, center_lat
    min_lon, max_lon = center_lon, center_lon

    def update_bounds(lat_v: float, lon_v: float):
        nonlocal min_lat, max_lat, min_lon, max_lon
        min_lat = min(min_lat, lat_v)
        max_lat = max(max_lat, lat_v)
        min_lon = min(min_lon, lon_v)
        max_lon = max(max_lon, lon_v)

    for elem in data.get("elements", []):
        tags = elem.get("tags", {})
        elem_type = elem.get("type")

        # 1. POIs
        if elem_type == "node" and tags:
            poi_type = None
            if tags.get("railway") == "station":
                poi_type = "station"
            elif "amenity" in tags:
                poi_type = tags["amenity"]

            if poi_type and "name" in tags:
                pt_lat, pt_lon = float(elem["lat"]), float(elem["lon"])
                update_bounds(pt_lat, pt_lon)
                pois.append(POI(
                    id=f"osm-node-{elem['id']}",
                    name=tags["name"],
                    type=poi_type,
                    coordinate=(pt_lat, pt_lon),
                    source="OPENSTREETMAP",
                ))

        # 2. Ways
        if elem_type == "way":
            way_nodes = [nodes[nid] for nid in elem.get("nodes", []) if nid in nodes]
            if len(way_nodes) < 2:
                continue

            for (lat_pt, lon_pt) in way_nodes:
                update_bounds(lat_pt, lon_pt)

            # Roads
            if "highway" in tags:
                hw = tags["highway"]
                lanes_val = None
                if "lanes" in tags:
                    try:
                        lanes_val = int(tags["lanes"])
                    except Exception:
                        lanes_val = None

                width = (lanes_val * 3.5) if lanes_val else DEFAULT_ROAD_WIDTHS.get(hw, 6.0)
                roads.append(RoadSegment(
                    id=f"osm-way-{elem['id']}",
                    name=tags.get("name", "Unnamed Road"),
                    highwayType=hw,
                    geometry=way_nodes,
                    lanes=lanes_val,
                    estimatedWidth=width,
                    oneWay=tags.get("oneway") in ["yes", "1", "true"],
                    surface=tags.get("surface"),
                    maxSpeed=tags.get("maxspeed"),
                    bridge=tags.get("bridge") == "yes",
                    tunnel=tags.get("tunnel") == "yes",
                    source="OPENSTREETMAP",
                ))

            # Buildings
            elif "building" in tags and len(way_nodes) >= 3:
                h = 8.0
                levels = None
                if "height" in tags:
                    try:
                        h = float(tags["height"].replace("m", "").strip())
                    except Exception:
                        pass
                elif "building:levels" in tags:
                    try:
                        levels = int(tags["building:levels"])
                        h = levels * 3.2
                    except Exception:
                        pass

                buildings.append(Building(
                    id=f"osm-bldg-{elem['id']}",
                    geometry=way_nodes,
                    height=h if "height" in tags else None,
                    estimatedHeight=h,
                    type=tags.get("building", "yes"),
                    levels=levels,
                    source="OPENSTREETMAP",
                ))

            # Water Bodies & Coastlines
            elif ("natural" in tags and tags["natural"] in ["water", "coastline"]) or "waterway" in tags:
                wtype = tags.get("waterway") or tags.get("natural") or "water"
                water.append(WaterFeature(
                    id=f"osm-water-{elem['id']}",
                    name=tags.get("name"),
                    geometry=way_nodes,
                    type=wtype,
                    source="OPENSTREETMAP",
                ))

    bounding_box = BoundingBox(
        min_lat=min_lat,
        max_lat=max_lat,
        min_lon=min_lon,
        max_lon=max_lon,
    )

    return GeoArea(
        locationName=name or f"Corridor ({center_lat:.4f}, {center_lon:.4f})",
        center=(center_lat, center_lon),
        radiusKm=radius_km,
        boundingBox=bounding_box,
        planningExtent=bounding_box,
        boundaryType="MUNICIPALITY",
        dataSource="OPENSTREETMAP",
        coordinateReferenceSystem="EPSG:4326",
        roads=roads,
        buildings=buildings,
        water=water,
        pois=pois,
        metadata={
            "osmElementCount": len(data.get("elements", [])),
            "roadsCount": len(roads),
            "buildingsCount": len(buildings),
            "waterCount": len(water),
            "poisCount": len(pois),
        }
    )
