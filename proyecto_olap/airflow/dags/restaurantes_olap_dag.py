from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
import json
import math
import os
import random
import subprocess
import sys

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator

PROJECT_DIR = Path("/opt/airflow/proyecto_olap")
SCHEMA_PATH = PROJECT_DIR / "dw_schema.sql"
ROUTES_OUTPUT = PROJECT_DIR / "resultados_rutas" / "rutas_asignadas.json"

PG_HOST = os.getenv("PG_HOST", "postgres")
PG_PORT = int(os.getenv("PG_PORT", "5432"))
PG_DB = os.getenv("PG_DB", "restaurantes")
PG_USER = os.getenv("PG_USER", "admin")
PG_PASS = os.getenv("PG_PASS", "admin123")

ES_URL = os.getenv("ES_URL", "http://elasticsearch:9200")
ES_INDEX = os.getenv("ES_INDEX", "productos")

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "test1234")

RESTAURANTE_LAT = 9.9281
RESTAURANTE_LON = -84.0907


def get_pg_connection():
    import psycopg2

    return psycopg2.connect(
        host=PG_HOST,
        port=PG_PORT,
        dbname=PG_DB,
        user=PG_USER,
        password=PG_PASS,
    )


def wait_for_postgres():
    import psycopg2

    for _ in range(30):
        try:
            conn = get_pg_connection()
            conn.close()
            print("PostgreSQL disponible")
            return
        except psycopg2.OperationalError as exc:
            print(f"PostgreSQL aun no esta listo: {exc}")
            import time
            time.sleep(5)
    raise RuntimeError("PostgreSQL no respondio despues de varios intentos")


def generate_operational_data():
    """Genera las tablas fuente del sistema operacional en PostgreSQL."""
    random.seed(42)
    conn = get_pg_connection()
    cur = conn.cursor()

    cur.execute("""
    DROP TABLE IF EXISTS order_details CASCADE;
    DROP TABLE IF EXISTS orders CASCADE;
    DROP TABLE IF EXISTS products CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS reservations CASCADE;
    DROP TABLE IF EXISTS locations CASCADE;

    CREATE TABLE users (
        user_id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100),
        city VARCHAR(50),
        lat FLOAT,
        lon FLOAT
    );

    CREATE TABLE products (
        product_id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        category VARCHAR(50),
        price NUMERIC(10,2)
    );

    CREATE TABLE orders (
        order_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id),
        order_date TIMESTAMP,
        status VARCHAR(20)
    );

    CREATE TABLE order_details (
        detail_id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(order_id),
        product_id INT REFERENCES products(product_id),
        quantity INT
    );

    CREATE TABLE reservations (
        reservation_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id),
        reservation_date TIMESTAMP,
        guests INT
    );

    CREATE TABLE locations (
        location_id SERIAL PRIMARY KEY,
        city VARCHAR(50),
        lat FLOAT,
        lon FLOAT
    );
    """)

    categories = ["Entrada", "Plato Principal", "Postre", "Bebida"]
    product_ids = []
    for i in range(30):
        cur.execute(
            "INSERT INTO products (name, category, price) VALUES (%s, %s, %s) RETURNING product_id",
            (f"Producto_{i}", random.choice(categories), round(random.uniform(5, 50), 2)),
        )
        product_ids.append(cur.fetchone()[0])

    cities = [
        ("San José", 9.9281, -84.0907),
        ("Alajuela", 10.0160, -84.2160),
        ("Cartago", 9.8640, -83.9190),
    ]

    for i in range(100):
        city, lat, lon = random.choice(cities)
        cur.execute(
            "INSERT INTO users (name, email, city, lat, lon) VALUES (%s, %s, %s, %s, %s)",
            (
                f"Usuario_{i}",
                f"user{i}@example.com",
                city,
                lat + random.uniform(-0.05, 0.05),
                lon + random.uniform(-0.05, 0.05),
            ),
        )

    start_date = datetime(2025, 1, 1)
    end_date = datetime(2025, 6, 30)
    total_seconds = int((end_date - start_date).total_seconds())

    for _ in range(2000):
        user_id = random.randint(1, 100)
        order_date = start_date + timedelta(seconds=random.randint(0, total_seconds))
        status = random.choices(["completed", "cancelled"], weights=[0.85, 0.15])[0]
        cur.execute(
            "INSERT INTO orders (user_id, order_date, status) VALUES (%s, %s, %s) RETURNING order_id",
            (user_id, order_date, status),
        )
        order_id = cur.fetchone()[0]

        for _ in range(random.randint(1, 4)):
            cur.execute(
                "INSERT INTO order_details (order_id, product_id, quantity) VALUES (%s, %s, %s)",
                (order_id, random.choice(product_ids), random.randint(1, 3)),
            )

    for _ in range(500):
        user_id = random.randint(1, 100)
        reservation_date = start_date + timedelta(seconds=random.randint(0, total_seconds))
        cur.execute(
            "INSERT INTO reservations (user_id, reservation_date, guests) VALUES (%s, %s, %s)",
            (user_id, reservation_date, random.randint(1, 8)),
        )

    for city, lat, lon in cities:
        cur.execute(
            "INSERT INTO locations (city, lat, lon) VALUES (%s, %s, %s)",
            (city, lat, lon),
        )

    conn.commit()
    cur.close()
    conn.close()
    print("Datos operacionales generados correctamente")


