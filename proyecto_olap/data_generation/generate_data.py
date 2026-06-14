# generate_data.py
import psycopg2
import random
from datetime import datetime, timedelta
import uuid

# Conexión a PostgreSQL (fuente)
conn = psycopg2.connect(
    host="localhost", port=5432,
    dbname="restaurantes", user="admin", password="admin123"
)
cur = conn.cursor()

# Crear tablas
cur.execute("""
DROP TABLE IF EXISTS orders, order_details, products, users, reservations, locations CASCADE;
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    city VARCHAR(50),
    lat FLOAT, lon FLOAT
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
    status VARCHAR(20)  -- 'completed', 'cancelled'
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
    lat FLOAT, lon FLOAT
);
""")

# Insertar productos
categories = ['Entrada', 'Plato Principal', 'Postre', 'Bebida']
products = []
for i in range(30):
    name = f"Producto_{i}"
    cat = random.choice(categories)
    price = round(random.uniform(5, 50), 2)
    cur.execute("INSERT INTO products (name, category, price) VALUES (%s, %s, %s) RETURNING product_id",
                (name, cat, price))
    pid = cur.fetchone()[0]
    products.append(pid)

# Insertar usuarios (100) con ubicaciones realistas (San José, Alajuela, Cartago)
cities = [("San José", 9.9281, -84.0907), ("Alajuela", 10.016, -84.216), ("Cartago", 9.864, -83.919)]
for i in range(100):
    name = f"Usuario_{i}"
    email = f"user{i}@example.com"
    city, lat, lon = random.choice(cities)
    lat += random.uniform(-0.05, 0.05)
    lon += random.uniform(-0.05, 0.05)
    cur.execute("INSERT INTO users (name, email, city, lat, lon) VALUES (%s,%s,%s,%s,%s)",
                (name, email, city, lat, lon))

# Insertar órdenes y detalles (2000 órdenes)
start_date = datetime(2025, 1, 1)
end_date = datetime(2025, 6, 30)
order_ids = []
for _ in range(2000):
    user_id = random.randint(1, 100)
    order_date = start_date + timedelta(seconds=random.randint(0, int((end_date - start_date).total_seconds())))
    status = random.choices(['completed', 'cancelled'], weights=[0.85, 0.15])[0]
    cur.execute("INSERT INTO orders (user_id, order_date, status) VALUES (%s,%s,%s) RETURNING order_id",
                (user_id, order_date, status))
    oid = cur.fetchone()[0]
    order_ids.append(oid)
    # Detalles: entre 1 y 4 productos
    num_items = random.randint(1, 4)
    for _ in range(num_items):
        product_id = random.choice(products)
        qty = random.randint(1, 3)
        cur.execute("INSERT INTO order_details (order_id, product_id, quantity) VALUES (%s,%s,%s)",
                    (oid, product_id, qty))

# Insertar reservas (500)
for _ in range(500):
    user_id = random.randint(1, 100)
    res_date = start_date + timedelta(seconds=random.randint(0, int((end_date - start_date).total_seconds())))
    guests = random.randint(1, 8)
    cur.execute("INSERT INTO reservations (user_id, reservation_date, guests) VALUES (%s,%s,%s)",
                (user_id, res_date, guests))

# Insertar locations (para el mapa)
for city, lat, lon in cities:
    cur.execute("INSERT INTO locations (city, lat, lon) VALUES (%s,%s,%s)", (city, lat, lon))

conn.commit()
cur.close()
conn.close()
print("Datos generados correctamente")