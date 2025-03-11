import express from "express";
import {
  newFaculty,
  checkAndResetVerification,
  getallFaculty,
  deleteFaculty,
  updateFaculty,
  FacultyScanAuth,
  getSpecificFaculty,
} from "../Controller/facultyController.js";
const router = express.Router();

// CRUD routes
router.post("/create", newFaculty); // Create a new faculty

router.get("/authorize/:facultyId", checkAndResetVerification);

router.post("/mobile/Auth", FacultyScanAuth);

router.get("/getfaculties", getallFaculty);

router.get("/:facultyId", getSpecificFaculty);

router.put("/update", updateFaculty);

router.delete("/delete/:facultyId", deleteFaculty);

export default router;
