const redis = require('redis');

let client = null;

const getClient = async () => {
  if (!client) {
    client = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await client.connect();
  }
  return client;
};

const get = async (key) => {
  const c = await getClient();
  const data = await c.get(key);
  return data ? JSON.parse(data) : null;
};

const set = async (key, value, ttlSeconds = 60) => {
  const c = await getClient();
  await c.setEx(key, ttlSeconds, JSON.stringify(value));
};

const del = async (keyPattern) => {
  const c = await getClient();
  const keys = await c.keys(keyPattern);
  if (keys.length) await c.del(keys);
};

module.exports = { get, set, del };