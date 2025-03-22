require('dotenv').config();

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const PORT = process.env.PORT || 3000; 
const mongoUrl = process.env.MONGO_URI;
const cors = require("cors");

app.use(express.json());
app.use(cors({
    origin: "http://localhost:3000", 
    methods: "GET, POST",
    allowedHeaders: "Content-Type, Authorization"
  }));

const jwt = require("jsonwebtoken");
const User = require("./models/User");

// Register a new user
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = new User({ username, password });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(400).json({ error: "Username already exists" });
  }
});

// Login a user
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ userId: user._id }, "your-secret-key", { expiresIn: "1h" });
  res.json({ token });
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

// Connect to MongoDB
mongoose.connect(mongoUrl)
  .then(() => console.log("Connected to MongoDB successfully!"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
