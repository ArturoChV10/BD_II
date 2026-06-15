-- Consultas usadas para dashboards en Metabase

-- Dashboard 1: Ingresos por mes y categoría de producto
SELECT 
    year_num || '-' || LPAD(month_num::text, 2, '0') AS periodo,
    category,
    ingresos
FROM v_ingresos_mes_categoria
ORDER BY year_num, month_num, category;


-- Dashboard 2: Actividad de clientes por zona geográfica
SELECT 
    city || ' - ' || zone AS zona,
    pedidos,
    reservas,
    ingresos
FROM v_actividad_clientes_zona
ORDER BY ingresos DESC;


-- Dashboard 3: Pedidos completados vs cancelados
SELECT 
    status_name,
    SUM(total_pedidos) AS total_pedidos
FROM v_pedidos_completados_vs_cancelados
GROUP BY status_name
ORDER BY total_pedidos DESC;


-- Extra 1: Horarios pico de pedidos
SELECT
    order_hour,
    total_pedidos,
    ingresos
FROM v_horarios_pico
ORDER BY total_pedidos DESC, ingresos DESC;


-- Extra 2: Crecimiento mensual
SELECT
    year_num || '-' || LPAD(month_num::text, 2, '0') AS periodo,
    pedidos,
    ingresos,
    crecimiento_pedidos,
    crecimiento_ingresos
FROM v_crecimiento_mensual
ORDER BY year_num, month_num;
