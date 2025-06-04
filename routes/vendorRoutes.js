import express from "express";
import {
  registerVendor,
  updateBusinessDetails,
  selectVendorServices,
  addVendorService,
  loginVendor,
  updateVendor,
  deleteVendor,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshToken,
  logoutVendor,
} from "../controllers/vendorController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerVendor);
router.post("/update-business", updateBusinessDetails);
router.post("/select-services", selectVendorServices);
router.post("/add-service", authMiddleware, addVendorService);
router.post("/login", loginVendor);
router.post("/refresh-token", refreshToken);
router.post("/logout", authMiddleware, logoutVendor);
router.put("/update/:id", authMiddleware, updateVendor);
router.delete("/delete/:id", authMiddleware, deleteVendor);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", authMiddleware, changePassword);

export default router;
