from airflow import DAG
from airflow.operators.dummy import DummyOperator
from datetime import datetime

with DAG(
    dag_id='proyecto_restaurantes_etl',
    start_date=datetime(2025, 6, 1),
    schedule_interval=None,
    catchup=False
) as dag:
    inicio = DummyOperator(task_id='inicio')
    fin = DummyOperator(task_id='fin')
    inicio >> fin