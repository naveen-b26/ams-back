import express from "express";
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  mobileFacultyPassword,
  mobileLoginFaculty,
  mobileLoginstud,
  mobileStudPassword,
  updateUser,
  webLogin,
} from "../Controller/userController.js";

const router = express.Router();

// CRUD Routes
router.post("/create", createUser); // Create a new user
router.get("/getUsers", getAllUsers); // Get all users
router.get("/:id", getUserById); // Get a single user by ID
router.put("/:id", updateUser); // Update a user
router.delete("/:id", deleteUser); // Delete a user

// Mobile Login Routes
router.post("/mobile/loginstud", mobileLoginstud); // Student mobile login
router.post("/mobile/loginfly", mobileLoginFaculty); // Faculty mobile login

// Web Login Route
router.post("/web/login", webLogin); // Web login for all roles

// Password Reset Routes
router.put("/mobile/student/passwordUpdate", mobileStudPassword); // Student password reset
router.put("/mobile/faculty/passwordUpdate", mobileFacultyPassword); // Faculty password reset

export default router;