def create_dw_schema():
    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(f"No se encontro el schema: {SCHEMA_PATH}")

    conn = get_pg_connection()
    cur = conn.cursor()
    cur.execute(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.commit()
    cur.close()
    conn.close()
    print("Data Warehouse y vistas OLAP creadas correctamente")


def load_data_warehouse():
    """Carga dimensiones y hechos del DW desde las tablas fuente."""
    conn = get_pg_connection()
    cur = conn.cursor()

    start_date = datetime(2025, 1, 1)
    end_date = datetime(2025, 6, 30)

    cur.execute("DELETE FROM fact_reservations")
    cur.execute("DELETE FROM fact_sales")
    cur.execute("DELETE FROM dim_date")
    cur.execute("DELETE FROM dim_product")
    cur.execute("DELETE FROM dim_user")
    cur.execute("DELETE FROM dim_location")

    current_date = start_date
    while current_date <= end_date:
        cur.execute(
            """
            INSERT INTO dim_date (full_date, year, month, day, week_day)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                current_date.date(),
                current_date.year,
                current_date.month,
                current_date.day,
                current_date.strftime("%A"),
            ),
        )
        current_date += timedelta(days=1)

    cur.execute(
        "INSERT INTO dim_product (product_id, name, category, price) SELECT product_id, name, category, price FROM products"
    )
    cur.execute(
        "INSERT INTO dim_user (user_id, name, city) SELECT user_id, name, city FROM users"
    )
    cur.execute(
        "INSERT INTO dim_location (location_id, city, lat, lon) SELECT location_id, city, lat, lon FROM locations"
    )

    cur.execute("""
        INSERT INTO fact_sales (
            order_id, date_id, product_id, user_id, location_id,
            quantity, unit_price, total, status
        )
        SELECT
            o.order_id,
            dd.date_id,
            od.product_id,
            o.user_id,
            dl.location_id,
            od.quantity,
            p.price,
            od.quantity * p.price AS total,
            o.status
        FROM orders o
        JOIN order_details od ON o.order_id = od.order_id
        JOIN products p ON od.product_id = p.product_id
        JOIN users u ON o.user_id = u.user_id
        JOIN dim_date dd ON dd.full_date = o.order_date::date
        JOIN dim_location dl ON dl.city = u.city
    """)

    cur.execute("""
        INSERT INTO fact_reservations (
            reservation_id, date_id, user_id, location_id, guests, reservation_status
        )
        SELECT
            r.reservation_id,
            dd.date_id,
            r.user_id,
            dl.location_id,
            r.guests,
            'active'
        FROM reservations r
        JOIN users u ON r.user_id = u.user_id
        JOIN dim_date dd ON dd.full_date = r.reservation_date::date
        JOIN dim_location dl ON dl.city = u.city
    """)

    conn.commit()
    cur.execute("SELECT COUNT(*) FROM fact_sales")
    sales_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM fact_reservations")
    reservations_count = cur.fetchone()[0]
    cur.close()
    conn.close()
    print(f"DW cargado. fact_sales={sales_count}, fact_reservations={reservations_count}")


def run_spark_analysis():
    """
    Ejecuta el script de Spark del proyecto.
    Nota: este script debe tener acceso a PySpark/Java dentro del contenedor de Airflow.
    """
    script_path = PROJECT_DIR / "spark_analisis.py"
    if not script_path.exists():
        raise FileNotFoundError(f"No se encontro {script_path}")

    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    subprocess.run([sys.executable, str(script_path)], cwd=str(PROJECT_DIR), check=True, env=env)


def load_neo4j_graph():
    from neo4j import GraphDatabase

    conn = get_pg_connection()
    cur = conn.cursor()

    cur.execute("SELECT user_id, name, email, city, lat, lon FROM users")
    users = cur.fetchall()

    cur.execute("SELECT product_id, name, category, price FROM products")
    products = cur.fetchall()

    cur.execute("SELECT order_id, user_id, order_date, status FROM orders")
    orders = cur.fetchall()

    cur.execute("SELECT order_id, product_id, quantity FROM order_details")
    details = cur.fetchall()

    cur.close()
    conn.close()

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")

        for user_id, name, email, city, lat, lon in users:
            session.run(
                """
                MERGE (u:User {id: $id})
                SET u.name = $name, u.email = $email, u.city = $city, u.lat = $lat, u.lon = $lon
                """,
                id=str(user_id), name=name, email=email, city=city, lat=float(lat), lon=float(lon),
            )

        for product_id, name, category, price in products:
            session.run(
                """
                MERGE (p:Product {id: $id})
                SET p.name = $name, p.category = $category, p.price = $price
                """,
                id=str(product_id), name=name, category=category, price=float(price),
            )

        for order_id, user_id, order_date, status in orders:
            session.run(
                """
                MATCH (u:User {id: $user_id})
                MERGE (o:Order {id: $order_id})
                SET o.order_date = $order_date, o.status = $status
                MERGE (u)-[:MADE]->(o)
                """,
                user_id=str(user_id),
                order_id=str(order_id),
                order_date=str(order_date),
                status=status,
            )

        for order_id, product_id, quantity in details:
            session.run(
                """
                MATCH (o:Order {id: $order_id})
                MATCH (p:Product {id: $product_id})
                MERGE (o)-[r:CONTAINS]->(p)
                SET r.quantity = $quantity
                """,
                order_id=str(order_id), product_id=str(product_id), quantity=int(quantity),
            )

        # Relaciones de recomendacion simuladas para el analisis de usuarios influyentes.
        session.run("""
            MATCH (u1:User), (u2:User)
            WHERE toInteger(u1.id) < toInteger(u2.id)
              AND toInteger(u1.id) <= 10
              AND toInteger(u2.id) <= 15
              AND rand() < 0.35
            MERGE (u1)-[:RECOMMENDED]->(u2)
        """)

        # Geonodos y rutas simples para consultas de caminos.
        session.run("""
            MERGE (r:Location {name: 'Restaurante Central', lat: 9.9281, lon: -84.0907})
            WITH r
            MATCH (u:User)
            WHERE u.lat IS NOT NULL AND u.lon IS NOT NULL AND toInteger(u.id) <= 10
            MERGE (r)-[rel:ROUTE_TO]->(u)
            SET rel.distance_km = round(point.distance(
                    point({latitude: r.lat, longitude: r.lon}),
                    point({latitude: u.lat, longitude: u.lon})
                ) / 1000.0 * 100) / 100,
                rel.estimated_minutes = toInteger(round(point.distance(
                    point({latitude: r.lat, longitude: r.lon}),
                    point({latitude: u.lat, longitude: u.lon})
                ) / 1000.0 / 35.0 * 60))
        """)

    driver.close()
    print("Grafo cargado en Neo4J correctamente")


def reindex_elasticsearch_catalog():
    import requests

    conn = get_pg_connection()
    cur = conn.cursor()
    cur.execute("SELECT product_id, name, category, price FROM products")
    products = cur.fetchall()
    cur.close()
    conn.close()

    requests.delete(f"{ES_URL}/{ES_INDEX}", timeout=20)
    requests.put(f"{ES_URL}/{ES_INDEX}", timeout=20)

    for product_id, name, category, price in products:
        doc = {
            "product_id": product_id,
            "name": name,
            "category": category,
            "price": float(price) if price is not None else 0.0,
        }
        response = requests.put(f"{ES_URL}/{ES_INDEX}/_doc/{product_id}", json=doc, timeout=20)
        response.raise_for_status()

    print(f"Catalogo reindexado en Elasticsearch. Indice: {ES_INDEX}. Productos: {len(products)}")


def haversine_km(a_lat, a_lon, b_lat, b_lon):
    radius_km = 6371.0
    d_lat = math.radians(b_lat - a_lat)
    d_lon = math.radians(b_lon - a_lon)
    lat1 = math.radians(a_lat)
    lat2 = math.radians(b_lat)
    h = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
    return 2 * radius_km * math.asin(math.sqrt(h))


def assign_delivery_routes():
    from neo4j import GraphDatabase

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session() as session:
        result = session.run("""
            MATCH (u:User)-[:MADE]->(o:Order)
            WHERE u.lat IS NOT NULL AND u.lon IS NOT NULL AND o.status = 'completed'
            RETURN o.id AS order_id, u.name AS user_name, u.lat AS lat, u.lon AS lon
            LIMIT 25
        """)
        pedidos = [dict(record) for record in result]
    driver.close()

    no_visitados = pedidos.copy()
    ruta = []
    actual_lat, actual_lon = RESTAURANTE_LAT, RESTAURANTE_LON
    distancia_total = 0.0

    while no_visitados:
        cercano = min(
            no_visitados,
            key=lambda p: haversine_km(actual_lat, actual_lon, float(p["lat"]), float(p["lon"])),
        )
        distancia = haversine_km(actual_lat, actual_lon, float(cercano["lat"]), float(cercano["lon"]))
        distancia_total += distancia
        ruta.append({
            "order_id": cercano["order_id"],
            "cliente": cercano["user_name"],
            "lat": float(cercano["lat"]),
            "lon": float(cercano["lon"]),
            "distancia_segmento_km": round(distancia, 2),
        })
        actual_lat, actual_lon = float(cercano["lat"]), float(cercano["lon"])
        no_visitados.remove(cercano)

    ROUTES_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "driver": "REP-01",
        "origin": "Restaurante Central",
        "heuristica": "vecino mas cercano",
        "total_entregas": len(ruta),
        "estimated_distance_km": round(distancia_total, 2),
        "stops": ruta,
    }
    ROUTES_OUTPUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Rutas asignadas en {ROUTES_OUTPUT}")


with DAG(
    dag_id="restaurantes_olap_pipeline",
    description="Pipeline OLAP de restaurantes: datos, DW, Spark, Neo4J, rutas y Elasticsearch.",
    start_date=datetime(2026, 1, 1),
    schedule="@daily",
    catchup=False,
    tags=["bd2", "olap", "restaurantes"],
) as dag:

    instalar_dependencias = BashOperator(
        task_id="instalar_dependencias",
        bash_command=(
            f"{sys.executable} -m pip install --user --no-cache-dir "
            "psycopg2-binary requests neo4j haversine"
        ),
    )

    esperar_postgres = PythonOperator(
        task_id="esperar_postgres",
        python_callable=wait_for_postgres,
    )

    generar_datos = PythonOperator(
        task_id="generar_datos_operacionales",
        python_callable=generate_operational_data,
    )

    crear_dw = PythonOperator(
        task_id="crear_data_warehouse_y_vistas",
        python_callable=create_dw_schema,
    )

    cargar_dw = PythonOperator(
        task_id="cargar_data_warehouse",
        python_callable=load_data_warehouse,
    )

    analisis_spark = PythonOperator(
        task_id="ejecutar_analisis_spark",
        python_callable=run_spark_analysis,
    )

    cargar_grafo = PythonOperator(
        task_id="cargar_grafo_neo4j",
        python_callable=load_neo4j_graph,
    )

    asignar_rutas = PythonOperator(
        task_id="asignar_rutas_entrega",
        python_callable=assign_delivery_routes,
    )

    reindexar_catalogo = PythonOperator(
        task_id="reindexar_catalogo_elasticsearch",
        python_callable=reindex_elasticsearch_catalog,
    )

    instalar_dependencias >> esperar_postgres >> generar_datos >> crear_dw >> cargar_dw
    cargar_dw >> analisis_spark
    cargar_dw >> cargar_grafo >> asignar_rutas
    cargar_dw >> reindexar_catalogo
