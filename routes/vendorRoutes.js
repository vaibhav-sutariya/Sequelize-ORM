import express from "express";
import {
  registerVendor,
  updateBusinessDetails,
  loginVendor,
  updateVendor,
  deleteVendor,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/vendorController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerVendor);
router.post("/business", updateBusinessDetails);
router.post("/login", loginVendor);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.put("/:id", authMiddleware, updateVendor);
router.delete("/:id", authMiddleware, deleteVendor);
router.post("/change-password", authMiddleware, changePassword);

export default router;
