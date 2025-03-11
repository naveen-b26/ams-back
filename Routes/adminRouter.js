import express from "express";
const router = express.Router();
import {
  deleteAdmin,
  getAdminById,
  getAllAdmins,
  newAdmin,
  updateAdmin,
} from "../Controller/adminController.js";
// Create a new admin
router.post("/create", newAdmin);

// Get all admins
router.get("/allAdmin", getAllAdmins);

// Get a specific admin by ID
router.get("/:id", getAdminById);

// Update an admin
router.put("/update", updateAdmin);

// Delete an admin
router.delete("/delete/:id", deleteAdmin);

export default router;
