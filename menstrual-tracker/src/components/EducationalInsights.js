import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Modal from "react-modal";
import "../styles/EducationalInsights.css";

Modal.setAppElement("#root"); // Set the root element for accessibility

const EducationalInsights = () => {
  const [topic, setTopic] = useState("cramps"); // Default topic
  const [insights, setInsights] = useState([]); // Store insights as an array of objects
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState("");

  const API_KEY = process.env.REACT_APP_GEMINI_API_KEY; // Replace with your API key
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const getInsights = async () => {
    setLoading(true);
    let prompt = "";

    // Set the prompt based on the selected topic
    switch (topic) {
      case "cramps":
        prompt = `Provide 5 concise, science-backed facts about managing menstrual cramps. Format the response as a list, like this:
        - Take over-the-counter pain relievers like ibuprofen to block prostaglandins.
        - Apply heat via a heating pad to relax uterine muscles.
        - Engage in light exercise like yoga to release endorphins.
        - Consider taking magnesium supplements to reduce cramping severity.
        - Consume anti-inflammatory foods like fruits and vegetables.`;
        break;
      case "mood":
        prompt = `Explain how hormonal changes during the menstrual cycle affect mood. Format the response as a list, like this:
        - Hormonal fluctuations can cause mood swings due to changes in serotonin levels.
        - Estrogen levels rise and fall throughout the cycle, affecting mood regulation.
        - Track your cycle and mood to identify patterns.
        - Practice relaxation techniques like deep breathing or yoga.
        - Limit caffeine and processed foods to stabilize mood.`;
        break;
      case "myths":
        prompt = `List 5 common myths and facts about menstruation. Format the response as a list, like this:
        - Myth: You can't get pregnant during your period.
        - Fact: While unlikely, pregnancy is still possible due to sperm survival.
        - Myth: Menstrual blood is dirty.
        - Fact: Menstrual blood is a natural bodily fluid and is not dirty.
        - Myth: You shouldn't exercise during your period.
        - Fact: Light exercise can actually help reduce cramps and improve mood.`;
        break;
      default:
        prompt = `Provide 5 general, concise, and science-backed menstrual health facts. Format the response as a list, like this:
        - Stay hydrated to reduce bloating and cramps.
        - Track your menstrual cycle to understand patterns.
        - Avoid caffeine and salty foods to minimize discomfort.
        - Use a heating pad to relieve cramps.
        - Consult a healthcare provider for persistent issues.`;
    }

    console.log("Sending prompt to Gemini API:", prompt); // Log the prompt

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log("API Response:", text); // Log the API response

      const formattedInsights = formatInsights(text); // Format the response
      setInsights(formattedInsights);
    } catch (error) {
      console.error("Error fetching insights:", error);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to format the API response into structured insights
  const formatInsights = (text) => {
    console.log("Raw API Response:", text); // Log the raw response

    // Split the response into lines and remove empty lines
    const lines = text.split("\n").filter((line) => line.trim() !== "");

    // Filter out unwanted lines (e.g., "Here are 5 science-backed facts...")
    const filteredLines = lines.filter((line) => !line.toLowerCase().includes("here are"));

    // Format the response into an array of objects
    const formattedInsights = filteredLines.map((line) => ({
      id: Math.random().toString(36).substring(7), // Generate a unique ID
      content: line.replace(/\*/g, "").trim(), // Remove asterisks and trim spaces
    }));

    console.log("Formatted Insights:", formattedInsights); // Log the formatted insights
    return formattedInsights;
  };

  return (
    <div className="educational-insights">
      <h2>Educational Insights</h2>
      <div className="topic-selector">
        <label htmlFor="topic">Select a Topic:</label>
        <select id="topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="cramps">Managing Cramps</option>
          <option value="mood">Hormonal Changes & Mood</option>
          <option value="myths">Myths and Facts</option>
        </select>
        <button onClick={getInsights} disabled={loading}>
          {loading ? "Loading..." : "Get Insights"}
        </button>
      </div>

      {/* Insight List with Icons */}
      <div className="insight-list">
        {insights.map((insight) => (
          <div key={insight.id} className="insight-item">
            <span className="insight-icon">•</span> {/* Icon (bullet point) */}
            <p>{insight.content}</p>
          </div>
        ))}
      </div>

      {/* Modal for Full Insight */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        contentLabel="Full Insight"
        className="modal"
        overlayClassName="modal-overlay"
      >
        <h3>Full Insight</h3>
        <p>{selectedInsight}</p>
        <button onClick={() => setIsModalOpen(false)} className="close-button">
          Close
        </button>
      </Modal>
    </div>
  );
};

export default EducationalInsights;