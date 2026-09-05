import httpx

# 1. Test Overpass API for real Lucknow environmental infrastructure
overpass_url = "https://overpass-api.de/api/interpreter"
query = """
[out:json][timeout:25];
area["name"="Lucknow"]->.searchArea;
(
  node["amenity"="waste_disposal"](area.searchArea);
  node["amenity"="recycling"](area.searchArea);
  node["amenity"="waste_basket"](area.searchArea);
  node["waterway"="drain"](area.searchArea);
);
out body 20;
>;
out skel qt;
"""

try:
    res = httpx.post(overpass_url, data={"data": query}, timeout=30)
    data = res.json()
    elements = data.get("elements", [])
    print(f"Overpass OSM Lucknow real nodes found: {len(elements)}")
    for el in elements[:5]:
        print(f"OSM Node {el.get('id')}: {el.get('lat')}, {el.get('lon')} - {el.get('tags')}")
except Exception as e:
    print(f"Overpass error: {e}")

# 2. Test OpenAQ API for real CPCB Lucknow air monitoring stations
try:
    res = httpx.get("https://api.openaq.org/v2/locations?city=Lucknow&limit=10", timeout=20)
    data = res.json()
    results = data.get("results", [])
    print(f"OpenAQ Real CPCB Stations in Lucknow: {len(results)}")
    for r in results:
        print(f"Station: {r.get('name')} | Coords: {r.get('coordinates')} | Parameters: {[p.get('parameter') for p in r.get('parameters', [])]}")
except Exception as e:
    print(f"OpenAQ error: {e}")
