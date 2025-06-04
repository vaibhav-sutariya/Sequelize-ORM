import logger from "../utils/logger.js";
import Service from "../models/servicesModel.js";

export const listServices = async (req, res, next) => {
  try {
    logger.debug({ message: "List services attempt" });

    const services = await Service.findAll({
      attributes: ["id", "name", "description", "price", "nextService"],
    });

    res.json({
      message: "Services retrieved successfully",
      services,
    });
  } catch (error) {
    logger.error({
      message: "List services error",
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
};
