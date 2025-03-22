import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import AuthContext from "../context/AuthContext";
import "../styles/Navbar.css";

const Navbar = () => {
  const { token, logout } = useContext(AuthContext);
  const navigate = useNavigate(); // Initialize useNavigate

  const handleLogout = () => {
    logout(); // Call the logout function from AuthContext
    navigate("/"); // Redirect to the home screen
  };

  return (
    <nav className="navbar">
      <ul className="navbar-list">
        <li>
          <Link to="/">Home</Link>
        </li>
        {token ? (
          <>
            <li>
              <Link to="/cycle-tracker">Cycle Tracker</Link>
            </li>
            <li>
              <Link to="/nutrition">Nutrition Guide</Link>
            </li>
            <li>
              <Link to="/insights">Educational Insights</Link>
            </li>
            <li>
              <button onClick={handleLogout}>Logout</button> {/* Use handleLogout */}
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login">Login</Link>
            </li>
            <li>
              <Link to="/register">Register</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;