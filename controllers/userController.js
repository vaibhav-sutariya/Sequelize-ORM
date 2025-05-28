import { body, validationResult } from "express-validator";
import User from "../models/userModel.js";
export const getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      const error = new Error("Unauthorized: Invalid user data");
      error.status = 401;
      return next(error);
    }

    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "username", "email", "createdAt", "updatedAt"],
    });

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      return next(error);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = [
  body("username")
    .optional()
    .notEmpty()
    .withMessage("Username cannot be empty"),
  body("email").optional().isEmail().withMessage("Valid email is required"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email } = req.body;

    try {
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

      res.json({
        message: "Profile updated successfully",
        user: { id: user.id, username: user.username, email: user.email },
      });
    } catch (error) {
      next(error);
    }
  },
];
