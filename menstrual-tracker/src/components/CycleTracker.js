import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import Modal from "react-modal";
import { FaMoon, FaSun, FaSeedling, FaLeaf, FaTimes } from "react-icons/fa"; 
import { useSpring, animated } from "@react-spring/web"; 
import "../styles/CycleTracker.css";

Modal.setAppElement("#root");

const zodiacSigns = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const moonPhases = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];

const CycleTracker = () => {
  const { token, userId } = useContext(AuthContext);
  const [cycleData, setCycleData] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [calendarDate, setCalendarDate] = useState([new Date(), new Date()]);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [astrologyEnabled, setAstrologyEnabled] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [selectedZodiac, setSelectedZodiac] = useState("Libra"); 
  const [isAstrologyModalOpen, setIsAstrologyModalOpen] = useState(false); 

  // Fetch cycle data
  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const response = await axios.get("https://luna-backend-56fr.onrender.com/api/cycles", {
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

  // Toggle astrology feature
  const toggleAstrology = () => {
    setAstrologyEnabled(!astrologyEnabled);
  };

  // Fetch moon phase for a specific date
  const fetchMoonPhase = async (date) => {
    try {
      const response = await axios.get(
        `https://luna-backend-56fr.onrender.com/api/moon-phase?date=${date}`
      );
      return response.data.moonPhase;
    } catch (error) {
      console.error("Failed to fetch moon phase:", error);
      return null;
    }
  };

  // Add a new cycle
  const addCycle = async () => {
    const [startDate, endDate] = calendarDate;
    try {
      const moonPhase = astrologyEnabled
        ? await fetchMoonPhase(startDate.toISOString().split("T")[0])
        : null;
      const response = await axios.post(
        "https://luna-backend-56fr.onrender.com/api/cycles",
        { startDate, endDate, moonPhase },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCycleData((prevData) => [...prevData, response.data]);
      setError("");
      setIsModalOpen(false); 
    } catch (error) {
      console.error("Failed to add cycle:", error);
      setError("Failed to add cycle. Please try again.");
    }
  };

  // Predict next period and fertile window
  const predictCycle = async () => {
    try {
      const response = await axios.get(
        "https://luna-backend-56fr.onrender.com/api/cycles/predict",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPrediction(response.data);
      setError("");
    } catch (error) {
      console.error("Failed to predict cycle:", error);
      setError("Failed to predict cycle. Please try again.");
    }
  };

  // Fetch astrology-based suggestions
  const fetchAstrologySuggestion = async (zodiacSign, cyclePhase) => {
    try {
      const response = await axios.post(
        "https://luna-backend-56fr.onrender.com/api/astrology-suggestions",
        { zodiacSign, cyclePhase },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.suggestion;
    } catch (error) {
      console.error("Failed to fetch astrology suggestion:", error.response?.data || error.message);
      return null;
    }
  };

  // Clean up the suggestion data
  const cleanSuggestion = (suggestion) => {
    const lines = suggestion.split("\n").filter((line) => {
      return !line.startsWith("Okay,") && !line.startsWith("*This is not a substitute for medical advice.*");
    });
    const cleanedLines = lines.map((line) => line.replace(/\*\*/g, "").replace(/\*/g, "").trim());
    return cleanedLines.join("\n");
  };

  // Fetch astrology suggestions when cycle data changes
  useEffect(() => {
    if (astrologyEnabled && cycleData.length > 0) {
      const zodiacSign = selectedZodiac;
      const cyclePhase = cycleData[0].phase;
      if (!zodiacSign || !cyclePhase) {
        console.error("zodiacSign or cyclePhase is missing");
        return;
      }
      fetchAstrologySuggestion(zodiacSign, cyclePhase).then((suggestion) => {
        if (suggestion) {
          setSuggestion(cleanSuggestion(suggestion));
        }
      });
    }
  }, [cycleData, astrologyEnabled, selectedZodiac]);

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
        return "highlight-next-period";
      } else if (date.toDateString() === ovulationDate.toDateString()) {
        return "highlight-ovulation";
      } else if (date >= fertileStart && date <= fertileEnd) {
        return "highlight-fertile";
      }
    }
    return null;
  };

  // Get icon based on cycle phase
  const getPhaseIcon = (phase) => {
    switch (phase) {
      case "Menstrual":
        return <FaMoon className="phase-icon" />;
      case "Follicular":
        return <FaSun className="phase-icon" />;
      case "Ovulation":
        return <FaSeedling className="phase-icon" />;
      case "Luteal":
        return <FaLeaf className="phase-icon" />;
      default:
        return null;
    }
  };

  // Moon phase animation
  const moonAnimation = useSpring({
    from: { opacity: 0, transform: "scale(0.5)" },
    to: { opacity: 1, transform: "scale(1)" },
    config: { duration: 1000 },
  });

  // Open Astrology Modal
  const openAstrologyModal = () => {
    setIsAstrologyModalOpen(true);
  };

  // Close Astrology Modal
  const closeAstrologyModal = () => {
    setIsAstrologyModalOpen(false);
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
          selectRange={true}
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

      {/* Toggle Astrology Button */}
      <button
        onClick={toggleAstrology}
        className={`cycle-button ${astrologyEnabled ? "bg-green-500" : "bg-gray-500"}`}
      >
        {astrologyEnabled ? "Disable Astrology" : "Enable Astrology"}
      </button>

      {/* Zodiac Sign Dropdown */}
      {astrologyEnabled && (
        <div className="zodiac-dropdown">
          <label htmlFor="zodiac-sign">Select Zodiac Sign:</label>
          <select
            id="zodiac-sign"
            value={selectedZodiac}
            onChange={(e) => setSelectedZodiac(e.target.value)}
          >
            {zodiacSigns.map((sign) => (
              <option key={sign} value={sign}>
                {sign}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="cycle-content-wrapper">
        <div className="cycle-details">
          <div className="mt-6">
            <h3 className="text-lg font-semibold">Cycle Lengths</h3>
            <BarChart width={500} height={300} data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <CartesianGrid stroke="#ccc" />
              <Bar dataKey="duration" fill="#FF5A7D" />
            </BarChart>
          </div>

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

         
          {/* Astrology Insights Button */}
          {astrologyEnabled && (
            <button onClick={openAstrologyModal} className="cycle-button astrology-button">
              View Astrology Insights
            </button>
          )}
        </div>

        {/* Right Section - Calendar */}
        <div className="cycle-calendar">
          <h3 className="text-lg font-semibold">Cycle Calendar</h3>
          <Calendar
            onChange={setCalendarDate}
            value={calendarDate}
            tileClassName={tileClassName}
          />
        </div>
      </div>

      {/* Astrology Insights Modal */}
      <Modal
        isOpen={isAstrologyModalOpen}
        onRequestClose={closeAstrologyModal}
        contentLabel="Astrology Insights"
        className="astrology-modal"
        overlayClassName="modal-overlay"
      >
        <div className="astrology-modal-content">
          <button onClick={closeAstrologyModal} className="close-button">
            <FaTimes />
          </button>
          <h3 className="modal-title">Astrology Insights for {cycleData[0]?.phase} Phase</h3>
          <div className="moon-phase-container">
            <div className="moon-phase-icon">
              {getPhaseIcon(cycleData[0]?.phase)}
            </div>
            <p className="moon-phase-text">
              <strong>Moon Phase:</strong> {cycleData[0]?.moonPhase}
            </p>
          </div>
          {suggestion && (
            <div className="suggestion-box">
              <h4 className="suggestion-title">Your Astrology Suggestions</h4>
              <div className="suggestion-content">
                {suggestion.split("\n\n").slice(0, 7).map((section, index) => (
                  <p key={index}>{section.trim()}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CycleTracker;