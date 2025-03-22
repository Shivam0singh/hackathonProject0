const mongoose = require("mongoose");

const CycleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Link to the user
  startDate: { type: Date, required: true }, // Start date of the period
  endDate: { type: Date, required: true }, // End date of the period
  cycleLength: { type: Number }, // Length of the cycle (in days)
  periodLength: { type: Number }, // Length of the period (in days)
  phase: { type: String, enum: ["Menstrual", "Follicular", "Ovulation", "Luteal"] }, 
  moonPhase: { type: String },
});

module.exports = mongoose.model("Cycle", CycleSchema);