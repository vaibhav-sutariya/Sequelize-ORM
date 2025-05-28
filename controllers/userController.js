import { body, validationResult } from "express-validator";
import User from "../models/userModel.js";
import validate, { schemas } from "../middleware/validate.js";
import logger from "../utils/logger.js";
export const getProfile = async (req, res) => {
  try {
    logger.debug({ msg: "Profile request", userId: req.user?.id });
    if (!req.user || !req.user.id) {
      const error = new Error("Unauthorized: Invalid user data");
      error.status = 401;
      return next(error);
    }

    const user = await User.findByPk(req.user.id, {
      attributes: [
        "id",
        "username",
        "email",
        "createdAt",
        "updatedAt",
        "createdBy",
        "updatedBy",
      ],
    });

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      return next(error);
    }
    logger.info({ msg: "Profile retrieved", userId: user.id });
    res.json({ user });
  } catch (error) {
    logger.error({
      message: "Get profile error",
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

export const updateProfile = [
  validate(schemas.updateProfile),
  async (req, res) => {
    const { username, email } = req.body;

    try {
      logger.debug({
        msg: "Update profile attempt",
        userId: req.user?.id,
        username,
        email,
      });

      if (!req.user || !req.user.id) {
        const error = new Error("Unauthorized: Invalid user data");
        error.status = 401;
        return next(error);
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        return next(error);
      }

      if (username && username !== user.username) {
        const existingUsername = await User.findOne({ where: { username } });
        if (existingUsername) {
          const error = new Error("Username already taken");
          error.status = 400;
          return next(error);
        }
        user.username = username;
      }

      if (email && email !== user.email) {
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
          const error = new Error("Email already in use");
          error.status = 400;
          return next(error);
        }
        user.email = email;
      }

      if (username || email) {
        user.updatedBy = req.user.id;
        await user.save();
      }
      logger.info({ msg: "Profile updated", userId: user.id });

      res.json({
        message: "Profile updated successfully",
        user: { id: user.id, username: user.username, email: user.email },
      });
    } catch (error) {
      logger.error({
        message: "Update profile error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];
