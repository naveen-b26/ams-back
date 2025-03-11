import express from "express";
import {
  newDeo,
  getallDeo,
  updateDeo,
  deleteDeo,
  getDeo,
} from "../Controller/deoController.js";
const router = express.Router();

// CRUD routes
router.post("/create", newDeo); // Create a new faculty

router.get("/getdeo", getallDeo);

router.get("/:deoId", getDeo); // get single deo details with Managed Batches

router.put("/update", updateDeo);

router.delete("/delete/:deoId", deleteDeo);

export default router;
