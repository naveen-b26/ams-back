import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Controller function to add a new course
export const addNewCourse = async (req, res) => {
  try {
    const { courseID, name, duration } = req.body;

    // Validate the input
    if (!courseID || !name || !duration) {
      return res
        .status(400)
        .json({ error: "All fields are required: courseID, name, duration." });
    }

    const existed = await prisma.course.findFirst({
      where: { courseID: courseID },
    });

    if (existed) {
      return res.status(401).json({ error: "Course is already added." });
    }

    // Create a new course in the database
    const newCourse = await prisma.course.create({
      data: {
        courseID,
        name,
        duration,
      },
    });

    return res
      .status(201)
      .json({ message: "Course created successfully.", course: newCourse });
  } catch (error) {
    console.error("Error creating course:", error);

    // Handle unique constraint error
    if (error.code === "P2002" && error.meta.target.includes("courseID")) {
      return res.status(409).json({ error: "Course ID already exists." });
    }

    return res.status(500).json({ error: "Internal server error." });
  }
};

export const getCourses = async (req, res) => {
  try {
    const coures = await prisma.course.findMany();
    if (!coures) {
      return res.status(404).json({ message: "Course not found" });
    }

    return res.status(200).json(coures);
  } catch (error) {
    console.error("Error creating course:", error);

    return res.status(500).json({ error: "Internal server error." });
  }
};
