import os
from pymongo import MongoClient
from neo4j import GraphDatabase

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017")
MONGO_DB = os.getenv("MONGO_DB", "restaurantes_olap")
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "restaurantes123")

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


def run(tx, query, **params):
    return tx.run(query, **params)


def main():
    users = list(db.users.find({}, {"_id": 0}))
    products = list(db.products.find({}, {"_id": 0}))
    orders = list(db.orders.find({}, {"_id": 0}))
    restaurants = list(db.restaurants.find({}, {"_id": 0}))

    with driver.session() as session:
        session.execute_write(run, "MATCH (n) DETACH DELETE n")
        session.execute_write(run, "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.user_id IS UNIQUE")
        session.execute_write(run, "CREATE CONSTRAINT product_id_unique IF NOT EXISTS FOR (p:Product) REQUIRE p.product_id IS UNIQUE")
        session.execute_write(run, "CREATE CONSTRAINT order_id_unique IF NOT EXISTS FOR (o:Order) REQUIRE o.order_id IS UNIQUE")
        session.execute_write(run, "CREATE CONSTRAINT restaurant_id_unique IF NOT EXISTS FOR (r:Restaurant) REQUIRE r.restaurant_id IS UNIQUE")

        for user in users:
            session.execute_write(run, """
                MERGE (u:User {user_id: $user_id})
                SET u.name = $name, u.city = $city, u.zone = $zone, u.lat = $lat, u.lng = $lng
            """, **user)

        for user in users:
            if user.get("referred_by"):
                session.execute_write(run, """
                    MATCH (a:User {user_id: $referred_by})
                    MATCH (b:User {user_id: $user_id})
                    MERGE (a)-[:RECOMMENDED]->(b)
                """, referred_by=user["referred_by"], user_id=user["user_id"])

        for product in products:
            session.execute_write(run, """
                MERGE (p:Product {product_id: $product_id})
                SET p.name = $name, p.category = $category, p.price = $price, p.active = $active
            """, **product)

        for restaurant in restaurants:
            session.execute_write(run, """
                MERGE (r:Restaurant {restaurant_id: $restaurant_id})
                SET r.name = $name, r.city = $city, r.zone = $zone, r.lat = $lat, r.lng = $lng
            """, **restaurant)

        for order in orders:
            session.execute_write(run, """
                MERGE (o:Order {order_id: $order_id})
                SET o.status = $status, o.created_at = $created_at
                WITH o
                MATCH (u:User {user_id: $user_id})
                MATCH (r:Restaurant {restaurant_id: $restaurant_id})
                MERGE (u)-[:PLACED]->(o)
                MERGE (o)-[:FROM_RESTAURANT]->(r)
            """, order_id=order["order_id"], status=order["status"], created_at=order["created_at"], user_id=order["user_id"], restaurant_id=order["restaurant_id"])

            for item in order["items"]:
                session.execute_write(run, """
                    MATCH (o:Order {order_id: $order_id})
                    MATCH (p:Product {product_id: $product_id})
                    MERGE (o)-[c:CONTAINS]->(p)
                    SET c.quantity = $quantity, c.unit_price = $unit_price
                """, order_id=order["order_id"], **item)

        route_edges = [
            ("R001", "U001", 8, 12), ("U001", "U002", 4, 7), ("U002", "U004", 5, 8),
            ("R002", "U004", 6, 10), ("U004", "U005", 12, 18), ("U005", "U003", 15, 22),
            ("R001", "U003", 21, 30), ("R002", "U002", 10, 14)
        ]
        for origin, dest, distance, minutes in route_edges:
            session.execute_write(run, """
                MATCH (a) WHERE a.user_id = $origin OR a.restaurant_id = $origin
                MATCH (b) WHERE b.user_id = $dest OR b.restaurant_id = $dest
                MERGE (a)-[:ROUTE_TO {distance_km: $distance, estimated_minutes: $minutes}]->(b)
            """, origin=origin, dest=dest, distance=distance, minutes=minutes)

    print("Grafo Neo4J cargado correctamente")


if __name__ == "__main__":
    main()
    driver.close()
