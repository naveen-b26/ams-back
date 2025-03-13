import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

import jwt from "jsonwebtoken";

import dotenv from "dotenv"; // Import dotenv
dotenv.config();

const currentDate = new Date();

const year = currentDate.getFullYear(); // Get year
const month = currentDate.getMonth() + 1; // Get month (0-indexed, so add 1)
const day = currentDate.getDate(); // Get day of the month

const date = `${day}-${month}-${year}`;

export const confirmAttendance = async (req, res) => {
  try {
    // Extract studentId from the request body
    const { student_id } = req.body;
    console.log("Received Student ID:", student_id);

    // Validate authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Authorization error");
      return res.status(401).json({ message: "Authorization token missing." });
    }

    // Extract the token from the authorization header
    const token = authHeader.split(" ")[1];
    const SECRET_KEY = process.env.JWT_SECRET;

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, SECRET_KEY, { algorithms: ["HS256"] });
      console.log("Decoded JWT:", decoded);
    } catch (error) {
      console.error("Invalid token:", error);
      return res.status(401).json({ message: "Invalid token." });
    }

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      console.log("Token expired");
      return res.status(401).json({ message: "Token expired." });
    }

    // Ensure studentId is provided
    if (!student_id) {
      return res.status(400).json({ message: "Student ID is required." });
    }

    // Fetch the batch details for the decoded.batch_id and check if the studentId exists in studentIds
    const batch = await prisma.batch.findFirst({
      where: {
        id: decoded.batch_id,
        studentIds: {
          has: student_id,
        },
      },
    });

    if (!batch) {
      console.log("Batch not found or student not enrolled.");
      return res.status(404).json({ message: "Batch not found or student is not enrolled." });
    }

    // Get today's date in YYYY-MM-DD format
    const todayDate = new Date().toISOString().split("T")[0];

    // Find or create the attendance record for the student
    let attendance = await prisma.attendance.findFirst({
      where: {
        student_id: student_id,
        batch_id: batch.id,
      },
    });

    if (!attendance) {
      console.log("Creating new attendance record...");
      attendance = await prisma.attendance.create({
        data: {
          student_id: student_id,
          batch_id: decoded.batch_id,
          attend: {},
        },
      });
    }

    // Parse the attendance JSON structure
    let attendData = attendance.attend || {};
    console.log("Before Update - Attendance Data:", attendData);

    if (!attendData[todayDate]) {
      // If no entry for today, initialize with an array of six zeros
      attendData[todayDate] = [0, 0, 0, 0, 0, 0];
    }

    // Update the attendance for the specific period
    const periodIndex = decoded.period - 1; // Convert period to zero-based index
    if (periodIndex < 0 || periodIndex >= 6) {
      return res.status(400).json({ message: "Invalid period number." });
    }

    // Check if attendance is already marked for this period
    if (attendData[todayDate][periodIndex] === 1) {
      console.log(`Attendance already marked for period ${decoded.period}.`);
      return res.status(201).json({ message: "Attendance already marked." });
    }

    // Mark attendance for the given period
    attendData[todayDate][periodIndex] = 1;

    console.log("After Update - Attendance Data:", attendData);

    // Save the updated attendance record
    await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        attend: attendData,
      },
    });

    return res.status(200).json({ message: "Attendance marked successfully." });
  } catch (error) {
    console.error("Error marking attendance:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const MannualAttendance = async (req, res) => {
  try {
    // Extract batchId, period, and students array from the request body
    const { batch_id, period, students } = req.body;

    // Validate input
    if (
      !batch_id ||
      !period ||
      !Array.isArray(students) ||
      students.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or incomplete request payload." });
    }

    // Get today's date in YYYY-MM-DD format
    const todayDate = new Date().toISOString().split("T")[0];

    // Fetch the batch details to ensure it exists
    const batch = await prisma.batch.findFirst({
      where: { id: batch_id },
    });

    if (!batch) {
      return res.status(404).json({ message: "Batch not found." });
    }

    // Initialize results array to track updates for each student
    const updateResults = [];

    // Loop through the students array and update attendance for each student
    for (const student of students) {
      const { student_id, status } = student;

      // Ensure studentId and status are provided
      if (!student_id || typeof status !== "boolean") {
        updateResults.push({
          student_id,
          message: "Invalid student data.",
        });
        continue;
      }

      // Fetch the attendance record for the student
      let attendance = await prisma.attendance.findFirst({
        where: {
          student_id: student_id,
          batch_id: batch_id,
        },
      });

      if (!attendance) {
        // Create a new attendance record if none exists
        attendance = await prisma.attendance.create({
          data: {
            student_id: student_id,
            batch_id: batch_id,
            attend: {}, // Initialize an empty JSON object for attendance records
          },
        });
      }

      // Parse the attendance JSON structure
      let attendData = attendance.attend || {};

      // If no entry for today, initialize with an array of six zeros
      if (!attendData[todayDate]) {
        attendData[todayDate] = [0, 0, 0, 0, 0, 0];
      }

      // Update the attendance for the specific period
      const periodIndex = period - 1; // Convert period to zero-based index
      if (periodIndex < 0 || periodIndex >= 6) {
        updateResults.push({
          studentId,
          message: "Invalid period number.",
        });
        continue;
      }

      // Mark attendance for the given period based on the status
      attendData[todayDate][periodIndex] = status ? 1 : 0;

      // Save the updated attendance record
      await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          attend: attendData,
        },
      });

      // Add the result for this student
      updateResults.push({
        student_id,
        message: `Attendance marked successfully for period ${period}.`,
      });
    }

    // Return the results of the bulk update
    return res.status(200).json({
      message: "Bulk attendance update completed.",
      results: updateResults,
    });
  } catch (error) {
    console.error("Error marking bulk attendance:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const getAttendanceByPeriod = async (req, res) => {
  try {
    // Extract request body parameters
    const { date, batch_id, period } = req.body;

    // Validate input
    if (!date || !batch_id || !period) {
      return res
        .status(400)
        .json({ error: "Invalid or incomplete request payload." });
    }

    // Fetch the batch details
    const batch = await prisma.batch.findFirst({
      where: { id: batch_id },
    });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found." });
    }

    // Extract student IDs from the batch
    const studentIds = batch.studentIds;

    // Fetch attendance records for the given student IDs
    const attendances = await prisma.attendance.findMany({
      where: {
        student_id: { in: studentIds }, // Find attendance records for the batch's students
        batch_id: batch_id, // Ensure the attendance belongs to the correct batch
      },
    });

    // Filter students who are present in the specified period
    const presentStudents = attendances
      .filter((attendance) => {
        const attendData = attendance.attend || {};
        const periods = attendData[date]; // Get the array for the given date
        if (!periods || !Array.isArray(periods)) return false; // Skip if no data for the date
        const periodIndex = period - 1; // Convert period to zero-based index
        return periods[periodIndex] === 1; // Check if the student is present
      })
      .map((attendance) => attendance.student_id); // Extract the student IDs

    // Return the list of present students
    return res.status(200).json({ presentStudents });
  } catch (error) {
    console.error("Error fetching students present in the period:", error);
    return res
      .status(500)
      .json({ error: "Error fetching students present in the period." });
  }
};
export const getStudentsReport = async (req, res) => {
  try {
    const { date, batch_id, period } = req.body;

    // Validate input
    if (!date || !batch_id || !period || period < 1 || period > 6) {
      return res
        .status(400)
        .json({ error: "Invalid or incomplete request payload" });
    }

    // Fetch attendance records for the specified batch
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        batch_id: batch_id,
      },
      include: {
        student: true, // Include related student details
      },
    });

    // Process attendance records to extract the required data
    const report = attendanceRecords.map((record) => {
      const attendData = record.attend; // JSON structure containing attendance data
      const student = record.student; // Related student details

      // Find the attendance status for the specified date and period
      const dayRecord = attendData[date]; // Get the attendance record for the specified date
      const periodStatus = dayRecord ? dayRecord[period - 1] : null; // Get the status for the specified period (0-based index)

      return {
        studentId: student.studentId,
        name: student.name, // Assuming the student model has a `name` field
        attendanceStatus:
          periodStatus === 1
            ? "Present"
            : periodStatus === 0
            ? "Absent"
            : "Not Marked",
      };
    });

    // Return the report
    return res.status(200).json({ report });
  } catch (error) {
    console.error("Error fetching attendance details for the period:", error);
    return res
      .status(500)
      .json({ error: "Error fetching attendance details for the period." });
  }
};

