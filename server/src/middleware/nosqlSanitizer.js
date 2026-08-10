/**
 * Middleware: NoSQL Injection Prevention
 * Strips keys containing Mongo operator characters ($ and .) from request inputs.
 */
function cleanObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      continue; // Strip malicious MongoDB query operators
    }
    cleaned[key] = (value && typeof value === 'object') ? cleanObject(value) : value;
  }
  return cleaned;
}

function nosqlSanitizer(req, res, next) {
  if (req.body) req.body = cleanObject(req.body);
  if (req.query) req.query = cleanObject(req.query);
  if (req.params) req.params = cleanObject(req.params);
  next();
}

module.exports = {
  nosqlSanitizer
};
