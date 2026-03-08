import React, { useState, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import API_URL from "../config";
import Modal from "react-modal";
import "../styles/EducationalInsights.css";

Modal.setAppElement("#root");

// FIX: Gemini is now called from the backend — no API key in frontend
const EducationalInsights = () => {
  const { token } = useContext(AuthContext);
  const [topic, setTopic] = useState("cramps");
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const getInsights = async () => {
    if (!token) {
      setError("Please log in to get insights.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        `${API_URL}/api/educational-insights`,
        { topic },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const formatted = formatInsights(response.data.insights);
      setInsights(formatted);
    } catch (err) {
      console.error("Error fetching insights:", err);
      if (err.response?.status === 429) {
        setError("AI is temporarily rate limited. Please wait a moment and try again.");
      } else {
        setError("Failed to fetch insights. Please try again.");
      }
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  const formatInsights = (text) => {
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    const filtered = lines.filter((line) => !line.toLowerCase().includes("here are"));
    return filtered.map((line) => ({
      id: Math.random().toString(36).substring(7),
      content: line.replace(/\*/g, "").trim(),
    }));
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInsights = insights.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(insights.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleTopicChange = (e) => {
    setTopic(e.target.value);
    setCurrentPage(1);
    setInsights([]);
    setError("");
  };

  return (
    <div className="educational-insights">
      <h2>Educational Insights</h2>

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

      <div className="topic-selector">
        <label htmlFor="topic">Select a Topic:</label>
        <select id="topic" value={topic} onChange={handleTopicChange}>
          <option value="cramps">Managing Cramps</option>
          <option value="mood">Hormonal Changes & Mood</option>
          <option value="myths">Myths and Facts</option>
        </select>
        <button onClick={getInsights} disabled={loading}>
          {loading ? "Loading..." : "Get Insights"}
        </button>
      </div>

      <div className="insight-cards">
        {currentInsights.length > 0 ? (
          currentInsights.map((insight) => (
            <div key={insight.id} className="insight-card">
              <div className="insight-icon">💡</div>
              <p>{insight.content}</p>
            </div>
          ))
        ) : (
          !loading && (
            <p>Select a topic and click "Get Insights" to see educational content.</p>
          )
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="pagination-btn prev">
            ← Previous
          </button>
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
              <button
                key={number}
                onClick={() => paginate(number)}
                className={`page-number ${currentPage === number ? "active" : ""}`}
              >
                {number}
              </button>
            ))}
          </div>
          <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-btn next">
            Next →
          </button>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        contentLabel="Full Insight"
        className="modal"
        overlayClassName="modal-overlay"
      >
        <h3>Full Insight</h3>
        <p>{selectedInsight}</p>
        <button onClick={() => setIsModalOpen(false)} className="close-button">Close</button>
      </Modal>
    </div>
  );
};

export default EducationalInsights;

