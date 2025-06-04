import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Vendor from "../models/vendorModel.js";
import Token from "../models/token_model.js";
import Service from "../models/servicesModel.js";
import validate, { schemas } from "../middleware/validate.js";
import logger from "../utils/logger.js";
import { Op } from "sequelize";
import { sendOtpEmail } from "../utils/email.js";

export const registerVendor = [
  validate(schemas.register),
  async (req, res, next) => {
    const { firstName, lastName, email, phoneNumber, password } = req.body;

    try {
      logger.debug({ message: "Vendor registration attempt", email });

      const hashedPassword = await bcrypt.hash(password, 10);
      const businessDetailsToken = crypto.randomBytes(32).toString("hex");
      const businessDetailsTokenHash = crypto
        .createHmac("sha256", process.env.RESET_TOKEN_SECRET)
        .update(businessDetailsToken)
        .digest("hex");

      const vendor = await Vendor.create({
        firstName,
        lastName,
        email,
        phoneNumber,
        password: hashedPassword,
        services: [],
        createdBy: null,
        updatedBy: null,
      });

      await vendor.update({
        createdBy: vendor.id,
        updatedBy: vendor.id,
      });

      await Token.create({
        vendorId: vendor.id,
        type: "business_details",
        token: businessDetailsTokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      logger.info({ message: "Vendor registered", vendorId: vendor.id });

      res.status(201).json({
        message: "Vendor registered successfully. Please add business details.",
        businessDetailsToken,
        vendor: { id: vendor.id, firstName, lastName, email, phoneNumber },
      });
    } catch (error) {
      logger.error({
        message: "Vendor registration error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];

export const updateBusinessDetails = [
  validate(schemas.vendor.updateBusiness),
  async (req, res, next) => {
    const {
      businessDetailsToken,
      businessName,
      businessAddress,
      state,
      city,
      postalCode,
      gstNumber,
      notes,
    } = req.body;

    try {
      logger.debug({ message: "Update business details attempt" });

      const businessDetailsTokenHash = crypto
        .createHmac("sha256", process.env.RESET_TOKEN_SECRET)
        .update(businessDetailsToken)
        .digest("hex");

      const token = await Token.findOne({
        where: {
          type: "business_details",
          token: businessDetailsTokenHash,
          expiresAt: { [Op.gt]: new Date() },
        },
        include: [{ model: Vendor }],
      });

      if (!token || !token.Vendor) {
        const error = new Error("Invalid or expired business details token");
        error.status = 400;
        return next(error);
      }

      const vendor = token.Vendor;

      await vendor.update({
        businessName,
        businessAddress,
        state,
        city,
        postalCode,
        gstNumber,
        notes,
        updatedBy: vendor.id,
      });

      logger.info({ message: "Business details updated", vendorId: vendor.id });

      res.json({
        message:
          "Business details updated successfully. Please select services.",
        businessDetailsToken,
        vendor: {
          id: vendor.id,
          firstName: vendor.firstName,
          lastName: vendor.lastName,
          email: vendor.email,
          phoneNumber: vendor.phoneNumber,
          businessName,
          businessAddress,
          state,
          city,
          postalCode,
          gstNumber,
          notes,
          services: [],
        },
      });
    } catch (error) {
      logger.error({
        message: "Update business details error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];

export const selectVendorServices = [
  validate(schemas.vendor.selectServices),
  async (req, res, next) => {
    const { businessDetailsToken, serviceIds } = req.body;

    try {
      logger.debug({ message: "Select vendor services attempt" });

      const businessDetailsTokenHash = crypto
        .createHmac("sha256", process.env.RESET_TOKEN_SECRET)
        .update(businessDetailsToken)
        .digest("hex");

      const token = await Token.findOne({
        where: {
          type: "business_details",
          token: businessDetailsTokenHash,
          expiresAt: { [Op.gt]: new Date() },
        },
        include: [{ model: Vendor }],
      });

      if (!token || !token.Vendor) {
        const error = new Error("Invalid or expired business details token");
        error.status = 400;
        return next(error);
      }

      const vendor = token.Vendor;

      const services = await Service.findAll({
        where: { id: { [Op.in]: serviceIds } },
      });

      if (services.length !== serviceIds.length) {
        const error = new Error("One or more service IDs are invalid");
        error.status = 400;
        return next(error);
      }

      await vendor.update({
        services: serviceIds,
        updatedBy: vendor.id,
      });

      await token.destroy();

      logger.info({ message: "Vendor services selected", vendorId: vendor.id });

      res.json({
        message: "Services selected successfully. Please log in.",
        vendor: {
          id: vendor.id,
          firstName: vendor.firstName,
          lastName: vendor.lastName,
          email: vendor.email,
          phoneNumber: vendor.phoneNumber,
          businessName: vendor.businessName,
          businessAddress: vendor.businessAddress,
          state: vendor.state,
          city: vendor.city,
          postalCode: vendor.postalCode,
          gstNumber: vendor.gstNumber,
          notes: vendor.notes,
          services: services.map((service) => ({
            id: service.id,
            name: service.name,
            description: service.description,
          })),
        },
      });
    } catch (error) {
      logger.error({
        message: "Select vendor services error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];

export const addVendorService = [
  validate(schemas.vendor.addService),
  async (req, res, next) => {
    const { name, description } = req.body;

    try {
      logger.debug({ message: "Add vendor service attempt", name });

      if (!req.vendor || !req.vendor.id) {
        const error = new Error("Unauthorized: Invalid vendor data");
        error.status = 401;
        return next(error);
      }

      const vendor = await Vendor.findByPk(req.vendor.id);
      if (!vendor) {
        const error = new Error("Vendor not found");
        error.status = 404;
        return next(error);
      }

      let service = await Service.findOne({ where: { name } });
      if (service) {
        const error = new Error("Service already exists");
        error.status = 400;
        return next(error);
      }

      service = await Service.create({
        name,
        description,
      });

      const currentServices = vendor.services || [];
      if (!currentServices.includes(service.id)) {
        currentServices.push(service.id);
        await vendor.update({
          services: currentServices,
          updatedBy: vendor.id,
        });
      }

      logger.info({
        message: "Service added and associated",
        vendorId: vendor.id,
        serviceId: service.id,
      });

      res.status(201).json({
        message: "Service added successfully",
        service: {
          id: service.id,
          name: service.name,
          description: service.description,
        },
      });
    } catch (error) {
      logger.error({
        message: "Add vendor service error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];

export const loginVendor = [
  validate(schemas.login),
  async (req, res, next) => {
    const { email, password } = req.body;

    try {
      logger.debug({ message: "Vendor login attempt", email });

      const vendor = await Vendor.findOne({ where: { email } });
      if (!vendor) {
        const error = new Error("Invalid credentials");
        error.status = 400;
        return next(error);
      }

      const isMatch = await bcrypt.compare(password, vendor.password);
      if (!isMatch) {
        const error = new Error("Invalid credentials");
        error.status = 400;
        return next(error);
      }

      const accessToken = jwt.sign({ id: vendor.id }, process.env.JWT_SECRET, {
        expiresIn: "15m",
      });

      const refreshToken = crypto.randomBytes(32).toString("hex");
      const refreshTokenHash = crypto
        .createHmac("sha256", process.env.REFRESH_TOKEN_SECRET)
        .update(refreshToken)
        .digest("hex");

      await Token.create({
        vendorId: vendor.id,
        type: "refresh_token",
        token: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const services = vendor.services?.length
        ? await Service.findAll({
            where: { id: { [Op.in]: vendor.services } },
            attributes: ["id", "name", "description"],
          })
        : [];

      logger.info({ message: "Vendor logged in", vendorId: vendor.id });

      res.json({
        accessToken,
        refreshToken,
        vendor: {
          id: vendor.id,
          firstName: vendor.firstName,
          lastName: vendor.lastName,
          email: vendor.email,
          phoneNumber: vendor.phoneNumber,
          businessName: vendor.businessName,
          businessAddress: vendor.businessAddress,
          state: vendor.state,
          city: vendor.city,
          postalCode: vendor.postalCode,
          gstNumber: vendor.gstNumber,
          notes: vendor.notes,
          services: services.map((service) => ({
            id: service.id,
            name: service.name,
            description: service.description,
          })),
        },
      });
    } catch (error) {
      logger.error({
        message: "Vendor login error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];

export const refreshToken = [
  async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const error = new Error("Refresh token is required");
      error.status = 400;
      return next(error);
    }

    try {
      logger.debug({ message: "Refresh token attempt" });

      const refreshTokenHash = crypto
        .createHmac("sha256", process.env.REFRESH_TOKEN_SECRET)
        .update(refreshToken)
        .digest("hex");

      const token = await Token.findOne({
        where: {
          type: "refresh_token",
          token: refreshTokenHash,
          expiresAt: { [Op.gt]: new Date() },
        },
        include: [{ model: Vendor }],
      });

      if (!token || !token.Vendor) {
        const error = new Error("Invalid or expired refresh token");
        error.status = 401;
        return next(error);
      }

      const accessToken = jwt.sign(
        { id: token.Vendor.id },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      await token.update({ revoked: true });

      const newRefreshToken = crypto.randomBytes(32).toString("hex");
      const newRefreshTokenHash = crypto
        .createHmac("sha256", process.env.REFRESH_TOKEN_SECRET)
        .update(newRefreshToken)
        .digest("hex");

      await Token.create({
        vendorId: token.Vendor.id,
        type: "refresh_token",
        token: newRefreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      logger.info({
        message: "Access token refreshed",
        vendorId: token.Vendor.id,
      });

      res.json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      logger.error({
        message: "Refresh token error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];

export const logoutVendor = [
  async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!req.vendor || !req.vendor.id) {
      const error = new Error("Unauthorized: Invalid vendor data");
      error.status = 401;
      return next(error);
    }

    try {
      logger.debug({ message: "Logout attempt", vendorId: req.vendor.id });

      if (refreshToken) {
        const refreshTokenHash = crypto
          .createHmac("sha256", process.env.REFRESH_TOKEN_SECRET)
          .update(refreshToken)
          .digest("hex");

        await Token.update(
          { revoked: true },
          {
            where: {
              vendorId: req.vendor.id,
              type: "refresh_token",
              token: refreshTokenHash,
            },
          }
        );
      } else {
        await Token.update(
          { revoked: true },
          {
            where: {
              vendorId: req.vendor.id,
              type: "refresh_token",
            },
          }
        );
      }

      logger.info({ message: "Vendor logged out", vendorId: req.vendor.id });

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      logger.error({
        message: "Logout error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];

export const updateVendor = [
  validate(schemas.vendor.update),
  async (req, res, next) => {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      businessName,
      businessAddress,
      state,
      city,
      postalCode,
      gstNumber,
      notes,
    } = req.body;

    try {
      logger.debug({ message: "Update vendor attempt", vendorId: id });

      if (!req.vendor || !req.vendor.id) {
        const error = new Error("Unauthorized: Invalid vendor data");
        error.status = 401;
        return next(error);
      }

      const vendor = await Vendor.findByPk(id);
      if (!vendor) {
        const error = new Error("Vendor not found");
        error.status = 404;
        return next(error);
      }

      if (vendor.id !== req.vendor.id) {
        const error = new Error("Unauthorized: Cannot update other vendors");
        error.status = 403;
        return next(error);
      }

      await vendor.update({
        firstName,
        lastName,
        email,
        phoneNumber,
        businessName,
        businessAddress,
        state,
        city,
        postalCode,
        gstNumber,
        notes,
        updatedBy: req.vendor.id,
      });

      const services = vendor.services?.length
        ? await Service.findAll({
            where: { id: { [Op.in]: vendor.services } },
            attributes: ["id", "name", "description"],
          })
        : [];

      logger.info({ message: "Vendor updated", vendorId: vendor.id });

      res.json({
        message: "Vendor updated successfully",
        vendor: {
          id: vendor.id,
          firstName: vendor.firstName,
          lastName: vendor.lastName,
          email: vendor.email,
          phoneNumber: vendor.phoneNumber,
          businessName: vendor.businessName,
          businessAddress: vendor.businessAddress,
          state: vendor.state,
          city: vendor.city,
          postalCode: vendor.postalCode,
          gstNumber: vendor.gstNumber,
          notes: vendor.notes,
          services: services.map((service) => ({
            id: service.id,
            name: service.name,
            description: service.description,
          })),
        },
      });
    } catch (error) {
      logger.error({
        message: "Update vendor error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];

export const deleteVendor = [
  async (req, res, next) => {
    const { id } = req.params;

    try {
      logger.debug({ message: "Delete vendor attempt", vendorId: id });

      if (!req.vendor || !req.vendor.id) {
        const error = new Error("Unauthorized: Invalid vendor data");
        error.status = 401;
        return next(error);
      }

      const vendor = await Vendor.findByPk(id);
      if (!vendor) {
        const error = new Error("Vendor not found");
        error.status = 404;
        return next(error);
      }

      if (vendor.id !== req.vendor.id) {
        const error = new Error("Unauthorized: Cannot delete other vendors");
        error.status = 403;
        return next(error);
      }

      await vendor.destroy();

      logger.info({ message: "Vendor deleted", vendorId: id });

      res.json({ message: "Vendor deleted successfully" });
    } catch (error) {
      logger.error({
        message: "Delete vendor error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];

export const forgotPassword = [
  validate(schemas.forgotPassword),
  async (req, res, next) => {
    const { email } = req.body;

    try {
      logger.debug({ message: "Forgot password attempt", email });

      const vendor = await Vendor.findOne({ where: { email } });
      if (!vendor) {
        const error = new Error("Vendor not found");
        error.status = 404;
        return next(error);
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = crypto
        .createHmac("sha256", process.env.RESET_TOKEN_SECRET)
        .update(otp)
        .digest("hex");

      // Store OTP in Tokens table
      await Token.create({
        vendorId: vendor.id,
        type: "reset_otp",
        token: otpHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      });

      // Send OTP via email
      await sendOtpEmail(email, otp);

      logger.info({
        message: "OTP generated and sent",
        vendorId: vendor.id,
      });

      res.json({ message: "OTP sent to your email" });
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

export const verifyOtp = [
  validate(schemas.verifyOtp),
  async (req, res, next) => {
    const { email, otp } = req.body;

    try {
      logger.debug({ message: "Verify OTP attempt", email });

      const vendor = await Vendor.findOne({ where: { email } });
      if (!vendor) {
        const error = new Error("Vendor not found");
        error.status = 404;
        return next(error);
      }

      const otpHash = crypto
        .createHmac("sha256", process.env.RESET_TOKEN_SECRET)
        .update(otp)
        .digest("hex");

      const token = await Token.findOne({
        where: {
          vendorId: vendor.id,
          type: "reset_otp",
          token: otpHash,
          expiresAt: { [Op.gt]: new Date() },
        },
      });

      if (!token) {
        const error = new Error("Invalid or expired OTP");
        error.status = 400;
        return next(error);
      }

      // Generate reset token after OTP verification
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = crypto
        .createHmac("sha256", process.env.RESET_TOKEN_SECRET)
        .update(resetToken)
        .digest("hex");

      await Token.create({
        vendorId: vendor.id,
        type: "reset_password",
        token: resetTokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      // Revoke the OTP token
      await token.update({ revoked: true });

      logger.info({
        message: "OTP verified successfully",
        vendorId: vendor.id,
      });

      res.json({
        message: "OTP verified successfully",
        resetToken,
      });
    } catch (error) {
      logger.error({
        message: "Verify OTP error",
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },
];

export const resetPassword = [
  validate(schemas.resetPassword),
  async (req, res, next) => {
    const { token, password } = req.body;

    try {
      logger.debug({ message: "Reset password attempt" });

      const resetTokenHash = crypto
        .createHmac("sha256", process.env.RESET_TOKEN_SECRET)
        .update(token)
        .digest("hex");

      const tokenRecord = await Token.findOne({
        where: {
          type: "reset_password",
          token: resetTokenHash,
          expiresAt: { [Op.gt]: new Date() },
        },
        include: [{ model: Vendor }],
      });

      if (!tokenRecord || !tokenRecord.Vendor) {
        const error = new Error("Invalid or expired reset token");
        error.status = 400;
        return next(error);
      }

      const vendor = tokenRecord.Vendor;
      const hashedPassword = await bcrypt.hash(password, 10);

      await vendor.update({
        password: hashedPassword,
      });

      await Token.update(
        { revoked: true },
        {
          where: {
            vendorId: vendor.id,
            type: ["reset_password", "reset_otp", "refresh_token"],
          },
        }
      );

      await tokenRecord.destroy();

      logger.info({
        message: "Password reset successful",
        vendorId: vendor.id,
      });

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
  async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    try {
      logger.debug({
        message: "Change password attempt",
        vendorId: req.vendor?.id,
      });

      if (!req.vendor || !req.vendor.id) {
        const error = new Error("Unauthorized: Invalid vendor data");
        error.status = 401;
        return next(error);
      }

      const vendor = await Vendor.findByPk(req.vendor.id);
      if (!vendor) {
        const error = new Error("Vendor not found");
        error.status = 404;
        return next(error);
      }

      const isMatch = await bcrypt.compare(currentPassword, vendor.password);
      if (!isMatch) {
        const error = new Error("Current password is incorrect");
        error.status = 400;
        return next(error);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await vendor.update({
        password: hashedPassword,
        updatedBy: req.vendor.id,
      });

      await Token.update(
        { revoked: true },
        {
          where: {
            vendorId: vendor.id,
            type: "refresh_token",
          },
        }
      );

      logger.info({
        message: "Password changed successfully",
        vendorId: vendor.id,
      });

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
