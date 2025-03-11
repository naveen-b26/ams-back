import express from "express";
import {
  retriveStudentTimeTable,
  getbatchDetails,
  getAllBatches,
  newBatch,
  getbatchWithStudent,
  StudentAddToBatch,
  DeleteStudentFromBatch,
  DeleteBatch,
  getbatchDetailsFaculty,
  FacultyAddToBatch,
  getbatchDetailsDeos,
  DeleteDeoFromBatch,
  DeoAddToBatch,
  AdminAddToBatch,
  getbatchDetailsAdmins,
  DeleteAdminFromBatch,
} from "../Controller/batchController.js";
const router = express.Router();

// CRUD routes
router.post("/create", newBatch); // Create a new batch

router.post("/addStudent", StudentAddToBatch);

router.post("/addFaculty", FacultyAddToBatch);

router.post("/addDeo", DeoAddToBatch);

router.post("/addAdmin", AdminAddToBatch);

router.delete("/:batchId/student/:studentId", DeleteStudentFromBatch);

router.delete("/:batchId/deo/:deoId", DeleteDeoFromBatch);

router.delete("/:batchId/admin/:adminId", DeleteAdminFromBatch);

router.delete("/:batchId", DeleteBatch);

router.get("/timetable", retriveStudentTimeTable);

router.get("/:batchId", getbatchDetails);

router.get("/faculty/:batchId", getbatchDetailsFaculty);

router.get("/deo/:batchId", getbatchDetailsDeos);

router.get("/admin/:batchId", getbatchDetailsAdmins);

router.get("/student/:id", getbatchWithStudent);

router.get("/all/batches", getAllBatches);

export default router;
