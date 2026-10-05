import httpx
import json
import time
from osm_service import parse_overpass_response, CACHE_DIR

headers = {'User-Agent': 'RoadVision/1.0 (civil-engineering-digital-twin)', 'Accept': 'application/json'}
locations = [
    ('Varkala, Kerala', 8.7379, 76.7163),
    ('Nellore, Andhra Pradesh', 14.4426, 79.9865),
    ('Siddipet, Telangana', 18.1018, 78.8520)
]

for name, lat, lon in locations:
    print(f"Fetching authentic OSM data for {name} ({lat}, {lon})...")
    query = f"""[out:json][timeout:25];
    (
      way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential"](around:1200,{lat},{lon});
      way["natural"="water"](around:1200,{lat},{lon});
      way["waterway"](around:1200,{lat},{lon});
      way["natural"="coastline"](around:1200,{lat},{lon});
      way["building"](around:400,{lat},{lon});
    );
    out body;
    >;
    out skel qt;"""
    try:
        t0 = time.time()
        res = httpx.post('https://overpass-api.de/api/interpreter', data={'data': query}, headers=headers, timeout=30.0)
        print(f"  Overpass HTTP {res.status_code} in {round(time.time()-t0, 1)}s")
        if res.status_code == 200:
            raw = res.json()
            area_15 = parse_overpass_response(raw, lat, lon, 1.5, name)
            area_20 = parse_overpass_response(raw, lat, lon, 2.0, name)

            k1 = f"{round(lat, 4)}_{round(lon, 4)}_1.5"
            k2 = f"{round(lat, 4)}_{round(lon, 4)}_2.0"
            with open(CACHE_DIR / f"{k1}.json", "w", encoding="utf-8") as f:
                json.dump(area_15.model_dump(), f)
            with open(CACHE_DIR / f"{k2}.json", "w", encoding="utf-8") as f:
                json.dump(area_20.model_dump(), f)
            print(f"  SUCCESS! Cached {name}: {len(area_15.roads)} real roads, {len(area_15.buildings)} real buildings, {len(area_15.water)} water bodies.")
    except Exception as e:
        print(f"  Failed for {name}: {e}")
