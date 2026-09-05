"""
predictions.py — Community Hero Green  (MongoDB version)
Environmental hotspot prediction pipeline.
"""

import os
import requests
from database import issues_col, predictions_col
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

AREA_DATA = {
    "ward_1":  {"name": "City Centre",        "drainage_age_years": 8},
    "ward_2":  {"name": "North Zone",         "drainage_age_years": 5},
    "ward_3":  {"name": "South Zone",         "drainage_age_years": 3},
    "ward_4":  {"name": "East Zone",          "drainage_age_years": 7},
    "ward_5":  {"name": "West Zone",          "drainage_age_years": 4},
    "ward_6":  {"name": "Industrial Area",    "drainage_age_years": 10},
    "ward_7":  {"name": "Residential North",  "drainage_age_years": 2},
    "ward_8":  {"name": "Residential South",  "drainage_age_years": 6},
    "ward_9":  {"name": "Market District",    "drainage_age_years": 9},
    "ward_10": {"name": "Green Zone",         "drainage_age_years": 1},
}

ENV_CATS = [
    "Waste Accumulation", "Drainage Blockage", "Flood / Waterlogging Risk",
    "Water Leakage", "Illegal Waste Dumping", "Sewage Problem",
]


def _age_multiplier(ward_id: str) -> float:
    age = AREA_DATA.get(ward_id, {}).get("drainage_age_years", 4)
    return 1.0 if age <= 2 else 1.3 if age <= 5 else 1.6


def _historical(ward_id: str) -> dict:
    docs = list(issues_col().find({"location.ward": ward_id}))
    counts: dict = {}
    for d in docs:
        c = d.get("environmental_category", d.get("category", "Other"))
        counts[c] = counts.get(c, 0) + 1
    total = sum(counts.values()) or 1
    return {k: min(v / total, 1.0) for k, v in counts.items()}


def _weather_factors() -> dict:
    api_key = os.getenv("OPENWEATHER_API_KEY", "")
    lat     = os.getenv("CITY_LAT", "18.5204")
    lon     = os.getenv("CITY_LON", "73.8567")
    fac     = {c: 0.0 for c in ENV_CATS}
    if not api_key or api_key in ("YOUR_OPENWEATHER_API_KEY", "skip"):
        return fac
    try:
        url  = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={api_key}&units=metric"
        data = requests.get(url, timeout=10).json()
        heavy_rain = any(item.get("rain", {}).get("3h", 0) > 10 for item in data.get("list", [])[:56])
        storm      = any(item.get("weather", [{}])[0].get("id", 0) in range(200, 300) for item in data.get("list", [])[:56])
        heat_wave  = any(item.get("main", {}).get("temp", 20) > 38 for item in data.get("list", [])[:56])
        if heavy_rain or storm:
            fac["Drainage Blockage"] += 0.35
            fac["Flood / Waterlogging Risk"] += 0.40
            fac["Sewage Problem"] += 0.30
            fac["Water Leakage"] += 0.25
        if heat_wave:
            fac["Waste Accumulation"] += 0.25
            fac["Illegal Waste Dumping"] += 0.20
    except Exception:
        pass
    return fac


def run_environmental_prediction_pipeline():
    weather  = _weather_factors()
    base_lat = float(os.getenv("CITY_LAT", "18.5204"))
    base_lon = float(os.getenv("CITY_LON", "73.8567"))
    results  = []
    for ward_id, ward_data in AREA_DATA.items():
        hist = _historical(ward_id)
        mult = _age_multiplier(ward_id)
        for cat in ENV_CATS:
            hist_s  = hist.get(cat, 0.65)
            wf      = weather.get(cat, 0.0)
            final   = min((hist_s * 0.6 + wf * 0.4) * mult, 1.0)
            if final >= 0.60:
                doc = {
                    "location":          {"lat": base_lat + (hash(ward_id) % 100) * 0.001,
                                         "lng": base_lon + (hash(ward_id + cat) % 100) * 0.001,
                                         "address": ward_data["name"], "ward": ward_id},
                    "predictedCategory": cat,
                    "riskScore":         round(final, 3),
                    "predictedDate":     datetime.now(timezone.utc) + timedelta(days=7 if final >= 0.80 else 30),
                    "factors":           {"weatherFactor": round(wf, 3), "historicalScore": round(hist_s, 3),
                                         "infrastructureAgeFactor": mult},
                    "timeframe":         "7 days" if final >= 0.80 else "30 days",
                    "wardName":          ward_data["name"],
                    "createdAt":         datetime.now(timezone.utc),
                }
                predictions_col().insert_one(doc)
                results.append(doc)
    return results
