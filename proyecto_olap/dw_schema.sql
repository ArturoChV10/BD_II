-- Dimensiones
CREATE TABLE dim_date (
    date_id SERIAL PRIMARY KEY,
    full_date DATE,
    year INT,
    month INT,
    day INT,
    week_day VARCHAR(10)
);

CREATE TABLE dim_product (
    product_id INT PRIMARY KEY,
    name VARCHAR(100),
    category VARCHAR(50),
    price NUMERIC
);

CREATE TABLE dim_user (
    user_id INT PRIMARY KEY,
    name VARCHAR(100),
    city VARCHAR(50)
);

CREATE TABLE dim_location (
    location_id SERIAL PRIMARY KEY,
    city VARCHAR(50),
    lat FLOAT,
    lon FLOAT
);

-- Hechos: ventas
CREATE TABLE fact_sales (
    sale_id SERIAL PRIMARY KEY,
    order_id INT,
    date_id INT REFERENCES dim_date(date_id),
    product_id INT REFERENCES dim_product(product_id),
    user_id INT REFERENCES dim_user(user_id),
    location_id INT REFERENCES dim_location(location_id),
    quantity INT,
    unit_price NUMERIC,
    total NUMERIC,
    status VARCHAR(20)  -- completed/cancelled
);