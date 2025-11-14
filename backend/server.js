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

// CORS configuration - allow both development and production origins
const allowedOrigins = [
  process.env.CORS_ORIGIN,         
  `${process.env.CORS_ORIGIN}/`,   
  "https://askluna.info",
  "https://www.askluna.info",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});



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
  const { startDate, endDate, moonPhase } = req.body;
  const userId = req.user.userId;
  try {
    const cycleStartDate = new Date(startDate);
    const cycleEndDate = new Date(endDate);
    
    // Validate dates
    if (cycleStartDate > cycleEndDate) {
      return res.status(400).json({ error: "Start date cannot be after end date" });
    }
    
    // Calculate period length (actual bleeding days)
    const periodLength = Math.floor(
      (cycleEndDate - cycleStartDate) / (1000 * 60 * 60 * 24)
    ) + 1; // +1 to include both start and end day
    
    // Calculate cycle length from previous cycle if available
    let cycleLength = null;
    const previousCycles = await Cycle.find({ userId }).sort({ startDate: -1 }).limit(1);
    if (previousCycles.length > 0) {
      const lastCycleStart = new Date(previousCycles[0].startDate);
      cycleLength = Math.floor(
        (cycleStartDate - lastCycleStart) / (1000 * 60 * 60 * 24)
      );
      console.log(`Calculated cycle length: ${cycleLength} days between ${lastCycleStart} and ${cycleStartDate}`);
      // Only set to null if extremely unreasonable (but allow wider range for user flexibility)
      if (cycleLength < 15 || cycleLength > 60) {
        console.log(`Cycle length ${cycleLength} is out of range, setting to null`);
        cycleLength = null;
      }
    } else {
      // For the first cycle, we can't calculate length yet, but subsequent cycles will trigger updates
      console.log("No previous cycles found, this is the first cycle.");
      cycleLength = null;
    }
    
    // After saving this cycle, update the previous cycle's length if it was null
    if (previousCycles.length > 0 && !previousCycles[0].cycleLength) {
      const lastCycleStart = new Date(previousCycles[0].startDate);
      const calculatedLength = Math.floor(
        (cycleStartDate - lastCycleStart) / (1000 * 60 * 60 * 24)
      );
      if (calculatedLength >= 15 && calculatedLength <= 60) {
        await Cycle.findByIdAndUpdate(previousCycles[0]._id, { cycleLength: calculatedLength });
        console.log(`Updated previous cycle length to ${calculatedLength} days`);
      }
    }
    
    // Determine phase based on current date relative to this cycle
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const cycleStart = new Date(cycleStartDate);
    cycleStart.setHours(0, 0, 0, 0);
    const cycleEnd = new Date(cycleEndDate);
    cycleEnd.setHours(0, 0, 0, 0);
    
    let phase = "Menstrual"; // Default phase for historical cycles
    
    // Only calculate current phase if this cycle overlaps with today
    if (today >= cycleStart) {
      const daysSinceStart = Math.floor((today - cycleStart) / (1000 * 60 * 60 * 24));
      const daysSinceEnd = Math.floor((today - cycleEnd) / (1000 * 60 * 60 * 24));
      
      if (daysSinceStart >= 0 && daysSinceStart < periodLength) {
        phase = "Menstrual";
      } else if (daysSinceEnd >= 0 && daysSinceEnd < 9) {
        phase = "Follicular";
      } else if (daysSinceEnd >= 9 && daysSinceEnd <= 16) {
        phase = "Ovulation";
      } else if (daysSinceEnd > 16) {
        phase = "Luteal";
      }
    }
    
    // Check for duplicate cycles (same start date)
    const existingCycle = await Cycle.findOne({
      userId,
      startDate: {
        $gte: new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth(), cycleStartDate.getDate()),
        $lt: new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth(), cycleStartDate.getDate() + 1)
      }
    });
    
    if (existingCycle) {
      return res.status(400).json({ error: "A cycle with this start date already exists" });
    }
    
    // Extract month/year information for organization
    const month = cycleStartDate.getMonth(); // 0-11
    const year = cycleStartDate.getFullYear();
    const monthYear = `${year}-${String(month + 1).padStart(2, '0')}`; // Format: "2024-01"
    
    const cycle = new Cycle({
      userId,
      startDate: cycleStartDate,
      endDate: cycleEndDate,
      cycleLength,
      periodLength,
      phase,
      moonPhase,
      month,
      year,
      monthYear
    });
    await cycle.save();
    res.status(201).json(cycle);
  } catch (error) {
    console.error("Error adding cycle:", error);
    res.status(400).json({ error: "Failed to add cycle" });
  }
});

// Get all cycles for a user
app.get("/api/cycles", authenticate, async (req, res) => {
  const userId = req.user.userId;
  const { month, year } = req.query;
  
  try {
    let query = { userId };
    
    // Filter by specific month/year if provided
    if (month && year) {
      const monthYear = `${year}-${String(month).padStart(2, '0')}`;
      query.monthYear = monthYear;
    }
    
    const cycles = await Cycle.find(query).sort({ startDate: -1 });
    res.json(cycles);
  } catch (error) {
    console.error("Error fetching cycles:", error);
    res.status(400).json({ error: "Failed to fetch cycles" });
  }
});

