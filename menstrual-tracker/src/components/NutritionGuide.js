import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "../styles/NutritionGuide.css";

const NutritionGuide = () => {
  const [phase, setPhase] = useState("menstrual"); 
  const [meals, setMeals] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);

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
          meals.map((meal, index) => (
            <div key={index} className="meal-card">
              <h3>{meal.type}</h3>
              <p>{meal.description}</p>
            </div>
          ))
        ) : (
          <p>Select a phase and click "Get Nutrition Tips" to see recommendations.</p>
        )}
      </div>
    </div>
  );
};

export default NutritionGuide;

