import { DataTypes } from "sequelize";

export async function up(queryInterface) {
  await queryInterface.createTable("Services", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
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
      onUpdate: "CASCADE",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.bulkInsert("Services", [
    {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Microwave Service",
      description: "Provides Microwave service for events",
      price: 236,
      nextService: "6 months",
      createdBy: null, // Assuming no specific vendor created this
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440002",
      name: "Air Conditioner Service",
      description: "Provides Air Conditioner service for events",
      price: 236,
      nextService: "6 months",
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440003",
      name: "R.O Water Purifier Service",
      description: "Provides R.O Water Purifier service for events",
      price: 236,
      nextService: "6 months",
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440004",
      name: "Double Door Fridge Service",
      description: "Provides Double Door Fridge service for events",
      price: 236,
      nextService: "6 months",
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440005",
      name: "Washing Machine Service",
      description: "Provides Washing Machine service for events",
      price: 236,
      nextService: "6 months",
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("Services");
}
