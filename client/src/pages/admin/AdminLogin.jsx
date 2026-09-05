import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/api";
import {
  GraduationCap,
  ShieldCheck,
  Mail,
  Lock,
  LogIn,
  ArrowLeft,
  AlertCircle,
  Users,
  BarChart3,
  Bell,
} from "lucide-react";
import "./AdminLogin.css";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await API.post("auth/login/", { email, password });

      if (!res.data.is_admin) {
        setError("Access Denied: This portal is for Administrators only.");
        return;
      }

      sessionStorage.setItem("token", res.data.token);
      sessionStorage.setItem("admin_name", res.data.name || "Admin");
      sessionStorage.setItem("admin_username", res.data.username || "");
      sessionStorage.setItem("admin_email", res.data.email || "");
      navigate("/admin/dashboard");
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError(err.response.data.detail || "Invalid admin credentials");
      } else {
        setError("Connection error. Please try again.");
      }
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-wrapper">
        {/* Left branding panel */}
        <div className="admin-login-brand">
          <div className="admin-brand-logo">
            <div className="admin-brand-logo-icon">
              <GraduationCap size={28} />
            </div>
            <span>SmartAttend</span>
          </div>

          <h2>Admin Control Center</h2>
          <p>
            Manage students, track attendance in real-time, and keep your
            institution running smoothly — all from one place.
          </p>

          <ul className="admin-brand-features">
            <li>
              <span className="feature-icon"><Users size={16} /></span>
              Manage student records & profiles
            </li>
            <li>
              <span className="feature-icon"><BarChart3 size={16} /></span>
              Real-time attendance analytics
            </li>
            <li>
              <span className="feature-icon"><Bell size={16} /></span>
              Automated low-attendance alerts
            </li>
          </ul>
        </div>

        {/* Right form panel */}
        <div className="admin-login-form-panel">
          <h2>Welcome Back</h2>
          <p className="admin-login-subtitle">
            Sign in to access the admin dashboard
          </p>

          {error && (
            <div className="admin-login-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form className="admin-login-form" onSubmit={handleLogin}>
            <div className="admin-form-field">
              <label htmlFor="admin-email">Email Address</label>
              <div className="admin-input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  id="admin-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@smartattend.edu"
                />
              </div>
            </div>

            <div className="admin-form-field">
              <label htmlFor="admin-password">Password</label>
              <div className="admin-input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  id="admin-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button type="submit" className="admin-submit-btn">
              <ShieldCheck size={18} />
              Sign In to Admin Panel
            </button>
          </form>

          <div className="admin-login-back">
            <a href="/login">
              <ArrowLeft size={14} />
              Back to Student Portal
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
