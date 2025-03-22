import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const CycleTracker = () => {
  const { token, userId } = useContext(AuthContext);
  const [cycleData, setCycleData] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [calendarDate, setCalendarDate] = useState([new Date(), new Date()]); 
  const [error, setError] = useState("");

  // Fetch cycle data
  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const response = await axios.get("http://localhost:5001/api/cycles", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCycleData(response.data);
      } catch (error) {
        console.error("Failed to fetch cycles:", error);
        setError("Failed to fetch cycles. Please try again.");
      }
    };
    fetchCycles();
  }, [token]);

  // Add a new cycle
  const addCycle = async () => {
    const [startDate, endDate] = calendarDate;
    try {
      await axios.post(
        "http://localhost:5001/api/cycles",
        { startDate, endDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const response = await axios.get("http://localhost:5001/api/cycles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCycleData(response.data);
      setError(""); // Clear any previous errors
    } catch (error) {
      console.error("Failed to add cycle:", error);
      setError("Failed to add cycle. Please try again.");
    }
  };

  // Predict next period and fertile window
  const predictCycle = async () => {
    try {
      const response = await axios.get("http://localhost:5001/api/cycles/predict", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPrediction(response.data);
      setError(""); // Clear any previous errors
    } catch (error) {
      console.error("Failed to predict cycle:", error);
      setError("Failed to predict cycle. Please try again.");
    }
  };

  // Format data for the bar chart
  const chartData = cycleData.map((cycle, index) => ({
    name: `Cycle ${index + 1}`,
    duration: cycle.cycleLength,
  }));

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Cycle Tracker</h2>
      {error && <p className="text-red-500">{error}</p>}

      {/* Calendar for Cycle Input */}
      <div className="mt-4">
        <h3 className="text-lg font-semibold">Select Cycle Dates</h3>
        <Calendar
          onChange={setCalendarDate}
          value={calendarDate}
          selectRange={true} // Enable date range selection
        />
      </div>

      {/* Add Cycle Button */}
      <button onClick={addCycle} className="bg-blue-500 text-white p-2 rounded mt-4">
        Add Cycle
      </button>

      {/* Predict Next Cycle Button */}
      <button onClick={predictCycle} className="bg-green-500 text-white p-2 rounded mt-4 ml-2">
        Predict Next Cycle
      </button>

      {/* Cycle Data Visualization */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold">Cycle Lengths</h3>
        <BarChart width={500} height={300} data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <CartesianGrid stroke="#ccc" />
          <Bar dataKey="duration" fill="#8884d8" />
        </BarChart>
      </div>

      {/* Cycle Prediction */}
      {prediction && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Predictions</h3>
          <p>
            <strong>Next Period:</strong> {new Date(prediction.nextPeriodDate).toDateString()}
          </p>
          <p>
            <strong>Fertile Window:</strong> {new Date(prediction.fertileWindow.start).toDateString()} -{" "}
            {new Date(prediction.fertileWindow.end).toDateString()}
          </p>
          <p>
            <strong>Ovulation Date:</strong> {new Date(prediction.ovulationDate).toDateString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default CycleTracker;