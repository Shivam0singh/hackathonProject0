import React, { useState, useContext } from "react";
import AuthContext from "../context/AuthContext";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { register } = useContext(AuthContext);

  const handleSubmit = (e) => {
    e.preventDefault();
    register(username, password);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="p-2 border rounded"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="p-2 border rounded"
      />
      <button type="submit" className="bg-green-500 text-white p-2 rounded">
        Register
      </button>
    </form>
  );
};

export default Register;