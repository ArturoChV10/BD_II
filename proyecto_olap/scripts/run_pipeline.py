import json
import os
from datetime import datetime
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values
from pymongo import MongoClient
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, explode, to_timestamp, to_date, hour

RAW_DIR = Path("/opt/airflow/data/raw")
RAW_DIR.mkdir(parents=True, exist_ok=True)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017")
MONGO_DB = os.getenv("MONGO_DB", "restaurantes_olap")

DW_CONFIG = {
    "host": os.getenv("DW_HOST", "postgres-dw"),
    "port": int(os.getenv("DW_PORT", "5432")),
    "dbname": os.getenv("DW_DB", "dw_restaurantes"),
    "user": os.getenv("DW_USER", "dw_user"),
    "password": os.getenv("DW_PASSWORD", "dw_pass"),
}

COLLECTIONS = ["users", "products", "restaurants", "orders", "reservations"]


def dump_mongo_to_json() -> None:
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]

    for collection_name in COLLECTIONS:
        path = RAW_DIR / f"{collection_name}.json"
        with path.open("w", encoding="utf-8") as file:
            for doc in db[collection_name].find({}, {"_id": 0}):
                file.write(json.dumps(doc, ensure_ascii=False) + "\n")
        print(f"Extraído {collection_name} -> {path}")


def get_connection():
    return psycopg2.connect(**DW_CONFIG)


def reset_warehouse(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            TRUNCATE TABLE fact_orders, fact_reservations, dim_time, dim_user,
            dim_product, dim_restaurant, dim_status RESTART IDENTITY CASCADE;
        """)
    conn.commit()


def insert_many(conn, sql: str, rows: list[tuple]) -> None:
    if not rows:
        return
    with conn.cursor() as cur:
        execute_values(cur, sql, rows)
    conn.commit()


def date_dim_rows(dates: set[str]) -> list[tuple]:
    rows = []
    for date_text in sorted(dates):
        date_value = datetime.strptime(date_text, "%Y-%m-%d").date()
        rows.append((date_value, date_value.year, date_value.month, date_value.day, date_value.weekday() + 1))
    return rows


def transform_with_spark_and_load() -> None:
    spark = (
        SparkSession.builder
        .appName("BD2 Restaurantes OLAP")
        .master("local[*]")
        .getOrCreate()
    )

    users_df = spark.read.json(str(RAW_DIR / "users.json"))
    products_df = spark.read.json(str(RAW_DIR / "products.json"))
    restaurants_df = spark.read.json(str(RAW_DIR / "restaurants.json"))
    orders_df = spark.read.json(str(RAW_DIR / "orders.json"))
    reservations_df = spark.read.json(str(RAW_DIR / "reservations.json"))

    order_items_df = (
        orders_df
        .withColumn("item", explode(col("items")))
        .withColumn("created_ts", to_timestamp(col("created_at")))
        .select(
            col("order_id"),
            to_date(col("created_ts")).alias("date_key"),
            col("user_id"),
            col("restaurant_id"),
            col("item.product_id").alias("product_id"),
            col("status").alias("status_id"),
            hour(col("created_ts")).alias("order_hour"),
            col("item.quantity").cast("int").alias("quantity"),
            (col("item.quantity") * col("item.unit_price")).cast("double").alias("total_amount"),
        )
    )

    reservation_fact_df = (
        reservations_df
        .withColumn("reserved_ts", to_timestamp(col("reserved_at")))
        .select(
            col("reservation_id"),
            to_date(col("reserved_ts")).alias("date_key"),
            col("user_id"),
            col("restaurant_id"),
            col("status").alias("status_id"),
            hour(col("reserved_ts")).alias("reservation_hour"),
            col("people_count").cast("int").alias("people_count"),
        )
    )

    orders_df.createOrReplaceTempView("orders")
    products_df.createOrReplaceTempView("products")
    order_items_df.createOrReplaceTempView("order_items")

    tendencias_df = spark.sql("""
        SELECT p.category, COUNT(DISTINCT oi.order_id) AS pedidos, SUM(oi.total_amount) AS ingresos
        FROM order_items oi
        JOIN products p ON oi.product_id = p.product_id
        WHERE oi.status_id = 'completed'
        GROUP BY p.category
        ORDER BY ingresos DESC
    """)

    horarios_pico_df = spark.sql("""
        SELECT order_hour, COUNT(DISTINCT order_id) AS pedidos
        FROM order_items
        GROUP BY order_hour
        ORDER BY pedidos DESC
    """)

    crecimiento_df = spark.sql("""
        SELECT date_format(date_key, 'yyyy-MM') AS mes, COUNT(DISTINCT order_id) AS pedidos, SUM(total_amount) AS ingresos
        FROM order_items
        WHERE status_id = 'completed'
        GROUP BY date_format(date_key, 'yyyy-MM')
        ORDER BY mes
    """)

    tendencias_df.write.mode("overwrite").json("/opt/airflow/data/raw/analisis_tendencias_consumo")
    horarios_pico_df.write.mode("overwrite").json("/opt/airflow/data/raw/analisis_horarios_pico")
    crecimiento_df.write.mode("overwrite").json("/opt/airflow/data/raw/analisis_crecimiento_mensual")

    users = [
        (row["user_id"], row["name"], row["city"], row["zone"], row["lat"], row["lng"])
        for row in users_df.collect()
    ]
    products = [
        (row["product_id"], row["name"], row["category"], row["price"], row["active"])
        for row in products_df.collect()
    ]
    restaurants = [
        (row["restaurant_id"], row["name"], row["city"], row["zone"], row["lat"], row["lng"])
        for row in restaurants_df.collect()
    ]

    order_rows = [tuple(row) for row in order_items_df.collect()]
    reservation_rows = [tuple(row) for row in reservation_fact_df.collect()]

    dates = {str(row[1]) for row in order_rows} | {str(row[1]) for row in reservation_rows}
    statuses = sorted({row[5] for row in order_rows} | {row[4] for row in reservation_rows})

    conn = get_connection()
    try:
        reset_warehouse(conn)
        insert_many(conn, "INSERT INTO dim_time VALUES %s", date_dim_rows(dates))
        insert_many(conn, "INSERT INTO dim_status VALUES %s", [(s, s.capitalize()) for s in statuses])
        insert_many(conn, "INSERT INTO dim_user VALUES %s", users)
        insert_many(conn, "INSERT INTO dim_product VALUES %s", products)
        insert_many(conn, "INSERT INTO dim_restaurant VALUES %s", restaurants)
        insert_many(conn, "INSERT INTO fact_orders VALUES %s", order_rows)
        insert_many(conn, "INSERT INTO fact_reservations VALUES %s", reservation_rows)
    finally:
        conn.close()
        spark.stop()

    print("Pipeline OLAP completado: MongoDB -> Spark -> Data Warehouse")


if __name__ == "__main__":
    dump_mongo_to_json()
    transform_with_spark_and_load()
