import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
  logger.error({
    message: "Error occurred",
    error: err.message,
    status: err.status || 500,
    stack: err.stack,
    path: req.path,
  });

  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors || [],
  });
};

export default errorHandler;
