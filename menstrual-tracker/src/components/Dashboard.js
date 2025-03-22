import React from 'react';
import CycleTracker from './CycleTracker';
import NutritionGuide from './NutritionGuide'; 
import '../styles/Dashboard.css';

export const Dashboard = () => {
  return (
    <div className="dashboard">
      {/* <CycleTracker /> */}
      <NutritionGuide />
    </div>
  );
};

export default Dashboard;
