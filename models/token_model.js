import { DataTypes } from "sequelize";
import { sequelize } from "../db/config.js";
import Vendor from "./vendorModel.js";

const Token = sequelize.define(
  "Token",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    vendorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Vendors",
        key: "id",
      },
    },
    type: {
      type: DataTypes.ENUM(
        "reset_password",
        "business_details",
        "refresh_token",
        "reset_otp"
      ),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Token type is required" },
      },
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Token is required" },
      },
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: { msg: "Invalid expiration date" },
      },
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        fields: ["vendorId", "type"],
      },
      {
        fields: ["token"],
      },
    ],
  }
);

Token.belongsTo(Vendor, { foreignKey: "vendorId" });

export default Token;
