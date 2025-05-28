import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import validate, { schemas } from "../middleware/validate.js";
import logger from "../utils/logger.js";

export const register = [
  validate(schemas.register),

  async (req, res, next) => {
    const { username, email, password } = req.body;

    try {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        const error = new Error("Email already registered");
        error.status = 400;
        return next(error);
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
      logger.error({
        message: "Register error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];

export const login = [
  validate(schemas.login),

  async (req, res, next) => {
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
        const error = new Error("Invalid credentials");
        error.status = 400;
        return next(error);
      }

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res.json({
        token,
        user: { id: user.id, username: user.username, email },
      });
    } catch (error) {
      logger.error({
        message: "Login error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];

export const forgotPassword = [
  validate(schemas.forgotPassword),
  async (req, res) => {
    const { email } = req.body;

    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        const error = new Error("Email not registered");
        error.status = 400;
        return next(error);
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
      logger.error({
        message: "Forgot password error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];

export const resetPassword = [
  validate(schemas.resetPassword),
  async (req, res) => {
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
        const error = new Error("Invalid or expired token");
        error.status = 400;
        return next(error);
      }

      user.password = await bcrypt.hash(password, 10);
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      logger.error({
        message: "Reset password error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];

export const changePassword = [
  validate(schemas.changePassword),

  async (req, res) => {
    const { currentPassword, newPassword } = req.body;

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

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        const error = new Error("Current password is incorrect");
        error.status = 400;
        return next(error);
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      user.password = hashedNewPassword;
      user.updatedBy = req.user.id;
      await user.save();

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      logger.error({
        message: "Change password error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];
