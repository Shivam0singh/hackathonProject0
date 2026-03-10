require('dotenv').config();
console.log("JWT_SECRET loaded:", !!process.env.JWT_SECRET);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const User = require("./models/User");
const Cycle = require("./models/Cycle");

const app = express();
const PORT = process.env.PORT || 5001;
const mongoUrl = process.env.MONGO_URI;
const Conversation = require("./models/Conversation");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
// FIX 1: JWT secret from env, never hardcoded
const JWT_SECRET = process.env.JWT_SECRET;

// FIX 2: In-memory caches — prevents hammering Gemini and causing 429s
const suggestionCache = new Map();    // astrology: zodiac-phase
const insightsCache = new Map();      // educational: topic
const nutritionCache = new Map();     // nutrition: phase

// Groq API caller (free Llama models)
const callAI = async (prompt, retries = 3) => {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your-groq-api-key-here') {
    throw new Error("Groq API key not configured. Please add GROQ_API_KEY to your .env file.");
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🦙 Groq API attempt ${attempt + 1}/${retries + 1} for prompt length: ${prompt.length}`);
      
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: "llama-3.1-8b-instant", // Updated to current supported model
          messages: [
            {
              role: "system",
              content: "You are an expert women's health advisor specializing in menstrual health, nutrition, and holistic wellness. Provide accurate, empathetic, and practical advice."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1024,
          top_p: 0.9
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000
        }
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error("Invalid response structure from Groq API");
      }

      const result = response.data.choices[0].message.content;
      console.log(`✅ Groq API success! Response length: ${result.length}`);
      return result;

    } catch (error) {
      const isLastAttempt = attempt === retries;
      const status = error.response?.status;
      const errorMessage = error.response?.data?.error?.message || error.message;
      
      console.error(`❌ Groq API attempt ${attempt + 1} failed:`, {
        status,
        message: errorMessage,
        isLastAttempt
      });
      
      if (isLastAttempt) {
        throw error;
      }
      
      // Wait before retry with exponential backoff
      const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      console.log(`⏳ Waiting ${Math.round(waitTime)}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

// Helper function to validate Groq API key
const validateAIProvider = () => {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your-groq-api-key-here') {
    console.error("❌ Groq API key not configured");
    return false;
  }
  
  console.log("✅ Groq AI provider ready");
  return true;
};

// CORS — FIX 3: No fallback that allows unknown origins
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  `${process.env.CORS_ORIGIN}/`,
  "https://askluna.info",
  "https://www.askluna.info",
  "http://localhost:3000",
  "https://localhost:3000/",
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    console.log("❌ Blocked origin:", origin);
    // No fallback — unknown origins are blocked
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

// FIX 1 applied: JWT_SECRET from env
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    req.user = decoded;
    next();
  });
};

// Shared error handler for AI responses
const handleAIError = (error, res) => {
  const status = error.response?.status;
  console.error("AI API Error:", error.response?.data?.error || error.message);
  if (status === 429) {
    return res.status(429).json({
      error: "AI suggestions are temporarily rate limited. Please wait a moment and try again.",
    });
  }
  if (status === 400) return res.status(400).json({ error: "Invalid request to AI service." });
  if (status === 401 || status === 403) {
    return res.status(500).json({ error: "AI service authentication failed. Please check configuration." });
  }
  res.status(500).json({ error: "Failed to fetch AI response. Please try again later." });
};

// Connect to MongoDB
mongoose.connect(mongoUrl)
  .then(() => console.log("Connected to MongoDB successfully!"))
  .catch((err) => { console.error("MongoDB error:", err); process.exit(1); });

// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────

app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;
  // FIX 4: Don't log passwords
  console.log("Register request received:", { username, email });
  try {
    const user = new User({ username, email, password });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("✗ Registration error:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      res.status(400).json({ error: `${field} already exists` });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.post("/api/login", async (req, res) => {
  const { identifier, password } = req.body;
  console.log("Login request from origin:", req.headers.origin);
  
  try {
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    // FIX 1 applied
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/protected", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    res.json({ message: "You are authenticated", userId: decoded.userId });
  });
});

// ─── CYCLE ROUTES ─────────────────────────────────────────────────────────────

