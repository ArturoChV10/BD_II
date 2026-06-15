import os
from elasticsearch import Elasticsearch
from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017")
MONGO_DB = os.getenv("MONGO_DB", "restaurantes_olap")
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200")

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
es = Elasticsearch(ELASTICSEARCH_URL)

INDEX_NAME = "products_catalog"


def main():
    if es.indices.exists(index=INDEX_NAME):
        es.indices.delete(index=INDEX_NAME)

    es.indices.create(
        index=INDEX_NAME,
        mappings={
            "properties": {
                "product_id": {"type": "keyword"},
                "name": {"type": "text"},
                "category": {"type": "keyword"},
                "price": {"type": "float"},
                "active": {"type": "boolean"},
            }
        },
    )

    for product in db.products.find({}, {"_id": 0}):
        es.index(index=INDEX_NAME, id=product["product_id"], document=product)

    es.indices.refresh(index=INDEX_NAME)
    print("Catálogo reindexado en Elasticsearch")


if __name__ == "__main__":
    main()
