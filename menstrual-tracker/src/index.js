import React from "react";
import ReactDOM from "react-dom/client"; // Use 'react-dom/client' in React 18
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

// Create a root and render the app inside the root
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
