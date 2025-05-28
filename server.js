import "dotenv/config";
import express from "express";
import { initializeDatabase } from "./db/config.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

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
