import "dotenv/config";
import express from "express";
import sequelize from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use(errorHandler);

sequelize
  .sync({
    force: true,
  })
  .then(() => console.log("Database synced"))
  .catch((err) => console.error("Error syncing database:", err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
