import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import logger from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transport = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST || "sandbox.smtp.mailtrap.io",
  port: parseInt(process.env.MAILTRAP_PORT, 10) || 2525,
  auth: {
    user: process.env.MAILTRAP_USER || "eee713053e80b0",
    pass: process.env.MAILTRAP_PASS,
  },
});

export const sendOtpEmail = async (toEmail, otp) => {
  try {
    logger.debug({ message: "Sending OTP email", toEmail });

    // Read and encode logo
    const logoPath = path.join(__dirname, "../public/images/logo.png");
    let logoBase64;
    try {
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = logoBuffer.toString("base64");
    } catch (error) {
      logger.error({
        message: "Failed to read logo file",
        error: error.message,
        stack: error.stack,
      });
      // Fallback to placeholder if logo is missing
      logoBase64 = "";
    }

    const templatePath = path.join(__dirname, "../views/emails/otpEmail.ejs");
    const html = await ejs.renderFile(templatePath, { otp, logoBase64 });

    await transport.sendMail({
      from: process.env.MAILTRAP_SENDER_EMAIL || "noreply@example.com",
      to: toEmail,
      subject: "Password Reset OTP",
      text: `Your one-time password (OTP) for resetting your password is: ${otp}\nThis OTP is valid for 15 minutes.\nIf you did not request this, please ignore this email.`,
      html,
    });

    logger.info({ message: "OTP email sent successfully", toEmail });
  } catch (error) {
    logger.error({
      message: "Failed to send OTP email",
      error: error.message,
      stack: error.stack,
      toEmail,
    });
    throw new Error("Failed to send OTP email");
  }
};
