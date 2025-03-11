import express from "express";
import { addNewCourse, getCourses } from "../Controller/CourseController.js";
const router = express.Router();

// CRUD routes
router.post("/create", addNewCourse); // Create a new course

router.get("/getCourses", getCourses);

export default router;
