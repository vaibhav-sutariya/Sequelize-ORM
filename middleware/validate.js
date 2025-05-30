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
    firstName: Joi.string().trim().required().messages({
      "string.empty": "First name is required",
      "any.required": "First name is required",
    }),
    lastName: Joi.string().trim().required().messages({
      "string.empty": "Last name is required",
      "any.required": "Last name is required",
    }),
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        "string.email": "Valid email is required",
        "string.empty": "Email is required",
        "any.required": "Email is required",
      }),
    phoneNumber: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .required()
      .messages({
        "string.empty": "Phone number is required",
        "string.pattern.base":
          "Invalid phone number format (e.g., +1234567890)",
        "any.required": "Phone number is required",
      }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters",
      "string.empty": "Password is required",
      "any.required": "Password is required",
    }),
  }),
  login: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        "string.email": "Valid email is required",
        "string.empty": "Email is required",
        "any.required": "Email is required",
      }),
    password: Joi.string().required().messages({
      "string.empty": "Password is required",
      "any.required": "Password is required",
    }),
  }),
  forgotPassword: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        "string.email": "Valid email is required",
        "string.empty": "Email is required",
        "any.required": "Email is required",
      }),
  }),
  resetPassword: Joi.object({
    token: Joi.string().required().messages({
      "string.empty": "Token is required",
      "any.required": "Token is required",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters",
      "string.empty": "Password is required",
      "any.required": "Password is required",
    }),
  }),
  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      "string.empty": "Current password is required",
      "any.required": "Current password is required",
    }),
    newPassword: Joi.string().min(6).required().messages({
      "string.min": "New password must be at least 6 characters",
      "string.empty": "New password is required",
      "any.required": "New password is required",
    }),
  }),
  vendor: {
    updateBusiness: Joi.object({
      businessDetailsToken: Joi.string().required().messages({
        "string.empty": "Business details token is required",
        "any.required": "Business details token is required",
      }),
      businessName: Joi.string().trim().required().messages({
        "string.empty": "Business name is required",
        "any.required": "Business name is required",
      }),
      businessAddress: Joi.string().trim().required().messages({
        "string.empty": "Business address is required",
        "any.required": "Business address is required",
      }),
      state: Joi.string().trim().required().messages({
        "string.empty": "State is required",
        "any.required": "State is required",
      }),
      city: Joi.string().trim().required().messages({
        "string.empty": "City is required",
        "any.required": "City is required",
      }),
      postalCode: Joi.string()
        .pattern(/^\d{5}(-\d{4})?$/)
        .required()
        .messages({
          "string.empty": "Postal code is required",
          "string.pattern.base":
            "Invalid postal code format (e.g., 12345 or 12345-6789)",
          "any.required": "Postal code is required",
        }),
      gstNumber: Joi.string()
        .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
        .optional()
        .allow("")
        .messages({
          "string.pattern.base":
            "Invalid GST number format (e.g., 27AAAAA0000A1Z5)",
        }),
      notes: Joi.string().optional().allow("").messages({
        "string.base": "Notes must be a string",
      }),
    }),
    update: Joi.object({
      firstName: Joi.string().trim().optional().messages({
        "string.empty": "First name cannot be empty",
      }),
      lastName: Joi.string().trim().optional().messages({
        "string.empty": "Last name cannot be empty",
      }),
      email: Joi.string()
        .email({ tlds: { allow: false } })
        .optional()
        .messages({
          "string.email": "Valid email is required",
          "string.empty": "Email cannot be empty",
        }),
      phoneNumber: Joi.string()
        .pattern(/^\+?[1-9]\d{1,14}$/)
        .optional()
        .messages({
          "string.empty": "Phone number cannot be empty",
          "string.pattern.base":
            "Invalid phone number format (e.g., +1234567890)",
        }),
      businessName: Joi.string().trim().optional().allow("").messages({
        "string.base": "Business name must be a string",
      }),
      businessAddress: Joi.string().trim().optional().allow("").messages({
        "string.base": "Business address must be a string",
      }),
      state: Joi.string().trim().optional().allow("").messages({
        "string.base": "State must be a string",
      }),
      city: Joi.string().trim().optional().allow("").messages({
        "string.base": "City must be a string",
      }),
      postalCode: Joi.string()
        .pattern(/^\d{5}(-\d{4})?$/)
        .optional()
        .allow("")
        .messages({
          "string.pattern.base":
            "Invalid postal code format (e.g., 12345 or 12345-6789)",
        }),
      gstNumber: Joi.string()
        .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
        .optional()
        .allow("")
        .messages({
          "string.pattern.base":
            "Invalid GST number format (e.g., 27AAAAA0000A1Z5)",
        }),
      notes: Joi.string().optional().allow("").messages({
        "string.base": "Notes must be a string",
      }),
    })
      .min(1)
      .messages({
        "object.min": "At least one field is required for update",
      }),
  },
};

export default validate;
