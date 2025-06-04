import nodemailer from "nodemailer";
import logger from "./logger.js";

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

    await transport.sendMail({
      from: process.env.MAILTRAP_SENDER_EMAIL || "noreply@example.com",
      to: toEmail,
      subject: "Password Reset OTP",
      text: `Your one-time password (OTP) for resetting your password is: ${otp}\nThis OTP is valid for 15 minutes.`,
      html: `
        <h2>Password Reset OTP</h2>
        <p>Your one-time password (OTP) for resetting your password is:</p>
        <h3>${otp}</h3>
        <p>This OTP is valid for 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
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
