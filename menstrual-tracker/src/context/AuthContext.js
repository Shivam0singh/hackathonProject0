// import React, { createContext, useState } from "react";
// import axios from "axios";

// const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [token, setToken] = useState(localStorage.getItem("token") || "");
//   const [userId, setUserId] = useState(localStorage.getItem("userId") || "");

//   const login = async (identifier, password) => {
//     try { 
//       const response = await axios.post("https://luna-backend-56fr.onrender.com/api/login", { identifier, password });
//       localStorage.setItem("token", response.data.token);
//       localStorage.setItem("userId", response.data.userId); 
//       setToken(response.data.token);
//       setUserId(response.data.userId);
//     } catch (error) {
//       console.error("Login failed:", error);
//     }
//   };

//   // const register = async (username, email, password) => {
//   //   try {
//   //     await axios.post("https://luna-backend-56fr.onrender.com/api/register", { username, email, password });
//   //     console.log("User registered successfully");
//   //   } catch (error) {
//   //     console.error("Registration failed:", error);
//   //   }
//   // };

//   // In AuthContext.js
// const register = async (username, email, password) => {
//   try {
//     await axios.post("https://luna-backend-56fr.onrender.com/api/register", 
//       { username, email, password },
//       {
//         withCredentials: true,
//         headers: {
//           'Content-Type': 'application/json',
//         }
//       }
//     );
//     console.log("User registered successfully");
//   } catch (error) {
//     console.error("Registration failed:", error);
//   }
// };
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


import React, { createContext, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userId, setUserId] = useState(localStorage.getItem("userId") || "");

  const login = async (identifier, password) => {
    try { 
      const response = await axios.post(
        "https://luna-backend-56fr.onrender.com/api/login", 
        { identifier, password },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("userId", response.data.userId); 
      setToken(response.data.token);
      setUserId(response.data.userId);
      return response.data;
    } catch (error) {
      console.error("Login failed:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await axios.post(
        "https://luna-backend-56fr.onrender.com/api/register", 
        { username, email, password },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );
      console.log("Registration successful:", response.data);
      return response.data;
    } catch (error) {
      console.error("Registration failed:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
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