import express from "express";
import {
  newStudent,
  updateStudent,
  deleteStudent,
  allstudentsDetails,
  studentDetails,
  studentWithBatchDetails,
  allstudentsDepartmentDetails,
  bulkAddStudents,
} from "../Controller/studentController.js";
const router = express.Router();

// CRUD routes
router.post("/create", newStudent); // Create a new student
router.post("/bulkcreate", bulkAddStudents);

router.put("/update", updateStudent);

router.delete("/delete/:studentId", deleteStudent);

router.get("/getstudents/:department", allstudentsDepartmentDetails);

router.get("/getstudents", allstudentsDetails);

router.get("/:id", studentDetails);

router.get("/batch/:id", studentWithBatchDetails);

export default router;
