import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const error = new Error("Authorization header missing or invalid");
    error.status = 401;
    return next(error);
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    const error = new Error("Token missing");
    error.status = 401;
    return next(error);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.id) {
      const error = new Error("Invalid token payload");
      error.status = 401;
      return next(error);
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.error({
      message: "Token verification error",
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

export default authMiddleware;
