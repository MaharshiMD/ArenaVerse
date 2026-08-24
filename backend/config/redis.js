// Redis Cache Adapter Fallback Engine for High-Scale Enterprise Caching
const memoryCache = new Map();

const getCache = (key) => {
  return memoryCache.get(key) || null;
};

const setCache = (key, value, ttlSeconds = 60) => {
  memoryCache.set(key, value);
  setTimeout(() => memoryCache.delete(key), ttlSeconds * 1000);
};

module.exports = { getCache, setCache };
