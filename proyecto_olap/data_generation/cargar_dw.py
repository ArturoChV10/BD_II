# cargar_dw.py
import psycopg2
from datetime import datetime, timedelta

# Conexión a la base de datos fuente (ya tiene datos)
conn_fuente = psycopg2.connect(
    host="localhost", port=5432,
    dbname="restaurantes", user="admin", password="admin123"
)
cur_fuente = conn_fuente.cursor()

# Conexión al DW (misma base por ahora)
conn_dw = psycopg2.connect(
    host="localhost", port=5432,
    dbname="restaurantes", user="admin", password="admin123"
)
cur_dw = conn_dw.cursor()

# 1. Llenar dim_date (fechas desde 2025-01-01 hasta 2025-06-30)
start_date = datetime(2025, 1, 1)
end_date = datetime(2025, 6, 30)

cur_dw.execute("DELETE FROM dim_date")  # limpiar primero
current_date = start_date
while current_date <= end_date:
    cur_dw.execute("""
        INSERT INTO dim_date (full_date, year, month, day, week_day)
        VALUES (%s, %s, %s, %s, %s)
    """, (
        current_date.date(),
        current_date.year,
        current_date.month,
        current_date.day,
        current_date.strftime("%A")
    ))
    current_date += timedelta(days=1)
conn_dw.commit()
print("dim_date cargada")

# 2. Llenar dim_product (desde productos fuente)
cur_dw.execute("DELETE FROM dim_product")
cur_fuente.execute("SELECT product_id, name, category, price FROM products")
for row in cur_fuente.fetchall():
    cur_dw.execute("INSERT INTO dim_product (product_id, name, category, price) VALUES (%s,%s,%s,%s)", row)
conn_dw.commit()
print("dim_product cargada")

# 3. Llenar dim_user
cur_dw.execute("DELETE FROM dim_user")
cur_fuente.execute("SELECT user_id, name, city FROM users")
for row in cur_fuente.fetchall():
    cur_dw.execute("INSERT INTO dim_user (user_id, name, city) VALUES (%s,%s,%s)", row)
conn_dw.commit()
print("dim_user cargada")

# 4. Llenar dim_location
cur_dw.execute("DELETE FROM dim_location")
cur_fuente.execute("SELECT location_id, city, lat, lon FROM locations")
for row in cur_fuente.fetchall():
    cur_dw.execute("INSERT INTO dim_location (location_id, city, lat, lon) VALUES (%s,%s,%s,%s)", row)
conn_dw.commit()
print("dim_location cargada")

# 5. Llenar fact_sales (unir orders + order_details + products)
cur_fuente.execute("""
    SELECT 
        o.order_id,
        o.order_date,
        od.product_id,
        o.user_id,
        u.city,
        od.quantity,
        p.price,
        o.status
    FROM orders o
    JOIN order_details od ON o.order_id = od.order_id
    JOIN products p ON od.product_id = p.product_id
    JOIN users u ON o.user_id = u.user_id
""")

cur_dw.execute("DELETE FROM fact_sales")
for row in cur_fuente.fetchall():
    order_id, order_date, product_id, user_id, city, quantity, price, status = row
    
    # Obtener date_id desde dim_date
    cur_dw.execute("SELECT date_id FROM dim_date WHERE full_date = %s", (order_date.date(),))
    date_id = cur_dw.fetchone()[0]
    
    # Obtener location_id desde dim_location (por ciudad)
    cur_dw.execute("SELECT location_id FROM dim_location WHERE city = %s", (city,))
    location_id = cur_dw.fetchone()[0]
    
    total = quantity * price
    
    cur_dw.execute("""
        INSERT INTO fact_sales (order_id, date_id, product_id, user_id, location_id, quantity, unit_price, total, status)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (order_id, date_id, product_id, user_id, location_id, quantity, price, total, status))

conn_dw.commit()
print("fact_sales cargada")

cur_fuente.close()
cur_dw.close()
conn_fuente.close()
conn_dw.close()
print("Data Warehouse cargado completamente")