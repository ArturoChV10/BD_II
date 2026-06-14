# spark_analisis.py
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, count, month, hour, date_format, sum as spark_sum, lag, row_number
from pyspark.sql.window import Window

# Crear sesión Spark
spark = SparkSession.builder \
    .appName("AnalisisRestaurantes") \
    .config("spark.jars", "drivers/postgresql-42.7.3.jar") \
    .getOrCreate()

# Configuración de conexión a PostgreSQL
jdbc_url = "jdbc:postgresql://host.docker.internal:5432/restaurantes"
properties = {
    "user": "admin",
    "password": "admin123",
    "driver": "org.postgresql.Driver"
}

print("Conectando a PostgreSQL...")

# Leer tablas
orders = spark.read.jdbc(url=jdbc_url, table="orders", properties=properties)
details = spark.read.jdbc(url=jdbc_url, table="order_details", properties=properties)
products = spark.read.jdbc(url=jdbc_url, table="products", properties=properties)
users = spark.read.jdbc(url=jdbc_url, table="users", properties=properties)

print("Datos cargados en Spark")

# -------------------------------------------------------------------
# Análisis 1: Tendencias de consumo (producto más popular por mes)
# -------------------------------------------------------------------
print("\n" + "="*50)
print("ANÁLISIS 1: Producto más popular por mes")
print("="*50)

# Unir tablas
joined = orders.join(details, "order_id") \
    .join(products, "product_id") \
    .filter(col("status") == "completed") \
    .withColumn("mes", month(col("order_date")))

# Contar ventas por mes y producto
ventas_por_mes = joined.groupBy("mes", "product_id", "name") \
    .agg(count("*").alias("total_ventas"))

# Obtener el producto más vendido por mes
windowSpec = Window.partitionBy("mes").orderBy(col("total_ventas").desc())
top_producto_por_mes = ventas_por_mes.withColumn("rank", row_number().over(windowSpec)) \
    .filter(col("rank") == 1) \
    .select("mes", "name", "total_ventas") \
    .orderBy("mes")

top_producto_por_mes.show()

# -------------------------------------------------------------------
# Análisis 2: Horarios pico (hora del día con más pedidos)
# -------------------------------------------------------------------
print("\n" + "="*50)
print("ANÁLISIS 2: Horarios pico")
print("="*50)

pedidos_por_hora = orders.withColumn("hora", hour(col("order_date"))) \
    .groupBy("hora") \
    .agg(count("*").alias("cantidad_pedidos")) \
    .orderBy(col("cantidad_pedidos").desc())

pedidos_por_hora.show(24)  # Mostrar las 24 horas

# -------------------------------------------------------------------
# Análisis 3: Crecimiento mensual (% de cambio en pedidos)
# -------------------------------------------------------------------
print("\n" + "="*50)
print("ANÁLISIS 3: Crecimiento mensual")
print("="*50)

pedidos_por_mes = orders.withColumn("mes", month(col("order_date"))) \
    .groupBy("mes") \
    .agg(count("*").alias("total_pedidos")) \
    .orderBy("mes")

# Calcular porcentaje de crecimiento respecto al mes anterior
windowOrder = Window.orderBy("mes")
crecimiento = pedidos_por_mes.withColumn("mes_anterior", lag("total_pedidos").over(windowOrder)) \
    .withColumn("porcentaje_crecimiento", 
                (col("total_pedidos") - col("mes_anterior")) / col("mes_anterior") * 100) \
    .fillna(0)  # Para el primer mes

crecimiento.show()

# -------------------------------------------------------------------
# Guardar resultados en CSV (para visualización después)
# -------------------------------------------------------------------
print("\nGuardando resultados...")

# Crear carpeta de resultados
import os
os.makedirs("resultados_spark", exist_ok=True)

top_producto_por_mes.write.csv("resultados_spark/top_producto_mes", header=True, mode="overwrite")
pedidos_por_hora.write.csv("resultados_spark/horarios_pico", header=True, mode="overwrite")
crecimiento.write.csv("resultados_spark/crecimiento_mensual", header=True, mode="overwrite")

print("Resultados guardados en carpeta 'resultados_spark'")
print("\nAnálisis completado exitosamente")

spark.stop()