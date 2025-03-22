import React from 'react';
import CycleTracker from './CycleTracker';
import NutritionGuide from './NutritionGuide';  // Correct spelling of the component file
import '../styles/Dashboard.css';

export const Dashboard = () => {
  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Dashboard</h2>
      <CycleTracker />
      <NutritionGuide />
    </div>
  );
};

export default Dashboard;
