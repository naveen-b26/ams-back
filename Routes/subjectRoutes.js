import express from "express";
import {
  createSubject,
  getSubjectById,
  updateSubject,
  deleteSubject,
} from "../Controller/subjectController.js";
const router = express.Router();

// CRUD routes
// Create a new subject
router.post("/create", createSubject);

// Get a subject by subjectId
router.get("/subjects/:subjectId", getSubjectById);

// Update a subject by subjectId
router.put("/subjects/:subjectId", updateSubject);

// Delete a subject by subjectId
router.delete("/subjects/:subjectId", deleteSubject);

export default router;
