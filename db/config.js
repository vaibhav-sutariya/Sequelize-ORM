import Sequelize from "sequelize";
import logger from "../utils/logger.js";

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false,
  }
);

const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info({ msg: "Database connection established successfully" });
    await sequelize.sync({ alert: true, force: true });
    // await sequelize.sync({});
    logger.info({ msg: "Database synced" });
  } catch (error) {
    logger.error({
      message: "Unable to connect to the database",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export { sequelize, initializeDatabase };
