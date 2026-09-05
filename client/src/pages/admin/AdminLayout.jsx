import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Camera, 
  Calendar, 
  BookOpen, 
  Bell, 
  Settings as SettingsIcon, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  GraduationCap,
  Library,
  UserCog
} from "lucide-react";
import "./AdminLayout.css";

export default function AdminLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const token = sessionStorage.getItem("token");
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("admin_name");
    sessionStorage.removeItem("admin_username");
    sessionStorage.removeItem("admin_email");
    navigate("/admin/login");
  };

  const navItems = [
    { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/students", label: "Students", icon: Users },
    { path: "/admin/courses", label: "Courses", icon: Library },
    { path: "/admin/teachers", label: "Teachers", icon: UserCog },
    { path: "/admin/take-attendance", label: "Take Attendance", icon: Camera },
    { path: "/admin/records", label: "Records", icon: Calendar },
    { path: "/admin/subjects", label: "Subjects", icon: BookOpen },
    { path: "/admin/notifications", label: "Notifications", icon: Bell },
    { path: "/admin/settings", label: "Settings", icon: SettingsIcon },
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
              <span className="admin-brand-badge">Admin Panel</span>
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
