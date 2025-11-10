import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Home from "./components/Home";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";
import Dashboard from "./components/Dashboard";
import CycleTracker from "./components/CycleTracker";
import NutritionGuide from "./components/NutritionGuide";
import EducationalInsights from "./components/EducationalInsights";
import EVA from "./components/EVA";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cycle-tracker" element={<CycleTracker />} />
          <Route path="/nutrition" element={<NutritionGuide />} />
          <Route path="/insights" element={<EducationalInsights />} />
          <Route path="/eva" element={<EVA />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
