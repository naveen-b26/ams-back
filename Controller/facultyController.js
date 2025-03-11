import { PrismaClient } from "@prisma/client";

import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const prisma = new PrismaClient();

import bcrypt from "bcrypt";
import validator from "validator";
// Helper function to hash passwords
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

export const newFaculty = async (req, res) => {
  try {
    // Destructure required fields from req.body
    const {
      facultyId,
      name,
      experience,
      designation,
      department,
      email,
      password,
      gender,
      subject,
      contact,
    } = req.body;
    console.log(req.body);
    // Validate required fields
    if (
      !facultyId ||
      !email ||
      !password ||
      !gender ||
      !department ||
      !designation ||
      !name ||
      !experience ||
      !subject ||
      !contact
    ) {
      return res.status(400).json({
        message:
          "All fields are required: facultyId, name, experience, designation, department, email, password, gender.",
      });
    }

    // Check if faculty with this facultyId already exists
    const existingFaculty = await prisma.faculty.findUnique({
      where: { facultyId },
    });
    if (existingFaculty) {
      return res.status(400).json({
        error: "Faculty with this facultyId already exists.",
      });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    // Validate gender
    const allowedGenders = ["MALE", "FEMALE", "OTHER"];
    const updateGender = gender.toUpperCase();
    if (!allowedGenders.includes(updateGender)) {
      return res.status(400).json({ message: "Invalid gender." });
    }

    // Validate department (convert to uppercase for consistency)
    const validDepartments = [
      "CSE",
      "CSM",
      "IT",
      "IOT",
      "EEE",
      "ECE",
      "MECH",
      "CIVIL",
      "PLACEMENT",
    ];
    const upperCaseDepartment = department.toUpperCase();
    if (!validDepartments.includes(upperCaseDepartment)) {
      return res.status(400).json({ error: "Invalid Department" });
    }

    // Validate designation (convert to uppercase for consistency)
    const validDesignations = {
      PROFESSOR: true,
      ASSISTANT_PROFESSOR: true,
      LECTURER: true,
      VISITING_FACULTY: true,
    };
    const upperCaseDesignation = designation.toUpperCase();
    if (!validDesignations[upperCaseDesignation]) {
      return res.status(400).json({ error: "Invalid Designation" });
    }

    // Create the faculty (store uppercase values)
    const newFaculty = await prisma.faculty.create({
      data: {
        facultyId,
        name,
        experience,
        designation: upperCaseDesignation, // Store uppercase designation
        department: upperCaseDepartment, // Store uppercase department
        isVerified: false,
        subject: subject,
        contact: contact,
      },
    });

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the user record
    const newUserFaculty = await prisma.user.create({
      data: {
        userID: facultyId,
        email,
        role: "FACULTY",
        password: hashedPassword,
        gender: updateGender,
        phy_ID: "null", // Assuming this is a placeholder
        roleId: newFaculty.id,
      },
    });

    // Return the created faculty and user details
    res.status(201).json({
      message: "Faculty and user created successfully.",
      newFacultyDetails: newFaculty,
      newUserFacultyDetails: newUserFaculty,
    });
  } catch (error) {
    console.error("Error creating faculty:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const updateFaculty = async (req, res) => {
  try {
    const facultyData = req.body;
    const { user, ...faculty } = facultyData;
    console.log(user);
    console.log(faculty);

    if (!facultyData) {
      return res.status(400).json({ message: "Faculty Data is required" });
    }

    // Validate email format
    if (!validator.isEmail(user.email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }
    // Validate gender
    const allowedGenders = ["MALE", "FEMALE", "OTHER"];
    const updategender = user.gender.toUpperCase();
    if (!allowedGenders.includes(updategender)) {
      return res.status(400).json({ message: "Invalid gender." });
    }

    // Validate department (convert to uppercase for consistency)
    const validDepartments = [
      "CSE",
      "CSM",
      "IT",
      "IOT",
      "EEE",
      "ECE",
      "MECH",
      "CIVIL",
      "PLACEMENT",
    ];
    const upperCaseDepartment = faculty.department.toUpperCase();
    if (!validDepartments.includes(upperCaseDepartment)) {
      return res.status(400).json({ error: "Invalid Department" });
    }

    // Validate designation (convert to uppercase for consistency)
    const validDesignation = {
      PROFESSOR: true,
      ASSISTANT_PROFESSOR: true,
      LECTURER: true,
      VISITING_FACULTY: true,
    };
    const upperCaseDesignation = faculty.designation.toUpperCase();
    if (!validDesignation[upperCaseDesignation]) {
      return res.status(400).json({ error: "Invalid Designation" });
    }

    const updatedFaculty = await prisma.faculty.update({
      where: { id: faculty.id },
      data: {
        facultyId: faculty.facultyId,
        name: faculty.name,
        experience: faculty.experience,
        designation: upperCaseDesignation, // Store uppercase designation
        department: upperCaseDepartment, // Store uppercase department
      },
    });

    const updatedUserFaculty = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        userID: updatedFaculty.facultyId,
        email: user.email,
        gender: updategender,
      },
    });

    res.status(201).json({
      updatedFacultyDetails: updatedFaculty,
      updatedUserFacultyDetails: updatedUserFaculty,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error in updating the Faculty", error });
  }
};

export const deleteFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;

    if (!facultyId) {
      return res.status(400).json({ message: "Faculty ID is required" });
    }

    // Check and delete the faculty record
    const faculty = await prisma.faculty.findUnique({
      where: { facultyId: facultyId },
    });
    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }
    await prisma.faculty.delete({
      where: { facultyId: facultyId },
    });
    // Check and delete the timetable associated with the faculty
    const timetable = await prisma.facultyTimetable.findMany({
      where: { facultyId: faculty.id },
    });
    if (timetable.length > 0) {
      await prisma.timetable.deleteMany({
        where: { facultyId: facultyId },
      });
    }

    // Check and delete the associated user record
    const user = await prisma.user.findUnique({
      where: { userID: facultyId },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await prisma.user.delete({
      where: { userID: facultyId },
    });

    res.status(200).json({
      message: "Faculty deleted successfully",
      deletedFaculty: faculty,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error in deleting the faculty",
      error: error.message || error,
    });
  }
};

// facutly scan and create the students database
// export const FacultyScanAuth = async (req, res) => {
//   try {
//     // Authorization header validation
//     const { faculty } = req.body;
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ message: "Authorization token missing." });
//     }

