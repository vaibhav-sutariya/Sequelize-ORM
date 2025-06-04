import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import { initializeDatabase } from "./db/config.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import vendorRoutes from "./routes/vendorRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";

const app = express();

// General rate limiter for all API routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: "Too many requests from this IP, please try again later.",
});

// Rate limiter for sensitive endpoints (login, forgot password)
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 requests per window
  message: "Too many attempts, please try again after 15 minutes.",
});

app.use(express.json());

// Apply general limiter to all API routes
app.use("/api", generalLimiter);

// Apply sensitive limiter to specific routes
app.use("/api/auth/login", sensitiveLimiter);
app.use("/api/vendors/forgot-password", sensitiveLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/services", serviceRoutes);

app.use(errorHandler);

const startServer = async () => {
  try {
    await initializeDatabase();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () =>
      logger.info({ msg: `Server running on port ${PORT}` })
    );
  } catch (error) {
    logger.error({
      message: "Failed to start server",
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

startServer();
