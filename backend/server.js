require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const User = require("./models/User");
const app = express();
const PORT = process.env.PORT || 5001;
const mongoUrl = process.env.MONGO_URI;
const Cycle = require("./models/Cycle");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 


// app.use(cors({ origin: "http://localhost:3000", credentials: true }));
const allowedOrigins = [
  'https://askluna.info',
  'http://localhost:3000' 
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true 
  })
);
app.use(express.json());

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  jwt.verify(token, "your-secret-key", (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = decoded; 
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
  const { username, email, password } = req.body;
  console.log("Register request received:", { username, email, password });
  try {
    const user = new User({ username, email, password });
    await user.save();
    console.log("User saved to database:", user);
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.code === 11000) {
      // Handle duplicate email or username
      const field = Object.keys(error.keyPattern)[0];
      res.status(400).json({ error: `${field} already exists` });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});


// Login a user
app.post("/api/login", async (req, res) => {
  const { identifier, password } = req.body;
  try {
    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate a JWT token
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
  const userId = req.user.userId;
  try {
    const cycleLength = Math.floor(
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
    ); 
    const periodLength = cycleLength; 
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
  const userId = req.user.userId; 
  try {
    const cycles = await Cycle.find({ userId }).sort({ startDate: -1 }); 
    res.json(cycles);
  } catch (error) {
    res.status(400).json({ error: "Failed to fetch cycles" });
  }
});

// Predict next period and fertile/ovulation windows
app.get("/api/cycles/predict", authenticate, async (req, res) => {
  const userId = req.user.userId; 
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
    fertileWindowStart.setDate(fertileWindowStart.getDate() - 14); 
    const fertileWindowEnd = new Date(fertileWindowStart);
    fertileWindowEnd.setDate(fertileWindowEnd.getDate() + 5); 
    res.json({
      nextPeriodDate,
      fertileWindow: { start: fertileWindowStart, end: fertileWindowEnd },
      ovulationDate: fertileWindowStart, 
    });
  } catch (error) {
    res.status(400).json({ error: "Failed to predict cycle" });
  }
});

// Get moon phase for a specific date
app.get("/api/moon-phase", async (req, res) => {
  const { date } = req.query;
  try {
    const response = await axios.get(`https://api.farmsense.net/v1/moonphases/?d=${date}`);
    const moonPhase = response.data[0].Phase; 
    res.json({ moonPhase });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch moon phase" });
  }
});

// Get astrology-based suggestions using Gemini API
app.post("/api/astrology-suggestions", async (req, res) => {
  const { zodiacSign, cyclePhase } = req.body;

  // Validate input
  if (!zodiacSign || !cyclePhase) {
    return res.status(400).json({ error: "zodiacSign and cyclePhase are required" });
  }

  try {
    const prompt = `Provide astrology-based suggestions for a ${zodiacSign} in the ${cyclePhase} phase of their menstrual cycle.`;
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const suggestion = response.data.candidates[0].content.parts[0].text;
    res.json({ suggestion });
  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch astrology suggestion" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});






