import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  Bell, 
  LogOut,
  CheckCircle,
  XCircle,

  AlertTriangle,
  Inbox,
  Sparkles,
  Library,
  User,
  Lock
} from "lucide-react";
import API from "../../api/api";
import "./StudentDashboard.css";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const FALLBACK_STUDENT = {
  name: "Student",
  email: "",
  studentId: "N/A",
  semester: "N/A",
  department: "N/A",
};

const FALLBACK_STATS = { totalClasses: 0, present: 0, absent: 0, percentage: 0, trend: [] };

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("2026-09");

  // Password Change State
  const [pwdData, setPwdData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");

  const [student, setStudent] = useState(FALLBACK_STUDENT);
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [subjects, setSubjects] = useState([]);
  const [records, setRecords] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    const fetchAll = async () => {
      try {
        const [profileRes, statsRes, subjectsRes, recordsRes, emailsRes] = await Promise.all([
          API.get("student/profile/"),
          API.get("dashboard/stats/"),
          API.get("dashboard/subjects/"),
          API.get("attendance/records/"),
          API.get("emails/"),
        ]);

        const p = profileRes.data;
        setStudent({
          name: p.name,
          email: p.email,
          studentId: p.student_id,
          department: p.department,
          semester: p.semester,
        });

        const s = statsRes.data;
        setStats({
          totalClasses: s.total_classes,
          present: s.present,
          absent: s.absent,
          percentage: s.percentage,
          trend: s.trend || [],
        });

        setSubjects(subjectsRes.data);
        setRecords(recordsRes.data);
        setEmails(emailsRes.data.map((e) => ({
          id: e.id,
          subject: e.subject,
          preview: e.preview,
          date: e.date,
          read: e.read,
          type: e.type,
        })));
      } catch (err) {
        console.warn("API unavailable, using mock data.", err);
        // Fallback mock data so UI still renders during development
        setStudent({ name: "Maya Tamang", email: "maya@gpkmc.edu.np", studentId: "STU-2024-001", department: "Computer Science", semester: "6th Semester" });
        setStats({ totalClasses: 120, present: 96, absent: 24, percentage: 80 });
        setSubjects([
          { name: "Data Structures", code: "CS301", total: 30, present: 26, absent: 4, percentage: 87 },
          { name: "Operating Systems", code: "CS302", total: 28, present: 21, absent: 7, percentage: 75 },
          { name: "Database Management", code: "CS303", total: 30, present: 27, absent: 3, percentage: 90 },
          { name: "Computer Networks", code: "CS304", total: 32, present: 22, absent: 10, percentage: 69 },
        ]);
        setRecords([
          { date: "2026-05-18", subject: "Data Structures", status: "Present", time: "10:00 AM" },
          { date: "2026-05-17", subject: "Operating Systems", status: "Absent", time: "11:00 AM" },
          { date: "2026-05-17", subject: "Database Management", status: "Present", time: "2:00 PM" },
          { date: "2026-05-16", subject: "Computer Networks", status: "Absent", time: "9:00 AM" },
          { date: "2026-05-16", subject: "Data Structures", status: "Present", time: "10:00 AM" },
          { date: "2026-05-15", subject: "Operating Systems", status: "Present", time: "11:00 AM" },
        ]);
        setEmails([
          { id: 1, subject: "Low Attendance Warning - Computer Networks", preview: "Your attendance in Computer Networks has dropped below 75%.", date: "2026-05-17", read: false, type: "warning" },
          { id: 2, subject: "Monthly Attendance Report - April 2026", preview: "Your attendance report for April 2026 is ready. Overall: 82%.", date: "2026-05-01", read: true, type: "report" },
          { id: 3, subject: "Attendance Marked - Data Structures", preview: "Your attendance has been successfully marked for today.", date: "2026-05-18", read: true, type: "success" },
          { id: 4, subject: "Reminder: Minimum Attendance Requirement", preview: "You need at least 75% attendance to be eligible for exams.", date: "2026-04-28", read: true, type: "info" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/login");
  };

  const handleEmailClick = async (email) => {
    setSelectedEmail(email);
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, read: true } : e))
    );
    // Mark as read on backend
    try { await API.patch(`emails/${email.id}/read/`); } catch (_) {}
  };

  const handlePwdChange = (e) => setPwdData({ ...pwdData, [e.target.name]: e.target.value });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdMsg("");
    
    // Validation
    const pwd = pwdData.newPassword;
    if (pwd.length < 8) {
      setPwdMsg("Error: Password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(pwd)) {
      setPwdMsg("Error: Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(pwd)) {
      setPwdMsg("Error: Password must contain at least one digit.");
      return;
    }
    if (!/[^A-Za-z0-9]/.test(pwd)) {
      setPwdMsg("Error: Password must contain at least one special character.");
      return;
    }
    if (/\s/.test(pwd)) {
      setPwdMsg("Error: Password cannot contain spaces.");
      return;
    }
    if (pwd !== pwdData.confirmPassword) {
      setPwdMsg("Error: New passwords do not match.");
      return;
    }
    
    setPwdLoading(true);
    try {
      await API.post("auth/change-password/", {
        old_password: pwdData.oldPassword,
        new_password: pwdData.newPassword
      });
      setPwdMsg("Success: Password updated successfully!");
      setPwdData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwdMsg("Error: " + (err.response?.data?.detail || "Failed to update password."));
    } finally {
      setPwdLoading(false);
    }
  };

  const unreadCount = emails.filter((e) => !e.read).length;
  const percentage = stats.percentage;
  const circleColor =
    percentage >= 75 ? "#10d48e" : percentage >= 60 ? "#f59e0b" : "#ef4444";

  // Real data only: use backend trend or compute directly from student's real records
  const rawTrend = useMemo(() => {
    if (stats.trend && stats.trend.length > 0) {
      return stats.trend;
    }
    if (records && records.length > 0) {
      const dateMap = new Map();
      const sortedRecs = [...records].sort((a, b) => (a.date > b.date ? 1 : -1));
      let runningTotal = 0;
      let runningPresent = 0;

      sortedRecs.forEach((r) => {
        const d = r.date;
        if (!dateMap.has(d)) {
          dateMap.set(d, { date: d, total: 0, present: 0 });
        }
        const item = dateMap.get(d);
        item.total += 1;
        if (r.status === "Present") {
          item.present += 1;
        }
      });

      const points = [];
      dateMap.forEach((val) => {
        runningTotal += val.total;
        runningPresent += val.present;
        const pct = Math.round((runningPresent / runningTotal) * 100);
        points.push({
          date: val.date,
          percentage: pct,
          present_today: val.present,
          total_today: val.total,
        });
      });
      return points;
    }
    return [];
  }, [stats.trend, records]);

  // Distinct available months from student's real records
  const availableMonths = useMemo(() => {
    const set = new Set();
    (records || []).forEach((r) => {
      if (r.date) set.add(r.date.substring(0, 7));
    });
    set.add("2026-09");
    return Array.from(set).sort().reverse();
  }, [records]);

  // Helper to format "2026-09" to "September 2026"
  const formatMonthName = (ym) => {
    if (!ym) return "";
    const [year, month] = ym.split("-");
    const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  };

  // Daily attendance progression for the selected month
  const monthDailyTrend = useMemo(() => {
    if (!records || records.length === 0) return [];
    const targetYM = selectedMonth || "2026-09";
    const monthRecs = records.filter((r) => r.date && r.date.startsWith(targetYM));
    if (monthRecs.length === 0) return [];

    const sorted = [...monthRecs].sort((a, b) => (a.date > b.date ? 1 : -1));
    const dateMap = new Map();

    sorted.forEach((r) => {
      const d = r.date;
      if (!dateMap.has(d)) {
        dateMap.set(d, { date: d, total: 0, present: 0 });
      }
      const item = dateMap.get(d);
      item.total += 1;
      if (r.status === "Present") {
        item.present += 1;
      }
    });

    const points = [];
    let runningTotal = 0;
    let runningPresent = 0;
    dateMap.forEach((val) => {
      runningTotal += val.total;
      runningPresent += val.present;
      const percentage = Math.round((runningPresent / runningTotal) * 100);
      points.push({
        date: val.date,
        percentage,
        present_today: val.present,
        total_today: val.total,
      });
    });

    return points;
  }, [records, selectedMonth]);

  const studentSubjectsData = subjects || [];

  // Chart 1: Line Chart for the selected month's daily attendance
  const studentLineData = {
    labels: monthDailyTrend.map((item) => {
      const d = new Date(item.date);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }),
    datasets: [
      {
        label: `${formatMonthName(selectedMonth)} Attendance Rate (%)`,
        data: monthDailyTrend.map((item) => item.percentage),
        borderColor: "#0bc0e4",
        backgroundColor: "rgba(11, 192, 228, 0.12)",
        borderWidth: 3,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: "#0bc0e4",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const studentLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0a3d5c",
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const item = monthDailyTrend[context.dataIndex];
            const pct = context.parsed.y;
            if (item) {
              const p = item.present_today;
              const t = item.total_today;
              return ` Attendance: ${pct}% (${p}/${t} classes attended)`;
            }
            return ` Attendance Rate: ${pct}%`;
          },
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: "#f0fcff" },
        ticks: { 
          color: "#6b8caa",
          callback: (val) => `${val}%`,
        },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#6b8caa" },
      },
    },
  };

  // Chart 2: Bar chart (subject comparison)
  const studentBarData = {
    labels: studentSubjectsData.map((item) => item.code ?? item.name.substring(0, 10)),
    datasets: [
      {
        label: "Subject Attendance (%)",
        data: studentSubjectsData.map((item) => item.percentage),
        backgroundColor: studentSubjectsData.map((item) =>
          item.percentage >= 75 ? "rgba(16, 185, 129, 0.85)" : "rgba(239, 68, 68, 0.85)"
        ),
        borderRadius: 6,
        maxBarThickness: 32,
      },
    ],
  };

  const studentBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex;
            return studentSubjectsData[index].name;
          },
          label: (context) => `Attendance: ${context.parsed.y}%`,
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: "#f0fcff" },
        ticks: { color: "#6b8caa" },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#6b8caa" },
      },
    },
  };

  // Chart 3: Subject alerts (Doughnut)
  const atRiskSubjects = studentSubjectsData.filter((s) => s.percentage < 75).length;
  const safeSubjects = Math.max(0, studentSubjectsData.length - atRiskSubjects);

  const studentDoughnutData = {
    labels: ["Good (≥75%)", "Below (75%)"],
    datasets: [
      {
        data: [safeSubjects, atRiskSubjects],
        backgroundColor: ["#10b981", "#ef4444"],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const studentDoughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#475569",
          boxWidth: 10,
          padding: 10,
          font: { size: 11 }
        },
      },
    },
    cutout: "70%",
  };

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dash-root">
      {/* Sidebar */}
      <aside className={`dash-sidebar ${isCollapsed ? "collapsed" : ""}`}>
        <div className="dash-sidebar-brand">
          <span className="dash-brand-icon" style={{ display: "flex", alignItems: "center" }}>
            <GraduationCap size={28} />
          </span>
          {!isCollapsed && <span className="dash-brand-name">SmartAttend</span>}
        </div>

        <button 
          className="dash-sidebar-toggle" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title="Toggle Sidebar"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className="dash-profile">
          <div className="dash-avatar">
            {student.name.charAt(0)}
          </div>
          {!isCollapsed && (
            <div className="dash-profile-info">
              <p className="dash-profile-name">{student.name}</p>
              <p className="dash-profile-id">{student.studentId}</p>
            </div>
          )}
        </div>

        <nav className="dash-nav">
          {[
            { id: "overview", icon: LayoutDashboard, label: "Overview" },
            { id: "subjects", icon: BookOpen, label: "Subjects" },
            { id: "records", icon: Calendar, label: "Records" },
            { id: "notifications", icon: Bell, label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
            { id: "profile", icon: User, label: "Profile Settings" },
          ].map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                className={`dash-nav-item ${activeTab === item.id ? "active" : ""}`}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? item.label : ""}
              >
                <span className="dash-nav-icon">
                  <IconComponent size={20} />
                </span>
                {!isCollapsed && <span>{item.label}</span>}
                {!isCollapsed && item.id === "notifications" && unreadCount > 0 && (
                  <span className="dash-badge">{unreadCount}</span>
                )}
                {isCollapsed && item.id === "notifications" && unreadCount > 0 && (
                  <span className="dash-badge" style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, padding: 0, minWidth: 0 }}></span>
                )}
              </button>
            );
          })}
        </nav>

        <button className="dash-logout" onClick={handleLogout} title={isCollapsed ? "Logout" : ""}>
          <span className="dash-nav-icon">
            <LogOut size={18} />
          </span>
          {!isCollapsed && <span>Logout</span>}
        </button>
      </aside>

      {/* Main Content */}
      <main className="dash-main">
        {/* Top Bar */}
        <header className="dash-header">
          <div>
            <h1 className="dash-header-title">
              {activeTab === "overview" && "Dashboard Overview"}
              {activeTab === "subjects" && "Subject-wise Attendance"}
              {activeTab === "records" && "Attendance Records"}
              {activeTab === "notifications" && "Notifications"}
              {activeTab === "profile" && "Profile Settings"}
            </h1>
            <p className="dash-header-sub">
              {student.department} · {student.semester}
            </p>
          </div>
          <div className="dash-header-right">
            <span className="dash-date">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </span>
          </div>
        </header>

        {/*OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="dash-content">
            <div className="dash-stat-grid">
              <div className="dash-stat-card dash-stat-total">
                <div className="dash-stat-icon">
                  <Calendar size={32} color="#0bc0e4" />
                </div>
                <div>
                  <h3>Total Classes</h3>
                  <p>{stats.totalClasses}</p>
                </div>
              </div>
              <div className="dash-stat-card dash-stat-present">
                <div className="dash-stat-icon">
                  <CheckCircle size={32} color="#10d48e" />
                </div>
                <div>
                  <h3>Present</h3>
                  <p>{stats.present}</p>
                </div>
              </div>
              <div className="dash-stat-card dash-stat-absent">
                <div className="dash-stat-icon">
                  <XCircle size={32} color="#ef4444" />
                </div>
                <div>
                  <h3>Absent</h3>
                  <p>{stats.absent}</p>
                </div>
              </div>

            </div>

            {/* Circular Progress + Info */}
            <div className="dash-overview-row">
              <div className="dash-circle-card">
                <h3>Overall Attendance</h3>
                <div className="dash-circle-wrap">
                  <svg viewBox="0 0 120 120" className="dash-circle-svg">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#e8f4fd" strokeWidth="12" />
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke={circleColor}
                      strokeWidth="12"
                      strokeDasharray={`${(percentage / 100) * 314} 314`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                      style={{ transition: "stroke-dasharray 1s ease" }}
                    />
                    <text x="60" y="55" textAnchor="middle" className="dash-circle-pct" fill={circleColor}>{percentage}%</text>
                    <text x="60" y="72" textAnchor="middle" className="dash-circle-label" fill="#888">attended</text>
                  </svg>
                </div>
                <div className={`dash-status-pill ${percentage >= 75 ? "safe" : "danger"}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {percentage >= 75 ? <><CheckCircle size={16} /> You're on track!</> : <><AlertTriangle size={16} /> Below 75% — attend more classes</>}
                </div>
              </div>

              {/* Subject status doughnut alert chart */}
              <div className="dash-doughnut-card">
                <h3>Subject Status</h3>
                <div className="doughnut-container" style={{ position: "relative", height: "130px", margin: "10px auto" }}>
                  <Doughnut data={studentDoughnutData} options={studentDoughnutOptions} />
                  <div className="doughnut-center-label" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -60%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span className="doughnut-number" style={{ fontSize: "20px", fontWeight: "700", color: atRiskSubjects > 0 ? "#ef4444" : "#10d48e" }}>{atRiskSubjects}</span>
                    <span className="doughnut-text" style={{ fontSize: "9px", color: "#6b8caa", textTransform: "uppercase", fontWeight: "600" }}>Critical</span>
                  </div>
                </div>
                <div className={`dash-status-pill ${atRiskSubjects === 0 ? "safe" : "danger"}`} style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {atRiskSubjects === 0 ? <><Sparkles size={16} /> All subjects on track!</> : <><AlertTriangle size={16} /> {atRiskSubjects} subject(s) below 75%</>}
                </div>
              </div>
            </div>

            {/* Visual Analytics Charts Section */}
            <div className="dash-analytics-row">
              <div className="dash-chart-card">
                <div className="dash-chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h3>{formatMonthName(selectedMonth)} Attendance Trend</h3>
                    <span className="dash-chart-subtitle">
                      Daily attendance progression in {formatMonthName(selectedMonth)}
                    </span>
                  </div>
                  {availableMonths.length > 1 && (
                    <div>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{
                          padding: "5px 12px",
                          fontSize: "12px",
                          fontWeight: "600",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          color: "#0a3d5c",
                          background: "#f0fcff",
                          cursor: "pointer",
                          outline: "none"
                        }}
                      >
                        {availableMonths.map((ym) => (
                          <option key={ym} value={ym}>
                            {formatMonthName(ym)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="chart-container" style={{ position: "relative", height: "220px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {monthDailyTrend.length > 0 ? (
                    <Line data={studentLineData} options={studentLineOptions} />
                  ) : (
                    <div style={{ textAlign: "center", color: "#6b8caa", padding: "20px 0" }}>
                      <Calendar size={28} style={{ margin: "0 auto 8px", opacity: 0.6 }} />
                      <p style={{ fontWeight: "600", fontSize: "14px", color: "#0a3d5c", marginBottom: "4px" }}>
                        No attendance records in {formatMonthName(selectedMonth)}
                      </p>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                        Attendance will appear here after class scans
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="dash-chart-card">
                <div className="dash-chart-header">
                  <h3>Subject Comparison</h3>
                  <span className="dash-chart-subtitle">Your attendance percentage across subjects</span>
                </div>
                <div className="chart-container" style={{ position: "relative", height: "220px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {studentSubjectsData.length > 0 ? (
                    <Bar data={studentBarData} options={studentBarOptions} />
                  ) : (
                    <div style={{ textAlign: "center", color: "#6b8caa", padding: "20px 0" }}>
                      <BookOpen size={28} style={{ margin: "0 auto 8px", opacity: 0.6 }} />
                      <p style={{ fontWeight: "600", fontSize: "14px", color: "#0a3d5c", marginBottom: "4px" }}>No enrolled subjects yet</p>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>Subject attendance will appear here once enrolled</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Alerts */}
            {subjects.some((s) => s.percentage < 75) && (
              <div className="dash-alert-card">
                <span className="dash-alert-icon">
                  <AlertTriangle size={28} color="#f59e0b" />
                </span>
                <div>
                  <p className="dash-alert-title">Low Attendance Warning</p>
                  <p className="dash-alert-msg">
                    You have low attendance in:{" "}
                    <strong>
                      {subjects.filter((s) => s.percentage < 75)
                        .map((s) => s.name)
                        .join(", ")}
                    </strong>. An email notification has been sent to you.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}



        {/*SUBJECTS TAB */}
        {activeTab === "subjects" && (
          <div className="dash-content">
            <div className="dash-subject-grid">
              {subjects.map((sub) => {
                const pct = sub.percentage;
                const color = pct >= 75 ? "#10d48e" : pct >= 60 ? "#f59e0b" : "#ef4444";
                return (
                  <div className="dash-subject-card" key={sub.name}>
                    <div className="dash-subject-header">
                      <h3>{sub.name}</h3>
                      <span
                        className="dash-subject-badge"
                        style={{ background: color + "22", color }}
                      >
                        {pct >= 75 ? "Good" : pct >= 60 ? "Warning" : "Critical"}
                      </span>
                    </div>
                    <div className="dash-subject-stats">
                      <span>Present: <strong>{sub.present}</strong></span>
                      <span>Total: <strong>{sub.total}</strong></span>
                      <span>Absent: <strong>{sub.total - sub.present}</strong></span>
                    </div>
                    <div className="dash-progress-bar-wrap">
                      <div
                        className="dash-progress-bar-fill"
                        style={{ width: `${pct}%`, background: color }}
                      ></div>
                    </div>
                    <div className="dash-subject-pct" style={{ color }}>
                      {pct}% Attendance
                    </div>
                    {pct < 75 && (
                      <p className="dash-subject-warn">
                        Need {Math.ceil((75 * sub.total - 100 * sub.present) / 25)} more classes to reach 75%
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/*RECORDS TAB */}
        {activeTab === "records" && (
          <div className="dash-content">
            <div className="dash-table-card">
              <div className="dash-table-header">
                <h3>Recent Attendance Records</h3>
                <span className="dash-table-count">{records.length} entries</span>
              </div>
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Subject</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec, i) => (
                      <tr key={i}>
                        <td>{new Date(rec.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td>{rec.subject}</td>
                        <td>{rec.time}</td>
                        <td>
                          <span className={`dash-status-tag ${rec.status === "Present" ? "present" : "absent"}`}>
                            {rec.status === "Present" ? <CheckCircle size={16} /> : <XCircle size={16} />}
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <div className="dash-content">
            <div className="dash-email-layout">
              {/* Email List */}
              <div className="dash-email-list">
                <div className="dash-email-list-header">
                  <h3>Inbox</h3>
                  {unreadCount > 0 && (
                    <span className="dash-email-unread-badge">{unreadCount} unread</span>
                  )}
                </div>
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className={`dash-email-item ${!email.read ? "unread" : ""} ${selectedEmail?.id === email.id ? "selected" : ""}`}
                    onClick={() => handleEmailClick(email)}
                  >
                    <div className="dash-email-dot-wrap">
                      {!email.read && <span className="dash-email-dot"></span>}
                    </div>
                    <div className="dash-email-content">
                      <p className="dash-email-subject">{email.subject}</p>
                      <p className="dash-email-preview">{email.preview}</p>
                      <p className="dash-email-date">
                        {new Date(email.date).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Email Detail */}
              <div className="dash-email-detail">
                {selectedEmail ? (
                  <>
                    <div className="dash-email-detail-header">
                      <h2>{selectedEmail.subject}</h2>
                      <span className="dash-email-detail-date">
                        {new Date(selectedEmail.date).toLocaleDateString("en-US", {
                          weekday: "long", year: "numeric", month: "long", day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="dash-email-detail-meta">
                      <span>From: <strong>Smart Attendance System</strong></span>
                      <span>To: <strong>{student.email}</strong></span>
                    </div>
                    <div className="dash-email-detail-body">
                      <p>{selectedEmail.preview}</p>
                      <br />
                      <p>
                        This is an automated notification from the Smart Attendance System. Please do not reply to this email.
                        If you have any concerns, contact your department administrator.
                      </p>
                      <br />
                      <p>Best regards,<br /><strong>Smart Attendance Team</strong></p>
                    </div>
                  </>
                ) : (
                  <div className="dash-email-empty">
                    <span className="dash-email-empty-icon">
                      <Inbox size={56} color="#a0b4c8" />
                    </span>
                    <p>Select a notification to read</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/*PROFILE SETTINGS TAB*/}
        {activeTab === "profile" && (
          <div className="dash-content">
            <div className="dash-analytics-row" style={{ alignItems: "flex-start" }}>
              {/* Profile Details */}
              <div className="dash-chart-card">
                <div className="dash-chart-header">
                  <h3>Student Profile</h3>
                  <span className="dash-chart-subtitle">Your registered information</span>
                </div>
                <div className="dash-info-list" style={{ marginTop: "20px" }}>
                  {[
                    { label: "Full Name", value: student.name },
                    { label: "Email", value: student.email },
                    { label: "Student ID", value: student.studentId },
                    { label: "Department", value: student.department },
                    { label: "Semester", value: student.semester },
                  ].map((item) => (
                    <div className="dash-info-row" key={item.label}>
                      <span className="dash-info-label">{item.label}</span>
                      <span className="dash-info-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Change Password */}
              <div className="dash-chart-card">
                <div className="dash-chart-header">
                  <h3>Security & Password</h3>
                  <span className="dash-chart-subtitle">Update your account password</span>
                </div>
                <form onSubmit={handlePasswordChange} style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#6b8caa", marginBottom: "6px", fontWeight: "500" }}>Current Password</label>
                    <input type="password" name="oldPassword" value={pwdData.oldPassword} onChange={handlePwdChange} placeholder="Enter current password" required style={{ width: "100%", padding: "12px", border: "1px solid #e8f0f7", borderRadius: "8px", outline: "none", fontSize: "14px", background: "#f9fdff" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#6b8caa", marginBottom: "6px", fontWeight: "500" }}>New Password</label>
                    <input type="password" name="newPassword" value={pwdData.newPassword} onChange={handlePwdChange} placeholder="Must be at least 8 characters" required minLength="8" style={{ width: "100%", padding: "12px", border: "1px solid #e8f0f7", borderRadius: "8px", outline: "none", fontSize: "14px", background: "#f9fdff" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#6b8caa", marginBottom: "6px", fontWeight: "500" }}>Confirm New Password</label>
                    <input type="password" name="confirmPassword" value={pwdData.confirmPassword} onChange={handlePwdChange} placeholder="Re-enter new password" required style={{ width: "100%", padding: "12px", border: "1px solid #e8f0f7", borderRadius: "8px", outline: "none", fontSize: "14px", background: "#f9fdff" }} />
                  </div>
                  
                  {pwdMsg && (
                    <div style={{ padding: "12px", borderRadius: "8px", fontSize: "14px", background: pwdMsg.includes("Success") ? "#d1fae5" : "#fee2e2", color: pwdMsg.includes("Success") ? "#065f46" : "#991b1b" }}>
                      {pwdMsg}
                    </div>
                  )}

                  <button type="submit" disabled={pwdLoading} style={{ marginTop: "8px", background: "#0bc0e4", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s ease", opacity: pwdLoading ? 0.7 : 1 }}>
                    {pwdLoading ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