app.post("/api/cycles", authenticate, async (req, res) => {
  const { startDate, endDate, moonPhase } = req.body;
  const userId = req.user.userId;
  try {
    const cycleStartDate = new Date(startDate);
    const cycleEndDate = new Date(endDate);

    if (cycleStartDate > cycleEndDate) {
      return res.status(400).json({ error: "Start date cannot be after end date" });
    }

    const periodLength = Math.floor(
      (cycleEndDate - cycleStartDate) / (1000 * 60 * 60 * 24)
    ) + 1;

    let cycleLength = null;
    const previousCycles = await Cycle.find({ userId }).sort({ startDate: -1 }).limit(1);
    if (previousCycles.length > 0) {
      const lastCycleStart = new Date(previousCycles[0].startDate);
      cycleLength = Math.floor(
        (cycleStartDate - lastCycleStart) / (1000 * 60 * 60 * 24)
      );
      if (cycleLength < 15 || cycleLength > 60) cycleLength = null;
    }

    if (previousCycles.length > 0 && !previousCycles[0].cycleLength) {
      const lastCycleStart = new Date(previousCycles[0].startDate);
      const calculatedLength = Math.floor(
        (cycleStartDate - lastCycleStart) / (1000 * 60 * 60 * 24)
      );
      if (calculatedLength >= 15 && calculatedLength <= 60) {
        await Cycle.findByIdAndUpdate(previousCycles[0]._id, { cycleLength: calculatedLength });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const cycleStart = new Date(cycleStartDate);
    cycleStart.setHours(0, 0, 0, 0);
    const cycleEnd = new Date(cycleEndDate);
    cycleEnd.setHours(0, 0, 0, 0);

    let phase = "Menstrual";
    if (today >= cycleStart) {
      const daysSinceStart = Math.floor((today - cycleStart) / (1000 * 60 * 60 * 24));
      const daysSinceEnd = Math.floor((today - cycleEnd) / (1000 * 60 * 60 * 24));
      if (daysSinceStart >= 0 && daysSinceStart < periodLength) phase = "Menstrual";
      else if (daysSinceEnd >= 0 && daysSinceEnd < 9) phase = "Follicular";
      else if (daysSinceEnd >= 9 && daysSinceEnd <= 16) phase = "Ovulation";
      else if (daysSinceEnd > 16) phase = "Luteal";
    }

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

    const month = cycleStartDate.getMonth();
    const year = cycleStartDate.getFullYear();
    const monthYear = `${year}-${String(month + 1).padStart(2, '0')}`;

    const cycle = new Cycle({ userId, startDate: cycleStartDate, endDate: cycleEndDate, cycleLength, periodLength, phase, moonPhase, month, year, monthYear });
    await cycle.save();
    res.status(201).json(cycle);
  } catch (error) {
    console.error("Error adding cycle:", error);
    res.status(400).json({ error: "Failed to add cycle" });
  }
});

app.get("/api/cycles", authenticate, async (req, res) => {
  const userId = req.user.userId;
  const { month, year } = req.query;
  try {
    let query = { userId };
    if (month && year) {
      query.monthYear = `${year}-${String(month).padStart(2, '0')}`;
    }
    const cycles = await Cycle.find(query).sort({ startDate: -1 });
    res.json(cycles);
  } catch (error) {
    res.status(400).json({ error: "Failed to fetch cycles" });
  }
});

app.get("/api/cycles/by-month", authenticate, async (req, res) => {
  const userId = req.user.userId;
  try {
    const cycles = await Cycle.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $sort: { startDate: -1 } },
      { $group: { _id: "$monthYear", cycles: { $push: "$$ROOT" }, count: { $sum: 1 }, month: { $first: "$month" }, year: { $first: "$year" } } },
      { $sort: { "_id": -1 } }
    ]);
    res.json(cycles);
  } catch (error) {
    res.status(400).json({ error: "Failed to fetch cycles by month" });
  }
});

app.post("/api/cycles/update-lengths", authenticate, async (req, res) => {
  const userId = req.user.userId;
  try {
    const cycles = await Cycle.find({ userId }).sort({ startDate: 1 });
    let updated = 0;
    for (let i = 1; i < cycles.length; i++) {
      if (!cycles[i].cycleLength) {
        const cycleLength = Math.floor(
          (new Date(cycles[i].startDate) - new Date(cycles[i - 1].startDate)) / (1000 * 60 * 60 * 24)
        );
        if (cycleLength >= 15 && cycleLength <= 60) {
          await Cycle.findByIdAndUpdate(cycles[i]._id, { cycleLength });
          updated++;
        }
      }
    }
    res.json({ updated, message: `Updated ${updated} cycles` });
  } catch (error) {
    res.status(500).json({ error: "Failed to update cycle lengths" });
  }
});

