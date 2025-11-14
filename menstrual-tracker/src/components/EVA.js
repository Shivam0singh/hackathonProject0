import React from "react";
import "../styles/EVA.css";

const EVA = () => {
  return (
    <div className="eva-container">
      <div className="eva-content">
        <div className="eva-icon">
          <div className="ai-orb">
            <div className="orb-inner"></div>
            <div className="orb-pulse"></div>
          </div>
        </div>
        
        <h1 className="eva-title">
          Meet EVA<span className="crescent-moon">🌙</span>
        </h1>
        <p className="eva-subtitle">Your Empathic Virtual Assistant</p>
        
        <div className="eva-description">
          <p>EVA is Luna's intelligent companion, designed to understand your unique cycle patterns, provide personalized insights, and answer your health questions with care and precision.</p>
        </div>
        
        <div className="features-preview">
          <div className="feature-item">
            <span className="feature-icon">🤖</span>
            <span>Personalized Cycle Insights</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">💬</span>
            <span>24/7 Health Support</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <span>Intelligent Pattern Recognition</span>
          </div>
        </div>
        
        <div className="coming-soon">
          <span className="coming-soon-text">Coming Soon</span>
          <div className="loading-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
        
        <div className="eva-disclaimer">
          <strong>Please Note:</strong> EVA is currently in development and will be available soon. This AI assistant will provide personalized health insights and support for your menstrual health journey. Stay tuned for updates!
        </div>
      </div>
    </div>
  );
};

export default EVA;