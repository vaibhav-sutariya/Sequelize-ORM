import Sequelize from "sequelize";

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
    console.log("Database connection established successfully");
    await sequelize.sync({ alter: true });
    console.log("Database synced");
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
