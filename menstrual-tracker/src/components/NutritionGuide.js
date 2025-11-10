import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Modal from "react-modal";
import "../styles/NutritionGuide.css";

Modal.setAppElement("#root");

const NutritionGuide = () => {
  const [phase, setPhase] = useState("menstrual");
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const getNutritionTips = async () => {
    setLoading(true);
    const prompt = `Provide diet recommendations for the ${phase} phase of the menstrual cycle. Organize the recommendations into Breakfast, Lunch, Dinner, and Snacks. For each meal, provide a one-line explanation of why it's beneficial.`;
    console.log("Sending prompt to Gemini API:", prompt); 
  
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log("API Response:", text); 
  
      const formattedMeals = formatMeals(text); 
      setMeals(formattedMeals);
    } catch (error) {
      console.error("Error fetching nutrition tips:", error);
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };

  const formatMeals = (text) => {
    console.log("Raw API Response:", text); 
  
    const meals = [];
    const lines = text.split("\n").filter((line) => line.trim() !== "");
  
    let currentMeal = null;
    lines.forEach((line) => {
      line = line.replace(/\*\*/g, "").replace(/\*/g, "").trim();
  
      if (line.startsWith("Breakfast")) {
        currentMeal = { type: "Breakfast", description: line.replace("Breakfast", "").replace(":", "").trim() };
      } else if (line.startsWith("Lunch")) {
        currentMeal = { type: "Lunch", description: line.replace("Lunch", "").replace(":", "").trim() };
      } else if (line.startsWith("Dinner")) {
        currentMeal = { type: "Dinner", description: line.replace("Dinner", "").replace(":", "").trim() };
      } else if (line.startsWith("Snacks")) {
        currentMeal = { type: "Snacks", description: line.replace("Snacks", "").replace(":", "").trim() };
      } else if (currentMeal) {
        currentMeal.description += ` ${line.trim()}`;
      }
  
      if (currentMeal && !meals.some((meal) => meal.type === currentMeal.type)) {
        meals.push(currentMeal);
      }
    });
  
    console.log("Formatted Meals:", meals); 
    return meals;
  };

  const handlePhaseChange = (e) => {
    setPhase(e.target.value);
  };

  // Function to count words in text
  const countWords = (text) => {
    return text.trim().split(/\s+/).length;
  };

  // Function to truncate text to specified word count
  const truncateText = (text, wordLimit = 50) => {
    const words = text.trim().split(/\s+/);
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  // Function to open modal with full meal content
  const openMealModal = (meal) => {
    setSelectedMeal(meal);
    setIsModalOpen(true);
  };

  return (
    <div className="nutrition-guide">
      <h2>Nutrition Guide</h2>
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
            const wordCount = countWords(meal.description);
            const isLongContent = wordCount > 50;
            const displayText = isLongContent ? truncateText(meal.description) : meal.description;

            return (
              <div key={index} className="meal-card">
                <h3>{meal.type}</h3>
                <p>{displayText}</p>
                {isLongContent && (
                  <button
                    className="read-more-btn"
                    onClick={() => openMealModal(meal)}
                  >
                    Read More
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <p>Select a phase and click "Get Nutrition Tips" to see recommendations.</p>
        )}
      </div>

      {/* Modal for Full Meal Content */}
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
            <button
              onClick={() => setIsModalOpen(false)}
              className="close-modal-btn"
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NutritionGuide;

