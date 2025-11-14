import React, { useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import "../styles/Navbar.css";

const Navbar = () => {
  const { token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Check if we're on the home page
  const isHomePage = location.pathname === '/';

  return (
    <nav className={`navbar ${!isHomePage ? 'navbar-gradient' : ''}`}>
      <Link to="/" className="navbar-brand">Luna</Link>
      <ul className="navbar-list">
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
              <Link to="/eva">EVA</Link>
            </li>
            <li>
              <button className="logout-button" onClick={handleLogout}>Logout</button>
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