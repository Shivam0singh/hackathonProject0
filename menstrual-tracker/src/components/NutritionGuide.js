import React, { useState, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import API_URL from "../config";
import Modal from "react-modal";
import "../styles/NutritionGuide.css";

Modal.setAppElement("#root");

// FIX: Gemini is now called from the backend — no API key in frontend
const NutritionGuide = () => {
  const { token } = useContext(AuthContext);
  const [phase, setPhase] = useState("menstrual");
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getNutritionTips = async () => {
    if (!token) {
      setError("Please log in to get nutrition tips.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        `${API_URL}/api/nutrition-tips`,
        { phase },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const formatted = formatMeals(response.data.tips);
      setMeals(formatted);
    } catch (err) {
      console.error("Error fetching nutrition tips:", err);
      if (err.response?.status === 429) {
        setError("AI is temporarily rate limited. Please wait a moment and try again.");
      } else {
        setError("Failed to fetch nutrition tips. Please try again.");
      }
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };

  const formatMeals = (text) => {
    const meals = [];
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    let currentMeal = null;

    lines.forEach((line) => {
      line = line.replace(/\*\*/g, "").replace(/\*/g, "").trim();
      if (line.startsWith("Breakfast")) {
        // Save previous meal before starting a new one
        if (currentMeal && !meals.some((m) => m.type === currentMeal.type)) {
          meals.push({ ...currentMeal });
        }
        currentMeal = { type: "Breakfast", description: line.replace("Breakfast", "").replace(":", "").trim() };
      } else if (line.startsWith("Lunch")) {
        if (currentMeal && !meals.some((m) => m.type === currentMeal.type)) {
          meals.push({ ...currentMeal });
        }
        currentMeal = { type: "Lunch", description: line.replace("Lunch", "").replace(":", "").trim() };
      } else if (line.startsWith("Dinner")) {
        if (currentMeal && !meals.some((m) => m.type === currentMeal.type)) {
          meals.push({ ...currentMeal });
        }
        currentMeal = { type: "Dinner", description: line.replace("Dinner", "").replace(":", "").trim() };
      } else if (line.startsWith("Snacks")) {
        if (currentMeal && !meals.some((m) => m.type === currentMeal.type)) {
          meals.push({ ...currentMeal });
        }
        currentMeal = { type: "Snacks", description: line.replace("Snacks", "").replace(":", "").trim() };
      } else if (currentMeal) {
        currentMeal.description += ` ${line.trim()}`;
      }
    });

    // Don't forget to add the last meal
    if (currentMeal && !meals.some((m) => m.type === currentMeal.type)) {
      meals.push({ ...currentMeal });
    }

    return meals;
  };

  const countWords = (text) => text.trim().split(/\s+/).length;

  const truncateText = (text, wordLimit = 50) => {
    const words = text.trim().split(/\s+/);
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(" ") + "...";
  };

  const openMealModal = (meal) => {
    setSelectedMeal(meal);
    setIsModalOpen(true);
  };

  const handlePhaseChange = (e) => {
    setPhase(e.target.value);
    setMeals([]);
    setError("");
  };

  return (
    <div className="nutrition-guide">
      <h2>Nutrition Guide</h2>

      {error && (
        <div style={{
          background: "rgba(239,68,68,0.1)",
          color: "#dc2626",
          padding: "12px 20px",
          borderRadius: "10px",
          marginBottom: "16px",
          textAlign: "center"
        }}>
          {error}
        </div>
      )}

      <div className="phase-selector">
        <label htmlFor="phase">Select Cycle Phase:</label>
        <select id="phase" value={phase} onChange={handlePhaseChange}>
          <option value="menstrual">Menstrual Phase</option>
          <option value="follicular">Follicular Phase</option>
          <option value="ovulation">Ovulation Phase</option>
          <option value="luteal">Luteal Phase</option>
        </select>
        <button onClick={getNutritionTips} disabled={loading}>
          {loading ? "Loading..." : "Get Nutrition Tips"}
        </button>
      </div>

      <div className="meal-cards">
        {meals.length > 0 ? (
          meals.map((meal, index) => {
            const isLongContent = countWords(meal.description) > 50;
            const displayText = isLongContent ? truncateText(meal.description) : meal.description;
            return (
              <div key={index} className="meal-card">
                <h3>{meal.type}</h3>
                <p>{displayText}</p>
                {isLongContent && (
                  <button className="read-more-btn" onClick={() => openMealModal(meal)}>
                    Read More
                  </button>
                )}
              </div>
            );
          })
        ) : (
          !loading && <p>Select a phase and click "Get Nutrition Tips" to see recommendations.</p>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        contentLabel="Full Meal Details"
        className="nutrition-modal"
        overlayClassName="nutrition-modal-overlay"
      >
        {selectedMeal && (
          <div className="modal-content">
            <h3>{selectedMeal.type} - Detailed Information</h3>
            <p>{selectedMeal.description}</p>
            <button onClick={() => setIsModalOpen(false)} className="close-modal-btn">Close</button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NutritionGuide;

