import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

import bcrypt from "bcrypt";
import validator from "validator";
// Helper function to hash passwords
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

export const newStudent = async (req, res) => {
  try {
    const {
      studentId,
      name,
      department,
      section,
      batchStartYear,
      batchEndYear,
      phoneNumber,
      parentNumber,
      email,
      password,
      gender,
    } = req.body;

    // Validate required fields
    if (!studentId || !email || !password || !gender || !department || !name) {
      return res.status(400).json({
        message: "All fields are required!",
      });
    }

    const existingStudent = await prisma.student.findUnique({
      where: { studentId: studentId },
    });
    const existingUserStudent = await prisma.user.findUnique({
      where: { userID: studentId },
    });
    if (existingStudent || existingUserStudent) {
      return res.status(400).json({
        error: "Student with this studentId already exists.",
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

    // Create the student
    const newstudent = await prisma.student.create({
      data: {
        studentId,
        name,
        department: upperCaseDepartment,
        section,
        batchYear: `${batchStartYear}-${batchEndYear}`,
        phoneNumber,
        parentNumber,
        attendancePercentage: "0%", // Default value or adjust as needed
        batchIds: [],
      },
    });

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the user record
    const newUserStudent = await prisma.user.create({
      data: {
        userID: studentId,
        email,
        role: "STUDENT",
        password: hashedPassword,
        gender: updateGender,
        phy_ID: "null", // Placeholder
        roleId: newstudent.id,
      },
    });

    // Return the created student and user details
    res.status(201).json({
      message: "Student and user created successfully.",
      newStudentDetails: newstudent,
      newUserStudentDetails: newUserStudent,
    });
  } catch (error) {
    console.error("Error creating Student:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const bulkAddStudents = async (req, res) => {
  try {
    const studentsData = req.body;
    console.log(studentsData);
    if (!Array.isArray(studentsData)) {
      return res.status(400).json({
        message: "Expected an array of student data.",
      });
    }

    const results = await Promise.all(
      studentsData.map(async (student) => {
        try {
          return await addSingleStudent(student);
        } catch (error) {
          return { success: false, message: error.message };
        }
      })
    );

    const allSuccess = results.every((result) => result.success);
    if (allSuccess) {
      return res.status(201).json({
        message: "All students added successfully.",
        results,
      });
    } else {
      return res.status(400).json({
        message: "Some students failed to add.",
        results,
      });
    }
  } catch (error) {
    console.error("Error creating Students in bulk:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const addSingleStudent = async (studentData) => {
  const {
    studentId,
    name,
    department,
    section,
    batchStartYear,
    batchEndYear,
    phoneNumber,
    parentNumber,
    email,
    password,
    gender,
  } = studentData;

  // Validate required fields
  if (!studentId || !email || !password || !gender || !department || !name) {
    return { success: false, message: "All fields are required!" };
  }

  const existingStudent = await prisma.student.findUnique({
    where: { studentId: studentId },
  });
  const existingUserStudent = await prisma.user.findUnique({
    where: { userID: studentId },
  });
  if (existingStudent || existingUserStudent) {
    return {
      success: false,
      message: "Student with this studentId already exists.",
    };
  }

  // Validate email format
  if (!validator.isEmail(email)) {
    return { success: false, message: "Invalid email format." };
  }

  // Validate gender
  const allowedGenders = ["MALE", "FEMALE", "OTHER"];
  const updateGender = gender.toUpperCase();
  if (!allowedGenders.includes(updateGender)) {
    return { success: false, message: "Invalid gender." };
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
    return { success: false, message: "Invalid Department" };
  }

  // Create the student
  const newstudent = await prisma.student.create({
    data: {
      studentId,
      name,
      department: upperCaseDepartment,
      section,
      batchYear: `${batchStartYear}-${batchEndYear}`,
      phoneNumber,
      parentNumber,
      attendancePercentage: "0%",
      batchIds: [],
    },
  });

  // Hash the password
  const hashedPassword = await hashPassword(password);

  // Create the user record
  const newUserStudent = await prisma.user.create({
    data: {
      userID: studentId,
      email,
      role: "STUDENT",
      password: hashedPassword,
      gender: updateGender,
      phy_ID: "null", // Placeholder
      roleId: newstudent.id,
    },
  });

  return {
    success: true,
    newStudentDetails: newstudent,
    newUserStudentDetails: newUserStudent,
  };
};

export const updateStudent = async (req, res) => {
  try {
    const studentDetails = req.body;
    const { user, student } = studentDetails;

    // Log the received data for debugging
    console.log("Received student details:", studentDetails);
    console.log("Student:", student);
    console.log("User:", user);

    if (!studentDetails || !student || !user) {
      return res
        .status(400)
        .json({ message: "Student and User Data are required" });
    }

    // Validate gender
    const allowedGenders = ["MALE", "FEMALE", "OTHER"];
    const updateGender = user.gender ? user.gender.toUpperCase() : null;
    if (!updateGender || !allowedGenders.includes(updateGender)) {
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
    const upperCaseDepartment = student.department
      ? student.department.toUpperCase()
      : null;
    if (
      !upperCaseDepartment ||
      !validDepartments.includes(upperCaseDepartment)
    ) {
      return res.status(400).json({ error: "Invalid Department" });
    }

    // Check if student exists
    const existingStudent = await prisma.student.findFirst({
      where: { studentId: student.studentId },
    });
    if (!existingStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { userID: user.studentId },
    });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const UpdateStudent = await prisma.student.update({
      where: { id: existingStudent.id },
      data: {
        studentId: student.studentId,
        name: student.name,
        department: upperCaseDepartment,
        batchYear: student.batchYear,
        parentNumber: student.parentNumber,
        phoneNumber: student.phoneNumber,
        attendancePercentage: student.attendancePercentage,
      },
    });

    const updatedUserStudent = await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        userID: student.studentId,
        email: user.email,
        gender: updateGender,
      },
    });

    res.status(201).json({
      updatedStudentDetails: UpdateStudent,
      updatedUserStudentDetails: updatedUserStudent,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error in updating the Student", error });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    console.log(studentId);
    if (!studentId) {
      return res.status(400).json({ message: "Student ID is required" });
    }

    const user = await prisma.user.findUnique({
      where: { userID: studentId },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Check and delete the faculty record
    const student = await prisma.student.findUnique({
      where: { studentId: studentId },
    });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    await prisma.student.delete({
      where: { studentId: studentId },
    });

    // Check and delete the associated user record
    await prisma.user.delete({
      where: { userID: studentId },
    });

    res.status(200).json({
      message: "Student deleted successfully",
      deletedStudent: student,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error in deleting the faculty",
      error: error.message || error,
    });
  }
};

export const allstudentsDepartmentDetails = async (req, res) => {
  try {
    const { className } = req.params;

    // Step 1: Find the batchId by matching the batchName
    const batch = await prisma.batch.findFirst({
        where: { name: className }, // Assuming batchName is the field storing department names
        select: { id: true } // Retrieve only the ID
    });

    if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
    }

    // Step 2: Use the batch ID to find students
    const students = await prisma.student.findMany({
        where: { batchIds: { has: batch.id } }
    });

    res.status(200).json(students);
} 
 catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error occured." });
  }
};

export const allstudentsDetails = async (req, res) => {
  try {
    // Fetch all students data from the database
    const students = await prisma.student.findMany({ include: { user: true } });

    // Return the faculties in the response
    res.status(200).json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error occured." });
  }
};

export const studentDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch student details with batches included
    const student = await prisma.student.findFirst({
      where: { id: id },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Construct the final response
    const responseData = {
      student,
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error occurred." });
  }
};

export const studentWithBatchDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch student details with batches included
    const student = await prisma.student.findFirst({
      where: { id: id },
      include: {
        batches: true, // Include related batches
      },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Exclude `batchIds` from the main student object
    const { batchIds, ...otherStudentDetails } = student;

    // Transform the `batches` array to exclude `studentIds`
    const transformedBatches = student.batches.map((batch) => {
      const { studentIds, ...otherBatchDetails } = batch; // Exclude `studentIds`
      return otherBatchDetails;
    });

    // Construct the final response
    const responseData = {
      ...otherStudentDetails,
      batches: transformedBatches, // Use the transformed batches array
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error occurred." });
  }
};
