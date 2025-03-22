import React, { createContext, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  const login = async (username, password) => {
    try {
      const response = await axios.post("http://localhost:5001/api/login", { username, password });
      localStorage.setItem("token", response.data.token);
      setToken(response.data.token);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const register = async (username, password) => {
    try {
      await axios.post("http://localhost:5001/api/register", { username, password });
      console.log("User registered successfully");
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
  };

  return (
    <AuthContext.Provider value={{ token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;