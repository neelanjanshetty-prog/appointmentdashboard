const logger = require("./logger");

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    logger.error("Async route handler failed", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      handler: fn.name || "anonymous",
      error
    });

    error.logged = true;
    next(error);
  }
};

module.exports = asyncHandler;