app.get("/api/cycles/predict", authenticate, async (req, res) => {
  const userId = req.user.userId;
  try {
    const cycles = await Cycle.find({ userId }).sort({ startDate: -1 });
    if (cycles.length === 0) return res.status(400).json({ error: "No cycles found" });

    const lastCycle = cycles[0];
    const validCycleLengths = cycles
      .slice(0, Math.min(6, cycles.length))
      .filter(c => c.cycleLength && c.cycleLength > 20 && c.cycleLength < 40);

    const averageCycleLength = validCycleLengths.length > 0
      ? Math.round(validCycleLengths.reduce((sum, c) => sum + c.cycleLength, 0) / validCycleLengths.length)
      : 28;

    const nextPeriodDate = new Date(lastCycle.startDate);
    nextPeriodDate.setDate(nextPeriodDate.getDate() + averageCycleLength);

    const ovulationDate = new Date(nextPeriodDate);
    ovulationDate.setDate(ovulationDate.getDate() - 14);

    const fertileWindowStart = new Date(ovulationDate);
    fertileWindowStart.setDate(fertileWindowStart.getDate() - 5);
    const fertileWindowEnd = new Date(ovulationDate);
    fertileWindowEnd.setDate(fertileWindowEnd.getDate() + 1);

    res.json({ nextPeriodDate, fertileWindow: { start: fertileWindowStart, end: fertileWindowEnd }, ovulationDate, averageCycleLength });
  } catch (error) {
    res.status(400).json({ error: "Failed to predict cycle" });
  }
});

// ─── MOON PHASE ───────────────────────────────────────────────────────────────

function calculateMoonPhase(date) {
  const moonPhases = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
    "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  const knownNewMoon = new Date('2024-01-11');
  const lunarCycle = 29.53058867;
  const daysDiff = Math.abs(date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const cyclePosition = (daysDiff % lunarCycle) / lunarCycle;
  return moonPhases[Math.floor(cyclePosition * 8)];
}

app.get("/api/moon-phase", async (req, res) => {
  const { date } = req.query;
  try {
    const response = await axios.get(`https://api.farmsense.net/v1/moonphases/?d=${date}`, { timeout: 5000 });
    if (response.data?.[0]?.Phase) return res.json({ moonPhase: response.data[0].Phase });
    throw new Error("No phase data");
  } catch (error) {
    try {
      res.json({ moonPhase: calculateMoonPhase(new Date(date)) });
    } catch {
      res.status(500).json({ error: "Failed to fetch moon phase" });
    }
  }
});

// ─── AI ROUTES (all Gemini calls live here, never in frontend) ────────────────

// Enhanced astrology suggestions with Groq AI
app.post("/api/astrology-suggestions", authenticate, async (req, res) => {
  if (!validateAIProvider()) {
    return res.status(500).json({ error: "AI service is not properly configured" });
  }

  const { zodiacSign, cyclePhase } = req.body;
  if (!zodiacSign || !cyclePhase) {
    return res.status(400).json({ error: "zodiacSign and cyclePhase are required" });
  }
  
  const cacheKey = `astrology-${zodiacSign.toLowerCase()}-${cyclePhase.toLowerCase()}`;
  if (suggestionCache.has(cacheKey)) {
    console.log("🎯 Cache hit for astrology:", cacheKey);
    return res.json({ suggestion: suggestionCache.get(cacheKey) });
  }
  
  try {
    const prompt = `As an expert in both astrology and women's health, provide personalized guidance for a ${zodiacSign} during their ${cyclePhase.toLowerCase()} phase of their menstrual cycle.

Include:
- How their zodiac traits can support them during this phase
- Specific self-care practices aligned with their astrological nature
- Energy management tips based on their ruling planet/element
- 2-3 practical activities that honor both their cycle phase and zodiac nature

Keep the tone warm, empowering, and practical. Limit to 4-5 sentences. Start with "During your ${cyclePhase.toLowerCase()} phase..."`;

    console.log(`🌙 Generating astrology guidance for ${zodiacSign} in ${cyclePhase} phase...`);
    const suggestion = await callAI(prompt);
    
    suggestionCache.set(cacheKey, suggestion);
    console.log(`✨ Astrology suggestion cached for ${zodiacSign}-${cyclePhase}`);
    
    res.json({ suggestion });
    
  } catch (error) {
    console.error("❌ Astrology suggestion generation failed:", error.message);
    handleAIError(error, res);
  }
});

// Enhanced educational insights with Groq AI
app.post("/api/educational-insights", authenticate, async (req, res) => {
  if (!validateAIProvider()) {
    return res.status(500).json({ error: "AI service is not properly configured" });
  }

  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: "topic is required" });

  const cacheKey = `education-${topic.toLowerCase()}`;
  if (insightsCache.has(cacheKey)) {
    console.log("🎯 Cache hit for education:", cacheKey);
    return res.json({ insights: insightsCache.get(cacheKey) });
  }

  const prompts = {
    cramps: `As a women's health expert, provide 5 evidence-based, practical tips for managing menstrual cramps naturally. Include both immediate relief strategies and preventive measures. Format as a numbered list with each tip being 1-2 sentences. Focus on actionable advice.`,
    mood: `Explain how hormonal fluctuations during the menstrual cycle affect mood and emotions. Provide 5 key insights about the emotional patterns during different cycle phases, plus practical coping strategies. Format as a numbered list with each point being 1-2 sentences.`,
    myths: `List 5 common menstrual myths and provide the scientific facts that debunk them. Each entry should follow the format: "Myth: [statement] | Fact: [scientific truth]". Focus on widespread misconceptions that affect women's health decisions.`
  };

  const prompt = prompts[topic] || `Provide 5 essential, evidence-based tips about menstrual health and ${topic}. Format as a numbered list with practical, actionable advice. Each tip should be 1-2 sentences.`;

  try {
    console.log(`📚 Generating educational insights for topic: ${topic}...`);
    const insights = await callAI(prompt);
    
    insightsCache.set(cacheKey, insights);
    console.log(`✨ Educational insights cached for ${topic}`);
    
    res.json({ insights });
    
  } catch (error) {
    console.error("❌ Educational insights generation failed:", error.message);
    handleAIError(error, res);
  }
});

