from datetime import datetime
from airflow import DAG
from airflow.operators.bash import BashOperator

with DAG(
    dag_id="restaurantes_olap_pipeline",
    start_date=datetime(2026, 1, 1),
    schedule_interval="@daily",
    catchup=False,
    tags=["bd2", "olap", "restaurantes"],
) as dag:

    etl_spark_dw = BashOperator(
        task_id="extract_mongo_transform_spark_load_dw",
        bash_command="python /opt/airflow/scripts/run_pipeline.py",
    )

    load_graph = BashOperator(
        task_id="load_neo4j_graph",
        bash_command="python /opt/airflow/scripts/load_neo4j.py",
    )

    assign_routes = BashOperator(
        task_id="assign_delivery_routes",
        bash_command="python /opt/airflow/scripts/assign_routes.py",
    )

    reindex_catalog = BashOperator(
        task_id="reindex_elasticsearch_catalog",
        bash_command="python /opt/airflow/scripts/reindex_elasticsearch.py",
    )

    etl_spark_dw >> [load_graph, assign_routes, reindex_catalog]
