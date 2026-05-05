const searchService = require("../services/searchService");

const search = async (req, res) => {
  try {
    const { q, type, restaurantId, limit } = req.query;

    const validTypes = ["restaurant", "menu", "dish"];

    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        error: "El tipo de búsqueda no es válido"
      });
    }

    const response = await searchService.searchDocuments({
      q,
      type,
      restaurantId,
      limit: limit || 10
    });

    if (!response.available) {
      return res.status(503).json({
        error: "Elasticsearch no está disponible en este momento"
      });
    }

    res.json({
      message: "Resultados de búsqueda obtenidos correctamente",
      results: response.results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error interno del servidor"
    });
  }
};

const reindex = async (req, res) => {
  try {
    const result = await searchService.reindexAll();

    if (!result.available) {
      return res.status(503).json({
        error: "Elasticsearch no está disponible en este momento"
      });
    }

    res.json({
      message: "Índice de búsqueda actualizado correctamente",
      indexed: result.indexed
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error interno del servidor"
    });
  }
};

module.exports = {
  search,
  reindex
};
