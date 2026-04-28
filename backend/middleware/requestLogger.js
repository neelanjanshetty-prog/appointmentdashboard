const logger = require("../utils/logger");

const getRequestId = (req) =>
  req.headers["x-request-id"] ||
  req.headers["x-correlation-id"] ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const requestId = getRequestId(req);

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const meta = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: req.ip,
      userAgent: req.get("user-agent")
    };

    if (res.statusCode >= 500) {
      logger.error("Request completed with server error", meta);
      return;
    }

    if (res.statusCode >= 400) {
      logger.warn("Request completed with client error", meta);
      return;
    }

    logger.info("Request completed", meta);
  });

  next();
};

module.exports = requestLogger;
