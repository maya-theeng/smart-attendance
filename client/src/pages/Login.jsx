import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/api";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleNavClick = (e, href) => {
    e.preventDefault();
    navigate("/");
    setTimeout(() => {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await API.post("auth/login/", { email, password });
      sessionStorage.setItem("token", response.data.token);

      const role = response.data.is_admin ? "admin" : response.data.is_teacher ? "teacher" : "student";
      sessionStorage.setItem("role", role);
      sessionStorage.setItem("name", response.data.name || "");

      if (response.data.is_admin) {
        sessionStorage.setItem("admin_name", response.data.name || "Admin");
        navigate("/admin/dashboard");
      } else if (response.data.is_teacher) {
        sessionStorage.setItem("teacher_name", response.data.name || "Teacher");
        navigate("/teacher/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError(err.response.data.detail || "Invalid email or password");
      } else {
        setError("Connection error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-box">
          <h1 className="login-title">Sign in </h1>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" />
                Remember me
              </label>
              <a href="#" className="forgot-password">Forgot Password?</a>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>



          <p className="login-footer">
            Don't have an account? <Link to="/#contact" onClick={(e) => handleNavClick(e, "#contact")}
              className="signup-link">Contact admin</Link>
          </p>
        </div>

        <div className="login-image">
          <img
            src="/images/attendance.png"
            alt="Login Illustration"
            className="login-img"
          />
        </div>
      </div>
    </div>
  );
}