//     const token = authHeader.split(" ")[1];
//     if (!token) {
//       return res.status(400).json({ message: "Token missing." });
//     }
//     const SECRET_KEY = new TextEncoder().encode(
//       "1d396a35fb765dde12659b90154f8e23f569b7682c9f9c2608e634a7787637d225840c2e3bb8f8"
//     );
//     if (!SECRET_KEY) {
//       return res.status(500).json({ message: "SECRET_KEY is not set." });
//     }
//     // Decode and validate token
//     const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ["HS256"] });
//     console.log(decoded);
//     const now = Math.floor(Date.now() / 1000);
//     if (now - decoded.timestamp > 15000) {
//       return res.status(401).json({ message: "Token expired." });
//     }

//     const facultyId = decoded.facultyId;
//     console.log(facultyId);
//     if (faculty != facultyId) {
//       return res.status(401).json({ message: "You are not authorized" });
//     }

//     const facultydetail = await prisma.faculty.update({
//       where: { facultyId: facultyId },
//       data: { isVerified: true },
//     });

//     if (!facultydetail) {
//       return res
//         .status(403)
//         .json({ message: "Unauthorized faculty for this batch." });
//     }

//     res.status(200).json({ message: "AUTH SUCCESSFUL" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: "An error occurred while creating attendance.",
//       error: error.message,
//     });
//   }
// };

