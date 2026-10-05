import httpx
import time

query = """[out:json][timeout:25];
(
  way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential"](around:1200,8.7379,76.7163);
  way["natural"="water"](around:1200,8.7379,76.7163);
  way["waterway"](around:1200,8.7379,76.7163);
  way["building"](around:400,8.7379,76.7163);
);
out body;
>;
out skel qt;"""

headers = {
    "User-Agent": "RoadVision/1.0 (civil-infrastructure-digital-twin; contact@roadvision.local)",
    "Accept": "application/json"
}

t0 = time.time()
endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

for url in endpoints:
    try:
        print(f"Trying {url}...")
        res = httpx.post(url, data={"data": query}, headers=headers, timeout=20.0)
        print(f"  Status: {res.status_code}, Elapsed: {round(time.time()-t0, 2)}s")
        if res.status_code == 200:
            data = res.json()
            ways = [e for e in data.get('elements', []) if e.get('type') == 'way']
            roads = [w for w in ways if 'highway' in w.get('tags', {})]
            buildings = [w for w in ways if 'building' in w.get('tags', {})]
            water = [w for w in ways if 'natural' in w.get('tags', {}) or 'waterway' in w.get('tags', {})]
            print(f"  SUCCESS! Total elements: {len(data.get('elements', []))}, Roads: {len(roads)}, Buildings: {len(buildings)}, Water: {len(water)}")
            break
    except Exception as e:
        print(f"  Failed: {e}")
