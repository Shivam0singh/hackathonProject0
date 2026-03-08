// import React, { createContext, useState, useEffect } from "react";
// import axios from "axios";

// const AuthContext = createContext();

// // Helper: decode JWT payload without verifying signature (client-side only)
// const decodeToken = (token) => {
//   try {
//     return JSON.parse(atob(token.split(".")[1]));
//   } catch {
//     return null;
//   }
// };

// // FIX: Check if a token is expired before trusting it
// const isTokenExpired = (token) => {
//   const payload = decodeToken(token);
//   if (!payload?.exp) return true;
//   // exp is in seconds, Date.now() in ms
//   return payload.exp * 1000 < Date.now();
// };

// export const AuthProvider = ({ children }) => {
//   const [token, setToken] = useState(() => {
//     const stored = localStorage.getItem("token");
//     // FIX: Don't restore an expired token on page load
//     if (stored && isTokenExpired(stored)) {
//       localStorage.removeItem("token");
//       localStorage.removeItem("userId");
//       return "";
//     }
//     return stored || "";
//   });

//   const [userId, setUserId] = useState(localStorage.getItem("userId") || "");

//   // FIX: Auto-logout when token expires while app is open
//   useEffect(() => {
//     if (!token) return;

//     const payload = decodeToken(token);
//     if (!payload?.exp) return;

//     const msUntilExpiry = payload.exp * 1000 - Date.now();
//     if (msUntilExpiry <= 0) {
//       logout();
//       return;
//     }

//     const timer = setTimeout(() => {
//       console.log("Token expired, logging out.");
//       logout();
//     }, msUntilExpiry);

//     return () => clearTimeout(timer);
//   }, [token]);

//   const login = async (identifier, password) => {
//     try {
//       const response = await axios.post(
//         "https://luna-backend-56fr.onrender.com/api/login",
//         { identifier, password }
//       );
//       const newToken = response.data.token;
//       const payload = decodeToken(newToken);
//       const extractedUserId = payload?.userId;

//       localStorage.setItem("token", newToken);
//       localStorage.setItem("userId", extractedUserId);
//       setToken(newToken);
//       setUserId(extractedUserId);
//     } catch (error) {
//       console.error("Login failed:", error);
//       throw error;
//     }
//   };

//   const register = async (username, email, password) => {
//     try {
//       await axios.post("https://luna-backend-56fr.onrender.com/api/register", {
//         username,
//         email,
//         password,
//       });
//     } catch (error) {
//       console.error("Registration failed:", error.response?.data || error.message);
//       throw error;
//     }
//   };

//   const logout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("userId");
//     setToken("");
//     setUserId("");
//   };

//   return (
//     <AuthContext.Provider value={{ token, userId, login, register, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export default AuthContext;


import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import API_URL from "../config";

const AuthContext = createContext();

const decodeToken = (token) => {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 < Date.now();
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem("token");
    if (stored && isTokenExpired(stored)) {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      return "";
    }
    return stored || "";
  });

  const [userId, setUserId] = useState(localStorage.getItem("userId") || "");

  useEffect(() => {
    if (!token) return;
    const payload = decodeToken(token);
    if (!payload?.exp) return;
    const msUntilExpiry = payload.exp * 1000 - Date.now();
    if (msUntilExpiry <= 0) { logout(); return; }
    const timer = setTimeout(() => { console.log("Token expired, logging out."); logout(); }, msUntilExpiry);
    return () => clearTimeout(timer);
  }, [token]);

  const login = async (identifier, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/login`, { identifier, password });
      const newToken = response.data.token;
      const payload = decodeToken(newToken);
      const extractedUserId = payload?.userId;
      localStorage.setItem("token", newToken);
      localStorage.setItem("userId", extractedUserId);
      setToken(newToken);
      setUserId(extractedUserId);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const register = async (username, email, password) => {
    try {
      await axios.post(`${API_URL}/api/register`, { username, email, password });
    } catch (error) {
      console.error("Registration failed:", error.response?.data || error.message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    console.log(localStorage,"tokeennn")
    localStorage.removeItem("userId");
    setToken("");
    setUserId("");
  };

  return (
    <AuthContext.Provider value={{ token, userId, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;