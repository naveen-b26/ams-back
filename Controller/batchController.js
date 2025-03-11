import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const newBatch = async (req, res) => {
  const newBatch = req.body;
  const {
    batchId,
    name,
    branch,
    Batchyear,
    InchargeId,
    studentId,
    deoIds,
    adminIds,
  } = newBatch;

  try {
    // Check if a batch with the same batchId already exists
    const existingBatch = await prisma.batch.findUnique({
      where: { batchId: batchId },
    });
    if (existingBatch) {
      return res.status(400).json({ error: "Batch already exists." });
    }

    // Check if the faculty (Incharge) exists
    const faculty = await prisma.faculty.findFirst({
      where: { id: InchargeId },
    });
    if (!faculty) {
      return res.status(401).json({ error: "Faculty does not exist." });
    }

    // Validate and fetch the MongoDB _id for each studentId
    const studentIdsArray = Array.isArray(studentId) ? studentId : [studentId]; // Ensure it's an array
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIdsArray }, // Find all students whose studentId matches the input
      },
    });
    // If any studentId is invalid, return an error
    if (students.length !== studentIdsArray.length) {
      return res
        .status(400)
        .json({ error: "One or more student IDs are invalid." });
    }
    const studentMongoIds = students.map((student) => student.id);

    // Validate and fetch the MongoDB _id for each adminId
    const adminIdsArray = Array.isArray(adminIds) ? adminIds : [adminIds]; // Ensure it's an array
    const admins = await prisma.admin.findMany({
      where: {
        id: { in: adminIdsArray }, // Find all admins whose adminId matches the input
      },
    });
    // If any adminId is invalid, return an error
    if (admins.length !== adminIdsArray.length) {
      return res
        .status(400)
        .json({ error: "One or more admin IDs are invalid." });
    }
    const adminMongoIds = admins.map((admin) => admin.id);

    // Validate and fetch the MongoDB _id for each deoId
    const deoIdsArray = Array.isArray(deoIds) ? deoIds : [deoIds]; // Ensure it's an array
    const deos = await prisma.deo.findMany({
      where: {
        id: { in: deoIdsArray }, // Find all DEOs whose deoId matches the input
      },
    });
    // If any deoId is invalid, return an error
    if (deos.length !== deoIdsArray.length) {
      return res
        .status(400)
        .json({ error: "One or more DEO IDs are invalid." });
    }
    const deoMongoIds = deos.map((deo) => deo.id);

    // Create the Batch with the validated studentIds, adminIds, and deoIds
    const createdBatch = await prisma.batch.create({
      data: {
        batchId,
        name,
        branch,
        Batchyear,
        inchargeId: InchargeId,
        studentIds: studentMongoIds, // Store the MongoDB _id of students
        adminIds: adminMongoIds, // Store the MongoDB _id of admins
        deoIds: deoMongoIds, // Store the MongoDB _id of DEOs
      },
    });

    // Update the students to include the new batch's _id in their batchIds array
    await prisma.student.updateMany({
      where: {
        id: { in: studentMongoIds }, // Update only the students in the batch
      },
      data: {
        batchIds: {
          push: createdBatch.id, // Add the new batch's _id to the batchIds array
        },
      },
    });

    // Update the admins to include the new batch's _id in their batchIds array
    await prisma.admin.updateMany({
      where: {
        id: { in: adminMongoIds }, // Update only the admins in the batch
      },
      data: {
        batchIds: {
          push: createdBatch.id, // Add the new batch's _id to the batchIds array
        },
      },
    });

    // Update the DEOs to include the new batch's _id in their batchIds array
    await prisma.deo.updateMany({
      where: {
        id: { in: deoMongoIds }, // Update only the DEOs in the batch
      },
      data: {
        batchIds: {
          push: createdBatch.id, // Add the new batch's _id to the batchIds array
        },
      },
    });

    // Return the created batch
    res.status(200).json(createdBatch);
  } catch (error) {
    console.error("Error creating batch:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const StudentAddToBatch = async (req, res) => {
  const { studentId, batchId } = req.body;

  try {
    // Fetch student and batch by their unique IDs
    const student = await prisma.student.findUnique({
      where: { studentId },
      select: { id: true, batchIds: true },
    });
    if (!student) return res.status(404).json({ error: "Student not found" });

    const batch = await prisma.batch.findUnique({
      where: { batchId },
      select: { id: true, studentIds: true },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    // Check for existing associations
    if (batch.studentIds.includes(student.id)) {
      return res.status(400).json({ error: "Student already in batch" });
    }
    if (student.batchIds.includes(batch.id)) {
      return res.status(400).json({ error: "Batch already linked to student" });
    }

    // Update both arrays atomically
    await prisma.$transaction([
      prisma.batch.update({
        where: { id: batch.id },
        data: { studentIds: { push: student.id } },
      }),
      prisma.student.update({
        where: { id: student.id },
        data: { batchIds: { push: batch.id } },
      }),
    ]);

    res.status(200).json({ message: "Student added to batch successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const FacultyAddToBatch = async (req, res) => {
  const { facultyId, batchId } = req.body;

  try {
    // Fetch student and batch by their unique IDs
    const faculty = await prisma.faculty.findUnique({
      where: { facultyId: facultyId },
    });
    if (!faculty) return res.status(404).json({ error: "Faculty not found" });

    const batch = await prisma.batch.findUnique({
      where: { batchId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    // Check for existing associations
    if (batch.inchargeId.includes(faculty.id)) {
      return res.status(400).json({ error: "Faculty already in batch" });
    }

    // Update both arrays atomically
    await prisma.$transaction([
      prisma.batch.update({
        where: { id: batch.id },
        data: { inchargeId: faculty.id },
      }),
    ]);

    res.status(200).json({ message: "Faculty added to batch successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const DeoAddToBatch = async (req, res) => {
  const { deoId, batchId } = req.body;
  try {
    // Fetch student and batch by their unique IDs
    const deo = await prisma.deo.findUnique({
      where: { deoId: deoId },
    });
    if (!deo) return res.status(404).json({ error: "Deo not found" });

    const batch = await prisma.batch.findUnique({
      where: { batchId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    // Check for existing associations
    if (batch.deoIds.includes(deo.id)) {
      return res.status(400).json({ error: "deo already in batch" });
    }

    // Update both arrays atomically
    await prisma.$transaction([
      prisma.batch.update({
        where: { id: batch.id },
        data: { deoIds: { push: deo.id } },
      }),
      prisma.deo.update({
        where: { id: deo.id },
        data: { batchIds: { push: batch.id } },
      }),
    ]);

    res.status(200).json({ message: "Deo added to batch successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const AdminAddToBatch = async (req, res) => {
  const { adminId, batchId } = req.body;
  try {
    // Fetch student and batch by their unique IDs
    const admin = await prisma.admin.findUnique({
      where: { adminId: adminId },
    });
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    const batch = await prisma.batch.findUnique({
      where: { batchId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    // Check for existing associations
    if (batch.adminIds.includes(admin.id)) {
      return res.status(400).json({ error: "Admin already in batch" });
    }

    // Update both arrays atomically
    await prisma.$transaction([
      prisma.batch.update({
        where: { id: batch.id },
        data: { adminIds: { push: admin.id } },
      }),
      prisma.admin.update({
        where: { id: admin.id },
        data: { batchIds: { push: batch.id } },
      }),
    ]);

    res.status(200).json({ message: "Admin added to batch successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getbatchDetails = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Fetch batch details with students included
    const batchDetails = await prisma.batch.findFirst({
      where: { batchId: batchId },
      include: { students: true },
    });

    if (!batchDetails) {
      return res.status(404).json({ message: "Batch not found" });
    }

    return res.status(200).json({ batchDetails });
  } catch (error) {
    console.error("Error in fetching batch details:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const getbatchDetailsFaculty = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Fetch batch details with students included
    const batchDetails = await prisma.batch.findFirst({
      where: { batchId: batchId },
      include: { faculty: true },
    });

    if (!batchDetails) {
      return res.status(404).json({ message: "Batch not found" });
    }
    const faculty = batchDetails?.faculty;
    return res.status(200).json({ faculty });
  } catch (error) {
    console.error("Error in fetching batch details:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const getbatchDetailsDeos = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Fetch batch details with students included
    const batchDetails = await prisma.batch.findFirst({
      where: { batchId: batchId },
      include: { deo: true },
    });

    if (!batchDetails) {
      return res.status(404).json({ message: "Batch not found" });
    }
    const Deo = batchDetails?.deo;
    return res.status(200).json({ Deo });
  } catch (error) {
    console.error("Error in fetching batch details:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const getbatchDetailsAdmins = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Fetch batch details with students included
    const batchDetails = await prisma.batch.findFirst({
      where: { batchId: batchId },
      include: { admin: true },
    });

    if (!batchDetails) {
      return res.status(404).json({ message: "Batch not found" });
    }
    console.log(batchDetails);
    const admin = batchDetails?.admin;
    return res.status(200).json({ admin });
  } catch (error) {
    console.error("Error in fetching batch details:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const DeleteBatch = async (req, res) => {
  const { batchId } = req.params;
  try {
    // 1. Fetch the batch to delete (to get its studentIds)
    const batch = await prisma.batch.findUnique({
      where: { batchId: batchId },
      select: { id: true, studentIds: true },
    });

    if (!batch) {
      throw new Error(`Batch with ID ${batchId} not found.`);
    }

    // 2. Update all students by removing the batch ID from their batchIds array
    const updatePromises = batch.studentIds.map(async (studentId) => {
      // Fetch the student's current batchIds array
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { batchIds: true },
      });

      if (!student) {
        throw new Error(`Student with ID ${studentId} not found.`);
      }

      // Filter out the batch ID to remove
      const updatedBatchIds = student.batchIds.filter((id) => id !== batch.id);

      // Update the student's batchIds array using `set`
      return prisma.student.update({
        where: { id: studentId },
        data: {
          batchIds: {
            set: updatedBatchIds,
          },
        },
      });
    });

    // 3. Wait for all student updates to complete
    await Promise.all(updatePromises);

    // 4. Handle batchTimetable entries (delete them or set batchId to null)
    // Example 1: Delete all batchTimetable entries linked to this batch
    await prisma.batchTimetable.deleteMany({
      where: { batch_id: batch.id },
    });

    // Example 2: If batchId is nullable, set to null
    // await prisma.batchTimetable.updateMany({
    //   where: { batchId: batch.id },
    //   data: { batchId: null },
    // });

    // 5. Delete the batch
    await prisma.batch.delete({
      where: { id: batch.id },
    });

    return `Batch ${batchId} deleted successfully, and students updated.`;
  } catch (error) {
    console.error("Error deleting batch:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

export const DeleteStudentFromBatch = async (req, res) => {
  const { batchId, studentId } = req.params;

  try {
    // Find existing records
    const batch = await prisma.batch.findUnique({
      where: { batchId },
      select: { id: true, studentIds: true },
    });

    const student = await prisma.student.findUnique({
      where: { studentId },
      select: { id: true, batchIds: true },
    });

    // Validation
    if (!batch || !student) {
      return res.status(404).json({ error: "Student or batch not found" });
    }
    if (!batch.studentIds.includes(student.id)) {
      return res.status(400).json({ error: "Student not in this batch" });
    }

    // Atomic update
    await prisma.$transaction([
      prisma.batch.update({
        where: { id: batch.id },
        data: {
          studentIds: {
            set: batch.studentIds.filter((id) => id !== student.id),
          },
        },
      }),
      prisma.student.update({
        where: { id: student.id },
        data: {
          batchIds: {
            set: student.batchIds.filter((id) => id !== batch.id),
          },
        },
      }),
    ]);

    // Return updated student list
    const updatedBatch = await prisma.batch.findUnique({
      where: { id: batch.id },
      include: { students: true },
    });

    res.json(updatedBatch.students);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const DeleteDeoFromBatch = async (req, res) => {
  const { batchId, deoId } = req.params;

  try {
    // Find existing records
    const batch = await prisma.batch.findUnique({
      where: { batchId },
      select: { id: true, deoIds: true },
    });

    const deo = await prisma.deo.findUnique({
      where: { deoId: deoId },
      select: { id: true, batchIds: true },
    });

    // Validation
    if (!batch || !deo) {
      return res.status(404).json({ error: "deo or batch not found" });
    }
    if (!batch.deoIds.includes(deo.id)) {
      return res.status(400).json({ error: "deo not in this batch" });
    }

    // Atomic update
    await prisma.$transaction([
      prisma.batch.update({
        where: { id: batch.id },
        data: {
          deoIds: {
            set: batch.deoIds.filter((id) => id !== deo.id),
          },
        },
      }),
      prisma.deo.update({
        where: { id: deo.id },
        data: {
          batchIds: {
            set: deo.batchIds.filter((id) => id !== batch.id),
          },
        },
      }),
    ]);

    // Return updated student list
    const updatedBatch = await prisma.batch.findUnique({
      where: { id: batch.id },
      include: { deo: true },
    });

    res.json(updatedBatch.deo);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const DeleteAdminFromBatch = async (req, res) => {
  const { batchId, adminId } = req.params;

  try {
    // Find existing records
    const batch = await prisma.batch.findUnique({
      where: { batchId },
      select: { id: true, adminIds: true },
    });

    const admin = await prisma.admin.findUnique({
      where: { adminId: adminId },
      select: { id: true, batchIds: true },
    });

    // Validation
    if (!batch || !admin) {
      return res.status(404).json({ error: "admin or batch not found" });
    }
    if (!batch.adminIds.includes(admin.id)) {
      return res.status(400).json({ error: "admin not in this batch" });
    }

    // Atomic update
    await prisma.$transaction([
      prisma.batch.update({
        where: { id: batch.id },
        data: {
          adminIds: {
            set: batch.adminIds.filter((id) => id !== admin.id),
          },
        },
      }),
      prisma.admin.update({
        where: { id: admin.id },
        data: {
          batchIds: {
            set: admin.batchIds.filter((id) => id !== batch.id),
          },
        },
      }),
    ]);

    // Return updated student list
    const updatedBatch = await prisma.batch.findUnique({
      where: { id: batch.id },
      include: { admin: true },
    });

    res.json(updatedBatch.admin);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getbatchWithStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch batch details with students included
    const batchDetails = await prisma.batch.findFirst({
      where: { id: id },
      include: {
        students: true, // Include related students
      },
    });

    if (!batchDetails) {
      return res.status(404).json({ message: "Batch not found" });
    }

    // Transform the students array to exclude the `batchIds` field
    const transformedStudents = batchDetails.students.map((student) => {
      const { batchIds, ...otherStudentDetails } = student; // Exclude `batchIds`
      return otherStudentDetails;
    });

    // Construct the final response without `batchIds`
    const { studentIds, ...otherDetails } = batchDetails; // Optionally exclude `studentIds` if needed
    return res.status(200).json({
      ...otherDetails,
      students: transformedStudents, // Use the transformed students array
    });
  } catch (error) {
    console.error("Error in fetching batch details:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// batch timetable for each class timetable
export const retriveStudentTimeTable = async (req, res) => {
  const { batchId } = req.body;
  try {
    const BatchDetails = await prisma.batch.findFirst({
      where: { batchId },
    });
    if (!BatchDetails) {
      return res.status(401).json({ message: "Invalid" });
    }
    const timetable = BatchDetails.schedule;

    return res.status(200).json({
      message: "Success",
      timetable: timetable,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBatches = async (req, res) => {
  try {
    const batch = await prisma.batch.findMany({
      include: { students: true, batchTimetable: true, faculty: true },
    });
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    return res.status(200).json(batch);
  } catch (error) {
    console.error("Error in fetching batch details:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const schedule = [
  {
    day: "Monday",
    periods: [
      { period: 1, time: "9:30 - 10:20", faculty: null, subject: null },
      { period: 2, time: "10:20 - 11:10", faculty: null, subject: null },
      { period: 3, time: "11:10 - 12:00", faculty: null, subject: null },
      { period: 4, time: "12:00 - 1:00", faculty: null, subject: null },
      { period: 5, time: "1:00 - 1:50", faculty: null, subject: null },
      { period: 6, time: "1:50 - 2:40", faculty: null, subject: null },
      { period: 7, time: "2:40 - 3:30", faculty: null, subject: null },
      { period: 8, time: "3:30 - 4:20", faculty: null, subject: null },
    ],
  },
  {
    day: "Tuesday",
    periods: [
      { period: 1, time: "9:30 - 10:20", faculty: null, subject: null },
      { period: 2, time: "10:20 - 11:10", faculty: null, subject: null },
      { period: 3, time: "11:10 - 12:00", faculty: null, subject: null },
      { period: 4, time: "12:00 - 1:00", faculty: null, subject: null },
      { period: 5, time: "1:00 - 1:50", faculty: null, subject: null },
      { period: 6, time: "1:50 - 2:40", faculty: null, subject: null },
      { period: 7, time: "2:40 - 3:30", faculty: null, subject: null },
      { period: 8, time: "3:30 - 4:20", faculty: null, subject: null },
    ],
  },
  {
    day: "Wednesday",
    periods: [
      { period: 1, time: "9:30 - 10:20", faculty: null, subject: null },
      { period: 2, time: "10:20 - 11:10", faculty: null, subject: null },
      { period: 3, time: "11:10 - 12:00", faculty: null, subject: null },
      { period: 4, time: "12:00 - 1:00", faculty: null, subject: null },
      { period: 5, time: "1:00 - 1:50", faculty: null, subject: null },
      { period: 6, time: "1:50 - 2:40", faculty: null, subject: null },
      { period: 7, time: "2:40 - 3:30", faculty: null, subject: null },
      { period: 8, time: "3:30 - 4:20", faculty: null, subject: null },
    ],
  },
  {
    day: "Thursday",
    periods: [
      { period: 1, time: "9:30 - 10:20", faculty: null, subject: null },
      { period: 2, time: "10:20 - 11:10", faculty: null, subject: null },
      { period: 3, time: "11:10 - 12:00", faculty: null, subject: null },
      { period: 4, time: "12:00 - 1:00", faculty: null, subject: null },
      { period: 5, time: "1:00 - 1:50", faculty: null, subject: null },
      { period: 6, time: "1:50 - 2:40", faculty: null, subject: null },
      { period: 7, time: "2:40 - 3:30", faculty: null, subject: null },
      { period: 8, time: "3:30 - 4:20", faculty: null, subject: null },
    ],
  },
  {
    day: "Friday",
    periods: [
      { period: 1, time: "9:30 - 10:20", faculty: null, subject: null },
      { period: 2, time: "10:20 - 11:10", faculty: null, subject: null },
      { period: 3, time: "11:10 - 12:00", faculty: null, subject: null },
      { period: 4, time: "12:00 - 1:00", faculty: null, subject: null },
      { period: 5, time: "1:00 - 1:50", faculty: null, subject: null },
      { period: 6, time: "1:50 - 2:40", faculty: null, subject: null },
      { period: 7, time: "2:40 - 3:30", faculty: null, subject: null },
      { period: 8, time: "3:30 - 4:20", faculty: null, subject: null },
    ],
  },
  {
    day: "Saturday",
    periods: [
      { period: 1, time: "9:30 - 10:20", faculty: null, subject: null },
      { period: 2, time: "10:20 - 11:10", faculty: null, subject: null },
      { period: 3, time: "11:10 - 12:00", faculty: null, subject: null },
      { period: 4, time: "12:00 - 1:00", faculty: null, subject: null },
      { period: 5, time: "1:00 - 1:50", faculty: null, subject: null },
      { period: 6, time: "1:50 - 2:40", faculty: null, subject: null },
      { period: 7, time: "2:40 - 3:30", faculty: null, subject: null },
      { period: 8, time: "3:30 - 4:20", faculty: null, subject: null },
    ],
  },
];
