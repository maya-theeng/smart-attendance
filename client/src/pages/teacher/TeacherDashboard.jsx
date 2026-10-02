import { useState, useEffect } from "react";
import { BookOpen, Calendar, ShieldCheck } from "lucide-react";
import API from "../../api/api";
import "../admin/AdminDashboard.css";

export default function TeacherDashboard() {
  const [profile, setProfile] = useState({
    name: "Teacher",
    email: "",
    employee_id: "N/A",
    department: "N/A",
    specialty: "N/A",
  });
  const [stats, setStats] = useState({
    total_subjects: 0,
    total_records: 0,
    present_count: 0,
    absent_count: 0,
    recent_sessions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const [profileRes, statsRes] = await Promise.all([
          API.get("teacher/profile/"),
          API.get("teacher/stats/"),
        ]);
        setProfile(profileRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error("Error fetching teacher dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeacherData();
  }, []);

  if (loading) return <div className="admin-page-content">Loading...</div>;

  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Faculty Overview</h1>
          <p>Welcome back, <strong>{profile.name}</strong> — Faculty Portal</p>
        </div>
        <div style={{
          background: "#f0fcff",
          border: "1px solid #e8f0f7",
          padding: "10px 18px",
          borderRadius: "12px",
          textAlign: "right",
          fontSize: "14px"
        }}>
          <div style={{ fontWeight: "600", color: "#0a3d5c", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Faculty Profile</div>
          <div style={{ color: "#6b8caa", marginTop: "4px" }}>
            ID: <span style={{ color: "#0bc0e4", fontWeight: "600" }}>{profile.employee_id}</span>
          </div>
        </div>
      </header>

      <div className="admin-page-content">
        {/* Metric Cards */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card primary">
            <div className="admin-stat-icon">
              <BookOpen size={32} color="#0bc0e4" />
            </div>
            <div>
              <h3>Assigned Subjects</h3>
              <p>{stats.total_subjects}</p>
            </div>
          </div>
          <div className="admin-stat-card success">
            <div className="admin-stat-icon">
              <Calendar size={32} color="#10b981" />
            </div>
            <div>
              <h3>Classes Held</h3>
              <p>{stats.recent_sessions.length}</p>
            </div>
          </div>
          <div className="admin-stat-card warning">
            <div className="admin-stat-icon">
              <ShieldCheck size={32} color="#f59e0b" />
            </div>
            <div>
              <h3>Total Attendance Entries</h3>
              <p>{stats.total_records}</p>
            </div>
          </div>
        </div>

        {/* Recent Attendance Sessions */}
        <div className="admin-chart-card" style={{ padding: "20px", marginTop: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0a3d5c", marginBottom: "16px" }}>Recent Attendance Sessions</h3>
          <div className="admin-table-container" style={{ boxShadow: "none", padding: 0 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Total Students</th>
                  <th>Present Count</th>
                  <th>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_sessions.map((session, idx) => (
                  <tr key={idx}>
                    <td>{session.date}</td>
                    <td><strong>{session.subject_code}</strong></td>
                    <td>{session.subject_name}</td>
                    <td>{session.total_students}</td>
                    <td>{session.present_count}</td>
                    <td>
                      <span style={{
                        color: session.percentage >= 75 ? "#10b981" : "#ef4444",
                        fontWeight: "600"
                      }}>
                        {session.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
                {stats.recent_sessions.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "30px", opacity: 0.5 }}>
                      No attendance sessions found. Use "Take Attendance" to mark your first class.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
