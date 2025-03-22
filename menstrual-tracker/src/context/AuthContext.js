import React, { createContext, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  // Login function
  const login = async (username, password) => {
    try {
      const response = await axios.post("http://localhost:5001/api/login", { username, password });
      localStorage.setItem("token", response.data.token); // Save token to localStorage
      setToken(response.data.token); // Update token state
      return response.data; // Return response data
    } catch (error) {
      console.error("Login error:", error);
      throw error; // Rethrow the error for the caller to handle
    }
  };

  // Register function
  const register = async (username, password) => {
    try {
      const response = await axios.post(
        "http://localhost:5001/api/register",
        { username, password },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log(response.data); // Log the response for debugging
      return response.data; // Return response data
    } catch (error) {
      console.error("Registration error:", error);
      throw error; // Rethrow the error for the caller to handle
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("token"); // Remove token from localStorage
    setToken(""); // Clear token state
  };

  return (
    <AuthContext.Provider value={{ token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;