import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import "../styles/Navbar.css";

const Navbar = () => {
  const { token, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">Luna</div> 
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