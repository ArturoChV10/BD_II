from haversine import haversine, Unit
from neo4j import GraphDatabase
import random

# Configuracion de conexion a Neo4j
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "test1234"

# Coordenadas del restaurante central (punto de partida)
# Usamos San Jose como centro de distribucion
RESTAURANTE_LAT = 9.9281
RESTAURANTE_LON = -84.0907

def obtener_pedidos_con_coordenadas():
    """Obtiene una lista de pedidos con las coordenadas del usuario."""
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session() as session:
        result = session.run("""
            MATCH (u:User)-[:MADE]->(o:Order)
            WHERE u.lat IS NOT NULL AND u.lon IS NOT NULL
            RETURN o.id AS order_id, u.lat AS lat, u.lon AS lon
        """)
        pedidos = [(record["order_id"], record["lat"], record["lon"]) for record in result]
    driver.close()
    return pedidos

def nearest_neighbor_ruta(pedidos, inicio_lat, inicio_lon):
    """
    Algoritmo del vecino mas cercano.
    pedidos: lista de tuplas (order_id, lat, lon)
    inicio: coordenadas (lat, lon) del punto de partida
    Retorna: lista de order_ids en orden de visita
    """
    if not pedidos:
        return []
    
    ruta = []
    no_visitados = pedidos.copy()
    punto_actual = (inicio_lat, inicio_lon)
    
    while no_visitados:
        # Buscar el pedido mas cercano al punto actual
        mas_cercano = min(no_visitados, key=lambda p: haversine(punto_actual, (p[1], p[2]), unit=Unit.KILOMETERS))
        ruta.append(mas_cercano[0])
        punto_actual = (mas_cercano[1], mas_cercano[2])
        no_visitados.remove(mas_cercano)
    
    return ruta

def mostrar_ruta_en_consola(ruta, pedidos_originales):
    """Muestra la ruta con detalles de orden y distancia entre paradas."""
    if not ruta:
        print("No hay ruta que mostrar.")
        return
    
    # Crear un diccionario para acceder rapido a coordenadas por order_id
    coords = {pid: (lat, lon) for pid, lat, lon in pedidos_originales}
    
    punto_anterior = (RESTAURANTE_LAT, RESTAURANTE_LON)
    distancia_total = 0.0
    
    print("=== RUTA OPTIMIZADA (Vecino mas cercano) ===\n")
    print(f"Salida desde restaurante ({RESTAURANTE_LAT}, {RESTAURANTE_LON})")
    
    for i, pid in enumerate(ruta, start=1):
        lat, lon = coords[pid]
        distancia_segmento = haversine(punto_anterior, (lat, lon), unit=Unit.KILOMETERS)
        distancia_total += distancia_segmento
        print(f"{i}. Entregar Order ID {pid} -> distancia desde punto anterior: {distancia_segmento:.2f} km")
        punto_anterior = (lat, lon)
    
    print(f"\nDistancia total recorrida: {distancia_total:.2f} km")
    print("Numero de entregas:", len(ruta))

if __name__ == "__main__":
    print("Conectando a Neo4j para obtener pedidos...")
    todos_los_pedidos = obtener_pedidos_con_coordenadas()
    
    if not todos_los_pedidos:
        print("No se encontraron pedidos con coordenadas de usuario.")
        print("Asegurate de que los nodos User tengan lat y lon.")
    else:
        print(f"Total de pedidos encontrados: {len(todos_los_pedidos)}")
        # Tomamos una muestra de hasta 10 pedidos para simular una ruta real
        # (puedes cambiar el numero o usar todos los pedidos, pero se demorara mas)
        muestra = random.sample(todos_los_pedidos, min(10, len(todos_los_pedidos)))
        print(f"Simulando ruta con {len(muestra)} pedidos (muestra aleatoria).")
        print("Muestra de pedidos:", [p[0] for p in muestra])
        
        ruta_optima = nearest_neighbor_ruta(muestra, RESTAURANTE_LAT, RESTAURANTE_LON)
        mostrar_ruta_en_consola(ruta_optima, muestra)