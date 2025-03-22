import React, { useContext } from "react";
import { Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import "../styles/Navbar.css";

const Navbar = () => {
  const { token, logout } = useContext(AuthContext);

  return (
    <nav className="navbar">
      <ul className="navbar-list">
        <li>
          <Link to="/">Home</Link>
        </li>
        {token ? (
          <>
            <li>
              <Link to="/dashboard">Dashboard</Link>
            </li>
            <li>
              <Link to="/cycle-tracker">Cycle Tracker</Link>
            </li>
            <li>
              <button onClick={logout}>Logout</button>
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