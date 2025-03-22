// import React from 'react';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import Home from './components/Home';
// import Dashboard from './components/Dashboard';
// import Navbar from './components/Navbar';
// import './App.css';

// function App() {
//   return (
//     <Router>
//       <Navbar />
//       <div className="container">
//         <Routes>
//           <Route path="/" element={<Home />} />
//           <Route path="/dashboard" element={<Dashboard />} />
//         </Routes>
//       </div>
//     </Router>
//   );
// }

// export default App;


import React, { useContext } from "react";
import AuthContext from "./context/AuthContext";
import CycleTracker from "./components/CycleTracker";
import Login from "./components/Login";
import Register from "./components/Register";

function App() {
  const { token } = useContext(AuthContext);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-6">Holistic Menstrual Tracker</h1>
      {token ? <CycleTracker /> : (
        <div>
          <Login />
          <Register />
        </div>
      )}
    </div>
  );
}

export default App;