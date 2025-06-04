import { DataTypes } from "sequelize";
import { sequelize } from "../db/config.js";

const Service = sequelize.define(
  "Services",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Service name is required" },
      },
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: { msg: "Price must be a valid number" },
        min: 0.01, // Minimum price of 0.01
      },
    },
    nextService: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Vendors",
        key: "id",
      },
      onDelete: "SET NULL",
    },
  },

  {
    timestamps: true,
  }
);
export default Service;
