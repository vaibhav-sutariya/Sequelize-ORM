import Joi from "joi";

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const err = new Error("Validation error");
    err.status = 400;
    err.errors = error.details.map((detail) => detail.message);
    return next(err);
  }
  next();
};

export const schemas = {
  register: Joi.object({
    username: Joi.string().required().messages({
      "string.empty": "Username is required",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Valid email is required",
      "string.empty": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters",
      "string.empty": "Password is required",
    }),
  }),
  login: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Valid email is required",
      "string.empty": "Email is required",
    }),
    password: Joi.string().required().messages({
      "string.empty": "Password is required",
    }),
  }),
  updateProfile: Joi.object({
    username: Joi.string().optional().disallow("").messages({
      "string.empty": "Username cannot be empty",
    }),
    email: Joi.string().email().optional().messages({
      "string.email": "Valid email is required",
    }),
  }).or("username", "email"),
  forgotPassword: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Valid email is required",
      "string.empty": "Email is required",
    }),
  }),
  resetPassword: Joi.object({
    token: Joi.string().required().messages({
      "string.empty": "Token is required",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters",
      "string.empty": "Password is required",
    }),
  }),
  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      "string.empty": "Current password is required",
    }),
    newPassword: Joi.string().min(6).required().messages({
      "string.min": "New password must be at least 6 characters",
      "string.empty": "New password is required",
    }),
  }),
};

export default validate;
