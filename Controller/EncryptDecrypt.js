// import crypto from "crypto";

// const secretKey = crypto.randomBytes(39).toString("hex");
// console.log(secretKey);

import dotenv from "dotenv"; // Import dotenv
dotenv.config();

import jwt from "jsonwebtoken";

const secret =
  "1d396a35fb765dde12659b90154f8e23f569b7682c9f9c2608e634a7787637d225840c2e3bb8f8";

const SECRET_KEY = secret; // Shared secret key

console.log(SECRET_KEY);
const BATCH_ID = "BATCH2024"; // The batch ID for the class
const SUBJECT_ID = "subject-101"; // The subject ID for the class
const FACULTY_ID = "faculty-999"; // The faculty ID for the class
const TIMESTAMP = Math.floor(Date.now() / 1000); // Timestamp for expiration (valid for 15 seconds)

function generateToken(batchId, subjectId, facultyId) {
  const token = jwt.sign(
    { batchId, subjectId, facultyId, timestamp: TIMESTAMP },
    SECRET_KEY,
    { expiresIn: "50min" } // Token validity for 15 seconds
  );
  return token;
}

// Example: Generate a token every 15 seconds

const token = generateToken(BATCH_ID, SUBJECT_ID, FACULTY_ID);
console.log("Generated Token:", token);
