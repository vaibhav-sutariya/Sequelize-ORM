import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../models/userModel.js";

export const register = [
  body("username").notEmpty().withMessage("Username is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        username,
        email,
        password: hashedPassword,
        createdBy: user.id,
        updatedBy: user.id,
      });

      res
        .status(201)
        .json({ message: "User registered successfully, Now try login" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
];

export const login = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(400).json({
          message:
            "Email is not registered, Kindly register yourself for login!!",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid Paasword" });
      }

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res.json({
        token,
        user: { id: user.id, username: user.username, email },
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
];

export const forgotPassword = [
  body("email").isEmail().withMessage("Valid email is required"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = crypto
        .createHmac("sha256", process.env.RESET_TOKEN_SECRET)
        .update(resetToken)
        .digest("hex");

      user.resetPasswordToken = resetTokenHash;
      user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration
      await user.save();

      const resetUrl = `${process.env.APP_URL}/api/auth/reset-password/${resetToken}`;
      res.json({ message: "Password reset link generated", resetUrl });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
];

export const resetPassword = [
  body("token").notEmpty().withMessage("Token is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    try {
      const resetTokenHash = crypto
        .createHmac("sha256", process.env.RESET_TOKEN_SECRET)
        .update(token)
        .digest("hex");

      const user = await User.findOne({
        where: {
          resetPasswordToken: resetTokenHash,
          resetPasswordExpires: { [require("sequelize").Op.gt]: new Date() },
        },
      });

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      user.password = await bcrypt.hash(password, 10);
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
];

export const changePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

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

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      user.password = hashedNewPassword;
      user.updatedBy = req.user.id;
      await user.save();

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error.message);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
];
