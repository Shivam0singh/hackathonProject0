const mongoose = require("mongoose");

const CycleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Link to the user
  startDate: { type: Date, required: true }, // Start date of the period
  endDate: { type: Date, required: true }, // End date of the period
  cycleLength: { type: Number }, // Length of the cycle (in days)
  periodLength: { type: Number }, // Length of the period (in days)
  phase: { type: String, enum: ["Menstrual", "Follicular", "Ovulation", "Luteal"] },
  moonPhase: { type: String },
  // Add month/year tracking for better organization
  month: { type: Number, required: true }, // 0-11 (January = 0)
  year: { type: Number, required: true },
  monthYear: { type: String, required: true }, // Format: "2024-01" for easy querying
}, {
  timestamps: true // Add createdAt and updatedAt
});

// Index for efficient querying by user and month
CycleSchema.index({ userId: 1, monthYear: 1 });
CycleSchema.index({ userId: 1, startDate: -1 });

module.exports = mongoose.model("Cycle", CycleSchema);