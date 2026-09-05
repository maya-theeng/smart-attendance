import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./navbar.css";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  const handleNavClick = (e, href) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
    setOpen(false);
  };

  return (
    <nav className="nav">
      <div className="container">
        <Link to="/" className="logo">Smart Attendance</Link>

        <div className="hamburger" onClick={() => setOpen(!open)}>
          ☰
        </div>

        <div className={`links ${open ? "open" : ""}`}>
          {isHomePage ? (
            <>
              <a href="#home" onClick={(e) => handleNavClick(e, "#home")}>Home</a>
              <a href="#features" onClick={(e) => handleNavClick(e, "#features")}>Features</a>
              <a href="#how-it-works" onClick={(e) => handleNavClick(e, "#how-it-works")}>How It Works</a>
              <a href="#contact" onClick={(e) => handleNavClick(e, "#contact")}>Contact</a>
            </>
          ) : null}
        </div>

        <div className="navbar-section">
          <Link to="/login" className="login-link" onClick={() => setOpen(false)}>
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
}