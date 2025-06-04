import { Sequelize } from "sequelize";
import Vendor from "./vendorModel.js";
import Token from "./token_model.js";
import Service from "./serviceModel.js";

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

const models = {
  Vendor,
  Token,
  Service,
};

Object.values(models).forEach((model) => {
  if (model.associate) {
    model.associate(models);
  }
});

export { sequelize };
export default models;