export const todayAttendanceAnalysis = async (req, res) => {
  try {
    const { date, batchIds } = req.body;

    // Validate input
    if (!Array.isArray(batchIds) || batchIds.length === 0) {
      return res
        .status(400)
        .json({ error: "Please provide a valid array of batch IDs" });
    }

    const today = date;

    // Fetch batches with their students that match the provided batch IDs
    const batches = await prisma.batch.findMany({
      where: {
        batchId: { in: batchIds },
      },
      include: {
        students: true, // Get all students in each batch
      },
    });

    console.log(batches);

    const attendanceAnalysis = [];

    for (const batch of batches) {
      const studentIds = batch.students.map((student) => student.id);

      // Fetch attendance records for students in this batch
      const attendances = await prisma.attendance.findMany({
        where: {
          student_id: { in: studentIds },
          batch_id: batch.id,
        },
        select: {
          student_id: true,
          attend: true,
        },
      });

      console.log(attendances);

      let present = 0;
      let absent = 0;

      // Check attendance for each student in the batch
      for (const student of batch.students) {
        const attendance =
          attendances.find((a) => a.student_id === student.id)?.attend || {};
        const todaysData = attendance[today] || [];

        // Determine presence (if any session is marked present)
        const isPresent = todaysData.some((session) => session === 1);
        isPresent ? present++ : absent++;
      }

      // Calculate percentages
      const total = present + absent;
      const percentagePresent = ((present / total) * 100).toFixed(2);
      const percentageAbsent = ((absent / total) * 100).toFixed(2);

      attendanceAnalysis.push({
        batchId: batch.batchId,
        name: batch.name,
        present,
        absent,
        percentagePresent: `${percentagePresent}%`,
        percentageAbsent: `${percentageAbsent}%`,
      });
    }

    res.json(attendanceAnalysis);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await prisma.$disconnect();
  }
};

