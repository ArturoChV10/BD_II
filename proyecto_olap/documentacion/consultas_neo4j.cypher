// Consultas Cypher para Neo4J

// 1. Los 5 productos más comprados juntos
MATCH (o:Order)-[:CONTAINS]->(p1:Product),
      (o)-[:CONTAINS]->(p2:Product)
WHERE coalesce(p1.product_id, p1.name) < coalesce(p2.product_id, p2.name)
RETURN p1.name AS producto_1,
       p2.name AS producto_2,
       COUNT(*) AS veces_comprados_juntos
ORDER BY veces_comprados_juntos DESC
LIMIT 5;


// 2. Usuarios que recomiendan a otros
MATCH (u1:User)-[:RECOMMENDED]->(u2:User)
RETURN u1.name AS usuario_recomienda,
       u2.name AS usuario_recomendado
ORDER BY usuario_recomienda, usuario_recomendado;


// 3. Usuarios influyentes por recomendaciones y pedidos de recomendados
MATCH (u1:User)-[:RECOMMENDED]->(u2:User)-[:PLACED|MADE]->(o:Order)
RETURN u1.name AS usuario_influyente,
       COUNT(DISTINCT u2) AS usuarios_recomendados_activos,
       COUNT(DISTINCT o) AS pedidos_generados
ORDER BY pedidos_generados DESC, usuarios_recomendados_activos DESC;


// 4. Rutas disponibles con distancia y tiempo estimado
MATCH (a)-[r:ROUTE_TO]->(b)
RETURN a.name AS origen,
       b.name AS destino,
       r.distance_km AS distancia_km,
       r.estimated_minutes AS minutos
ORDER BY distancia_km ASC;


// 5. Camino mínimo entre restaurante y cliente
// Ajustar los nombres si en la carga del grafo se usan otros datos.
MATCH (a {name: "Sabores TEC"}), (b {name: "Kevin Rojas"})
MATCH p = shortestPath((a)-[:ROUTE_TO*..5]-(b))
RETURN p;


// 6. Caminos alternativos para reparto eficiente
MATCH path = (r:Restaurant)-[:ROUTE_TO*1..4]->(u:User)
RETURN r.name AS restaurante,
       u.name AS cliente,
       [n IN nodes(path) | n.name] AS ruta,
       reduce(total = 0, rel IN relationships(path) | total + coalesce(rel.distance_km, 0)) AS distancia_total_km,
       reduce(total = 0, rel IN relationships(path) | total + coalesce(rel.estimated_minutes, 0)) AS minutos_totales
ORDER BY minutos_totales ASC
LIMIT 10;
