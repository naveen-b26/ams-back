import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import validator from "validator";

const prisma = new PrismaClient();

// Helper function to hash passwords
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

export const newAdmin = async (req, res) => {
  const {
    adminId,
    name,
    experience,
    designation,
    department,
    email,
    password,
    gender,
  } = req.body;

  try {
    // Check if the admin already exists
    const existingAdmin = await prisma.admin.findFirst({ where: { adminId } });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ error: "Admin with this AdminID already exists." });
    }

    const existingUserAdmin = await prisma.user.findFirst({
      where: { userID: adminId },
    });
    if (existingUserAdmin) {
      return res.status(400).json({ message: "Admin already exists in User." });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    // Validate gender
    const allowedGenders = ["MALE", "FEMALE", "OTHER"];
    const updatedGender = gender.toUpperCase();
    if (!allowedGenders.includes(updatedGender)) {
      return res.status(400).json({ message: "Invalid gender." });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the admin record
    const newAdminCreate = await prisma.admin.create({
      data: {
        adminId,
        name,
        experience,
        designation,
        department,
        batchIds: [],
      },
    });

    // Create the associated user record
    const newUserAdmin = await prisma.user.create({
      data: {
        userID: adminId,
        role: "ADMIN",
        email,
        password: hashedPassword,
        gender: updatedGender,
        phy_ID: "null",
        roleId: newAdminCreate.id,
      },
    });

    // Return success response
    res.status(200).json({
      createdAdmin: newAdminCreate,
      ADMIN_USER: newUserAdmin,
    });
  } catch (error) {
    console.error("Error creating Admin:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateAdmin = async (req, res) => {
  const { adminId, name, experience, designation, department, email } =
    req.body;

  try {
    // Step 1: Check if the admin exists
    const existingAdmin = await prisma.admin.findFirst({ where: { adminId } });
    if (!existingAdmin) {
      return res
        .status(404)
        .json({ error: "Admin with this AdminID does not exist." });
    }

    // Step 2: Check if the associated user exists
    const existingUserAdmin = await prisma.user.findFirst({
      where: { userID: adminId },
    });
    if (!existingUserAdmin) {
      return res
        .status(404)
        .json({ error: "Associated user for this AdminID does not exist." });
    }

    // Step 3: Validate the new email (if provided)
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    // Step 4: Update the admin fields
    const updatedAdmin = await prisma.admin.update({
      where: { adminId },
      data: {
        name: name || existingAdmin.name,
        experience: experience || existingAdmin.experience,
        designation: designation || existingAdmin.designation,
        department: department || existingAdmin.department,
      },
    });

    // Step 5: Update the user email (if provided)
    const updatedUserAdmin = await prisma.user.update({
      where: { userID: adminId },
      data: {
        email: email || existingUserAdmin.email,
      },
    });

    // Step 6: Return success response
    res.status(200).json({
      updatedAdmin,
      updatedUser: updatedUserAdmin,
    });
  } catch (error) {
    console.error("Error updating Admin:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAllAdmins = async (req, res) => {
  try {
    // Fetch all admins with user and ManagedBatches included
    const admins = await prisma.admin.findMany({
      include: {
        user: true, // Include the associated user record
        ManagedBatches: true, // Include the ManagedBatches relationship
      },
    });

    // Return the list of admins
    res.status(200).json({ admins });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAdminById = async (req, res) => {
  const { adminId } = req.params; // Extract adminId from URL parameters

  try {
    // Fetch the admin by adminId with user and ManagedBatches included
    const admin = await prisma.admin.findFirst({
      where: { adminId },
      include: {
        user: true, // Include the associated user record
        ManagedBatches: true, // Include the ManagedBatches relationship
      },
    });

    // Check if the admin exists
    if (!admin) {
      return res.status(404).json({ error: "Admin not found." });
    }

    // Return the admin details
    res.status(200).json({ admin });
  } catch (error) {
    console.error("Error fetching admin:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteAdmin = async (req, res) => {
  const { id } = req.params; // Extract adminId from URL parameters

  try {
    // Step 1: Check if the admin exists
    const existingAdmin = await prisma.admin.findFirst({ where: { id: id } });
    if (!existingAdmin) {
      return res.status(404).json({ error: "Admin not found." });
    }

    // Step 2: Remove adminId from batch.adminIds in MongoDB
    // await prisma.$queryRaw`
    //   UPDATE "batch"
    //   SET "adminIds" = array_remove("adminIds", ${id})
    //   WHERE "adminIds" @> ARRAY[${id}]::text[]
    // `;

    // Step 3: Delete the associated user record
    await prisma.user.delete({
      where: { userID: existingAdmin.adminId },
    });

    // Step 4: Delete the admin record
    const deletedAdmin = await prisma.admin.delete({
      where: { id: id },
    });

    // Step 5: Return success response
    res.status(200).json({
      message: "Admin and associated user deleted successfully.",
      deletedAdmin,
    });
  } catch (error) {
    console.error("Error deleting admin:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
