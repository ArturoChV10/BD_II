const { getElasticClient, isElasticAvailable } = require("../config/elasticsearchClient");
const { restaurantDao, menuDao, dishDao } = require("../daos/factory");

const SEARCH_INDEX = process.env.ELASTICSEARCH_INDEX || "restaurant_search";

const ensureSearchIndex = async () => {
  const elastic = getElasticClient();

  const exists = await elastic.indices.exists({
    index: SEARCH_INDEX
  });

  if (exists) {
    return;
  }

  await elastic.indices.create({
    index: SEARCH_INDEX,
    mappings: {
      properties: {
        type: { type: "keyword" },
        entity_id: { type: "integer" },
        name: { type: "text" },
        description: { type: "text" },
        restaurant_id: { type: "integer" },
        restaurant_name: { type: "text" },
        menu_id: { type: "integer" },
        price: { type: "float" },
        created_at: { type: "date", ignore_malformed: true },
        updated_at: { type: "date", ignore_malformed: true },
        indexed_at: { type: "date" }
      }
    }
  });
};

const buildDocumentId = (type, id) => {
  return `${type}-${id}`;
};

const indexDocument = async (document) => {
  const available = await isElasticAvailable();

  if (!available) {
    return null;
  }

  const elastic = getElasticClient();
  await ensureSearchIndex();

  const documentToSave = {
    ...document,
    indexed_at: new Date().toISOString()
  };

  await elastic.index({
    index: SEARCH_INDEX,
    id: buildDocumentId(document.type, document.entity_id),
    document: documentToSave,
    refresh: true
  });

  return documentToSave;
};

const deleteDocument = async (type, id) => {
  const available = await isElasticAvailable();

  if (!available) {
    return false;
  }

  const elastic = getElasticClient();

  try {
    await elastic.delete({
      index: SEARCH_INDEX,
      id: buildDocumentId(type, id),
      refresh: true
    });

    return true;
  } catch (error) {
    if (error.meta && error.meta.statusCode === 404) {
      return false;
    }

    throw error;
  }
};

const searchDocuments = async ({ q, type, restaurantId, limit = 10 }) => {
  const available = await isElasticAvailable();

  if (!available) {
    return {
      available: false,
      results: []
    };
  }

  const elastic = getElasticClient();
  await ensureSearchIndex();

  const must = [];
  const filter = [];

  if (q) {
    must.push({
      multi_match: {
        query: q,
        fields: [
          "name^3",
          "description^2",
          "restaurant_name"
        ],
        fuzziness: "AUTO"
      }
    });
  } else {
    must.push({
      match_all: {}
    });
  }

  if (type) {
    filter.push({
      term: {
        type
      }
    });
  }

  if (restaurantId) {
    filter.push({
      term: {
        restaurant_id: Number(restaurantId)
      }
    });
  }

  const response = await elastic.search({
    index: SEARCH_INDEX,
    size: Number(limit),
    query: {
      bool: {
        must,
        filter
      }
    }
  });

  const results = response.hits.hits.map((hit) => ({
    score: hit._score,
    ...hit._source
  }));

  return {
    available: true,
    results
  };
};

const reindexAll = async () => {
  const available = await isElasticAvailable();

  if (!available) {
    return {
      available: false,
      indexed: 0
    };
  }

  const elastic = getElasticClient();
  await ensureSearchIndex();

  const documents = [];

  const restaurants = await restaurantDao.getAllRestaurants();

  for (const restaurant of restaurants) {
    documents.push({
      type: "restaurant",
      entity_id: Number(restaurant.id),
      name: restaurant.name,
      description: null,
      restaurant_id: Number(restaurant.id),
      restaurant_name: restaurant.name,
      menu_id: null,
      price: null,
      created_at: restaurant.created_at || null,
      updated_at: restaurant.updated_at || null
    });
  }

  const menus = await menuDao.getAllMenus();

  for (const menu of menus) {
    documents.push({
      type: "menu",
      entity_id: Number(menu.id),
      name: menu.name,
      description: menu.description || null,
      restaurant_id: Number(menu.restaurant_id),
      restaurant_name: menu.restaurant_name || null,
      menu_id: Number(menu.id),
      price: null,
      created_at: menu.created_at || null,
      updated_at: menu.updated_at || null
    });

    const dishes = await dishDao.getDishesByMenuId(menu.id);

    for (const dish of dishes) {
      documents.push({
        type: "dish",
        entity_id: Number(dish.id),
        name: dish.name,
        description: dish.description || null,
        restaurant_id: Number(dish.restaurant_id || menu.restaurant_id),
        restaurant_name: menu.restaurant_name || null,
        menu_id: Number(dish.menu_id || menu.id),
        price: Number(dish.price),
        created_at: dish.created_at || null,
        updated_at: dish.updated_at || null
      });
    }
  }

  if (documents.length === 0) {
    return {
      available: true,
      indexed: 0
    };
  }

  const operations = documents.flatMap((document) => [
    {
      index: {
        _index: SEARCH_INDEX,
        _id: buildDocumentId(document.type, document.entity_id)
      }
    },
    {
      ...document,
      indexed_at: new Date().toISOString()
    }
  ]);

  await elastic.bulk({
    refresh: true,
    operations
  });

  return {
    available: true,
    indexed: documents.length
  };
};

module.exports = {
  indexDocument,
  deleteDocument,
  searchDocuments,
  reindexAll
};
