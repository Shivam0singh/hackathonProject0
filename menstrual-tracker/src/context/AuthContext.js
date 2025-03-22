import React, { createContext, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  const login = async (username, password) => {
    const response = await axios.post("http://localhost:5000/api/login", { username, password });
    localStorage.setItem("token", response.data.token);
    setToken(response.data.token);
  };

  const register = async (username, password) => {
    await axios.post("http://localhost:5000/api/register", { username, password });
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