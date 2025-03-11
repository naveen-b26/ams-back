import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import express from "express";
const router = express.Router();
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import { ObjectId } from "mongodb";
const prisma = new PrismaClient();

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

// Multer Setup (File Upload)
const storage = multer.memoryStorage();

const upload = multer({ storage });
// Upload
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ error: "User ID is required" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Convert buffer to stream for Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        format: req.file.mimetype.split("/")[1], // Preserve original format
      },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary Error:", error);
          return res.status(500).json({ error: "Cloudinary upload failed" });
        }

        // Save to database
        const newImage = await prisma.image.create({
          data: {
            imageUrl: result.secure_url,
            publicId: result.public_id,
            userId: userId,
          },
        });

        res.json({ message: "Image Uploaded Successfully", image: newImage });
      }
    );

    // Pipe the buffer to the Cloudinary stream
    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Get image
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const image = await prisma.image.findUnique({
      where: { userId: userId },
    });
    res.json(image);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Image from Cloudinary and MongoDB
router.delete("/image/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;

    // Fetch image details from database
    const image = await prisma.image.findUnique({
      where: { id: imageId },
    });

    if (!image) return res.status(404).json({ error: "Image not found" });

    // Delete image from Cloudinary
    await cloudinary.uploader.destroy(image.publicId);

    // Delete image from database
    await prisma.image.delete({
      where: { id: imageId },
    });

    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
