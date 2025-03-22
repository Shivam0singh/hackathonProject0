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
  const [astrologyEnabled, setAstrologyEnabled] = useState(false);

  const [suggestion, setSuggestion] = useState("");

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

  const toggleAstrology = () => {
    setAstrologyEnabled(!astrologyEnabled);
  };

  // Add a new cycle
  // const addCycle = async () => {
  //   const [startDate, endDate] = calendarDate;
  //   try {
  //     await axios.post(
  //       "http://localhost:5001/api/cycles",
  //       { startDate, endDate },
  //       { headers: { Authorization: `Bearer ${token}` } }
  //     );
  //     const response = await axios.get("http://localhost:5001/api/cycles", {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     setCycleData(response.data);
  //     setError(""); // Clear any previous errors
  //   } catch (error) {
  //     console.error("Failed to add cycle:", error);
  //     setError("Failed to add cycle. Please try again.");
  //   }
  // };

  const fetchMoonPhase = async (date) => {
    try {
      const response = await axios.get(
        `http://localhost:5001/api/moon-phase?date=${date}`
      );
      return response.data.moonPhase;
    } catch (error) {
      console.error("Failed to fetch moon phase:", error);
      return null;
    }
  };

  const addCycle = async () => {
    const [startDate, endDate] = calendarDate;
    try {
      const moonPhase = astrologyEnabled
        ? await fetchMoonPhase(startDate.toISOString().split("T")[0])
        : null;

      await axios.post(
        "http://localhost:5001/api/cycles",
        { startDate, endDate, moonPhase },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const response = await axios.get("http://localhost:5001/api/cycles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCycleData(response.data);
      setError("");
    } catch (error) {
      console.error("Failed to add cycle:", error);
      setError("Failed to add cycle. Please try again.");
    }
  };

  // Predict next period and fertile window
  const predictCycle = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5001/api/cycles/predict",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
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
      <button
        onClick={addCycle}
        className="bg-blue-500 text-white p-2 rounded mt-4"
      >
        Add Cycle
      </button>

      <button
        onClick={toggleAstrology}
        className={`p-2 rounded ${
          astrologyEnabled ? "bg-green-500" : "bg-gray-500"
        }`}
      >
        {astrologyEnabled ? "Disable Astrology" : "Enable Astrology"}
      </button>

      {/* Predict Next Cycle Button */}
      <button
        onClick={predictCycle}
        className="bg-green-500 text-white p-2 rounded mt-4 ml-2"
      >
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
            <strong>Next Period:</strong>{" "}
            {new Date(prediction.nextPeriodDate).toDateString()}
          </p>
          <p>
            <strong>Fertile Window:</strong>{" "}
            {new Date(prediction.fertileWindow.start).toDateString()} -{" "}
            {new Date(prediction.fertileWindow.end).toDateString()}
          </p>
          <p>
            <strong>Ovulation Date:</strong>{" "}
            {new Date(prediction.ovulationDate).toDateString()}
          </p>
        </div>
      )}

      {astrologyEnabled && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Astrology Insights</h3>
          {cycleData[0]?.moonPhase && (
            <p>
              <strong>Moon Phase:</strong> {cycleData[0].moonPhase}
            </p>
          )}
          {suggestion && (
            <p>
              <strong>Suggestion:</strong> {suggestion}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CycleTracker;
