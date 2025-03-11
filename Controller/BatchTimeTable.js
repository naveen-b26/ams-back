import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import Joi from "joi";

// Joi schema for a single period
const periodSchema = Joi.object({
  period: Joi.number().integer().min(1).max(6).required(),
  time: Joi.string().required(),
  FacultyName: Joi.string().required(),
  subject: Joi.string().required(),
});

// Joi schema for a single day (6 periods)
const daySchema = Joi.array()
  .items(periodSchema)
  .length(6) // Exactly 6 periods per day
  .required();

// Joi schema for the entire schedule (Monday to Saturday)
const scheduleSchema = Joi.object({
  Monday: daySchema,
  Tuesday: daySchema,
  Wednesday: daySchema,
  Thursday: daySchema,
  Friday: daySchema,
  Saturday: daySchema,
});

// Middleware to validate the schedule
const validateSchedule = (schedule) => {
  const { error } = scheduleSchema.validate(schedule);
  if (error) {
    throw new Error(`Invalid schedule format: ${error.details[0].message}`);
  }
};

// Validate batch_id format
const batchIdSchema = Joi.string()
  .regex(/^[a-fA-F0-9]{24}$/)
  .required()
  .messages({
    "string.pattern.base": "Batch ID must be a 24-character hex string",
  });

export const createTimetableAndUpdate = async (req, res) => {
  try {
    // Validate batch_id format
    const { Id, schedule } = req.body;
    const batch_id = Id;
    const { error } = batchIdSchema.validate(batch_id);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Validate schedule structure
    validateSchedule(schedule);

    // Check if batch exists
    const batch = await prisma.batch.findUnique({
      where: { id: batch_id },
    });
    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    // Check existing timetable
    const existingTimetable = await prisma.batchTimetable.findFirst({
      where: { batch_id: batch_id },
    });

    if (existingTimetable) {
      // Update existing timetable
      await prisma.batchTimetable.update({
        where: { id: existingTimetable.id },
        data: { schedule: schedule },
      });
      res.status(200).json({ message: "Timetable updated successfully" });
    } else {
      // Create new timetable
      const newTimetable = await prisma.batchTimetable.create({
        data: {
          batch_id: batch_id,
          schedule: schedule,
        },
      });
      res.status(201).json({
        message: "Timetable created successfully",
        data: newTimetable,
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

// Get a timetable by facultyId
export const getTimetableByBatchId = async (req, res) => {
  try {
    const { Id } = req.params;

    // Fetch the timetable
    const timetable = await prisma.batchTimetable.findFirst({
      where: { batch_id: Id },
    });

    if (!timetable) {
      return res.status(404).json({ error: "Timetable not found" });
    }

    res.status(200).json({ timetable });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving timetable" });
  }
};

// Delete a timetable by facultyId
export const deleteTimetable = async (req, res) => {
  try {
    const { facultyId } = req.params;

    // Delete the timetable
    await prisma.facultyTimetable.delete({
      where: { facultyId },
    });

    res.status(200).json({ message: "Timetable deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error deleting timetable" });
  }
};

// Dynamic update of timetable
export const updateTimetableField = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { updateData } = req.body;

    // Fetch the existing timetable
    const timetable = await prisma.facultyTimetable.findUnique({
      where: { facultyId },
    });

    if (!timetable) {
      return res.status(404).json({ error: "Timetable not found" });
    }

    // Merge the update data with the existing schedule
    const updatedSchedule = { ...timetable.schedule, ...updateData };

    // Validate the updated schedule using Joi
    validateSchedule(updatedSchedule);

    // Update the timetable in the database
    const updatedTimetable = await prisma.facultyTimetable.update({
      where: { facultyId },
      data: {
        schedule: updatedSchedule,
      },
    });

    res.status(200).json({
      message: "Timetable updated successfully",
      updatedTimetable,
    });
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ error: error.message || "Error updating timetable" });
  }
};
