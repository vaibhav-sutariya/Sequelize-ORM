const { body, validationResult } = require("express-validator");
const User = require("../models/userModel");
exports.getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Invalid user data" });
    }

    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "username", "email", "createdAt", "updatedAt"],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Get profile error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateProfile = [
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
        return res
          .status(401)
          .json({ message: "Unauthorized: Invalid user data" });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (username && username !== user.username) {
        const existingUsername = await User.findOne({ where: { username } });
        if (existingUsername) {
          return res.status(400).json({ message: "Username already taken" });
        }
        user.username = username;
      }

      if (email && email !== user.email) {
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
          return res.status(400).json({ message: "Email already in use" });
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
      console.error("Update profile error:", error.message);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
];
