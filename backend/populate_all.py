import httpx
import json
import time
from pathlib import Path
from osm_service import parse_overpass_response, CACHE_DIR

headers = {
    'User-Agent': 'RoadVision/1.0 (civil-engineering-digital-twin; contact@roadvision.local)',
    'Accept': 'application/json'
}

locations = [
    ('Nellore, Andhra Pradesh', 14.4426, 79.9865),
    ('Siddipet, Telangana', 18.1018, 78.8520),
    ('Alappuzha, Kerala', 9.4981, 76.3388),
]

servers = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
]

for name, lat, lon in locations:
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
    for server in servers:
        try:
            print(f"Trying {server} for {name}...")
            res = httpx.post(server, data={'data': query}, headers=headers, timeout=30.0)
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
                print(f"SUCCESS for {name}! Cached {len(area_15.roads)} roads, {len(area_15.buildings)} bldgs, {len(area_15.water)} water.")
                break
            else:
                print(f"Server {server} HTTP {res.status_code}")
        except Exception as e:
            print(f"Failed on {server}: {e}")
        time.sleep(1)
