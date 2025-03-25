import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Home.css";

function Home() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/cycle-tracker"); 
  };

  useEffect(() => {
    const starsContainer = document.querySelector(".stars");

    const createStar = () => {
      const star = document.createElement("div");
      star.className = "star";
      const size = Math.random() * 3 + 1; 
      const posX = Math.random() * window.innerWidth;
      const posY = Math.random() * window.innerHeight;
      const duration = Math.random() * 3 + 2; 
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.top = `${posY}px`;
      star.style.left = `${posX}px`;
      star.style.animationDuration = `${duration}s`;
      starsContainer.appendChild(star);
    };

    for (let i = 0; i < 100; i++) {
      createStar();
    }

    const starInterval = setInterval(() => {
      createStar();
    }, 1000); 

    return () => clearInterval(starInterval);
  }, []);

  return (
    <div className="home">
      <div className="stars"></div>
      <div className="moon-animation"></div>
      <h1 className="home-title">Welcome to Luna</h1>
      <p className="home-tagline">Your personalized menstrual health guide</p>
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