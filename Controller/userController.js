import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import bcrypt from "bcrypt";
import validator from "validator";
import jwt from "jsonwebtoken";
// Helper function to hash passwords
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Create a new user
export const createUser = async (req, res, next) => {
  try {
    const { userID, email, password, role, gender, phy_ID } = req.body;

    // Validate required fields
    if (!userID || !email || !password || !role) {
      return res
        .status(400)
        .json({ message: "Email, password, and role are required." });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    // Validate role
    const allowedRoles = ["FACULTY", "STUDENT", "ADMIN", "DEO"];
    const updateRole = role.toUpperCase();
    if (!allowedRoles.includes(updateRole)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    // Validate gender
    const allowedGenders = ["MALE", "FEMALE", "OTHER"];
    const updategender = gender.toUpperCase();
    if (!allowedGenders.includes(updategender)) {
      return res.status(400).json({ message: "Invalid gender." });
    }

    // Check if the email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered." });
    }

    let roleId = null;
    if (updateRole == "FACULTY") {
      const Faculty = await prisma.faculty.findFirst({
        where: { facultyId: userID },
      });
      console.log(Faculty);
      roleId = Faculty.id;
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        userID,
        email,
        password: hashedPassword,
        role: updateRole,
        gender: updategender,
        phy_ID,
        roleId,
      },
    });

    // Exclude sensitive information
    const safeUser = {
      id: newUser.id,
      userID: newUser.userID,
      email: newUser.email,
      role: newUser.role,
      gender: newUser.gender,
      phy_ID: newUser.phy_ID,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    res
      .status(201)
      .json({ message: "User created successfully", user: safeUser });
  } catch (error) {
    next(error);
  }
};

// Get all users with role-specific data
export const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const users = await prisma.user.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        faculty: true,
        student: true,
        admin: true,
        deo: true,
      },
    });

    const safeUsers = users.map((user) => ({
      id: user.id,
      userID: user.userID,
      email: user.email,
      role: user.role,
      gender: user.gender,
      phy_ID: user.phy_ID,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      faculty: user.faculty ? { ...user.faculty, password: undefined } : null,
      student: user.student ? { ...user.student, password: undefined } : null,
      admin: user.admin ? { ...user.admin, password: undefined } : null,
      deo: user.deo ? { ...user.deo, password: undefined } : null,
    }));

    res.json({ message: "Users fetched successfully", users: safeUsers });
  } catch (error) {
    next(error);
  }
};