// Enhanced nutrition tips with Groq AI
app.post("/api/nutrition-tips", authenticate, async (req, res) => {
  if (!validateAIProvider()) {
    return res.status(500).json({ error: "AI service is not properly configured" });
  }

  const { phase } = req.body;
  if (!phase) return res.status(400).json({ error: "phase is required" });

  const cacheKey = `nutrition-${phase.toLowerCase()}`;
  if (nutritionCache.has(cacheKey)) {
    console.log("🎯 Cache hit for nutrition:", cacheKey);
    return res.json({ tips: nutritionCache.get(cacheKey) });
  }

  const prompt = `As a nutrition expert specializing in women's health, provide targeted dietary recommendations for the ${phase.toLowerCase()} phase of the menstrual cycle.

Structure your response with:
**Breakfast:** [specific meal suggestion] - [1 sentence explaining why it helps this phase]
**Lunch:** [specific meal suggestion] - [1 sentence explaining benefits]
**Dinner:** [specific meal suggestion] - [1 sentence explaining benefits]
**Snacks:** [2-3 healthy snack options] - [1 sentence explaining why these work well]

Focus on foods that specifically support hormonal balance, energy levels, and common symptoms during the ${phase.toLowerCase()} phase. Keep explanations concise and practical.`;

  try {
    console.log(`🥗 Generating nutrition tips for ${phase} phase...`);
    const tips = await callAI(prompt);
    
    nutritionCache.set(cacheKey, tips);
    console.log(`✨ Nutrition tips cached for ${phase}`);
    
    res.json({ tips });
    
  } catch (error) {
    console.error("❌ Nutrition tips generation failed:", error.message);
    handleAIError(error, res);
  }
});

// ─── EVA CONVERSATION ENDPOINT ───────────────────────────────────────────────

