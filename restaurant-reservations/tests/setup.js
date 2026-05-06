process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.RESTAURANT_SETUP_KEY = process.env.RESTAURANT_SETUP_KEY || "clave-setup";
process.env.ELASTICSEARCH_ENABLED = process.env.ELASTICSEARCH_ENABLED || "false";

jest.mock("../src/utils/cache", () => require("./mocks/cache"));
jest.mock("../src/daos/factory", () => require("./mocks/daos"));
jest.mock("../src/services/searchService", () => require("./mocks/searchService"));

beforeEach(() => {
  jest.clearAllMocks();

  const cache = require("./mocks/cache");
  cache.get.mockResolvedValue(null);
  cache.set.mockResolvedValue(undefined);
  cache.del.mockResolvedValue(undefined);
});