// Get a single user by ID with role-specific data
// Helper function to exclude sensitive information
const excludeSensitiveData = (entity) => {
  if (!entity) return null;
  return { ...entity, password: undefined };
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate that userID is provided
    if (!id) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // Fetch the user by userID
    const user = await prisma.user.findUnique({
      where: { userID: id },
      include: {
        faculty: true,
        student: true,
        admin: true,
        deo: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Exclude sensitive information
    const safeUser = {
      id: user.id,
      userID: user.userID,
      email: user.email,
      role: user.role,
      gender: user.gender,
      phy_ID: user.phy_ID,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      faculty: excludeSensitiveData(user.faculty),
      student: excludeSensitiveData(user.student),
      admin: excludeSensitiveData(user.admin),
      deo: excludeSensitiveData(user.deo),
    };

    res.json({ message: "User fetched successfully", user: safeUser });
  } catch (error) {
    console.error(
      `Error fetching user with userID: ${req.params.userID}`,
      error
    );
    next(error);
  }
};

// Update a user
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, role, gender, phy_ID } = req.body;

    // Validate required fields
    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required." });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    // Validate role
    const allowedRoles = ["faculty", "student", "admin", "deo"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    // Check if the user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email,
        role,
        gender,
        phy_ID,
      },
      include: {
        faculty: true,
        student: true,
        admin: true,
        deo: true,
      },
    });

    const safeUser = {
      id: updatedUser.id,
      userID: updatedUser.userID,
      email: updatedUser.email,
      role: updatedUser.role,
      gender: updatedUser.gender,
      phy_ID: updatedUser.phy_ID,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      faculty: updatedUser.faculty
        ? { ...updatedUser.faculty, password: undefined }
        : null,
      student: updatedUser.student
        ? { ...updatedUser.student, password: undefined }
        : null,
      admin: updatedUser.admin
        ? { ...updatedUser.admin, password: undefined }
        : null,
      deo: updatedUser.deo ? { ...updatedUser.deo, password: undefined } : null,
    };

    res.json({ message: "User updated successfully", user: safeUser });
  } catch (error) {
    next(error);
  }
};
// Delete a user
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    // Check if the user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete the user
    await prisma.user.delete({ where: { id } });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const webLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find user by email
    const login = await prisma.user.findFirst({ where: { email } });
    if (!login) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    // Compare hashed passwords
    const isPasswordValid = await bcrypt.compare(password, login.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    // Return role-specific data
    if (login.role === "FACULTY") {
      const RoleId = login.roleId;
      const getFaculty = await prisma.faculty.findFirst({
        where: { id: RoleId },
        include: { FacultyTimetable: true },
      });

      if (!getFaculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty profile not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Successfully logged in",
        user: {
          userId: login.userID,
          name: getFaculty.name,
          facultyId: getFaculty.facultyId,
          subject: getFaculty.subject,
          email: login.email,
          role: login.role,
          timetable: getFaculty.FacultyTimetable?.schedule || null,
        },
      });
    } else if (login.role === "DEO") {
      const DeoDetails = await prisma.deo.findFirst({
        where: { id: login.roleId },
        include: {
          ManagedBatches: true,
        },
      });

      if (!DeoDetails) {
        return res.status(404).json({
          success: false,
          message: "DEO profile not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Successfully logged in",
        user: {
          userId: login.userID,
          email: login.email,
          role: login.role,
          DeoDetails: DeoDetails,
        },
      });
    } else if (login.role === "ADMIN") {
      const admin = await prisma.admin.findFirst({
        where: { id: login.roleId },
        include: { ManagedBatches: true },
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin profile not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Successfully logged in",
        user: {
          name: admin.name,
          userId: admin.adminId,
          email: login.email,
          role: login.role,
          Admin: admin,
        },
      });
    }

    // If role is invalid or not handled
    return res.status(401).json({
      success: false,
      message: "Invalid credentials.",
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// Mobile Login
export const mobileLoginstud = async (req, res) => {
  const { userId, password, macId } = req.body;

  try {
    const login = await prisma.user.findUnique({
      where: { userID: userId },
      include: { student: true },
    });

    if (!login) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Compare hashed passwords
    const isPasswordValid = await bcrypt.compare(password, login.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    let updatedUser = login;
    if (!login.phy_ID || login.phy_ID === "null") {
      const newPhyID = macId; // update with there device Physical Id
      updatedUser = await prisma.user.update({
        where: { userID: userId },
        data: { phy_ID: newPhyID },
      });
    } else if (login.phy_ID !== macId) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.status(200).json({
      message: "Successfully logged in",
      name: login.student.name,
      userid: login.userID,
      email: login.email,
      gender: login.gender,
      mobile: login.student.phoneNumber,
      parentmobile: login.student.parentNumber,
      student_id: login.student.id,
      batchIds: login.student.batchIds,
      department: login.student.department + " " + login.student.section,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update the password and Reset the Password
export const mobileStudPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    // Validate required fields
    if (!userId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "User ID and new password are required.",
      });
    }

    const login = await prisma.user.findUnique({ where: { userID: userId } });
    if (!login) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Compare hashed passwords
    const isSamePassword = await bcrypt.compare(newPassword, login.password);
    if (isSamePassword) {
      return res.status(401).json({ message: "Password is already in use." });
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update the password
    await prisma.user.update({
      where: { userID: userId },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Faculty App Mobile Login
export const mobileLoginFaculty = async (req, res) => {
  const { email, password, macId } = req.body;

  try {
    // Validate required fields
    if (!email || !password || !macId) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and MAC ID are required.",
      });
    }

    // Find the user
    const login = await prisma.user.findUnique({
      where: { email },
      include: { faculty: true },
    });

    if (!login) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Validate password (use bcrypt for secure comparison)
    const isPasswordValid = await bcrypt.compare(password, login.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    // Update phy_ID if it is not set
    if (!login.phy_ID || login.phy_ID === "") {
      await prisma.user.update({
        where: { email },
        data: { phy_ID: macId },
      });
    }

    // Validate MAC ID match
    if (login.phy_ID !== macId) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid device credentials." });
    }

    // Return faculty-specific data
    if (!login.faculty) {
      return res
        .status(404)
        .json({ success: false, message: "Faculty details not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Successfully logged in.",
      facultyId: login.userID,
      name: login.faculty.name,
      email: login.email,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Faculty Password Reset Password
export const mobileFacultyPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    // Validate required fields
    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required.",
      });
    }

    // Find the user
    const login = await prisma.user.findUnique({
      where: { email },
    });

    if (!login) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Compare hashed passwords
    const isSamePassword = await bcrypt.compare(newPassword, login.password);
    if (isSamePassword) {
      return res.status(401).json({
        success: false,
        message: "New password must be different from the current password.",
      });
    }

    // Validate password strength (example: minimum length of 8 characters)
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
