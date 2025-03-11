import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkConnection() {
  try {
    // Test the connection by querying a simple operation
    await prisma.$connect();
    console.log("Prisma is successfully connected to MongoDB.");
  } catch (error) {
    console.error("Error connecting to MongoDB with Prisma:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the connection check
export default checkConnection;
