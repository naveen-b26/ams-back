import express from "express";
import {
  createTimetableAndUpdate,
  getTimetableByFaculty,
} from "../Controller/timeTableController.js";
const router = express.Router();

// CRUD routes
router.post("/create/update", createTimetableAndUpdate);
router.get("/retrive/:facultyId", getTimetableByFaculty); // Retrive a timetable

export default router;
