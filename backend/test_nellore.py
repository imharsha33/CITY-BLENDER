import httpx
import time

# Nellore: lat=14.4426, lon=79.9865
query = """[out:json][timeout:25];
(
  way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential"](around:1200,14.4426,79.9865);
  way["natural"="water"](around:1200,14.4426,79.9865);
  way["waterway"](around:1200,14.4426,79.9865);
  way["building"](around:400,14.4426,79.9865);
);
out body;
>;
out skel qt;"""

headers = {
    "User-Agent": "RoadVision/1.0 (civil-infrastructure-digital-twin; contact@roadvision.local)",
    "Accept": "application/json"
}

t0 = time.time()
res = httpx.post("https://overpass-api.de/api/interpreter", data={"data": query}, headers=headers, timeout=25.0)
print(f"Status: {res.status_code}, Elapsed: {round(time.time()-t0, 2)}s")
if res.status_code == 200:
    data = res.json()
    ways = [e for e in data.get('elements', []) if e.get('type') == 'way']
    roads = [w for w in ways if 'highway' in w.get('tags', {})]
    buildings = [w for w in ways if 'building' in w.get('tags', {})]
    water = [w for w in ways if 'natural' in w.get('tags', {}) or 'waterway' in w.get('tags', {})]
    import json
    from osm_service import parse_overpass_response, CACHE_DIR
    area_15 = parse_overpass_response(data, 14.4426, 79.9865, 1.5, "Nellore, Andhra Pradesh")
    area_20 = parse_overpass_response(data, 14.4426, 79.9865, 2.0, "Nellore, Andhra Pradesh")
    with open(CACHE_DIR / "14.4426_79.9865_1.5.json", "w", encoding="utf-8") as f:
        json.dump(area_15.model_dump(), f)
    with open(CACHE_DIR / "14.4426_79.9865_2.0.json", "w", encoding="utf-8") as f:
        json.dump(area_20.model_dump(), f)
    print("SUCCESS: Nellore cached to disk!")