// POST /api/batch/attendance/monthly-analysis
export const MonthlyAnalysis = async (req, res) => {
  const { batchIds, month, year } = req.body;

  try {
    // Generate all dates in the specified month
    const monthIndex = new Date(`${month} 1, ${year}`).getMonth() + 1;
    const startDate = new Date(year, monthIndex - 1, 1);
    const endDate = new Date(year, monthIndex, 0);
    const datesInMonth = getDatesInRange(startDate, endDate);

    // Split dates into weekly chunks
    const weeks = splitIntoWeeks(datesInMonth);

    // Process each batch
    const batchResults = await Promise.all(
      batchIds.map(async (batchId) => {
        const batch = await prisma.batch.findUnique({
          where: { id: batchId },
          select: { studentIds: true },
        });

        if (!batch) return null;

        const studentIds = batch.studentIds.map((id) => id.toString());
        const attendances = await prisma.attendance.findMany({
          where: { batch_id: batchId, student_id: { in: studentIds } },
        });
        console.log(attendances);
        const weeklyPercentages = weeks.map((week) => {
          let totalStudents = 0;
          let totalPercentage = 0;

          studentIds.forEach((studentId) => {
            const attendance = attendances.find(
              (a) => a.student_id.toString() === studentId
            );
            const studentPercentage = calculateWeeklyPercentage(
              attendance,
              week
            );
            totalPercentage += studentPercentage;
            totalStudents++;
          });

          return totalStudents
            ? (totalPercentage / totalStudents).toFixed(2)
            : 0;
        });

        return { batchId, weeklyPercentages };
      })
    );

    // Filter out invalid batches
    const validResults = batchResults.filter((result) => result !== null);

    res.json({ batches: validResults });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper Functions
function getDatesInRange(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate).toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

function splitIntoWeeks(dates) {
  const weeks = [];
  let currentWeek = [];

  dates.forEach((date) => {
    currentWeek.push(date);
    if (currentWeek.length === 7) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) weeks.push(currentWeek);
  return weeks;
}

function calculateWeeklyPercentage(attendance, week) {
  if (!attendance) return 0;

  let presentDays = 0;
  week.forEach((date) => {
    if (attendance.attend[date]?.some((session) => session === 1)) {
      presentDays++;
    }
  });
  return week.length ? (presentDays / week.length) * 100 : 0;
}

export const AttendanceRange = async (req, res) => {
  const { studentId, startDate, endDate } = req.body;

  try {
    // Validate student exists
    const student = await prisma.student.findUnique({
      where: { studentId: studentId },
    });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    if (start > end) {
      return res
        .status(400)
        .json({ error: "Start date must be before end date" });
    }

    // Get student's attendance record
    const attendance = await prisma.attendance.findFirst({
      where: { student_id: student.id },
    });

    // Generate all dates in the range
    const dates = getDatesBetween(start, end);

    // Build response
    const result = dates.map((date) => {
      const formattedDate = date.toISOString().split("T")[0];
      const attendData = attendance?.attend[formattedDate] || [];
      return { date: formattedDate, attend: attendData };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to generate dates between start and end
function getDatesBetween(start, end) {
  const dates = [];
  let currentDate = new Date(start);
  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

export const CalculateAttendancePercentageOfStudent = async (req, res) => {
  const { batchId, startDate, endDate } = req.body;
  try {
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    if (start > end) {
      return res
        .status(400)
        .json({ error: "Start date must be before end date" });
    }

    // Check if batch exists
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
    });
    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    // Check if already calculated today
    const today = new Date().toISOString().split("T")[0];

    // Proceed to calculate
    const students = await prisma.student.findMany({
      where: { batches: { some: { id: batchId } } },
      select: { id: true, studentId: true, name: true },
    });

    const promises = students.map(async (student) => {
      try {
        const attendance = await prisma.attendance.findFirst({
          where: { student_id: student.id, batch_id: batchId },
        });
        if (!attendance) {
          console.warn(`No attendance record found for student ${student.id}`);
          return;
        }

        let presentDays = 0;
        let totalDays = 0;

        const dates = getDatesBetween(start, end);
        dates.forEach((date) => {
          const formattedDate = date.toISOString().split("T")[0];
          const attendData = attendance.attend[formattedDate];
          if (attendData?.some((session) => session === 1)) {
            presentDays++;
          }
          totalDays++;
        });

        // Handle division by zero
        let percentage = "0%";
        if (totalDays > 0) {
          percentage = ((presentDays / totalDays) * 100).toFixed(1) + "%";
        }
        console.log(percentage);

        const updatedAttendance = await prisma.attendance.update({
          where: { id: attendance.id },
          data: { percentage },
        });

        return {
          Id: student.id,
          studentId: student.studentId,
          name: student.name,
          percentage: updatedAttendance.percentage,
        };
      } catch (err) {
        console.error(`Error processing student ${student.id}:`, err);
        return null;
      }
    });

    const results = (await Promise.all(promises)).filter((r) => r);

    res.json(results);
  } catch (error) {
    console.error("Internal Server Error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};
