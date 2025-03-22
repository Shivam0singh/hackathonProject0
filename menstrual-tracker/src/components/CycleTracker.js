import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import Modal from "react-modal";
import "../styles/CycleTracker.css";

Modal.setAppElement("#root"); // Set the root element for accessibility

const CycleTracker = () => {
  const { token, userId } = useContext(AuthContext);
  const [cycleData, setCycleData] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [calendarDate, setCalendarDate] = useState([new Date(), new Date()]);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
      setIsModalOpen(false); // Close the modal
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

  // Highlight predicted dates on the calendar
  const tileClassName = ({ date, view }) => {
    if (view === "month" && prediction) {
      const nextPeriodDate = new Date(prediction.nextPeriodDate);
      const ovulationDate = new Date(prediction.ovulationDate);
      const fertileStart = new Date(prediction.fertileWindow.start);
      const fertileEnd = new Date(prediction.fertileWindow.end);

      if (date.toDateString() === nextPeriodDate.toDateString()) {
        return "highlight-next-period"; // Highlight next period date
      } else if (date.toDateString() === ovulationDate.toDateString()) {
        return "highlight-ovulation"; // Highlight ovulation date
      } else if (date >= fertileStart && date <= fertileEnd) {
        return "highlight-fertile"; // Highlight fertile window
      }
    }
    return null;
  };

  return (
    <div className="cycle-tracker">
      <h2 className="cycle-tracker-title">Cycle Tracker</h2>
      {error && <p className="text-red-500">{error}</p>}

      {/* Open Modal Button */}
      <button onClick={() => setIsModalOpen(true)} className="cycle-button">
        Add Cycle
      </button>

      {/* Modal for Date Input */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        contentLabel="Add Cycle Dates"
        className="modal"
        overlayClassName="modal-overlay"
      >
        <h3 className="text-lg font-semibold">Select Cycle Dates</h3>
        <Calendar
          onChange={setCalendarDate}
          value={calendarDate}
          selectRange={true} // Enable date range selection
        />
        <button onClick={addCycle} className="cycle-button">
          Save Cycle
        </button>
        <button onClick={() => setIsModalOpen(false)} className="cycle-button cancel">
          Cancel
        </button>
      </Modal>

      {/* Predict Next Cycle Button */}
      <button onClick={predictCycle} className="cycle-button predict">
        Predict Next Cycle
      </button>

      {/* Toggle Cycle Details Button */}
      <button onClick={() => setShowDetails(!showDetails)} className="cycle-button">
        {showDetails ? "Hide Details" : "Show Details"}
      </button>

      {/* Cycle Data Visualization */}
      {showDetails && (
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
      )}

      {/* Calendar with Highlighted Dates */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold">Cycle Calendar</h3>
        <Calendar
          onChange={setCalendarDate}
          value={calendarDate}
          tileClassName={tileClassName} // Add custom classes for highlighted dates
        />
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