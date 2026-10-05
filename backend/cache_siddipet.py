import httpx
import json
from osm_service import parse_overpass_response, CACHE_DIR

query = """[out:json][timeout:25];
(
  way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential"](around:1200,18.1018,78.8520);
  way["natural"="water"](around:1200,18.1018,78.8520);
  way["waterway"](around:1200,18.1018,78.8520);
  way["building"](around:400,18.1018,78.8520);
);
out body;
>;
out skel qt;"""

headers = {
    'User-Agent': 'RoadVision/1.0 (civil-engineering-digital-twin; contact@roadvision.local)',
    'Accept': 'application/json'
}

for endpoint in ['https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter']:
    try:
        print(f"Trying {endpoint}...")
        res = httpx.post(endpoint, data={'data': query}, headers=headers, timeout=25.0)
        if res.status_code == 200:
            data = res.json()
            area_15 = parse_overpass_response(data, 18.1018, 78.8520, 1.5, "Siddipet, Telangana")
            area_20 = parse_overpass_response(data, 18.1018, 78.8520, 2.0, "Siddipet, Telangana")
            with open(CACHE_DIR / "18.1018_78.8520_1.5.json", "w", encoding="utf-8") as f:
                json.dump(area_15.model_dump(), f)
            with open(CACHE_DIR / "18.1018_78.8520_2.0.json", "w", encoding="utf-8") as f:
                json.dump(area_20.model_dump(), f)
            print("SUCCESS: Siddipet cached to disk!")
            break
        else:
            print(f"Server returned {res.status_code}")
    except Exception as e:
        print(f"Error on {endpoint}: {e}")
