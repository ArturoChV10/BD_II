import psycopg2
import requests

# Configuración PostgreSQL (usando localhost porque estamos desde el host)
PG_HOST = "localhost"
PG_PORT = 5432
PG_DB = "restaurantes"
PG_USER = "admin"
PG_PASS = "admin123"

# Configuración Elasticsearch
ES_URL = "http://localhost:9200"

try:
    # Conectar a PostgreSQL
    conn = psycopg2.connect(
        host=PG_HOST,
        port=PG_PORT,
        dbname=PG_DB,
        user=PG_USER,
        password=PG_PASS
    )
    cur = conn.cursor()
    cur.execute("SELECT product_id, name, category, price FROM products")

    # Contar cuántos productos se van a indexar
    rows = cur.fetchall()
    print(f"Se encontraron {len(rows)} productos en PostgreSQL.")

    # Indexar cada producto en Elasticsearch
    for row in rows:
        doc = {
            "product_id": row[0],
            "name": row[1],
            "category": row[2],
            "price": float(row[3]) if row[3] else 0.0
        }
        # Usamos PUT con el ID del producto para que sea idempotente
        response = requests.put(f"{ES_URL}/productos/_doc/{row[0]}", json=doc)
        if response.status_code in (200, 201):
            print(f"Indexado producto {row[0]} - {row[1]}")
        else:
            print(f"Error al indexar producto {row[0]}: {response.status_code} - {response.text}")

    cur.close()
    conn.close()
    print("Carga completada.")

except Exception as e:
    print(f"Error: {e}")