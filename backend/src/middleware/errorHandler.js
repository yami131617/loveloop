function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.statusCode || err.status || 500;
  const code = err.code || 'SERVER_ERROR';
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : (err.message || 'Error');
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: message, code });
}
module.exports = errorHandler;
