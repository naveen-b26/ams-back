import express from "express";
import {
  AttendanceRange,
  CalculateAttendancePercentageOfStudent,
  confirmAttendance,
  getAttendanceByPeriod,
  getStudentsReport,
  MannualAttendance,
  MonthlyAnalysis,
  todayAttendanceAnalysis,
} from "../Controller/attendanceController.js";

const router = express.Router();

// router.post("/create", createAttendance);
router.post("/confirm", confirmAttendance);
router.post("/manual/attendance", MannualAttendance);
router.post("/StudentRangeData", AttendanceRange);

router.post("/getAttendanceByPeriod", getAttendanceByPeriod);

router.post("/report", getStudentsReport);

router.post("/today", todayAttendanceAnalysis);

router.post("/monthlyAnalysis", MonthlyAnalysis);

router.post("/calculateAttendance", CalculateAttendancePercentageOfStudent);

export default router;
