import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import "./Auth.css";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [error, setError] = useState("");
  const { login, register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (isLogin) {
      const result = login(formData.email, formData.password);
      if (!result.success) {
        setError(result.error);
      }
    } else {
      if (!formData.name.trim()) {
        setError("Name is required");
        return;
      }
      const result = register(formData.email, formData.password, formData.name);
      if (!result.success) {
        setError(result.error);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isLogin ? "Login" : "Register"}</h2>

        {isLogin && (
          <div className="demo-info">
            <p>
              <strong>Demo Account:</strong>
            </p>
            <p>Email: demo@demo.com</p>
            <p>Password: demo123</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" className="auth-button">
            {isLogin ? "Login" : "Register"}
          </button>
        </form>

        <p>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            className="switch-button"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
