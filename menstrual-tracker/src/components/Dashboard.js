import React from "react";
import CycleTracker from "./CycleTracker";
import "../styles/Dashboard.css";

// FIX: NutritionGuide was wrongly here and CycleTracker was commented out.
// Dashboard is the main hub — it shows CycleTracker.
// NutritionGuide has its own route at /nutrition.
const Dashboard = () => {
  return (
    <div className="dashboard">
      <CycleTracker />
    </div>
  );
};

export default Dashboard;