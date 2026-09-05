import httpx

headers = {"User-Agent": "CommunityHeroGreen/2.0 (student-project; mailto:admin@communityhero.green)"}

queries = [
    "solid waste Lucknow",
    "drainage Lucknow",
    "Gomti river Lucknow",
    "Kukrail Lucknow",
    "Daliganj Lucknow",
    "Kalyanpur Lucknow",
    "Gomti Nagar Lucknow",
    "Aliganj Lucknow",
    "Alambagh Lucknow",
    "Hazratganj Lucknow"
]

results = []
for q in queries:
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={q}&format=json&addressdetails=1&limit=2"
        res = httpx.get(url, headers=headers, timeout=10)
        items = res.json()
        for item in items:
            results.append({
                "osm_id": item.get("osm_id"),
                "display_name": item.get("display_name"),
                "lat": float(item.get("lat")),
                "lon": float(item.get("lon")),
                "type": item.get("type"),
                "category": item.get("class")
            })
    except Exception as e:
        print(f"Query {q} error: {e}")

print(f"Total authentic OpenStreetMap geographical records retrieved: {len(results)}")
for r in results[:5]:
    print(r)
