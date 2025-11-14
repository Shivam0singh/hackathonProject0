import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
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
  const [cyclesByMonth, setCyclesByMonth] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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
      if (!token || !userId) {
        console.log("No authentication token available, skipping data fetch");
        setError("Please log in to view your cycle data.");
        return;
      }
      
      try {
        // Fetch all cycles
        const allCyclesResponse = await axios.get("https://luna-backend-56fr.onrender.com/api/cycles", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCycleData(allCyclesResponse.data);

        // Fetch cycles grouped by month
        const monthlyResponse = await axios.get("https://luna-backend-56fr.onrender.com/api/cycles/by-month", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCyclesByMonth(monthlyResponse.data);
        setError(""); // Clear any previous errors
      } catch (error) {
        console.error("Failed to fetch cycles:", error);
        if (error.response?.status === 401) {
          setError("Your session has expired. Please log in again.");
        } else {
          setError("Failed to fetch cycles. Please check your connection and try again.");
        }
      }
    };
    fetchCycles();
  }, [token, userId]);

  // Update cycle lengths on component mount
  useEffect(() => {
    if (token && cycleData.length > 0) {
      updateCycleLengths();
    }
  }, [token]); // Only run once when token is available

  // Update missing cycle lengths
  const updateCycleLengths = async () => {
    try {
      const response = await axios.post("https://luna-backend-56fr.onrender.com/api/cycles/update-lengths", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Updated cycle lengths:", response.data);
      
      // Refresh cycle data after update
      const allCyclesResponse = await axios.get("https://luna-backend-56fr.onrender.com/api/cycles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCycleData(allCyclesResponse.data);

      const monthlyResponse = await axios.get("https://luna-backend-56fr.onrender.com/api/cycles/by-month", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCyclesByMonth(monthlyResponse.data);
    } catch (error) {
      console.error("Failed to update cycle lengths:", error);
    }
  };

  // Fetch cycles for specific month
  const fetchCyclesForMonth = async (month, year) => {
    try {
      const response = await axios.get(`https://luna-backend-56fr.onrender.com/api/cycles?month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch cycles for month:", error);
      return [];
    }
  };

  // Get current month's cycles
  const getCurrentMonthCycles = () => {
    const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    console.log("Looking for month key:", monthKey);
    console.log("Available months:", cyclesByMonth.map(m => m._id));
    const monthData = cyclesByMonth.find(month => month._id === monthKey);
    console.log("Found month data:", monthData);
    return monthData ? monthData.cycles : [];
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
  };

  // Toggle astrology feature
  const toggleAstrology = () => {
    setAstrologyEnabled(!astrologyEnabled);
  };

  // Fetch moon phase for a specific date
  const fetchMoonPhase = async (date) => {
    try {
      console.log("Frontend: Fetching moon phase for date:", date);
      const response = await axios.get(
        `https://luna-backend-56fr.onrender.com/api/moon-phase?date=${date}`
      );
      console.log("Frontend: Moon phase response:", response.data);
      return response.data.moonPhase;
    } catch (error) {
      console.error("Frontend: Failed to fetch moon phase:", error);
      return "New Moon"; // Return default moon phase instead of null
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
      
      // Refresh both cycle data and monthly grouping
      const allCyclesResponse = await axios.get("https://luna-backend-56fr.onrender.com/api/cycles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCycleData(allCyclesResponse.data);

      const monthlyResponse = await axios.get("https://luna-backend-56fr.onrender.com/api/cycles/by-month", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCyclesByMonth(monthlyResponse.data);
      
      setError("");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to add cycle:", error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError("Failed to add cycle. Please try again.");
      }
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
    if (astrologyEnabled && cycleData.length > 0 && selectedZodiac) {
      const latestCycle = cycleData[0];
      const cyclePhase = latestCycle?.phase;
      
      if (!cyclePhase) {
        console.error("Cycle phase is missing from latest cycle data");
        return;
      }
      
      // Fetch moon phase if missing for the latest cycle
      if (!latestCycle.moonPhase) {
        console.log("Moon phase missing for latest cycle, fetching...");
        const startDate = new Date(latestCycle.startDate);
        fetchMoonPhase(startDate.toISOString().split("T")[0]).then((moonPhase) => {
          if (moonPhase) {
            // Update the cycle data with the fetched moon phase
            setCycleData(prevData => prevData.map((cycle, index) =>
              index === 0 ? { ...cycle, moonPhase } : cycle
            ));
          }
        });
      }
      
      fetchAstrologySuggestion(selectedZodiac, cyclePhase).then((suggestion) => {
        if (suggestion) {
          setSuggestion(cleanSuggestion(suggestion));
        } else {
          setSuggestion("Unable to fetch astrology suggestions at this time.");
        }
      });
    } else if (astrologyEnabled && cycleData.length === 0) {
      setSuggestion("Please add a cycle first to get astrology insights.");
    }
  }, [cycleData, astrologyEnabled, selectedZodiac]);

  // Get overall user statistics for dynamic averages
  const getUserAverages = () => {
    if (cycleData.length === 0) return { avgCycle: null, avgPeriod: null };
    
    const validCycles = cycleData.filter(c => c.cycleLength && c.cycleLength > 15 && c.cycleLength < 60);
    console.log("Valid cycles for average:", validCycles.map(c => ({ id: c._id, cycleLength: c.cycleLength })));
    
    const avgCycle = validCycles.length > 0
      ? Math.round(validCycles.reduce((sum, cycle) => sum + cycle.cycleLength, 0) / validCycles.length)
      : null;
      
    const periodsWithData = cycleData.filter(c => c.periodLength && c.periodLength > 0);
    const avgPeriod = periodsWithData.length > 0
      ? Math.round(periodsWithData.reduce((sum, cycle) => sum + cycle.periodLength, 0) / periodsWithData.length * 10) / 10
      : null;
      
    console.log("Calculated averages:", { avgCycle, avgPeriod, totalCycles: cycleData.length, validCycles: validCycles.length });
    return { avgCycle, avgPeriod };
  };

  // Format data for the bar chart - show better analytics
  const getChartData = () => {
    const currentMonthCycles = getCurrentMonthCycles();
    const { avgCycle, avgPeriod } = getUserAverages();
    
    console.log("Chart data calculation:", {
      currentMonthCycles: currentMonthCycles.length,
      avgCycle,
      totalCycles: cycleData.length
    });
    
    if (currentMonthCycles.length === 0) {
      return [];
    }

    // For any single cycle view, always show 3 bars for comparison
    if (currentMonthCycles.length === 1) {
      const cycle = currentMonthCycles[0];
      const chartData = [
        {
          name: 'Period Length',
          duration: cycle.periodLength || 4,
          color: '#ec4899'
        },
        {
          name: 'Cycle Length',
          duration: cycle.cycleLength || 28,
          color: '#8b5cf6'
        },
        {
          name: 'Your Average',
          duration: avgCycle || 28,
          color: '#6b7280'
        }
      ];
      
      console.log("Generated chart data for single cycle:", chartData);
      return chartData;
    } else {
      // For multiple cycles in month, show each cycle
      const multiCycleData = currentMonthCycles.map((cycle, index) => {
        const date = new Date(cycle.startDate);
        return {
          name: `${date.getDate()}/${date.getMonth() + 1}`,
          duration: cycle.cycleLength || cycle.periodLength || 0,
          periodLength: cycle.periodLength || 0,
        };
      }).reverse();
      
      console.log("Generated chart data for multiple cycles:", multiCycleData);
      return multiCycleData;
    }
  };

  const chartData = getChartData();

  // Get analytics summary
  const getAnalyticsSummary = () => {
    const currentMonthCycles = getCurrentMonthCycles();
    
    if (currentMonthCycles.length === 0) {
      return null;
    }

    const totalCycles = currentMonthCycles.length;
    const avgPeriodLength = currentMonthCycles.reduce((sum, cycle) => sum + (cycle.periodLength || 0), 0) / totalCycles;
    const validCyclesThisMonth = currentMonthCycles.filter(c => c.cycleLength);
    const avgCycleLength = validCyclesThisMonth.length > 0
      ? validCyclesThisMonth.reduce((sum, cycle) => sum + cycle.cycleLength, 0) / validCyclesThisMonth.length
      : 0;
    
    return {
      totalCycles,
      avgPeriodLength: Math.round(avgPeriodLength * 10) / 10,
      avgCycleLength: avgCycleLength > 0 ? Math.round(avgCycleLength * 10) / 10 : 0,
      phases: currentMonthCycles.reduce((acc, cycle) => {
        acc[cycle.phase] = (acc[cycle.phase] || 0) + 1;
        return acc;
      }, {})
    };
  };

  const analyticsSummary = getAnalyticsSummary();

  // Get month name helper
  const getMonthName = (monthNum) => {
    const monthNames = ["January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"];
    return monthNames[monthNum - 1];
  };

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
      
      {error && (
        <div className="error-message" style={{
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#dc2626',
          padding: '12px 20px',
          borderRadius: '10px',
          margin: '20px 0',
          textAlign: 'center',
          fontWeight: '500'
        }}>
          {error}
        </div>
      )}

      {/* Month Navigation */}
      <div className="month-navigation" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        margin: '20px 0',
        padding: '15px',
        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(219, 39, 119, 0.1))',
        borderRadius: '15px',
        border: '1px solid rgba(236, 72, 153, 0.2)'
      }}>
        <button
          onClick={goToPreviousMonth}
          className="cycle-button"
          style={{ minWidth: '40px', padding: '8px 12px' }}
        >
          ◀️
        </button>
        <div style={{
          fontSize: '1.2rem',
          fontWeight: '600',
          color: '#ec4899',
          minWidth: '200px',
          textAlign: 'center'
        }}>
          {getMonthName(selectedMonth)} {selectedYear}
        </div>
        <button
          onClick={goToNextMonth}
          className="cycle-button"
          style={{ minWidth: '40px', padding: '8px 12px' }}
        >
          ▶️
        </button>
        {(selectedMonth !== currentMonth || selectedYear !== currentYear) && (
          <button
            onClick={goToCurrentMonth}
            className="cycle-button"
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            📅 Today
          </button>
        )}
      </div>

      {/* Main Controls */}
      <div className="cycle-controls">
        <button onClick={() => setIsModalOpen(true)} className="cycle-button">
          ➕ Add Cycle
        </button>
        <button onClick={predictCycle} className="cycle-button">
          🔮 Predict Next Cycle
        </button>
        <button onClick={updateCycleLengths} className="cycle-button">
          🔄 Refresh Analytics
        </button>
        <button
          onClick={toggleAstrology}
          className="cycle-button"
          style={{
            background: astrologyEnabled
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, #6b7280, #4b5563)',
            color: 'white'
          }}
        >
          ✨ {astrologyEnabled ? "Disable Astrology" : "Enable Astrology"}
        </button>
      </div>

      {/* Zodiac Controls */}
      {astrologyEnabled && (
        <div className="zodiac-controls">
          <div className="zodiac-dropdown">
            <label htmlFor="zodiac-sign">Your Zodiac Sign:</label>
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
          <button onClick={openAstrologyModal} className="cycle-button">
            🌟 View Astrology Insights
          </button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="cycle-main-content">
        {/* Calendar Section */}
        <div className="cycle-calendar-section">
          <h3 className="calendar-title">📅 Cycle Calendar</h3>
          <Calendar
            onChange={setCalendarDate}
            value={calendarDate}
            tileClassName={tileClassName}
          />
          <div style={{ marginTop: '20px', fontSize: '12px', color: '#6b7280' }}>
            <div><span style={{display: 'inline-block', width: '12px', height: '12px', background: '#ec4899', borderRadius: '50%', marginRight: '8px'}}></span>Next Period</div>
            <div><span style={{display: 'inline-block', width: '12px', height: '12px', background: '#10b981', borderRadius: '50%', marginRight: '8px'}}></span>Ovulation</div>
            <div><span style={{display: 'inline-block', width: '12px', height: '12px', background: '#f59e0b', borderRadius: '50%', marginRight: '8px'}}></span>Fertile Window</div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="cycle-analytics-section">
          <h3 className="analytics-title">📊 {getMonthName(selectedMonth)} Analytics</h3>
          
          {getCurrentMonthCycles().length > 0 ? (
            <>
              {/* Analytics Summary Cards */}
              {analyticsSummary && (
                <div className="analytics-cards" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '15px',
                  marginBottom: '20px'
                }}>
                  <div className="analytics-card" style={{
                    background: 'rgba(236, 72, 153, 0.1)',
                    padding: '15px',
                    borderRadius: '10px',
                    textAlign: 'center',
                    border: '1px solid rgba(236, 72, 153, 0.2)'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#ec4899' }}>
                      {getCurrentMonthCycles().length}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>This Month</div>
                  </div>
                  <div className="analytics-card" style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    padding: '15px',
                    borderRadius: '10px',
                    textAlign: 'center',
                    border: '1px solid rgba(139, 92, 246, 0.2)'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#8b5cf6' }}>
                      {analyticsSummary.avgPeriodLength}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Avg Period</div>
                  </div>
                  {analyticsSummary.avgCycleLength > 0 && (
                    <div className="analytics-card" style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      padding: '15px',
                      borderRadius: '10px',
                      textAlign: 'center',
                      border: '1px solid rgba(16, 185, 129, 0.2)'
                    }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#10b981' }}>
                        {analyticsSummary.avgCycleLength}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Avg Cycle</div>
                    </div>
                  )}
                  <div className="analytics-card" style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    padding: '15px',
                    borderRadius: '10px',
                    textAlign: 'center',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#f59e0b' }}>
                      {cycleData.length}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Total Ever</div>
                  </div>
                </div>
              )}

              <div className="chart-container">
                <BarChart width={400} height={250} data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" />
                  <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => {
                      let color = '#10b981'; // Default green for individual cycles
                      if (entry.name === 'Period Length') color = '#ec4899'; // Pink
                      if (entry.name === 'Cycle Length') color = '#8b5cf6'; // Purple
                      if (entry.name === 'Average Cycle') color = '#6b7280'; // Gray
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </div>

              {/* Month-specific cycle list */}
              <div className="month-cycles-section" style={{ marginTop: '20px' }}>
                <h4 style={{ color: '#ec4899', marginBottom: '15px' }}>📝 Cycles This Month</h4>
                <div className="cycles-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {getCurrentMonthCycles().map((cycle, index) => (
                    <div key={cycle._id} className="cycle-item" style={{
                      background: 'rgba(251, 207, 232, 0.1)',
                      padding: '15px',
                      borderRadius: '10px',
                      border: '1px solid rgba(236, 72, 153, 0.2)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#ec4899' }}>
                          {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '4px' }}>
                          Period: {cycle.periodLength} days • Cycle: {cycle.cycleLength ? `${cycle.cycleLength} days` : 'First cycle'} • Phase: {cycle.phase}
                        </div>
                        {cycle.moonPhase && (
                          <div style={{ fontSize: '0.8rem', color: '#8b5cf6', marginTop: '2px' }}>
                            🌙 Moon: {cycle.moonPhase}
                          </div>
                        )}
                      </div>
                      <div className="phase-icon">
                        {getPhaseIcon(cycle.phase)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {prediction && (
                <div className="predictions-section">
                  <h4 className="predictions-title">🔮 Predictions</h4>
                  <div className="prediction-item">
                    <span className="prediction-icon">🩸</span>
                    <span><strong>Next Period:</strong> {new Date(prediction.nextPeriodDate).toDateString()}</span>
                  </div>
                  <div className="prediction-item">
                    <span className="prediction-icon">✨</span>
                    <span><strong>Fertile Window:</strong> {new Date(prediction.fertileWindow.start).toDateString()} - {new Date(prediction.fertileWindow.end).toDateString()}</span>
                  </div>
                  <div className="prediction-item">
                    <span className="prediction-icon">🥚</span>
                    <span><strong>Ovulation Date:</strong> {new Date(prediction.ovulationDate).toDateString()}</span>
                  </div>
                  <div className="prediction-item">
                    <span className="prediction-icon">📏</span>
                    <span><strong>Average Cycle:</strong> {prediction.averageCycleLength} days</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#6b7280',
              padding: '40px 20px',
              background: 'rgba(251, 207, 232, 0.1)',
              borderRadius: '15px',
              border: '2px dashed rgba(236, 72, 153, 0.2)'
            }}>
              <p style={{ fontSize: '2rem', marginBottom: '15px' }}>📊</p>
              <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>No cycles for {getMonthName(selectedMonth)} {selectedYear}</p>
              <p style={{ fontSize: '0.9rem' }}>Add a cycle for this month to see analytics!</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Cycle Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        contentLabel="Add Cycle Dates"
        className="modal"
        overlayClassName="modal-overlay"
      >
        <h3>Select Your Cycle Dates</h3>
        <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
          Select the start and end dates of your menstrual period
        </p>
        <Calendar
          onChange={setCalendarDate}
          value={calendarDate}
          selectRange={true}
        />
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
          <button onClick={addCycle} className="cycle-button">
            💾 Save Cycle
          </button>
          <button onClick={() => setIsModalOpen(false)} className="cycle-button"
            style={{ background: 'linear-gradient(135deg, #6b7280, #4b5563)', color: 'white' }}>
            ❌ Cancel
          </button>
        </div>
      </Modal>

      {/* Astrology Modal */}
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
          <h3 className="modal-title">
            ✨ Astrology Insights for {cycleData.length > 0 ? cycleData[0]?.phase : 'Current'} Phase
          </h3>
          {cycleData.length > 0 && (
            <div className="moon-phase-container">
              <div className="moon-phase-icon">
                {getPhaseIcon(cycleData[0]?.phase)}
              </div>
              <p className="moon-phase-text">
                <strong>Moon Phase:</strong> {cycleData[0]?.moonPhase || 'Loading...'}
              </p>
            </div>
          )}
          {suggestion && (
            <div className="suggestion-box">
              <h4 className="suggestion-title">🌟 Your Astrology Suggestions</h4>
              <div className="suggestion-content">
                {suggestion.split("\n\n").slice(0, 7).map((section, index) => (
                  <p key={index}>{section.trim()}</p>
                ))}
              </div>
            </div>
          )}
          {!suggestion && cycleData.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p style={{ fontSize: '2rem', marginBottom: '15px' }}>🌙</p>
              <p>Add a cycle to get personalized astrology insights!</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CycleTracker;