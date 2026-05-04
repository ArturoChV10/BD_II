const cache = require('../utils/cache');

const cacheMiddleware = (duration = 60) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    const cached = await cache.get(key);
    if (cached) {
      return res.json(cached);
    }
    res.sendResponse = res.json;
    res.json = (body) => {
      cache.set(key, body, duration);
      res.sendResponse(body);
    };
    next();
  };
};

module.exports = cacheMiddleware;