import express from "express";
import { listServices } from "../controllers/serviceController.js";

const router = express.Router();

router.get("/", listServices);

export default router;
