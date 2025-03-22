import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Home.css";

function Home() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/cycle-tracker"); 
  };

  return (
    <div className="home">
      <h1 className="home-title">Welcome to Luna</h1>
      <p className="home-description">
        Track your menstrual cycles and stay healthy with personalized insights.
      </p>
      <button className="get-started-button" onClick={handleGetStarted}>
        Get Started
      </button>
    </div>
  );
}

export default Home;