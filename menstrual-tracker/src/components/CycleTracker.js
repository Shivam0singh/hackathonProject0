import React, { useState } from 'react';
import axios from 'axios';
import '../styles/CycleTracker.css';

function CycleTracker() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const addCycle = async () => {
    try {
      const userId = 'user_id_here'; // Replace with logged-in user ID
      await axios.post(`http://localhost:5000/api/cycles/${userId}/cycles`, { startDate, endDate });
      alert('Cycle added successfully!');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="cycle-tracker">
      <h3 className="cycle-tracker-title">Cycle Tracker</h3>
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="cycle-input"
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="cycle-input"
      />
      <button onClick={addCycle} className="cycle-button">Add Cycle</button>
    </div>
  );
}

export default CycleTracker;
