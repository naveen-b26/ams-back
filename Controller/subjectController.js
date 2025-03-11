import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Create a new subject
export const createSubject = async (req, res) => {
  try {
    const { subjectId, name, department, facultyIds } = req.body;

    const existsubject = await prisma.subject.findFirst({
      where: { subjectId },
    });

    if (existsubject) {
      return res.status(200).json({ message: "Subject already exists" });
    }

    const subject = await prisma.subject.create({
      data: {
        subjectId,
        name,
        department,
        facultyIds, // Store an array of faculty IDs
      },
    });

    res.status(201).json({ message: "Subject created successfully", subject });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating subject" });
  }
};

// Get a subject by subjectId
export const getSubjectById = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { subjectId },
      include: { faculty: true }, // Include related faculty data if needed
    });

    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    res.status(200).json({ subject });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving subject" });
  }
};

// Update a subject by subjectId
export const updateSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { name, department, facultyIds } = req.body;

    const updatedSubject = await prisma.subject.update({
      where: { subjectId },
      data: {
        name,
        department,
        facultyIds, // Update the facultyId array
      },
    });

    res
      .status(200)
      .json({ message: "Subject updated successfully", updatedSubject });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error updating subject" });
  }
};

// Delete a subject by subjectId
export const deleteSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    await prisma.subject.delete({
      where: { subjectId },
    });

    res.status(200).json({ message: "Subject deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error deleting subject" });
  }
};