// EVA conversational AI endpoint with persistence
app.post("/api/eva/chat", authenticate, async (req, res) => {
  if (!validateAIProvider()) {
    return res.status(500).json({ error: "AI service is not properly configured" });
  }

  const { message, sessionId = 'default' } = req.body;
  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  const userId = req.user.userId;

  try {
    // Get or create conversation
    const conversation = await Conversation.getOrCreateConversation(userId, sessionId);
    
    // Get user's current cycle info if available
    let currentPhase = "unknown";
    let cycleDay = 0;
    let cycleInfo = "";
    
    try {
      const recentCycle = await Cycle.findOne({ userId }).sort({ startDate: -1 });
      if (recentCycle) {
        currentPhase = recentCycle.phase || "unknown";
        cycleDay = Math.floor((new Date() - new Date(recentCycle.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        cycleInfo = `User is currently in ${currentPhase} phase, day ${cycleDay} of their cycle.`;
      }
    } catch (error) {
      console.log("Could not fetch cycle info:", error.message);
    }

    // Save user message with context
    const userContext = {
      phase: currentPhase,
      cycleDay: cycleDay
    };
    await conversation.addMessage("user", message, userContext);

    // Build conversation context from stored messages
    let conversationContext = "";
    if (conversation.messages.length > 1) {
      conversationContext = conversation.messages
        .slice(-11, -1) // Last 10 messages (excluding the just-added user message)
        .map(msg => `${msg.type === 'user' ? 'User' : 'EVA'}: ${msg.content}`)
        .join('\n');
    }

    const evaPersonality = `You are EVA (Empathic Virtual Assistant) - a warm, empathetic AI companion specialized in menstrual health and emotional wellness.

YOUR CORE TRAITS:
- Warm, understanding, and non-judgmental
- Expert in menstrual health, hormones, and emotional wellness
- You interpret, explain, and support (don't just chat)
- You normalize symptoms and experiences
- You provide phase-aware guidance
- You remember conversation context and build relationships

CONVERSATION STYLE:
- Use "I understand...", "That sounds...", "It's completely normal..."
- Ask follow-up questions to show you care
- Reference previous parts of the conversation
- Be supportive but not overly clinical
- Use gentle, encouraging language

WHAT YOU DO:
1. Interpret menstrual phases and explain what's happening hormonally
2. Provide emotional support for overwhelm, mood changes, etc.
3. Offer phase-based lifestyle guidance (rest, nutrition, energy management)
4. Answer women's health questions in warm, digestible language
5. Learn from context and adapt your responses

WHAT YOU DON'T DO:
- Diagnose medical conditions
- Replace therapy or medical advice
- Give prescriptions or specific medical treatments
- Be overly clinical or robotic

${cycleInfo}

Previous conversation:
${conversationContext}

Current user message: "${message}"

Respond as EVA with empathy, practical guidance, and genuine care. Keep responses conversational but informative (2-4 sentences usually). Reference the conversation history when relevant.`;

    console.log(`💬 EVA processing conversational message: "${message.substring(0, 50)}..."`);
    const response = await callAI(evaPersonality);
    
    // Save AI response with context
    const aiContext = {
      phase: currentPhase,
      cycleDay: cycleDay
    };
    const aiMessage = await conversation.addMessage("ai", response, aiContext);
    
    console.log(`✨ EVA generated conversational response (${response.length} chars)`);
    
    res.json({
      response,
      messageId: aiMessage._id,
      context: {
        phase: currentPhase,
        cycleDay: cycleDay,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("❌ EVA conversation failed:", error.message);
    
    // Fallback responses based on the user's requirements
    const fallbackResponses = [
      "I'm here to listen and support you. It sounds like you're going through something - would you like to share more about how you're feeling right now?",
      "I understand this might be a challenging time. Your feelings are completely valid. Can you tell me more about what's been on your mind?",
      "It's okay to feel overwhelmed sometimes. I'm here to help you work through whatever you're experiencing. What would be most helpful for you right now?"
    ];
    
    const fallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    // Try to save fallback response if possible
    try {
      const conversation = await Conversation.getOrCreateConversation(userId, sessionId);
      await conversation.addMessage("user", message, { phase: "unknown" });
      await conversation.addMessage("ai", fallback, { phase: "unknown", fallback: true });
    } catch (saveError) {
      console.error("Could not save fallback conversation:", saveError.message);
    }
    
    res.json({
      response: fallback,
      context: {
        phase: "unknown",
        timestamp: new Date().toISOString(),
        fallback: true
      }
    });
  }
});

// Get conversation history
app.get("/api/eva/conversations", authenticate, async (req, res) => {
  const userId = req.user.userId;
  const { sessionId = 'default', limit = 50 } = req.query;

  try {
    const conversation = await Conversation.findOne({ userId, sessionId });
    if (!conversation) {
      return res.json({ messages: [] });
    }

    // Return last N messages
    const messages = conversation.messages
      .slice(-limit)
      .map(msg => ({
        id: msg._id,
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        context: msg.context
      }));

    res.json({
      messages,
      lastActive: conversation.lastActive
    });
  } catch (error) {
    console.error("❌ Error fetching conversation:", error.message);
    res.status(500).json({ error: "Failed to fetch conversation history" });
  }
});

// Clear conversation history
app.delete("/api/eva/conversations", authenticate, async (req, res) => {
  const userId = req.user.userId;
  const { sessionId = 'default' } = req.body;

  try {
    await Conversation.findOneAndDelete({ userId, sessionId });
    res.json({ message: "Conversation cleared successfully" });
  } catch (error) {
    console.error("❌ Error clearing conversation:", error.message);
    res.status(500).json({ error: "Failed to clear conversation" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ CORS enabled for:`, allowedOrigins.filter(origin => origin).join(', '));
});