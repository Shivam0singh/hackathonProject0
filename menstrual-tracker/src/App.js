import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Home from "./components/Home";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";
import AuthContext from "./context/AuthContext";
import Dashboard from "./components/Dashboard";
import CycleTracker from "./components/CycleTracker";
import NutritionGuide from "./components/NutritionGuide";
import EducationalInsights from "./components/EducationalInsights";
import EVA from "./components/EVA";

// FIX: Protected route wrapper — redirects to /login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { token } = useContext(AuthContext);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes — require login */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/cycle-tracker" element={<ProtectedRoute><CycleTracker /></ProtectedRoute>} />
          <Route path="/nutrition" element={<ProtectedRoute><NutritionGuide /></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><EducationalInsights /></ProtectedRoute>} />
          <Route path="/eva" element={<ProtectedRoute><EVA /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;