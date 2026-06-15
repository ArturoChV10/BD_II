import json
import math
import os
from pathlib import Path
from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017")
MONGO_DB = os.getenv("MONGO_DB", "restaurantes_olap")
OUTPUT_PATH = Path("/opt/airflow/data/routes/rutas_asignadas.json")
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

DRIVERS = ["REP-01", "REP-02"]


def distance_km(a, b):
    return math.sqrt((a["lat"] - b["lat"]) ** 2 + (a["lng"] - b["lng"]) ** 2) * 111


def nearest_neighbor(start, stops):
    route = []
    current = start
    pending = stops[:]
    total = 0
    while pending:
        next_stop = min(pending, key=lambda stop: distance_km(current, stop))
        total += distance_km(current, next_stop)
        route.append(next_stop)
        current = next_stop
        pending.remove(next_stop)
    return route, round(total, 2)


def main():
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]

    users = {u["user_id"]: u for u in db.users.find({}, {"_id": 0})}
    restaurants = {r["restaurant_id"]: r for r in db.restaurants.find({}, {"_id": 0})}
    completed_orders = list(db.orders.find({"status": "completed"}, {"_id": 0}))

    assignments = []
    for index, order in enumerate(completed_orders):
        restaurant = restaurants[order["restaurant_id"]]
        client_location = users[order["user_id"]]
        driver = DRIVERS[index % len(DRIVERS)]
        route, total_distance = nearest_neighbor(restaurant, [client_location])
        assignments.append({
            "driver": driver,
            "order_id": order["order_id"],
            "origin": restaurant["name"],
            "stops": [stop["name"] for stop in route],
            "estimated_distance_km": total_distance
        })

    OUTPUT_PATH.write_text(json.dumps(assignments, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Rutas asignadas en {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
