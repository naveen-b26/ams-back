import { PrismaClient } from "@prisma/client";

import bcrypt from "bcrypt";
import validator from "validator";
const prisma = new PrismaClient();

// Helper function to hash passwords
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

export const newDeo = async (req, res) => {
  const {
    deoId,
    name,
    experience,
    designation,
    department,
    email,
    password,
    gender,
  } = req.body;

  try {
    // Check if the DEO already exists
    const existingDeo = await prisma.deo.findFirst({ where: { deoId } });

    if (existingDeo) {
      return res
        .status(400)
        .json({ error: "Deo with this DeoID already exists." });
    }

    const ExistuserDeo = await prisma.user.findFirst({
      where: { userID: deoId },
    });
    if (ExistuserDeo) {
      return res.status(400).json({ message: "Already Deo Exist in User " });
    }

    // Create the faculty
    const newdeoCreate = await prisma.deo.create({
      data: {
        deoId,
        name,
        experience,
        designation,
        department,
      },
    });

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    // Validate gender
    const allowedGenders = ["MALE", "FEMALE", "OTHER"];
    const updategender = gender.toUpperCase();
    if (!allowedGenders.includes(updategender)) {
      return res.status(400).json({ message: "Invalid gender." });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    const newUserDeo = await prisma.user.create({
      data: {
        userID: deoId,
        role: "DEO",
        email: email,
        password: hashedPassword,
        gender: updategender,
        phy_ID: "null",
        roleId: newdeoCreate.id,
      },
    });

    res.status(200).json({ createDeo: newdeoCreate, DEO_USER: newUserDeo });
  } catch (error) {
    console.error("Error creating Deo:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getallDeo = async (req, res) => {
  try {
    // Fetch all faculty data from the database
    const Deos = await prisma.deo.findMany({
      include: {
        user: true,
      },
    });

    // Return the faculties in the response
    res.status(200).json(Deos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error in getting deos." });
  }
};

export const getDeo = async (req, res) => {
  try {
    // Fetch all deo data from the database
    const { deoId } = req.params;
    const DeoDetails = await prisma.deo.findFirst({
      where: { deoId: deoId },
      include: {
        // user: true,
        ManagedBatches: true,
      },
    });

    if (!DeoDetails) {
      res.status(401).json({ message: "DEo Not Found" });
    }

    // Return the faculties in the response
    res.status(200).json(DeoDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error in getting deos." });
  }
};

export const updateDeo = async (req, res) => {
  try {
    const deoData = req.body;
    console.log(deoData);

    const { user, ...deo } = deoData;

    console.log(user);
    console.log(deo);

    // Validate required fields
    if (!deoData) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate email format
    if (!validator.isEmail(user.email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate gender
    const allowedGenders = ["MALE", "FEMALE", "OTHER"];
    const updateGender = user.gender.toUpperCase();
    if (!allowedGenders.includes(updateGender)) {
      return res.status(400).json({ message: "Invalid gender" });
    }
    // Update the DEO record
    const updatedDeo = await prisma.deo.update({
      where: { id: deo.id },
      data: {
        deoId: deo.deoId,
        name: deo.name,
        experience: deo.experience,
        designation: deo.designation,
        department: deo.department,
      },
    });

    // Update the related user record
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        gender: updateGender,
      },
    });

    // Return success response
    res.status(200).json({
      UpdatedDeo: updatedDeo,
      UpdatedUser: updatedUser,
    });
  } catch (error) {
    console.error("Error in updating DEO:", error);
    res.status(500).json({
      message: "Error in updating DEO",
      error: error.message || error,
    });
  }
};

export const deleteDeo = async (req, res) => {
  const { deoId } = req.params;

  if (!deoId) {
    return res.status(400).json({ message: "DEO ID is required" });
  }

  try {
    const [deletedDeo, deletedUser] = await prisma.$transaction([
      prisma.deo.delete({
        where: { deoId },
      }),
      prisma.user.delete({
        where: { userID: deoId },
      }),
    ]);

    res.status(200).json({
      message: "DEO and related user deleted successfully",
      deletedDeo,
      deletedUser,
    });
  } catch (error) {
    console.error("Error in deleting DEO:", error);
    res.status(500).json({
      message: "Error in deleting the DEO",
      error: error.message || error,
    });
  }
};
