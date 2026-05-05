const { Client } = require("@elastic/elasticsearch");

let client = null;

const getElasticClient = () => {
  if (process.env.ELASTICSEARCH_ENABLED === "false") {
    return null;
  }

  if (!client) {
    client = new Client({
      node: process.env.ELASTICSEARCH_URL || "http://localhost:9200"
    });
  }

  return client;
};

const isElasticAvailable = async () => {
  try {
    const elastic = getElasticClient();

    if (!elastic) {
      return false;
    }

    await elastic.ping();
    return true;
  } catch (error) {
    console.warn("Elasticsearch no está disponible:", error.message);
    return false;
  }
};

module.exports = {
  getElasticClient,
  isElasticAvailable
};