export const FacultyScanAuth = async (req, res) => {
  try {
    // Authorization header validation
    const { faculty } = req.body;
    console.log("faculty:",faculty)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token missing." });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(400).json({ message: "Token missing." });
    }

    const SECRET_KEY = new TextEncoder().encode(
      "1d396a35fb765dde12659b90154f8e23f569b7682c9f9c2608e634a7787637d225840c2e3bb8f8"
    );

    if (!SECRET_KEY) {
      return res.status(500).json({ message: "SECRET_KEY is not set." });
    }

    // Decode and validate token
    const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ["HS256"] });
    console.log(decoded);

    const now = Math.floor(Date.now() / 1000);
    if (now - decoded.timestamp > 15000) {
      return res.status(401).json({ message: "Token expired." });
    }

    const facultyId = decoded.facultyId;
    console.log(facultyId);
    if (faculty != facultyId) {
      return res.status(401).json({ message: "You are not authorized" });
    }

    // Verify and update faculty status
    const facultydetail = await prisma.faculty.update({
      where: { facultyId: facultyId },
      data: { isVerified: true },
    });

    if (!facultydetail) {
      return res.status(403).json({ message: "Unauthorized faculty for this batch." });
    }

    // Fetch the batch ID linked to the faculty
    //try this
    const isValidObjectId = (id) => ObjectId.isValid(id) && String(new ObjectId(id)) === id;

const facultyBatch = await prisma.batch.findFirst({
  where: {
    inchargeId: isValidObjectId(facultyId) ? new ObjectId(facultyId) : facultyId, // Fix here
  },
  select: { batchId: true },
});

    
    if (!facultyBatch) {
      return res.status(404).json({ message: "Batch not found for faculty." });
    }

    const batchId = facultyBatch.batchId;

    // Get today's date in the required format (YYYY-MM-DD)
    const today = new Date().toISOString().split("T")[0];

    // Get the attendance collection from MongoDB
    const attendanceCollection = await getMongoDBCollection("attendance");

    // Update attendance records for students in this batch
    const students = await prisma.student.findMany({
      where: { batchId: batchId },
      select: { id: true },
    });

    for (const student of students) {
      await attendanceCollection.updateOne(
        { student_id: new ObjectId(student.id), batch_id: new ObjectId(batchId) },
        {
          $setOnInsert: { student_id: new ObjectId(student.id), batch_id: new ObjectId(batchId), attend: {} },
          $push: { [`attend.${today}`]: 1 }, // Adding '1' (present) to today's attendance array
        },
        { upsert: true }
      );
    }

    res.status(200).json({ message: "AUTH SUCCESSFUL & Attendance updated." });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "An error occurred while creating attendance.",
      error: error.message,
    });
  }
};

// get isVerified for faculty Attendance Authorization

export const checkAndResetVerification = async (req, res) => {
  try {
    const { facultyId } = req.params;

    if (!facultyId) {
      return res.status(400).json({ message: "Faculty ID is required." });
    }

    // Check verification status
    const faculty = await prisma.faculty.findFirst({
      where: { facultyId: facultyId },
      select: { isVerified: true },
    });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found." });
    }

    if (faculty.isVerified) {
      // Reset isVerified to false
      await prisma.faculty.update({
        where: { facultyId: facultyId },
        data: { isVerified: false },
      });

      return res
        .status(200)
        .json({ message: "Faculty verified and status reset successfully." });
    } else {
      return res.status(201).json({ message: "Faculty is not verified yet." });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error checking/resetting verification status." });
  }
};

export const getSpecificFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const faculty = await prisma.faculty.findFirst({
      where: { facultyId: facultyId },
      include: {
        FacultyTimetable: true,
      },
    });
    if (!faculty) return res.status(404).json("Not found");

    // Return the faculties in the response
    res.status(200).json(faculty);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error checking/resetting verification status." });
  }
};

export const getallFaculty = async (req, res) => {
  try {
    // Fetch all faculty data from the database
    const faculties = await prisma.faculty.findMany({
      include: {
        user: true,
      },
    });

    // Return the faculties in the response
    res.status(200).json(faculties);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error checking/resetting verification status." });
  }
};
