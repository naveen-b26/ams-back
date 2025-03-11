import express from "express";
const app = express();

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

import cors from "cors";
app.use(cors());

const PORT = 9000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

app.use(express.json());

import checkConnection from "./db.js";
checkConnection();

// server starting
app.get("/", (req, res) => {
  res.send("Hello, world!");
});

// Routing routes

import user from "./Routes/userRoutes.js";
import faculty from "./Routes/facultyRouter.js";
import course from "./Routes/courseRoutes.js";
import student from "./Routes/studentRoutes.js";
import batch from "./Routes/batchRoutes.js";
import attendance from "./Routes/attendanceRoutes.js";
import timetable from "./Routes/timeTableRoutes.js";
import subject from "./Routes/subjectRoutes.js";
import deo from "./Routes/deoRouter.js";
import uploadRoutes from "./upload.js";
import admin from "./Routes/adminRouter.js";
import batchTimeTable from "./Routes/batchTimeTable.js";

app.use("/api/user", user);

app.use("/api/faculty", faculty);

app.use("/api/course", course);

app.use("/api/student", student);

app.use("/api/batch", batch);

app.use("/api/attendance", attendance);

app.use("/api/timetable", timetable);

app.use("/api/subject", subject);

app.use("/api/deo", deo);

app.use("/api/admin", admin);

app.use("/api/batchTimeTable", batchTimeTable);

//use cloudinary
app.use("/api/cloudinary", uploadRoutes);

// Graceful Shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
