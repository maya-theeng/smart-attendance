import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Camera, 
  Calendar, 
  BookOpen, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  GraduationCap,
  Settings
} from "lucide-react";
import "../admin/AdminLayout.css"; // Reuse sidebar layout styles

export default function TeacherLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const token = sessionStorage.getItem("token");
  const role = sessionStorage.getItem("role");

  if (!token || role !== "teacher") {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const navItems = [
    { path: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/teacher/take-attendance", label: "Take Attendance", icon: Camera },
    { path: "/teacher/records", label: "Records", icon: Calendar },
    { path: "/teacher/subjects", label: "Subjects", icon: BookOpen },
    { path: "/teacher/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${isCollapsed ? "collapsed" : ""}`}>
        <div className="admin-brand">
          <span className="admin-brand-icon">
            <GraduationCap size={32} color="#0bc0e4" />
          </span>
          {!isCollapsed && (
            <div className="admin-brand-text">
              <span className="admin-brand-name">SmartAttend</span>
              <span className="admin-brand-badge" style={{ backgroundColor: "#e0f7fc", color: "#0bc0e4" }}>Faculty Portal</span>
            </div>
          )}
        </div>

        <button 
          className="admin-sidebar-toggle" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title="Toggle Sidebar"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <nav className="admin-nav">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : ""}
                className={`admin-nav-item ${isActive ? "active" : ""}`}
              >
                <span className="admin-nav-icon">
                  <IconComponent size={20} />
                </span>
                {!isCollapsed && <span className="admin-nav-label">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button className="admin-logout" onClick={handleLogout} title={isCollapsed ? "Logout" : ""}>
          <span className="admin-nav-icon">
            <LogOut size={20} />
          </span>
          {!isCollapsed && "Logout"}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
