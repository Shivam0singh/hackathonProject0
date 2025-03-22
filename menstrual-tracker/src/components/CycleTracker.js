// import React, { useState } from 'react';
// import axios from 'axios';
// import '../styles/CycleTracker.css';

// function CycleTracker() {
//   const [startDate, setStartDate] = useState('');
//   const [endDate, setEndDate] = useState('');

//   const addCycle = async () => {
//     try {
//       const userId = 'user_id_here'; // Replace with logged-in user ID
//       await axios.post(`http://localhost:5000/api/cycles/${userId}/cycles`, { startDate, endDate });
//       alert('Cycle added successfully!');
//     } catch (error) {
//       console.error(error);
//     }
//   };

//   return (
//     <div className="cycle-tracker">
//       <h3 className="cycle-tracker-title">Cycle Tracker</h3>
//       <input
//         type="date"
//         value={startDate}
//         onChange={(e) => setStartDate(e.target.value)}
//         className="cycle-input"
//       />
//       <input
//         type="date"
//         value={endDate}
//         onChange={(e) => setEndDate(e.target.value)}
//         className="cycle-input"
//       />
//       <button onClick={addCycle} className="cycle-button">Add Cycle</button>
//     </div>
//   );
// }

// export default CycleTracker;


import React, { useState, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";

const CycleTracker = () => {
  const { token } = useContext(AuthContext);
  const [cycleData, setCycleData] = useState([]);

  const addCycle = async () => {
    const startDate = prompt("Enter start date (YYYY-MM-DD)");
    const endDate = prompt("Enter end date (YYYY-MM-DD)");
    await axios.post(
      "http://localhost:5000/api/cycles",
      { startDate, endDate },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const response = await axios.get("http://localhost:5000/api/cycles", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setCycleData(response.data);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Cycle Tracker</h2>
      <button onClick={addCycle} className="bg-blue-500 text-white p-2 rounded">
        Add Cycle
      </button>
      {/* Render cycle data here */}
    </div>
  );
};

export default CycleTracker;