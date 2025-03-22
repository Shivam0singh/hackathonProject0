require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const app = express();
const PORT = process.env.PORT || 5001;
const mongoUrl = process.env.MONGO_URI;
const Cycle = require("./models/Cycle");
// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
// Middleware to verify JWT token
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  jwt.verify(token, "your-secret-key", (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = decoded; // Attach user data to the request object
    next();
  });
};
// Connect to MongoDB
mongoose.connect(mongoUrl)
  .then(() => console.log("Connected to MongoDB successfully!"))
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  });
// Routes
// Register a new user
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  console.log("Register request received:", { username, password });
  try {
    const user = new User({ username, password });
    await user.save();
    console.log("User saved to database:", user); // Log the saved user
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error); // Log the error
    if (error.code === 11000) { // Duplicate key error (username already exists)
      res.status(400).json({ error: "Username already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
// Login a user
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user._id }, "your-secret-key", { expiresIn: "1h" });
    res.json({ token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// Protected route example
app.get("/api/protected", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  jwt.verify(token, "your-secret-key", (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    res.json({ message: "You are authenticated", userId: decoded.userId });
  });
});
// Add a new cycle
app.post("/api/cycles", authenticate, async (req, res) => {
  const { startDate, endDate } = req.body;
  const userId = req.user.userId; // Extract userId from the token
  try {
    const cycleLength = Math.floor(
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
    ); // Calculate cycle length in days
    const periodLength = cycleLength; // For simplicity, period length = cycle length
    // Determine the current phase (simplified logic)
    const today = new Date();
    const daysSinceStart = Math.floor((today - new Date(startDate)) / (1000 * 60 * 60 * 24));
    let phase;
    if (daysSinceStart < 5) {
      phase = "Menstrual";
    } else if (daysSinceStart < 14) {
      phase = "Follicular";
    } else if (daysSinceStart === 14) {
      phase = "Ovulation";
    } else {
      phase = "Luteal";
    }
    const cycle = new Cycle({ userId, startDate, endDate, cycleLength, periodLength, phase });
    await cycle.save();
    res.status(201).json(cycle);
  } catch (error) {
    res.status(400).json({ error: "Failed to add cycle" });
  }
});
// Get all cycles for a user
app.get("/api/cycles", authenticate, async (req, res) => {
  const userId = req.user.userId; // Extract userId from the token
  try {
    const cycles = await Cycle.find({ userId }).sort({ startDate: -1 }); // Sort by most recent
    res.json(cycles);
  } catch (error) {
    res.status(400).json({ error: "Failed to fetch cycles" });
  }
});
// Predict next period and fertile/ovulation windows
app.get("/api/cycles/predict", authenticate, async (req, res) => {
  const userId = req.user.userId; // Extract userId from the token
  try {
    const cycles = await Cycle.find({ userId }).sort({ startDate: -1 });
    if (cycles.length === 0) {
      return res.status(400).json({ error: "No cycles found" });
    }
    const lastCycle = cycles[0];
    const averageCycleLength =
      cycles.reduce((sum, cycle) => sum + cycle.cycleLength, 0) / cycles.length;
    const nextPeriodDate = new Date(lastCycle.endDate);
    nextPeriodDate.setDate(nextPeriodDate.getDate() + averageCycleLength);
    const fertileWindowStart = new Date(nextPeriodDate);
    fertileWindowStart.setDate(fertileWindowStart.getDate() - 14); // Ovulation typically occurs 14 days before the next period
    const fertileWindowEnd = new Date(fertileWindowStart);
    fertileWindowEnd.setDate(fertileWindowEnd.getDate() + 5); // Fertile window is ~5 days
    res.json({
      nextPeriodDate,
      fertileWindow: { start: fertileWindowStart, end: fertileWindowEnd },
      ovulationDate: fertileWindowStart, // Ovulation occurs at the start of the fertile window
    });
  } catch (error) {
    res.status(400).json({ error: "Failed to predict cycle" });
  }
});
// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});






