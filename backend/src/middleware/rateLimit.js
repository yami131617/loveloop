const rateLimit = require('express-rate-limit');

function perUser({ windowMs, max }) {
  return rateLimit({
    windowMs, max,
    standardHeaders: true, legacyHeaders: false,
    keyGenerator: (req) => req.userId ? `u:${req.userId}` : `ip:${req.ip}`,
    message: { error: 'Too many requests', code: 'RATE_LIMITED' }
  });
}

module.exports = { perUser };
