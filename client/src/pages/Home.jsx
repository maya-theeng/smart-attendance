import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Smartphone, Bell, TrendingUp } from "lucide-react";
import API from "../api/api";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });
  const [status, setStatus] = useState("");

  const handleGetStarted = () => {
    navigate("/login");
  };

  const handleLearnMore = () => {
    const featuresSection = document.querySelector("#features");
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setStatus("Sending...");
    try {
      await API.post("contact/", formData);
      setStatus("Message sent successfully!");
      setFormData({ name: "", email: "", message: "" });
      setTimeout(() => setStatus(""), 5000);
    } catch (error) {
      console.error("Error sending message:", error);
      setStatus("Failed to send message. Please try again.");
      setTimeout(() => setStatus(""), 5000);
    }
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section id="home" className="home-hero">
        <div className="home-left">
          <h1 className="home-title">Track Your Attendance</h1>
          <p className="home-subtitle">
            Monitor your attendance records in real-time, stay on top of your academic performance, and ensure you never miss important class updates.
          </p>
          <div className="home-buttons">
            <button className="home-primaryBtn" onClick={handleGetStarted}>Get Started</button>
            <button className="home-secondaryBtn" onClick={handleLearnMore}>Learn More</button>
          </div>
        </div>

        <div className="home-right">
          <img
            src="/images/attendance.png"
            alt="Student Attendance"
            className="home-image"
          />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><BarChart3 size={36} color="#0bc0e4" /></div>
            <h3>Real-time Tracking</h3>
            <p>Get instant updates on your attendance status and track your records seamlessly.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Smartphone size={36} color="#0bc0e4" /></div>
            <h3>Mobile Friendly</h3>
            <p>Access your attendance from any device, anytime, anywhere with our responsive app.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Bell size={36} color="#0bc0e4" /></div>
            <h3>Smart Notifications</h3>
            <p>Receive timely alerts for low attendance and important class announcements.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><TrendingUp size={36} color="#0bc0e4" /></div>
            <h3>Performance Analytics</h3>
            <p>Analyze your attendance patterns and improve your academic performance.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works-section">
        <h2>How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Sign Up</h3>
            <p>Create your account with your email and student ID.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Connect Your Classes</h3>
            <p>Link your enrolled courses to track attendance for each class.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Monitor Status</h3>
            <p>Check your attendance records and get insights on your performance.</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Improve</h3>
            <p>Use analytics to improve your attendance and academic results.</p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <h2>Get In Touch</h2>
        <div className="contact-container">
          <form className="contact-form" onSubmit={handleContactSubmit}>
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Your Name" required />
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Your Email" required />
            <textarea name="message" value={formData.message} onChange={handleInputChange} placeholder="Your Message" rows="5" required></textarea>
            <button type="submit" className="contact-btn">Send Message</button>
            {status && <p className="contact-status" style={{ marginTop: "10px", color: status.includes("Failed") ? "red" : "green" }}>{status}</p>}
          </form>
          <div className="contact-info">
            <div className="info-item">
              <strong>Email</strong>
              <p><a href="mailto:mayatamang0811@gmail.com" className="email-link" style={{ textDecoration: "none" }}>mayatamang0811@gmail.com</a></p>
            </div>
            <div className="info-item">
              <strong>Phone</strong>
              <p>+977-98000000</p>
            </div>
            <div className="info-item">
              <strong>Location</strong>
              <p>Kathmandu,Nepal</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
