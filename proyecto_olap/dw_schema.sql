-- Nota:
-- Las vistas v_horarios_pico y v_actividad_clientes_zona usan las
-- tablas fuente orders, order_details, products, users y reservations.
-- Por eso conviene ejecutar generate_data.py antes de este archivo.

-- Limpieza de vistas OLAP
DROP VIEW IF EXISTS v_ingresos_mes_categoria CASCADE;
DROP VIEW IF EXISTS v_actividad_clientes_zona CASCADE;
DROP VIEW IF EXISTS v_pedidos_completados_vs_cancelados CASCADE;
DROP VIEW IF EXISTS v_horarios_pico CASCADE;
DROP VIEW IF EXISTS v_frecuencia_producto_cliente CASCADE;
DROP VIEW IF EXISTS v_crecimiento_mensual CASCADE;
DROP VIEW IF EXISTS v_tendencias_consumo CASCADE;

-- Limpieza de tablas del Data Warehouse
DROP TABLE IF EXISTS fact_reservations CASCADE;
DROP TABLE IF EXISTS fact_sales CASCADE;
DROP TABLE IF EXISTS dim_location CASCADE;
DROP TABLE IF EXISTS dim_user CASCADE;
DROP TABLE IF EXISTS dim_product CASCADE;
DROP TABLE IF EXISTS dim_date CASCADE;

-- DIMENSIONES

CREATE TABLE dim_date (
    date_id SERIAL PRIMARY KEY,
    full_date DATE UNIQUE NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    day INT NOT NULL,
    week_day VARCHAR(20)
);

CREATE TABLE dim_product (
    product_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    price NUMERIC(10,2)
);

CREATE TABLE dim_user (
    user_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(50)
);

CREATE TABLE dim_location (
    location_id INT PRIMARY KEY,
    city VARCHAR(50),
    lat FLOAT,
    lon FLOAT
);

-- TABLAS DE HECHOS

