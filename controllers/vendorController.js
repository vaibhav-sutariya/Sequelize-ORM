import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Vendor from "../models/vendorModel.js";
import Token from "../models/token_model.js";
import Service from "../models/servicesModel.js";
import validate, { schemas } from "../middleware/validate.js";
import logger from "../utils/logger.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import { Op } from "sequelize";

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
        createdBy: null, // Will be updated after creation
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
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
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

      // await token.destroy();

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

      // Verify all service IDs exist
      const services = await Service.findAll({
        where: { id: { [Op.in]: serviceIds } },
      });

      if (services.length !== serviceIds.length) {
        const error = new Error("One or more service IDs are invalid");
        error.status = 400;
        return next(error);
      }

      // Update vendor with selected service IDs
      await vendor.update({
        services: serviceIds,
        updatedBy: vendor.id,
      });

      // Destroy the business details token
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
    const { name, description, price, nextService } = req.body;

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

      // Check if service already exists
      let service = await Service.findOne({ where: { name } });
      if (service) {
        const error = new Error("Service already exists");
        error.status = 400;
        return next(error);
      }

      // Create new service
      service = await Service.create({
        name,
        description,
        price: price,
        nextService: nextService,
        createdBy: vendor.id,
        updatedBy: vendor.id,
      });

      // Add service ID to vendor's services array
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
      // Generate access token (short-lived)
      const accessToken = jwt.sign({ id: vendor.id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      });

      // Generate refresh token
      const refreshToken = crypto.randomBytes(32).toString("hex");
      const refreshTokenHash = crypto
        .createHmac("sha256", process.env.REFRESH_TOKEN_SECRET)
        .update(refreshToken)
        .digest("hex");

      // Store refresh token
      await Token.create({
        vendorId: vendor.id,
        type: "refresh_token",
        token: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
      // Fetch services for the vendor
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
          revoked: false,
        },
        include: [{ model: Vendor }],
      });

      if (!token || !token.Vendor) {
        const error = new Error("Invalid or expired refresh token");
        error.status = 401;
        return next(error);
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { id: token.Vendor.id },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      // Optionally rotate refresh token
      await token.update({
        revoked: true,
      });

      const newRefreshToken = crypto.randomBytes(32).toString("hex");
      const newRefreshTokenHash = crypto
        .createHmac("sha256", process.env.REFRESH_TOKEN_SECRET)
        .update(newRefreshToken)
        .digest("hex");

      await Token.create({
        vendorId: token.Vendor.id,
        type: "refresh_token",
        token: newRefreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
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
        // Revoke all refresh tokens for the vendor
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

export const deleteVendor = async (req, res, next) => {
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

    await vendor.destroy(); // Tokens will be deleted via CASCADE

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
};

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

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = crypto
        .createHmac("sha256", process.env.RESET_TOKEN_SECRET)
        .update(resetToken)
        .digest("hex");

      await Token.create({
        vendorId: vendor.id,
        type: "reset_password",
        token: resetTokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      });

      logger.info({
        message: "Password reset token generated",
        vendorId: vendor.id,
      });

      const resetUrl = `${process.env.APP_URL}/api/vendors/reset-password/${resetToken}`;
      await sendPasswordResetEmail(email, resetUrl);
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

      // Revoke all refresh tokens on password reset
      await Token.update(
        { revoked: true },
        {
          where: {
            vendorId: vendor.id,
            type: "refresh_token",
          },
        }
      );

      await Token.destroy({
        where: {
          vendorId: vendor.id,
          type: "reset_password",
        },
      });

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

      // Revoke all refresh tokens on password change
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