// Get cycles grouped by month for a user
app.get("/api/cycles/by-month", authenticate, async (req, res) => {
  const userId = req.user.userId;
  try {
    const cycles = await Cycle.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $sort: { startDate: -1 } },
      {
        $group: {
          _id: "$monthYear",
          cycles: { $push: "$$ROOT" },
          count: { $sum: 1 },
          month: { $first: "$month" },
          year: { $first: "$year" }
        }
      },
      { $sort: { "_id": -1 } } // Sort by monthYear descending
    ]);
    
    res.json(cycles);
  } catch (error) {
    console.error("Error fetching cycles by month:", error);
    res.status(400).json({ error: "Failed to fetch cycles by month" });
  }
});

// Update existing cycles to calculate missing cycle lengths
app.post("/api/cycles/update-lengths", authenticate, async (req, res) => {
  const userId = req.user.userId;
  try {
    const cycles = await Cycle.find({ userId }).sort({ startDate: 1 }); // Oldest first
    
    let updated = 0;
    for (let i = 1; i < cycles.length; i++) {
      const currentCycle = cycles[i];
      const previousCycle = cycles[i - 1];
      
      // Only update if cycle length is missing
      if (!currentCycle.cycleLength) {
        const cycleLength = Math.floor(
          (new Date(currentCycle.startDate) - new Date(previousCycle.startDate)) / (1000 * 60 * 60 * 24)
        );
        
        if (cycleLength >= 15 && cycleLength <= 60) {
          await Cycle.findByIdAndUpdate(currentCycle._id, { cycleLength });
          updated++;
        }
      }
    }
    
    console.log(`Updated ${updated} cycles with missing cycle lengths`);
    res.json({ updated, message: `Updated ${updated} cycles` });
  } catch (error) {
    console.error("Error updating cycle lengths:", error);
    res.status(500).json({ error: "Failed to update cycle lengths" });
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
    // Calculate average cycle length from last 3-6 cycles or all available
    const recentCycles = cycles.slice(0, Math.min(6, cycles.length));
    const validCycleLengths = recentCycles.filter(cycle => cycle.cycleLength && cycle.cycleLength > 20 && cycle.cycleLength < 40);
    
    let averageCycleLength = 28; // Default
    if (validCycleLengths.length > 0) {
      averageCycleLength = Math.round(
        validCycleLengths.reduce((sum, cycle) => sum + cycle.cycleLength, 0) / validCycleLengths.length
      );
    }
    
    // Next period starts from last period start date + average cycle length
    const nextPeriodDate = new Date(lastCycle.startDate);
    nextPeriodDate.setDate(nextPeriodDate.getDate() + averageCycleLength);
    
    // Ovulation typically occurs 14 days before next period
    const ovulationDate = new Date(nextPeriodDate);
    ovulationDate.setDate(ovulationDate.getDate() - 14);
    
    // Fertile window: 5 days before ovulation to 1 day after
    const fertileWindowStart = new Date(ovulationDate);
    fertileWindowStart.setDate(fertileWindowStart.getDate() - 5);
    const fertileWindowEnd = new Date(ovulationDate);
    fertileWindowEnd.setDate(fertileWindowEnd.getDate() + 1);
    
    res.json({
      nextPeriodDate,
      fertileWindow: { start: fertileWindowStart, end: fertileWindowEnd },
      ovulationDate,
      averageCycleLength,
    });
  } catch (error) {
    console.error("Error predicting cycle:", error);
    res.status(400).json({ error: "Failed to predict cycle" });
  }
});

// Fallback moon phase calculation
function calculateMoonPhase(date) {
  const moonPhases = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
                     "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  
  // Known new moon date (January 11, 2024)
  const knownNewMoon = new Date('2024-01-11');
  const lunarCycle = 29.53058867; // Average lunar cycle in days
  
  const daysDiff = Math.abs(date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const cyclePosition = (daysDiff % lunarCycle) / lunarCycle;
  const phaseIndex = Math.floor(cyclePosition * 8);
  
  return moonPhases[phaseIndex];
}

// Get moon phase for a specific date
app.get("/api/moon-phase", async (req, res) => {
  const { date } = req.query;
  console.log("Fetching moon phase for date:", date);
  
  try {
    const response = await axios.get(`https://api.farmsense.net/v1/moonphases/?d=${date}`, {
      timeout: 5000 // 5 second timeout
    });
    
    console.log("Moon phase API response:", response.data);
    
    if (response.data && response.data.length > 0 && response.data[0].Phase) {
      const moonPhase = response.data[0].Phase;
      console.log("Moon phase from API:", moonPhase);
      res.json({ moonPhase });
    } else {
      throw new Error("No moon phase data in response");
    }
  } catch (error) {
    console.error("Moon phase API error:", error.message);
    
    // Fallback: calculate moon phase based on lunar cycle
    try {
      const moonPhase = calculateMoonPhase(new Date(date));
      console.log("Using fallback moon phase:", moonPhase);
      res.json({ moonPhase });
    } catch (fallbackError) {
      console.error("Fallback moon phase calculation failed:", fallbackError);
      res.status(500).json({ error: "Failed to fetch moon phase" });
    }
  }
});

// Get astrology-based suggestions using Gemini API
app.post("/api/astrology-suggestions", authenticate, async (req, res) => {
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
