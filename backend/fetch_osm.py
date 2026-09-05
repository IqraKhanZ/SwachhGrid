import httpx

overpass_url = "https://overpass-api.de/api/interpreter"
query = """[out:json];
(
  node(26.70, 80.80, 27.00, 81.10)["amenity"="waste_disposal"];
  node(26.70, 80.80, 27.00, 81.10)["amenity"="recycling"];
  node(26.70, 80.80, 27.00, 81.10)["amenity"="waste_basket"];
  node(26.70, 80.80, 27.00, 81.10)["waterway"="drain"];
  node(26.70, 80.80, 27.00, 81.10)["landuse"="landfill"];
);
out 40;"""

try:
    res = httpx.post(overpass_url, data={"data": query}, timeout=30)
    data = res.json()
    elements = data.get("elements", [])
    print(f"OSM Raw Real Nodes Found in Lucknow: {len(elements)}")
    for e in elements[:8]:
        print(f"Node ID: {e['id']} | Coord: ({e['lat']}, {e['lon']}) | Tags: {e.get('tags')}")
except Exception as exc:
    print("Error:", exc)
