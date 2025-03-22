import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AuthContext from "./context/AuthContext";
import Home from "./components/Home";
import Dashboard from "./components/Dashboard";
import Navbar from "./components/Navbar";
import CycleTracker from "./components/CycleTracker";
import Login from "./components/Login";
import Register from "./components/Register";
import "./App.css";

function App() {
  const { token } = useContext(AuthContext);

  return (
    <Router>
      <Navbar />
      <div className="container">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          {token ? (
            <>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/cycle-tracker" element={<CycleTracker />} />
            </>
          ) : (
            <Route path="*" element={<Login />} /> 
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;