CREATE TABLE fact_sales (
    sale_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    date_id INT REFERENCES dim_date(date_id) ON DELETE CASCADE,
    product_id INT REFERENCES dim_product(product_id) ON DELETE CASCADE,
    user_id INT REFERENCES dim_user(user_id) ON DELETE CASCADE,
    location_id INT REFERENCES dim_location(location_id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    unit_price NUMERIC(10,2),
    total NUMERIC(12,2),
    status VARCHAR(20)
);

-- Esta tabla queda lista para consolidar reservas en el DW.
-- No rompe cargar_dw.py aunque todavía no la llene.
CREATE TABLE fact_reservations (
    reservation_fact_id SERIAL PRIMARY KEY,
    reservation_id INT,
    date_id INT REFERENCES dim_date(date_id) ON DELETE CASCADE,
    user_id INT REFERENCES dim_user(user_id) ON DELETE CASCADE,
    location_id INT REFERENCES dim_location(location_id) ON DELETE CASCADE,
    guests INT,
    reservation_status VARCHAR(20) DEFAULT 'active'
);

-- VISTAS OLAP

-- 1. Ingresos por mes y categoría de producto.
CREATE OR REPLACE VIEW v_ingresos_mes_categoria AS
SELECT
    d.year AS year_num,
    d.month AS month_num,
    p.category,
    SUM(fs.total) AS ingresos
FROM fact_sales fs
JOIN dim_date d ON fs.date_id = d.date_id
JOIN dim_product p ON fs.product_id = p.product_id
WHERE LOWER(fs.status) = 'completed'
GROUP BY d.year, d.month, p.category
ORDER BY d.year, d.month, p.category;

-- 2. Actividad de clientes por zona geográfica.
-- En los datos actuales no existe una columna "zone"; se usa la ciudad
-- como zona geográfica para mantener compatibilidad con Metabase.
CREATE OR REPLACE VIEW v_actividad_clientes_zona AS
WITH ventas AS (
    SELECT
        du.city,
        COUNT(DISTINCT fs.order_id) AS pedidos,
        SUM(CASE WHEN LOWER(fs.status) = 'completed' THEN fs.total ELSE 0 END) AS ingresos
    FROM dim_user du
    LEFT JOIN fact_sales fs ON du.user_id = fs.user_id
    GROUP BY du.city
),
reservas AS (
    SELECT
        u.city,
        COUNT(r.reservation_id) AS reservas
    FROM users u
    LEFT JOIN reservations r ON u.user_id = r.user_id
    GROUP BY u.city
)
SELECT
    COALESCE(v.city, r.city) AS city,
    COALESCE(v.city, r.city) AS zone,
    COALESCE(v.pedidos, 0) AS pedidos,
    COALESCE(r.reservas, 0) AS reservas,
    COALESCE(v.ingresos, 0) AS ingresos
FROM ventas v
FULL OUTER JOIN reservas r ON v.city = r.city
ORDER BY ingresos DESC, pedidos DESC, reservas DESC;

-- 3. Pedidos completados vs cancelados por mes.
CREATE OR REPLACE VIEW v_pedidos_completados_vs_cancelados AS
SELECT
    d.year AS year_num,
    d.month AS month_num,
    INITCAP(fs.status) AS status_name,
    COUNT(DISTINCT fs.order_id) AS total_pedidos
FROM fact_sales fs
JOIN dim_date d ON fs.date_id = d.date_id
GROUP BY d.year, d.month, INITCAP(fs.status)
ORDER BY d.year, d.month, status_name;

-- 4. Horarios pico.
-- Se calcula desde la tabla fuente orders porque fact_sales no guarda hora.
CREATE OR REPLACE VIEW v_horarios_pico AS
SELECT
    EXTRACT(HOUR FROM o.order_date)::INT AS order_hour,
    COUNT(DISTINCT o.order_id) AS total_pedidos,
    SUM(od.quantity * p.price) AS ingresos
FROM orders o
JOIN order_details od ON o.order_id = od.order_id
JOIN products p ON od.product_id = p.product_id
WHERE LOWER(o.status) = 'completed'
GROUP BY EXTRACT(HOUR FROM o.order_date)::INT
ORDER BY total_pedidos DESC, ingresos DESC;

-- 5. Frecuencia de producto por cliente.
CREATE OR REPLACE VIEW v_frecuencia_producto_cliente AS
SELECT
    du.name AS user_name,
    dp.name AS product_name,
    dp.category,
    COUNT(DISTINCT fs.order_id) AS veces_comprado,
    SUM(fs.quantity) AS unidades
FROM fact_sales fs
JOIN dim_user du ON fs.user_id = du.user_id
JOIN dim_product dp ON fs.product_id = dp.product_id
WHERE LOWER(fs.status) = 'completed'
GROUP BY du.name, dp.name, dp.category
ORDER BY veces_comprado DESC, unidades DESC;

-- 6. Crecimiento mensual.
CREATE OR REPLACE VIEW v_crecimiento_mensual AS
WITH mensual AS (
    SELECT
        d.year AS year_num,
        d.month AS month_num,
        COUNT(DISTINCT fs.order_id) AS pedidos,
        SUM(fs.total) AS ingresos
    FROM fact_sales fs
    JOIN dim_date d ON fs.date_id = d.date_id
    WHERE LOWER(fs.status) = 'completed'
    GROUP BY d.year, d.month
)
SELECT
    year_num,
    month_num,
    pedidos,
    ingresos,
    pedidos - LAG(pedidos) OVER (ORDER BY year_num, month_num) AS crecimiento_pedidos,
    ingresos - LAG(ingresos) OVER (ORDER BY year_num, month_num) AS crecimiento_ingresos
FROM mensual
ORDER BY year_num, month_num;

-- 7. Tendencias de consumo por categoría.
CREATE OR REPLACE VIEW v_tendencias_consumo AS
SELECT
    dp.category,
    COUNT(DISTINCT fs.order_id) AS pedidos,
    SUM(fs.quantity) AS unidades_vendidas,
    SUM(fs.total) AS ingresos
FROM fact_sales fs
JOIN dim_product dp ON fs.product_id = dp.product_id
WHERE LOWER(fs.status) = 'completed'
GROUP BY dp.category
ORDER BY ingresos DESC, unidades_vendidas DESC;
