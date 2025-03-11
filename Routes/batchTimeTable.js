import express from "express";
import {
  createTimetableAndUpdate,
  getTimetableByBatchId,
} from "../Controller/BatchTimeTable.js";
const router = express.Router();

// CRUD routes
router.post("/create/update", createTimetableAndUpdate); // Create a new timetable
router.get("/retrive/:Id", getTimetableByBatchId); // Retrive a timetable

export default router;
